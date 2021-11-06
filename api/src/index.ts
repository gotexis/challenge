import { config as configEnv } from 'dotenv'
import { Server, Socket } from 'socket.io'
import http from 'http'
import { CALL_ACCEPT, CALL_END, CALL_REQUEST, ICECANDIDATE, ID, MSG } from '@starter/common/socket-events'

configEnv()

export const port = process.env.PORT || 4000

const server = http.createServer()
const ioServer = new Server({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

// isolate handler - better for testing.
export const socketIOHandler =
  (io: Server) =>
  (s: Socket): void => {
    // assign id to clients
    s.emit(ID, s.id)

    // relay call from initiator to recipient
    s.on(CALL_REQUEST, ({ offer, recipient, from }) => {
      io.to(recipient).emit(CALL_REQUEST, { offer, from })
    })

    // relay answer back, from recipient to initiator
    s.on(CALL_ACCEPT, ({ answer, recipient, from }) => {
      io.to(from).emit(CALL_ACCEPT, { answer, recipient })
    })

    // relay rejection OR hang up
    s.on(CALL_END, ({ origin, target }) => {
      io.to(target).emit(CALL_END, { origin })
    })

    // allowing ICE's to be exchanged. [RELAY]
    s.on(ICECANDIDATE, ({ target, candidate }) => {
      io.to(target).emit(ICECANDIDATE, { candidate })
    })

    // debug
    s.on(MSG, console.log)
  }

ioServer.on('connection', socketIOHandler(ioServer))

ioServer.attach(server, {
  pingInterval: 10000,
  pingTimeout: 5000,
  cookie: false,
})

server.listen(port, () => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`API started at http://localhost:${port}`)
  }
})
