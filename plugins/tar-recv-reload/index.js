/**
 * @file 接收tar包并解压的接收器
 */

'use-strict';

var yog = require('../../index.js');

module.exports['tar-recv-reload'] = function (app, conf) {
    if (!yog.DEBUG) {
        return;
    }
    var path = require('path');
    var debuglog = require('debuglog')('yog/tar-recv-reload');
    var multiparty = require('multiparty');
    var tar = require('tar');
    app.post(conf.receiverUrl, function (req, res, next) {
        var to = null;
        var filePart = null;

        // 最大200mb
        var form = new multiparty.Form({
            maxFieldsSize: conf.maxFieldsSize
        });

        form.on('error', function (err) {
            return next(err);
        });

        form.on('part', function (part) {
            if (!part.filename) {
                streamToString(part, function (val) {
                    debuglog('got to: [%s]', val);
                    to = val;
                    if (filePart) {
                        extract(filePart, to);
                    }
                });
            }

            if (part.filename) {
                filePart = part;
                if (to) {
                    extract(filePart, to);
                }
            }

            part.on('error', function (err) {
                return next(err);
            });
        });

        form.on('close', function () {
            conf.onCacheClean && conf.onCacheClean();
            res.end('0');
        });

        form.parse(req);
    });

    function extract(part, to) {
        // 创建解压流
        var extractStream = tar.Extract({
            path: path.join(yog.ROOT_PATH, to),
            strip: 0
        });
        // 将文件流发送至解压流
        debuglog('start untar package to [%s]', to);
        part.pipe(extractStream);
    }
};


function streamToString(stream, cb) {
    var chunks = [];
    stream.on('data', function (chunk) {
        chunks.push(chunk);
    });
    stream.on('end', function () {
        cb(chunks.join(''));
    });
}

module.exports['tar-recv-reload'].defaultConf = {
    receiverUrl: '/yog/uploadtar',
    maxFieldsSize: '200mb',
    onCacheClean: null
};
