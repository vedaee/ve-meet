// GuestRoom.js – Full Final Version with Fullscreen Host Video Toggle and Hover Buttons

import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import "./GuestRoom.css";

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
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenSharerID, setScreenSharerID] = useState(null);
  const [hostID, setHostID] = useState(null); // NEW: host peer ID state

  const userVideo = useRef();
  const peersRef = useRef([]);
  const streamRef = useRef();
  const videoRefs = useRef({});
  const screenTrackRef = useRef();

  useEffect(() => {
    const name = prompt("Enter your name");
    const room = prompt("Enter room code");
    setUserName(name);
    setRoomID(room);

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamRef.current = stream;
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }

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
          setParticipants(users.map((u) => u.name));

          // Set Host ID as first peer in list (adjust if your host identification differs)
          if (newPeers.length > 0) setHostID(newPeers[0].peerID);
        });

        socket.on("user-joined", (payload) => {
          const peer = addPeer(payload.signal, payload.id, payload.name, stream);
          peersRef.current.push({ peerID: payload.id, peer, userName: payload.name });
          setPeers((users) => [...users, { peerID: payload.id, peer, userName: payload.name }]);
          setParticipants((list) => {
            if (!list.includes(payload.name)) return [...list, payload.name];
            return list;
          });
        });

        socket.on("receiving-returned-signal", (payload) => {
          const item = peersRef.current.find((p) => p.peerID === payload.id);
          if (item && item.peer) {
            item.peer.signal(payload.signal);
          }
        });

        socket.on("user-disconnected", (id) => {
          setPeers((users) => users.filter((p) => p.peerID !== id));
          peersRef.current = peersRef.current.filter((p) => p.peerID !== id);
          setParticipants(peersRef.current.map((p) => p.userName));
          delete videoRefs.current[id];
          if (screenSharerID === id) setScreenSharerID(null);
          if (hostID === id) setHostID(null); // Clear hostID if host disconnects
        });

        // Added listener for participant updates
        socket.on("update-participants", (participantsList) => {
          setParticipants(participantsList);
        });
      })
      .catch((err) => {
        console.error("Media Device Error:", err);
        alert("Could not access camera/microphone.");
      });

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
    });

    peer.on("signal", (signal) => {
      socket.emit("sending-signal", { userToSignal, callerID, signal });
    });

    peer.on("stream", (remoteStream) => {
      const videoElem = videoRefs.current[userToSignal];
      if (videoElem) {
        videoElem.srcObject = remoteStream;
      }

      // FULLSCREEN SHARE MOD: Detect if remote stream is screen share
      const trackLabel = remoteStream.getVideoTracks()?.[0]?.label || "";
      if (trackLabel.toLowerCase().includes("screen")) {
        setScreenSharerID(userToSignal);
      }
    });

    peer.on("error", (err) => console.error("Peer error (createPeer):", err));
    return peer;
  };

  const addPeer = (incomingSignal, callerId, name, stream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      socket.emit("returning-signal", { signal, callerID: callerId });
    });

    peer.on("stream", (remoteStream) => {
      const videoElem = videoRefs.current[callerId];
      if (videoElem) {
        videoElem.srcObject = remoteStream;
      }

      // FULLSCREEN SHARE MOD: Detect if remote stream is screen share
      const trackLabel = remoteStream.getVideoTracks()?.[0]?.label || "";
      if (trackLabel.toLowerCase().includes("screen")) {
        setScreenSharerID(callerId);
      }
    });

    peer.on("error", (err) => console.error("Peer error (addPeer):", err));
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

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        Object.values(peersRef.current).forEach(({ peer }) => {
          const sender = peer._pc.getSenders().find((s) => s.track.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        });

        if (userVideo.current) userVideo.current.srcObject = screenStream;
        setIsScreenSharing(true);
        screenTrack.onended = stopScreenShare;
      } catch (err) {
        console.error("Error sharing screen:", err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = async () => {
    if (screenTrackRef.current) screenTrackRef.current.stop();
    const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    streamRef.current = cameraStream;
    Object.values(peersRef.current).forEach(({ peer }) => {
      const sender = peer._pc.getSenders().find((s) => s.track.kind === "video");
      if (sender) sender.replaceTrack(cameraStream.getVideoTracks()[0]);
    });
    if (userVideo.current) userVideo.current.srcObject = cameraStream;
    setIsScreenSharing(false);
  };

  // FULLSCREEN SHARE MOD: Toggle fullscreen on screen share video element
  const toggleFullscreen = () => {
    const screenVideoElem = videoRefs.current[screenSharerID];
    if (!screenVideoElem) return;

    if (!document.fullscreenElement) {
      screenVideoElem.requestFullscreen().catch((err) => {
        console.error("Error enabling fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // NEW: Toggle fullscreen on Host video block only
  const toggleHostFullscreen = () => {
    if (!hostID) return;
    const hostVideo = videoRefs.current[hostID];
    if (!hostVideo) return;

    if (!document.fullscreenElement) {
      hostVideo.requestFullscreen().catch((err) => {
        console.error("Error enabling fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const leaveMeeting = () => {
    peersRef.current.forEach(({ peer }) => peer.destroy());
    peersRef.current = [];
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    socket.disconnect();
    window.location.href = "/guest";
  };

  return (
    <div className="guest-room-container">
      <header className="guest-room-header">
        <h2 className="logo">
          Ve <span className="gold">Meet</span>
        </h2>
        <div>
          <span>Room: {roomID}</span>
          <span className="username">You: {userName}</span>
        </div>
      </header>

      {/* FULLSCREEN SHARE MOD: Dedicated Screen Share Block */}
      {screenSharerID && (
        <div className="screen-share-container">
          <video
            className="screen-share-video"
            autoPlay
            playsInline
            onClick={toggleFullscreen}
            title="Click to toggle fullscreen"
            ref={(el) => {
              if (el && videoRefs.current[screenSharerID]) {
                el.srcObject = videoRefs.current[screenSharerID].srcObject;
              } else if (el) {
                videoRefs.current[screenSharerID] = el;
              }
            }}
          />
          <div className="screen-share-username">
            {peers.find((p) => p.peerID === screenSharerID)?.userName || "Presenter"}
          </div>
        </div>
      )}

      <main className="video-grid">
        <div className={`video-block ${isScreenSharing ? "fullscreen-video" : ""}`}>
          <video muted ref={userVideo} autoPlay playsInline className="video" />
          {!isScreenSharing && <p>{userName} (You)</p>}
        </div>

        {peers.map(({ peerID, userName }) => {
          if (peerID === screenSharerID) return null; // skip screen share user video here

          const isHost = peerID === hostID;

          return (
            <div className="video-block" key={peerID} style={{ position: "relative" }}>
              <video
                playsInline
                autoPlay
                ref={(el) => {
                  if (el) videoRefs.current[peerID] = el;
                  else delete videoRefs.current[peerID];
                }}
                className="video"
              />
              <p>{userName}</p>

              {userName === "Chanakya" && (
                <div className="host-video-buttons">
                  <button className="pip-btn" title="Picture in Picture">📺</button>
                  <button className="enhance-btn" title="Enhancement">✨</button>
                  <button
                    onClick={toggleHostFullscreen}
                    title="Fullscreen Host Video"
                    className="fullscreen-btn"
                  >
                     ⛶
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </main>

      <aside className="participants-panel">
        <h3>Participants ({participants.length + 1})</h3>
        <ul>
          <li key={userName + "-self"}>{userName} (You)</li>
          {participants.map((pName, idx) => (
            <li key={`${pName}-${idx}`}>{pName}</li>
          ))}
        </ul>
        <div className="controls">
          <button onClick={toggleMic}>{micOn ? "Mute" : "Unmute"}</button>
          <button onClick={toggleCam}>{camOn ? "Video Off" : "Video On"}</button>
          <button onClick={toggleScreenShare}>{isScreenSharing ? "Stop Sharing" : "Share Screen"}</button>
          <button className="end-btn" onClick={leaveMeeting}>Leave Meeting</button>
        </div>
      </aside>
    </div>
  );
};

export default GuestRoom;
