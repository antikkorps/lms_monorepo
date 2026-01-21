<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
  data: ChartData<'bar'>;
  height?: number;
  horizontal?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  stacked?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  height: 300,
  horizontal: false,
  showLegend: false,
  showGrid: true,
  stacked: false,
});

const options = computed<ChartOptions<'bar'>>(() => ({
  indexAxis: props.horizontal ? 'y' : 'x',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: props.showLegend,
      position: 'top' as const,
    },
    tooltip: {
      mode: 'index',
      intersect: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: props.showGrid && !props.horizontal,
        color: 'rgba(0, 0, 0, 0.05)',
      },
      stacked: props.stacked,
      ticks: props.horizontal
        ? {}
        : {
            maxRotation: 45,
            minRotation: 45,
          },
    },
    y: {
      beginAtZero: true,
      grid: {
        display: props.showGrid && props.horizontal,
        color: 'rgba(0, 0, 0, 0.05)',
      },
      stacked: props.stacked,
    },
  },
}));
</script>

<template>
  <div :style="{ height: `${height}px` }">
    <Bar :data="data" :options="options" />
  </div>
</template>
