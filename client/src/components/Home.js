import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [userName, setUserName] = useState("");
  const [generatedRoom, setGeneratedRoom] = useState("");

  // Short Room Code Generator (6-character alphanumeric)
  const generateShortCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateRoom = () => {
    const newRoom = generateShortCode();
    setGeneratedRoom(newRoom);
  };

  const handleJoinRoom = () => {
    if (roomCode.trim() && userName.trim()) {
      navigate(`/room/${roomCode}?name=${encodeURIComponent(userName)}`);
    } else {
      alert("Please enter both Room Code and Your Name.");
    }
  };

  return (
    <div style={{ backgroundColor: "#000", minHeight: "100vh", color: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <h1 style={{ fontFamily: "'Cursive', sans-serif", fontSize: "48px", color: "gold", marginBottom: "30px" }}>
        ✨ Ve Meet ✨
      </h1>

      <div style={{ marginBottom: "20px" }}>
        <button onClick={handleCreateRoom} style={buttonStyle}>🎉 Create New Room</button>
      </div>

      {generatedRoom && (
        <div style={{ marginBottom: "30px", color: "#0f0" }}>
          <p><strong>Room Code:</strong> <span style={{ fontSize: "24px" }}>{generatedRoom}</span></p>
          <p>Share this code with guests or <br /> <a href={`/room/${generatedRoom}`} style={{ color: "gold", textDecoration: "underline" }}>Click here to start</a></p>
        </div>
      )}

      <div style={inputContainer}>
        <input
          type="text"
          placeholder="Enter Room Code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="Enter Your Name"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          style={inputStyle}
        />
        <button onClick={handleJoinRoom} style={buttonStyle}>🚪 Join Room</button>
      </div>
    </div>
  );
};

// Styles
const buttonStyle = {
  padding: "12px 24px",
  backgroundColor: "gold",
  color: "black",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "16px"
};

const inputStyle = {
  padding: "12px",
  margin: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "16px",
  width: "250px"
};

const inputContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center"
};

export default Home;
