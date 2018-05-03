const WebSocket = require('ws');
const messages = require('./messages');
const log = require('@hkube/logger').GetLogFromContainer();
const component = require('../common/consts/componentNames').SOCKET;

// require your algorithm
const myAlgorithm = require('./my-algorithm');

class Algorithm {
    constructor() {
        this._socket = null;
        this._url = null;
        this._input = null;
        this._reconnectInterval = 5000;
    }

    async init(options) {
        this._url = `${options.socket.protocol}://${options.socket.host}:${options.socket.port}`;
        log.info(`socket connecting to ${this._url}`, { component });
        this._connect();
    }

    _connect() {
        this._socket = new WebSocket(this._url);
        this._socket.on('open', () => {
            log.debug(`connected to ${this._url}`, { component });
        });
        this._socket.on('close', (code, reason) => {
            switch (code) {
                case 1000:
                    log.debug(`socket normal closed`, { component });
                    break;
                default:
                    this._reconnect();
                    break;
            }
        });
        this._socket.on('error', (e) => {
            switch (e.code) {
                case 'ECONNREFUSED':
                    this._reconnect();
                    break;
                default:
                    log.error(`error ${e}`, { component });
                    break;
            }
        });
        this._handleMessages();
    }

    _handleMessages() {
        this._socket.on('message', (data) => {
            const payload = JSON.parse(data);
            log.debug(`got message ${payload.command}`, { component });
            switch (payload.command) {
                case messages.incoming.initialize:
                    this._initialize(payload);
                    break;
                case messages.incoming.start:
                    this._start(payload);
                    break;
                case messages.incoming.stop:
                    this._stop(payload);
                    break;
                default:
                    log.debug(`unknown message ${payload.command}`, { component });
            }
        });
    }

    _reconnect() {
        log.debug(`socket reconnecting to ${this._url} in ${this._reconnectInterval}ms`, { component });
        this._socket.removeAllListeners();
        setTimeout(() => {
            this._connect();
        }, this._reconnectInterval);
    }

    _onError(error) {
        this._send(messages.outgoing.error, {
            error: {
                code: 'Failed',
                message: `Error: ${error.message || error}`,
                details: error.stackTrace
            }
        });
    }

    /**
     * Initialize algorithm job
     * 
     * @param {any} payload 
     * 
     * @memberOf Algorithm
     */
    _initialize(payload) {
        this._input = payload.data.input;
        this._send(messages.outgoing.initialized);
    }

    /**
     * Start algorithm job
     */
    async _start() {
        this._send(messages.outgoing.started);
        try {

            // your code...
            const output = await myAlgorithm.process(this._input);

            this._send(messages.outgoing.done, {
                data: output
            });
        }
        catch (error) {
            this._onError(error);
        }
    }

    /**
     * Stop algorithm job
     */
    _stop() {
        // your code...
        myAlgorithm.stop();

        this._send(messages.outgoing.stopped);
    }

    /**
     * Send response to the worker
     */
    _send(topic, data, options) {
        log.debug(`outgoing socket event: ${topic}`, { component });
        try {
            this._socket.send(JSON.stringify({
                command: topic,
                ...data
            }), options);
        }
        catch (e) {
            log.error(`error ${e}`, { component });
        }
    }
}

module.exports = new Algorithm();