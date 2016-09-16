var ralMiddleware = require('node-ral').Middleware;
var ral = require('node-ral').RAL;
var debuglog = require('debuglog')('yog/loader');

module.exports.ral = ['recv-reload', function(app, conf){
    yog.RAL = ral;
    yog.ral = ral;

    var reloader = yog.plugins['recv-reload'];
    reloader && reloader.on('cacheClean', function () {
        debuglog('reload ral conf');
        reloader.cleanCacheForFolder(conf.confDir);
        ral.reload && ral.reload();
    });

    //ral初始化由中间件完成
    return function(){
        app.use(ralMiddleware(conf));
    };
}];

module.exports.ral.defaultConf = {
    confDir: yog.ROOT_PATH + '/conf/ral',
    logger: require('../log').log.defaultConf
};
