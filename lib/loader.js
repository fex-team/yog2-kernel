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
    //获取所有配置
    readdirWithEnvSync(path, prefer).forEach(function (subPath) {
        var ext = p.extname(subPath);
        if (ext === '.js' || ext === '.json') {
            _.extend(obj, require(subPath));
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

function readdirSync(dir) {
    var results = [];
    var list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = dir + '/' + file;
        var stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(readdirSync(file));
        }
        else {
            results.push(file);
        }
    });
    return results;
}


function readdirWithEnvSync(path, prefer) {
    var loaded = {};
    var files = [];
    readdirSync(path).forEach(function (subPath) {
        if (loaded[p.normalize(subPath)]) {
            return;
        }
        var ext = p.extname(subPath);
        var filePath = null;
        var basename = p.basename(subPath, ext);
        var subfix = p.extname(basename);
        var dirname = p.dirname(subPath);
        var confname = p.basename(basename, subfix);
        var confID = dirname + '/' + p.basename(basename, subfix) + '@' + prefer;
        if (basename[0] === '.' || loaded[confID]) {
            return;
        }

        function getPreferFile() {
            // check if prefer file is exist
            if (prefer) {
                var preferFile = dirname + p.sep + confname + '.' + prefer + ext;
                if (fs.existsSync(preferFile)) {
                    return preferFile;
                }
            }
            return false;
        }

        if (subfix === prefer) {
            // load orgin file if subfix == prefer
            filePath = subPath;
        }
        else {
            var preferFile = getPreferFile();
            if (preferFile) {
                // load prefer file if prefer file is exist
                filePath = preferFile;
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
            else if (subfix === '') {
                filePath = subPath;
            }
        }
        if (filePath) {
            filePath = p.normalize(filePath);
            if (loaded[filePath]) {
                return;
            }
            // 记录confID与filePath均被处理用于减少查询操作
            loaded[filePath] = true;
            loaded[confID] = true;
            files.push(filePath);
        }
    });
    return files;
}
