const socket = io("/");
const videoGrid = document.querySelector(".videoGrid");
const peer = new Peer(undefined, {
  host: "/",
  port: `9000`,
  path: "/peerjs",
});
const peers = {};

var getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;

peer.on("open", id => {
  socket.emit("join-room", ROOM_ID, id);
  getUserMedia(
    { video: true, audio: true },
    stream => {
      const myVideo = document.createElement("video");
      myVideo.setAttribute("id", id);
      myVideo.muted = true;
      addVideoStream(myVideo, stream);
    },
    err => console.log(err)
  );
});

// peer call
socket.on("user-connected", userId => {
  getUserMedia(
    { video: true, audio: true },
    stream => {
      const call = peer.call(userId, stream);
      let id;
      call.on("stream", remoteStream => {
        if (id != remoteStream.id) {
          id = remoteStream.id;
          connectToNewUser(call.peer, remoteStream, call);
        }
      });
    },
    err => console.log(err)
  );
});

// peer answer
peer.on(
  "call",
  call => {
    getUserMedia({ video: true, audio: true }, stream => {
      call.answer(stream);
      let id;
      call.on("stream", remoteStream => {
        if (id != remoteStream.id) {
          id = remoteStream.id;
          connectToNewUser(call.peer, remoteStream, call);
        }
      });
    });
  },
  err => console.log(err)
);

socket.on("user-disconnected", userId => {
  if (peers[userId]) {
    peers[userId].close();
    delete peers[userId];
  }
});

function connectToNewUser(userId, stream, call) {
  if (!peers[userId]) {
    console.log({ userId, stream, call, stream });
    const video = document.createElement("video");
    video.setAttribute("id", call.peer);
    addVideoStream(video, stream);
    peers[userId] = call;
  }
  call.on("close", () => {
    const video = document.getElementById(call.peer);
    video.remove();
  });
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}
