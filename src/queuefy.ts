export function createQueuefy() {
  return (() => {
    let queue: Promise<unknown> = Promise.resolve();
    return <I extends unknown[], O>(f: (...args: I) => Promise<O>) => {
      return (...args: I) => {
        return (queue = queue.then(async () => f(...args))) as Promise<O>;
      };
    };
  })();
}
