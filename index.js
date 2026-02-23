const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// IMPORTANT FOR RENDER
const PORT = process.env.PORT || 8080;

// serve music files
app.use("/music", express.static(path.join(__dirname, "music")));

// upload config
const upload = multer({ dest: "music/" });

// sync state
let state = {
  songUrl: "",
  songName: "",
  playing: false,
  position: 0,
  serverTime: Date.now()
};

// upload endpoint
app.post("/upload", upload.single("song"), (req, res) => {
  state.songUrl = `/music/${req.file.filename}`;
  state.songName = req.file.originalname;
  state.position = 0;
  state.playing = false;
  state.serverTime = Date.now();
  broadcast();
  res.json(state);
});

// websocket sync
wss.on("connection", ws => {
  ws.send(JSON.stringify(state));

  ws.on("message", msg => {
    const data = JSON.parse(msg);
    state = { ...state, ...data, serverTime: Date.now() };
    broadcast();
  });
});

function broadcast() {
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(JSON.stringify(state));
    }
  });
}

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});