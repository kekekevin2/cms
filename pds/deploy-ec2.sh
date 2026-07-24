
#!/usr/bin/env bash
# Deploys the pds-locator tool (pds/server) onto an Amazon Linux EC2 box that
# already runs another app (e.g. FastAPI) behind nginx. Safe to re-run.
#
# Run this ON the EC2 instance, with sudo, from inside the cloned repo:
#   sudo ./pds/deploy-ec2.sh [options]
#
# What it does:
#   1. Installs Node.js 22+ (via NodeSource) if not already present.
#   2. git pull's the repo (skip with --skip-git-pull).
#   3. npm install --omit=dev in pds/server.
#   4. Writes/refreshes a systemd service so it survives reboots/crashes.
#   5. Health-checks the service on its port.
#   6. nginx — one of three modes:
#        --domain <fqdn>    Fresh, clean rewrite of a DEDICATED nginx conf file
#                            (/etc/nginx/conf.d/pds-locator.conf) proxying that
#                            whole subdomain to the service. Since this file is
#                            exclusively ours, it's safe to fully regenerate on
#                            every run — EXCEPT once certbot has added its own
#                            SSL block to it, at which point re-runs leave the
#                            file alone (see --certbot) so HTTPS isn't clobbered.
#        --nginx-conf <path> Patches an EXISTING server-block file (e.g. your
#                            FastAPI site) with a "location /pds/ { ... }"
#                            block instead — backed up first, validated with
#                            `nginx -t`, rolled back automatically on failure.
#        (neither)           Just prints the location block for manual review.
#   7. --certbot (with --domain) requests/renews a Let's Encrypt cert for that
#      domain via certbot's nginx plugin, skipped if a cert already exists.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" # .../cms/pds
SERVER_DIR="$SCRIPT_DIR/server"
REPO_DIR="$(dirname "$SCRIPT_DIR")" # .../cms

PORT="${PORT:-2100}"
SERVICE_NAME="pds-locator"
SERVICE_USER="${SUDO_USER:-$(whoami)}"
NGINX_CONF=""
DOMAIN=""
RUN_CERTBOT=false
CERTBOT_EMAIL=""
SKIP_GIT_PULL=false

usage() {
	cat <<EOF
Usage: sudo ./deploy-ec2.sh [options]

Options:
  --port <n>            Port for the pds-locator service (default: 2100)
  --service-user <u>    Linux user the systemd service runs as (default: \$SUDO_USER)
  --domain <fqdn>        Own subdomain (e.g. pds.example.com) — fresh rewrite of a
                         dedicated /etc/nginx/conf.d/pds-locator.conf file each run
                         (left alone once certbot has added an SSL block to it).
  --certbot              With --domain: request a Let's Encrypt cert via certbot's
                         nginx plugin (skipped if a cert for that domain exists).
  --certbot-email <e>    Email for certbot registration (default: admin@<domain>)
  --nginx-conf <path>    Path to an EXISTING nginx server-block file to auto-add
                         a "location /pds/ { ... }" block to instead of --domain
                         (backed up first, validated with nginx -t, rolled back
                         on failure). Mutually exclusive with --domain.
  --skip-git-pull        Don't run 'git pull' before installing/restarting
  -h, --help             Show this help
EOF
}

while [[ $# -gt 0 ]]; do
	case "$1" in
	--port)
		PORT="$2"
		shift 2
		;;
	--service-user)
		SERVICE_USER="$2"
		shift 2
		;;
	--nginx-conf)
		NGINX_CONF="$2"
		shift 2
		;;
	--domain)
		DOMAIN="$2"
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

if [[ -n "$DOMAIN" && -n "$NGINX_CONF" ]]; then
	echo "Use either --domain or --nginx-conf, not both." >&2
	exit 1
fi

log() { echo -e "\n\033[1;36m▶ $1\033[0m"; }
die() {
	echo -e "\033[1;31m✖ $1\033[0m" >&2
	exit 1
}

[[ $EUID -eq 0 ]] || die "Run this with sudo: sudo $0 $*"

# ── 1. Node.js ────────────────────────────────────────────────────
log "Checking Node.js version (node:sqlite needs >= 22.5)"
NEED_NODE=true
if command -v node >/dev/null 2>&1; then
	if node -e 'process.exit(process.versions.node.split(".").map(Number)[0] >= 22 ? 0 : 1)'; then
		NEED_NODE=false
		echo "Found $(node -v), OK"
	fi
fi
if $NEED_NODE; then
	log "Installing/upgrading to Node.js 22.x via NodeSource"
	curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
	# `install` is a no-op if an older nodejs package is already present (e.g. from a
	# prior NodeSource 20.x setup) — it only installs what's missing, it won't upgrade
	# what's already there. Run both so it works whether Node is absent or outdated.
	if command -v dnf >/dev/null 2>&1; then
		dnf install -y nodejs || true
		dnf upgrade -y nodejs
	else
		yum install -y nodejs || true
		yum upgrade -y nodejs
	fi
	node -v
	node -e 'process.exit(process.versions.node.split(".").map(Number)[0] >= 22 ? 0 : 1)' ||
		die "Node is still $(node -v) after install/upgrade — node:sqlite needs >= 22.5. Check for a conflicting nodejs package/repo (e.g. amazon-linux-extras) and remove it, then re-run."
