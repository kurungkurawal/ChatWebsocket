const WebSocket = require("ws");
const http = require("http");
const mysql = require("mysql2");

// Koneksi ke database MariaDB di AWebServer
const db = mysql.createConnection({
  host: "localhost",
  user: "root", // Sesuaikan dengan username MariaDB di AWebServer
  password: "root", // Biasanya kosong pada instalasi default
  database: "chatdb" // Buat database ini di phpMyAdmin
});

db.connect((err) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Connected to MariaDB.");
    db.query(
      `CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_ip VARCHAR(50),
        message TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      (err) => {
        if (err) console.error("Error creating table:", err);
      }
    );
  }
});

// Membuat server HTTP
const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
  const userIP = req.socket.remoteAddress.replace("::ffff:", "");

  console.log(`Client connected: ${userIP}`);

  // Kirimkan pesan lama ke user yang baru terhubung
  db.query("SELECT user_ip, message, timestamp FROM messages ORDER BY id ASC", (err, rows) => {
    if (!err) {
      rows.forEach((row) => {
        ws.send(`[${row.timestamp}] ${row.user_ip}: ${row.message}`);
      });
    }
  });

  ws.on("message", (message) => {
    console.log(`Received message from ${userIP}: ${message}`);

    // Simpan pesan ke database
    db.query(
      "INSERT INTO messages (user_ip, message) VALUES (?, ?)",
      [userIP, message],
      (err) => {
        if (err) {
          console.error("Gagal menyimpan pesan:", err);
        }
      }
    );

    // Kirim pesan ke semua client
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`[${new Date().toLocaleTimeString()}] ${userIP}: ${message}`);
      }
    });
  });

  ws.on("close", () => {
    console.log(`Client disconnected: ${userIP}`);
  });
});

server.listen(3000, () => {
  console.log("WebSocket server running on ws://localhost:3000");
});
