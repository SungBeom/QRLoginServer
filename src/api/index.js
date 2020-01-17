const Router = require('koa-router');
const model = require('../database/models');
const token = require('../lib/token');
const QRCode = require('qrcode');  // 모듈화 필요
const crypto = require('crypto');

const api = new Router();

model.sequelize.sync().then(() => {
    console.log("DB connection success");
}).catch(err => {
    console.log("DB connection failed");
    console.log(err);
});

// 로그인 테스트, front-end의 기능을 임시 구현
api.get('/', async (ctx, next) => {
    // ctx.body = "API Server";
    // ctx.status = 200;

    ctx.body = `<!DOCTYPE html>
    <html>
        <head>
            <title>로그인 페이지</title>
            <meta charset="utf-8">
        </head>
        <body>
            login로그인 페이지<br>
            <hr>
    
             <form name="login_form" method="post" action="http://` + process.env.SERVER_IP + ":" + process.env.SERVER_PORT + `/users/login" method="post">
                아이디 : <input type="text" name="uId"><br>
                비밀번호 : <input type="password" name="uPw"><br>
                <input type="submit" value="로그인">
            </form>
        </body>
    </html>`;
    ctx.status = 200;
});


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// User 관련 API
// 회원 가입        : [POST]/users
// ID 중복 체크     : [GET]/users/ids/:uId
// 정보 조회        : [GET]/users
// 정보 수정        : [PUT]/users
// 회원 탈퇴        : [DELETE]/users
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// 회원 가입 API
// req: userId(신규 유저 Id/string), userPw(신규 우저 Pw/string), name(신규 유저 이름/string), engName(신규 유저 영어 이름/string)
// res: 성공 - OK(200) / 실패 - Fail message(400) / 에러 - Error message(500)
api.post('/users', async (ctx, next) => {
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
    let duplicate = false;
    await model.sequelize.models.Users.findOne({
        where: { userId: userId }
    }).then(result => {
        if(result) {
            console.log("[User]Sign Up Failed: Duplicate Id");
            ctx.body = "The Id that already exists.";
            duplicate = true;
            ctx.status = 200;
        }
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    });

    if(!duplicate) {
        await model.sequelize.models.Users.create({
            userId: userId, userPw: userPw, name: name, engName: engName
        }).then(() => {
            console.log("[User]Sign Up Success");
            ctx.status = 200;
        }).catch(err => {
            console.log(err);
            ctx.status = 500;
        });
    }
});

