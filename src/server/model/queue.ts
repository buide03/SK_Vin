export class ModelQueue {
  private active = 0;
  private waiting: {
    start: () => void;
    reject: (reason: Error) => void;
    signal?: AbortSignal;
    abort: () => void;
  }[] = [];
  constructor(
    private limit: number,
    private capacity = 40,
  ) {}
  run<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(Error("MODEL_ABORTED"));
        return;
      }
      if (this.waiting.length >= this.capacity) {
        reject(Error("MODEL_QUEUE_FULL"));
        return;
      }
      const item = { signal, reject, abort: () => {}, start: () => {} };
      item.abort = () => {
        const index = this.waiting.indexOf(item);
        if (index >= 0) {
          this.waiting.splice(index, 1);
          reject(Error("MODEL_ABORTED"));
        }
      };
      item.start = () => {
        signal?.removeEventListener("abort", item.abort);
        this.active++;
        void task()
          .then(resolve, reject)
          .finally(() => {
            this.active--;
            this.waiting.shift()?.start();
          });
      };
      if (this.active < this.limit) item.start();
      else {
        this.waiting.push(item);
        signal?.addEventListener("abort", item.abort, { once: true });
      }
    });
  }
}
declare global {
  var classModelQueue: ModelQueue | undefined;
}
export function modelQueue(limit: number) {
  return (globalThis.classModelQueue ??= new ModelQueue(limit));
}
