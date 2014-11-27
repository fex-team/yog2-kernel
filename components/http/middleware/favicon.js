module.exports.favicon = function(app, conf){
    return function(){
        if (require('fs').existsSync(conf.path)){
            app.use(require('serve-favicon')(conf.path));
        }
    }
}

module.exports.favicon.defaultConf = {
    path: yog.ROOT_PATH + '/static/favicon.ico'
}
