const socket = io("/");
const videoGrid = document.querySelector(".video-grid");
const muteUnmuteButton = document.querySelector(".main__mute_button");
const toggleVideoButton = document.querySelector(".main__video_button");
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

var myId, myStream;
const myVideo = document.createElement("video");
var videoStopped = false;
var muted = false;

peer.on("open", id => {
  socket.emit("join-room", ROOM_ID, id);
  myId = id;
  getUserMedia(
    { video: true, audio: true },
    stream => {
      myStream = stream;
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
peer.on("call", call => {
  getUserMedia(
    { video: true, audio: true },
    stream => {
      call.answer(stream);
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

socket.on("user-disconnected", userId => {
  if (peers[userId]) {
    peers[userId].close();
    delete peers[userId];
  }
});

function connectToNewUser(userId, stream, call) {
  if (!peers[userId]) {
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

muteUnmuteButton.addEventListener("click", () => {
  muteUnmute();
});

toggleVideoButton.addEventListener("click", () => {
  toggleVideo();
});

socket.on("audio-toggle", (id, state) => {
  const video = document.getElementById(id);
  video.muted = !state;
});

function muteUnmute() {
  if (!muted) {
    myStream.getAudioTracks().forEach(track => {
      track.stop();
    });
    socket.emit("media-toggle", ROOM_ID, myId, false, !videoStopped, "audio");
    muted = true;
    setUnmuteButton();
  } else {
    getUserMedia({ video: !videoStopped, audio: true }, stream => {
      myStream = stream;
      myVideo.srcObject = stream;
      muted = false;
      socket.emit("media-toggle", ROOM_ID, myId, true, !videoStopped, "audio");
      setMuteButton();
    });
  }
}

socket.on("video-toggle", (id, state, otherState) => {
  const userId = id;

  getUserMedia(
    { video: state, audio: otherState },
    stream => {
      const video = document.getElementById(userId);
      const call = peer.call(userId, stream);
      let id;
      call.on("stream", remoteStream => {
        if (id != remoteStream.id) {
          id = remoteStream.id;
          video.srcObject = remoteStream;
        }
      });
    },
    err => console.log(err)
  );
});

function toggleVideo() {
  if (!videoStopped) {
    myStream.getVideoTracks().forEach(track => {
      track.stop();
    });
    videoStopped = true;
    socket.emit("media-toggle", ROOM_ID, myId, false, !muted, "video");
    setPlayVideo();
  } else {
    getUserMedia({ video: true, audio: !muted }, stream => {
      myStream = stream;
      myVideo.srcObject = stream;
      videoStopped = false;
      socket.emit("media-toggle", ROOM_ID, myId, true, !muted, "video");
    });
    setStopVideo();
  }
}

function setMuteButton() {
  const html = `
    <i class="fas fa-microphone"></i>
    <span>Mute</span>
  `;
  document.querySelector(".main__mute_button").innerHTML = html;
}

function setUnmuteButton() {
  const html = `
    <i class="unmute fas fa-microphone-slash"></i>
    <span>Unmute</span>
  `;
  document.querySelector(".main__mute_button").innerHTML = html;
}

function setPlayVideo() {
  const html = `
  <i class="stop fas fa-video-slash"></i>
    <span>Play Video</span>
  `;
  document.querySelector(".main__video_button").innerHTML = html;
}

function setStopVideo() {
  const html = `
    <i class="fas fa-video"></i>
    <span>Stop Video</span>
  `;
  document.querySelector(".main__video_button").innerHTML = html;
}

const leaveMeetingButton = document.querySelector(".leave_meeting");

leaveMeetingButton.addEventListener("click", () => {
  leaveMeeting();
});

function leaveMeeting() {
  socket.disconnect();
  alert("You have left the meeting room");
}
