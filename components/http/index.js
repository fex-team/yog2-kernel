var _ = require('lodash');
var tasks = _.clone(yog.conf.http.middleware);
var debuglog = require('debuglog')('yog/components');
var loader = require('../../lib/loader.js');

function core(app, conf){
    for (var i = 0; i < conf.middleware.length; i++) {
        var component = yog.components[conf.middleware[i]];
        var start = +(new Date());
        component && component();
        debuglog('middleware [%s] loaded in %d ms', conf.middleware[i], new Date() - start);
    };
}

tasks.push(core);

module.exports.http = tasks;

module.exports.http.defaultConf = {
    middleware: [
        'favicon',
        'compression',
        'responseTime',
        'static',
        'cookieParser',
        'bodyParser',
        'log',
        'ral',
        'views',
        'methodOverride',
        'dispatcher',
        'notFound',
        'error'
    ]
}

var middleware = loader.loadFolder(__dirname + '/middleware');
_.extend(module.exports, middleware);

