var logger = require('yog-log');
var path = require('path');

module.exports.log = function(app, conf){
    yog.__defineGetter__('log', function(){
        return logger.getLogger(conf);
    });
    return function(){
        app.use(logger(conf));
    };
};

module.exports.log.defaultConf = {
    'app': 'yog',
    'data_path': path.join(yog.ROOT_PATH, 'tmp'),
    'log_path': path.join(yog.ROOT_PATH, 'log'),
    'use_sub_dir': 1
};
