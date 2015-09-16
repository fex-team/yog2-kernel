'use strict';

var fs = require('fs');
var p = require('path');
var _ = require('lodash');
var debuglog = require('debuglog')('yog/loader');
require('colors');

module.exports.loadPlugins = function (path) {
    var obj = {};
    if (!fs.existsSync(path)) {
        return obj;
    }
    //获取所有文件夹
    fs.readdirSync(path).forEach(function (subPath) {
        subPath = path + '/' + subPath;
        var stat = fs.statSync(subPath);
        if (stat.isDirectory() && fs.existsSync(subPath + '/index.js')) {
            //加载index.js
            _.extend(obj, require(subPath));
        }
    });
    return obj;
};

module.exports.loadFolder = function loadFolder(path, prefer) {
    var obj = {};
    if (!fs.existsSync(path)) {
        return obj;
    }
    //获取所有文件
    var loaded = {};
    fs.readdirSync(path).forEach(function (subPath) {
        if (!subPath || subPath[0] === '.') {
            return;
        }
        if (loaded[p.normalize(subPath)]) {
            return;
        }
        subPath = path + '/' + subPath;
        var stat = fs.statSync(subPath);
        if (stat.isDirectory()) {
            _.extend(obj, loadFolder(subPath, prefer));
        }
        else {
            var ext = p.extname(subPath);
            var filePath = null;
            if (ext === '.js' || ext === '.json') {
                var basename = p.basename(subPath, ext);
                var subfix = p.extname(basename);
                var dirname = p.dirname(subPath);
                if (prefer === undefined) {
                    // if prefer is not set, load orgin file
                    filePath = subPath;
                }
                else if (subfix === '') {
                    // when load file with one level extension
                    if (prefer) {
                        // check if prefer file is exist
                        var preferFile = dirname + p.sep + basename + prefer + ext;
                        if (fs.existsSync(preferFile)) {
                            filePath = preferFile;
                        }
                        else {
                            // load origin file if prefer file is not exist
                            filePath = subPath;
                        }
                    }
                    else {
                        // load origin file if prefer conf is not exist
                        filePath = subPath;
                    }
                }
                else if (subfix === '.default') {
                    // load xxx.default.js only if xxx.js (normalName) is not exist
                    var normalName = dirname + p.sep + p.basename(basename, subfix) + ext;
                    if (fs.existsSync(normalName)) {
                        filePath = normalName;
                    }
                    else {
                        // load default file if normal file is not exist
                        filePath = subPath;
                    }
                }
                else if (subfix == prefer) {
                    // load default file if subfix == prefer
                    filePath = subPath;
                }
                if (filePath) {
                    loaded[p.normalize(filePath)] = true;
                    _.extend(obj, require(filePath));
                }
            }
        }
    });
    return obj;
};

module.exports.injectPluginFactory = function (factory, name) {
    var pluginLoadTimeout, depsLoadTimeout;

    function runFactory(factory, cb) {
        var conf, start = +(new Date());
        var done = false;
        var loadedCallback = function (err, plugin) {
            //阻止多次回调
            if (done) {
                return;
            }
            done = true;
            pluginLoadTimeout && clearTimeout(pluginLoadTimeout);
            if (err) {
                debuglog('plugin [%s] loaded failed [%s] in %d ms'.red, name, err.message, new Date() - start);
            }
            else {
                debuglog('plugin [%s] loaded in %d ms'.green, name, new Date() - start);
            }
            yog.plugins[name] = plugin;
            cb && cb(err, plugin);
        };
        //合并默认配置
        if (factory.defaultConf) {
            conf = _.extend(_.cloneDeep(factory.defaultConf), yog.conf[name] || {});
        }
        else {
            conf = yog.conf[name] || {};
        }
        if (conf.YOG_DISABLE) {
            debuglog('plugin [%s] was disabled'.red, name);
            cb && cb(null, null);
            return;
        }
        debuglog('load plugin [%s] with conf %s', name, JSON.stringify(conf));
        if (factory.length >= 3) {
            pluginLoadTimeout = setTimeout(function () {
                loadedCallback(new Error('timeout'));
            }, yog.PLUGIN_TIMEOUT);
            //三个参数 factory(app, conf, cb) 用于异步
            factory(yog.app, conf, loadedCallback);
        }
        else {
            //factory(app, conf) 用于同步
            var plugin = factory(yog.app, conf);
            //同步初始化自动回调
            loadedCallback(null, plugin);
        }
    }
    if (typeof factory === 'function') {
        return function (cb) {
            debuglog('start load plugin [%s]', name);
            runFactory(factory, cb);
        };
    }
    else if (factory instanceof Array) {
        //抽取前置依赖
        var deps = _.take(factory, factory.length - 1);
        debuglog('wait to load plugin [%s] with deps [%s]', name, deps);
        //设置组件加载超时
        depsLoadTimeout = setTimeout(function () {
            throw new Error('plugin ' + name + ' load failed since dependecies are not ready.');
        }, yog.PLUGIN_TIMEOUT);
        //封装factory function
        var func = function (cb) {
            debuglog('start load plugin [%s]', name);
            var realFactory = factory[factory.length - 1];
            // 将defaultConf转移至真实factory
            realFactory.defaultConf = factory.defaultConf;
            runFactory(realFactory, function () {
                clearTimeout(depsLoadTimeout);
                depsLoadTimeout = null;
                cb && cb();
            });
        };
        deps.push(func);
        return deps;
    }
    else {
        throw new Error('invalid middleware: ' + name);
    }
};
