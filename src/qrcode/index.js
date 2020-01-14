const QRCode = require('qrcode');
const canvas = document.getElementById('canvas');

QRCode.toCanvas(canvas, "localhost:3000/auth", { width: 300, color: { dark: "#222222FF", light: "#F0F8FFFF" } }, err => {
    if(err) console.log(err);
});