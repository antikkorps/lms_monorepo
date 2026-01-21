import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UserAvatar from '../UserAvatar.vue';

describe('UserAvatar', () => {
  it('renders correctly with required props', () => {
    const wrapper = mount(UserAvatar, {
      props: {
        userId: 'user-123',
      },
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('displays initials from firstName and lastName', () => {
    const wrapper = mount(UserAvatar, {
      props: {
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
      },
    });

    expect(wrapper.text()).toBe('JD');
  });

  it('displays single initial when only firstName is provided', () => {
    const wrapper = mount(UserAvatar, {
      props: {
        userId: 'user-123',
        firstName: 'John',
      },
    });

    expect(wrapper.text()).toBe('J');
  });

  it('displays ? when no name is provided', () => {
    const wrapper = mount(UserAvatar, {
      props: {
        userId: 'user-123',
      },
    });

    expect(wrapper.text()).toBe('?');
  });

  it('uses custom avatarUrl when provided', () => {
    const customUrl = 'https://example.com/avatar.png';
    const wrapper = mount(UserAvatar, {
      props: {
        userId: 'user-123',
        avatarUrl: customUrl,
      },
    });

    const img = wrapper.find('img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe(customUrl);
  });

  describe('sizes', () => {
    it('applies xs size class', () => {
      const wrapper = mount(UserAvatar, {
        props: {
          userId: 'user-123',
          size: 'xs',
        },
      });

      expect(wrapper.classes()).toContain('h-6');
      expect(wrapper.classes()).toContain('w-6');
    });

    it('applies sm size class', () => {
      const wrapper = mount(UserAvatar, {
        props: {
          userId: 'user-123',
          size: 'sm',
        },
      });

      expect(wrapper.classes()).toContain('h-8');
      expect(wrapper.classes()).toContain('w-8');
    });

    it('applies md size class (default)', () => {
      const wrapper = mount(UserAvatar, {
        props: {
          userId: 'user-123',
        },
      });

      expect(wrapper.classes()).toContain('h-10');
      expect(wrapper.classes()).toContain('w-10');
    });

    it('applies lg size class', () => {
      const wrapper = mount(UserAvatar, {
        props: {
          userId: 'user-123',
          size: 'lg',
        },
      });

      expect(wrapper.classes()).toContain('h-12');
      expect(wrapper.classes()).toContain('w-12');
    });

    it('applies xl size class', () => {
      const wrapper = mount(UserAvatar, {
        props: {
          userId: 'user-123',
          size: 'xl',
        },
      });

      expect(wrapper.classes()).toContain('h-16');
      expect(wrapper.classes()).toContain('w-16');
    });
  });

  describe('avatar URL generation', () => {
    it('generates DiceBear URL with initials style by default', () => {
      const wrapper = mount(UserAvatar, {
        props: {
          userId: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
        },
      });

      const img = wrapper.find('img');
      expect(img.attributes('src')).toContain('api.dicebear.com');
      expect(img.attributes('src')).toContain('initials');
    });
  });

  describe('custom classes', () => {
    it('accepts additional classes via class prop', () => {
      const wrapper = mount(UserAvatar, {
        props: {
          userId: 'user-123',
          class: 'custom-avatar-class',
        },
      });

      expect(wrapper.classes()).toContain('custom-avatar-class');
    });
  });
});
