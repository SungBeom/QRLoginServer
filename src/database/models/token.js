'use strict';
module.exports = (sequelize, DataTypes) => {
  const Token = sequelize.define('Tokens', {
    tokenId: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    loginStatus: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    loginId: DataTypes.STRING
  }, {
    freezeTableName: true,
    timestamps: false
  });
  Token.associate = function(models) {
    // associations can be defined here
  };
  return Token;
};