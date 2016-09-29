import IPC, { IPCEventEmitter } from '../../../src/ipc-event-emitter'
import Promise                  from 'bluebird'
import { fork }                 from 'child_process'
import { EventEmitter }         from 'events'
import assert                   from 'power-assert'

const ARGS  = [ 'foo', 42 ]
const SLEEP = 500
const SLOW  = SLEEP * 10

// fork a child process, wrap it in an IPCEventEmitter, and return the wrapper
function child (options = {}) {
    let child = fork('./target/test/src/lib/child.js')
    return IPC(child, options)
}

let called, ipc

beforeEach(function () {
    called = {}
    ipc = child()
})

afterEach(function () {
    ipc.process.disconnect()
})

function assertIsIpcEventEmitter (value, name = '`this`') {
    assert(
        value instanceof IPCEventEmitter,
        `${name} is an instance of IPCEventEmitter`
    )

    assert(
        value instanceof EventEmitter,
        `${name} is an instance of EventEmitter`
    )
}

// register listeners after an event has been pinned, then re-emit or
// re-pin the event and confirm that the `on` listener is called again,
// and that the `once` listeners aren't called again
async function assertOnceOK (event, want) {
    ipc.on('ready', function (...args) {
        ipc.emit(`pin-heartbeat`)
    })

    // instruct the child to pin the ready event
    await ipc.emit('pin-ready', ...ARGS)

    await Promise.delay(SLEEP)

    {
        let count = 1
        ipc.on('heartbeat', function () {
            called[`on-heartbeat (${count++})`] = true
        })
    }

    {
        let count = 1
        ipc.once('heartbeat', function () {
            called[`once-heartbeat (${count++})`] = true
        })
    }

    {
        let count = 1
        ipc.prependOnceListener('heartbeat', function () {
            called[`prepend-once-heartbeat (${count++})`] = true
        })
    }

    await Promise.delay(SLEEP)

    ipc.emit(`${event}-heartbeat`)

    await Promise.delay(SLEEP)

    assert.deepEqual(called, want)
}

