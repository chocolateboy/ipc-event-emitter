import assert           from 'power-assert';
import ChildProcess     from 'child_process';
import { EventEmitter } from 'events';
import IPC              from '../../src/ipc-event-emitter';
import Promise          from 'bluebird';

const SLEEP = 100;

function child (...args) {
    let child = ChildProcess.fork('./target/test/src/child.js', args);
    return IPC(child);
}

describe('ipc-event-emitter', () => {
    let called;

    beforeEach(() => {
        called = [];
    });

    it('emits events', async function (done) {
        this.slow(1000);

        let ipc = child('emit');

        ipc.on('ready', function () {
            assert(this instanceof EventEmitter);
            called.push('pre-ready');
        });

        await Promise.delay(SLEEP);

        ipc.emit('start');

        await Promise.delay(SLEEP);

        ipc.on('ready', () => {
            called.push('post-ready');
        });

        await Promise.delay(SLEEP);

        assert.deepEqual(called, [ 'pre-ready' ]);
        ipc.process.disconnect();
        done();
    });

    it('fixes events', async function (done) {
        this.slow(1000);

        let ipc = child('fix');

        ipc.on('ready', function () {
            assert(this instanceof EventEmitter);
            called.push('pre-ready');
        });

        await Promise.delay(SLEEP);

        ipc.emit('start');

        await Promise.delay(SLEEP);

        ipc.on('ready', function () {
            assert(this instanceof EventEmitter);
            called.push('post-ready');
        });

        await Promise.delay(SLEEP);

        assert.deepEqual(called, [ 'pre-ready', 'post-ready' ]);
        ipc.process.disconnect();
        done();
    });
});
