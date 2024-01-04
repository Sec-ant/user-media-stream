import { createQueuefy } from "./queuefy.js";
import { shimGetUserMedia } from "./shimGetUserMedia.js";

const GET_CAPABILITIES_TIMEOUT = 500;
const IOS_PWA_WAIT_TIMEOUT = 3000;

type InitConstraints =
  | MediaStreamConstraints
  | ((
      supportedConstraints: MediaTrackSupportedConstraints,
    ) => MediaStreamConstraints | Promise<MediaStreamConstraints>);

type VideoConstraints =
  | MediaTrackConstraints
  | ((
      capabilities: MediaTrackCapabilities,
    ) => MediaTrackConstraints | Promise<MediaTrackConstraints>);

type AudioConstraints =
  | MediaTrackConstraints
  | ((
      capabilities: MediaTrackCapabilities,
    ) => MediaTrackConstraints | Promise<MediaTrackConstraints>);

export interface VAConstraints {
  videoConstraints?: VideoConstraints;
  audioConstraints?: AudioConstraints;
}

export interface Constraints extends VAConstraints {
  initConstraints?: InitConstraints;
}

const defaultInitConstraints: InitConstraints = {
  video: true,
  audio: true,
};

const defaultVideoConstraints: VideoConstraints = {};

const defaultAudioConstraints: AudioConstraints = {};

const defaultVAConstraints: Required<VAConstraints> = {
  videoConstraints: defaultVideoConstraints,
  audioConstraints: defaultAudioConstraints,
};

const defaultConstraints: Required<Constraints> = {
  ...defaultVAConstraints,
  initConstraints: defaultInitConstraints,
};

async function initMediaStream(
  videoElement: HTMLVideoElement,
  {
    initConstraints = defaultConstraints.initConstraints,
    videoConstraints = defaultConstraints.videoConstraints,
    audioConstraints = defaultConstraints.audioConstraints,
  }: Constraints = defaultConstraints,
) {
  // check if we are in the secure context
  if (window.isSecureContext !== true) {
    throw new DOMException(
      "Cannot use navigator.mediaDevices in insecure contexts. Use HTTPS or localhost.",
      "NotAllowedError",
    );
  }

  // check if we can use the getUserMedia API
  if (navigator.mediaDevices?.getUserMedia === undefined) {
    throw new DOMException(
      "The method navigator.mediaDevices.getUserMedia is not defined. Does your runtime support this API?",
      "NotSupportedError",
    );
  }

  // shim WebRTC APIs in the client runtime
  shimGetUserMedia();

  // callback constraints
  if (typeof initConstraints === "function") {
    initConstraints = await initConstraints(
      navigator.mediaDevices.getSupportedConstraints(),
    );
  }

  // apply constraints and get the media stream
  const stream = await navigator.mediaDevices.getUserMedia(initConstraints);

  // attach the stream to the video element
  attachMediaStream(videoElement, stream);

  // in WeChat browsers on iOS,
  // 'loadeddata' event won't get fired
  // unless the video is explictly triggered by play()
  videoElement.play();

  // wait for the loadeddata event
  // so we can safely use the video element later
  await Promise.race([
    new Promise<void>((resolve) => {
      videoElement.addEventListener(
        "loadeddata",
        () => {
          resolve();
        },
        { once: true },
      );
    }),
    // iOS PWA webkit bug, use a timeout workaround
    new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(
          new DOMException(
            "The video can not be loaded. Try restarting the app.",
            "InvalidStateError",
          ),
        );
      }, IOS_PWA_WAIT_TIMEOUT);
    }),
  ]);

  await constrainMediaStream(stream, {
    videoConstraints,
    audioConstraints,
  });

  return stream;
}

async function stopMediaStream(
  videoElement: HTMLVideoElement,
  stream: MediaStream,
) {
  videoElement.src = "";
  videoElement.srcObject = null;
  videoElement.load();

  await new Promise<void>((resolve) => {
    videoElement.addEventListener(
      "error",
      () => {
        resolve();
      },
      { once: true },
    );
  });

  for (const track of stream.getTracks()) {
    stream.removeTrack(track);
    track.stop();
  }
}

async function constrainMediaStream(
  stream: MediaStream,
  {
    videoConstraints = defaultVAConstraints.videoConstraints,
    audioConstraints = defaultVAConstraints.audioConstraints,
  }: VAConstraints = defaultVAConstraints,
) {
  // get video tracks
  const videoTracks = stream.getVideoTracks();

  // get audio tracks
  const audioTracks = stream.getAudioTracks();

  // apply media track constraints
  await Promise.all([
    // apply video constraints
    Promise.all(
      videoTracks.map(async (videoTrack) => {
        if (typeof videoConstraints === "function") {
          videoConstraints = await videoConstraints(
            await getCapabilities(videoTrack),
          );
        }
        await videoTrack.applyConstraints(videoConstraints);
      }),
    ),
    // apply audio constraints
    Promise.all(
      audioTracks.map(async (audioTrack) => {
        if (typeof audioConstraints === "function") {
          audioConstraints = await audioConstraints(
            await getCapabilities(audioTrack),
          );
        }
        await audioTrack.applyConstraints(audioConstraints);
      }),
    ),
  ]);
}

function attachMediaStream(
  videoElement: HTMLVideoElement,
  stream: MediaStream,
) {
  // attach the stream to the video element
  if (videoElement.srcObject !== undefined) {
    videoElement.srcObject = stream;
  } else if (videoElement.mozSrcObject !== undefined) {
    videoElement.mozSrcObject = stream;
  } else if (window.URL.createObjectURL) {
    videoElement.src = (window.URL.createObjectURL as CreateObjectURLCompat)(
      stream,
    );
  } else if (window.webkitURL) {
    videoElement.src = (
      window.webkitURL.createObjectURL as CreateObjectURLCompat
    )(stream);
  } else {
    videoElement.src = stream.id;
  }
}

async function getCapabilities(
  track: MediaStreamTrack,
  timeout = GET_CAPABILITIES_TIMEOUT,
): Promise<MediaTrackCapabilities> {
  return new Promise((resolve) => {
    // timeout, return empty capabilities
    let timeoutId: number | undefined = setTimeout(() => {
      resolve({});
      timeoutId = undefined;
      return;
    }, timeout);

    // not supported, return empty capabilities
    if (!track.getCapabilities) {
      clearTimeout(timeoutId);
      resolve({});
      timeoutId = undefined;
      return;
    }

    // poll to check capabilities
    let capabilities: MediaTrackCapabilities = {};
    while (Object.keys(capabilities).length === 0 && timeoutId !== undefined) {
      capabilities = track.getCapabilities();
    }
    clearTimeout(timeoutId);
    resolve(capabilities);
    timeoutId = undefined;
    return;
  });
}

const queuefy = createQueuefy();
const _initMediaStream = queuefy(initMediaStream);
const _stopMediaStream = queuefy(stopMediaStream);
const _constrainMediaStream = queuefy(constrainMediaStream);

export {
  _initMediaStream as initMediaStream,
  _stopMediaStream as stopMediaStream,
  _constrainMediaStream as constrainMediaStream,
};
