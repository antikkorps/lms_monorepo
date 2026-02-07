<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Loader2,
  AlertCircle,
  SkipBack,
  SkipForward,
} from 'lucide-vue-next';
import { useVideoPlayer, type VideoQuality } from '@/composables/useVideoPlayer';

interface Props {
  src: string;
  poster?: string;
  title?: string;
  qualities?: VideoQuality[];
  autoplay?: boolean;
  startTime?: number;
}

const props = withDefaults(defineProps<Props>(), {
  autoplay: false,
  startTime: 0,
});

const emit = defineEmits<{
  (e: 'progress', currentTime: number, duration: number): void;
  (e: 'ended'): void;
  (e: 'error', message: string): void;
}>();

const videoRef = ref<HTMLVideoElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const progressBarRef = ref<HTMLDivElement | null>(null);
const showSettings = ref(false);
const showVolumeSlider = ref(false);

const {
  isPlaying,
  isPaused,
  isBuffering,
  isMuted,
  isFullscreen,
  volume,
  currentTime,
  duration,
  playbackRate,
  error,
  currentQuality,
  showControls,
  progress,
  bufferedProgress,
  formattedCurrentTime,
  formattedDuration,
  togglePlay,
  seek,
  seekRelative,
  setVolume,
  toggleMute,
  setPlaybackRate,
  toggleFullscreen,
  setQuality,
  showControlsTemporarily,
  hideControls,
  handleKeydown,
  setupEventListeners,
  setupHls,
} = useVideoPlayer(videoRef, {
  autoplay: props.autoplay,
  startTime: props.startTime,
  onProgress: (time, dur) => emit('progress', time, dur),
  onEnded: () => emit('ended'),
  onError: (msg) => emit('error', msg),
});

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

onMounted(() => {
  setupEventListeners(props.src);

  // Add keyboard listener to container
  containerRef.value?.addEventListener('keydown', handleKeydown);
});

function handleProgressClick(e: MouseEvent) {
  if (!progressBarRef.value) return;

  const rect = progressBarRef.value.getBoundingClientRect();
  const percent = ((e.clientX - rect.left) / rect.width) * 100;
  const newTime = (percent / 100) * duration.value;
  seek(newTime);
}

function handleProgressHover(e: MouseEvent) {
  // Could show preview time on hover
}

function handleVolumeChange(e: Event) {
  const target = e.target as HTMLInputElement;
  setVolume(parseFloat(target.value));
}

function handleContainerClick(e: MouseEvent) {
  // Only toggle play if clicking the video area, not controls
  const target = e.target as HTMLElement;
  if (target.closest('.video-controls') || target.closest('button')) return;
  togglePlay();
}

function handleContainerDoubleClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (target.closest('.video-controls') || target.closest('button')) return;
  toggleFullscreen();
}

watch(
  () => props.src,
  (newSrc) => {
    if (videoRef.value && newSrc) {
      setupHls(newSrc);
    }
  }
);
</script>

