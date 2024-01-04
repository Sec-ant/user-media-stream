declare module "webrtc-adapter/dist/chrome/getusermedia" {
  function shimGetUserMedia(
    window: Window,
    browserDetails: import("webrtc-adapter").IAdapter["browserDetails"],
  ): void;
}

declare module "webrtc-adapter/dist/firefox/getusermedia" {
  function shimGetUserMedia(
    window: Window,
    browserDetails: import("webrtc-adapter").IAdapter["browserDetails"],
  ): void;
}

declare module "webrtc-adapter/dist/safari/safari_shim" {
  function shimGetUserMedia(window: Window): void;
}

declare module "webrtc-adapter/dist/utils" {
  function detectBrowser(
    window: Window,
  ): import("webrtc-adapter").IAdapter["browserDetails"];
}
