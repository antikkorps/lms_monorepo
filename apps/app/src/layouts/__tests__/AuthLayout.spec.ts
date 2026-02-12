import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AuthLayout from '../AuthLayout.vue';

describe('AuthLayout', () => {
  it('renders correctly', () => {
    const wrapper = mount(AuthLayout);

    expect(wrapper.exists()).toBe(true);
  });

  it('renders slot content', () => {
    const wrapper = mount(AuthLayout, {
      slots: {
        default: '<div class="test-content">Login Form</div>',
      },
    });

    expect(wrapper.find('.test-content').exists()).toBe(true);
    expect(wrapper.find('.test-content').text()).toBe('Login Form');
  });

  it('has a header with logo link', () => {
    const wrapper = mount(AuthLayout);

    const header = wrapper.find('header');
    expect(header.exists()).toBe(true);

    const logoLink = header.find('a');
    expect(logoLink.exists()).toBe(true);
    expect(logoLink.attributes('href')).toBe('/');
    expect(logoLink.text()).toContain('IQON-IA');
  });

  it('has a footer with copyright', () => {
    const wrapper = mount(AuthLayout);

    const footer = wrapper.find('footer');
    expect(footer.exists()).toBe(true);

    const currentYear = new Date().getFullYear().toString();
    expect(footer.text()).toContain(currentYear);
    expect(footer.text()).toContain('IQON-IA');
    expect(footer.text()).toContain('All rights reserved');
  });

  it('has centered main content area', () => {
    const wrapper = mount(AuthLayout);

    const main = wrapper.find('main');
    expect(main.exists()).toBe(true);
    expect(main.classes()).toContain('flex-1');
    expect(main.classes()).toContain('flex');
    expect(main.classes()).toContain('items-center');
    expect(main.classes()).toContain('justify-center');
  });

  it('has max-width constraint on content container', () => {
    const wrapper = mount(AuthLayout, {
      slots: {
        default: '<div>Content</div>',
      },
    });

    const contentContainer = wrapper.find('main > div');
    expect(contentContainer.exists()).toBe(true);
    expect(contentContainer.classes()).toContain('max-w-md');
  });

  it('applies full height layout', () => {
    const wrapper = mount(AuthLayout);

    const rootDiv = wrapper.find('div');
    expect(rootDiv.classes()).toContain('min-h-screen');
    expect(rootDiv.classes()).toContain('flex');
    expect(rootDiv.classes()).toContain('flex-col');
  });
});
