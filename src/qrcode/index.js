const QRCode = require('qrcode');

// terminal test
QRCode.toString('crpyted cookie info which never decode when who dont have key', { type: 'terminal' }, (err, url) => {
    if(err) console.log(err);
    else console.log(url);
});

module.exports = QRCode;