<template>
  <div
    ref="containerRef"
    class="video-container group relative aspect-video w-full overflow-hidden rounded-lg bg-black"
    tabindex="0"
    @mousemove="showControlsTemporarily"
    @mouseleave="hideControls"
    @click="handleContainerClick"
    @dblclick="handleContainerDoubleClick"
  >
    <!-- Video Element -->
    <video
      ref="videoRef"
      class="h-full w-full"
      :poster="poster"
      playsinline
      @click.stop="togglePlay"
    >
      Your browser does not support the video tag.
    </video>

    <!-- Buffering Overlay -->
    <div
      v-if="isBuffering"
      class="absolute inset-0 flex items-center justify-center bg-black/30"
    >
      <Loader2 class="h-12 w-12 animate-spin text-white" />
    </div>

    <!-- Error Overlay -->
    <div
      v-if="error"
      class="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white"
    >
      <AlertCircle class="mb-4 h-12 w-12" />
      <p class="text-lg font-medium">{{ error }}</p>
    </div>

    <!-- Play/Pause Big Button (center) -->
    <button
      v-if="isPaused && !isBuffering && !error"
      class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 p-4 backdrop-blur-sm transition-transform hover:scale-110"
      @click.stop="togglePlay"
    >
      <Play class="h-12 w-12 text-white" fill="white" />
    </button>

    <!-- Controls Overlay -->
    <div
      class="video-controls absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-8 transition-opacity duration-300"
      :class="showControls ? 'opacity-100' : 'opacity-0'"
    >
      <!-- Progress Bar -->
      <div
        ref="progressBarRef"
        class="group/progress mb-3 h-1 cursor-pointer rounded-full bg-white/30 transition-all hover:h-2"
        @click.stop="handleProgressClick"
        @mousemove="handleProgressHover"
      >
        <!-- Buffered -->
        <div
          class="absolute h-full rounded-full bg-white/50"
          :style="{ width: `${bufferedProgress}%` }"
        />
        <!-- Progress -->
        <div
          class="absolute h-full rounded-full bg-primary"
          :style="{ width: `${progress}%` }"
        />
        <!-- Thumb -->
        <div
          class="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-primary opacity-0 transition-opacity group-hover/progress:opacity-100"
          :style="{ left: `calc(${progress}% - 6px)` }"
        />
      </div>

      <!-- Controls Row -->
      <div class="flex items-center gap-2">
        <!-- Play/Pause -->
        <Button
          variant="ghost"
          size="icon"
          class="h-10 w-10 text-white hover:bg-white/20 hover:text-white"
          @click.stop="togglePlay"
        >
          <Pause v-if="isPlaying" class="h-5 w-5" />
          <Play v-else class="h-5 w-5" />
        </Button>

        <!-- Skip Back -->
        <Button
          variant="ghost"
          size="icon"
          class="h-10 w-10 text-white hover:bg-white/20 hover:text-white"
          @click.stop="seekRelative(-10)"
        >
          <SkipBack class="h-5 w-5" />
        </Button>

        <!-- Skip Forward -->
        <Button
          variant="ghost"
          size="icon"
          class="h-10 w-10 text-white hover:bg-white/20 hover:text-white"
          @click.stop="seekRelative(10)"
        >
          <SkipForward class="h-5 w-5" />
        </Button>

        <!-- Volume -->
        <div
          class="relative flex items-center"
          @mouseenter="showVolumeSlider = true"
          @mouseleave="showVolumeSlider = false"
        >
          <Button
            variant="ghost"
            size="icon"
            class="h-10 w-10 text-white hover:bg-white/20 hover:text-white"
            @click.stop="toggleMute"
          >
            <VolumeX v-if="isMuted || volume === 0" class="h-5 w-5" />
            <Volume2 v-else class="h-5 w-5" />
          </Button>

          <!-- Volume Slider -->
          <div
            class="overflow-hidden transition-all duration-200"
            :class="showVolumeSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'"
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              :value="isMuted ? 0 : volume"
              class="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-primary"
              @input="handleVolumeChange"
              @click.stop
            />
          </div>
        </div>

        <!-- Time -->
        <div class="ml-2 text-sm text-white">
          <span>{{ formattedCurrentTime }}</span>
          <span class="mx-1 text-white/60">/</span>
          <span class="text-white/60">{{ formattedDuration }}</span>
        </div>

        <!-- Spacer -->
        <div class="flex-1" />

        <!-- Title (if provided) -->
        <span v-if="title" class="hidden truncate text-sm text-white/80 sm:block">
          {{ title }}
        </span>

        <!-- Spacer -->
        <div class="flex-1" />

        <!-- Settings (Playback Rate) -->
        <div class="relative">
          <Button
            variant="ghost"
            size="icon"
            class="h-10 w-10 text-white hover:bg-white/20 hover:text-white"
            @click.stop="showSettings = !showSettings"
          >
            <Settings class="h-5 w-5" />
          </Button>

          <!-- Settings Menu -->
          <div
            v-if="showSettings"
            class="absolute bottom-12 right-0 min-w-[150px] rounded-lg bg-gray-900/95 p-2 backdrop-blur-sm"
            @click.stop
          >
            <p class="mb-2 px-2 text-xs font-medium text-white/60">Playback Speed</p>
            <button
              v-for="rate in playbackRates"
              :key="rate"
              class="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm text-white hover:bg-white/10"
              :class="{ 'bg-white/10': playbackRate === rate }"
              @click="setPlaybackRate(rate); showSettings = false"
            >
              <span>{{ rate }}x</span>
              <span v-if="playbackRate === rate" class="text-primary">✓</span>
            </button>

            <!-- Quality (if provided) -->
            <template v-if="qualities && qualities.length > 0">
              <div class="my-2 border-t border-white/10" />
              <p class="mb-2 px-2 text-xs font-medium text-white/60">Quality</p>
              <button
                v-for="quality in qualities"
                :key="quality.value"
                class="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm text-white hover:bg-white/10"
                :class="{ 'bg-white/10': currentQuality === quality.value }"
                @click="setQuality(quality.value); showSettings = false"
              >
                <span>{{ quality.label }}</span>
                <span v-if="currentQuality === quality.value" class="text-primary">✓</span>
              </button>
            </template>
          </div>
        </div>

        <!-- Fullscreen -->
        <Button
          variant="ghost"
          size="icon"
          class="h-10 w-10 text-white hover:bg-white/20 hover:text-white"
          @click.stop="toggleFullscreen"
        >
          <Minimize v-if="isFullscreen" class="h-5 w-5" />
          <Maximize v-else class="h-5 w-5" />
        </Button>
      </div>
    </div>

    <!-- Keyboard Shortcuts Hint (shows briefly on focus) -->
    <div
      class="absolute left-4 top-4 rounded bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-focus:opacity-100"
    >
      Space: Play/Pause | ←→: Seek | ↑↓: Volume | F: Fullscreen | M: Mute
    </div>
  </div>
</template>

<style scoped>
.video-container:focus {
  outline: none;
}

.video-container:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
}

/* Custom range input styling */
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: hsl(var(--primary));
  cursor: pointer;
}

input[type='range']::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: hsl(var(--primary));
  cursor: pointer;
  border: none;
}
</style>
