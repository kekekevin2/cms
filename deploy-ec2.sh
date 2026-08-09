#!/usr/bin/env bash
# Deploys both the backend (Express) and frontend (Angular) from this one
# repo onto an Amazon Linux (dnf-based) EC2 instance, behind nginx as a
# reverse proxy, with the backend kept alive by pm2. Safe to re-run —
# re-running just pulls latest code, reinstalls deps, rebuilds, and
# reloads everything.
#
# Run this ON the EC2 instance, with sudo, from inside the cloned repo:
#   sudo ./deploy-ec2.sh [options]
#
# What it does:
#   1. Installs Node.js 22+ (via NodeSource), git, nginx, pm2 if missing.
#   2. git pull's the repo (skip with --skip-git-pull).
#   3. Backend: makes sure backend/.env exists (copied from
#      backend/.env.production if present — that file is gitignored on
#      purpose, so it must already be sitting on this box; see below),
#      npm ci --omit=dev, then (re)starts it under pm2 as SERVICE_USER and
#      persists it across reboots via `pm2 startup` + `pm2 save`.
#   4. Frontend: npm ci && npm run build (production build — picks up
#      client/src/app/environments/environment.prod.ts automatically).
#   5. nginx — writes two dedicated conf.d files (safe to fully regenerate
#      on every run, EXCEPT once certbot has added its own SSL block, at
#      which point re-runs leave that file alone):
#        - Frontend domain(s): serves the Angular build as a static SPA.
#        - API domain: reverse-proxies to the pm2-managed backend.
#   6. --certbot requests/renews Let's Encrypt certs for all domains via
#      certbot's nginx plugin (skipped per-domain if a cert already exists).
#   7. Health-checks both the backend (direct) and the frontend (via nginx).
#
# backend/.env.production is intentionally NOT in git (see .gitignore) since
# it holds real secrets (DB password, JWT secret, AWS keys, SMTP password).
# Before the first run, get it onto this box out-of-band, e.g.:
#   scp backend/.env.production ec2-user@<this-box>:~/cms/backend/.env.production
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$SCRIPT_DIR"
BACKEND_DIR="$REPO_DIR/backend"
CLIENT_DIR="$REPO_DIR/client"
CLIENT_BUILD_DIR="$CLIENT_DIR/dist/client/browser"

FRONTEND_DOMAIN="batstateu-cmp.online"
FRONTEND_DOMAIN_WWW="www.batstateu-cmp.online"
API_DOMAIN="api.batstateu-cmp.online"
BACKEND_PORT="${BACKEND_PORT:-3000}"
SERVICE_USER="${SUDO_USER:-$(whoami)}"
SERVICE_NAME="cms-backend"
SKIP_GIT_PULL=false
RUN_CERTBOT=false
CERTBOT_EMAIL=""

usage() {
	cat <<EOF
Usage: sudo ./deploy-ec2.sh [options]

Options:
  --frontend-domain <fqdn>  Primary frontend domain (default: ${FRONTEND_DOMAIN})
  --frontend-www <fqdn>     www alias for the frontend (default: ${FRONTEND_DOMAIN_WWW};
                             pass an empty string to skip it: --frontend-www "")
  --api-domain <fqdn>       Backend/API domain (default: ${API_DOMAIN})
  --backend-port <n>        Port the Node backend listens on (default: 3000)
  --service-user <u>        Linux user pm2/npm run as (default: \$SUDO_USER)
  --certbot                 Request/renew Let's Encrypt certs for all domains
  --certbot-email <e>       Email for certbot registration (default: admin@<frontend-domain>)
  --skip-git-pull           Don't run 'git pull' before installing/building
  -h, --help                Show this help
EOF
}

while [[ $# -gt 0 ]]; do
	case "$1" in
	--frontend-domain)
		FRONTEND_DOMAIN="$2"
		shift 2
		;;
	--frontend-www)
		FRONTEND_DOMAIN_WWW="$2"
		shift 2
		;;
	--api-domain)
		API_DOMAIN="$2"
		shift 2
		;;
	--backend-port)
		BACKEND_PORT="$2"
		shift 2
		;;
	--service-user)
		SERVICE_USER="$2"
		shift 2
		;;
	--certbot)
		RUN_CERTBOT=true
		shift
		;;
	--certbot-email)
		CERTBOT_EMAIL="$2"
		shift 2
		;;
	--skip-git-pull)
		SKIP_GIT_PULL=true
		shift
		;;
	-h | --help)
		usage
		exit 0
		;;
	*)
		echo "Unknown option: $1"
		usage
		exit 1
		;;
	esac
done

log() { echo -e "\n\033[1;36m▶ $1\033[0m"; }
die() {
	echo -e "\033[1;31m✖ $1\033[0m" >&2
	exit 1
}

