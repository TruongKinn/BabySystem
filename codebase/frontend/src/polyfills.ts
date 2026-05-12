// ⚡ Polyfill for Node.js globals used by sockjs-client, stompjs, etc.
// This file is loaded BEFORE all other scripts via angular.json "polyfills" option.

(window as any).global = window;
(window as any).process = {
    env: { DEBUG: undefined },
    version: '',
    nextTick: (fn: () => void) => setTimeout(fn, 0),
};
