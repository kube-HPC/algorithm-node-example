
var packageJson = require(process.cwd() + '/package.json');
var config = module.exports = {};

config.serviceName = packageJson.name;

config.socket = {
    port: process.env.WORKER_SOCKET_PORT || 9876,
    host: process.env.WORKER_SOCKET_HOST || 'localhost',
    protocol: process.env.WORKER_SOCKET_PROTOCOL || 'ws'
};



