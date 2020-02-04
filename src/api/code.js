const Router = require('koa-router');
const model = require('../database/models');
const token = require('../lib/token');
const uuidv4 = require('uuid/v4');
require('dotenv').config();

const codeApi = new Router();

model.sequelize.sync().then(() => {
    console.log("DB connection success");
}).catch(err => {
    console.log("DB connection failed");
    console.log(err);
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// QR 관련 API
// QR 생성       : [POST]/codes
// QR 로그인      : [GET]/codes/:codeData(의미상 PUT)
// QR 로그인 체크  : [PUT]/codes/:codeData(의미상 GET)
// QR 삭제       : [DELETE]/codes/:codeData
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// QR 생성 API
// req: x
// res: 성공 - random QR code data(200) / 에러: Error message(500)
// 단순 QR code에 들어갈 데이터를 생성하는 것이므로 실패할 수 없음
codeApi.post('/codes', async (ctx, next) => {
    if(ctx.request.headers.referer !== process.env.LOGIN_REFERER) {
        console.log("[QR]Create Failed: Unkown referer");
        ctx.body = "Bad request.";
        ctx.status = 400;
        return;
    }

    // const codeData = crypto.randomBytes(64).toString('hex');
    // const codeData = crypto.randomBytes(32).toString('base64');
    const codeData = uuidv4();

    await model.sequelize.models.QRCodes.create({
        codeData: codeData
    }).then(result => {
        console.log("[QR]Create Success: QR Code Created");
        ctx.body = { codeData: codeData };
        ctx.status = 200;
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    });
});

// QR 로그인 API
// req: codeData(QR code로 전달된 data/string)
// res: 성공 - 로그인 확인이 되었고 QR code가 정상적으로 생성되었으며 해당 QR code를 인식한 경우:OK(200) /
//      실패 - 로그인이 되지 않은 상태로 인식시킨 경우:Fail message(401), 로그인이 확인되었으나 QR code의 data가 경우:Fail message(404) /
//      에러 - Error message(500)
// PUT 방식이 적절하나, QR 인식이 GET 방식인 것을 감안해 GET 방식으로 호출
codeApi.get('/codes/:codeData', async (ctx, next) => {
    const accessToken = ctx.cookies.get('accessToken');
    const { codeData } = ctx.params;

    if(accessToken === undefined) {
        // access 토큰이 없는데 접근하는 경우
        // access 토큰 발급을 위해 로그인이 필요함
        console.log("[QR]Update Failed: Login Required");
        ctx.body = "You need to login.";
        ctx.status = 401;
    }
    else {
        let decodedToken = token.decodeToken(accessToken);
        
        await model.sequelize.models.QRCodes.findOne({
            where: { codeData: codeData }
        }).then(async result => {
            if(result) {
                await model.sequelize.models.QRCodes.update({
                    userId: decodedToken.userId
                }, {
                    where: { codeData: codeData }
                }).then(() => {
                    console.log("[QR]Update Success: QR Login");
                    ctx.status = 200;
                }).catch(err => {
                    console.log(err);
                    ctx.status = 500;
                });
            }
            else {
                // qr code data가 있는데 QR로 인식한 data가 아닐 경우
                // 인증된 사용자가 고의적인 url 입력할 가능성 있음
                // 인증된 사용자로부터의 이상 행동, 혹은 토큰 탍취 후 QR 로그인 방식을 지각하지 못한 경우
                console.log("[QR]Update Failed: Invalid QR Code");
                ctx.body = "Invalid qr code.";
                ctx.status = 404;
            }
        }).catch(err => {
            console.log(err);
            ctx.status = 500;
        });
    }
});

// QR 로그인 체크 API
// req: codeData(QR code 생성 시에 만들어진 data/string)
// res: 성공 - 로그인이 확인된 경우:OK(200) + Access token(+) / 에러 - Error message(500)
// GET 방식이 적절하나, QR 인식이 GET 방식인 것을 감안해 PUT 방식으로 호출
codeApi.put('/codes/:codeData', async (ctx, next) => {
    if(ctx.request.headers.referer !== process.env.LOGIN_REFERER) {
        console.log("[QR]Read Failed: Unkown referer");
        ctx.body = "Bad request.";
        ctx.status = 400;
        return;
    }

    const { codeData } = ctx.params;

    await model.sequelize.models.QRCodes.findOne({
        where: { codeData: codeData },
        attributes: [ 'userId' ]
    }).then(result => {
        if(!result || result.userId === null) {
            ctx.body = { userId: null };
        }
        else {
            ctx.body = { userId: result.userId };
        }
        ctx.status = 200;
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    });
});

// QR 삭제 API
// req: codeData(QR code로 전달된 data/string)
// res: 성공 - OK(200) / 에러 - Error message(500)
// QR code의 데이터는 생성될 때 DB에 등록되므로 없는 데이터 일수가 없기에 실패할 수 없음
codeApi.delete('/codes/:codeData', async (ctx, next) => {
    if(ctx.request.headers.referer !== process.env.LOGIN_REFERER) {
        console.log("[QR]Delete Failed: Unkown referer");
        ctx.body = "Bad request.";
        ctx.status = 400;
        return;
    }
    
    const { codeData } = ctx.params;

    await model.sequelize.models.QRCodes.destroy({
        where: { codeData: codeData }
    }).then(() => {
        console.log("[QR]Delete Success: QR Code Deleted");
        ctx.status = 200;
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    });
});

module.exports = codeApi;