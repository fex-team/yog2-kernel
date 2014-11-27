require('../index.js');
yog.createServer({}, function(app){
});

try{
    throw new Error('a b');
}catch(e){
    yog.log.fatal(e);
}

yog.log.fatal('hah  !!! 张三李四');
