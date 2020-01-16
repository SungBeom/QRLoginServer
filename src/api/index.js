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

// 임시로 API call을 하는 QRCode를 노출
// 랜덤 token을 이용해 QR 코드를 생성해주도록 변경하기
api.get('/', async (ctx, next) => {
    const QRContent = process.env.SERVER_IP + ":" + process.env.SERVER_PORT + "/auth";
    const dataURL = QRCode.toDataURL(QRContent, { width: 300, color: { dark: "#222222FF", light: "#F0F8FFFF" } });

    await dataURL.then(async url => {
        ctx.body = `<!DOCTYPE html>
        <html>
            <head></head>
            <body>
                <image id="qrcode" src="${url}">
            </body>
        </html>`;

        // const randomToken = crypto.randomBytes(64).toString('hex');
        
        // await model.sequelize.models.Tokens.create({
        //     tokenId: randomToken
        // }).then(() => {
        //     console.log("[Auth]Create Token Success");
        // }).catch(err => {
        //     console.log(err);
        //     ctx.status = 500;
        // });

        // await setInterval(() => {
        //     model.sequelize.models.Tokens.findOne({
        //         where: { tokenId: randomToken },
        //         attributes: [ 'loginId' ]
        //     }).then(result => {
        //         if(result) console.log(result.loginId);
        //         // 여기에서 로그인이 성공할 수 있도록 해야함
        //     }).catch(err => {
        //         console.log(err);
        //         ctx.status = 500;
        //     })
        // }, 1000);

        ctx.status = 200;
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    });
});

// 쿠키 생성 테스트 API
api.get('/cookies', (ctx, next) => {
    // 하루동안 유지되는 쿠키 생성(Name: name, Value: value)
    ctx.cookies.set('name', 'value', { httpOnly: false, maxAge: 1000 * 60 * 60 * 24 * 1 });
    console.log("[Cookie]Create success");
    ctx.body = "Create cookie test";  // 삭제 예정
    ctx.status = 200;
});

// 쿠키 삭제 테스트 API
api.delete('/cookies', (ctx, next) => {
    ctx.cookies.set('name', '');
    console.log("[Cookie]Delete success");
    ctx.body = "Delete cookie test";  // 삭제 예정
    ctx.status = 204;
});

// 회원 가입 API
// req: uId(신규 유저 Id/string), uPw(신규 우저 Pw/string), uName(신규 유저 이름/string), uEngName(신규 유저 영어 이름/string)
// res: 성공 - OK(200) / 실패 - Fail message(400) / 에러 - Error message(500)
api.post('/signup', async (ctx, next) => {
    // uId, uPw, uName, uEngName이 undefined인 경우는 client에서 소거, type은 string으로 보장
    const { uId, uPw, uName, uEngName } = ctx.request.body;

    // client 연산의 임시 코드
    if(uId === undefined || uPw === undefined || uName === undefined || uEngName === undefined) {
        console.log("[User]Sign up failed: missing information");
        ctx.body = "The required information is missing.\nHow to Use: [POST]/signup\nSign up for new users\n";
        ctx.body += "req: uId(신규 유저 Id/string), uPw(신규 유저 Pw/string), uName(신규 유저 이름/string), uEngName(신규 유저 영어 이름/string)";
        ctx.status = 400;
        return;
    }
    // client 연산의 임시 코드
    else if(typeof(uId) !== "string" || typeof(uPw) !== "string" || typeof(uName) !== "string" || typeof(uEngName) !== "string") {
        console.log("[User]Sign up failed: missmatched type");
        ctx.body = "The type of information does not match.\nHow to Use: [POST]/signup\nSign up for new users\n";
        ctx.body += "req: uId(신규 유저 Id/string), uPw(신규 유저 Pw/string), uName(신규 유저 이름/string), uEngName(신규 유저 영어 이름/string)";
        ctx.status = 400;
        return;
    }

    let duplicate = false;
    await model.sequelize.models.Users.findOne({
        where: { userId: uId }
    }).then(result => {
        if(result) {
            console.log("[User]Sign up failed: duplicate Id");
            ctx.body = "The Id that already exists.";
            duplicate = true;
        }
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    });

    if(!duplicate) {
        await model.sequelize.models.Users.create({
            userId: uId, userPw: uPw, name: uName, engName: uEngName
        }).then(() => {
            console.log("[User]Sign up success");
            ctx.status = 200;
        }).catch(err => {
            console.log(err);
            ctx.status = 500;
        });
    }
});

