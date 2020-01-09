const jwtKey = process.env.JWT_KEY;
const jwt = require('jsonWebtoken');

module.exports = {
    generateToken(payload) {
        return jwt.sign(payload, jwtKey, { expiresIn: '10000' });
    }
};
