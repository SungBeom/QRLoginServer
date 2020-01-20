'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Users', [{
      userId: 'ab12',
      userPw: 'abcd1234',
      salt: 'salt1',
      name: '성범0',
      engName: 'arron0'
    },{
      userId: 'cd34',
      userPw: 'efgh5678',
      salt: 'salt2',
      name: '성범1',
      engName: 'arron1'
    }, {
      userId: 'ef56',
      userPw: 'igkl9012',
      salt: 'salt3',
      name: '성범2',
      engName: 'arron2'
    }], {});
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Users', null, {});
  }
};
