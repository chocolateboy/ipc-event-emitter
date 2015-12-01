import _                from 'lodash'
import { EventEmitter } from 'events'
import Promise          from 'bluebird'
import semver           from 'semver'

const DEBUG = process.env.IPC_EVENT_EMITTER_DEBUG == true
const NODE_GE_4 = semver.gte(process.version, '4.0.0')
const OPTIONS = { debug: DEBUG }
const SEND_OR_DELIVER = NODE_GE_4 ? 'send' : 'deliver'
const TYPE = 'ipc-event-emitter'

export class IPCEventEmitter extends EventEmitter {
    constructor ($process, $options = {}) {
        super()

        this.process = $process
        this._fixed = {}
        this._timeout = $options.timeout

        $process.on('message', data => {
            if (data.type && data.type === TYPE) {
                super.emit.apply(this, data.emit)
                if (data.fixed) _.assign(this._fixed, data.fixed)
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

    emit (...args) {
        return this._sendAsync({ type: TYPE, emit: args })
    }

    fix (name, ...args) {
        return this._sendAsync({
            type: TYPE,
            fixed: { [name]: args },
            emit: [ name, ...args ],
        })
    }

    _sendAsync (message) {
        let promise

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

        if (_.isNumber(timeout)) {
            return promise.timeout(
                timeout,
                `IPC message took > ${timeout} ms to ${SEND_OR_DELIVER}`
            )
        } else {
            return promise
        }
    }

    addListener (name, listener, method = 'addListener') {
        let fixed = this._fixed[name]

        if (fixed) {
            listener.apply(this, fixed)
        } else {
            super[method](name, listener)
        }
    }

    // `on` is an alias for `addListener` in node's
    // EventEmitter, but we can't guarantee that for
    // every implementation, so we need to override both
    on (name, listener) {
        return this.addListener(name, listener, 'on')
    }

    once (name, listener) {
        return this.addListener(name, listener, 'once')
    }
}

export default function IPC ($process, options = {}) {
    return new IPCEventEmitter($process, options)
}
