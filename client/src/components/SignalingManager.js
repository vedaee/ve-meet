// src/components/SignalingManager.js
export function createPeerConnection(socket, remoteSocketId, onTrackCallback) {
  const peer = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  });

  // Send ICE candidates to remote peer via signaling
  peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', {
        to: remoteSocketId,
        candidate: event.candidate
      });
    }
  };

  // When remote stream is added
  peer.ontrack = (event) => {
    onTrackCallback(event.streams[0]);
  };

  return peer;
}
