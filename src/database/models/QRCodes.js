'use strict';
module.exports = (sequelize, DataTypes) => {
  const QRCode = sequelize.define('QRCodes', {
    codeData: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    userId: DataTypes.STRING
  }, {
    freezeTableName: true,
    timestamps: false
  });
  Token.associate = function(models) {
    // associations can be defined here
  };
  return QRCode;
};