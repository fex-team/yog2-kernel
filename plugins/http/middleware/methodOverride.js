var methodOverride = require('method-override');
module.exports.methodOverride = function(app, conf){
    return function(){
        if (conf instanceof Array){
            for (var i = 0; i < conf.length; i++) {
                app.use(methodOverride(conf[i]));
            }
        }else if (conf){
            app.use(methodOverride(conf));
        }
    };
};

module.exports.methodOverride.defaultConf = [
    'X-HTTP-Method',
    'X-HTTP-Method-Override',
    'X-Method-Override',
    '_method'
];