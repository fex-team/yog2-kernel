'use strict';

var path = require('path');
var express = require('express');
var loader = require('./lib/loader.js');
var _ = require('lodash');
var async = require('async');

var Yog = function () {
    this.express = express;
    this.loader = loader;
    this.require = null;
    this.plugins = {};
    this.pluginFactories = {};
    this.conf = null;
    this.app = null;
    this._ = _;
};

Yog.prototype.bootstrap = function (options, cb) {
    var rootPath, pluginsPath, confPath, started;

    function loadPlugins(cb) {
        //加载默认插件
        var pluginFactory = loader.loadPlugins(__dirname + '/plugins');
        //加载用户自定义插件
        _.extend(pluginFactory, loader.loadPlugins(pluginsPath));
        //注入插件加载代码
        pluginFactory = _.mapValues(pluginFactory, loader.injectPluginFactory);
        //执行插件初始化
        async.auto(pluginFactory, cb);
    }

    options = options || {};
    //设置yog根目录，默认使用启动文件的目录
    rootPath = options.rootPath || path.dirname(require.main.filename);
    //设置plugins目录
    pluginsPath = options.pluginsPath || (rootPath + '/plugins');
    //设置conf目录
    confPath = options.confPath || (rootPath + '/conf/plugins');
    //设置app，未设置则直接使用express
    this.app = options.app || express();
    //设置启动期的拦截
    this.app.use(function (req, res, next) {
        if (started) {
            next();
            return;
        }
        res.status(503).send('Server is starting...');
    });
    //设置全局require
    this.require = require('./lib/require.js')(rootPath);
    //设置全局变量
    this.PLUGINS_PATH = pluginsPath;
    this.ROOT_PATH = rootPath;
    this.PLUGIN_TIMEOUT = process.env.PLUGIN_TIMEOUT || 3000;
    this.DEBUG = (process.env.YOG_DEBUG === 'true') || false;

    //加载配置
    this.conf = loader.loadFolder(confPath, '.' + process.env.YOG_ENV || '');
    //加载插件
    loadPlugins(function (err) {
        if (err) throw err;
        started = true;
        cb && cb();
    });

    return this.app;
};

//register global variable
Object.defineProperty(global, 'yog', {
    enumerable: true,
    writable: true,
    value: new Yog()
});

module.exports = global.yog;
