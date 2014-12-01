'use strict';

module.exports = function(rootPath){
    return function(name){
        var match, path, cache = {}, module;
        if (cache[name]){
            return cache[name];
        }
        match = name.match(/[^\.]+\/(.*)/);
        if(match){
            // format like spa/models/index.js
            path = [rootPath, 'app', name].join('/');
        }else{
            // format like yog-log or ./index.js
            path = name;
        }
        module = require(path);
        cache[name] = module;
        return module;
    };
};