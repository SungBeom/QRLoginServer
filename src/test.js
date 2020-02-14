const fs = require('fs');

const fileContent = `TEST_API=https://qrapi.devel.kakao.com
TEST_LOGIN_REFERER=https://qrlogin.devel.kakao.com/
TEST_SIGNUP_REFERER=https://qrlogin.devel.kakao.com/signup.html
TEST_KAKAO_TOKEN=` + process.argv[2];

fs.writeFile('.env', fileContent, err => {
    if (err) {
        console.log(err);
    }
    console.log(".env file was created successfully.");
});