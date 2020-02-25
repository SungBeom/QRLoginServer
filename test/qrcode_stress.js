const rp = require('request-promise');
const expect = require('chai').use(require('chai-http')).expect;
require('dotenv').config();

const STATUS_CODE = {
    OK: "OK"
}

const TIME_LIMIT = {
    REQUEST: 2000
}

const TIMER_TICK = 10;

let tests = [];
for(let i = 1; i <= 500; i++) {
    tests.push(i);
}

let codes = [];

let start = new Date().getTime();
let middle;

/*
 * QR 코드 생성 및 polling 테스트(총 500개 각 QR마다 초당 1회씩 10회)
 */
describe("QR Code 스트레스 테스트", () => {
    tests.forEach(value => {
        it(`QR Code 생성 ${value}`, () => {
            const options = {
                url: "http://localhost:" + process.env.SERVER_PORT1 + "/codes",
                headers: {
                    'referer': process.env.LOGIN_REFERER
                }
            }

            rp.post(options)
            .then(res => {
                const code = JSON.parse(res).codeData;
                expect(code).to.not.equal(undefined);
                codes.push(code);

                const codeOptions = {
                    url: "http://localhost:" + process.env.SERVER_PORT1 + "/codes/" + code,
                    headers: {
                        'referer': process.env.LOGIN_REFERER
                    }
                }

                let count = 0;
                let timer = setInterval(() => {
                    // console.log(code + " check");

                    if (++count === TIMER_TICK) {
                        rp.delete(codeOptions)
                        .then(() => {
                            if(code === codes[codes.length - 1]) {
                                console.log("QR Delete Elapsed Time: " + (new Date().getTime() - middle) + "ms");
                            }
                            clearInterval(timer);
                        }).catch(err => {
                            console.log(`${err.statusCode} - ${err.error}`);
                        });
                    }

                    rp.put(codeOptions)
                    .then(() => {}).catch(err => {
                        console.log(`${err.statusCode} - ${err.error}`);
                    });
                }, 1000);

                if(value === tests.length) {
                    middle = new Date().getTime();
                    console.log("QR Create Elapsed Time: " + (middle - start) + "ms");
                }
            }).catch(err => {
                console.log(`${err.statusCode} - ${err.error}`);
                if(value === tests.length) {
                    middle = new Date().getTime();
                    console.log("QR Create Elapsed Time: " + (middle - start) + "ms");
                }
            });
        }).slow(TIME_LIMIT.REQUEST);
    });
}); 