/**
 * Video Player Composable
 * Manages video playback state and controls with HLS.js support
 */

import { ref, computed, onUnmounted, type Ref } from 'vue';
import Hls from 'hls.js';

export interface VideoQuality {
  label: string;
  value: string;
  url: string;
}

export interface VideoPlayerOptions {
  autoplay?: boolean;
  startTime?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

export function useVideoPlayer(
  videoRef: Ref<HTMLVideoElement | null>,
  options: VideoPlayerOptions = {}
) {
  // State
  const isPlaying = ref(false);
  const isPaused = ref(true);
  const isBuffering = ref(false);
  const isMuted = ref(false);
  const isFullscreen = ref(false);
  const volume = ref(1);
  const currentTime = ref(0);
  const duration = ref(0);
  const buffered = ref(0);
  const playbackRate = ref(1);
  const error = ref<string | null>(null);
  const currentQuality = ref<string>('auto');
  const showControls = ref(true);

  let controlsTimeout: ReturnType<typeof setTimeout> | null = null;
  const progressInterval: ReturnType<typeof setInterval> | null = null;
  let hlsInstance: Hls | null = null;

  // Computed
  const progress = computed(() => {
    if (duration.value === 0) return 0;
    return (currentTime.value / duration.value) * 100;
  });

  const bufferedProgress = computed(() => {
    if (duration.value === 0) return 0;
    return (buffered.value / duration.value) * 100;
  });

  const formattedCurrentTime = computed(() => formatTime(currentTime.value));
  const formattedDuration = computed(() => formatTime(duration.value));
  const formattedRemaining = computed(() => formatTime(duration.value - currentTime.value));

  // Helpers
  function formatTime(seconds: number): string {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Event handlers
  function handleLoadedMetadata() {
    const video = videoRef.value;
    if (!video) return;

    duration.value = video.duration;

    if (options.startTime && options.startTime > 0) {
      video.currentTime = options.startTime;
    }

    if (options.autoplay) {
      play();
    }
  }

  function handleTimeUpdate() {
    const video = videoRef.value;
    if (!video) return;

    currentTime.value = video.currentTime;
    options.onProgress?.(video.currentTime, video.duration);
  }

  function handleProgress() {
    const video = videoRef.value;
    if (!video || video.buffered.length === 0) return;

    buffered.value = video.buffered.end(video.buffered.length - 1);
  }

  function handleEnded() {
    isPlaying.value = false;
    isPaused.value = true;
    options.onEnded?.();
  }

  function handleError() {
    const video = videoRef.value;
    if (!video) return;

    const errorCode = video.error?.code;
    let errorMessage = 'An error occurred while playing the video';

    switch (errorCode) {
      case MediaError.MEDIA_ERR_ABORTED:
        errorMessage = 'Video playback was aborted';
        break;
      case MediaError.MEDIA_ERR_NETWORK:
        errorMessage = 'A network error occurred';
        break;
      case MediaError.MEDIA_ERR_DECODE:
        errorMessage = 'Video decoding error';
        break;
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        errorMessage = 'Video format not supported';
        break;
    }

    error.value = errorMessage;
    options.onError?.(errorMessage);
  }

  function handleWaiting() {
    isBuffering.value = true;
  }

  function handleCanPlay() {
    isBuffering.value = false;
  }

  function handleVolumeChange() {
    const video = videoRef.value;
    if (!video) return;

    volume.value = video.volume;
    isMuted.value = video.muted;
  }

  // Controls
  function play() {
    const video = videoRef.value;
    if (!video) return;

    video.play().catch((err) => {
      console.error('Play error:', err);
      error.value = 'Failed to play video';
    });

    isPlaying.value = true;
    isPaused.value = false;
  }

  function pause() {
    const video = videoRef.value;
    if (!video) return;

    video.pause();
    isPlaying.value = false;
    isPaused.value = true;
  }

  function togglePlay() {
    if (isPaused.value) {
      play();
    } else {
      pause();
    }
  }

  function seek(time: number) {
    const video = videoRef.value;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(time, duration.value));
  }

  function seekRelative(seconds: number) {
    seek(currentTime.value + seconds);
  }

  function seekToPercent(percent: number) {
    seek((percent / 100) * duration.value);
  }

  function setVolume(value: number) {
    const video = videoRef.value;
    if (!video) return;

    video.volume = Math.max(0, Math.min(1, value));
    volume.value = video.volume;

    if (value > 0 && isMuted.value) {
      video.muted = false;
      isMuted.value = false;
    }
  }

  function toggleMute() {
    const video = videoRef.value;
    if (!video) return;

    video.muted = !video.muted;
    isMuted.value = video.muted;
  }

  function setPlaybackRate(rate: number) {
    const video = videoRef.value;
    if (!video) return;

    video.playbackRate = rate;
    playbackRate.value = rate;
  }

  function enterFullscreen() {
    const video = videoRef.value;
    if (!video) return;

    const container = video.parentElement;
    if (!container) return;

    if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if ((container as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
      (container as HTMLElement & { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
    }

    isFullscreen.value = true;
  }

  function exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as Document & { webkitExitFullscreen?: () => void }).webkitExitFullscreen) {
      (document as Document & { webkitExitFullscreen: () => void }).webkitExitFullscreen();
    }

    isFullscreen.value = false;
  }

  function toggleFullscreen() {
    if (isFullscreen.value) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }

  function setQuality(quality: string) {
    currentQuality.value = quality;
    // In a real implementation, this would switch video source
  }

  // Controls visibility
  function showControlsTemporarily() {
    showControls.value = true;

    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }

    if (isPlaying.value) {
      controlsTimeout = setTimeout(() => {
        showControls.value = false;
      }, 3000);
    }
  }

