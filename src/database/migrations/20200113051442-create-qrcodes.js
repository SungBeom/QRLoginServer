'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('QRCodes', {
      codeData: {
        type: Sequelize.STRING,
        primaryKey: true
      },
      userId: {
        type: Sequelize.STRING
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('QRCodes');
  }
};