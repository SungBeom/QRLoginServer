const Router = require('koa-router');
const model = require('../database/models');
const token = require('../lib/token');
const fetch = require('node-fetch');
const crypto = require('crypto');
const uuidv4 = require('uuid/v4');
require('dotenv').config();

const api = new Router();

model.sequelize.sync().then(() => {
    console.log("DB connection success");
}).catch(err => {
    console.log("DB connection failed");
    console.log(err);
});

// 로그인 테스트, front-end의 기능을 임시 구현
api.get('/', async (ctx, next) => {
    ctx.body = "QRLogin API Server.";
    ctx.status = 200;
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
api.post('/users', async (ctx, next) => {
    if(ctx.request.headers.referer !== process.env.WEB_REFERER) {
        console.log("[Auth]Create Failed: Unkown referer");
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
api.get('/users/ids/:userId', async (ctx, next) => {
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
api.get('/users', async (ctx, next) => {
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
api.put('/users', async (ctx, next) => {
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
api.delete('/users', async (ctx, next) => {
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


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 인증 관련 API
// 로그인           : [POST]/auth
// 로그아웃          : [DELETE]/auth
// 로그인 체크       : [GET]/auth
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// 로그인 API
// req: userId(기존 유저 Id/string), userPw(기존 유저 Pw/string)
// res: 성공 - OK(200) + Access token(+) / 실패 - Fail message(401) / 에러 - Error message(500)
api.post('/auth', async (ctx, next) => {
    if(ctx.request.headers.referer !== process.env.WEB_REFERER) {
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
            let nickName = "";

            await fetch("https://kapi.kakao.com/v2/user/me", { headers: { "Authorization": "Bearer " + kakaoToken }})
            .then(res => res.json()).then(result => {
                // 누군가가 비정상적인 접근 시도를 하는 경우
                if(result.nickName === undefined) {
                    console.log("[Auth]Create Failed: Invalid Kakao Token");
                    ctx.body = "Invalid kakao token.";
                    ctx.status = 401;
                }
                else {
                    nickName = result.kakao_account.profile.nickname;
                }
            }).catch(err => {
                console.log(err);
                ctx.status = 500;
            });

            if(nickName !== "") {
                console.log("[Auth]Create Success: Token Created");
                const accessToken = token.generateToken({ userId: nickName });

                ctx.cookies.set("accessToken", accessToken, { maxAge: 1000 * 60 * 60 * 21, sameSite: "Strict", overwrite: true });
                ctx.status = 200;
            }
        }
        // 일반 로그인 시도
        else if(userId !== "" && userPw !== "") {
            await model.sequelize.models.Users.findOne({
                where: { userId: userId }
            }).then(result => {
                const encryptedPw = crypto.pbkdf2Sync(userPw, result.salt, 10000, 128, 'sha512').toString('base64');
    
                if(result.userPw !== encryptedPw) {
                    console.log("[Auth]Create Failed: Incorrect Password");
                    ctx.body = "The password is incorrect.";
                    ctx,status = 401;
                }
                else {
                    console.log("[Auth]Create Success: Token Created");
                    const accessToken = token.generateToken({ userId: userId });
    
                    ctx.cookies.set("accessToken", accessToken, { maxAge: 1000 * 60 * 60 * 21, sameSite: "Strict", overwrite: true });
                    ctx.status = 200;
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
api.delete('/auth', (ctx, next) => {
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
api.get('/auth', (ctx, next) => {
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


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// QR 관련 API
// QR 생성       : [POST]/codes
// QR 로그인      : [GET]/codes/:codeData(의미상 PUT)
// QR 로그인 체크  : [PUT]/codes/:codeData(의미상 GET)
// QR 삭제       : [DELETE]/codes/:codeData
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// QR 생성 API
// req: x
// res: 성공 - random QR code data(200) / 에러: Error message(500)
// 단순 QR code에 들어갈 데이터를 생성하는 것이므로 실패할 수 없음
api.post('/codes', async (ctx, next) => {
    if(ctx.request.headers.referer !== process.env.WEB_REFERER) {
        console.log("[Auth]Create Failed: Unkown referer");
        ctx.body = "Bad request.";
        ctx.status = 400;
        return;
    }

    // const codeData = crypto.randomBytes(64).toString('hex');
    // const codeData = crypto.randomBytes(32).toString('base64');
    const codeData = uuidv4();

    await model.sequelize.models.QRCodes.create({
        codeData: codeData
    }).then(result => {
        console.log("[QR]Create Success: QR Code Created");
        ctx.body = { codeData: codeData };
        ctx.status = 200;
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    });
});

// QR 로그인 API
// req: codeData(QR code로 전달된 data/string)
// res: 성공 - 로그인 확인이 되었고 QR code가 정상적으로 생성되었으며 해당 QR code를 인식한 경우:OK(200) /
//      실패 - 로그인이 되지 않은 상태로 인식시킨 경우:Fail message(401), 로그인이 확인되었으나 QR code의 data가 경우:Fail message(404) /
//      에러 - Error message(500)
// PUT 방식이 적절하나, QR 인식이 GET 방식인 것을 감안해 GET 방식으로 호출
api.get('/codes/:codeData', async (ctx, next) => {
    const accessToken = ctx.cookies.get('accessToken');
    const { codeData } = ctx.params;

    if(accessToken === undefined) {
        // access 토큰이 없는데 접근하는 경우
        // access 토큰 발급을 위해 로그인이 필요함
        console.log("[QR]Update Failed: Login Required");
        ctx.body = "You need to login.";
        ctx.status = 401;
    }
    else {
        let decodedToken = token.decodeToken(accessToken);
        
        await model.sequelize.models.QRCodes.findOne({
            where: { codeData: codeData }
        }).then(async result => {
            if(result) {
                await model.sequelize.models.QRCodes.update({
                    userId: decodedToken.userId
                }, {
                    where: { codeData: codeData }
                }).then(() => {
                    console.log("[QR]Update Success: QR Login");
                    ctx.status = 200;
                }).catch(err => {
                    console.log(err);
                    ctx.status = 500;
                });
            }
            else {
                // qr code data가 있는데 QR로 인식한 data가 아닐 경우
                // 인증된 사용자가 고의적인 url 입력할 가능성 있음
                // 인증된 사용자로부터의 이상 행동, 혹은 토큰 탍취 후 QR 로그인 방식을 지각하지 못한 경우
                console.log("[QR]Update Failed: Invalid QR Code");
                ctx.body = "Invalid qr code.";
                ctx.status = 404;
            }
        }).catch(err => {
            console.log(err);
            ctx.status = 500;
        });
    }
});

// QR 로그인 체크 API
// req: codeData(QR code 생성 시에 만들어진 data/string)
// res: 성공 - 로그인이 확인된 경우:OK(200) + Access token(+) / 에러 - Error message(500)
// GET 방식이 적절하나, QR 인식이 GET 방식인 것을 감안해 PUT 방식으로 호출
api.put('/codes/:codeData', async (ctx, next) => {
    if(ctx.request.headers.referer !== process.env.WEB_REFERER) {
        console.log("[Auth]Create Failed: Unkown referer");
        ctx.body = "Bad request.";
        ctx.status = 400;
        return;
    }

    const { codeData } = ctx.params;

    await model.sequelize.models.QRCodes.findOne({
        where: { codeData: codeData },
        attributes: [ 'userId' ]
    }).then(result => {
        if(!result || result.userId === null) {
            ctx.body = { userId: null };
        }
        else {
            ctx.body = { userId: result.userId };
        }
        ctx.status = 200;
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    });
});

// QR 삭제 API
// req: codeData(QR code로 전달된 data/string)
// res: 성공 - OK(200) / 에러 - Error message(500)
// QR code의 데이터는 생성될 때 DB에 등록되므로 없는 데이터 일수가 없기에 실패할 수 없음
api.delete('/codes/:codeData', async (ctx, next) => {
    if(ctx.request.headers.referer !== process.env.WEB_REFERER) {
        console.log("[Auth]Create Failed: Unkown referer");
        ctx.body = "Bad request.";
        ctx.status = 400;
        return;
    }
    
    const { codeData } = ctx.params;

    await model.sequelize.models.QRCodes.destroy({
        where: { codeData: codeData }
    }).then(() => {
        console.log("[QR]Delete Success: QR Code Deleted");
        ctx.status = 200;
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    });
});

module.exports = api;
