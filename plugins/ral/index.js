var ralMiddleware = require('node-ral').Middleware;
var ral = require('node-ral').RAL;

module.exports.ral = function(app, conf){
    yog.RAL = ral;
    yog.ral = ral;
    //ral初始化由中间件完成
    return function(){
        app.use(ralMiddleware(conf));
    };
};

module.exports.ral.defaultConf = {
    confDir: yog.ROOT_PATH + '/conf/ral',
    mockDir: yog.ROOT_PATH + '/mock',
    logger: require('../log').log.defaultConf
};
