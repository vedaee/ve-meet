// Polyfill for process.nextTick in browser environment
if (typeof process === "undefined") {
  window.process = {
    nextTick: (cb) => Promise.resolve().then(cb),
  };
} else if (typeof process.nextTick !== "function") {
  process.nextTick = (cb) => Promise.resolve().then(cb);
}
