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
        // create ws client and listen to ws://localhost:3000
        this._socket = new WebSocket(this._url);
        this._socket.on('open', () => {
            log.debug(`connected to ${this._url}`, { component });
        });
        this._handleConnectEvents();
        this._handleMessages();
    }

    _handleConnectEvents() {
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
    }

    _handleMessages() {
        this._socket.on('message', (message) => {
            const payload = JSON.parse(message);
            log.debug(`got message ${payload.command}`, { component });
            switch (payload.command) {
                case messages.incoming.initialize:
                    this._initialize(payload);
                    break;
                case messages.incoming.start:
                    this._start();
                    break;
                case messages.incoming.stop:
                    this._stop();
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
        this._input = payload.data.input; // store the input
        this._send(messages.outgoing.initialized); // send ack event
    }

    /**
     * Start algorithm job
     */
    async _start() {
        this._send(messages.outgoing.started); // send ack event
        try {

            // your code goes here...
            const output = await myAlgorithm.process(this._input);  // use the input
            // your code goes here...

            // send response
            this._send(messages.outgoing.done, {
                data: output
            });
        }
        catch (error) {
            this._onError(error); // send error event
        }
    }

    /**
     * Stop algorithm job
     */
    _stop() {
        // your code goes here...
        myAlgorithm.stop();
        // your code goes here...

        this._send(messages.outgoing.stopped); // send ack event
    }

    /**
     * Send response to the worker
     */
    _send(command, data, error) {
        log.debug(`outgoing socket event: ${topic}`, { component });
        try {
            this._socket.send(JSON.stringify({ command, data, error }));
        }
        catch (e) {
            log.error(`error ${e}`, { component });
        }
    }
}

module.exports = new Algorithm();