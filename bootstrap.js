const configIt = require('@hkube/config');
const Logger = require('@hkube/logger');
const component = require('./common/consts/componentNames').MAIN;
let log;

const modules = [
    './lib/algorithm'
];

class Bootstrap {
    async init() {
        try {
            const { main, logger } = configIt.load();
            this._handleErrors();

            log = new Logger(main.serviceName, logger);
            log.info('running application in ' + configIt.env() + ' environment', { component });
            await Promise.all(modules.map(m => require(m).init(main)));
            return main;
        }
        catch (error) {
            this._onInitFailed(new Error(`unable to start application. ${error.message}`));
        }
    }

    _onInitFailed(error) {
        if (log) {
            log.error(error.message, { component }, error);
            log.error(error);
        }
        else {
            console.error(error.message);
            console.error(error);
        }
        process.exit(1);
    }

    _handleErrors() {
        process.on('exit', (code) => {
            log.info('exit' + (code ? ' code ' + code : ''), { component });
        });
        process.on('SIGINT', () => {
            log.info('SIGINT', { component });
            process.exit(1);
        });
        process.on('SIGTERM', () => {
            log.info('SIGTERM', { component });
            process.exit(1);
        });
        process.on('unhandledRejection', (error) => {
            log.error('unhandledRejection: ' + error.message, { component }, error);
        });
        process.on('uncaughtException', (error) => {
            log.error('uncaughtException: ' + error.message, { component }, error);
            process.exit(1);
        });
    }
}

module.exports = new Bootstrap();

