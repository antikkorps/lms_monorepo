import { config } from '@vue/test-utils';
import { vi, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

// Setup Pinia for each test
beforeEach(() => {
  setActivePinia(createPinia());
});

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Mock vue-router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  currentRoute: {
    value: {
      path: '/',
      name: 'home',
      params: {},
      query: {},
    },
  },
};

const mockRoute = {
  path: '/',
  name: 'home',
  params: {},
  query: {},
  meta: {},
};

// Global stubs for router components
config.global.stubs = {
  RouterLink: {
    template: '<a :href="to"><slot /></a>',
    props: ['to'],
  },
  RouterView: {
    template: '<div data-testid="router-view"><slot /></div>',
  },
};

// Global mocks
config.global.mocks = {
  $router: mockRouter,
  $route: mockRoute,
};

// Export mocks for use in tests
export { mockRouter, mockRoute };