fi

# ── 2. Code ───────────────────────────────────────────────────────
if [[ "$SKIP_GIT_PULL" == false ]] && [[ -d "$REPO_DIR/.git" ]]; then
	log "git pull in $REPO_DIR"
	git -C "$REPO_DIR" pull --ff-only || die "git pull failed — resolve manually and re-run with --skip-git-pull"
fi

log "npm install (production) in $SERVER_DIR"
cd "$SERVER_DIR"
sudo -u "$SERVICE_USER" npm install --omit=dev

# ── 3. systemd service ────────────────────────────────────────────
log "Writing systemd service ($SERVICE_NAME) — user=$SERVICE_USER port=$PORT"
NODE_BIN="$(command -v node)"
cat >"/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=PDS Locator Tool (Node/Express + SQLite)
After=network.target

[Service]
Type=simple
User=${SERVICE_USER}
WorkingDirectory=${SERVER_DIR}
ExecStart=${NODE_BIN} index.js
Environment=PORT=${PORT}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}" >/dev/null
systemctl restart "${SERVICE_NAME}"
sleep 1
systemctl --no-pager status "${SERVICE_NAME}" | head -n 8 || true

# ── 4. Health check ───────────────────────────────────────────────
log "Health check on http://127.0.0.1:${PORT}/"
if curl -fsS -o /dev/null "http://127.0.0.1:${PORT}/"; then
	echo "OK — service is responding"
else
	die "Service isn't responding on port ${PORT} — check: journalctl -u ${SERVICE_NAME} -n 50"
fi

# ── 5. nginx ───────────────────────────────────────────────────────
LOCATION_BLOCK="    location /pds/ {
        proxy_pass http://127.0.0.1:${PORT}/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }"

if [[ -n "$DOMAIN" ]]; then
	DOMAIN_CONF="/etc/nginx/conf.d/pds-locator.conf"
	if [[ -f "$DOMAIN_CONF" ]] && grep -q "managed by Certbot" "$DOMAIN_CONF"; then
		log "nginx: $DOMAIN_CONF already has a Certbot-managed SSL block — leaving it as is"
	else
		log "nginx: fresh rewrite of $DOMAIN_CONF for $DOMAIN -> 127.0.0.1:${PORT}"
		cat >"$DOMAIN_CONF" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${PORT}/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
		if nginx -t; then
			systemctl reload nginx
			echo "nginx: $DOMAIN_CONF written and reloaded"
		else
			die "nginx -t failed after writing $DOMAIN_CONF — check the file manually"
		fi
	fi

	if $RUN_CERTBOT; then
		if [[ -d "/etc/letsencrypt/live/${DOMAIN}" ]]; then
			log "certbot: certificate for $DOMAIN already exists — skipping"
		elif command -v certbot >/dev/null 2>&1; then
			log "certbot: requesting certificate for $DOMAIN"
			EMAIL="${CERTBOT_EMAIL:-admin@${DOMAIN#*.}}"
			certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" ||
				die "certbot failed — check the output above (common cause: DNS for $DOMAIN hasn't propagated yet)"
		else
			log "certbot not installed — skipping SSL. Install with: dnf install -y certbot python3-certbot-nginx"
		fi
	fi
elif [[ -n "$NGINX_CONF" ]]; then
	[[ -f "$NGINX_CONF" ]] || die "nginx conf not found: $NGINX_CONF"
	if grep -q "location /pds/" "$NGINX_CONF"; then
		log "nginx: /pds/ location already present in $NGINX_CONF — skipping"
	else
		log "nginx: adding /pds/ location to $NGINX_CONF"
		BACKUP="${NGINX_CONF}.bak.$(date +%s)"
		cp "$NGINX_CONF" "$BACKUP"

		# Insert the block just before the LAST closing brace in the file
		# (assumes this file holds exactly one server{} block, as is typical
		# for a per-site file under nginx conf.d/ or sites-available/).
		awk -v block="$LOCATION_BLOCK" '
			{ lines[NR] = $0 }
			END {
				last = -1
				for (i = NR; i >= 1; i--) if (lines[i] ~ /^}/) { last = i; break }
				if (last == -1) { for (i = 1; i <= NR; i++) print lines[i]; exit }
				for (i = 1; i < last; i++) print lines[i]
				print block
				for (i = last; i <= NR; i++) print lines[i]
			}
		' "$NGINX_CONF" >"${NGINX_CONF}.new"
		mv "${NGINX_CONF}.new" "$NGINX_CONF"

		if nginx -t; then
			systemctl reload nginx
			echo "nginx updated and reloaded (backup at $BACKUP)"
		else
			cp "$BACKUP" "$NGINX_CONF"
			die "nginx -t failed — restored backup from $BACKUP. Check the block manually:\n$LOCATION_BLOCK"
		fi
	fi
else
	log "No --domain or --nginx-conf given — add this manually inside your existing server{} block:"
	echo "$LOCATION_BLOCK"
	nginx -t || echo "(note: nginx -t is currently failing for unrelated reasons — check separately)"
fi

log "Done. curl http://127.0.0.1:${PORT}/ to confirm, then visit your domain/subdomain."
