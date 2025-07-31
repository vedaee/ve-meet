// src/components/GuestHome.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./GuestHome.css"; // New CSS file just for guest login page

const GuestHome = () => {
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (roomId.trim() && name.trim()) {
      navigate(`/guest/${roomId}`, { state: { name } });
    }
  };

  return (
    <div className="guest-home-container">
      <div className="guest-home-box">
        <h1 className="logoText">
          Ve <span className="gold">Meet</span>
        </h1>
        <form onSubmit={handleJoin} className="formContainer">
          <input
            className="inputBox"
            type="text"
            placeholder="Enter Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={20}
            autoFocus
          />
          <input
            className="inputBox"
            type="text"
            placeholder="Enter Room Code"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            required
            maxLength={20}
          />
          <button className="actionBtn" type="submit">
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
};

export default GuestHome;
