var bodyParser = require('body-parser');
var util = require('../../util.js');
module.exports.bodyParser = function(app, conf){
    return function(){

        // parse application/x-www-form-urlencoded
        app.use(util.wrapFilter(conf.urlencoded.filter, bodyParser.urlencoded(conf.urlencoded)));

        // parse application/json
        app.use(util.wrapFilter(conf.json.filter, bodyParser.json()));
    };
};


module.exports.bodyParser.defaultConf = {
    urlencoded: {
        extended: false
    },
    json: {
        
    }
};