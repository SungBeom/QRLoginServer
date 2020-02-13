const request = require('request');
const expect = require('chai').use(require('chai-http')).expect;
require('dotenv').config();

/*
 * 카카오 토큰을 발급 받은 후라고 가정하고 진행
 */

 let kakaoId;

 /*
 * 카카오 토큰의 유효성 검증
 */
describe("토큰 유효성 검증", () => {
    it('200', done => {
        const options = {
            url: "https://kapi.kakao.com/v2/user/me",
            headers: {
                'Authorization': "Bearer " + process.env.TEST_KAKAO_TOKEN
            }
        }
        request.get(options, (err, res, body) => {
            expect(res.statusCode).to.equal(200);
            kakaoId = JSON.parse(body).id;
            expect(kakaoId).to.not.equal(undefined);
            done();
        });
    });
});

/*
 * 유저 정보 조회(카카오 로그인 후)
 */
describe("유저 정보 조회(로그인 전)", () => {
    it('401', done => {
        request.get(process.env.TEST_API + "/users", (err, res, body) => {
            expect(res.statusCode).to.equal(401);
            expect(body).to.equal('You need to login.');
            done();
        });
    });
});

let cookie;

/*
 * 카카오 로그인 성공
 */
describe("카카오 로그인 성공", () => {
    it('200', done => {
        const options = {
            url: process.env.TEST_API + "/auth",
            headers: {
                'referer': process.env.TEST_LOGIN_REFERER
            },
            body: {
                'userId': "",
                'userPw': "",
                'codeData': "",
                'kakaoToken': process.env.TEST_KAKAO_TOKEN
            },
            json: true
        }

        request.post(options, (err, res, body) => {
            expect(res.statusCode).to.equal(200);
            expect(res).to.cookie('accessToken');
            expect(res).to.cookie('accessToken.sig');
            cookie = res.headers['set-cookie'];
            done();
        });
    });
});

/*
 * 유저 정보 조회(카카오 로그인 후)
 */
describe("유저 정보 조회(카카오 로그인 후)", () => {
    it('200', done => {
        const options = {
            url: process.env.TEST_API + "/users",
            headers: {
                'Cookie': cookie
            }
        }

        request.get(options, (err, res, body) => {
            expect(res.statusCode).to.equal(200);
            expect(body).to.not.equal(undefined);
            done();
        });
    });
});