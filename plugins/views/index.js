var mapjson = require('./mapjson.js');
var yogView = require('yog-view');
var yogBigPipe = require('yog-bigpipe');
var _ = require('lodash');

module.exports.views = function(app, conf){
    var middleware = [];

    //初始化map.json API
    var resourceApi = mapjson({
        config_dir: conf.confDir
    });
    middleware.push(resourceApi);

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