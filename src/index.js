const http = require('http');
const https = require('https');

const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
// const session = require('koa-session');
const cors = require('@koa/cors');

require('dotenv').config();

const app = new Koa();
app.keys = [process.env.KOA_APP_KEY];
const router = new Router();
const api = require('./api');

router.use(api.routes());

app.use(cors());
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());
// app.use(session(app));
// app.use(ctx => {
//     let n = ctx.session.views || 0;
//     ctx.session.views = ++n;

//     if(n === 1) ctx.body = 'Welcome here for the first time!';
//     else ctx.body = "You've visited this page " + n + " times!";
//     console.log(n);
// });

// app.listen(process.env.SERVER_PORT, () => {
//     console.log('server is listening to port ' + process.env.SERVER_PORT);
// });

// const options = {
//     key: fs.readFileSync('config/domain_key.pem'),
//     cert: fs.readFileSync('config/domain_crt.pem')
// };

// http
http.createServer(app.callback()).listen(process.env.SERVER_PORT, () => {
    console.log('http: server is listening to port ' + process.env.SERVER_PORT);
});

// // https
// https.createServer(options, app.callback()).listen(process.env.SERVER_PORT, () => {
//     console.log('https: server is listening to port ' + process.env.SERVER_PORT);
// });
