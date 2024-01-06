/**
 * Options for creating a queuefy function.
 */
interface CreateQueuefyOptions {
  /**
   * Specifies whether the queue should stop processing further functions in the queue after a
   * failure. If set to `true`, the queue will halt on the first encountered error. If `false`, the
   * queue will continue executing the remaining functions even if one fails.
   */
  failFast?: boolean;
}

/**
 * Default options for createQueuefy function.
 */
const defaultCreateQueuefyOptions: Required<CreateQueuefyOptions> = {
  failFast: true,
};

/**
 * Create a function that ensures sequential execution of asynchronous tasks.
 *
 * This function takes an option object and returns a new function. The returned function, when
 * called with an asynchronous function, returns a wrapped version of that function. The wrapped
 * function ensures that calls to the asynchronous function are queued and executed sequentially.
 *
 * @param options - Configuration options for the queuefy function.
 * @returns A function that, when called with an asynchronous function, returns a wrapped version of
 *   that function which ensures sequential execution.
 */
export function createQueuefy({
  failFast = defaultCreateQueuefyOptions.failFast,
}: CreateQueuefyOptions = defaultCreateQueuefyOptions) {
  return (() => {
    // Internal queue to manage the execution order.
    let queue: Promise<unknown> = Promise.resolve();
    /**
     * Wraps an asynchronous function to ensure its calls are queued and executed sequentially.
     *
     * @param f - The asynchronous function to be wrapped and queued.
     * @returns A wrapped version of the asynchronous function that is added to the queue on
     *   execution.
     */
    return <I extends unknown[], O>(f: (...args: I) => Promise<O>) =>
      (...args: I) =>
        // Enqueue the function execution, ensuring sequential execution.
        // If `failFast` is true, any error will halt the queue. Otherwise, the queue continues
        // despite errors.
        (queue = queue.then(
          () => f(...args),
          failFast ? undefined : () => f(...args),
        )) as Promise<O>;
  })();
}
