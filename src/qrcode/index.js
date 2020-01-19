const QRCode = require('qrcode');
const canvas = document.getElementById('canvas');

fetch("http://localhost:3000/codes", { method: 'post' })
.then(res => res.json())
.then(QRContent => {
    QRCode.toCanvas(canvas, "http://localhost:3000/codes/" + QRContent.randomCode, { width: 300, color: { dark: "#222222FF", light: "#F0F8FFFF" } }, err => {
        if(err) console.log(err);

        let count = 0;
        let timer = setInterval(() => {
            if(++count === 30) {
                fetch("http://localhost:3000/codes/" + QRContent.randomCode)
                .then(() => {
                    clearInterval(timer);
                });
            }

            fetch("http://localhost:3000/codes/" + QRContent.randomCode)
            .then(res2 => res2.json())
            .then(result => {
                if(result.loginId !== null) {
                    fetch("http://localhost:3000/codes/" + QRContent.randomCode, { method: 'delete' })
                    .then(() => {
                        location.href = "success.html?uId=" + result.loginId;
                    });
                }
            });
        }, 1000);
    });
});

