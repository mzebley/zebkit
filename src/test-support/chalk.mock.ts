/**
 * Test mock for `chalk` (ESM-only, breaks under ts-jest's CJS interop).
 * Returns the input string unchanged for any color/style access or chaining,
 * so modules that import chalk purely for console formatting can be unit-tested.
 * Wired in via `moduleNameMapper` in jest.config.js.
 */
const identity = (input?: unknown) => input;

const proxy: unknown = new Proxy(identity, {
  get: () => proxy,
  apply: (_target, _thisArg, args) => args[0],
});

export default proxy;
