interface CreateQueuefyOptions {
  failFast?: boolean;
}

const defaultCreateQueuefyOptions: Required<CreateQueuefyOptions> = {
  failFast: true,
};

export function createQueuefy({
  failFast = defaultCreateQueuefyOptions.failFast,
}: CreateQueuefyOptions = defaultCreateQueuefyOptions) {
  return (() => {
    let queue: Promise<unknown> = Promise.resolve();
    return <I extends unknown[], O>(f: (...args: I) => Promise<O>) =>
      (...args: I) =>
        (queue = queue.then(
          () => f(...args),
          failFast ? undefined : () => f(...args),
        )) as Promise<O>;
  })();
}
