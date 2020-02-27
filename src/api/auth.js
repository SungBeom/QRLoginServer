const Router = require('koa-router');
const redis = require('async-redis');
const token = require('../lib/token');
const fetch = require('node-fetch');
const crypto = require('crypto');
require('dotenv').config();

const authApi = new Router();
const client = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_IP);
client.auth(process.env.REDIS_KEY);

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
 *      실패 - referer가 다른 경우: Fail message(400), 없는 Id이거나 비밀번호가 불일치하는 경우: Fail message(401), 누군가 비정상적인 접근 시도를 하는 경우: Fail message(403) /
 *      에러 - Error message(500)
 * userId, userPw가 내용을 가질 때: 일반 로그인 / codeData가 내용을 가질 때: QR 로그인 / kakaoToken이 내용을 가질 때: 카카오 로그인
 * 각 로그인 상황이 아닌 경우 나머지는 모두 공백으로 넘어오게 됨
 */
authApi.post('/auth', async (ctx, next) => {

    // referer 검증
    if (ctx.request.headers.referer !== process.env.LOGIN_REFERER) {
        console.log("[Auth]Create Failed: Unkown referer");
        ctx.body = "Bad request.";
        ctx.status = STATUS_CODE.BAD_REQUEST;
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
                ctx.status = STATUS_CODE.FORBIDDEN;
            }

            // 로그인 성공(이후의 if문에 이어짐)
            else {
                userId = "+" + result.id;
                nickName = result.kakao_account.profile.nickname;
            }
        }).catch(err => {
            console.log(err);
            ctx.status = STATUS_CODE.INTERNET_SERVER_ERROR;
        });

        // 로그인 성공
        if (nickName !== "") {
            const temp = crypto.randomBytes(64).toString('base64');
            const salt = crypto.randomBytes(64).toString('base64');
            const tempPw = crypto.pbkdf2Sync(temp, salt, 10000, 128, 'sha512').toString('base64');

            const value = { userPw: tempPw, salt, name: nickName, engName: nickName };

            // 최초 로그인 시 카카오 계정 정보를 이용해 DB에 사용자 등록
            await client.hmset(userId, value);

            console.log("[Auth]Create Success: Token Created");
            const accessToken = token.generateToken({ userId: userId });

            // access token 발급
            ctx.cookies.set("accessToken", accessToken, { maxAge: 1000 * 60 * 60 * 21, sameSite: "Strict", overwrite: true });
            ctx.status = STATUS_CODE.OK;
        }
    }

    // ID + password 방식의 로그인
    else if (userId !== "" && userPw !== "") {
        const value = await client.hgetall(userId);

        // 존재하지 않는 ID
        if (value === null) {
            console.log("[Auth]Create Failed: Incorrect ID/Password");
            ctx.body = "The ID or password is incorrect.";
            ctx.status = STATUS_CODE.UNAUTHORIZED;
        }
        else {
            const encryptedPw = crypto.pbkdf2Sync(userPw, value.salt, 10000, 128, 'sha512').toString('base64');

            // 비밀번호 불일치
            if (value.userPw !== encryptedPw) {
                console.log("[Auth]Create Failed: Incorrect ID/Password");
                ctx.body = "The ID or password is incorrect.";
                ctx.status = STATUS_CODE.UNAUTHORIZED;
            }

            // 로그인 성공
            else {
                console.log("[Auth]Create Success: Token Created");
                const accessToken = token.generateToken({ userId: userId });

                // access token 발급
                ctx.cookies.set("accessToken", accessToken, { maxAge: 1000 * 60 * 60 * 21, sameSite: "Strict", overwrite: true });
                ctx.status = STATUS_CODE.OK;
            }
        }
    }

    // QR 코드를 이용한 로그인
    else if (codeData !== "") {
        const result = await client.get(codeData);

        // QR 코드가 없는 경우
        if (result === null) {
            console.log("[Auth]Create Failed: Invalid QR Code");
            ctx.body = "Invalid qr code.";
            ctx.status = STATUS_CODE.FORBIDDEN;
        }

        else {
            const value = await client.exists(result);

            // 누군가가 비정상적인 접근 시도를 하는 경우
            if (value === 0) {
                console.log("[Auth]Create Failed: Invalid QR Code");
                ctx.body = "Invalid qr code.";
                ctx.status = STATUS_CODE.FORBIDDEN;
            }

            // 로그인 성공
            else {

                // qr code 정보 폐기
                await client.del(codeData);

                console.log("[Auth]Create Success: Token Created");
                const accessToken = token.generateToken({ userId: result });

                // access token 발급
                ctx.cookies.set("accessToken", accessToken, { maxAge: 1000 * 60 * 60 * 21, sameSite: "Strict", overwrite: true });
                ctx.status = STATUS_CODE.OK;
            }
        }
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
        ctx.status = STATUS_CODE.UNAUTHORIZED;
    }

    // 로그아웃 성공
    else {
        console.log("[Auth]Delete Success: Logout");

        // access 토큰 폐기
        ctx.cookies.set("accessToken", null);
        ctx.cookies.set("accessToken.sig", null);       
        ctx.status = STATUS_CODE.OK;
    }
});

/*
 * 로그인 검증 API
 * req: access token
 * res: 성공 - Welcome message(200) / 실패 - Fail message(401) / 에러 - Error message(500)
 * 토큰 관련 에러가 아니라면 API 내의 에러 상황은 없음
 */
authApi.get('/auth', async (ctx, next) => {
    let accessToken = ctx.cookies.get('accessToken');

    // access 토큰 없음
    if (accessToken === undefined) {
        console.log("[Auth]Read Failed: Login Required");
        ctx.body = "You need to login.";
        ctx.status = STATUS_CODE.UNAUTHORIZED;
    }

    // 로그인 검증 성공
    else {
        let decodedToken;
        try {
            decodedToken = token.decodeToken(accessToken);
        } catch(err) {
            console.log("[Auth]Read Failed: Token Expired");
            ctx.body = "Token expired."
            ctx.status = STATUS_CODE.UNAUTHORIZED;
        }

        const result = await client.hgetall(decodedToken.userId);

        // 존재하지 않는 유저 ID(토큰 없이 불가능)
        if (result === null) {
            console.log("[Auth]Read Failed: Nonexistent Id");
            ctx.body = "There is no user with that Id.";
            ctx.status = STATUS_CODE.FORBIDDEN;
        }

        // ID에 등록된 이름 검색 성공
        else {
            console.log("[Auth]Read Success: Login");
            ctx.body = "Welcome " + result.name + "!";
            ctx.status = STATUS_CODE.OK;
        }
    }
});

module.exports = authApi;