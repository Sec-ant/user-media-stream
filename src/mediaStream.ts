import { createQueuefy } from "./queuefy.js";
import { shimGetUserMedia } from "./shimGetUserMedia.js";

const GET_CAPABILITIES_TIMEOUT = 500;
const VIDEO_LOADED_DATA_TIMEOUT = 3000;

export type InitConstraints =
  | MediaStreamConstraints
  | ((
      supportedConstraints: MediaTrackSupportedConstraints,
    ) => MediaStreamConstraints | Promise<MediaStreamConstraints>);

export type VideoConstraints =
  | MediaTrackConstraints
  | ((
      capabilities: MediaTrackCapabilities,
    ) => MediaTrackConstraints | Promise<MediaTrackConstraints>);

export type AudioConstraints =
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

export interface ConstrainMetaOptions {
  getCapabilitiesTimeout?: number;
}

export interface InitMetaOptions extends ConstrainMetaOptions {
  videoLoadedDataTimeout?: number;
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

const defaultConstrainMetaOptions: Required<ConstrainMetaOptions> = {
  getCapabilitiesTimeout: GET_CAPABILITIES_TIMEOUT,
};

const defaultInitMetaOptions: Required<InitMetaOptions> = {
  ...defaultConstrainMetaOptions,
  videoLoadedDataTimeout: VIDEO_LOADED_DATA_TIMEOUT,
};

async function initMediaStream(
  videoElement: HTMLVideoElement,
  {
    initConstraints = defaultConstraints.initConstraints,
    videoConstraints = defaultConstraints.videoConstraints,
    audioConstraints = defaultConstraints.audioConstraints,
  }: Constraints = defaultConstraints,
  {
    getCapabilitiesTimeout = defaultInitMetaOptions.getCapabilitiesTimeout,
    videoLoadedDataTimeout = defaultInitMetaOptions.videoLoadedDataTimeout,
  }: InitMetaOptions = defaultInitMetaOptions,
) {
  // check if we are in the secure context
  if (window.isSecureContext !== true) {
    throw new DOMException(
      "Cannot use navigator.mediaDevices in insecure contexts. Please use HTTPS or localhost.",
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
  await shimGetUserMedia();

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
      }, videoLoadedDataTimeout);
    }),
  ]);

  await constrainMediaStream(
    stream,
    {
      videoConstraints,
      audioConstraints,
    },
    {
      getCapabilitiesTimeout,
    },
  );

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
  {
    getCapabilitiesTimeout = defaultConstrainMetaOptions.getCapabilitiesTimeout,
  }: ConstrainMetaOptions = defaultConstrainMetaOptions,
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
            await getCapabilities(videoTrack, getCapabilitiesTimeout),
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
            await getCapabilities(audioTrack, getCapabilitiesTimeout),
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
  timeout: number,
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
