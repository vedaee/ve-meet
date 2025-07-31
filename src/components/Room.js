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

const Room = () => {
  const [peers, setPeers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [userName, setUserName] = useState("");
  const [roomID, setRoomID] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  const userVideo = useRef();
  const peersRef = useRef([]);
  const streamRef = useRef();
  const screenTrackRef = useRef();
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
        });

        socket.on("user-joined", (payload) => {
          const alreadyExists = peersRef.current.some(p => p.peerID === payload.id);
          if (alreadyExists) return;

          const peer = addPeer(payload.signal, payload.id, payload.name, streamRef.current);
          peersRef.current.push({ peerID: payload.id, peer, userName: payload.name });
          setPeers((users) => [...users, { peerID: payload.id, peer, userName: payload.name }]);
          setParticipants((list) => {
            if (!list.includes(payload.name)) return [...list, payload.name];
            else return list;
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
        });

        // Add listener to update participant list dynamically from server
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
        try {
          videoElem.srcObject = remoteStream;
        } catch (e) {
          videoElem.src = window.URL.createObjectURL(remoteStream);
        }
      }
    });

    peer.on("error", (err) => {
      console.error("Peer error (createPeer):", err);
    });

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
        try {
          videoElem.srcObject = remoteStream;
        } catch (e) {
          videoElem.src = window.URL.createObjectURL(remoteStream);
        }
      }
    });

    peer.on("error", (err) => {
      console.error("Peer error (addPeer):", err);
    });

    if (peer && typeof peer.signal === "function" && incomingSignal) {
      try {
        peer.signal(incomingSignal);
      } catch (err) {
        console.error("Error signaling peer:", err);
      }
    }

    return peer;
  };

  const toggleMic = () => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !micOn;
    });
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !camOn;
    });
    setCamOn(!camOn);
  };

  const handleScreenShare = async () => {
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        // Replace video track with screen track for each peer
        peersRef.current.forEach(({ peer }) => {
          const sender = peer._pc.getSenders().find((s) => s.track.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        });

        // Replace local video to screen share stream
        if (userVideo.current) userVideo.current.srcObject = screenStream;

        screenTrack.onended = () => {
          peersRef.current.forEach(({ peer }) => {
            const sender = peer._pc.getSenders().find((s) => s.track.kind === "video");
            if (sender) sender.replaceTrack(streamRef.current.getVideoTracks()[0]);
          });
          if (userVideo.current) userVideo.current.srcObject = streamRef.current;
          setScreenSharing(false);
        };

        setScreenSharing(true);
      } catch (err) {
        console.error("Screen share error:", err);
      }
    } else {
      if (screenTrackRef.current) screenTrackRef.current.stop();
      setScreenSharing(false);
    }
  };

  const endMeeting = () => {
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
          <button className="gold-btn" onClick={handleScreenShare}>
            {screenSharing ? "Stop Sharing" : "Share Screen"}
          </button>
          <button className="red-btn" onClick={endMeeting}>
            End Meeting
          </button>
        </div>
      </aside>
    </div>
  );
};

export default Room;
