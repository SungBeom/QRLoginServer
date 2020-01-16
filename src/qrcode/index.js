const QRCode = require('qrcode');
const canvas = document.getElementById('canvas');

fetch("http://localhost:3000/tokens")
.then(res => res.json())
.then(QRContent => {
    QRCode.toCanvas(canvas, "http://localhost:3000/auth/" + QRContent.randomToken, { width: 300, color: { dark: "#222222FF", light: "#F0F8FFFF" } }, err => {
        if(err) console.log(err);

        let count = 0;
        let timer = setInterval(() => {
            if(++count === 30) clearInterval(timer);

            fetch("http://localhost:3000/tokens/" + QRContent.randomToken)
            .then(res2 => res2.json())
            .then(result => {
                if(result.loginId !== null) {
                    fetch("http://localhost:3000/tokens/" + QRContent.randomToken, { method: 'delete' })
                    .then(() => {
                        location.href = "success.html?uId=" + result.loginId;
                    });
                }
            });
        }, 1000);
    });
});
