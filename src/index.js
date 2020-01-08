const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const session = require('koa-session');

const app = new Koa();
app.keys = ['secret key'];
const router = new Router();
const api = require('./api');

router.use(api.routes());

app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());
app.use(session(app));
app.use(ctx => {
    let n = ctx.session.views || 0;
    ctx.session.views = ++n;

    if(n === 1) ctx.body = 'Welcome here for the first time!';
    else ctx.body = "You've visited this page " + n + " times!";
    console.log(n);
})

app.listen(3000, () => {
    console.log('server is listening to port 3000');
});
