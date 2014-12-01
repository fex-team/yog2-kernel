'use strict';

var dispatcher = require('./dispatcher.js');
var express = require('express');

module.exports.dispatcher = function(app, conf){
    conf.appPath = conf.appPath || yog.ROOT_PATH + '/app';
    var dispatcherIns = new dispatcher(conf);
    //用户自定义rootRouter
    var router = new express.Router();
    yog.dispatcher = dispatcherIns;
    var rootRouter = conf.rootRouter(router);
    //自动路由
    var autoRouter = dispatcherIns.middleware;
    return function(){
        app.use(rootRouter);
        app.use(autoRouter);
    };
};

module.exports.dispatcher.defaultConf = {
    rootRouter: function(router, dispatcher){
        return router;
    }
};