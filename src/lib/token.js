const jwt = require('jsonWebtoken');

module.exports = {
    generateToken(payload) {
        return jwt.sign(payload, process.env.JWT_KEY, { expiresIn: '60000' });
    },
    // access token 상태에 따른 error handling 필요
    decodeToken(accessToken) {
        return jwt.verify(accessToken, process.env.JWT_KEY);
    }
};
