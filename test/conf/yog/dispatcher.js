module.exports.dispatcher = {
    rootRouter: function(router){
        return router;
    },
    defaultRouter: 'home',
    defaultAction: 'index',
    appPath: require('path').dirname(require.main.filename) + '/app'
}