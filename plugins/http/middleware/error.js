var debuglog = require('debuglog')('yog/plugins');

module.exports.error = function(app, conf){
    return function(){
        if (!yog.DEBUG){
            app.use(function(error, req, res, next){
                res.status(500);
                res.send('500: Internal Server Error');
            });
        }else{
            debuglog('start debug mode for error page'.yellow);
        }
    };
};