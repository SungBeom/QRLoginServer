'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('Users', {
    userId: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    userPw: {
      type: DataTypes.STRING,
      allowNull: false
    },
    salt: {
      type: DataTypes.STRING,
      allowNull: false
    },
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