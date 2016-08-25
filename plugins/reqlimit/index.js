/**
 * @file 流控模块
 * @author fis@baidu.com
 *
 * 根据服务状态进行流量控制
 */

/* global: yog */

'use strict';

var Eventloop = require('./eventloop.js');

function initEventLoop(conf) {
    var eventloop = new Eventloop(conf);
    eventloop.start();
    return eventloop;
}

module.exports.reqlimit = function (app, conf) {
    var shouldLimit = conf.shouldLimit;
    var onLimit = conf.onLimit;
    var eventloop;
    return function () {
        app.use(function (req, res, next) {
            if (!eventloop) {
                eventloop = initEventLoop(conf.eventLoop);
                if (conf.onEventLoopTick) {
                    eventloop.on('tick', conf.onEventLoopTick);
                }
            }
            var info = {
                req: req,
                delay: eventloop.lastDelay
            };

            shouldLimit(info, conf, function (err, limit) {
                if (err) {
                    return next();
                }
                if (limit) {
                    return onLimit(req, res, next);
                }
                else {
                    return next();
                }
            });
        });
    };
};

module.exports.reqlimit.defaultConf = {
    eventLoop: {
        interval: 300
    },
    maxDelay: 300,
    shouldLimit: function (info, conf, cb) {
        if (info.delay > conf.maxDelay) {
            return cb && cb(null, true);
        }
        return cb && cb(null, false);
    },
    onEventLoopTick: function (tick) {
        yog.log.notice('Current eventLoop delay is ' + tick);
    },
    onLimit: function (req, res, next) {
        yog.log.fatal('Request ' + req.url + ' was refused since eventloop delay is too high.');
        res.status(503);
        res.end('Service Not Avaliable');
    }
};
