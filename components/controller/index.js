var dispatcher = require('./dispatcher.js');
var express = require('express');

module.exports.controller = function(app, conf){
    var dispatcherIns = new dispatcher(conf);
    //用户自定义rootRouter
    var router = new express.Router();
    var rootRouter = conf.rootRouter(router, dispatcherIns);
    //自动路由
    var autoRouter = dispatcherIns.middleware;
    return function(){
        app.use(rootRouter);
        app.use(autoRouter);
    }
}

module.exports.controller.defaultConf = {
    rootRouter: function(router, dispatcher){
        return router;
    }
}