import { fork } from 'child_process';
import IPC      from '../../src/ipc-event-emitter.js';

let child = fork('./target/examples/src/child.js');
let ipc = IPC(child);

ipc.on('ready', () => {
    console.log('got "ready", sending "ping"');
    ipc.emit('ping');
});

ipc.on('pong', () => {
    console.log('got "pong", disconnecting');
    child.disconnect();
});
