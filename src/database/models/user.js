'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('Users', {
    userId: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    userPw: DataTypes.STRING,
    userSalt: DataTypes.STRING,
    name: DataTypes.STRING,
    engName: DataTypes.STRING
  }, {
    freezeTableName: true,
    timestamps: false
  });
  User.associate = function(models) {
    // associations can be defined here
  };
  return User;
};