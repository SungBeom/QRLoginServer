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

/*
 * 인증 관련 API
 * 로그인           : [POST]/auth
 * 로그아웃          : [DELETE]/auth
 * 로그인 검증       : [GET]/auth
 */

/*
 * 로그인 API
 * req: userId(기존 유저 Id/string), userPw(기존 유저 Pw/string), codeData(QR Code로 전달된 data/string), kakaoToken(kakao 토큰/string)
 * res: 성공 - OK(200) + Access token(+) /
 *      실패 - referer가 다른 경우: Fail message(400), 누군가 비정상적인 접근 시도를 하는 경우: Fail message(401) /
 *      에러 - Error message(500)
 * userId, userPw가 내용을 가질 때: 일반 로그인 / codeData가 내용을 가질 때: QR 로그인 / kakaoToken이 내용을 가질 때: 카카오 로그인
 * 각 로그인 상황이 아닌 경우 나머지는 모두 공백으로 넘어오게 됨
 */
authApi.post('/auth', async (ctx, next) => {

    // referer 검증
    if (ctx.request.headers.referer !== process.env.LOGIN_REFERER) {
        console.log("[Auth]Create Failed: Unkown referer");
        ctx.body = "Bad request.";
        ctx.status = 400;
        return;
    }

    const { userId, userPw, codeData, kakaoToken } = ctx.request.body;

    // 카카오 계정을 이용한 로그인
    if (kakaoToken !== "") {
        let userId = "";
        let nickName = "";

        // 카카오 API 호출
        await fetch("https://kapi.kakao.com/v2/user/me", { headers: { "Authorization": "Bearer " + kakaoToken }}).then(res => res.json()).then(result => {

            // 누군가가 비정상적인 접근 시도를 하는 경우
            if (result.kakao_account === undefined) {
                console.log("[Auth]Create Failed: Invalid Kakao Token");
                ctx.body = "Invalid kakao token.";
                ctx.status = 401;
            }

            // 로그인 성공(이후의 if문에 이어짐)
            else {
                userId = "+" + result.id;
                nickName = result.kakao_account.profile.nickname;
            }
        }).catch(err => {
            console.log(err);
            ctx.status = 500;
        });

        // 로그인 성공
        if (nickName !== "") {
            const temp = crypto.randomBytes(64).toString('base64');
            const salt = crypto.randomBytes(64).toString('base64');
            const tempPw = crypto.pbkdf2Sync(temp, salt, 10000, 128, 'sha512').toString('base64');

            // 최초 로그인 시 카카오 계정 정보를 이용해 DB에 사용자 등록
            await model.sequelize.models.Users.findOrCreate({
                where: { userId: userId },
                defaults: { userId: userId, userPw: tempPw, salt: salt, name: nickName, engName: nickName }
            }).then(() => {
                console.log("[Auth]Create Success: Token Created");
                const accessToken = token.generateToken({ userId: nickName });

                // access token 발급
                ctx.cookies.set("accessToken", accessToken, { maxAge: 1000 * 60 * 60 * 21, sameSite: "Strict", overwrite: true });
                ctx.status = 200;
            }).catch(err => {
                console.log(err);
                ctx.status = 500;
            });
        }
    }

    // ID + password 방식의 로그인
    else if (userId !== "" && userPw !== "") {
        await model.sequelize.models.Users.findOne({
            where: { userId: userId }
        }).then(result => {

            // 존재하지 않는 ID
            if (result === null) {
                console.log("[Auth]Create Failed: Incorrect ID/Password");
                ctx.body = "The ID or password is incorrect.";
                ctx.status = 401;
            }
            else {
                const encryptedPw = crypto.pbkdf2Sync(userPw, result.salt, 10000, 128, 'sha512').toString('base64');

                // 비밀번호 불일치
                if (result.userPw !== encryptedPw) {
                    console.log("[Auth]Create Failed: Incorrect ID/Password");
                    ctx.body = "The ID or password is incorrect.";
                    ctx.status = 401;
                }

                // 로그인 성공
                else {
                    console.log("[Auth]Create Success: Token Created");
                    const accessToken = token.generateToken({ userId: userId });
    
                    // access token 발급
                    ctx.cookies.set("accessToken", accessToken, { maxAge: 1000 * 60 * 60 * 21, sameSite: "Strict", overwrite: true });
                    ctx.status = 200;
                }
            }
        }).catch(err => {
            console.log(err);
            ctx.status = 500;
        });
    }

    // QR 코드를 이용한 로그인
    else if (codeData !== "") {
        await model.sequelize.models.QRCodes.findOne({
            where: { codeData: codeData }
        }).then(async result => {
            
            // 누군가가 비정상적인 접근 시도를 하는 경우
            if (!result || result.userId === null) {
                console.log("[Auth]Create Failed: Invalid QR Code");
                ctx.body = "Invalid qr code.";
                ctx.status = 401;
            }

            // 로그인 성공
            else {

                // qr code 정보 폐기
                await model.sequelize.models.QRCodes.destroy({
                    where: { codeData: codeData }
                }).then(() => {
                    console.log("[Auth]Create Success: Token Created");
                    const accessToken = token.generateToken({ userId: result.userId });

                    // access token 발급
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
});

/*
 * 로그아웃 API
 * req: access token
 * res: 성공 - OK(200) + access token(-) / 실패 - Fail message(401) / 에러 - Error message(500)
 * 토큰 관련 에러가 아니라면 API 내의 에러 상황은 없음
 */
authApi.delete('/auth', (ctx, next) => {
    const accessToken = ctx.cookies.get('accessToken');

    // access 토큰 없음
    if (accessToken === undefined) {
        console.log("[Auth]Delete Failed: Login Required");
        ctx.body = "You need to login.";
        ctx.status = 401;
    }

    // 로그아웃 성공
    else {
        console.log("[Auth]Delete Success: Logout");

        // access 토큰 폐기
        ctx.cookies.set("accessToken", null);
        ctx.cookies.set("accessToken.sig", null);       
        ctx.status = 200;
    }
});

/*
 * 로그인 검증 API
 * req: access token
 * res: 성공 - Welcome message(200) / 실패 - Fail message(401) / 에러 - Error message(500)
 * 토큰 관련 에러가 아니라면 API 내의 에러 상황은 없음
 */
authApi.get('/auth', (ctx, next) => {
    let accessToken = ctx.cookies.get('accessToken');

    // access 토큰 없음
    if (accessToken === undefined) {
        console.log("[Auth]Read Failed: Login Required");
        ctx.body = "You need to login.";
        ctx.status = 401;
    }

    // 로그인 검증 성공
    else {
        let decodedToken = token.decodeToken(accessToken);

        console.log("[Auth]Read Success: Login");
        ctx.body = "Welcome " + decodedToken.userId + "!";
        ctx.status = 200;
    }
});

module.exports = authApi;