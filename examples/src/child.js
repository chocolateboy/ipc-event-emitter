import IPC from '../../src/ipc-event-emitter.js';

let ipc = IPC(process);

ipc.on('ping', () => {
    console.log('got "ping", sending "pong"');
    ipc.emit('pong');
});

ipc.fix('ready');
