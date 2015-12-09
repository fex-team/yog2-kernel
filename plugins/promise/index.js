'use strict';

module.exports.promise = ['ral',
    function (app, conf) {
        // 添加promise
        yog.Promise = require('bluebird');
        var originRal = yog.ral;

        function ralPromise(name, options) {
            return new yog.Promise(function (resolve, reject) {
                originRal(name, options).on('data', function (data) {
                    resolve(data);
                }).on('error', function (error) {
                    reject(error);
                });
            });
        }

        yog.ralPromise = ralPromise;
        yog.ralP = ralPromise;
        if (conf.overrideRAL) {
            yog.ral = ralPromise;
            yog.ralOrigin = yog.RAL;
        }
        if (conf.overridePromise && Promise) {
            global.Promise = yog.Promise;
        }
    }
];

module.exports.promise.defaultConf = {
    overrideRAL: false,
    overridePromise: true
};
