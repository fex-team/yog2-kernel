## CHANGELOG

#### 0.3.2 / 2015年06月23日

修复使用 `yog.require` 加载的模块无法热加载的问题

#### 0.3.1 / 2015年06月23日

** 重要 ** 升级 swig 依赖，解决模板异常导致 crash 的问题

#### 0.3.0 / 2015年06月12日

当调用 `yog.dispatcher.router`, `yog.dispatcher.action`  获取不存在的 router 与 action 时，不会返回 null 或提示异常，而是将相应的请求返回404

#### 0.2.7 / 2015年06月12日

修复[yog2-plugin-recv-reload](https://github.com/hefangshi/yog2-plugin-recv-reload) 在全局 `npm link` 时的启动问题

#### 0.2.6 / 2015年05月29日

默认加入[yog2-plugin-recv-reload](https://github.com/hefangshi/yog2-plugin-recv-reload) 插件，无需手动安装即可使用 APP 热更新功能

#### 0.2.5 / 2015年05月28日

修复自动路由 method 转发时，如果请求的 method 并未在 action 中找到时，会返回500错误而非404错误的问题

#### 0.2.4 / 2015年05月15日

提供404请求与500请求的自定义配置 [配置说明](https://github.com/fex-team/yog2-framework-template/blob/master/conf/plugins/http.js#L38-L84)

#### 0.2.3 / 2015年05月08日

修复在设置rootRouter后，app中的`router.js` 会过早引入，可能导致一些全局变量没有赋值就被引用 [8fcd141](https://github.com/fex-team/yog2-kernel/commit/8fcd141c997a7d0a771cdaf271da8289b5380532)
