const QRCode = require('qrcode');
const canvas = document.getElementById('canvas');

let QRContent;
fetch("http://localhost:3000/tokens")
.then(res => res.json())
.then(data => {
    console.log(data);
    QRContent = data;
});

QRCode.toCanvas(canvas, "http://localhost:3000/auth/" + QRContent, { width: 300, color: { dark: "#222222FF", light: "#F0F8FFFF" } }, err => {
    if(err) console.log(err);
});