const Koa = require('koa');

const app = new Koa();
const api = require('./api');

app.use(api.routes()).use(api.allowedMethods());

app.listen(3000, () => {
    console.log('server is listening to port 3000');
});
