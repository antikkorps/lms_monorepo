/**
 * Badges Composable
 * Manages user badges and achievements
 */

import { ref, computed } from 'vue';
import { useApi } from './useApi';

export interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  category: BadgeCategory;
  rarity: BadgeRarity;
  earnedAt: Date | null;
  progress?: number; // 0-100 for locked badges
  requirement?: string;
}

export type BadgeCategory = 'course' | 'streak' | 'quiz' | 'milestone' | 'special';
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface BadgeStats {
  total: number;
  earned: number;
  byCategory: Record<BadgeCategory, { total: number; earned: number }>;
}

// Mock data
const mockBadges: Badge[] = [
  // Earned badges
  {
    id: '1',
    name: 'First Steps',
    description: 'Complete your first lesson',
    imageUrl: null,
    category: 'milestone',
    rarity: 'common',
    earnedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
  },
  {
    id: '2',
    name: 'Quick Learner',
    description: 'Complete 5 lessons in one day',
    imageUrl: null,
    category: 'milestone',
    rarity: 'uncommon',
    earnedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
  },
  {
    id: '3',
    name: 'Perfect Score',
    description: 'Get 100% on any quiz',
    imageUrl: null,
    category: 'quiz',
    rarity: 'uncommon',
    earnedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
  },
  {
    id: '4',
    name: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    imageUrl: null,
    category: 'streak',
    rarity: 'rare',
    earnedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
  },
  {
    id: '5',
    name: 'Course Conqueror',
    description: 'Complete your first course',
    imageUrl: null,
    category: 'course',
    rarity: 'rare',
    earnedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
  {
    id: '6',
    name: 'Knowledge Seeker',
    description: 'Enroll in 5 different courses',
    imageUrl: null,
    category: 'milestone',
    rarity: 'uncommon',
    earnedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    id: '7',
    name: 'Quiz Master',
    description: 'Pass 10 quizzes with 80%+ score',
    imageUrl: null,
    category: 'quiz',
    rarity: 'rare',
    earnedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  // Locked badges (not yet earned)
  {
    id: '8',
    name: 'Month Master',
    description: 'Maintain a 30-day learning streak',
    imageUrl: null,
    category: 'streak',
    rarity: 'epic',
    earnedAt: null,
    progress: 40,
    requirement: '12/30 days',
  },
  {
    id: '9',
    name: 'Centurion',
    description: 'Complete 100 lessons',
    imageUrl: null,
    category: 'milestone',
    rarity: 'epic',
    earnedAt: null,
    progress: 65,
    requirement: '65/100 lessons',
  },
  {
    id: '10',
    name: 'Perfectionist',
    description: 'Get 100% on 5 quizzes in a row',
    imageUrl: null,
    category: 'quiz',
    rarity: 'epic',
    earnedAt: null,
    progress: 60,
    requirement: '3/5 perfect quizzes',
  },
  {
    id: '11',
    name: 'Scholar',
    description: 'Complete 5 courses',
    imageUrl: null,
    category: 'course',
    rarity: 'epic',
    earnedAt: null,
    progress: 20,
    requirement: '1/5 courses',
  },
  {
    id: '12',
    name: 'Legend',
    description: 'Earn all other badges',
    imageUrl: null,
    category: 'special',
    rarity: 'legendary',
    earnedAt: null,
    progress: 58,
    requirement: '7/12 badges',
  },
];

export function useBadges() {
  const api = useApi();

  const isLoading = ref(true);
  const error = ref<string | null>(null);
  const badges = ref<Badge[]>([]);
  const selectedBadge = ref<Badge | null>(null);
  const filterCategory = ref<BadgeCategory | 'all'>('all');
  const showLocked = ref(true);

  // Computed
  const earnedBadges = computed(() => badges.value.filter((b) => b.earnedAt !== null));
  const lockedBadges = computed(() => badges.value.filter((b) => b.earnedAt === null));

  const filteredBadges = computed(() => {
    let result = [...badges.value];

    // Filter by earned/locked
    if (!showLocked.value) {
      result = result.filter((b) => b.earnedAt !== null);
    }

    // Filter by category
    if (filterCategory.value !== 'all') {
      result = result.filter((b) => b.category === filterCategory.value);
    }

    // Sort: earned first, then by rarity
    const rarityOrder: Record<BadgeRarity, number> = {
      legendary: 5,
      epic: 4,
      rare: 3,
      uncommon: 2,
      common: 1,
    };

    result.sort((a, b) => {
      // Earned badges first
      if (a.earnedAt && !b.earnedAt) return -1;
      if (!a.earnedAt && b.earnedAt) return 1;

      // Then by rarity (higher first)
      return rarityOrder[b.rarity] - rarityOrder[a.rarity];
    });

    return result;
  });

  const stats = computed<BadgeStats>(() => {
    const byCategory: Record<BadgeCategory, { total: number; earned: number }> = {
      course: { total: 0, earned: 0 },
      streak: { total: 0, earned: 0 },
      quiz: { total: 0, earned: 0 },
      milestone: { total: 0, earned: 0 },
      special: { total: 0, earned: 0 },
    };

    for (const badge of badges.value) {
      byCategory[badge.category].total++;
      if (badge.earnedAt) {
        byCategory[badge.category].earned++;
      }
    }

    return {
      total: badges.value.length,
      earned: earnedBadges.value.length,
      byCategory,
    };
  });

  const recentBadges = computed(() => {
    return earnedBadges.value
      .sort((a, b) => (b.earnedAt?.getTime() ?? 0) - (a.earnedAt?.getTime() ?? 0))
      .slice(0, 3);
  });

  // Methods
  function getRarityColor(rarity: BadgeRarity): string {
    switch (rarity) {
      case 'common':
        return 'from-gray-400 to-gray-500';
      case 'uncommon':
        return 'from-green-400 to-green-600';
      case 'rare':
        return 'from-blue-400 to-blue-600';
      case 'epic':
        return 'from-purple-400 to-purple-600';
      case 'legendary':
        return 'from-yellow-400 to-orange-500';
    }
  }

  function getRarityBgColor(rarity: BadgeRarity): string {
    switch (rarity) {
      case 'common':
        return 'bg-gray-100';
      case 'uncommon':
        return 'bg-green-100';
      case 'rare':
        return 'bg-blue-100';
      case 'epic':
        return 'bg-purple-100';
      case 'legendary':
        return 'bg-gradient-to-br from-yellow-100 to-orange-100';
    }
  }

  function getRarityTextColor(rarity: BadgeRarity): string {
    switch (rarity) {
      case 'common':
        return 'text-gray-600';
      case 'uncommon':
        return 'text-green-600';
      case 'rare':
        return 'text-blue-600';
      case 'epic':
        return 'text-purple-600';
      case 'legendary':
        return 'text-orange-600';
    }
  }

  function getCategoryIcon(category: BadgeCategory): string {
    switch (category) {
      case 'course':
        return 'graduation-cap';
      case 'streak':
        return 'flame';
      case 'quiz':
        return 'help-circle';
      case 'milestone':
        return 'flag';
      case 'special':
        return 'star';
    }
  }

  function formatEarnedDate(date: Date): string {
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  }

  async function fetchBadges(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      // TODO: Replace with real API call
      // const data = await api.get<Badge[]>('/user/badges');

      await new Promise((resolve) => setTimeout(resolve, 500));
      badges.value = mockBadges;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load badges';
    } finally {
      isLoading.value = false;
    }
  }

  function selectBadge(badge: Badge) {
    selectedBadge.value = badge;
  }

  function clearSelection() {
    selectedBadge.value = null;
  }

  function setFilterCategory(category: BadgeCategory | 'all') {
    filterCategory.value = category;
  }

  function toggleShowLocked() {
    showLocked.value = !showLocked.value;
  }

  return {
    // State
    isLoading,
    error,
    badges: filteredBadges,
    allBadges: badges,
    selectedBadge,
    filterCategory,
    showLocked,

    // Computed
    earnedBadges,
    lockedBadges,
    stats,
    recentBadges,

    // Methods
    fetchBadges,
    selectBadge,
    clearSelection,
    setFilterCategory,
    toggleShowLocked,
    getRarityColor,
    getRarityBgColor,
    getRarityTextColor,
    getCategoryIcon,
    formatEarnedDate,
  };
}
