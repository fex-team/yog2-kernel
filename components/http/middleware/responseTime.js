module.exports.responseTime = function(app, conf){
    return function(){
        app.use(require('response-time')(conf));
    }
}