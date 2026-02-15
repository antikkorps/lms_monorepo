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

export function useBadges() {

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
      const api = useApi();
      interface ApiBadge {
        id: string;
        name: string;
        description: string | null;
        imageUrl: string;
        category: BadgeCategory;
        rarity: BadgeRarity;
        earnedAt: string | null;
        progress?: number;
        requirement?: string;
      }
      const data = await api.get<ApiBadge[]>('/user/badges');
      // Transform earnedAt string to Date
      badges.value = data.map((b) => ({
        ...b,
        earnedAt: b.earnedAt ? new Date(b.earnedAt) : null,
      }));
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
