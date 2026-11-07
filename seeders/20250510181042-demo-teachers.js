'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const saltRounds = 10;
    await queryInterface.bulkInsert('teachers', [
      {
        teacher_name: 'Tamisa',
        NUPTK: '654321',
        email: 'tamisa@teachers.com',
        password: await bcrypt.hash('Tamisa123', saltRounds)
      },
      {
        teacher_name: 'Danang',
        NUPTK: '543216',
        email: 'danang@teachers.com',
        password: await bcrypt.hash('Danang123', saltRounds)
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    // intentionally left blank
  }
};
