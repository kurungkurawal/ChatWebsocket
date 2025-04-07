const WebSocket = require('ws');
const mysql = require('mysql2');

const PORT = process.env.PORT || 3000;

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

db.connect(err => {
  if (err) {
    console.error('DB error:', err);
    return;
  }
  console.log('DB connected!');
});

const wss = new WebSocket.Server({ port: PORT }, () => {
  console.log(`WebSocket running on port ${PORT}`);
});

wss.on('connection', ws => {
  ws.on('message', msg => {
    const text = msg.toString();
    console.log('Received:', text);

    // Example: query database
    db.query('SELECT * FROM orders WHERE name LIKE ?', [`%${text}%`], (err, results) => {
      if (err) {
        ws.send('Database error!');
      } else {
        if (results.length > 0) {
          ws.send(JSON.stringify(results));
        } else {
          ws.send('Data tidak ditemukan.');
        }
      }
    });
  });

  ws.send('Selamat datang di server WebSocket!');
});
