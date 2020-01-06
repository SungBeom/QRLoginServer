'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Users', {
      userId: {
        type: Sequelize.STRING,
        primaryKey: true
      },
      userPw: {
        type: Sequelize.STRING
      },
      name: {
        type: Sequelize.STRING
      },
      engName: {
        type: Sequelize.STRING
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Users');
  }
};