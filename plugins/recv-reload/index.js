'use strict';

var path = require('path');
var debuglog = require('debuglog')('yog/recv-reload');
var tar = require('tar');
var yog = require('../../index.js');
var EventEmitter = require('events').EventEmitter;
var zlib = require('zlib');

/**
 * 上传监测到的app
 * @type {Object}
 */
var waitingReloadApps = {};

/**
 * 上传过程中是否有出现异常
 * @type {Boolean}
 */
var uploadError = false;

/**
 * 全局检测状态
 * @type {Boolean}
 */
var globalCheckSatus = false;
/**
 * 当前上传作业数量
 * @type {Number}
 */
var uploading = 0;
/**
 * 总上传作业数量
 * @type {Number}
 */
var total = 0;

/**
 * 检测上传是否结束
 * @param  {[type]}   timeout [description]
 * @param  {Function} cb      [description]
 * @return {[type]}           [description]
 */
function startUploadStateCheck(timeout, cb) {
    var checkTimer = null;

    /**
     * 每10ms检测一次uploading状态，当前没有上传任务时，uploading为0
     * @return {[type]} [description]
     */
    function checkUplodingStatus() {
        checkTimer = setInterval(function () {
            if (uploading === 0 && checkTimer) {
                clearInterval(checkTimer);
                checkTimer = null;
                // 检测通过，开始检测50ms内是否还有新请求
                waitforNewUpload();
            }
        }, 10);
    }

    /**
     * 判断20ms内是否还有新增的上传请求，如果有则回到uploding检测状态
     * @return {[type]} [description]
     */
    function waitforNewUpload() {
        var periodTotal = total;
        setTimeout(function () {
            if (periodTotal === total) {
                debuglog('detect upload end');
                end();
            }
            else {
                debuglog('restart upload detect', periodTotal, total);
                checkUplodingStatus(cb);
            }
        }, 50);
    }

    function end() {
        globalCheckSatus = false;
        clearTimeout(uploadTimeout);
        uploadTimeout = null;
        clearInterval(checkTimer);
        checkTimer = null;
        total = 0;
        cb && cb();
    }

    if (globalCheckSatus) {
        return;
    }

    globalCheckSatus = true;

    checkUplodingStatus();

    // 上传整体超时检测
    var uploadTimeout = setTimeout(function () {
        debuglog('upload timeout');
        end();
    }, timeout * 1000);
}


function reloadApp(appName) {
    debuglog('reload app: %s', appName || 'all');
    appName = appName || '';
    var appPath = yog.conf.dispatcher.appPath || path.join(yog.ROOT_PATH, 'app');
    var appModulePath = path.join(appPath, appName);
    cleanCacheForFolder(appModulePath);
    if (yog.dispatcher && yog.dispatcher.cleanCache) {
        yog.dispatcher.cleanCache();
        debuglog('clean dispatcher cache');
    }
    if (yog.require && yog.require.cleanCache) {
        yog.require.cleanCache();
        debuglog('clean yog require cache');
    }
}

function reloadIsomorphic() {
    if (yog.plugins.isomorphic && yog.plugins.isomorphic.cleanCache) {
        yog.plugins.isomorphic.cleanCache();
        if (yog.conf.static) {
            cleanCacheForFolder(yog.conf.static.staticPath);
        } else {
            cleanCacheForFolder(path.join(yog.ROOT_PATH, 'static'));
        }
        debuglog('clean isomorphic cache');
    }
}

function reloadView() {
    if (yog.view && yog.view.cleanCache) {
        yog.view.cleanCache();
        debuglog('clean view cache');
    }
}

function cleanCacheForFolder(moduleFolderPath) {
    moduleFolderPath = moduleFolderPath.toLowerCase() + path.sep;
    var modules = Object.keys(require.cache);
    for (var i = 0; i < modules.length; i++) {
        var modulePath = modules[i];
        if (modulePath.toLowerCase().indexOf(moduleFolderPath) === 0) {
            cleanCache(modulePath);
            debuglog('clean cache: ', path.relative(yog.ROOT_PATH, modulePath));
        }
    }
}

function extract(part, to, cb) {
    // 移除 to 中的文件名
    to = path.dirname(to);
    // 创建解压流
    var extractStream = tar.Extract({
        path: path.join(yog.ROOT_PATH, to),
        strip: 0
    });
    // 将文件流发送至解压流
    debuglog('start untar package to [%s]', to);

    extractStream.on('end', function () {
        debuglog('untar package [%s] finished', to);
        cb && cb();
    });

    if (/\.tar\.gz$/.test(part.filename)) {
        var ungz = zlib.createGunzip({});
        ungz.pipe(extractStream);
        part.pipe(ungz);
    } else {
        part.pipe(extractStream);
    }
}

function streamToString(stream, cb) {
    var chunks = [];
    stream.on('data', function (chunk) {
        chunks.push(chunk);
    });
    stream.on('end', function () {
        cb(chunks.join(''));
    });
}

function cleanCache(modulePath) {
    var module = require.cache[modulePath];
    // remove reference for cache
    module.parent && module.parent.children.splice(module.parent.children.indexOf(module), 1);
    module = null;
    require.cache[modulePath] = null;
    delete require.cache[modulePath];
}

