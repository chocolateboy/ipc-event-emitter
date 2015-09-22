import IPC from '../../src/ipc-event-emitter';

let method = process.argv[2];
let ipc = IPC(process);

ipc.on('start', () => {
    ipc[method]('ready');
});
