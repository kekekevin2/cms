// Other Information: Skills and Hobbies, Recognition, Organization Membership
module.exports = (sequelize, Sequelize) => {
	const PDSOtherInfo = sequelize.define("pds_other_info", {
		other_info_id: {
			type: Sequelize.INTEGER,
			autoIncrement: true,
			primaryKey: true,
			allowNull: false,
		},
		pds_id: {
			type: Sequelize.INTEGER,
			allowNull: false,
		},
		info_type: {
			type: Sequelize.ENUM("SKILL", "RECOGNITION", "MEMBERSHIP"),
			allowNull: false,
		},
		details: {
			type: Sequelize.STRING,
			allowNull: false,
			comment: "Skill/Hobby, Recognition/Award, or Organization Name",
		},
	});

	return PDSOtherInfo;
};
