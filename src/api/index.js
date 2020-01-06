const Router = require('koa-router');
const model = require('../database/models/index.js');

const api = new Router();

model.sequelize.sync().then(() => {
    console.log("DB 연결 성공");
}).catch(err => {
    console.log("DB 연결 실패");
    console.log(err);
});

api.get('/', (ctx, next) => {
    ctx.body = "Connected";
});

api.get('/users', (ctx, next) => {
    console.log(ctx.body = "How to Use: [GET]/users/:userId\nSearch for user with id 'userId'");
});

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
            ctx.body = "해당 ID를 가진 유저는 존재하지 않습니다.";
        }

        ctx.status = 200;
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    });
});

module.exports = api;
