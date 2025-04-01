const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Menyajikan file statis dari folder 'public'
app.use(express.static("public"));

io.on("connection", (socket) => {
  const clientIp = socket.handshake.address; // Mendapatkan IP pengguna
    console.log(`${clientIp}`);
 
    // Menerima pesan dari client dan menyiarkan ke semua user
    socket.on("chatMessage", (msg) => {
        io.emit("chatMessage", { id:clientIp, message: msg });
        
    });

    // Menangani disconnect
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
