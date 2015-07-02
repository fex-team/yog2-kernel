'use strict';

var Promise = require('bluebird');

module.exports.promise = ['ral',
    function (app, conf) {
        // 添加promise
        yog.Promise = Promise;
        var originRal = yog.ral;

        function ralPromise(name, options) {
            return new Promise(function (resolve, reject) {
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
            yog.RAL = ralPromise;
        }
    }
];

module.exports.promise.defaultConf = {
    overrideRAL: false
};
