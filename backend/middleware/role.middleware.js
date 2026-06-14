const checkRole = (...allowedRoles) => {
	return (req, res, next) => {
		if (!req.user) {
			return res.status(401).json({ message: "Unauthorized - No user found" });
		}

		const userRole = req.user.role;

		if (!allowedRoles.includes(userRole)) {
			return res.status(403).json({
				message:
					"Forbidden - You do not have permission to access this resource",
			});
		}

		next();
	};
};

module.exports = checkRole;
