var _ = require('lodash');

module.exports.wrapExclude = function (exclude, middleware) {
    if (!exclude) {
        return middleware;
    }
    return function (req, res, next) {
        var hit = false;
        if (!_.isArray(exclude)) {
            exclude = [exclude];
        }
        _.forEach(exclude, function (reg) {
            var match = req.path.match(reg);
            if (match && match[0] === req.path) {
                hit = true;
                return false;
            }
        });
        if (hit) {
            next();
        }
        else {
            middleware(req, res, next);
        }
    };
};
