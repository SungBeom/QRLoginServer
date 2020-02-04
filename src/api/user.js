const Router = require('koa-router');
const model = require('../database/models');
const token = require('../lib/token');
const crypto = require('crypto');
require('dotenv').config();

const userApi = new Router();

model.sequelize.sync().then(() => {
    console.log("DB connection success");
}).catch(err => {
    console.log("DB connection failed");
    console.log(err);
});

/*
 * User 관련 API
 * 회원 가입        : [POST]/users
 * ID 중복 확인     : [GET]/users/ids/:userId
 * 정보 조회        : [GET]/users
 * 정보 수정        : [PUT]/users
 * 회원 탈퇴        : [DELETE]/users
 */

/*
 * 회원 가입 API
 * req: userId(신규 유저 Id/string), userPw(신규 유저 Pw/string), name(신규 유저 이름/string), engName(신규 유저 영어 이름/string)
 * res: 성공 - OK(200) / 실패 - Fail message(400) / 에러 - Error message(500)
 */
userApi.post('/users', async (ctx, next) => {

    // referer 검증
    if (ctx.request.headers.referer !== process.env.SIGNUP_REFERER) {
        console.log("[User]Create Failed: Unkown referer");
        ctx.body = "Bad request.";
        ctx.status = STATUS_CODE.BAD_REQUEST;
        return;
    }

    const { userId, userPw, name, engName } = ctx.request.body;

    // 유저 비밀번호 암호화
    const salt = crypto.randomBytes(64).toString('base64');
    const encryptedPw = crypto.pbkdf2Sync(userPw, salt, 10000, 128, 'sha512').toString('base64');

    // DB에 유저 정보 등록
    await model.sequelize.models.Users.create({
        userId: userId, userPw: encryptedPw, salt: salt, name: name, engName: engName
    }).then(() => {
        console.log("[User]Create Success: Sign Up");
        ctx.status = STATUS_CODE.OK;
    }).catch(err => {
        console.log(err);
        ctx.status = STATUS_CODE.INTERNET_SERVER_ERROR;
    });
});

/*
 * ID 중복 확인 API
 * req: uId(중복 확인하려는 유저 Id/string)
 * res: 성공 - 중복인 경우: 1(200), 중복이 아닌 경우: 0(200) / 에러 - Error message(500)
 * Id가 undefined나 string 타입이 아닐 수 없으므로 실패할 수 없음
 */
userApi.get('/users/ids/:userId', async (ctx, next) => {
    const { userId } = ctx.params;

    await model.sequelize.models.Users.findOne({
        where: { userId: userId }
    }).then(result => {
        console.log("[User]Read Success: Duplicate Check");

        // 유저 ID가 중복된 경우 1, 중복되지 않은 경우 0을 body에 넣어줌
        result ? ctx.body = 1 : ctx.body = 0;
        ctx.status = STATUS_CODE.OK;
    }).catch(err => {
        console.log(err);
        ctx.status = STATUS_CODE.INTERNET_SERVER_ERROR;
    })
});

/*
 * 정보 조회 API
 * req: Access token
 * res: 성공 - User info(200) /
 *      실패 - access 토큰이 없는 경우: Fail message(401), access 토큰은 있으나 존재하지 않는 Id일 경우: Fail message(403) /
 *      에러 - Error message(500)
 */
userApi.get('/users', async (ctx, next) => {
    const accessToken = ctx.cookies.get('accessToken');

    // access 토큰 없음
    if (accessToken === undefined) {
        console.log("[User]Search Failed: Login Required");
        ctx.body = "You need to login.";
        ctx.status = STATUS_CODE.UNAUTHORIZED;
    }
    else {
        const decodedToken = token.decodeToken(accessToken);

        await model.sequelize.models.Users.findOne({
            where: { userId: decodedToken.userId }
        }).then(result => {

            // 존재하지 않는 유저 ID 조회(토큰 없이 불가능)
            if (result === null) {
                console.log("[User]Read Failed: Nonexistent Id");
                ctx.body = "There is no user with that Id.";
                ctx.status = STATUS_CODE.FORBIDDEN;
            }

            // 정보 조회 성공
            else {
                console.log("[User]Read Success: Search Info");
                let searchInfo = {};

                searchInfo.userId = result.dataValues.userId;
                searchInfo.name = result.dataValues.name;
                searchInfo.engName = result.dataValues.engName;

                ctx.body = searchInfo;
                ctx.status = STATUS_CODE.OK;
            }
        }).catch(err => {
            console.log(err);
            ctx.status = STATUS_CODE.INTERNET_SERVER_ERROR;
        });
    }
});

/*
 * 정보 수정 API
 * req: userPw(새로운 유저 Pw/string), name(새로운 유저 이름/string), engName(새로운 유저 영어 이름/string) + Acccess token
 * res: 성공 - OK(200) / 실패 - Fail message(401) / 에러 - Error message(500)
 */
userApi.put('/users', async (ctx, next) => {
    const accessToken = ctx.cookies.get('accessToken');
    const { userPw, name, engName } = ctx.request.body;
    
    // access 토큰 없음
    if (accessToken === undefined) {
        console.log("[User]Update Failed: Login Required");
        ctx.body = "You need to login.";
        ctx.status = STATUS_CODE.UNAUTHORIZED;
    }

    // 정보 수정 성공
    else {
        const decodedToken = token.decodeToken(accessToken);

        // 유저 비밀번호 암호화
        const salt = crypto.randomBytes(64).toString('base64');
        const encryptedPw = crypto.pbkdf2Sync(userPw, salt, 10000, 128, 'sha512').toString('base64');

        // DB의 유저 정보 갱신
        await model.sequelize.models.Users.update({
            userPw: encryptedPw, salt: salt, name: name, engName: engName
        }, {
            where: { userId: decodedToken.userId }
        }).then(() => {
            console.log("[User]Update Success: Change Info");
            ctx.status = STATUS_CODE.OK;
        }).catch(err => {
            console.log(err);
            ctx.status = STATUS_CODE.INTERNET_SERVER_ERROR;
        });
    }
});

/*
 * 회원 탈퇴 API
 * req: Access token
 * res: 성공 - OK(200) + Access token(-) / 실패 - Fail message(401) / 에러 - Error message(500)
 */
userApi.delete('/users', async (ctx, next) => {
    const accessToken = ctx.cookies.get('accessToken');

    // access 토큰 없음
    if (accessToken === undefined) {
        console.log("[User]Delete Failed: Login Required");
        ctx.body = "You need to login.";
        ctx.status = STATUS_CODE.UNAUTHORIZED;
    }

    // 회원 탈퇴 성공
    else {
        const decodedToken = token.decodeToken(accessToken);

        // access 토큰 폐기
        ctx.cookies.set('accessToken', null);
        ctx.cookies.set('accessToken.sig', null);

        // DB에서 유저 정보 제거
        await model.sequelize.models.Users.destroy({
            where: { userId: decodedToken.userId }
        }).then(() => {
            console.log("[User]Delete success: Sign Out");
            ctx.status = STATUS_CODE.OK;
        }).catch(err => {
            console.log(err);
            ctx.status = STATUS_CODE.INTERNET_SERVER_ERROR;
        });
    }
});

module.exports = userApi;