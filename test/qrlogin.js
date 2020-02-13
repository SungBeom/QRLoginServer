const request = require('request');
const expect = require('chai').use(require('chai-http')).expect;
require('dotenv').config();

const userId = "tId";
const userPw = "tPw";
const name = "tName";
const engName = "tEngName";

/*
 * 회원 가입
 */
describe("회원 가입", () => {
    it('200', done => {
        const options = {
            url: process.env.TEST_API + "/users",
            headers: {
                'referer': process.env.TEST_SIGNUP_REFERER
            },
            body: {
                'userId': userId,
                'userPw': userPw,
                'name': name,
                'engName': engName
            },
            json: true
        }

        request.post(options, (err, res, body) => {
            expect(res.statusCode).to.equal(200);
            done();
        });
    });
});

let cookie;

/*
 * [A]일반(ID, 비밀번호) 로그인 성공
 */
describe("[A]일반(ID+비밀번호) 로그인 성공", () => {
    it('200', done => {
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

let codeData;

/*
 * [B]QR 코드 데이터 생성
 */
describe("[B]QR 코드 데이터 생성", () => {
    it('200', done => {
        const options = {
            url: process.env.TEST_API + "/codes",
            headers: {
                'referer': process.env.TEST_LOGIN_REFERER
            }
        }

        request.post(options, (err, res, body) => {
            expect(res.statusCode).to.equal(200);
            codeData = JSON.parse(body).codeData;
            done();
        });
    });
});

/*
 * [B]QR 로그인 정보 확인(QR 코드 인식 전)
 */
describe("[B]QR 로그인 정보 확인(QR 코드 인식 전)", () => {
    it('200', done => {
        const options = {
            url: process.env.TEST_API + "/codes/" + codeData,
            headers: {
                'referer': process.env.TEST_LOGIN_REFERER
            }
        }

        const result = {
            'userId': null
        }

        request.put(options, (err, res, body) => {
            expect(res.statusCode).to.equal(200);
            expect(body).to.equal(JSON.stringify(result));
            done();
        });
    });
});

/*
 * [A]QR 코드 인식
 */
describe("[A]QR 코드 인식", () => {
    it('200', done => {
        const options = {
            url: process.env.TEST_API + "/codes/" + codeData,
            headers: {
                'Cookie': cookie
            }
        }


        request.get(options, (err, res, body) => {
            expect(res.statusCode).to.equal(200);
            done();
        });
    });
});

/*
 * [B]QR 로그인 정보 확인(QR 코드 인식 후)
 */
describe("[B]QR 로그인 정보 확인(QR 코드 인식 후)", () => {
    it('200', done => {
        const options = {
            url: process.env.TEST_API + "/codes/" + codeData,
            headers: {
                'referer': process.env.TEST_LOGIN_REFERER
            }
        }

        const result = {
            'userId': userId
        }

        request.put(options, (err, res, body) => {
            expect(res.statusCode).to.equal(200);
            expect(body).to.equal(JSON.stringify(result));
            done();
        });
    });
});

/*
 * [B]QR 로그인 성공
 */
describe("[B]QR 로그인 성공", () => {
    it('200', done => {
        const options = {
            url: process.env.TEST_API + "/auth",
            headers: {
                'referer': process.env.TEST_LOGIN_REFERER
            },
            body: {
                'userId': "",
                'userPw': "",
                'codeData': codeData,
                'kakaoToken': ""
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
 * [B}회원 탈퇴
 */
describe("[B]회원 탈퇴", () => {
    it('200', done => {
        const options = {
            url: process.env.TEST_API + "/users",
            headers: {
                'Cookie': cookie
            }
        }

        request.delete(options, (err, res, body) => {
            expect(res.statusCode).to.equal(200);
            done();
        });
    });
});