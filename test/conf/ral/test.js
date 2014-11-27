module.exports = {
    'SOME_SERVICE': {
        unpack: 'json',
        pack: 'form',
        method: 'POST',
        encoding: 'gbk',
        balance: 'random',
        protocol: 'http',
        retry: 2,
        timeout: 500,
        server: [
            { host: '127.0.0.1', port: 8080}
        ]
    }
};