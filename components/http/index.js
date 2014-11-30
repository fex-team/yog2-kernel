var _ = require('lodash');
var debuglog = require('debuglog')('yog/components');
var loader = require('../../lib/loader.js');

function core(app, conf){
    var middlewareStart = null;
    var startTime = function(req, res, next){
        middlewareStart = +(new Date());
        next();
    };
    var endTime = function(name){
        return function(req, res, next){
            debuglog('middleware [%s] cost %d ms', name, new Date() - middlewareStart);
            next();
        };
    };

    for (var i = 0; i < conf.middleware.length; i++) {
        var component = yog.components[conf.middleware[i]];
        var start = +(new Date());
        if (yog.DEBUG){
            app.use(startTime);
        }
        component && component();
        if (yog.DEBUG){
            app.use(endTime(conf.middleware[i]));
        }
        debuglog('middleware [%s] loaded in %d ms', conf.middleware[i], new Date() - start);
    }
}

var defaultConf = {
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

//此处有一个恶心的实现，需要自行合并http的conf，因为http组件需要在require的时候就获得合并后的配置
yog.conf.http = _.extend(defaultConf, yog.conf.http);

var tasks = _.clone(yog.conf.http.middleware);

tasks.push(core);

module.exports.http = tasks;

//加载自带中间件
var middleware = loader.loadFolder(__dirname + '/middleware');
_.extend(module.exports, middleware);

