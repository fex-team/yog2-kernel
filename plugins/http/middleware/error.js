var debuglog = require('debuglog')('yog/plugins');

module.exports.error = ['log',
    function (app, conf) {
        return function () {
            if (!yog.DEBUG) {
                app.use(conf.handler);
            } else {
                debuglog('start debug mode for error page'.yellow);
                app.use(function (error, req, res, next) {
                    yog.log.fatal(error);
                    next(error);
                });
            }
        };
    }
];

module.exports.error.defaultConf = {
    handler: function (error, req, res, next) {
        yog.log.fatal(error);
        res.status(500);
        res.send('500: Internal Server Error');
    }
};