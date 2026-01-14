import { describe, it, expect } from 'vitest';

describe('App', () => {
  it('should have router module', async () => {
    const router = await import('./router');
    expect(router).toBeDefined();
  });
});
