import { describe, it, expect } from 'vitest';

describe('shared-ui', () => {
  it('should export components', async () => {
    const exports = await import('./index');

    expect(exports.BaseButton).toBeDefined();
    expect(exports.BaseInput).toBeDefined();
    expect(exports.BaseCard).toBeDefined();
    expect(exports.BaseModal).toBeDefined();
    expect(exports.BaseSpinner).toBeDefined();
    expect(exports.BaseAvatar).toBeDefined();
    expect(exports.BaseBadge).toBeDefined();
  });
});
