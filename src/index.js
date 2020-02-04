const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
require('dotenv').config();

const app = new Koa();
app.keys = [process.env.KOA_APP_KEY];
const router = new Router();

STATUS_CODE = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNET_SERVER_ERROR: 500
};

const userApi = require('./api/user');
const authApi = require('./api/auth');
const codeApi = require('./api/code');

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