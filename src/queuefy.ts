export function createQueuefy() {
  return (() => {
    let queue: Promise<unknown> = Promise.resolve();
    return <I extends unknown[], O>(f: (...args: I) => Promise<O>) =>
      (...args: I) =>
        (queue = queue.then(() => f(...args))) as Promise<O>;
  })();
}
