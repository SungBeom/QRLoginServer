const Router = require('koa-router');
const model = require('../database/models');
const token = require('../lib/token');
const fetch = require('node-fetch');
const crypto = require('crypto');
require('dotenv').config();

const authApi = new Router();

model.sequelize.sync().then(() => {
    console.log("DB connection success");
}).catch(err => {
    console.log("DB connection failed");
    console.log(err);
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 인증 관련 API
// 로그인           : [POST]/auth
// 로그아웃          : [DELETE]/auth
// 로그인 체크       : [GET]/auth
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// 로그인 API
// req: userId(기존 유저 Id/string), userPw(기존 유저 Pw/string)
// res: 성공 - OK(200) + Access token(+) / 실패 - Fail message(401) / 에러 - Error message(500)
authApi.post('/auth', async (ctx, next) => {
    if(ctx.request.headers.referer !== process.env.LOGIN_REFERER) {
        console.log("[Auth]Create Failed: Unkown referer");
        ctx.body = "Bad request.";
        ctx.status = 400;
        return;
    }

    const { userId, userPw, codeData, kakaoToken } = ctx.request.body;

    // // userId, userPw가 undefined인 경우는 front-end에서 소거, type은 string으로 보장
    // // client 연산의 임시 코드
    // if(userId === undefined || userPw === undefined) {
    //     console.log("[User]Login Failed: Missing Information");
    //     ctx.body = "The required information is missing.\nHow to Use: [POST]/auth/login\nLogin for registered user\n";
    //     ctx.body += "req: userId(로그인하는 유저 Id/string), userPw(로그인하는 유저 Pw/string)";
    //     ctx.status = 400;
    //     return;
    // }
    // // client 연산의 임시 코드
    // else if(typeof(userId) !== "string" || typeof(userPw) !== "string") {
    //     console.log("[User]Login Failed: Missmatched Type");
    //     ctx.body = "The type of information does not match.\nHow to Use: [POST]/auth/login\nLogin for registered user\n";
    //     ctx.body += "req: userId(로그인하는 유저 Id/string), userPw(로그인하는 유저 Pw/string)";
    //     ctx.status = 400;
    //     return;
    // }

    // userId 중복 체크를 미리 진행하는 쪽으로 변경하여 해당 코드는 없어질 예정
    // let duplicate = true;
    // await model.sequelize.models.Users.findOne({
    //     where: { userId: userId }
    // }).then(result => {
    //     if(!result) {
    //         console.log("[Auth]Create Failed: Nonexistent Id");
    //         ctx.body = "There is no user with that Id.";
    //         duplicate = false;
    //     }
    // }).catch(err => {
    //     console.log(err);
    //     ctx.status = 500;
    // });

    // if(duplicate) {
        // 카카오 로그인 시도
        if(kakaoToken !== "") {
            let userId = "";
            let nickName = "";

            await fetch("https://kapi.kakao.com/v2/user/me", { headers: { "Authorization": "Bearer " + kakaoToken }})
            .then(res => res.json()).then(result => {
                // 누군가가 비정상적인 접근 시도를 하는 경우
                if(result.kakao_account === undefined) {
                    console.log("[Auth]Create Failed: Invalid Kakao Token");
                    ctx.body = "Invalid kakao token.";
                    ctx.status = 401;
                }
                else {
                    userId = "+" + result.id;
                    nickName = result.kakao_account.profile.nickname;
                }
            }).catch(err => {
                console.log(err);
                ctx.status = 500;
            });

            if(nickName !== "") {
                const temp = crypto.randomBytes(64).toString('base64');
                const salt = crypto.randomBytes(64).toString('base64');
                const tempPw = crypto.pbkdf2Sync(temp, salt, 10000, 128, 'sha512').toString('base64');

                await model.sequelize.models.Users.findOrCreate({
                    where: { userId: userId },
                    defaults: {
                        userId: userId, userPw: tempPw, salt: salt, name: nickName, engName: nickName
                    }
                }).then(() => {
                    console.log("[Auth]Create Success: Token Created");
                    const accessToken = token.generateToken({ userId: nickName });

                    ctx.cookies.set("accessToken", accessToken, { maxAge: 1000 * 60 * 60 * 21, sameSite: "Strict", overwrite: true });
                    ctx.status = 200;
                }).catch(err => {
                    console.log(err);
                    ctx.status = 500;
                });
            }
        }
        // 일반 로그인 시도
        else if(userId !== "" && userPw !== "") {
            await model.sequelize.models.Users.findOne({
                where: { userId: userId }
            }).then(result => {
                if(result === null) {
                    console.log("[Auth]Create Failed: Incorrect ID/Password");
                    ctx.body = "The ID or password is incorrect.";
                    ctx.status = 401;
                }
                else {
                    const encryptedPw = crypto.pbkdf2Sync(userPw, result.salt, 10000, 128, 'sha512').toString('base64');
    
                    if(result.userPw !== encryptedPw) {
                        console.log("[Auth]Create Failed: Incorrect ID/Password");
                        ctx.body = "The ID or password is incorrect.";
                        ctx.status = 401;
                    }
                    else {
                        console.log("[Auth]Create Success: Token Created");
                        const accessToken = token.generateToken({ userId: userId });
        
                        ctx.cookies.set("accessToken", accessToken, { maxAge: 1000 * 60 * 60 * 21, sameSite: "Strict", overwrite: true });
                        ctx.status = 200;
                    }
                }
            }).catch(err => {
                console.log(err);
                ctx.status = 500;
            });
        }
        // QR 로그인 시도
        else if(codeData !== "") {
            await model.sequelize.models.QRCodes.findOne({
                where: { codeData: codeData }
            }).then(async result => {
                // 누군가가 비정상적인 접근 시도를 하는 경우
                if(!result || result.userId === null) {
                    console.log("[Auth]Create Failed: Invalid QR Code");
                    ctx.body = "Invalid qr code.";
                    ctx.status = 401;
                }
                else {
                    await model.sequelize.models.QRCodes.destroy({
                        where: { codeData: codeData }
                    }).then(() => {
                        console.log("[Auth]Create Success: Token Created");
                        const accessToken = token.generateToken({ userId: result.userId });

                        ctx.cookies.set("accessToken", accessToken, { maxAge: 1000 * 60 * 60 * 21, sameSite: "Strict", overwrite: true });
                        ctx.status = 200;
                    }).catch(err => {
                        console.log(err);
                        ctx.status = 500;
                    });
                }
            }).catch(err => {
                console.log(err);
                ctx.status = 500;
            });
        }
    // }
});

// 로그아웃 API
// req: access token
// res: 성공 - OK(200) + access token(-) / 실패 - Fail message(401)
// 토큰 관련이 아니라면 에러 상황은 없음
authApi.delete('/auth', (ctx, next) => {
    const accessToken = ctx.cookies.get('accessToken');

    if(accessToken === undefined) {
        console.log("[Auth]Delete Failed: Login Required");
        ctx.body = "You need to login.";
        ctx.status = 401;
    }
    else {
        ctx.cookies.set("accessToken", null);
        ctx.cookies.set("accessToken.sig", null);

        console.log("[Auth]Delete Success: Logout");
        ctx.status = 200;
    }
});

// 로그인 체크 API
// req: access token
// res: 성공 - Welcome message(200) / 실패 - Fail message(401)
authApi.get('/auth', (ctx, next) => {
    let accessToken = ctx.cookies.get('accessToken');

    if(accessToken === undefined) {
        console.log("[Auth]Read Failed: Login Required");
        ctx.body = "You need to login.";
        ctx.status = 401;
    }
    else {
        let decodedToken = token.decodeToken(accessToken);

        console.log("[Auth]Read Success: Login");
        ctx.body = "Welcome " + decodedToken.userId + "!";
        ctx.status = 200;
    }
});

module.exports = authApi;