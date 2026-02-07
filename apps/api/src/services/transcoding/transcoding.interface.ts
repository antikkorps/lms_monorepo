export interface TranscodingSubmitOptions {
  /** Publicly accessible URL to fetch the video from */
  url: string;
  /** Optional metadata to attach */
  meta?: Record<string, string>;
}

export interface TranscodingSubmitResult {
  /** Provider-specific unique identifier */
  uid: string;
  /** Initial status */
  status: TranscodingProviderStatus;
}

export type TranscodingProviderStatus = 'pending' | 'processing' | 'ready' | 'error';

export interface TranscodingStatusResult {
  uid: string;
  status: TranscodingProviderStatus;
  /** HLS playback URL when ready */
  playbackUrl?: string;
  /** Duration in seconds when ready */
  duration?: number;
  /** Error message if status is 'error' */
  errorMessage?: string;
}

export interface TranscodingProvider {
  readonly name: string;
  isAvailable(): boolean;
  submit(options: TranscodingSubmitOptions): Promise<TranscodingSubmitResult>;
  getStatus(uid: string): Promise<TranscodingStatusResult>;
  delete(uid: string): Promise<void>;
}
