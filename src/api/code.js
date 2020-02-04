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

/*
 * QR 관련 API
 * QR 생성       : [POST]/codes
 * QR 로그인      : [GET]/codes/:codeData(의미상 PUT)
 * QR 로그인 검증  : [PUT]/codes/:codeData(의미상 GET)
 * QR 삭제       : [DELETE]/codes/:codeData
 */

/*
 * QR 생성 API
 * req: x
 * res: 성공 - random QR code data(200) / 실패 - Fail message(400) / 에러 - Error message(500)
 */
codeApi.post('/codes', async (ctx, next) => {

    // referer 검증
    if (ctx.request.headers.referer !== process.env.LOGIN_REFERER) {
        console.log("[QR]Create Failed: Unkown referer");
        ctx.body = "Bad request.";
        ctx.status = 400;
        return;
    }

    // uuid를 이용해 QR Code 생성
    const codeData = uuidv4();

    // DB에 QR Code 정보 등록
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

/*
 * QR 로그인 API
 * req: codeData(QR code로 전달된 data/string)
 * res: 성공 - 로그인 확인이 되었고 QR code가 정상적으로 생성되었으며 해당 QR code를 인식한 경우:OK(200) /
 *      실패 - 로그인이 되지 않은 상태로 인식시킨 경우: Fail message(401), 로그인이 확인되었으나 QR code의 data가 존재하지 않는 경우: Fail message(404) /
 *      에러 - Error message(500)
 * PUT 방식이 적절하나, 웹 브라우저의 기본 QR 인식 활용 시 GET 방식으로 호출하는 것을 감안해 GET 방식으로 설정
 */
codeApi.get('/codes/:codeData', async (ctx, next) => {
    const accessToken = ctx.cookies.get('accessToken');
    const { codeData } = ctx.params;

    // access 토큰 없음
    if (accessToken === undefined) {
        console.log("[QR]Update Failed: Login Required");
        ctx.body = "You need to login.";
        ctx.status = 401;
    }
    else {
        let decodedToken = token.decodeToken(accessToken);
        
        await model.sequelize.models.QRCodes.findOne({
            where: { codeData: codeData }
        }).then(async result => {

            // QR code가 존재하지 않는 경우
            if (result === null) {
                console.log("[QR]Update Failed: Invalid QR Code");
                ctx.body = "Invalid qr code.";
                ctx.status = 404;
            }

            // QR 로그인 성공
            else {

                // DB에 등록된 QR Code 정보에 해당 QR Code를 인식한 유저 정보를 추가
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
        }).catch(err => {
            console.log(err);
            ctx.status = 500;
        });
    }
});

/*
 * QR 로그인 검증 API
 * req: codeData(QR code 생성 시에 만들어진 data/string)
 * res: 성공 - OK(200) + Access token(+) / 실패 - Fail message(400) / 에러 - Error message(500)
 * GET 방식이 적절하나, 웹 브라우저의 기본 QR 인식 활용 시 GET 방식으로 호출하는 것을 감안해 PUT 방식으로 설정
 */
codeApi.put('/codes/:codeData', async (ctx, next) => {

    // referer 검증
    if (ctx.request.headers.referer !== process.env.LOGIN_REFERER) {
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

        // QR Code가 없거나 아직 어떤 사용자도 등록되지 않은 경우
        if (result === null || result.userId === null) {
            ctx.body = { userId: null };
        }

        // 특정 사용자가 QR Code를 인식하여 해당 유저의 정보로 등록된 경우
        else {
            ctx.body = { userId: result.userId };
        }

        ctx.status = 200;
    }).catch(err => {
        console.log(err);
        ctx.status = 500;
    });
});

/*
 * QR 삭제 API
 * req: codeData(QR code로 전달된 data/string)
 * res: 성공 - OK(200) / 실패 - Fail message(400) / 에러 - Error message(500)
 */
codeApi.delete('/codes/:codeData', async (ctx, next) => {

    // referer 검증
    if (ctx.request.headers.referer !== process.env.LOGIN_REFERER) {
        console.log("[QR]Delete Failed: Unkown referer");
        ctx.body = "Bad request.";
        ctx.status = 400;
        return;
    }
    
    const { codeData } = ctx.params;

    // DB에서 QR Code 정보 제거
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