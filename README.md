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
- [PROPERTIES](#properties)
  - [process](#process)
- [METHODS](#methods)
  - [emit](#emit)
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
import { fork } from 'child_process'
import IPC      from 'ipc-event-emitter'

let child = fork('./child.js')
let ipc = IPC(child)

ipc.on('ready', () => {
    console.log('got "ready", sending "ping"')
    ipc.emit('ping')
})

ipc.on('pong', () => {
    console.log('got "pong", disconnecting')
    child.disconnect()
})
```

#### child

```javascript
import IPC from 'ipc-event-emitter'

let ipc = IPC(process)

ipc.on('ping', () => {
    console.log('got "ping", sending "pong"')
    ipc.emit('pong')
})

ipc.fix('ready')
```

#### output

    got "ready", sending "ping"
    got "ping", sending "pong"
    got "pong", disconnecting

## DESCRIPTION

This module provides an [`EventEmitter`](https://nodejs.org/api/events.html) wrapper for child processes, which eliminates the need to use the [`child_process.send`](https://nodejs.org/api/child_process.html#child_process_child_send_message_sendhandle_callback) method to pass values back and forth between parent and child processes.

Instead, values are passed between processes with the standard `emit` method. Exposing inter-process communication through the standard `EventEmitter` API makes it easy to pass the wrapper to code which expects a standard event emitter e.g. an event logging library such as [emit-logger](https://www.npmjs.com/package/emit-logger) works as expected.

In addition, this module extends the `EventEmitter` API to include support for states i.e. "sticky" events that can be subscribed to *after* they've fired. This ensures events are safely delivered regardless of when listeners are registered, and eliminates a common source of buggy and unpredictable behaviour when coordinating communicating processes.

## EXPORTS

### IPC

```javascript
let ipc = IPC(process, { debug: true })

await ipc.emit('start')
```

**Signature**: (process: [Process](https://nodejs.org/api/process.html) | [ChildProcess](https://nodejs.org/api/child_process.html), options: Object?) → EventEmitter

Takes a process or child process and an optional options object and returns an event emitter which translates `emit` calls to the `send` protocol used for IPC between parent and child processes.

Otherwise, the wrapper has the same interface and the same behaviour as its base class, [`events.EventEmitter`](https://nodejs.org/api/events.html), apart from the differences listed [below](#methods).

The following options are available:

* ##### debug

    **Type**: boolean, default: `false`

    Enables event logging. Events are logged to the console. By default, the emitter is identified by the PID of its process, but this can be overridden via the [`name`](#name) option.

    Logging can also be enabled by setting the `IPC_EVENT_EMITTER_DEBUG` environment variable to a true value.

* ##### name

    **Type**: string

    If logging is enabled, this value is used to identify the event emitter. If not supplied, it defaults to the process's PID.

* ##### timeout

    **Type**: integer

    If an IPC message takes longer than this number of milliseconds to deliver (Node.js < 4.0.0) or send (>= 4.0.0), the promise returned by [`emit`](#emit) or [`fix`](#fix) is rejected. The default value is `undefined` i.e. no time limit.

    Note that it's up to you to perform any cleanup (e.g. disconnecting the relevant process) if a message times out.

## PROPERTIES

### process

```javascript
let ipc = IPC(fork('./child.js'))

ipc.on('complete', () => {
    ipc.process.disconnect()
})
```

**Type**: [Process](https://nodejs.org/api/process.html) | [ChildProcess](https://nodejs.org/api/child_process.html)

The process or child process supplied to the [`IPC`](#ipc) call.

## METHODS

### emit

```javascript
ipc.emit('start')

// or

ipc.emit('start').then(() => {
    console.log('emitted start')
})
```

**Signature**: event: string, args: ...Any → Promise

Emit an IPC event i.e. send a message from a parent process to a child process or vice versa.

The return value is a promise. This is intended to provide a way to smooth over the differences between Node.js < v4.0.0, where `process.send` (and thus `emit` and `fix`) is synchronous, and Node.js >= v4.0.0, where it's asynchronous. Note that on Node.js >= v4.0.0, the promise is resolved when the message has been *sent*, whereas on older versions it's resolved when the message has been *received*.

As a result, only the former guarantee should be relied upon unless the target environment is known to be locked down to 0.x.

The value resolved by the returned promise is unspecified.

### fix

```javascript
ipc.fix('ready')

// or

ipc.fix('ready').then(() => {
    console.log('fixed ready state')
})
```

**Signature**: event: string, args: ...Any → Promise

A "sticky" version of [`emit`](#emit). Listeners registered before this event are notified in the same way as `emit`. Listeners registered after this event are called immediately with the supplied arguments.

Fixing an event makes it act like a state rather than a blink-and-you-miss-it notification. This is useful for states such as "ready" which are poorly modelled by events.

As with `emit`, the value resolved by the returned promise is unspecified.

## SEE ALSO

* [fixed-event](https://www.npmjs.com/package/fixed-event)
* [ipcee](https://www.npmjs.com/package/ipcee)

## VERSION

1.0.0

## AUTHOR

[chocolateboy](mailto:chocolate@cpan.org)

## COPYRIGHT AND LICENSE

Copyright © 2015 by chocolateboy

ipc-event-emitter is free software; you can redistribute it and/or modify it under the terms of the [Artistic License 2.0](http://www.opensource.org/licenses/artistic-license-2.0.php).
