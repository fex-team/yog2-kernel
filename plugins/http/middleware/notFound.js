var debuglog = require('debuglog')('yog/plugins');

module.exports.notFound = function (app, conf) {
    return function () {
        if (!yog.DEBUG) {
            app.use(conf.handler);
        } else {
            debuglog('start debug mode for not found page'.yellow);
        }
    };
};

module.exports.notFound.defaultConf = {
    handler: function (req, res, next) {
        res.status(404);
        res.send('404: Page not Found');
    }
};