module.exports['recv-reload'] = ['dispatcher',
    function (app, conf) {
        var ev = new EventEmitter();
        // only enable when YOG_DEBUG=true
        if (yog.DEBUG) {
            var cluster = require('cluster');
            var multiparty = require('multiparty');
            var fs = require('fs-extra');

            setTimeout(function () {
                if (cluster.isWorker) {
                    console.log('[WARN] recv-reload plugin is better to run without cluster');
                }
                console.log('[NOTICE] recv-reload plugin is running in ' + conf.receiverUrl +
                    ', please disable it in production');
            }, 1000);

            app.get(conf.cleanCacheUrl + '/:app', function (req, res) {
                reloadApp(req.params.app);
                reloadView();
                reloadIsomorphic();
                res.end('cache cleaned');
                ev.emit('cacheClean', [req.params.app]);
                conf.onCacheClean && conf.onCacheClean(req.params.app);
            });

            app.get(conf.cleanCacheUrl, function (req, res) {
                reloadApp();
                reloadView();
                reloadIsomorphic();
                res.end('cache cleaned');
                ev.emit('cacheClean');
                conf.onCacheClean && conf.onCacheClean();
            });

            app.post(conf.tarReceiverUrl, function (req, res, next) {
                var to = null;
                var filePart = null;

                // 最大200mb
                var form = new multiparty.Form({
                    maxFieldsSize: conf.maxTarSize
                });

                function tryExtract() {
                    if (filePart && to) {
                        extract(filePart, to, function () {
                            reloadApp();
                            reloadView();
                            reloadIsomorphic();
                            ev.emit('cacheClean');
                            conf.onCacheClean && conf.onCacheClean();
                        });
                    }
                }

                form.on('error', function (err) {
                    return next(err);
                });

                form.on('part', function (part) {
                    if (!part.filename) {
                        streamToString(part, function (val) {
                            debuglog('got to: [%s]', val);
                            to = val;
                            tryExtract();
                        });
                    }

                    if (part.filename) {
                        filePart = part;
                        tryExtract();
                    }

                    part.on('error', function (err) {
                        return next(err);
                    });
                });

                form.on('close', function () {
                    res.end('0');
                });

                form.parse(req);
            });

            app.post(conf.receiverUrl, function (req, res, next) {
                if (uploadError) {
                    return next(new Error('fs error'));
                }
                var goNext = function (err) {
                    uploading--;
                    return next(err);
                };
                uploading++;
                total++;
                startUploadStateCheck(conf.uploadTimeout, function () {
                    // reload uploaded app
                    var apps = Object.keys(waitingReloadApps);
                    if (conf.lazyAppReload) {
                        for (var i = 0; i < apps.length; i++) {
                            reloadApp(apps[i]);
                        }
                    } else {
                        reloadApp();
                    }
                    reloadView();
                    reloadIsomorphic();
                    ev.emit('cacheClean', apps);
                    conf.onCacheClean && conf.onCacheClean();
                    waitingReloadApps = {};
                    uploadError = false;
                });
                // parse a file upload
                var form = new multiparty.Form();
                form.parse(req, function (err, fields, files) {
                    if (err) return goNext(err);
                    if (!files.file || !files.file[0]) return goNext(new Error('invalid upload file'));
                    res.end('0');
                    // record uploading app
                    if (fields.to) {
                        var appRootPath = yog.conf.dispatcher.appPath || path.join(yog.ROOT_PATH, 'app');
                        var deployPath = path.join(yog.ROOT_PATH, fields.to.toString());
                        var appPath = path.relative(appRootPath, deployPath);
                        if (appPath.indexOf('..') !== 0) {
                            var appName = appPath.split(path.sep)[0];
                            if (appName) {
                                waitingReloadApps[appName] = true;
                            }
                        }
                    }
                    fs.move(
                        files.file[0].path, yog.ROOT_PATH + fields.to, {
                            clobber: true
                        },
                        function (err) {
                            if (err) {
                                uploadError = true;
                            }
                            uploading--;
                        }
                    );
                });
            });

            app.get(conf.receiverUrl, function (req, res) {
                res.end(req.protocol + '://' + req.get('host') + conf.receiverUrl + ' is ready to work');
            });

            app.get(conf.tarReceiverUrl, function (req, res) {
                res.end(req.protocol + '://' + req.get('host') + conf.tarReceiverUrl + ' is ready to work');
            });

            yog.reloadApp = reloadApp;
            yog.reloadView = reloadView;
            yog.reloadIsomorphic = reloadIsomorphic;
        }
        ev.cleanCacheForFolder = cleanCacheForFolder;
        return ev;
    }
];

module.exports['recv-reload'].defaultConf = {
    tarReceiverUrl: '/yog/uploadtar',
    cleanCacheUrl: '/yog/reload',
    receiverUrl: '/yog/upload',
    uploadTimeout: 30,
    maxTarSize: '200mb',
    onCacheClean: null,
    lazyAppReload: false
};
