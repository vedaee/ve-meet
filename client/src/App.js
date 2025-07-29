import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Room from './components/Room';
import GuestRoom from './components/GuestRoom'; // Import GuestRoom

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="/guest/:roomId" element={<GuestRoom />} /> {/* Corrected dynamic route */}
      </Routes>
    </Router>
  );
}

export default App;
