const socketio = require('socket.io-client');
const messages = require('./messages');
const log = require('@hkube/logger').GetLogFromContainer();
const component = require('../common/consts/componentNames').SOCKET;

// require your algorithm
const myAlgorithm = require('./my-algorithm');

class Algorithm {
    constructor() {
        this._socket = null;
        this._input = {};
    }

    async init(options) {
        this._connect(options);
        this._register();
    }

    _connect(options) {
        const url = `${options.socket.protocol}://${options.socket.host}:${options.socket.port}`;
        log.info(`socket connecting to ${url}`, { component });
        this._socket = socketio(url);
    }

    _register() {
        this._socket.on('connect', () => {
            log.debug(`connected`, { component });
        });
        this._socket.on('disconnect', (reason) => {
            log.debug(`disconnected ${reason}`, { component });
        });
        this._socket.on(messages.incoming.initialize, (event) => {
            log.debug(`incoming socket event: ${event.command}`, { component });
            this._input = event.data.input;
            this._emit(messages.outgoing.initialized);
        });
        this._socket.on(messages.incoming.start, async (event) => {
            log.debug(`incoming socket event: ${event.command}`, { component });
            this._emit(messages.outgoing.started);
            try {

                // your code...
                const output = await myAlgorithm.process(this._input);

                this._emit(messages.outgoing.done, {
                    data: output
                });
            }
            catch (error) {
                this._emit(messages.outgoing.error, {
                    error: {
                        code: 'Failed',
                        message: `Error: ${error.message || error}`,
                        details: error.stackTrace
                    }
                });
            }
        });
        this._socket.on(messages.incoming.stop, (event) => {
            log.debug(`incoming socket event: ${event.command}`, { component });

            // your code...
            myAlgorithm.stop();

            this._emit(messages.outgoing.stopped);
        });
        this._socket.on(messages.incoming.ping, (event) => {
            log.debug(`incoming socket event: ${event.command}`, { component });
            this._emit(messages.outgoing.pong);
        });
    }

    _emit(topic, data) {
        log.debug(`outgoing socket event: ${topic}`, { component });
        this._socket.emit(topic, {
            command: topic,
            ...data
        });
    }
}

module.exports = new Algorithm();