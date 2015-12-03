var cookieParser = require('cookie-parser');
module.exports.cookieParser = function (app, conf) {
    return function () {
        app.use(cookieParser(conf.secret, conf));
    };
};
