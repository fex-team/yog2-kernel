'use strict';

var dispatcher = require('./dispatcher.js');
var express = require('express');

module.exports.dispatcher = function (app, conf) {
    conf.appPath = conf.appPath || yog.ROOT_PATH + '/app';
    var dispatcherIns = new dispatcher(conf);
    yog.dispatcher = dispatcherIns;
    //自动路由
    var autoRouter = dispatcherIns.middleware(conf.rootRouter);
    return function () {
        app.use(autoRouter);
    };
};

module.exports.dispatcher.defaultConf = {
    rootRouter: function (router) {

    }
};