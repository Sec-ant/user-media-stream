import { detectBrowser } from "webrtc-adapter/dist/utils";

export const shimGetUserMedia = (() => {
  let called = false;
  return async () => {
    if (called) {
      return;
    }
    const browserDetails = detectBrowser(window);
    switch (browserDetails.browser) {
      case "chrome":
        (
          await import("webrtc-adapter/dist/chrome/getusermedia")
        ).shimGetUserMedia(window, browserDetails);
        break;
      case "firefox":
        (
          await import("webrtc-adapter/dist/firefox/getusermedia")
        ).shimGetUserMedia(window, browserDetails);
        break;
      case "safari":
        (
          await import("webrtc-adapter/dist/safari/safari_shim")
        ).shimGetUserMedia(window);
        break;
      default:
        throw new DOMException("Browser not supported.", "NotSupportedError");
    }
    called = true;
  };
})();