// ID 중복 체크 API
// req: uId(중복 체크하려는 유저 Id/string)
// res: 성공 - 중복인 경우:1(200), 중복이 아닌 경우:0(200) / 에러 - Error message(500)
// Id가 undefined나 string 타입이 아닐 수 없으므로 실패 불가
api.get('/users/ids/:userId', async (ctx, next) => {
    const { userId } = ctx.params;

    await model.sequelize.models.Users.findOne({
        where: { userId: userId }
    }).then(result => {
        console.log("[User]Duplicate Check Success");
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
// res: 성공 - User info(200) / 실패 - Fail message(400) / 에러 - Error message(500)
api.get('/users', async (ctx, next) => {
    const accessToken = ctx.cookies.get('accessToken');

    if(accessToken === undefined) {
        console.log("[User]Search Failed: Login Required");
        ctx.body = "You need to login.";
        ctx.status = 400;
    }
    else {
        const decodedToken = token.decodeToken(accessToken);

        await model.sequelize.models.Users.findOne({
            where: { userId: decodedToken.id }
        }).then(result => {
            if(result) {
                let searchInfo = {};
                searchInfo.userId = result.dataValues.userId;
                searchInfo.name = result.dataValues.name;
                searchInfo.engName = result.dataValues.engName;

                console.log("[User]Search Success");
                ctx.body = searchInfo;
            }
            else {
                console.log("[User]Search Failed: Nonexistent Id");
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
// res: 성공 - OK(200) / 실패 - Fail message(400) / 에러 - Error message(500)
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
        console.log("[User]Search Failed: Login Required");
        ctx.body = "You need to login.";
        ctx.status = 400;
    }
    else {
        const decodedToken = token.decodeToken(accessToken);
        
        await model.sequelize.models.Users.update({
            userPw: userPw, name: name, engName: engName
        }, {
            where: { userId: decodedToken.id }
        }).then(() => {
            console.log("[User]Change Info Success");
            ctx.status = 200;
        }).catch(err => {
            console.log(err);
            ctx.status = 500;
        });
    }
});

// 회원 탈퇴 API
// req: Access token
// res: 성공 - OK(200) + Access token(-) / 실패 - Fail message(400) / 에러 - Error message(500)
api.delete('/users', async (ctx, next) => {
    const accessToken = ctx.cookies.get('accessToken');

    if(accessToken === undefined) {
        console.log("[User]Search Failed: Login Required");
        ctx.body = "You need to login.";
        ctx.status = 400;
    }
    else {
        const decodedToken = token.decodeToken(accessToken);
        ctx.cookies.set('accessToken', '');

        await model.sequelize.models.Users.destroy({
            where: { userId: decodedToken.id }
        }).then(() => {
            console.log("[User]Delete success");
            ctx.status = 200;
        }).catch(err => {
            console.log(err);
            ctx.status = 500;
        });
    }
});


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 인증 관련 API
// 로그인           : [POST]/auth/login
// 로그아웃          : [DELETE]/auth/logout
// 로그인 체크       : [GET]/auth
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// 로그인 API
// req: uId(기존 유저 Id/string), uPw(기존 유저 Pw/string)
// res: 성공 - 찾은 경우:OK(200) + access token(+), 못 찾은 경우:Fail message(200) / 실패 - Fail message(400) / 에러 - Error message(500)
api.post('/auth/login', async (ctx, next) => {
    // uId, uPw가 undefined인 경우는 client에서 소거, type은 string으로 보장
    const { uId, uPw } = ctx.request.body;

    // client 연산의 임시 코드
    if(uId === undefined || uPw === undefined) {
        console.log("[User]Login failed: missing information");
        ctx.body = "The required information is missing.\nHow to Use: [POST]/users/login\nLogin for registered user\n";
        ctx.body += "req: uId(신규 유저 Id/string), uPw(신규 유저 Pw/string)";
        ctx.status = 400;
        return;
    }
    // client 연산의 임시 코드
    else if(typeof(uId) !== "string" || typeof(uPw) !== "string") {
        console.log("[User]Login failed: missmatched type");
        ctx.body = "The type of information does not match.\nHow to Use: [POST]/users/login\nLogin for registered user\n";
        ctx.body += "req: uId(신규 유저 Id/string), uPw(신규 유저 Pw/string)";
        ctx.status = 400;
        return;
    }

    let duplicate = true;
    await model.sequelize.models.Users.findOne({
        where: { userId: uId }
    }).then(result => {
        if(!result) {
            console.log("[User]Login failed: nonexistent Id");
            ctx.body = "There is no user with that Id.";
            duplicate = false;
        }
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    });

    if(duplicate) {
        await model.sequelize.models.Users.findOne({
            where: { userId: uId, userPw: uPw }
        }).then(result => {
            if(result) {
                console.log("[User]Login Success");
                const accessToken = token.generateToken({ id: uId });
                ctx.cookies.set('accessToken', accessToken, { httpOnly: false, maxAge: 1000 * 60 * 60 * 21 });
            }
            else {
                console.log("[User]Login Failed: incorrect password");
                ctx.body = "The password is incorrect.";
            }
            ctx.status = 200;
        }).catch(err => {
            console.log(err);
            ctx.status = 500;
        });
    }
});

// 로그아웃 API
// req: access token
// res: 성공 - OK(200) + access token(-)
// cookie가 이미 없었더라도 실패하는 경우 없이 OK
api.delete('/auth/logout', (ctx, next) => {
    ctx.cookies.set('accessToken', '');
    ctx.cookies.set('accessToken.sig', '');
    console.log("[User]Logout Success");
    ctx.status = 200;
});

// 로그인 체크 API
// req: access token
// res: 성공 - Welcome message(200) / 실패 - Fail message(401)
api.get('/auth', (ctx, next) => {
    let accessToken = ctx.cookies.get('accessToken');

    if(accessToken !== undefined) {
        let decodedToken = token.decodeToken(accessToken);
        console.log("[Auth]Login Permission");
        ctx.body = "Welcome " + decodedToken.id + "!";
    }
    else {
        console.log("[Auth]Login Denied");
        ctx.body = "You need to login.";
    }
    ctx.status = 200;
});


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// QR 관련 API
// QR 생성       : [POST]/codes
// QR 로그인      : [PUT]/codes/:cId
// QR 로그인 체크  : [GET]/codes/:cId
// QR 삭제       : [DELETE]/codes/:cId
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// QR 생성 API
// req: x
// res: 성공 - random QR code data(200) / 에러: Error message(500)
api.post('/codes', async (ctx, next) => {
    const randomToken = crypto.randomBytes(64).toString('hex');

    await model.sequelize.models.Tokens.create({
        tokenId: randomToken
    }).then(result => {
        console.log("[Auth]Create Token Success");
        ctx.body = { randomToken: randomToken };
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    });

    ctx.status = 200;
});

// QR 로그인 API
// req: tId(QR 코드로 발급받은 토큰 Id/string)
// res: 성공 - 로그인 확인이 되었고 QR 코드가 정상적으로 생성되었으며 해당 QR 코드를 인식한 경우:OK(200) /
//      실패 - 로그인이 되지 않은 경우:Fail message(401), 로그인이 확인되었으나 QR 코드의 토큰이 다른 경우:Fail message(404)
// DB에 해당 토큰이 있는지 확인하여, 있다면 쿠키를 이용해 누가 로그인 헀는지 변경
api.put('/auth/:tId', async (ctx, next) => {
    const accessToken = ctx.cookies.get('accessToken');
    const { tId } = ctx.params;

    if(accessToken !== undefined) {
        let decodedToken = token.decodeToken(accessToken);
        await model.sequelize.models.Tokens.findOne({
            where: { tokenId: tId }
        }).then(async result => {
            if(result) {
                await model.sequelize.models.Tokens.update({
                    loginId: decodedToken.id
                }, { where: { tokenId: tId }
                }).then(() => {
                    console.log("[Auth]QR Login Success");
                    ctx.status = 200;
                }).catch(err => {
                    console.log(err);
                    ctx.status = 500;
                });
            }
            else {
                // random 토큰이 있는데 QR로 인식한 토큰이 아닐 경우
                // 인증된 사용자가 고의적인 url 입력할 가능성 있음
                console.log("[Auth]Invalid Token");
                ctx.body = "Invalid token."
                ctx.status = 404;
            }
        }).catch(err => {
            console.log(err);
            ctx.status = 500;
        });
    }
    else {
        // access 토큰이 없는데 접근하는 경우
        // access 토큰 발급을 위해 로그인이 필요함
        console.log("[Auth]Login Denied");
        ctx.body = "You need to login.";
        ctx.status = 401;
    }
});

// QR 로그인 체크 API
// req: tId(QR 코드로 생성 시에 만들어진 토큰)
// res: 성공 - 로그인이 확인된 경우:OK(200) + access token(+), 로그인이 확인되지 않은 경우:null(200) / 에러 - Error message(500)
api.get('/codes/:tId', async (ctx, next) => {
    const { tId } = ctx.params;

    await model.sequelize.models.Tokens.findOne({
        where: { tokenId: tId },
        attributes: [ 'loginId' ]
    }).then(result => {

        if(result) {
            const accessToken = token.generateToken({ id: result.loginId });
            ctx.cookies.set('accessToken', accessToken, { httpOnly: false, maxAge: 1000 * 60 * 60 * 21 });
            ctx.body = { loginId: result.loginId };
        }
        else {
            ctx.body = { loginId: null };
        }
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    });
    ctx.status = 200;
});

// QR 삭제 API
api.delete('/codes/:tId', async (ctx, next) => {
    const { tId } = ctx.params;

    await model.sequelize.models.Tokens.destroy({
        where: { tokenId: tId }
    }).then(() => {
        console.log("[Auth]Delete Token Success");
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    });
    ctx.status = 200;
});

module.exports = api;
