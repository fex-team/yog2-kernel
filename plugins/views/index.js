var mapjson = require('./mapjson.js');
var yogView = require('yog-view');
var yogBigPipe = require('yog-bigpipe');
var _ = require('lodash');

module.exports.views = function(app, conf){
    var middleware = [];

    //初始化map.json API
    app.fis = new mapjson.ResourceApi(conf.confDir);

    middleware.push(function(req, res, next){
        // 关闭缓存时，刷新mapjson对象
        if (!conf.cache){
            app.fis = new mapjson.ResourceApi(conf.confDir);
        }
        res.fis = app.fis;
        next();
    });

    //初始化bigpipe
    if (conf.bigpipe){
        middleware.push(yogBigPipe());
    }

    app.set('views', conf.viewsDir);

    _(conf.engine).forEach(function(engine, name){
        //设置view engine
        app.engine(name, yogView.init({
            cache: conf.cache,
            engine: engine
        }, app));
    });

    if (conf.cache){
        app.enable('view cache');
    }

    return function(){
        app.use(middleware);
    };
};

module.exports.views.defaultConf = {
    confDir: yog.ROOT_PATH + '/conf/fis',
    viewsDir: yog.ROOT_PATH + '/views',
    bigpipe: true,
    engine: {
        tpl: require('yog-swig')
    }
};