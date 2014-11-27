var path = require('path');
var express = require('express');
var loader = require('./lib/loader.js');
var _ = require("lodash");
var async = require('async');

var yog = function(){
    var rootPath, componentsPath, confPath, conf, app, yogRequire;

    function createServer(options, cb) {
        options = options || {};
        //设置yog根目录，默认使用启动文件的目录
        rootPath = options.rootPath || path.dirname(require.main.filename);
        //设置components目录
        componentsPath = options.componentsPath || (rootPath + '/components');
        //设置conf目录
        confPath = options.confPath || (rootPath + '/conf/yog');
        //设置app，未设置则直接使用express
        app = options.app || express();
        //设置全局require
        yogRequire = require('./lib/require.js')(this.rootPath);
        //加载配置
        conf = loader.loadFolder(confPath);
        //加载组件
        loadComponents(function(err){
            if (err) throw err;
            cb && cb(app);
        });
    };

    function loadComponents(cb){
        var components = {};
        //加载默认组件
        var componentFactory = loader.loadComponents(__dirname + '/components');
        //加载用户自定义组件
        _.extend(componentFactory, loader.loadComponents(componentsPath));
        //注入debug信息
        componentFactory = _.mapValues(componentFactory, loader.injectComponentFactory);
        //执行组件初始化
        async.auto(componentFactory, cb);
    }
    var ins = {
        ROOT_PATH: rootPath,
        createServer: createServer,
        require: yogRequire,
        express: express,
        DEBUG: (process.env.YOG_DEBUG === "true") || false,
        components: {}
    };

    ins.__defineGetter__('ROOT_PATH', function(){
        return rootPath;
    });

    ins.__defineGetter__('conf', function(){
        return conf;
    });

    ins.__defineGetter__('app', function(){
        return app;
    });

    return ins;
};

//register global variable
Object.defineProperty(global, 'yog', {
    enumerable : true,
    writable : false,
    value : new yog()
});

module.exports = yog;