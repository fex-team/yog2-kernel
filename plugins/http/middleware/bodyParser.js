var bodyParser = require('body-parser');
var util = require('../../util.js');
module.exports.bodyParser = function(app, conf){
    return function(){

        // parse application/x-www-form-urlencoded
        app.use(util.wrapExclude(conf.urlencoded.exclude, bodyParser.urlencoded(conf.urlencoded)));

        // parse application/json
        app.use(util.wrapExclude(conf.json.exclude, bodyParser.json(conf.json)));
    };
};


module.exports.bodyParser.defaultConf = {
    urlencoded: {
        extended: false
    },
    json: {
        
    }
};
