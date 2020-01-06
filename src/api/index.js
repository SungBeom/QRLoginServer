const Router = require('koa-router');
const model = require('../database/models/index.js');

const api = new Router();

model.sequelize.sync().then(() => {
    console.log("DB connection success");
}).catch(err => {
    console.log("DB connection failed");
    console.log(err);
});

api.get('/', (ctx, next) => {
    ctx.body = "Connected";
});

// 회원 가입 API
// req: uId(신규 유저 Id/string), uPw(신규 우저 Pw/string), uName(신규 유저 이름/string), uEngName(신규 유저 영어 이름/string)
// res: 성공 - OK / 실패 - Fail message / 에러 - Error message
api.post('/signup', async (ctx, next) => {
    const { uId, uPw, uName, uEngName } = ctx.request.body;

    if(uId === undefined || uPw === undefined || uName === undefined || uEngName === undefined) {
        ctx.body = "The required information is missing.\nHow to Use: [POST]/signup\nSign up for new users\n";
        ctx.body += "req: uId(신규 유저 Id/string), uPw(신규 유저 Pw/string), uName(신규 유저 이름/string), uEngName(신규 유저 영어 이름/string)";
        ctx.status = 400;
        return;
    }
    else if(typeof(uId) !== "string" || typeof(uPw) !== "string" || typeof(uName) !== "string" || typeof(uEngName) !== "string") {
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
            console.log(ctx.body = "The Id that already exists.");
            duplicate = true;
        }
    });

    if(!duplicate) {
        await model.sequelize.models.Users.create({
            userId: uId, userPw: uPw, name: uName, engName: uEngName
        }).then(() => {
            ctx.status = 200;
        }).catch(err => {
            ctx.body = "This information is not available.[duplicate userId, type mismatch, missing information]";
            console.log(err);
            ctx.status = 500;
        });
    }
});

// 회원 검색 API[안내]
api.get('/users', (ctx, next) => {
    console.log(ctx.body = "How to Use: [GET]/users/:userId\nSearch for a user by 'userId'");
});

// 회원 검색 API
// req: uId(검색하려는 유저 Id/string)
// res: 성공 - User info / 실패 - Fail message / 에러 - Error message
api.get('/users/:uId', async (ctx, next) => {
    const { uId } = ctx.params;

    await model.sequelize.models.Users.findOne({
        where: { userId: uId }
    }).then(result => {
        if(result) {
            console.log("Search Success");
            ctx.body = result.dataValues;
        }
        else {
            console.log("Search Failed");
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
// res: 성공 - OK / 에러 - Error message
// 이미 없는 Id라도 실패하는 경우 없이 OK
api.delete('/users/:uId', async (ctx, next) => {
    const { uId } = ctx.params;

    await model.sequelize.models.Users.destroy({
        where: { userId: uId }
    }).then(() => {
        console.log("Delete Success");
        ctx.status = 200;
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    });
});

module.exports = api;