  function hideControls() {
    if (isPlaying.value) {
      showControls.value = false;
    }
  }

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        seekRelative(-10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        seekRelative(10);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setVolume(volume.value + 0.1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setVolume(volume.value - 0.1);
        break;
      case 'm':
        e.preventDefault();
        toggleMute();
        break;
      case 'f':
        e.preventDefault();
        toggleFullscreen();
        break;
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        e.preventDefault();
        seekToPercent(parseInt(e.key) * 10);
        break;
    }

    showControlsTemporarily();
  }

  function isHlsSource(src: string): boolean {
    return src.includes('.m3u8') || src.includes('/manifest/');
  }

  function setupHls(src: string): void {
    const video = videoRef.value;
    if (!video) return;

    destroyHls();

    if (isHlsSource(src)) {
      if (Hls.isSupported()) {
        hlsInstance = new Hls();
        hlsInstance.loadSource(src);
        hlsInstance.attachMedia(video);
        hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            error.value = `HLS error: ${data.details}`;
            options.onError?.(error.value);
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = src;
      } else {
        error.value = 'HLS playback is not supported in this browser';
        options.onError?.(error.value);
      }
    } else {
      video.src = src;
    }
  }

  function destroyHls(): void {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
  }

  // Setup and cleanup
  function setupEventListeners(src?: string) {
    const video = videoRef.value;
    if (!video) return;

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('volumechange', handleVolumeChange);

    document.addEventListener('fullscreenchange', () => {
      isFullscreen.value = !!document.fullscreenElement;
    });

    // Setup HLS if src provided and it's an HLS source
    if (src) {
      setupHls(src);
    }
  }

  function cleanupEventListeners() {
    const video = videoRef.value;
    if (!video) return;

    video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    video.removeEventListener('timeupdate', handleTimeUpdate);
    video.removeEventListener('progress', handleProgress);
    video.removeEventListener('ended', handleEnded);
    video.removeEventListener('error', handleError);
    video.removeEventListener('waiting', handleWaiting);
    video.removeEventListener('canplay', handleCanPlay);
    video.removeEventListener('volumechange', handleVolumeChange);

    destroyHls();

    if (controlsTimeout) clearTimeout(controlsTimeout);
    if (progressInterval) clearInterval(progressInterval);
  }

  onUnmounted(() => {
    cleanupEventListeners();
  });

  return {
    // State
    isPlaying,
    isPaused,
    isBuffering,
    isMuted,
    isFullscreen,
    volume,
    currentTime,
    duration,
    buffered,
    playbackRate,
    error,
    currentQuality,
    showControls,

    // Computed
    progress,
    bufferedProgress,
    formattedCurrentTime,
    formattedDuration,
    formattedRemaining,

    // Methods
    play,
    pause,
    togglePlay,
    seek,
    seekRelative,
    seekToPercent,
    setVolume,
    toggleMute,
    setPlaybackRate,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    setQuality,
    showControlsTemporarily,
    hideControls,
    handleKeydown,
    setupEventListeners,
    cleanupEventListeners,
    setupHls,
    formatTime,
  };
}
