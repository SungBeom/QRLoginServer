const rp = require('request-promise');
const expect = require('chai').use(require('chai-http')).expect;
require('dotenv').config();

const STATUS_CODE = {
    OK: 200
}

const userId = "tId";
const userPw = "tPw";

let tests = [];
for(let i = 1; i <= 700; i++) {
    tests.push(i);
}

let start = new Date().getTime();

/*
 * 로그인 성공 및 토큰 발급 700회
 */
describe("인증 스트레스 테스트", () => {
    tests.forEach(value => {
        it(`토큰 발급 ${value}`, () => {
            const options = {
                url: process.env.TEST_API + "/auth",
                headers: {
                    'referer': process.env.TEST_LOGIN_REFERER
                },
                body: {
                    'userId': userId,
                    'userPw': userPw,
                    'codeData': "",
                    'kakaoToken': ""
                },
                json: true,
                resolveWithFullResponse: true
            }

            rp.post(options)
            .then(res => {
                expect(res.statusCode).to.equal(STATUS_CODE.OK);
                expect(res).to.cookie('accessToken');
                expect(res).to.cookie('accessToken.sig');
                cookie = res.headers['set-cookie'];

                if(value === tests.length) {
                    console.log("Elapsed Time: " + (new Date().getTime() - start) + "ms");
                }
            }).catch(err => {
                console.log(`${err.statusCode} - ${err.error}`);
            });
        });
    });
}); 