// 로그인 API
// req: uId(기존 유저 Id/string), uPw(기존 유저 Pw/string)
// res: 성공 - 찾은 경우:OK(200), 못 찾은 경우:Fail message(200) / 실패 - Fail message(400) / 에러 - Error message(500)
api.post('/users/login', async (ctx, next) => {
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

// 인가 테스트 API
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

// random 토큰 생성 API
// req: x
// res: 성공 - token(200) / 에러: Error message(500)
api.get('/tokens', async (ctx, next) => {
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

// QR 로그인 확인 API
// req: tId(QR 코드로 생성 시에 만들어진 토큰)
// res: 성공 - 로그인이 확인된 경우: OK(200), 로그인이 확인되지 않은 경우: null(200) / 에러 - Error message(500)
api.get('/tokens/:tId', async (ctx, next) => {
    const { tId } = ctx.params;

    await model.sequelize.models.Tokens.findOne({
        where: { tokenId: tId },
        attributes: [ 'loginId' ]
    }).then(result => {

        if(result) {
            const accessToken = token.generateToken({ id: result.loginId });
            ctx.cookies.set('accessToken', accessToken, { httpOnly: false, maxAge: 1000 * 60 * 60 * 21 });
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

// QR 로그인 인증 API
// req: tId(QR 코드로 발급받은 토큰 Id/string)
// res: 성공 - 로그인 확인이 되었고 QR 코드가 정상적으로 생성되었으며 해당 QR 코드를 인식한 경우:OK(200) /
//      실패 - 로그인이 되지 않은 경우:Fail message(401), 로그인이 확인되었으나 QR 코드의 토큰이 다른 경우: Fail message(404)
// DB에 해당 토큰이 있는지 확인하여, 있다면 쿠키를 이용해 누가 로그인 헀는지 변경
api.get('/auth/:tId', async (ctx, next) => {
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

// 로그아웃 API
// req: x
// res: 성공 - OK(200)
// cookie가 이미 없었더라도 실패하는 경우 없이 OK
api.delete('/logout', (ctx, next) => {
    ctx.cookies.set('accessToken', '');
    ctx.cookies.set('accessToken.sig', '');
    console.log("[User]Logout Success");
    ctx.status = 200;
});

// 회원 검색 API[안내]
api.get('/users', (ctx, next) => {
    console.log(ctx.body = "How to Use: [GET]/users/:userId\nSearch for a user by 'userId'");
});

// 회원 검색 API
// req: uId(검색하려는 유저 Id/string)
// res: 성공 - 찾은 경우:User info(200), 못 찾은 경우:Fail message(200) / 에러 - Error message(500)
// Id가 undefined나 string 타입이 아닐 수 없으므로 실패 불가
api.get('/users/:uId', async (ctx, next) => {
    const { uId } = ctx.params;

    await model.sequelize.models.Users.findOne({
        where: { userId: uId }
    }).then(result => {
        if(result) {
            console.log("[User]Search success");
            ctx.body = result.dataValues;
        }
        else {
            console.log("[User]Search failed: nonexistent Id");
            ctx.body = "There is no user with that Id.";
        }
        ctx.status = 200;
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    });
});

// 회원 탈퇴 API[안내]
api.delete('/users', (ctx, next) => {
    console.log(ctx.body = "How to Use: [DELETE]/users/:userId\nDelete a user with 'userId'");
});

// 회원 탈퇴 API
// req: uId(탈퇴하려는 유저 Id/string)
// res: 성공 - (204) / 에러 - Error message(500)
// 이미 없는 Id라도 실패하는 경우 없이 OK
api.delete('/users/:uId', async (ctx, next) => {
    const { uId } = ctx.params;

    ctx.cookies.set('accessToken', '');
    ctx.cookies.set('accessToken.sig', '');

    await model.sequelize.models.Users.destroy({
        where: { userId: uId }
    }).then(() => {
        console.log("[User]Delete success");
        ctx.status = 204;
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    });
});

module.exports = api;
