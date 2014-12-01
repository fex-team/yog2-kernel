var bodyParser = require('body-parser');
module.exports.bodyParser = function(app, conf){
    return function(){
        // parse application/x-www-form-urlencoded
        app.use(bodyParser.urlencoded(conf.urlencoded));

        // parse application/json
        app.use(bodyParser.json());
    };
};

module.exports.bodyParser.defaultConf = {
    urlencoded: {
        extended: false
    }
};