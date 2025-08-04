// /src/components/VideoTile.js
import React, { useEffect, useRef } from 'react';

export default function VideoTile({ stream, name, muted = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div style={tileStyle}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '12px'
        }}
      />
      <div style={nameStyle}>{name}</div>
    </div>
  );
}

const tileStyle = {
  position: 'relative',
  width: '300px',
  height: '200px',
  margin: '10px',
  backgroundColor: '#000',
  border: '2px solid #333',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
};

const nameStyle = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  color: '#fff',
  padding: '4px 8px',
  fontSize: '14px',
  textAlign: 'center'
};
