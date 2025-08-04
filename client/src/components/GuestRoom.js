import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import "./Room.css";

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "https://192.168.29.23:5000";

const socket = io(SERVER_URL, {
  secure: true,
  reconnection: true,
  rejectUnauthorized: false,
});

const GuestRoom = () => {
  const [peers, setPeers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [userName, setUserName] = useState("");
  const [roomID, setRoomID] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  
  const peerConfig = {
    iceServers: [
      {
        urls: "turn:0.tcp.eu.ngrok.io:17330", // ← ngrok TCP TURN endpoint
        username: "veuser",                   // ← coturn username
        credential: "vepassword",             // ← coturn password
      },
      {
        urls: "stun:stun.l.google.com:19302",
      },
    ],
  };

  const userVideo = useRef();
  const peersRef = useRef([]);
  const streamRef = useRef();
  const videoRefs = useRef({});

  useEffect(() => {
    const name = prompt("Enter your name");
    const room = prompt("Enter room code");
    setUserName(name);
    setRoomID(room);

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamRef.current = stream;
        if (userVideo.current) userVideo.current.srcObject = stream;

        socket.emit("join-room", { roomId: room, userName: name });

        socket.on("all-users", (users) => {
          const newPeers = [];
          users.forEach((user) => {
            if (user.id === socket.id) return;
            const peer = createPeer(user.id, socket.id, stream);
            peersRef.current.push({ peerID: user.id, peer, userName: user.name });
            newPeers.push({ peerID: user.id, peer, userName: user.name });
          });
          setPeers(newPeers);
          setParticipants(users.map((u) => u.name).filter(n => n !== name));
        });

        socket.on("user-joined", (payload) => {
          if (peersRef.current.some((p) => p.peerID === payload.id)) return;
          const peer = addPeer(payload.signal, payload.id, payload.name, streamRef.current);
          peersRef.current.push({ peerID: payload.id, peer, userName: payload.name });
          setPeers((users) => [...users, { peerID: payload.id, peer, userName: payload.name }]);
          setParticipants((list) => {
            if (!list.includes(payload.name) && payload.name !== name) return [...list, payload.name];
            return list;
          });
        });

        socket.on("receiving-returned-signal", (payload) => {
          const item = peersRef.current.find((p) => p.peerID === payload.id);
          if (item) item.peer.signal(payload.signal);
        });

        socket.on("user-disconnected", (id) => {
          setPeers((users) => users.filter((p) => p.peerID !== id));
          peersRef.current = peersRef.current.filter((p) => p.peerID !== id);
          setParticipants(peersRef.current.map((p) => p.userName));
          delete videoRefs.current[id];
        });

        socket.on("update-participants", (participantsList) => {
          setParticipants(participantsList.filter(n => n !== name));
        });
      })
      .catch(() => alert("Could not access camera/microphone."));

    return () => {
      socket.disconnect();
      peersRef.current.forEach(({ peer }) => peer.destroy());
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const createPeer = (userToSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
      config: peerConfig,
    });

    peer.on("signal", (signal) => {
      socket.emit("sending-signal", { userToSignal, callerID, signal, userName });
    });

    peer.on("stream", (remoteStream) => {
      const videoElem = videoRefs.current[userToSignal];
      if (videoElem) videoElem.srcObject = remoteStream;
    });

    return peer;
  };

  const addPeer = (incomingSignal, callerID, name, stream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
      config: peerConfig,
    });

    peer.on("signal", (signal) => {
      socket.emit("returning-signal", { signal, callerID });
    });

    peer.on("stream", (remoteStream) => {
      const videoElem = videoRefs.current[callerID];
      if (videoElem) videoElem.srcObject = remoteStream;
    });

    peer.signal(incomingSignal);
    return peer;
  };

  const toggleMic = () => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach((track) => (track.enabled = !micOn));
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach((track) => (track.enabled = !camOn));
    setCamOn(!camOn);
  };

  const leaveMeeting = () => {
    peersRef.current.forEach(({ peer }) => peer.destroy());
    peersRef.current = [];
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    socket.disconnect();
    window.location.href = "/";
  };

  return (
    <div className="room-container">
      <header className="room-header">
        <h2 className="logo">
          Ve <span className="gold">Meet</span>
        </h2>
        <div>
          <span>Room: {roomID}</span>
          <span className="username">You: {userName}</span>
        </div>
      </header>

      <main className="video-grid">
        <div className="video-block">
          <video muted ref={userVideo} autoPlay playsInline className="video" />
          <p>{userName} (You)</p>
        </div>
        {peers.map(({ peerID, userName }) => (
          <div className="video-block" key={peerID}>
            <video
              playsInline
              autoPlay
              className="video"
              ref={(el) => {
                if (el) videoRefs.current[peerID] = el;
                else delete videoRefs.current[peerID];
              }}
            />
            <p>{userName}</p>
          </div>
        ))}
      </main>

      <aside className="participants-panel">
        <div>
          <h3>Participants ({participants.length + 1})</h3>
          <ul>
            <li key={userName + "-self"}>{userName} (You)</li>
            {participants.map((pName) => (
              <li key={pName}>{pName}</li>
            ))}
          </ul>
        </div>

        <div className="controls">
          <button className="gold-btn" onClick={toggleMic}>
            {micOn ? "Mute" : "Unmute"}
          </button>
          <button className="gold-btn" onClick={toggleCam}>
            {camOn ? "Video Off" : "Video On"}
          </button>
          <button className="red-btn" onClick={leaveMeeting}>
            Leave
          </button>
        </div>
      </aside>
    </div>
  );
};

export default GuestRoom;
