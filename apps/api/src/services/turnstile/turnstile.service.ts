/**
 * Cloudflare Turnstile verification service.
 *
 * Verifies the captcha token produced by the Turnstile widget against
 * Cloudflare's siteverify endpoint. The outbound call is wrapped in a circuit
 * breaker (project constraint: external API calls use the breaker pattern).
 *
 * When no secret key is configured (e.g. local dev), verification is skipped
 * and tokens are accepted so the signup flow stays usable without keys.
 */

import CircuitBreaker from 'opossum';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

const CIRCUIT_BREAKER_OPTIONS = {
  timeout: 5000, // siteverify is fast; fail quickly rather than hang signup
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
  volumeThreshold: 3,
};

interface TurnstileSiteVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

/**
 * Calls Cloudflare's siteverify endpoint. Throws on network/HTTP failure so the
 * circuit breaker can account for it.
 */
async function callSiteVerify(token: string, remoteIp?: string): Promise<TurnstileSiteVerifyResponse> {
  const body = new URLSearchParams();
  body.set('secret', config.signup.turnstile.secretKey);
  body.set('response', token);
  if (remoteIp) {
    body.set('remoteip', remoteIp);
  }

  const response = await fetch(config.signup.turnstile.verifyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Turnstile siteverify returned HTTP ${response.status}`);
  }

  return (await response.json()) as TurnstileSiteVerifyResponse;
}

class TurnstileService {
  private readonly breaker: CircuitBreaker<[string, string?], TurnstileSiteVerifyResponse>;

  constructor() {
    this.breaker = new CircuitBreaker(callSiteVerify, CIRCUIT_BREAKER_OPTIONS);

    this.breaker.on('open', () => {
      logger.warn('Turnstile circuit breaker opened - siteverify failing');
    });
    this.breaker.on('halfOpen', () => {
      logger.info('Turnstile circuit breaker half-open - testing recovery');
    });
    this.breaker.on('close', () => {
      logger.info('Turnstile circuit breaker closed - service recovered');
    });
  }

  /** Whether captcha verification is enforced (a secret key is configured). */
  get isEnabled(): boolean {
    return Boolean(config.signup.turnstile.secretKey);
  }

  /**
   * Verifies a Turnstile token. Returns true when the captcha passes (or when
   * verification is disabled). If the breaker is open / the call fails, the
   * token is rejected (fail-closed) rather than letting bots through.
   */
  async verify(token: string | undefined, remoteIp?: string): Promise<boolean> {
    if (!this.isEnabled) {
      return true; // Not configured (dev) - accept.
    }

    if (!token) {
      return false;
    }

    try {
      const result = await this.breaker.fire(token, remoteIp);
      if (!result.success) {
        logger.warn(
          { errorCodes: result['error-codes'] },
          'Turnstile verification rejected token'
        );
      }
      return result.success;
    } catch (error) {
      logger.error(
        { error: (error as Error).message, circuitState: this.breaker.status.stats },
        'Turnstile verification failed'
      );
      return false; // Fail closed.
    }
  }
}

let instance: TurnstileService | null = null;

export function getTurnstileService(): TurnstileService {
  if (!instance) {
    instance = new TurnstileService();
  }
  return instance;
}

export type { TurnstileService };
