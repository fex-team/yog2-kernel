var _ = require('lodash');
var debuglog = require('debuglog')('yog/plugins');
var loader = require('../../lib/loader.js');
var MIDDLEWARE_DEBUG = process.env.MIDDLEWARE_DEBUG === "true";

function core(app, conf){
    var startTime = function(name){
        return function(req, res, next){
            req.__MIDDLEWARE_START__ = +(new Date());
            req.__CURRENT_MIDDLEWARE__ = name;
            next();
        };
    };

    var endTime = function(name){
        return function(req, res, next){
            debuglog(
                'middleware [%s] cost %d ms',
                name,
                new Date() - req.__MIDDLEWARE_START__
            );
            next();
        };
    };

    if (MIDDLEWARE_DEBUG){
        app.use(function(req, res, next){
            res.on('finish', function(){
                debuglog(
                    'middleware [%s] cost %d ms', 
                    req.__CURRENT_MIDDLEWARE__, 
                    new Date() - req.__MIDDLEWARE_START__
                );
            });
            next();
        });
    } 
    for (var i = 0; i < conf.middleware.length; i++) {
        var component = yog.plugins[conf.middleware[i]];
        var start = +(new Date());
        if (MIDDLEWARE_DEBUG){
            app.use(startTime(conf.middleware[i]));
        }
        component && component();
        if (MIDDLEWARE_DEBUG){
            app.use(endTime(conf.middleware[i]));
        }
        debuglog('middleware [%s] loaded in %d ms', conf.middleware[i], new Date() - start);
    }   
}

var defaultConf = {
    middleware: [
        'favicon',
        'compression',
        'static',
        'responseTime',
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
};

//此处有一个恶心的实现，需要自行合并http的conf，因为http组件需要在require的时候就获得合并后的配置
yog.conf.http = _.extend(defaultConf, yog.conf.http);

var tasks = _.clone(yog.conf.http.middleware);

tasks.push(core);

module.exports.http = tasks;

//加载自带中间件
var middleware = loader.loadFolder(__dirname + '/middleware');
_.extend(module.exports, middleware);

