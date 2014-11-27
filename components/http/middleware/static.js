module.exports.static = function(app, conf){
    return function(){
        app.use(conf.urlPattern, yog.express.static(conf.staticPath, conf.cache));
        //拦截404
        app.use(conf.urlPattern, conf.notFound);        
    }
}

module.exports.static.defaultConf = {
    cache: {
        maxAge: 0
    },
    staticPath: yog.ROOT_PATH + '/static',
    urlPattern: '/static',
    notFound: function(req, res){
        res.status(404);
        res.send('404: Resource not Found');
    }
}