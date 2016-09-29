import Promise          from 'bluebird'
import str2bool         from 'boolify-string'
import { EventEmitter } from 'events'
import _                from 'lodash'
import semver           from 'semver'

const DEBUG           = str2bool(process.env.IPC_EVENT_EMITTER_DEBUG)
const NODE_GE_4       = semver.gte(process.version, '4.0.0')
const OPTIONS         = { debug: DEBUG }
const SEND_OR_DELIVER = NODE_GE_4 ? 'send' : 'deliver'
const TYPE            = 'ipc-event-emitter'

function isIPCProcess ($process) {
    return _.isFunction($process.send) && _.isFunction($process.on)
}

export class IPCEventEmitter extends EventEmitter {
    constructor ($process, $options = {}) {
        super()

        this._pinned = {}

        if (isIPCProcess($process)) {
            this.process = $process
        } else {
            throw new TypeError(
                `Invalid process; expected Process|ChildProcess, got: ${$process}`,
            )
        }

        let timeout = $options.timeout

        if (timeout) {
            if (_.isNumber(timeout) && timeout > 0) {
                this._timeout = timeout
            } else {
                throw new TypeError(
                    `Invalid timeout; expected number > 0, got: ${timeout}`,
                )
            }
        }

        // register the listener for our IPC messages.
        // we distinguish our messages by the presence
        // of a `type` field with a value of TYPE (defined
        // above) e.g. { type: "ipc-event-emitter" }.
        // our messages come in the following flavours:
        //
        // unpin e.g. { unpin: 'ready' }
        //
        //     remove the named event from the target's
        //     `pinned` event object.
        //
        // pin e.g. { pin: true, emit: [ 'ready' ] }
        //
        //     add the event and its arguments to the target's
        //     `pinned` event object and fire the event in
        //     the target
        //
        // emit e.g. { emit: [ 'downloaded', 'http://example.com/file.txt' ] }
        //
        //     fire the emit event (e.g. `downloaded`) in the target

        $process.on('message', data => {
            if (data && data.type === TYPE) {
                if (data.unpin) {
                    delete this._pinned[data.unpin]
                } else {
                    // XXX make sure we pin before we emit
                    // in case a listener registers another
                    // listener for this event while it's
                    // executing.
                    //
                    // TODO test this
                    if (data.pin) {
                        let [ name, ...args ] = data.emit
                        this._pinned[name] = args
                    }

                    super.emit.apply(this, data.emit)
                }
            }
        })

        let options = _.assign({}, OPTIONS, $options)

        if (options.debug) {
            let EmitLogger = require('emit-logger')
            let name = options.name || process.pid
            let logger = new EmitLogger()

            logger.add($process, { name })
        }
    }

    // emit an event in the same way as `emit`, but emit
    // it in the IPC wrapper in the process at the other
    // end of the IPC channel
    emit (...args) {
        return this._sendAsync({ emit: args })
    }

    // register a sticky event
    //
    // a) emit the event in the IPC wrapper in the
    // target process (i.e. the child/parent process
    // at the other end of the IPC channel)
    //
    // b) the message handler in the target process
    // adds the event name (string) => arguments (array)
    // pair to its local map of pinned events
    pin (name, ...args) {
        if (name === 'error') {
            throw new TypeError('"error" events cannot be pinned')
        }

        return this._sendAsync({ emit: [ name, ...args ], pin: true })
    }

    // unregister a sticky event
    unpin (name) {
        return this._sendAsync({ unpin: name })
    }

    // append a new listener for this event
    addListener (name, listener) {
        super.addListener(name, listener)
        return this._invokeIfPinned(name, listener)
    }

    // prepend a new listener for this event
    prependListener (name, listener) {
        super.prependListener(name, listener)
        return this._invokeIfPinned(name, listener)
    }

    // append a new listener for this event.
    // in theory, this should behave the same as
    // `addListener`. in practice, the two methods
    // may (for some reason) be implemented separately,
    // so rather than assuming or hoping, we just
    // delegate to the specified method
    on (name, listener) {
        super.on(name, listener)
        return this._invokeIfPinned(name, listener)
    }

    // append a new one-time listener for this event
    once (name, listener) {
        return this._invokeIfPinned(name, listener, 'once')
    }

    // prepend a new one-time listener for this event
    prependOnceListener (name, listener) {
        return this._invokeIfPinned(name, listener, 'prependOnceListener')
    }

    // immediately fire a listener registered
    // with `on`, `addListener` &c. if its event
    // has been pinned.
    //
    // in most cases, the listener will already have
    // been registered before this method is called,
    // but for one-shot listeners (`once` and
    // `prependOnceListener`) we either a) fire them once
    // and forget them if the event is pinned (i.e. no
    // need to register them) or b) register them as usual
    // with super.once(...) or super.prependOnceListener(...).
    // To support this, the method to delegate to in
    // the not-pinned case can be passed as an optional
    // third parameter.
    _invokeIfPinned (name, listener, delegate) {
        let pinned = this._pinned[name]

        if (pinned) {
            listener.apply(this, pinned)
        } else if (delegate) {
            // e.g. super.once(name, listener)
            super[delegate](name, listener)
        }

        return this
    }

    // use Node's underlying IPC protocol to send a
    // message between a parent process and a child
    // process
    //
    // # child.js
    // process.send(message) // child -> parent
    //
    // # parent.js
    // child = child_process.fork("child.js")
    // child.send(message)   // parent -> child
    _sendAsync (message) {
        let promise

        // it's safe to mutate this message object as it's
        // always constructed internally
        message.type = TYPE

        if (NODE_GE_4) {
            promise = Promise.fromNode(callback => {
                this.process.send(message, callback)
            })
        } else {
            promise = new Promise((resolve, reject) => {
                process.nextTick(() => {
                    try {
                        resolve(this.process.send(message))
                    } catch (e) {
                        reject(e)
                    }
                })
            })
        }

        let timeout = this._timeout

        if (timeout) {
            return promise.timeout(
                timeout,
                `IPC message took > ${timeout} ms to ${SEND_OR_DELIVER}`
            )
        } else {
            return promise
        }
    }
}

export default function IPC ($process, options = {}) {
    return new IPCEventEmitter($process, options)
}
