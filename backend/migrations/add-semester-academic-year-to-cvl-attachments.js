module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('cvl_attachments', 'semester', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Semester (1st Semester, 2nd Semester, Summer)',
    });

    await queryInterface.addColumn('cvl_attachments', 'academic_year_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'academic_years',
        key: 'academic_year_id',
      },
      onDelete: 'SET NULL',
      comment: 'Reference to academic year',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('cvl_attachments', 'semester');
    await queryInterface.removeColumn('cvl_attachments', 'academic_year_id');
  },
};
