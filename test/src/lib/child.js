import 'source-map-support/register'
import IPC from '~/src/ipc-event-emitter'

let ipc = IPC(process)

ipc.on('emit-ready', (...args) => {
    ipc.emit('ready', ...args)
})

ipc.on('pin-ready', (...args) => {
    ipc.pin('ready', ...args)
})

ipc.on('unpin-ready', () => {
    ipc.unpin('ready')
})

ipc.on('emit-heartbeat', () => {
    ipc.emit('heartbeat')
})

ipc.on('pin-heartbeat', () => {
    ipc.pin('heartbeat')
})
