const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
	const token = req.headers["authorization"]?.split(" ")[1]; // Bearer TOKEN

	if (!token) {
		return res.status(403).json({ message: "No token provided" });
	}

	jwt.verify(
		token,
		process.env.JWT_SECRET || "your-secret-key",
		(err, decoded) => {
			if (err) {
				return res
					.status(401)
					.json({ message: "Unauthorized - Invalid token" });
			}

			req.user = decoded; // { user_id, email, role }
			next();
		},
	);
};

module.exports = verifyToken;
