/*
 * fis
 * http://fis.baidu.com/
 * 2014/12/18
 */

'use strict';
require('should');
var loader = require('../lib/loader.js');
var async = require('async');
var domain = require('domain');
var _ = require('lodash');

describe('loader.loadFolder', function () {
    it('should load every file in folder with one level extension', function () {
        var result = loader.loadFolder(__dirname + '/loader/normal', '');
        result.should.have.property('a');
        result.should.have.property('b');
        result.should.have.property('c');
        result.should.have.property('d');
        result.should.have.property('e');
        result.should.not.have.property('f');
    });

    it('should return empty object if path is not exist', function () {
        var result = loader.loadFolder(__dirname + '/loader/normal2');
        result.should.eql({});
    });

    it('should load ignore file with wrong ext', function () {
        var result = loader.loadFolder(__dirname + '/loader/wrong_ext');
        result.should.have.property('a');
        result.should.have.property('b');
    });

    it('should load default file is normal is not exist', function () {
        var result = loader.loadFolder(__dirname + '/loader/default');
        result.should.have.property('a');
        result.should.have.property('b');
        result.a.default.should.be.false;
        result.b.default.should.be.true;
    });

    it('should load prefer file', function () {
        var result = loader.loadFolder(__dirname + '/loader/dev', '.dev');
        result.should.have.property('a');
        result.should.have.property('b');
        result.should.have.property('c');
        result.a.dev.should.be.true;
        result.b.dev.should.be.true;
        result.c.dev.should.be.false;
    });

    it('should not load unmatched subfixed file', function () {
        var result = loader.loadFolder(__dirname + '/loader/dev', '');
        result.should.have.property('a');
        result.should.not.have.property('b');
        result.should.have.property('c');
        result.a.dev.should.be.false;
        result.c.dev.should.be.false;
    });

    it('default and prefer should work well together', function () {
        var result = loader.loadFolder(__dirname + '/loader/dev', '.dev');
        result.should.have.property('a');
        result.should.have.property('b');
        result.should.have.property('c');
        result.should.have.property('d');
        result.should.have.property('f');
        result.a.dev.should.be.true;
        result.b.dev.should.be.true;
        result.c.dev.should.be.false;
        result.d.default.should.be.true;
        result.f.default.should.be.false;
    });
});

describe('loader.loadPlugins', function () {
    it('should load plugins successfully', function () {
        var result = loader.loadPlugins(__dirname + '/loader/plugin_normal');
        result.should.have.property('a');
        result.should.have.property('b');
        result.should.not.have.property('c');
    });

    it('should return empty object if path is not exist', function () {
        var result = loader.loadPlugins(__dirname + '/loader/normal2');
        result.should.eql({});
    });

    it('should ignore empty folder', function () {
        var result = loader.loadPlugins(__dirname + '/loader/plugin_csv');
        result.should.have.property('a');
        result.should.not.have.property('b');
    });
});

describe('loader.injectPluginFactory', function () {

    beforeEach(function () {
        mockYog();
    });

    afterEach(function () {
        unmockYog();
    });

    it('should inject plugin factory successfully', function (done) {
        var factory = {
            a: function (app, conf) {
                return app;
            },
            b: function (app, conf, cb) {
                setTimeout(function () {
                    cb(null, app);
                }, 100);
            }
        };
        var factoryA = loader.injectPluginFactory(factory.a, "a");
        var factoryB = loader.injectPluginFactory(factory.b, "b");
        factoryA(function (err, result) {
            result.should.have.property('_INJECT_APP_');
        });
        factoryB(function (err, result) {
            result.should.have.property('_INJECT_APP_');
            done();
        });
    });

    it('should inject timeout check', function (done) {
        var factory = {
            b: function (app, conf, cb) {
                setTimeout(function () {
                    cb(null, app);
                }, 1000);
            }
        };
        var factoryB = loader.injectPluginFactory(factory.b, "b");
        factoryB(function (err, result) {
            err.message.should.match(/timeout/);
            done();
        });
    });

    it('should inject deps timeout check', function (done) {
        var factory = {
            b: ["c", function (app, conf) {
                return app;
            }],
            c: function (app, conf, cb) {

            }
        };
        var d = domain.create();
        d.on('error', function (err) {
            err.message.should.match(/not ready/);
            done();
        });
        d.run(function () {
            factory.b = loader.injectPluginFactory(factory.b, "b");
            async.auto(factory);
        });
    });

    it('should inject default conf merge', function (done) {
        var factory = {
            a: function (app, conf) {
                return conf;
            }
        };
        factory.a.defaultConf = {
            conf_a: true
        };
        factory.a = loader.injectPluginFactory(factory.a, "a");
        factory.a(function (err, result) {
            result.conf_a.should.be.true;
            done();
        });
    });

    it('should inject YOG_DISABLE option', function (done) {
        var factory = {
            a: function (app, conf) {
                return 'a';
            },
            b: function (app, conf) {
                return 'b';
            }
        };
        yog.conf.b = {
            YOG_DISABLE: true
        };
        factory.a = loader.injectPluginFactory(factory.a, "a");
        factory.b = loader.injectPluginFactory(factory.b, "b");
        async.auto(factory, function (err, result) {
            (result.b === null).should.be.ok;
            done();
        });
    });

    it('should throw error if invalid factory is passed', function () {
        var factory = {
            a: {}
        };
        try {
            factory.a = loader.injectPluginFactory(factory.a, "a");
        }
        catch (e) {
            e.message.should.be.match(/invalid middleware/);
        }
    });

    it('should work well with plugin deps', function (done) {
        var tag = false;
        var factory = {
            a: function (app, conf) {
                tag.should.be.false;
                tag = true;
            },
            b: ["a", function (app, conf, cb) {
                tag.should.be.true;
                setTimeout(function () {
                    tag = 'after b';
                    cb();
                }, 100);
            }],
            c: ["b", function (app, conf) {
                tag.should.be.eql('after b');
                done();
            }]
        };
        factory = _.mapValues(factory, loader.injectPluginFactory);
        async.auto(factory);
    });
});

var oldYog = null;

function mockYog() {
    if (global.yog) {
        oldYog = global.yog;
    }
    Object.defineProperty(global, 'yog', {
        enumerable: true,
        writable: true,
        value: {
            PLUGIN_TIMEOUT: 500,
            app: {
                _INJECT_APP_: true
            },
            conf: {},
            plugins: {}
        }
    });
}

function unmockYog() {
    if (oldYog) {
        Object.defineProperty(global, 'yog', {
            enumerable: true,
            writable: true,
            value: oldYog
        });
    }
}
