'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add seed commands here. Assumes timestamps are disabled.
     */
    await queryInterface.bulkInsert('tryouts', [
      { tryout_name: 'Tryout Episode 1', status: 'show', exam_mode: 'demo' },
      { tryout_name: 'Tryout Episode 2', status: 'show', exam_mode: 'demo' },
      { tryout_name: 'Tryout Episode 3', status: 'show', exam_mode: 'standard' },
      { tryout_name: 'Tryout Episode 4', status: 'hide', exam_mode: 'demo' }
    ], {});
  },

  // No down migration since seeds are permanent
  async down (queryInterface, Sequelize) {
    // intentionally left blank
  }
};
