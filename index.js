var path = require('path');
var express = require('express');
var loader = require('./lib/loader.js');
var _ = require("lodash");
var async = require('async');

var yog = function(){
    this.express = express;
    this.require = null;
    this.components = {};
    this.conf = null;
    this.app = null;
};

yog.prototype.initApp = function(options, cb) {
    var rootPath, componentsPath, confPath, started;

    function loadComponents(cb) {
        //加载默认组件
        var componentFactory = loader.loadComponents(__dirname + '/components');
        //加载用户自定义组件
        _.extend(componentFactory, loader.loadComponents(componentsPath));
        //注入组件加载代码
        componentFactory = _.mapValues(componentFactory, loader.injectComponentFactory);
        //执行组件初始化
        async.auto(componentFactory, cb);
    }

    options = options || {};
    //设置yog根目录，默认使用启动文件的目录
    rootPath = options.rootPath || path.dirname(require.main.filename);
    //设置components目录
    componentsPath = options.componentsPath || (rootPath + '/components');
    //设置conf目录
    confPath = options.confPath || (rootPath + '/conf/yog');
    //设置app，未设置则直接使用express
    this.app = options.app || express();
    //设置启动期的拦截
    this.app.use(function(req, res, next){
        if (started) {
            next();
            return;
        }
        res.status(503).send('Server is starting...');
    });
    //设置全局require
    this.require = require('./lib/require.js')(rootPath);
    //设置全局变量
    this.COMPONENTS_PATH = componentsPath;
    this.ROOT_PATH = rootPath;
    this.COMPONENT_TIMEOUT = process.env.COMPONENT_TIMEOUT || 3000;
    this.DEBUG = (process.env.YOG_DEBUG === "true") || false;

    //加载配置
    this.conf = loader.loadFolder(confPath);
    //加载组件
    loadComponents(function(err){
        if (err) throw err;
        started = true;
        cb && cb();
    });

    return this.app;
};

//register global variable
Object.defineProperty(global, 'yog', {
    enumerable : true,
    writable : false,
    value : new yog()
});

module.exports = yog;