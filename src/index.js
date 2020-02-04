const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
require('dotenv').config();

const app = new Koa();
app.keys = [process.env.KOA_APP_KEY];
const router = new Router();

const userApi = require('./api/user.js');
const authApi = require('./api/auth.js');
const codeApi = require('./api/code.js');

router.use(userApi.routes());
router.use(authApi.routes());
router.use(codeApi.routes());

app.use(cors());
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(process.env.SERVER_PORT, () => {
    console.log('server is listening to port ' + process.env.SERVER_PORT);
});