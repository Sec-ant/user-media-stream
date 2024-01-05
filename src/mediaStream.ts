import { createQueuefy } from "./queuefy.js";
import { shimGetUserMedia } from "./shimGetUserMedia.js";

/**
 * The default maximum time (in milliseconds) to wait for getting the capabilities of a media track.
 */
const GET_CAPABILITIES_TIMEOUT = 500;

/**
 * The default maximum time (in milliseconds) to wait for the 'loadeddata' event on a video element.
 */
const VIDEO_LOADED_DATA_TIMEOUT = 3000;

/**
 * Media stream constraints for initialization.
 *
 * This can either be a standard `MediaStreamConstraints` object or a function that returns
 * `MediaStreamConstraints`. The function is provided with an argument,
 * `MediaTrackSupportedConstraints`, which represents constraints supported by the **user agent**,
 * and should return either `MediaStreamConstraints` or a promise that resolves to it.
 *
 * Note that `MediaTrackSupportedConstraints` doesn't reflect the constraints supported by the
 * device. It only provides information about which constraint can be understood by the user agent,
 * which usually means the browser.
 *
 * - [`MediaStreamConstraints`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#constraints)
 * - [`MediaTrackSupportedConstraints`](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSupportedConstraints)
 */
export type InitConstraints =
  | MediaStreamConstraints
  | ((
      supportedConstraints: MediaTrackSupportedConstraints,
    ) => MediaStreamConstraints | Promise<MediaStreamConstraints>);

/**
 * Media track constraints specific to video tracks.
 *
 * Can be a `MediaTrackConstraints` object or a function that returns `MediaTrackConstraints`. The
 * function is provided with an argument, `MediaTrackCapabilities`, which reprensents the media
 * track capabilities, and should return either `MediaTrackConstraints` or a promise that resolves
 * to it.
 *
 * Unlike `MediaTrackSupportedConstraints`, `MediaTrackCapabilities` provides the accurate
 * information of the track capabilities supported by your device.
 *
 * - [`MediaTrackConstraints`](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints)
 * - [`MediaTrackCapabilities`](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/getCapabilities#return_value)
 */
export type VideoConstraints =
  | MediaTrackConstraints
  | ((
      capabilities: MediaTrackCapabilities,
    ) => MediaTrackConstraints | Promise<MediaTrackConstraints>);

/**
 * Media track constraints specific to audio tracks.
 *
 * Can be a `MediaTrackConstraints` object or a function that returns `MediaTrackConstraints`. The
 * function is provided with an argument, `MediaTrackCapabilities`, which reprensents the media
 * track capabilities, and should return either `MediaTrackConstraints` or a promise that resolves
 * to it.
 *
 * Unlike `MediaTrackSupportedConstraints`, `MediaTrackCapabilities` provides the accurate
 * information of the track capabilities supported by your device.
 *
 * - [`MediaTrackConstraints`](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints)
 * - [`MediaTrackCapabilities`](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/getCapabilities#return_value)
 */
export type AudioConstraints =
  | MediaTrackConstraints
  | ((
      capabilities: MediaTrackCapabilities,
    ) => MediaTrackConstraints | Promise<MediaTrackConstraints>);

/**
 * Video and audio constraints.
 *
 * Contains optional `videoConstraints` and `audioConstraints`. This is used as an argument of
 * function `constrainMediaStream`.
 */
export interface VAConstraints {
  videoConstraints?: VideoConstraints;
  audioConstraints?: AudioConstraints;
}

/**
 * Full constraints.
 *
 * Contains optional `initConstraints`, `videoConstraints` and `audioConstraints`. This is used as
 * an argument of function `initMediaStream`.
 */
export interface Constraints extends VAConstraints {
  initConstraints?: InitConstraints;
}

/**
 * Options for meta configuration in the process of constraining a media stream.
 */
export interface ConstrainMetaOptions {
  /**
   * The maximum time (in milliseconds) to wait for fetching capabilities of a media track. If not
   * provided, a default value is used.
   */
  getCapabilitiesTimeout?: number;
}

/**
 * Options for meta configuration in the process of initializing a media stream.
 */
export interface InitMetaOptions extends ConstrainMetaOptions {
  /**
   * The maximum time (in milliseconds) to wait for the 'loadeddata' event on the video element
   * after a media stream is attached. This is particularly useful to handle certain browser quirks
   * where the event may be delayed or not fired.
   */
  videoLoadedDataTimeout?: number;
}

/**
 * Default constraints for initializing a media stream.
 *
 * These are the initial constraints applied when initializing a media stream.
 */
const defaultInitConstraints: InitConstraints = {
  video: true,
  audio: true,
};

/**
 * Default constraints for video tracks.
 *
 * Specifies the default constraints to be used for video tracks when none are provided.
 */
const defaultVideoConstraints: VideoConstraints = {};

/**
 * Default constraints for audio tracks.
 *
 * Specifies the default constraints to be used for audio tracks when none are provided.
 */
