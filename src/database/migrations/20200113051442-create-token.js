'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Tokens', {
      tokenId: {
        type: Sequelize.STRING,
        primaryKey: true
      },
      loginStatus: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      loginId: {
        type: Sequelize.STRING
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Tokens');
  }
};