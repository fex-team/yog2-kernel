'use strict';

var fs = require('fs');
var p = require('path');
var _ = require('lodash');
var debuglog = require('debuglog')('yog/loader');
require('colors');

module.exports.loadPlugins = function(path){
    var obj = {};
    if (!fs.existsSync(path)){
        return obj;
    }
    //获取所有文件夹
    fs.readdirSync(path).forEach(function(subPath) {
        subPath = path + '/' + subPath;
        var stat = fs.statSync(subPath);
        if (stat.isDirectory() && fs.existsSync(subPath + '/index.js')){
            //加载index.js
            _.extend(obj, require(subPath));
        }
    });
    return obj;
};

module.exports.loadFolder = function loadFolder(path){
    var obj = {};
    if (!fs.existsSync(path)){
        return obj;
    }
    //获取所有文件
    fs.readdirSync(path).forEach(function(subPath) {
        if (subPath === '.svn' || subPath === '.git'){
            return;
        }
        subPath = path + '/' + subPath;
        var stat = fs.statSync(subPath);
        if (stat.isDirectory()){
            _.extend(obj, loadFolder(subPath));
        }else{
            var ext = p.extname(subPath);
            if (ext === '.js' || ext === '.json'){
                _.extend(obj, require(subPath));
            }
        }
    });
    return obj;
};

module.exports.injectPluginFactory = function(factory, name){

    var pluginLoadTimeout, depsLoadTimeout;

    function runFactory(factory, cb){
        var conf, start = +(new Date());
        var done = false;
        var loadedCallback = function(err, plugin){
            //阻止多次回调
            if (done){
                return;
            }
            done = true;
            pluginLoadTimeout && clearTimeout(pluginLoadTimeout);
            if (err){
                debuglog('plugin [%s] loaded failed [%s] in %d ms'.red, name, err.message, new Date() - start);
            }else{
                debuglog('plugin [%s] loaded in %d ms'.green, name, new Date() - start);
            }
            yog.plugins[name] = plugin;
            cb && cb(err, plugin);
        };

        //合并默认配置
        if (factory.defaultConf){
            conf = _.extend(_.cloneDeep(factory.defaultConf), yog.conf[name] || {});
        }else{
            conf = yog.conf[name] || {};
        }
        if (conf.YOG_DISABLE){
            debuglog('plugin [%s] was disabled'.red, name);
            cb && cb(null, null);
            return;
        }
        debuglog('load plugin [%s] with conf %s', name, JSON.stringify(conf));
        if (factory.length >= 3){
            pluginLoadTimeout = setTimeout(function(){
                loadedCallback(new Error('timeout'));
            }, yog.PLUGIN_TIMEOUT);
            //三个参数 factory(app, conf, cb) 用于异步
            factory(yog.app, conf, loadedCallback);
        }else{
            //factory(app, conf) 用于同步
            var plugin = factory(yog.app, conf);
            //同步初始化自动回调
            loadedCallback(null, plugin);
        }
    }

    if (typeof factory === 'function'){
        return function(cb){
            debuglog('start load plugin [%s]', name);
            runFactory(factory, cb);
        };
    }else if (factory instanceof Array){
        //抽取前置依赖
        var deps = _.first(factory, factory.length-1);
        debuglog('wait to load plugin [%s] with deps [%s]', name, deps);
        //设置组件加载超时
        depsLoadTimeout = setTimeout(function(){
            throw new Error('plugin ' + name + ' load failed since dependecies are not ready.');
        }, yog.PLUGIN_TIMEOUT);
        //封装factory function
        var func = function(cb){
            debuglog('start load plugin [%s]', name);
            runFactory(_.last(factory), function(){
                clearTimeout(depsLoadTimeout);
                depsLoadTimeout = null;
                cb && cb();
            });
        };
        deps.push(func);
        return deps;
    }else{
        throw new Error('invalid middleware: ' + name);
    }
};