var _ = require('lodash');

module.exports.wrapFilter = function(filter, middleware){
    if (!filter){
        return middleware;
    }
    return function(req, res, next){
        var hit = false;
        if (!_.isArray(filter)){
            filter = [filter];
        }
        _(filter).forEach(function(reg){
            var match = req.path.match(reg);
            console.log(req.path, match);
            if (match && match[0] === req.path){
                hit = true;
                return false;
            }
        });
        if (hit){
            next();
        }else{
            middleware(req, res, next);
        }
    };
};