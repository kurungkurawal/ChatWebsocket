const WebSocket = require("ws");
const http = require("http");
const mysql = require("mysql2");

// Koneksi ke database MariaDB di AWebServer
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "chatdb"
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
        target_ip VARCHAR(50),
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

// Menyimpan daftar client yang terhubung dengan IP mereka
const clients = new Map();

wss.on("connection", (ws, req) => {
  const userIP = req.socket.remoteAddress.replace("::ffff:", "");
  console.log(`Client connected: ${userIP}`);

  // Simpan koneksi ke dalam Map dengan IP sebagai kunci
  clients.set(userIP, ws);

  // Kirimkan pesan lama ke user yang baru terhubung
  db.query("SELECT user_ip, target_ip, message, timestamp FROM messages WHERE target_ip = ? OR target_ip = 'all' ORDER BY id ASC", 
    [userIP], (err, rows) => {
      if (!err) {
        rows.forEach((row) => {
          ws.send(`[${row.timestamp}] ${row.user_ip} -> ${row.target_ip}: ${row.message}`);
        });
      }
    }
  );

  // Kirim IP user saat terhubung
  ws.send(JSON.stringify({ type: "ip", ip: userIP }));

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`Received message from ${userIP}: ${data.message}, Target: ${data.target_ip}`);

      if (data.type === "message" && data.target_ip) {
        // Simpan pesan ke database
        db.query(
  `CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_ip VARCHAR(50),
      target_ip VARCHAR(50) NOT NULL DEFAULT 'all',
      message TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  (err) => {
    if (err) console.error("Error creating table:", err);
  }
);

        // Kirim pesan hanya ke target IP yang sesuai
        if (clients.has(data.target_ip)) {
          const targetClient = clients.get(data.target_ip);
          if (targetClient.readyState === WebSocket.OPEN) {
            targetClient.send(JSON.stringify({ type: "message", message: data.message, from: userIP }));
          }
        } else {
          console.log(`Target IP ${data.target_ip} tidak terhubung.`);
        }
      }
    } catch (err) {
      console.error("Error parsing message:", err);
    }
  });

  ws.on("close", () => {
    console.log(`Client disconnected: ${userIP}`);
    clients.delete(userIP);
  });
});

server.listen(3000, () => {
  console.log("WebSocket server running on ws://localhost:3000");
});
