// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home"; // Host home page
import Room from "./components/Room"; // Host room
import GuestHome from "./components/GuestHome"; // Guest entry page
import GuestRoom from "./components/GuestRoom"; // Guest room

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />                 {/* Host Landing Page */}
        <Route path="/room/:roomId" element={<Room />} />     {/* Host Room Page */}
        <Route path="/guest" element={<GuestHome />} />       {/* Guest Join Form */}
        <Route path="/guest/:roomId" element={<GuestRoom />} /> {/* Guest Room */}
      </Routes>
    </Router>
  );
}

export default App;
