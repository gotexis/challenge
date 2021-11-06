import React from "react"
import "./index.scss"
import "antd/dist/antd.css"
import { Switch, Route } from "react-router"
import { SocketProvider } from "./hooks/useSocket"
import UplinkedPhone from "./pages/phone"

const App = () => {
  return (
    <SocketProvider>
      <Switch>
        <Route path="/" exact component={UplinkedPhone} />
      </Switch>
    </SocketProvider>
  )
}

export default App
