// Ensures TextDecoder('latin1') doesn't crash on Hermes by mapping to 'utf-8'.
(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  if (typeof g.TextDecoder === 'function') {
    const OriginalTextDecoder = g.TextDecoder;
    try {
      // Test if 'latin1' is supported
      // @ts-ignore - TS types may not include 'latin1'
      new OriginalTextDecoder('latin1');
      return; // Works, no need to polyfill
    } catch {
      // Wrap to coerce unsupported encodings to 'utf-8'
      const SafeTextDecoder = function (
        this: unknown,
        label?: string,
        options?: { fatal?: boolean; ignoreBOM?: boolean }
      ) {
        const coerced = label === 'latin1' ? 'utf-8' : label;
        // @ts-ignore
        return new OriginalTextDecoder(coerced, options);
      } as unknown as typeof TextDecoder;
      // Preserve prototype for instance checks
      // @ts-ignore
      SafeTextDecoder.prototype = OriginalTextDecoder.prototype;
      g.TextDecoder = SafeTextDecoder;
    }
  }
})();