[[ $EUID -eq 0 ]] || die "Run this with sudo: sudo $0 $*"
run_as_user() { sudo -u "$SERVICE_USER" -H bash -lc "$1"; }

# ── 1. System packages ───────────────────────────────────────────
log "dnf update"
dnf update -y

log "Checking Node.js version (need >= 20)"
NEED_NODE=true
if command -v node >/dev/null 2>&1; then
	if node -e 'process.exit(process.versions.node.split(".").map(Number)[0] >= 20 ? 0 : 1)'; then
		NEED_NODE=false
		echo "Found $(node -v), OK"
	fi
fi
if $NEED_NODE; then
	log "Installing Node.js 22.x via NodeSource"
	curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
	dnf install -y nodejs || true
	dnf upgrade -y nodejs
	node -v
	node -e 'process.exit(process.versions.node.split(".").map(Number)[0] >= 20 ? 0 : 1)' ||
		die "Node is still $(node -v) after install — need >= 20. Check for a conflicting nodejs package/repo and remove it, then re-run."
fi

log "Installing git, nginx (skips anything already present)"
dnf install -y git nginx

if ! command -v pm2 >/dev/null 2>&1; then
	log "Installing pm2 globally"
	npm install -g pm2
fi

systemctl enable nginx >/dev/null
systemctl is-active --quiet nginx || systemctl start nginx

# ── 2. Code ───────────────────────────────────────────────────────
if [[ "$SKIP_GIT_PULL" == false ]] && [[ -d "$REPO_DIR/.git" ]]; then
	log "git pull in $REPO_DIR"
	git -C "$REPO_DIR" config --global --add safe.directory "$REPO_DIR" 2>/dev/null || true
	git -C "$REPO_DIR" pull --ff-only || die "git pull failed — resolve manually and re-run with --skip-git-pull"
fi

# ── 3. Backend env ────────────────────────────────────────────────
if [[ ! -f "$BACKEND_DIR/.env" ]]; then
	if [[ -f "$BACKEND_DIR/.env.production" ]]; then
		log "backend/.env missing — copying from backend/.env.production"
		cp "$BACKEND_DIR/.env.production" "$BACKEND_DIR/.env"
		chown "$SERVICE_USER":"$SERVICE_USER" "$BACKEND_DIR/.env"
		chmod 600 "$BACKEND_DIR/.env"
	else
		die "Neither backend/.env nor backend/.env.production exists. \
This file holds real secrets and is intentionally gitignored, so it doesn't \
come from 'git pull' — copy it onto this box first, e.g.: \
scp backend/.env.production ${SERVICE_USER}@<this-box>:$BACKEND_DIR/.env.production"
	fi
fi

# ── 4. Backend deps + pm2 ─────────────────────────────────────────
log "npm ci (production) in $BACKEND_DIR"
run_as_user "cd '$BACKEND_DIR' && npm ci --omit=dev"

log "Starting/reloading $SERVICE_NAME under pm2 (user=$SERVICE_USER port=$BACKEND_PORT)"
if run_as_user "pm2 describe $SERVICE_NAME" >/dev/null 2>&1; then
	run_as_user "cd '$BACKEND_DIR' && pm2 reload $SERVICE_NAME --update-env"
else
	run_as_user "cd '$BACKEND_DIR' && pm2 start index.js --name $SERVICE_NAME"
fi
run_as_user "pm2 save"

# Persist pm2 across reboots. `pm2 startup` prints a one-off command (as
# root) to wire up systemd for SERVICE_USER — run it once, skip if that
# systemd unit already exists.
if [[ ! -f "/etc/systemd/system/pm2-${SERVICE_USER}.service" ]]; then
	log "Registering pm2 with systemd for $SERVICE_USER"
	STARTUP_CMD="$(run_as_user "pm2 startup systemd -u $SERVICE_USER --hp /home/$SERVICE_USER" | grep '^sudo ' || true)"
	if [[ -n "$STARTUP_CMD" ]]; then
		eval "$STARTUP_CMD"
	else
		echo "Couldn't auto-detect the pm2 startup command — run 'pm2 startup' as $SERVICE_USER manually and follow its instructions."
	fi
fi

log "Health check on http://127.0.0.1:${BACKEND_PORT}/"
CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${BACKEND_PORT}/" || echo "000")"
if [[ "$CODE" != "000" ]]; then
	echo "OK — backend is responding (HTTP $CODE; 404 on '/' is expected, there's no root route)"
else
	die "Backend isn't responding on port ${BACKEND_PORT} — check: sudo -u $SERVICE_USER pm2 logs $SERVICE_NAME"
fi

