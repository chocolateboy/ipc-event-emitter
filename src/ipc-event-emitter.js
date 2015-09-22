import _                from 'lodash';
import { EventEmitter } from 'events';

const TYPE = 'ipc-event-emitter';

const OPTIONS = {
    debug: process.env.IPC_EVENT_EMITTER_DEBUG
};

export class IPCEventEmitter extends EventEmitter {
    constructor ($process, $options = {}) {
        super();
        this.process = $process;
        this._fixed = {};

        $process.on('message', data => {
            if (data.type && data.type === TYPE) {
                super.emit.apply(this, data.emit);
                if (data.fixed) _.assign(this._fixed, data.fixed);
            }
        });

        let options = _.assign({}, OPTIONS, $options);

        if (options.debug) {
            let EmitLogger = require('emit-logger');
            let name = options.name || process.pid;
            let logger = new EmitLogger(name, { name });

            logger.add($process);
        }
    }

    emit (...args) {
        this.process.send({ type: TYPE, emit: args });
    }

    fix (name, ...args) {
        this.process.send({
            type: TYPE,
            fixed: { [name]: args },
            emit: [ name, ...args ],
        });
    }

    addListener (name, listener, method = 'addListener') {
        let fixed = this._fixed[name];

        if (fixed) {
            listener.apply(this, fixed);
        } else {
            super[method](name, listener);
        }
    }

    // `on` is an alias for `addListener` in node's
    // EventEmitter, but we can't guarantee that for
    // every implementation, so we need to override both
    on (name, listener) {
        return this.addListener(name, listener, 'on');
    }

    once (name, listener) {
        return this.addListener(name, listener, 'once');
    }
}

export default function IPC ($process, options = {}) {
    return new IPCEventEmitter($process, options);
}
