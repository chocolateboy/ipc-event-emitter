import assert           from 'power-assert';
import ChildProcess     from 'child_process';
import { EventEmitter } from 'events';
import IPC              from '../../src/ipc-event-emitter';
import Promise          from 'bluebird';

const SLEEP = 500;

function child (method, options = {}) {
    let child = ChildProcess.fork('./target/test/src/child.js', [ method ]);
    return IPC(child, options);
}

describe('ipc-event-emitter', () => {
    let called;

    beforeEach(() => {
        called = [];
    });

    it('emits events', async function () {
        this.slow(2000);

        let ipc = child('emit');

        ipc.on('ready', function () {
            assert(this instanceof EventEmitter);
            called.push('pre-ready');
        });

        await Promise.delay(SLEEP);
        await ipc.emit('start');
        await Promise.delay(SLEEP);

        ipc.on('ready', () => {
            called.push('post-ready');
        });

        await Promise.delay(SLEEP);

        assert.deepEqual(called, [ 'pre-ready' ]);
        ipc.process.disconnect();
    });

    it('fixes events', async function () {
        this.slow(2000);

        let ipc = child('fix');

        ipc.on('ready', function () {
            assert(this instanceof EventEmitter);
            called.push('pre-ready');
        });

        await Promise.delay(SLEEP);
        await ipc.emit('start');
        await Promise.delay(SLEEP);

        ipc.on('ready', function () {
            assert(this instanceof EventEmitter);
            called.push('post-ready');
        });

        await Promise.delay(SLEEP);

        assert.deepEqual(called, [ 'pre-ready', 'post-ready' ]);
        ipc.process.disconnect();
    });
});
