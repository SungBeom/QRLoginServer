const jwt = require('jsonWebtoken');

module.exports = {
    generateToken(payload) {
        return jwt.sign(payload, process.env.JWT_KEY, { expiresIn: '10000' });
    }
};