# ── 5. Frontend build ─────────────────────────────────────────────
log "npm ci && npm run build in $CLIENT_DIR (production config, picks up environment.prod.ts)"
run_as_user "cd '$CLIENT_DIR' && npm ci && npm run build"
[[ -f "$CLIENT_BUILD_DIR/index.html" ]] || die "Frontend build didn't produce $CLIENT_BUILD_DIR/index.html — check the build output above."

# ── 6. nginx ───────────────────────────────────────────────────────
FRONTEND_CONF="/etc/nginx/conf.d/cms-frontend.conf"
API_CONF="/etc/nginx/conf.d/cms-api.conf"

FRONTEND_SERVER_NAMES="$FRONTEND_DOMAIN"
[[ -n "$FRONTEND_DOMAIN_WWW" ]] && FRONTEND_SERVER_NAMES="$FRONTEND_SERVER_NAMES $FRONTEND_DOMAIN_WWW"

if [[ -f "$FRONTEND_CONF" ]] && grep -q "managed by Certbot" "$FRONTEND_CONF"; then
	log "nginx: $FRONTEND_CONF already has a Certbot-managed SSL block — leaving it as is"
else
	log "nginx: writing $FRONTEND_CONF for $FRONTEND_SERVER_NAMES"
	cat >"$FRONTEND_CONF" <<EOF
server {
    listen 80;
    server_name ${FRONTEND_SERVER_NAMES};

    root ${CLIENT_BUILD_DIR};
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|svg|png|jpg|jpeg|gif|webp|woff2?|ttf|ico)\$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }
}
EOF
fi

if [[ -f "$API_CONF" ]] && grep -q "managed by Certbot" "$API_CONF"; then
	log "nginx: $API_CONF already has a Certbot-managed SSL block — leaving it as is"
else
	log "nginx: writing $API_CONF for $API_DOMAIN -> 127.0.0.1:${BACKEND_PORT}"
	cat >"$API_CONF" <<EOF
server {
    listen 80;
    server_name ${API_DOMAIN};

    # Faculty credential/requirement uploads are capped at 25MB by multer
    # (utils/upload.js) — leave headroom above that.
    client_max_body_size 30M;

    location / {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
fi

if nginx -t; then
	systemctl reload nginx
	echo "nginx: configs written and reloaded"
else
	die "nginx -t failed — check $FRONTEND_CONF and $API_CONF manually"
fi

# ── 7. certbot (optional) ─────────────────────────────────────────
if $RUN_CERTBOT; then
	if ! command -v certbot >/dev/null 2>&1; then
		log "Installing certbot"
		dnf install -y certbot python3-certbot-nginx
	fi

	EMAIL="${CERTBOT_EMAIL:-admin@${FRONTEND_DOMAIN}}"

	# certbot itself is idempotent per-domain (renews only if near expiry,
	# expands an existing cert's SAN list if new domains are added), so it's
	# safe to always pass the full set rather than pre-filtering here.
	log "certbot: requesting/renewing certs for $FRONTEND_DOMAIN, $FRONTEND_DOMAIN_WWW, $API_DOMAIN"
	CERTBOT_DOMAINS=(-d "$FRONTEND_DOMAIN")
	[[ -n "$FRONTEND_DOMAIN_WWW" ]] && CERTBOT_DOMAINS+=(-d "$FRONTEND_DOMAIN_WWW")
	CERTBOT_DOMAINS+=(-d "$API_DOMAIN")
	certbot --nginx "${CERTBOT_DOMAINS[@]}" --non-interactive --agree-tos -m "$EMAIL" ||
		die "certbot failed — check the output above (common cause: DNS for these domains hasn't propagated to this box's IP yet)"
fi

# ── 8. Frontend health check (via nginx) ──────────────────────────
log "Health check on http://127.0.0.1/ (Host: ${FRONTEND_DOMAIN})"
CODE="$(curl -s -o /dev/null -w '%{http_code}' -H "Host: ${FRONTEND_DOMAIN}" "http://127.0.0.1/" || echo "000")"
if [[ "$CODE" == "200" ]]; then
	echo "OK — frontend is serving via nginx"
else
	echo "⚠ Got HTTP $CODE from nginx for ${FRONTEND_DOMAIN} — check: sudo tail -f /var/log/nginx/error.log"
fi

log "Done."
echo "Frontend: http://${FRONTEND_DOMAIN}  (https once DNS + --certbot are in place)"
echo "API:      http://${API_DOMAIN}/api/...  (https once DNS + --certbot are in place)"
echo "Backend logs: sudo -u $SERVICE_USER pm2 logs $SERVICE_NAME"
echo "Backend status: sudo -u $SERVICE_USER pm2 status"
