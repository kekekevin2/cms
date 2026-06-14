module.exports = (sequelize, Sequelize) => {
  const OrganizationEventAttendee = sequelize.define(
    "organization_event_attendee",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      event_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      sr_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      student_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      year_level: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      section: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      program: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      department: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
    },
    {
      timestamps: true,
      underscored: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  );

  return OrganizationEventAttendee;
};
