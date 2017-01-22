import IPC from '~/src/ipc-event-emitter'

let ipc = IPC(process)

ipc.on('ping', () => {
    console.log('got "ping", sending "pong"')
    ipc.emit('pong')
})

ipc.pin('ready')
