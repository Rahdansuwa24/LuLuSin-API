'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const saltRounds = 10;
    await queryInterface.bulkInsert('admins', [
      {
        admin_name: 'Aqil',
        email: 'aqil@admins.com',
        password: await bcrypt.hash('Aqil123', saltRounds)
      },
      {
        admin_name: 'Agiel',
        email: 'agiel@admins.com',
        password: await bcrypt.hash('Agiel123', saltRounds)
      },
      {
        admin_name: 'Lexy',
        email: 'lexy@admins.com',
        password: await bcrypt.hash('Lexy123', saltRounds)
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    // intentionally left blank
  }
};
