const jwt = require('jsonwebtoken');

module.exports = {

    // 토큰 생성
    generateToken(payload) {
        return jwt.sign(payload, process.env.JWT_KEY, { expiresIn: '1800000' });
    },

    // 토큰 검증
    decodeToken(accessToken) {
        return jwt.verify(accessToken, process.env.JWT_KEY);
    }
};
