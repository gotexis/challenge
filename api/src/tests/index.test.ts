import { createServer } from 'http'
import { Server } from 'socket.io'
import { io as ioClient, Socket } from 'socket.io-client'
import { socketIOHandler } from '../index'
import { CALL_REQUEST, ID } from '@starter/common/socket-events'

describe('Socket IO Phone Server', () => {
  let client_1: Socket
  let client_2: Socket
  let id_1: string
  let id_2: string
  let io: Server

  beforeAll((done) => {
    const httpServer = createServer()

    io = new Server(httpServer)
    httpServer.listen(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { port } = httpServer.address()

      client_1 = ioClient(`ws://localhost:${port}`, {
        forceNew: true,
      })

      client_2 = ioClient(`ws://localhost:${port}`, {
        forceNew: true,
      })

      io.on('connection', (s) => {
        socketIOHandler(io)(s)
      })

      // Establish two clients
      client_1.on(ID, (id) => {
        id_1 = id
        if (id_1 && id_2) {
          done()
        }
      })
      client_2.on(ID, (id) => {
        id_2 = id
        if (id_1 && id_2) {
          done()
        }
      })
    })
  })

  afterAll(() => {
    io.close()
    client_1.close()
    client_2.close()
  })

  it('should relay a call_request b/t clients', (done) => {
    // Expect a call from client_2
    client_2.once(CALL_REQUEST, ({ offer, from }) => {
      expect({ offer, from }).toEqual({
        offer: {
          offerDetails: 'something',
        },
        from: id_1,
      })
      done()
    })

    // Make a call from client_1
    client_1.emit(CALL_REQUEST, {
      offer: {
        offerDetails: 'something',
      },
      recipient: id_2,
      from: id_1,
    })
  })
})
