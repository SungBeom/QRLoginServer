const request = require('request');
const expect = require('chai').use(require('chai-http')).expect;
require('dotenv').config();

const STATUS_CODE = {
    OK: 200,
    UNAUTHORIZED: 401
}

const TIME_LIMIT = {
    SIGNUP: 2000,
    SIGNOUT: 3000
}

const userId = "tId";
const userPw = "tPw";
const name = "tName";
const engName = "tEngName";

/*
 * ID 중복 확인(없는 유저)
 */
describe("ID 중복 확인(없는 유저)", () => {
    it('200', done => {
        request.get(process.env.TEST_API + "/users/ids/" + userId, (err, res, body) => {
            expect(res.statusCode).to.equal(STATUS_CODE.OK);
            expect(body).to.equal('0');
            done();
        });
    });
});

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
            expect(res.statusCode).to.equal(STATUS_CODE.OK);
            done();
        });
    }).slow(TIME_LIMIT.SIGNUP);
});

/*
 * ID 중복 확인(있는 유저)
 */
describe("ID 중복 확인(있는 유저)", () => {
    it('200', done => {
        request.get(process.env.TEST_API + "/users/ids/" + userId, (err, res, body) => {
            expect(res.statusCode).to.equal(STATUS_CODE.OK);
            expect(body).to.equal('1');
            done();
        });
    });
});

/*
 * 유저 정보 조회(로그인 전)
 */
describe("유저 정보 조회(로그인 전)", () => {
    it('401', done => {
        request.get(process.env.TEST_API + "/users", (err, res, body) => {
            expect(res.statusCode).to.equal(STATUS_CODE.UNAUTHORIZED);
            expect(body).to.equal('You need to login.');
            done();
        });
    });
});

/*
 * 일반(ID, 비밀번호) 로그인 실패
 */
describe("일반(ID+비밀번호) 로그인 실패", () => {
    it('401', done => {
        const options = {
            url: process.env.TEST_API + "/auth",
            headers: {
                'referer': process.env.TEST_LOGIN_REFERER
            },
            body: {
                'userId': userId,
                'userPw': "tt",
                'codeData': "",
                'kakaoToken': ""
            },
            json: true
        }

        request.post(options, (err, res, body) => {
            expect(res.statusCode).to.equal(STATUS_CODE.UNAUTHORIZED);
            expect(body).to.equal('The ID or password is incorrect.');
            done();
        });
    });
});

let cookie;

/*
 * 일반(ID, 비밀번호) 로그인 성공
 */
describe("일반(ID+비밀번호) 로그인 성공", () => {
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
            expect(res.statusCode).to.equal(STATUS_CODE.OK);
            expect(res).to.cookie('accessToken');
            expect(res).to.cookie('accessToken.sig');
            cookie = res.headers['set-cookie'];
            done();
        });
    });
});

/*
 * 유저 정보 조회(로그인 후)
 */
describe("유저 정보 조회(로그인 후)", () => {
    it('200', done => {
        const options = {
            url: process.env.TEST_API + "/users",
            headers: {
                'Cookie': cookie
            }
        }

        const result = {
            'userId': userId,
            'name': name,
            'engName': engName
        }

        request.get(options, (err, res, body) => {
            expect(res.statusCode).to.equal(STATUS_CODE.OK);
            expect(body).to.equal(JSON.stringify(result));
            done();
        });
    });
});

/*
 * 로그아웃
 */
describe("로그아웃", () => {
    it('200', done => {
        const options = {
            url: process.env.TEST_API + "/auth",
            headers: {
                'Cookie': cookie
            }
        }

        request.delete(options, (err, res, body) => {
            expect(res.statusCode).to.equal(STATUS_CODE.OK);
            done();
        });
    });
});

/*
 * 유저 정보 조회(로그아웃 후)
 */
describe("유저 정보 조회(로그아웃 후)", () => {
    it('401', done => {
        request.get(process.env.TEST_API + "/users", (err, res, body) => {
            expect(res.statusCode).to.equal(STATUS_CODE.UNAUTHORIZED);
            expect(body).to.equal('You need to login.');
            done();
        });
    });
});

/*
 * 토큰 재발급을 위한 로그인
 */
describe("토큰 재발급을 위한 로그인", () => {
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
            expect(res.statusCode).to.equal(STATUS_CODE.OK);
            expect(res).to.cookie('accessToken');
            expect(res).to.cookie('accessToken.sig');
            cookie = res.headers['set-cookie'];
            done();
        });
    });
});

/*
 * 회원 탈퇴
 */
describe("회원 탈퇴", () => {
    it('200', done => {
        const options = {
            url: process.env.TEST_API + "/users",
            headers: {
                'Cookie': cookie
            }
        }

        request.delete(options, (err, res, body) => {
            expect(res.statusCode).to.equal(STATUS_CODE.OK);
            done();
        });
    }).slow(TIME_LIMIT.SIGNOUT).timeout(TIME_LIMIT.SIGNOUT);
});