# ipc-event-emitter

[![npm status](http://img.shields.io/npm/v/ipc-event-emitter.svg)](https://www.npmjs.org/package/ipc-event-emitter)
[![build status](https://secure.travis-ci.org/chocolateboy/ipc-event-emitter.svg)](http://travis-ci.org/chocolateboy/ipc-event-emitter)

An EventEmitter wrapper for child processes with support for states (AKA fixed events) and logging

- [INSTALLATION](#installation)
- [USAGE](#usage)
    - [parent](#parent)
    - [child](#child)
- [DESCRIPTION](#description)
- [EXPORTS](#exports)
  - [IPC](#ipc)
- [METHODS](#methods)
  - [fix](#fix)
- [SEE ALSO](#see-also)
- [VERSION](#version)
- [AUTHOR](#author)
- [COPYRIGHT AND LICENSE](#copyright-and-license)

## INSTALLATION

    npm install ipc-event-emitter

## USAGE

#### parent

```javascript
import { fork } from 'child_process';
import IPC      from 'ipc-event-emitter';

let child = fork('./child.js');
let ipc = IPC(child);

ipc.on('ready', () => {
    console.log('got "ready", sending "ping"');
    ipc.emit('ping');
});

ipc.on('pong', () => {
    console.log('got "pong", disconnecting');
    child.disconnect();
});
```

#### child

```javascript
import IPC from 'ipc-event-emitter';

let ipc = IPC(process);

ipc.on('ping', () => {
    console.log('got "ping", sending "pong"');
    ipc.emit('pong');
});

ipc.fix('ready');
```

#### output

    got "ready", sending "ping"
    got "ping", sending "pong"
    got "pong", disconnecting

## DESCRIPTION

This module provides an [EventEmitter](https://nodejs.org/api/events.html) wrapper for child processes, which
eliminates the need to use the
[`child_process.send`](https://nodejs.org/api/child_process.html#child_process_child_send_message_sendhandle_callback)
method to pass values back and forth between parent and child processes.

Instead, values are transparently passed between processes with the standard `emit` method.
Exposing inter-process communication through the standard EventEmitter API makes it easy to pass the wrapper
to code which expects a standard EventEmitter e.g. event promisifcation adapters such as
[event-to-promise](https://www.npmjs.com/package/event-to-promise) work as expected.

## EXPORTS

### IPC

**Signature**: options: Object? -> EventEmitter

Returns an EventEmitter instance which translates `emit` calls to the `send` protocol used for
IPC between parent and child processes.

Otherwise, the wrapper has the same interface and the same behaviour as its base class,
[events.EventEmitter](https://nodejs.org/api/events.html), apart from the additions listed
[below](#methods).

The following options are available:

* ##### debug

    **Type**: boolean, default: `false`

    Enables event logging. Events are logged to the console.
    By default, the emitter is identified by the PID of its process, but this
    can be overridden via the [`name`](#name) option.

    Logging can also be enabled by setting the `IPC_EVENT_EMITTER_DEBUG` environment variable
    to a true value.

* ##### name

    **Type**: string

    If logging is enabled, this value is used to identify the event emitter. If not supplied,
    it defaults to the process's PID.

## METHODS

### fix

**Signature**: event: string, args: ...Any -> None

A "sticky" version of [`emit`](#emit). Listeners registered before this event are notified in
the same way as `emit`. Listeners registered after this event are called immediately with the
supplied arguments.

Fixing an event makes it act like a state rather than a one-off notification. This is useful
for states such as "ready" which are poorly modeled by events.

## SEE ALSO

* [fixed-event](https://www.npmjs.com/package/fixed-event)
* [ipcee](https://www.npmjs.com/package/ipcee)

## VERSION

0.0.1

## AUTHOR

[chocolateboy](mailto:chocolate@cpan.org)

## COPYRIGHT AND LICENSE

Copyright © 2015 by chocolateboy

ipc-event-emitter is free software; you can redistribute it and/or modify it under the
terms of the [Artistic License 2.0](http://www.opensource.org/licenses/artistic-license-2.0.php).
