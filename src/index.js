const Koa = require('koa');
const Router = require('koa-router');
const redis = require('redis');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
require('dotenv').config();

const app = new Koa();
app.keys = [process.env.KOA_APP_KEY];
const router = new Router();
const redisClient = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_IP);
redisClient.auth(process.env.REDIS_KEY);

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

app.listen(process.env.SERVER_PORT1, () => {
    redisClient.get("TEST", (err, result) => {
        if(err) console.log(err);
        else console.log(result);
    });
    console.log('server is listening to port ' + process.env.SERVER_PORT1);
});

app.listen(process.env.SERVER_PORT2, () => {
    console.log('server is listening to port ' + process.env.SERVER_PORT2);
});