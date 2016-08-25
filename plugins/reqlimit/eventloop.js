/**
 * @file EventLoop跟踪模块
 * @author fis@baidu.com
 *
 * 获取服务当前EventLoop信息
 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');

function Eventloop(options) {
    options = options || {};
    this.interval = options.interval || 500;
    this.checker = null;
    this.lastDelay = 0;
    EventEmitter.call(this);
}

util.inherits(Eventloop, EventEmitter);

Eventloop.prototype.start = function() {
    var me = this;
    var now = Date.now();
    this.checker = setInterval(function () {
        var tick = Date.now();
        me.lastDelay = tick - now - me.interval;
        now = tick;
        me.emit('tick', me.lastDelay);
    }, this.interval);
};

Eventloop.prototype.stop = function() {
    clearInterval(this.checker);
};

Eventloop.prototype.getLastDelay = function() {
    return this.lastDelay;
};

module.exports = Eventloop;
