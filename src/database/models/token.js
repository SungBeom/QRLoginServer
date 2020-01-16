'use strict';
module.exports = (sequelize, DataTypes) => {
  const Token = sequelize.define('Tokens', {
    tokenId: {
      type: DataTypes.STRING,
      primaryKey: true
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