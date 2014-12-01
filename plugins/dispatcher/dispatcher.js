'use strict';

var express = require('express');
var urlparser = require('url');
var debuglog = require('debuglog')('yog/dispatcher');
var fs = require('fs');
var path = require('path');

module.exports = function(options){
    var defaultRouter = options.defaultRouter || 'home';
    var defaultAction = options.defaultAction || 'index';
    var appPath = options.appPath || (path.dirname(require.main.filename) + '/app');
    debuglog('set options appPath [%s], defaultRouter [%s], defaultAction [%s]', appPath, defaultRouter, defaultAction);
    var routers = {};
    var actions = {};

    function baseRouterHandler(req, res, next){
        if (req.__auto_router_failed__ === true){
            next();
            return;
        }
        req.__dispatcher_start_time__ = +new Date();
        var routerName = null;
        if (req.params.router){
            debuglog('trying to get router [%s]', req.params.router);
            routerName = req.params.router;
        }else{
            debuglog('trying to get default router [%s]', defaultRouter);
            routerName = defaultRouter;
        }
        var router = getRouter(routerName);
        if (router === null){
            debuglog('router [%s] is missed, continue', routerName);
            next();
            return;
        }
        debuglog('actually get router [%s]', router.__name__);
        if (router.__name__ === routerName && req.params.router){
            req.url = shiftUrl(req.url);
            debuglog('router is matched, remove router from url [%s]', req.url);
        }
        debuglog('[%s] lookup for user defined router', req.url);
        router(req, res, next);
    }

    function actionHanlder(routerName){
        return function(req, res, next){
            debuglog('user defined router was not found, [%s] lookup for auto dispatcher', req.url);
            var url = urlparser.parse(req.url);
            var urlPath = url.pathname.replace(/^\//, '').replace(/\/$/, '');
            var actionName = null;
            if (urlPath){
                debuglog('trying to get action [%s]', urlPath);
                actionName = urlPath;
            }else{
                debuglog('trying to get default action [%s]', defaultAction);
                actionName = defaultAction;
            }
            var action = getAction(routerName, actionName);
            if (action === null){
                debuglog('action [%s/%s] is missed, continue', routerName, actionName);
                req.__auto_router_failed__ = true;
                next();
                return;
            }
            debuglog('actually get action [%s]', action.__name__);
            if (action.__name__ === actionName && req.params.action){
                req.url = shiftUrl(req.url);
                debuglog('action is matched, remove action from url [%s]', req.url);
            }
            excute(action, req, res, next);
        };
    }

    function shiftUrl(url){
        url = urlparser.parse(url);
        var paths = url.pathname.split(/\//g);
        paths.splice(1, 1);
        return (paths.join('/') || '/') + (url.search || '');
    }

    function getRouter(name){
        name = name || defaultRouter;
        // router cache
        if (routers[name] || routers[name] === null){
            return routers[name];
        }
        if (!/^[\w-]+$/.test(name)){
            return getRouter(defaultRouter);
        }
        // get app router path
        var routerPath;
        try{
            routerPath = [appPath, name, 'router.js'].join('/');
            routerPath = require.resolve(routerPath);
        }catch(e){
            routers[name] = null;
            return null;
        }
        var router = createActionRouter(name, routerPath);
        routers[name] = router;
        return router;
    }

    function getAction(app, name){
        name = name || defaultAction;
        actions[app] = actions[app] || {};
        // router cache
        if (actions[app][name] || actions[app][name] === null){
            return actions[app][name];
        }
        if (!/^(?:[\w\-]+\/)*[\w\-]+\/?$/.test(name)){
            return null;
        }
        // get app router path
        // first lookup for action.js
        var actionPath = [appPath, app, 'action', name + '.js'].join('/');
        if (!fs.existsSync(actionPath)){
            // second lookup for action/index.js
            actionPath = [appPath, app, 'action', name + '/index.js'].join('/');
            if (!fs.existsSync(actionPath)){
                // mismatch action
                var errorMsg = [
                    'missing action [', app, '/', name, '], ',
                    'action loopup path [', [app, 'action', name + '.js'].join('/'), '] or ',
                    '[', [app, 'action', name + '/index.js'].join('/'), ']',
                ];
                actions[app][name] = null;
                return null;
            }
        }
        debuglog('get action file at [%s]', actionPath);
        var action = require(actionPath);
        action.__name__ = name;
        actions[app][name] = action;
        return action;
    }

    function excute(action, req, res, next){
        debuglog(
            'disptacher for [%s] cost [%s] ms',
            req.originalUrl,
            new Date() - req.__dispatcher_start_time__
        );

        var verbAction = action[req.method.toLowerCase()];
        debuglog('start action excution [%s] with method [%s]', action.__name__, req.method);
        if (verbAction){
            if (typeof action === 'function'){
                debuglog('excute action [%s] with default action method', action.__name__);
                action(req, res, function(){
                    debuglog('excute action [%s] with [%s] method action', action.__name__, req.method);
                    verbAction(req, res, next);
                });
            }else{
                debuglog('excute action [%s] with [%s] method action', action.__name__, req.method);
                verbAction(req, res, next);
            }
        }else{
            debuglog('excute action [%s] with default action method', action.__name__);
            action(req, res, next);
        }
    }


    function createActionRouter(routerName, routerPath){
        var router = express.Router();

        // extend router
        router.action = function(actionName){
            return getAction(routerName, actionName);
        };

        // load user defined router
        var customRouter = require(routerPath);
        customRouter(router);

        // add default router ruler
        var hanlder = actionHanlder(routerName);
        router.all('*', hanlder);

        router.__name__ = routerName;
        return router;
    }

    function createBaseRouter(){
        var baseRouter = express.Router();

        baseRouter.all('/:router*', baseRouterHandler);
        baseRouter.all('*', baseRouterHandler);

        return baseRouter;
    }

    return {
        middleware: createBaseRouter(),
        router: getRouter,
        action: function(name){
            var names = name.split(/\//g);
            if (names.length !== 2){
                throw new Error('invalid action name, should be app/action');
            }
            return getRouter(names[0]).action(names[1]);
        }
    };
};