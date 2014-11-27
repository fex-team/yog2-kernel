require('../index.js');
yog.createServer({}, function(app){
    var server = app.listen(8083);
    // disable nagel
    server.on("connection", function (socket) {
        socket.setNoDelay(true);
    });
});