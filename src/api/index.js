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
    ctx.body = 'Connected';
});

module.exports = api;
