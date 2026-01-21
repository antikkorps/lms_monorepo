import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { Button } from '../index';

describe('Button', () => {
  it('renders correctly with default props', () => {
    const wrapper = mount(Button, {
      slots: {
        default: 'Click me',
      },
    });

    expect(wrapper.text()).toBe('Click me');
    expect(wrapper.attributes('data-slot')).toBe('button');
  });

  it('renders as a button by default', () => {
    const wrapper = mount(Button);

    expect(wrapper.element.tagName).toBe('BUTTON');
  });

  describe('variants', () => {
    it('applies default variant classes', () => {
      const wrapper = mount(Button, {
        props: { variant: 'default' },
      });

      expect(wrapper.classes()).toContain('bg-primary');
    });

    it('applies destructive variant classes', () => {
      const wrapper = mount(Button, {
        props: { variant: 'destructive' },
      });

      expect(wrapper.classes()).toContain('bg-destructive');
    });

    it('applies outline variant classes', () => {
      const wrapper = mount(Button, {
        props: { variant: 'outline' },
      });

      expect(wrapper.classes()).toContain('border');
    });

    it('applies ghost variant classes', () => {
      const wrapper = mount(Button, {
        props: { variant: 'ghost' },
      });

      expect(wrapper.classes()).toContain('hover:bg-accent');
    });

    it('applies secondary variant classes', () => {
      const wrapper = mount(Button, {
        props: { variant: 'secondary' },
      });

      expect(wrapper.classes()).toContain('bg-secondary');
    });

    it('applies link variant classes', () => {
      const wrapper = mount(Button, {
        props: { variant: 'link' },
      });

      expect(wrapper.classes()).toContain('underline-offset-4');
    });
  });

  describe('sizes', () => {
    it('applies default size classes', () => {
      const wrapper = mount(Button, {
        props: { size: 'default' },
      });

      expect(wrapper.classes()).toContain('h-9');
    });

    it('applies small size classes', () => {
      const wrapper = mount(Button, {
        props: { size: 'sm' },
      });

      expect(wrapper.classes()).toContain('h-8');
    });

    it('applies large size classes', () => {
      const wrapper = mount(Button, {
        props: { size: 'lg' },
      });

      expect(wrapper.classes()).toContain('h-10');
    });

    it('applies icon size classes', () => {
      const wrapper = mount(Button, {
        props: { size: 'icon' },
      });

      expect(wrapper.classes()).toContain('size-9');
    });
  });

  describe('slots', () => {
    it('renders slot content', () => {
      const wrapper = mount(Button, {
        slots: {
          default: '<span class="test-content">Test</span>',
        },
      });

      expect(wrapper.find('.test-content').exists()).toBe(true);
      expect(wrapper.find('.test-content').text()).toBe('Test');
    });
  });

  describe('custom classes', () => {
    it('accepts additional classes via class prop', () => {
      const wrapper = mount(Button, {
        props: { class: 'custom-class' },
      });

      expect(wrapper.classes()).toContain('custom-class');
    });
  });
});
