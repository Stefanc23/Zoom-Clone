const express = require("express");
const app = express();
const server = require("http").createServer(app);
const PORT = process.env.PORT || 3000;
const { v4: uuidv4 } = require("uuid");
const io = require("socket.io")(server, {
  cors: { origin: "*" },
});
const { PeerServer } = require("peer");
const peerServer = PeerServer({ port: 9000, path: "/peerjs" });

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.redirect(`${uuidv4()}`);
});

app.get("/:roomId", (req, res) => {
  res.render("room", { roomId: req.params.roomId });
});

io.on("connection", socket => {
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", userId);

    socket.on("disconnect", () => {
      socket.to(roomId).broadcast.emit("user-disconnected", userId);
    });
  });
  socket.on("media-toggle", (roomId, id, state, otherState, type) => {
    type === "video"
      ? socket.to(roomId).broadcast.emit("video-toggle", id, state, otherState)
      : socket.to(roomId).broadcast.emit("audio-toggle", id, state);
  });
});

server.listen(PORT, () => {
  console.log(`listening on port: ${PORT}`);
});
