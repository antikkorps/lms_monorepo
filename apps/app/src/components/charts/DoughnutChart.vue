<script setup lang="ts">
import { computed } from 'vue';
import { Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from 'chart.js';

ChartJS.register(ArcElement, Title, Tooltip, Legend);

interface Props {
  data: ChartData<'doughnut'>;
  height?: number;
  showLegend?: boolean;
  cutout?: string;
}

const props = withDefaults(defineProps<Props>(), {
  height: 300,
  showLegend: true,
  cutout: '60%',
});

const options = computed<ChartOptions<'doughnut'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: props.cutout,
  plugins: {
    legend: {
      display: props.showLegend,
      position: 'right' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
      },
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const label = context.label || '';
          const value = context.parsed || 0;
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const percentage = Math.round((value / total) * 100);
          return `${label}: ${value} (${percentage}%)`;
        },
      },
    },
  },
}));
</script>

<template>
  <div :style="{ height: `${height}px` }">
    <Doughnut :data="data" :options="options" />
  </div>
</template>
