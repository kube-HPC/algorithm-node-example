module.exports = {
    outgoing: {
        pong: 'pongMessage',
        initialized: 'initialized',
        started: 'started',
        stopped: 'stopped',
        progress: 'progress',
        error: 'errorMessage',
        done: 'done'

    },
    incoming: {
        ping: 'pingMessage',
        initialize: 'initialize',
        start: 'start',
        cleanup: 'cleanup',
        stop: 'stop'

    }
}