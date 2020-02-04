const Router = require('koa-router');
const model = require('../database/models');
const crypto = require('crypto');
require('dotenv').config();

const userApi = new Router();

model.sequelize.sync().then(() => {
    console.log("DB connection success");
}).catch(err => {
    console.log("DB connection failed");
    console.log(err);
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// User 관련 API
// 회원 가입        : [POST]/users
// ID 중복 체크     : [GET]/users/ids/:userId
// 정보 조회        : [GET]/users
// 정보 수정        : [PUT]/users
// 회원 탈퇴        : [DELETE]/users
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// 회원 가입 API
// req: userId(신규 유저 Id/string), userPw(신규 유저 Pw/string), name(신규 유저 이름/string), engName(신규 유저 영어 이름/string)
// res: 성공 - OK(200) / 에러 - Error message(500)
// Front-end에서 검증(비어 있지 않은 값, 타입 일치, 중복되지 않은 Id)된 값을 전달하므로 실패할 수 없음
userApi.post('/users', async (ctx, next) => {
    if(ctx.request.headers.referer !== process.env.SIGNUP_REFERER) {
        console.log("[User]Create Failed: Unkown referer");
        ctx.body = "Bad request.";
        ctx.status = 400;
        return;
    }

    const { userId, userPw, name, engName } = ctx.request.body;

    // // userId, userPw, name, engName이 undefined인 경우는 front-end에서 소거, type은 string으로 보장
    // // Front-end 연산의 임시 코드
    // if(userId === undefined || userPw === undefined || name === undefined || engName === undefined) {
    //     console.log("[User]Sign Up Failed: Missing Information");
    //     ctx.body = "The required information is missing.\nHow to Use: [POST]/users\nSign up for new users\n";
    //     ctx.body += "req: userId(신규 유저 Id/string), userPw(신규 유저 Pw/string), name(신규 유저 이름/string), engName(신규 유저 영어 이름/string)";
    //     ctx.status = 400;
    //     return;
    // }
    // // front-end 연산의 임시 코드
    // else if(typeof(userId) !== "string" || typeof(userPw) !== "string" || typeof(name) !== "string" || typeof(engName) !== "string") {
    //     console.log("[User]Sign Up Failed: Missmatched Type");
    //     ctx.body = "The type of information does not match.\nHow to Use: [POST]/users\nSign up for new users\n";
    //     ctx.body += "req: userId(신규 유저 Id/string), userPw(신규 유저 Pw/string), name(신규 유저 이름/string), engName(신규 유저 영어 이름/string)";
    //     ctx.status = 400;
    //     return;
    // }

    // userId 중복 체크를 미리 진행하는 쪽으로 변경하여 해당 코드는 없어질 예정
    // let duplicate = false;
    // await model.sequelize.models.Users.findOne({
    //     where: { userId: userId }
    // }).then(result => {
    //     if(result) {
    //         console.log("[User]Create Failed: Duplicate Id");
    //         ctx.body = "The Id that already exists.";
    //         duplicate = true;
    //         ctx.status = 200;
    //     }
    // }).catch(err => {
    //     console.log(err);
    //     ctx.status = 500;
    // });

    const salt = crypto.randomBytes(64).toString('base64');
    const encryptedPw = crypto.pbkdf2Sync(userPw, salt, 10000, 128, 'sha512').toString('base64');

    // if(!duplicate) {
        await model.sequelize.models.Users.create({
            userId: userId, userPw: encryptedPw, salt: salt, name: name, engName: engName
        }).then(() => {
            console.log("[User]Create Success: Sign Up");
            ctx.status = 200;
        }).catch(err => {
            console.log(err);
            ctx.status = 500;
        });
    // }
});

// ID 중복 체크 API
// req: uId(중복 체크하려는 유저 Id/string)
// res: 성공 - 중복인 경우:1(200), 중복이 아닌 경우:0(200) / 에러 - Error message(500)
// Id가 undefined나 string 타입이 아닐 수 없으므로 실패할 수 없음
userApi.get('/users/ids/:userId', async (ctx, next) => {
    const { userId } = ctx.params;

    await model.sequelize.models.Users.findOne({
        where: { userId: userId }
    }).then(result => {
        console.log("[User]Read Success: Duplicate Check");
        if(result) ctx.body = 1;
        else ctx.body = 0;
        ctx.status = 200;
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    })
});

// 정보 조회 API
// req: Access token
// res: 성공 - User info(200) / 실패 - Fail message(401) / 에러 - Error message(500)
userApi.get('/users', async (ctx, next) => {
    const accessToken = ctx.cookies.get('accessToken');

    if(accessToken === undefined) {
        console.log("[User]Search Failed: Login Required");
        ctx.body = "You need to login.";
        ctx.status = 401;
    }
    else {
        const decodedToken = token.decodeToken(accessToken);

        await model.sequelize.models.Users.findOne({
            where: { userId: decodedToken.userId }
        }).then(result => {
            if(result) {
                let searchInfo = {};
                searchInfo.userId = result.dataValues.userId;
                searchInfo.name = result.dataValues.name;
                searchInfo.engName = result.dataValues.engName;

                console.log("[User]Read Success: Search Info");
                ctx.body = searchInfo;
            }
            // 없는 유저를 조회하는 일은 사실 상 불가능함
            else {
                console.log("[User]Read Failed: Nonexistent Id");
                ctx.body = "There is no user with that Id.";
            }
            ctx.status = 200;
        }).catch(err => {
            console.log(err);
            ctx.status = 500;
        });
    }
});

// 정보 수정 API
// req: userPw(새로운 유저 Pw/string), name(새로운 유저 이름/string), engName(새로운 유저 영어 이름/string) + Acccess token
// res: 성공 - OK(200) / 실패 - Fail message(401) / 에러 - Error message(500)
userApi.put('/users', async (ctx, next) => {
    const { userPw, name, engName } = ctx.request.body;

    // // userPw, name, engName이 undefined인 경우는 front-end에서 소거, type은 string으로 보장
    // // front-end 연산의 임시 코드
    // if(userPw === undefined || name === undefined || engName === undefined) {
    //     console.log("[User]Change Info failed: Missing Information");
    //     ctx.body = "The required information is missing.\nHow to Use: [PUT]/users\nChange user information\n";
    //     ctx.body += "req: userPw(변경 유저 Pw/string), name(변경 유저 이름/string), engName(변경 유저 영어 이름/string)";
    //     ctx.status = 400;
    //     return;
    // }
    // // front-end 연산의 임시 코드
    // else if(typeof(userPw) !== "string" || typeof(name) !== "string" || typeof(engName) !== "string") {
    //     console.log("[User]Change Info Failed: Missmatched Type");
    //     ctx.body = "The type of information does not match.\nHow to Use: [PUT]/users\nChange user information\n";
    //     ctx.body += "req: userPw(변경 유저 Pw/string), name(변경 유저 이름/string), engName(변경 유저 영어 이름/string)";
    //     ctx.status = 400;
    //     return;
    // }

    const accessToken = ctx.cookies.get('accessToken');
    
    if(accessToken === undefined) {
        console.log("[User]Update Failed: Login Required");
        ctx.body = "You need to login.";
        ctx.status = 401;
    }
    else {
        const decodedToken = token.decodeToken(accessToken);
        const salt = crypto.randomBytes(64).toString('base64');
        const encryptedPw = crypto.pbkdf2Sync(userPw, salt, 10000, 128, 'sha512').toString('base64');

        await model.sequelize.models.Users.update({
            userPw: encryptedPw, salt: salt, name: name, engName: engName
        }, {
            where: { userId: decodedToken.userId }
        }).then(() => {
            console.log("[User]Update Success: Change Info");
            ctx.status = 200;
        }).catch(err => {
            console.log(err);
            ctx.status = 500;
        });
    }
});

// 회원 탈퇴 API
// req: Access token
// res: 성공 - OK(200) + Access token(-) / 실패 - Fail message(401) / 에러 - Error message(500)
userApi.delete('/users', async (ctx, next) => {
    const accessToken = ctx.cookies.get('accessToken');

    if(accessToken === undefined) {
        console.log("[User]Delete Failed: Login Required");
        ctx.body = "You need to login.";
        ctx.status = 401;
    }
    else {
        const decodedToken = token.decodeToken(accessToken);

        ctx.cookies.set('accessToken', null);
        ctx.cookies.set('accessToken.sig', null);

        await model.sequelize.models.Users.destroy({
            where: { userId: decodedToken.userId }
        }).then(() => {
            console.log("[User]Delete success: Sign Out");
            ctx.status = 200;
        }).catch(err => {
            console.log(err);
            ctx.status = 500;
        });
    }
});

module.exports = userApi;