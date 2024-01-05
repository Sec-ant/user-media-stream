# user-media-stream

This is a streamlined JavaScript library designed for web applications to easily handle camera streams. Its main goal is to offer straightforward methods for managing camera interactions, with a focus on compatibility and simplicity.

## Installation

```bash
npm i user-media-stream
```

## Usage

- Media stream operations:

```ts
import {
  initMediaStream,
  stopMediaStream,
  constrainMediaStream,
} from "user-media-stream";
```

- Media constraints & capablities shim:

```ts
/// <reference types="user-media-stream/media-track-shims" />
```

## API

- `initMediaStream`: Initialize a media stream and attach it to a given video element.
- `stopMediaStream`: Stop a given media stream and detach it from a video element.
- `constrainMediaStream`: Apply video and audio constraints to a given media stream.

For more details, refer to the [source code](./src/mediaStream.ts).

## License

MIT
