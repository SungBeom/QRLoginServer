const rp = require('request-promise');
const expect = require('chai').use(require('chai-http')).expect;
require('dotenv').config();

const STATUS_CODE = {
    OK: "OK"
}

const TIME_LIMIT = {
    REQUEST: 5000
}

const userId = "userId";
const userPw = "userPw";
const name = "name";
const engName = "engName";

let tests = [];
for(let i = 1; i <= 700; i++) {
    tests.push(i);
}

let start = new Date().getTime();

/*
 * 회원 가입 700회
 */
describe("회원 가입 스트레스 테스트", () => {
    tests.forEach(value => {
        it(`회원 가입 ${value}`, () => {
            const options = {
                url: process.env.TEST_API + "/users",
                headers: {
                    'referer': process.env.TEST_SIGNUP_REFERER
                },
                body: {
                    'userId': userId + value,
                    'userPw': userPw,
                    'name': name,
                    'engName': engName
                },
                json: true
            }

            rp.post(options)
            .then(res => {
                expect(res).to.equal(STATUS_CODE.OK);
                if(value === tests.length) {
                    console.log("Elapsed Time: " + (new Date().getTime() - start) + "ms");
                }
            }).catch(err => {
                console.log(`${err.statusCode} - ${err.error}`);
                if(value === tests.length) {
                    console.log("Elapsed Time: " + (new Date().getTime() - start) + "ms");
                }
            });
        });
    });
}).slow(TIME_LIMIT.REQUEST);