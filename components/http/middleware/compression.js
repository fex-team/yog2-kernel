module.exports.compression = function(app, conf){
    return function(){
        app.use(require('compression')(conf));
    }
}