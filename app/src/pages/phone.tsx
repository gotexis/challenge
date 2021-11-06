import React, { useCallback, useEffect, useRef, useState } from "react"
import { Button, Input, Layout, Space } from "antd"
import { PhoneOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons"
import { CALL_ACCEPT, CALL_END, CALL_REQUEST, ICECANDIDATE, ID, MSG } from "@starter/common/socket-events"
import { useSocket } from "../hooks/useSocket"
import { Socket } from "socket.io-client"

// polyfills the RTC for increased compatibility across browsers
// import adapter from "webrtc-adapter"
// adapter

const configuration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }

export const Phone = ({
  id,
  socket,
  navigator = window.navigator,
  RTCPeerConnection = window.RTCPeerConnection
}: {
  id: string
  socket: Socket
  navigator?: Navigator
  RTCPeerConnection?: typeof window.RTCPeerConnection
}) => {
  // target caller# input
  const [recipientInput, setRecipientInput] = useState<string>()

  // Main states - PENDING CALL / ACTIVE CALL
  const [activeCall, setActiveCall] = useState<{ with: string }>()
  const [pendingIncomingCall, setPendingIncomingCall] = useState<{ offer: RTCSessionDescription; from: string }>()

  const pc = useRef<RTCPeerConnection>()
  const remoteStreamRef = useRef<HTMLAudioElement>(null)
  const [localStreamRef, setLocalStreamRef] = useState<MediaStream>()

  const [outgoingCallId, setOutgoingCallId] = useState<string>()

  // socket event handlers
  useEffect(() => {
    // got called
    socket.on(CALL_REQUEST, ({ offer, from }) => {
      setPendingIncomingCall({ offer, from })
    })

    // recipient accepts the call
    socket.on(CALL_ACCEPT, async ({ answer, recipient }) => {
      const remoteDesc = new RTCSessionDescription(answer)
      setActiveCall({ with: recipient })

      if (!pc.current?.remoteDescription) await pc.current?.setRemoteDescription(remoteDesc)
    })

    // allowing ICE's to be exchanged. [RECEIVE]
    // referring to https://webrtc.org/getting-started/peer-connections
    socket.on(ICECANDIDATE, async ({ candidate }) => {
      await pc.current?.addIceCandidate(candidate)
    })
  }, [])

  // ADD ADDITIONAL HANdLERS AFTER PEER-CONNECTION IS READY
  useEffect(() => {
    if (!pc.current) return

    // allowing ICE's to be exchanged. SEND
    // referring to https://webrtc.org/getting-started/peer-connections
    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit(ICECANDIDATE, { target: activeCall?.with, candidate: event.candidate })
      }
    }

    pc.current.ontrack = ({ track }) => {
      const rs = new MediaStream()
      rs?.addTrack(track)
      // setRemoteStream(rs)

      if (remoteStreamRef.current) {
        remoteStreamRef.current.srcObject = rs
      }
    }

    return () => {
      localStreamRef?.getAudioTracks().forEach((track) => {
        track.stop()
      })
    }
  }, [pc.current])

  // ==========================================================
  // ==================== METHODS =============================
  // ==========================================================

  const makeCall = async () => {
    // prepare pc
    const peerConnection = new RTCPeerConnection(configuration)
    pc.current = peerConnection

    // open up local stream
    const localStream = await navigator.mediaDevices.getUserMedia({ audio: true })

    localStream.getAudioTracks().forEach((track) => {
      peerConnection.addTrack(track)
    })
    setLocalStreamRef(localStream)

    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true
    })

    await peerConnection.setLocalDescription(offer)

    setOutgoingCallId(recipientInput)

    socket.emit(CALL_REQUEST, {
      recipient: recipientInput,
      offer,
      from: id
    })
  }

  const answerCall = async () => {
    if (!pendingIncomingCall) return

    setActiveCall({ with: pendingIncomingCall.from })

    const peerConnection = new RTCPeerConnection(configuration)
    pc.current = peerConnection

    // open up local stream
    const localStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    setLocalStreamRef(localStream)
    localStream.getAudioTracks().forEach((track) => {
      peerConnection.addTrack(track)
    })

    await pc.current.setRemoteDescription(new RTCSessionDescription(pendingIncomingCall.offer))
    const answer = await pc.current.createAnswer()
    await pc.current.setLocalDescription(answer)

    await socket.emit(CALL_ACCEPT, {
      from: pendingIncomingCall.from, // relay the msg back to sender
      recipient: id,
      answer
    })
  }

  const endOrRejectCall = (isOrigin: boolean) => {
    // reset
    setActiveCall(undefined)
    setOutgoingCallId(undefined)
    setPendingIncomingCall(undefined)
    setRecipientInput(undefined)

    pc.current?.close()
    pc.current = undefined
    localStreamRef?.getAudioTracks().forEach((track) => {
      track.stop()
    })

    if (!pendingIncomingCall && !outgoingCallId) {
      // not making any calls
      return
    }

    // used by both originator and target for this action, only need to emit to socket if the origin
    if (!isOrigin) return
    socket.emit(CALL_END, {
      origin: id,
      target: pendingIncomingCall ? pendingIncomingCall.from : outgoingCallId
    })
  }

  // END CALL callback + effect
  // Extracting to useCallback - ALLOWING LISTENER ACCESS TO REACT STATE
  const endCallCb = useCallback(
    ({ origin }: { origin: string }) => {
      // [SECURITY CHECK]
      // reject command origin must match call peer.
      // If so, clear the state.
      if (origin === outgoingCallId || origin === pendingIncomingCall?.from || origin === activeCall?.with) {
        endOrRejectCall(false)
      }
    },
    [outgoingCallId, pendingIncomingCall, activeCall]
  )

  useEffect(() => {
    // end OR reject
    socket.on(CALL_END, endCallCb)
  }, [endCallCb])

  // ================================================
  // Main thing to render
  // ================================================

  // 1 --------------- DEFAULT dialer STATE ----------
  let currentStatus = (
    <Space direction="vertical">
      <Input addonBefore="Your number" disabled value={id} />
      <Input
        id={"recipient"}
        addonBefore="Recipient"
        value={recipientInput}
        disabled={Boolean(outgoingCallId)}
        onChange={(e) => setRecipientInput(e.target.value)}
      />
      <Button
        type="primary"
        onClick={makeCall}
        disabled={Boolean(outgoingCallId)}
        icon={<PhoneOutlined />}
        style={{ width: "100%" }}
      >
        {outgoingCallId ? "Calling..." : "Call Now"}
      </Button>
      {outgoingCallId && (
        <Button danger onClick={() => endOrRejectCall(true)} icon={<CloseOutlined />} style={{ width: "100%" }}>
          Cancel
        </Button>
      )}
    </Space>
  )

  // 2 --------------- BEING CALLED STATE ---------------
  if (pendingIncomingCall) {
    currentStatus = (
      <Space direction="vertical">
        Incoming call from {pendingIncomingCall.from}
        <Space style={{ width: "100%" }}>
          <Button type="primary" onClick={answerCall} icon={<CheckOutlined />}>
            Accept
          </Button>
          <Button danger onClick={() => endOrRejectCall(true)} icon={<CloseOutlined />}>
            Decline
          </Button>
        </Space>
      </Space>
    )
  }

  // 3 --------------- ACTIVE CALL STATE ---------------
  if (activeCall) {
    currentStatus = (
      <Space direction="vertical">
        In a call with {activeCall.with}
        <Button danger onClick={() => endOrRejectCall(true)} icon={<CloseOutlined />}>
          End call
        </Button>
      </Space>
    )
  }

  return (
    <Layout
      style={{
        maxWidth: 380,
        justifySelf: "center",
        marginLeft: "auto",
        marginRight: "auto",
        padding: 10,
        minHeight: "100%"
      }}
    >
      <audio ref={remoteStreamRef} autoPlay playsInline />
      <Layout.Content style={{ flexDirection: "column", display: "flex", justifyContent: "center" }}>
        {currentStatus}
      </Layout.Content>
    </Layout>
  )
}

// We make sure sockets are available before all else,
// so that we dont have to cater for socket being unavailable in every function and renders.
const UplinkedPhone = () => {
  const { id, socket } = useSocket()
  if (!socket || !id) return <div>Establishing uplink...</div>
  return <Phone id={id} socket={socket} />
}

export default UplinkedPhone
