module.exports.http = {
    middleware: [
        'favicon',
        'compression',
        'responseTime',
        'static',
        'cookieParser',
        'bodyParser',
        'log',
        'ral',
        'views',
        'methodOverride',
        'dispatcher',
        'notFound',
        'error'
    ]
}