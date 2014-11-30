var fs = require("fs");
var _ = require("lodash");
var debuglog = require('debuglog')('yog/loader');

module.exports.loadComponents = function(path){
    var obj = {};
    if (!fs.existsSync(path)){
        return obj;
    }
    //获取所有文件夹
    fs.readdirSync(path).forEach(function(subPath) {
        subPath = path + '/' + subPath;
        var stat = fs.statSync(subPath);
        if (stat.isDirectory()){
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
        subPath = path + '/' + subPath;
        var stat = fs.statSync(subPath);
        if (stat.isDirectory()){
            _.extend(obj, loadFolder(subPath));
        }else{
            _.extend(obj, require(subPath));
        }
    });
    return obj;
};

module.exports.injectComponentFactory = function(factory, name){

    function runFactory(factory, cb){
        var conf, start = +(new Date());
        var loadedCallback = function(err, component){
            debuglog('component [%s] loaded in %d ms'.green, name, new Date() - start);
            yog.components[name] = component;
            cb && cb(err, component);
        };

        //合并默认配置
        if (factory.defaultConf){
            conf = _.extend(_.cloneDeep(factory.defaultConf), yog.conf[name] || {});
        }else{
            conf = yog.conf[name] || {};
        }
        if (conf.YOG_DISABLE){
            debuglog('component [%s] was disabled'.red, name);
            cb && cb(null, null);
            return;
        }
        debuglog('load component [%s] with conf %s', name, JSON.stringify(conf));
        if (factory.length >= 3){
            //三个参数 factory(app, conf, cb) 用于异步
            factory(yog.app, conf, loadedCallback);
        }else{
            //factory(app, conf) 用于同步
            var component = factory(yog.app, conf);
            //同步初始化自动回调
            loadedCallback(null, component);
        }
    }

    if (typeof factory === 'function'){
        return function(cb){
            debuglog('start load component [%s]', name);
            runFactory(factory, cb);
        };
    }else if (factory instanceof Array){
        //抽取前置依赖
        var deps = _.first(factory, factory.length-1);
        debuglog('wait to load component [%s] with deps [%s]', name, deps);
        //设置组件加载超时
        var componentLoadTimeout = setTimeout(function(){
            debuglog('component [%s] load failed since timeout'.red, name);
            throw new Error('component ' + name + ' load failed since timeout, pls check dependencies.');
        }, yog.COMPONENT_TIMEOUT);
        //封装factory function
        var func = function(cb){
            debuglog('start load component [%s]', name);
            runFactory(_.last(factory), function(){
                clearTimeout(componentLoadTimeout);
                componentLoadTimeout = null;
                cb && cb();
            });
        };
        deps.push(func);
        return deps;
    }else{
        throw new Error('invalid middleware: ' + name);
    }
};