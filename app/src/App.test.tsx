import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import App from "./App"
import { BrowserRouter } from "react-router-dom"
import { Phone } from "./pages/phone"
import { io, Socket } from "socket.io-client"
import { Server } from "mock-socket"

// Mock testing utilities that are unavailable in jsdom
class MockRTCPeerConnection {
  createOffer = jest.fn(() => ({ testOffer: 1 }))
  createAnswer = jest.fn(() => ({ testOffer: 1 }))
  addTrack = jest.fn()
  setRemoteDescription = jest.fn()
  setLocalDescription = jest.fn()
}

const navigator = {
  mediaDevices: {
    getUserMedia: () => ({
      getAudioTracks: () => []
    })
  }
} as unknown as Navigator

describe("Testing rendering", () => {
  it("renders uplink pending page when socket is unavailable", () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )
    const el = screen.getByText(/Establishing uplink/i)
    expect(el).toBeInTheDocument()
  })

  it("renders phone page when socket is available", () => {
    const fakeURL = "ws://localhost:8080"
    const client = io(fakeURL)
    const id = "TEST-ID"

    render(<Phone id={id} socket={client} />)
    const callNowButton = screen.getByText(/Call Now/i)
    expect(callNowButton).toBeInTheDocument()
  })
})

describe("Testing connection", () => {
  let client!: Socket
  let clientEmitSpy: jest.SpyInstance
  let mockServer
  const fakeURL = "ws://localhost:8080"
  const id = "TEST-ID"

  beforeAll(async () => {
    mockServer = new Server(fakeURL)

    // Mock Socket IO Client
    client = io(fakeURL)
    clientEmitSpy = jest.spyOn(client, "emit")
  })

  it("should be able to make a simple call", async () => {
    render(<Phone id={id} socket={client} navigator={navigator} RTCPeerConnection={MockRTCPeerConnection as any} />)

    const callNowButton = screen.getByText(/Call Now/i) as HTMLButtonElement
    expect(callNowButton).toBeInTheDocument()

    const recipientInput = document.getElementById("recipient") as any
    expect(recipientInput).toBeInTheDocument()

    fireEvent.change(recipientInput, { target: { value: "something" } })
    fireEvent.input(recipientInput, { target: { value: "something" } })
    expect(recipientInput["value"]).toBe("something")

    callNowButton.click()

    // See that the client actually calls the loader
    await waitFor(() => expect(clientEmitSpy).toHaveBeenCalledTimes(1))

    const calling = screen.getByText(/Calling/i)

    expect(calling).toBeInTheDocument()
  })
})
