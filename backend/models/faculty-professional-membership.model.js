module.exports = (sequelize, Sequelize) => {
  const FacultyProfessionalMembership = sequelize.define(
    "faculty_professional_memberships",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      faculty_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      organization_name: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      position_held: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      membership_id_number: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      membership_type: {
        type: Sequelize.ENUM(
          "Regular",
          "Associate",
          "Fellow",
          "Honorary",
          "Student",
          "Other",
        ),
        allowNull: true,
      },
      date_joined: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      date_ended: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
    },
    {
      tableName: "faculty_professional_memberships",
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  return FacultyProfessionalMembership;
};
