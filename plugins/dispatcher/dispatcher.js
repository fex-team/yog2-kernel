'use strict';

var express = require('express');
var urlparser = require('url');
var debuglog = require('debuglog')('yog/dispatcher');
var fs = require('fs');
var path = require('path');

var VERB = {
    'get': true,
    'post': true,
    'put': true,
    'delete': true,
    'del': true,
    'copy': true,
    'head': true,
    'options': true,
    'purge': true,
    'lock': true,
    'unlock': true,
    'propfind': true,
    'view': true,
    'link': true,
    'unlick': true,
    'patch': true
};

module.exports = function (options) {
    var defaultRouter = options.defaultRouter || 'home';
    var defaultAction = options.defaultAction || 'index';
    var appPath = options.appPath || (path.dirname(require.main.filename) + '/app');
    debuglog('set options appPath [%s], defaultRouter [%s], defaultAction [%s]', appPath, defaultRouter, defaultAction);
    var routers = {};
    var actions = {};
    var emptyRouter = createNotFoundAppRouter();

    function baseRouterHandler(req, res, next) {
        if (req.__autoRouterFailed__ === true) {
            next();
            return;
        }
        var routerName = null;
        if (req.params.router) {
            debuglog('trying to get router [%s]', req.params.router);
            routerName = req.params.router;
        }
        else {
            debuglog('trying to get default router [%s]', defaultRouter);
            routerName = defaultRouter;
        }
        var router = getRouter(routerName);
        if (router === null || router.__isNotFound__) {
            debuglog('router [%s] is missed, continue', routerName);
            next();
            return;
        }
        debuglog('actually get router [%s]', router.__name__);
        if (router.__name__ === routerName && req.params.router) {
            req.url = shiftUrl(req.url);
            req.baseUrl = (req.baseUrl || '') + '/' + routerName;
            debuglog('router is matched, remove router from url [%s]', req.url);
        }
        debuglog('[%s] lookup for user defined router', req.url);
        req.CURRENT_APP = router.__name__;
        router(req, res, next);
    }

    function actionHanlder(routerName) {
        return function (req, res, next) {
            debuglog('user defined router was not found, [%s] lookup for auto dispatcher', req.url);
            var url = urlparser.parse(req.url);
            var urlPath = url.pathname.replace(/^\//, '').replace(/\/$/, '');
            var actionName = null;
            if (urlPath) {
                debuglog('trying to get action [%s]', urlPath);
                actionName = urlPath;
            }
            else {
                debuglog('trying to get default action [%s]', defaultAction);
                actionName = defaultAction;
            }
            var action = getAction(routerName, actionName);
            if (action === null) {
                debuglog('action [%s/%s] is missed, continue', routerName, actionName);
                req.__autoRouterFailed__ = true;
                next();
                return;
            }
            debuglog('actually get action [%s]', action.__name__);
            if (action.__name__ === actionName && req.params.action) {
                req.url = shiftUrl(req.url);
                req.baseUrl = (req.baseUrl || '') + '/' + actionName;                
                debuglog('action is matched, remove action from url [%s]', req.url);
            }
            action(req, res, next);
        };
    }

    function shiftUrl(url) {
        url = urlparser.parse(url);
        var paths = url.pathname.split(/\//g);
        paths.splice(1, 1);
        return (paths.join('/') || '/') + (url.search || '');
    }

    function getRouter(name) {
        name = name || defaultRouter;
        // router cache
        if (routers[name] || routers[name] === null) {
            return routers[name];
        }
        if (!/^[\w-]+$/.test(name)) {
            return getRouter(defaultRouter);
        }
        // get app router path
        var routerPath;
        try {
            routerPath = [appPath, name, 'router.js'].join('/');
            routerPath = require.resolve(routerPath);
        }
        catch (e) {
            routers[name] = emptyRouter;
            return emptyRouter;
        }
        var router = createActionRouter(name, routerPath);
        routers[name] = router;
        return router;
    }

    function getAction(app, name) {
        name = name || defaultAction;
        actions[app] = actions[app] || {};
        // router cache
        if (actions[app][name] || actions[app][name] === null) {
            return actions[app][name];
        }
        if (!/^(?:[\w\-]+\/)*[\w\-]+\/?$/.test(name)) {
            return null;
        }
        // get app router path
        // first lookup for action.js
        var actionPath = [appPath, app, 'action', name + '.js'].join('/');
        if (!fs.existsSync(actionPath)) {
            // second lookup for action/index.js
            actionPath = [appPath, app, 'action', name + '/index.js'].join('/');
            if (!fs.existsSync(actionPath)) {
                // mismatch action
                actions[app][name] = null;
                return null;
            }
        }
        debuglog('get action file at [%s]', actionPath);
        var fn = require(actionPath);
        // typescript compliant
        var action = fn.default || fn;
        if (fn.default) {
            for (var key in fn) {
                if (fn.hasOwnProperty(key) && key !== 'default') {
                    action[key] = fn[key];
                }
            }
        }
        // wrap for async/await
        var asyncAction = wrapAsyncFunction(action);
        asyncAction.__name__ = name;
        asyncAction = wrapExcute(asyncAction);
        actions[app][name] = asyncAction;
        return asyncAction;
    }

    function wrapExcute(action) {
        var excuteFn = function (req, res, next) {
            excute(action, req, res, next);
        };
        for (var key in action) {
            if (action.hasOwnProperty(key)) {
                excuteFn[key] = action[key];
            }
        }
        return excuteFn;
    }

    /**
     * warp a action method to catch async error
     * @param  {Function} fn [description]
     * @return {[type]}      [description]
     */
    function wrapAsyncFunction(fn, isSubAction) {
        if (!fn || fn.__asyncWrapped__) {
            return fn;
        }
        var wrapedFn = fn;
        if (typeof fn === 'function') {
            wrapedFn = function asyncWrap(req, res, next) {
                var maybePromise = fn(req, res, next);
                if (maybePromise && maybePromise.catch && typeof maybePromise.catch === 'function') {
                    maybePromise.catch(next);
                }
            };
        }
        for (var key in fn) {
            if (fn.hasOwnProperty(key)) {
                if (!isSubAction && VERB[key.toLowerCase()]) {
                    // 仅在顶级Action中自动寻找VERB Action进行异步包裹
                    wrapedFn[key] = wrapAsyncFunction(fn[key], true);
                } else {
                    // 其余对象仅复制
                    wrapedFn[key] = fn[key];
                }
            }
        }
        wrapedFn.__asyncWrapped__ = true;
        return wrapedFn;
    }

    function excute(action, req, res, next) {
        debuglog(
            'disptacher for [%s] cost [%s] ms',
            req.originalUrl,
            new Date() - req.__dispatcherStartTime__
        );
        var method = req.method.toLowerCase();
        var verbAction = action[method];
        // use del as delete alias
        if (method === 'delete' && !verbAction) {
            verbAction = action.del;
        }
        debuglog('start action excution [%s] with method [%s]', action.__name__, req.method);
        if (verbAction && typeof verbAction === 'function') {
            if (typeof action === 'function') {
                debuglog('excute action [%s] with default action method', action.__name__);
                action(req, res, function () {
                    debuglog('excute action [%s] with [%s] method action', action.__name__, req.method);
                    verbAction(req, res, next);
                });
            }
            else {
                debuglog('excute action [%s] with [%s] method action', action.__name__, req.method);
                verbAction(req, res, next);
            }
        }
        else {
            if (typeof action === 'function') {
                debuglog('excute action [%s] with default action method', action.__name__);
                action(req, res, next);
            }
            else {
                next();
            }
        }
    }


    function createActionRouter(routerName, routerPath) {
        var router = new express.Router();

        // extend router
        router.action = function (actionName) {
            return getAction(routerName, actionName);
        };
        // support wrap raw async fn
        router.wrapAsync = function (fn) {
            return wrapAsyncFunction(fn, true);
        };
        // load user defined router
        var customRouter = require(routerPath);
        // typescript compliant
        customRouter = customRouter.default || customRouter;
        customRouter(router);

        // add default router ruler
        var hanlder = actionHanlder(routerName);
        router.all('*', hanlder);

        router.__name__ = routerName;
        return router;
    }

    var rootRouter = new express.Router();
    var rootRouterInjector = null;
    // lazy inject root router to prevent load router.js too early
    var isInjected = false;

    function createBaseRouter(injector) {
        var baseRouter = new express.Router();
        rootRouterInjector = injector;
        baseRouter.use(function (req, res, next) {
            req.__dispatcherStartTime__ = +new Date();
            if (!isInjected) {
                rootRouterInjector(rootRouter);
                isInjected = true;
            }
            rootRouter(req, res, next);
        });
        baseRouter.all('/:router*', baseRouterHandler);
        baseRouter.all('*', baseRouterHandler);

        return baseRouter;
    }

    function createNotFoundAppRouter() {
        var router = new express.Router();

        // action will go next directly
        router.action = function () {
            return function (req, res, next) {
                next();
            };
        };

        router.__isNotFound__ = true;

        return router;
    }

    return {
        cleanCache: function () {
            routers = {};
            actions = {};
            // update root router
            rootRouter = new express.Router();
            isInjected = false;
        },
        middleware: createBaseRouter,
        router: getRouter,
        action: function (name) {
            var names = name.split(/\//g);
            if (names.length < 2) {
                throw new Error('invalid action name, should be app/action');
            }
            var router = names.shift();
            var action = names.join('/');
            return getRouter(router).action(action);
        }
    };
};
