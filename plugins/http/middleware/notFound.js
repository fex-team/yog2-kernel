var debuglog = require('debuglog')('yog/plugins');

module.exports.notFound = function(app, conf){
    return function(){
        if (!yog.DEBUG){
            app.use(function(req, res){
                res.status(404);
                res.send('404: Page not Found');
            });            
        }else{
            debuglog('start debug mode for not found page'.yellow);
        }
    };
};