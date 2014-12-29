var compressible = require('compressible');

module.exports.compression = function(app, conf){
    return function(){
        app.use(require('compression')(conf));
    };
};

module.exports.compression.defaultConf = {
    filter: function(req, res){
        if (res.bigpipe && Object.keys(res.bigpipe.sources).length !== 0){
            return false;
        }

        var type = res.getHeader('Content-Type');

        if (type === undefined || !compressible(type)) {
            return false;
        }

        return true;
    }
};