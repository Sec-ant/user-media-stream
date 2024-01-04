/// <reference types="./src/media-track-shims.d.ts" />
import {
  initMediaStream,
  constrainMediaStream,
  stopMediaStream,
} from "./src/index";

const videoElement = document.querySelector("video");

if (videoElement) {
  const stream = await initMediaStream(videoElement, {
    initConstraints(supportedConstraints) {
      console.log("supported constraints", supportedConstraints);
      return {
        audio: true,
        video: true,
      };
    },
    videoConstraints(capabilities) {
      console.log("video capabilities", capabilities);
      return {};
    },
    audioConstraints(capabilities) {
      console.log("audio capabilities", capabilities);
      return {};
    },
  });

  const videoTracks = stream.getVideoTracks();
  const audioTracks = stream.getAudioTracks();

  console.log("video track", videoTracks);
  console.log("audio track", audioTracks);

  console.log(
    "video track settings",
    videoTracks.map((videoTrack) => videoTrack.getSettings()),
  );
  console.log(
    "audio track settings",
    audioTracks.map((audioTrack) => audioTrack.getSettings()),
  );

  for (let i = 0; i < 10; ++i) {
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });

    await constrainMediaStream(stream, {
      videoConstraints: {
        advanced: [
          { exposureMode: "manual", exposureTime: i % 2 === 0 ? 100 : 1000 },
        ],
      },
    });
  }

  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });

  await stopMediaStream(videoElement, stream);
}