const defaultAudioConstraints: AudioConstraints = {};

/**
 * Default constraints for both video and audio tracks.
 *
 * Contains the default video and audio constraints, which are used if no specific constraints are
 * provided. Both `videoConstraints` and `audioConstraints` are set to their respective defaults.
 */
const defaultVAConstraints: Required<VAConstraints> = {
  videoConstraints: defaultVideoConstraints,
  audioConstraints: defaultAudioConstraints,
};

/**
 * Default full constraints for media stream initialization.
 *
 * Contains the default `initConstraints`, `videoConstraints`, and `audioConstraints`. These are
 * used as the default values for initializing a media stream if no specific constraints are
 * provided.
 */
const defaultConstraints: Required<Constraints> = {
  ...defaultVAConstraints,
  initConstraints: defaultInitConstraints,
};

/**
 * Default meta configuration options for constraining a media stream.
 */
const defaultConstrainMetaOptions: Required<ConstrainMetaOptions> = {
  getCapabilitiesTimeout: GET_CAPABILITIES_TIMEOUT,
};

/**
 * Default meta configuration options for initializing a media stream.
 */
const defaultInitMetaOptions: Required<InitMetaOptions> = {
  ...defaultConstrainMetaOptions,
  videoLoadedDataTimeout: VIDEO_LOADED_DATA_TIMEOUT,
};

/**
 * Initializes a media stream with specified constraints and attaches it to the given video element.
 *
 * This function does some checks mainly for compatibility and handles necessary events for reliable
 * operation.
 *
 * @param videoElement - The HTMLVideoElement to which the initialized stream will be attached.
 * @param constraints - The constraints (initial, video, and audio) to apply.
 * @param initMetaOptions - Optional meta configuration options.
 * @returns A promise that resolves to the initialized MediaStream.
 */
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
  // https://github.com/gruhn/vue-qrcode-reader/issues/375#issuecomment-1722465888
  // https://github.com/gruhn/vue-qrcode-reader/issues/375#issuecomment-1722812168
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
    // https://bugs.webkit.org/show_bug.cgi?id=252465
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

/**
 * Stops a given media stream and detaches it from a video element.
 *
 * This function clears the source of the provided video element and stops all tracks of the given
 * media stream. It ensures that the video element is reset and the media stream is properly
 * terminated.
 *
 * @param videoElement - The HTMLVideoElement from which the media stream will be detached.
 * @param stream - The MediaStream to be stopped.
 * @returns A promise that resolves when the operation is complete.
 */
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

/**
 * Applies video and audio constraints to a given media stream.
 *
 * This function processes both video and audio tracks of the media stream, applying the specified
 * constraints to each kind of tracks.
 *
 * @param stream - The MediaStream to which constraints will be applied.
 * @param constraints - The video and audio constraints to apply.
 * @param constrainMetaOptions - Optional meta configuration options.
 * @returns A promise that resolves when all constraints have been successfully applied.
 */
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

/**
 * Attaches a given media stream to a HTMLVideoElement.
 *
 * This function sets the source of the video element to the provided media stream. It supports
 * different ways of attaching the stream based on browser compatibility.
 *
 * @param videoElement - The HTMLVideoElement to which the media stream will be attached.
 * @param stream - The MediaStream to be attached to the video element.
 */
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

/**
 * Asynchronously retrieves the capabilities of a given media stream track.
 *
 * This function attempts to fetch the capabilities of a MediaStreamTrack. If called too early, it
 * may return an empty object as [the capabilities might not be available
 * immediately](https://oberhofer.co/mediastreamtrack-and-its-capabilities/#queryingcapabilities).
 * Because capabilities are allowed to be an empty object, a timeout mechanism is implemented to
 * ensure the function returns even if capabilities are not obtained within the specified time,
 * preventing indefinite waiting.
 *
 * @param track - The MediaStreamTrack whose capabilities are to be fetched.
 * @param timeout - The maximum time (in milliseconds) to wait for fetching capabilities.
 * @returns A promise that resolves to the track's capabilities, which may be an empty object.
 */
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

/**
 * Initialize the queuefy function and creat a queue to manage the sequential execution of media
 * stream operations.
 */
const queuefy = createQueuefy();

/**
 * Create a queued version of the `initMediaStream` function to avoid conflicts or race conditions
 * of media stream operations.
 */
const _initMediaStream = queuefy(initMediaStream);

/**
 * Create a queued version of the `stopMediaStream` function to avoid conflicts or race conditions
 * of media stream operations.
 */
const _stopMediaStream = queuefy(stopMediaStream);

/**
 * Create a queued version of the `constrainMediaStream` function to avoid conflicts or race
 * conditions of media stream operations.
 */
const _constrainMediaStream = queuefy(constrainMediaStream);

/**
 * Export the queued versions of the functions for external use, providing more predictable and
 * manageable behaviors.
 */
export {
  _initMediaStream as initMediaStream,
  _stopMediaStream as stopMediaStream,
  _constrainMediaStream as constrainMediaStream,
};