describe('ipc-event-emitter', function () {
    this.slow(SLOW)

    it('returns an instance of IPCEventEmitter and EventEmitter', function () {
        assertIsIpcEventEmitter(ipc, 'IPC(...)')
    })

    it('emits events without arguments', async function () {
        // register ready-listeners before the event has fired
        ipc.on('ready', function (...args) {
            assertIsIpcEventEmitter(this)
            called['registered before ready (1)'] = args
        })

        ipc.on('ready', function (...args) {
            called['registered before ready (2)'] = args
        })

        await Promise.delay(SLEEP)

        // instruct the child to emit the ready event
        await ipc.emit('emit-ready')

        await Promise.delay(SLEEP)

        // register ready-listeners after the event has fired
        ipc.on('ready', (...args) => {
            called['registered after ready (1)'] = args
        })

        ipc.on('ready', (...args) => {
            called['registered after ready (2)'] = args
        })

        await Promise.delay(SLEEP)

        // confirm no args were passed to the pre-ready listeners
        // confirm the post-ready listeners have not been called
        assert.deepEqual(called, {
            'registered before ready (1)': [],
            'registered before ready (2)': [],
        })
    })

    it('emits events with arguments', async function () {
        // register ready-listeners before the event has fired
        ipc.on('ready', function (...args) {
            called['registered before ready (1)'] = args
        })

        ipc.on('ready', function (...args) {
            called['registered before ready (2)'] = args
        })

        await Promise.delay(SLEEP)

        // instruct the child to emit the ready event
        await ipc.emit('emit-ready', ...ARGS)

        await Promise.delay(SLEEP)

        // register ready-listeners after the event has fired
        ipc.on('ready', (...args) => {
            called['registered after ready (1)'] = args
        })

        ipc.on('ready', (...args) => {
            called['registered after ready (2)'] = args
        })

        await Promise.delay(SLEEP)

        // confirm args were passed to the pre-ready listeners
        // confirm the post-ready listeners have not been called
        assert.deepEqual(called, {
            'registered before ready (1)': ARGS,
            'registered before ready (2)': ARGS,
        })
    })

    it('pins events without arguments', async function () {
        // register ready-listeners before the event has fired
        ipc.on('ready', function (...args) {
            called['registered before ready (1)'] = args
        })

        ipc.on('ready', function (...args) {
            called['registered before ready (2)'] = args
        })

        await Promise.delay(SLEEP)

        // instruct the child to pin the ready event
        await ipc.emit('pin-ready')

        await Promise.delay(SLEEP)

        // register ready-listeners after the event has fired
        ipc.on('ready', (...args) => {
            called['registered after ready (1)'] = args
        })

        ipc.on('ready', (...args) => {
            called['registered after ready (2)'] = args
        })

        await Promise.delay(SLEEP)

        // confirm no args were passed to the pre-ready listeners
        // confirm the post-ready listeners have been called
        assert.deepEqual(called, {
            'registered before ready (1)': [],
            'registered before ready (2)': [],
            'registered after ready (1)':  [],
            'registered after ready (2)':  [],
        })
    })

    it('pins events with arguments', async function () {
        // register ready-listeners before the event has fired
        ipc.on('ready', function (...args) {
            called['registered before ready (1)'] = args
        })

        ipc.on('ready', function (...args) {
            called['registered before ready (2)'] = args
        })

        await Promise.delay(SLEEP)

        // instruct the child to pin the ready event
        await ipc.emit('pin-ready', ...ARGS)

        await Promise.delay(SLEEP)

        // register ready-listeners after the event has fired
        ipc.on('ready', (...args) => {
            called['registered after ready (1)'] = args
        })

        ipc.on('ready', (...args) => {
            called['registered after ready (2)'] = args
        })

        await Promise.delay(SLEEP)

        // confirm args were passed to the pre-ready listeners
        // confirm the post-ready listeners have been called
        assert.deepEqual(called, {
            'registered before ready (1)': ARGS,
            'registered before ready (2)': ARGS,
            'registered after ready (1)':  ARGS,
            'registered after ready (2)':  ARGS,
        })
    })

    it('pin + emit handles `on` and `once` listeners correctly', function () {
        return assertOnceOK('emit', {
            'on-heartbeat (1)': true,
            'once-heartbeat (1)': true,
            'prepend-once-heartbeat (1)': true,
            'on-heartbeat (2)': true,
        })
    })

    it('pin + pin handles `on` and `once` listeners correctly', function () {
        return assertOnceOK('pin', {
            'on-heartbeat (1)': true,
            'once-heartbeat (1)': true,
            'prepend-once-heartbeat (1)': true,
            'on-heartbeat (2)': true,
        })
    })

    it('unpins events', async function () {
        this.slow(SLOW * 6)

        // register ready-listeners before the event has fired
        ipc.on('ready', function (...args) {
            called['registered before ready (1)'] = args
        })

        ipc.on('ready', function (...args) {
            called['registered before ready (2)'] = args
        })

        await Promise.delay(SLEEP)

        // instruct the child to pin the ready event
        await ipc.emit('pin-ready', ...ARGS)

        await Promise.delay(SLEEP)

        // register ready-listeners after the event has fired
        ipc.on('ready', (...args) => {
            called['registered after ready (1)'] = args
        })

        ipc.on('ready', (...args) => {
            called['registered after ready (2)'] = args
        })

        await Promise.delay(SLEEP)

        // instruct the child to unpin the ready event
        await ipc.emit('unpin-ready')

        await Promise.delay(SLEEP)

        // register ready-listeners after the event has been unpinned
        ipc.on('ready', (...args) => {
            called['registered after ready (3)'] = args
        })

        ipc.on('ready', (...args) => {
            called['registered after ready (4)'] = args
        })

        await Promise.delay(SLEEP)

        // confirm the post-ready listeners have not been called
        assert.deepEqual(called, {
            'registered before ready (1)': ARGS,
            'registered before ready (2)': ARGS,
            'registered after ready (1)':  ARGS,
            'registered after ready (2)':  ARGS,
        })

        await Promise.delay(SLEEP)

        // confirm the post-unpinned listeners still respond to the event
        ipc.emit('emit-ready', ...ARGS)

        await Promise.delay(SLEEP)

        assert.deepEqual(called, {
            'registered before ready (1)': ARGS,
            'registered before ready (2)': ARGS,
            'registered after ready (1)':  ARGS,
            'registered after ready (2)':  ARGS,
            'registered after ready (3)':  ARGS,
            'registered after ready (4)':  ARGS,
        })
    })
})
