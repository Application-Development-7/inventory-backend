const r = require('express').Router();
const c = require('../controllers/userController');

r.get('/me', c.me);
r.put('/profile', c.updateProfile);
r.put('/preferences', c.updatePreferences);
r.put('/password', c.updatePassword);
r.delete('/account', c.deleteAccount);

module.exports = r;
