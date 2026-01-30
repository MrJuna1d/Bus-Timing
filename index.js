import { Server } from "socket.io";

const PORT = 3000;
const io = new Server(PORT, { cors: { origin: "*" } });

console.log(`🚀 Socket.IO server started on http://localhost:${PORT}`);

io.on("connection", (socket) => {
  socket.emit("connectionSuccess", { message: "You are connected to the server!" });
  setInterval(() => {
    const time = Date.now();
    const now = new Date(time);
    const dummyData = {
      busNumber: "T5800" + 1,
      stop: "Central Station",
      lat: 3.1385 + Math.random() * 0.01,
      lng: 101.693 + Math.random() * 0.01,
      timestamp: now.toLocaleDateString() + " " + now.toLocaleTimeString(),
    };
    socket.emit("busLocationUpdate", dummyData);
    console.log("📡 Emitted busLocationUpdate:", dummyData);
  }, 50000);

  socket.on("disconnect", (reason) => {
    console.log("❌ Client disconnected:", socket.id, "Reason:", reason);
  });
});