# user-media-stream

This is a streamlined JavaScript library designed for web applications to easily handle camera streams. Its main goal is to offer straightforward methods for managing camera interactions, with a focus on compatibility and simplicity.

## Installation

```bash
npm i user-media-stream
```

## Usage

- Media stream operations:

  ```ts
  import { createUserMediaStream } from "user-media-stream";
  ```

- Media constraints & capablities shim:

  ```ts
  /// <reference types="user-media-stream/media-track-shims" />
  ```

## Acknowledgement

This package is largely inspired by the code in [`camera.ts`](https://github.com/gruhn/vue-qrcode-reader/blob/9278e21c40de79c69302650acf3659109f564681/src/misc/camera.ts) from [`gruhn/vue-qrcode-reader`](https://github.com/gruhn/vue-qrcode-reader). :heart:

## License

MIT
