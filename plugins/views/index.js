var mapjson = require('./mapjson.js');
var yogView = require('yog-view');
var yogBigPipe = require('yog-bigpipe');
var _ = require('lodash');

module.exports.views = function (app, conf) {
    var middleware = [];
    var viewEngines = [];

    app.set('views', conf.viewsDir);

    if (conf.viewCache) {
        app.enable('view cache');
    }

    //初始化map.json API
    app.fis = new mapjson.ResourceApi(conf.confDir);

    middleware.push(function (req, res, next) {
        res.fis = app.fis;
        next();
    });

    //初始化bigpipe
    if (conf.bigpipe) {
        middleware.push(yogBigPipe(conf.bigpipeOpt));
    }
    _.forIn(conf.engine, function (engine, name) {
        //设置view engine
        var viewEngine = new yogView(app, engine, conf[name] || {});
        viewEngines.push(viewEngine);
        app.engine(name, viewEngine.renderFile.bind(viewEngine));
    });

    yog.view = {
        cleanCache: function () {
            // 清除FIS resourcemap缓存
            app.fis = new mapjson.ResourceApi(conf.confDir);
            _.forEach(viewEngines, function (viewEngine) {
                viewEngine.cleanCache();
            });
        }
    };

    return function () {
        app.use(middleware);
    };
};

module.exports.views.defaultConf = {
    confDir: yog.ROOT_PATH + '/conf/fis',
    viewsDir: yog.ROOT_PATH + '/views',
    bigpipe: true,
    bigpipeOpt: {
        skipAnalysis: true,
        isSpiderMode: function (req) {
            if (req.headers['user-agent'] && /bot|spider/.test(req.headers['user-agent'].toLowerCase())) {
                return true;
            }
        },
    },
    tpl: {
        cache: 'memory'
    },
    engine: {
        tpl: 'yog-swig'
    }
};
