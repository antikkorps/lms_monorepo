import { describe, it, expect, beforeEach } from 'vitest';
import { isShuttingDown, beginShutdown, resetShutdownState } from './shutdown.js';

describe('shutdown state', () => {
  beforeEach(() => {
    resetShutdownState();
  });

  it('starts not shutting down', () => {
    expect(isShuttingDown()).toBe(false);
  });

  it('beginShutdown flips the flag and returns true the first time', () => {
    expect(beginShutdown()).toBe(true);
    expect(isShuttingDown()).toBe(true);
  });

  it('beginShutdown returns false on subsequent calls (double-signal guard)', () => {
    expect(beginShutdown()).toBe(true);
    expect(beginShutdown()).toBe(false);
    expect(beginShutdown()).toBe(false);
    expect(isShuttingDown()).toBe(true);
  });
});
