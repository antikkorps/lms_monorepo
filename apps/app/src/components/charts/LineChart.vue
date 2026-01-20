<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface Props {
  data: ChartData<'line'>;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  height: 300,
  showLegend: false,
  showGrid: true,
});

const options = computed<ChartOptions<'line'>>(() => ({
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
        display: props.showGrid,
        color: 'rgba(0, 0, 0, 0.05)',
      },
      ticks: {
        maxRotation: 45,
        minRotation: 45,
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        display: props.showGrid,
        color: 'rgba(0, 0, 0, 0.05)',
      },
    },
  },
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false,
  },
}));
</script>

<template>
  <div :style="{ height: `${height}px` }">
    <Line :data="data" :options="options" />
  </div>
</template>
