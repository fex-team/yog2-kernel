var mapjson = require('./mapjson.js');
var yogView = require('yog-view');
var yogBigPipe = require('yog-bigpipe');

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

    //设置view engine
    app.engine('tpl', yogView.init({
        cache: conf.cache,
        engine: 'yog-swig'
    }, app));

    if (conf.cache){
        app.enable('view cache');
    }

    return function(){
        app.use(middleware);
    };
};

module.exports.views.defaultConf = {
    confDir: yog.ROOT_PATH + '/conf/fis',
    bigpipe: true
};