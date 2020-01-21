const QRCode = require('qrcode');
const canvas = document.getElementById('canvas');

fetch("http://localhost:3000/codes", { method: 'post' })
.then(res => res.json())
.then(QRContent => {
    QRCode.toCanvas(canvas, "http://localhost:3000/codes/" + QRContent.rcodeData, { width: 300, color: { dark: "#222222FF", light: "#F0F8FFFF" } }, err => {
        if(err) console.log(err);

        let count = 0;
        let timer = setInterval(() => {
            if(++count === 30) {
                fetch("http://localhost:3000/codes/" + QRContent.codeData)
                .then(() => {
                    fetch("http://localhost:3000/codes/" + QRContent.codeData, { method: 'delete' })
                    .then(() => {
                        clearInterval(timer);
                    });
                });
            }

            fetch("http://localhost:3000/codes/" + QRContent.codeData, { method: 'put' })
            .then(res2 => res2.json())
            .then(result => {
                if(result.userId !== null) {
                    fetch("http://localhost:3000/codes/" + QRContent.codeData, { method: 'delete' })
                    .then(() => {
                        location.href = "success.html?uId=" + result.userId;
                    });
                }
            });
        }, 1000);
    });
});