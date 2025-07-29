import { io } from 'socket.io-client';

// ✅ Connect securely to your HTTPS backend server
const socket = io('https://localhost:5000', {
  transports: ['websocket'],
  secure: true,
  rejectUnauthorized: false, // Only for development with self-signed SSL
});

export default socket;
