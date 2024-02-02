/// <reference types="./src/media-track-shims.d.ts" />

import { attachMediaStream, createUserMediaStream } from "./src/index.js";

const userMediaStream = createUserMediaStream({
  initConstraints(supportedConstraints) {
    console.log("supported constraints", supportedConstraints);
    return {
      audio: false,
      video: {
        aspectRatio: 1,
      },
    };
  },
  videoConstraints(capabilities) {
    console.log("video capabilities", capabilities);
    return {
      advanced: [
        {
          exposureMode: "manual",
          exposureTime: 800,
        },
      ],
    };
  },
  audioConstraints(capabilities) {
    console.log("audio capabilities", capabilities);
    return {};
  },
  onStreamStart: () => console.log("stream start"),
  onStreamStop: () => console.log("stream stop"),
  onStreamUpdate: () => console.log("stream update"),
});

const stream = await userMediaStream.start();

const capabilities = await userMediaStream.inspect();

console.log(capabilities);

const videoElement = document.querySelector("video")!;

attachMediaStream(videoElement, stream);

// videoElement.play();
