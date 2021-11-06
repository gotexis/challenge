import React, { createContext, useContext, useEffect, useState } from "react"
import { io, Socket } from "socket.io-client"
import { ID, MSG } from "@starter/common/socket-events"

type SocketContext = {
  socket?: Socket
  id?: string
}

export const SocketInitialState: SocketContext = {
  socket: undefined,
  id: undefined
}

export const SocketContext = createContext(SocketInitialState)

export const useSocket = () => useContext(SocketContext)

export const SocketProvider = ({ children }: any) => {
  const [socket, setSocket] = useState(SocketInitialState.socket)
  const [id, setId] = useState(SocketInitialState.id)

  // INIT
  useEffect(() => {
    const s: Socket = io("ws://localhost:4000")

    setSocket(s)

    // receive id assigned by server
    s.on(ID, setId)
    s.on(MSG, console.log)

    // unsubscribe
    return () => {
      s.close()
    }
  }, [])

  return (
    <SocketContext.Provider
      value={{
        ...SocketInitialState,
        socket,
        id
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
