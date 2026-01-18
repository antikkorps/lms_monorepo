/**
 * Circuit Breaker for SSO Providers
 * Protects against cascading failures when OAuth providers are unavailable
 */

import CircuitBreaker from 'opossum';
import type { SSOProvider, SSOTokens, SSOUserInfo } from './sso.types.js';
import { logger } from '../../utils/logger.js';

const CIRCUIT_BREAKER_OPTIONS = {
  timeout: 15000, // 15 seconds (OAuth can be slow)
  errorThresholdPercentage: 50, // Trip at 50% error rate
  resetTimeout: 30000, // Try recovery after 30 seconds
  volumeThreshold: 3, // Minimum requests before considering trip
};

/**
 * Wraps an SSO provider with circuit breaker protection
 */
export function createSSOCircuitBreaker(provider: SSOProvider): SSOProvider {
  // Circuit breaker for token exchange
  const tokenBreaker = new CircuitBreaker(
    async (code: string) => provider.exchangeCodeForTokens(code),
    CIRCUIT_BREAKER_OPTIONS
  );

  // Circuit breaker for user info
  const userInfoBreaker = new CircuitBreaker(
    async (tokens: SSOTokens) => provider.getUserInfo(tokens),
    CIRCUIT_BREAKER_OPTIONS
  );

  // Setup event handlers for token breaker
  tokenBreaker.on('open', () => {
    logger.warn(
      { provider: provider.name, operation: 'tokenExchange' },
      'SSO circuit breaker opened - token exchange failing'
    );
  });

  tokenBreaker.on('halfOpen', () => {
    logger.info(
      { provider: provider.name, operation: 'tokenExchange' },
      'SSO circuit breaker half-open - testing recovery'
    );
  });

  tokenBreaker.on('close', () => {
    logger.info(
      { provider: provider.name, operation: 'tokenExchange' },
      'SSO circuit breaker closed - service recovered'
    );
  });

  // Setup event handlers for user info breaker
  userInfoBreaker.on('open', () => {
    logger.warn(
      { provider: provider.name, operation: 'userInfo' },
      'SSO circuit breaker opened - user info failing'
    );
  });

  userInfoBreaker.on('halfOpen', () => {
    logger.info(
      { provider: provider.name, operation: 'userInfo' },
      'SSO circuit breaker half-open - testing recovery'
    );
  });

  userInfoBreaker.on('close', () => {
    logger.info(
      { provider: provider.name, operation: 'userInfo' },
      'SSO circuit breaker closed - service recovered'
    );
  });

  return {
    name: provider.name,

    getAuthorizationUrl(state: string, nonce: string): string | Promise<string> {
      // No circuit breaker needed - this is a URL generation (may involve OIDC discovery)
      return provider.getAuthorizationUrl(state, nonce);
    },

    async exchangeCodeForTokens(code: string): Promise<SSOTokens> {
      try {
        return await tokenBreaker.fire(code);
      } catch (error) {
        const err = error as Error;
        logger.error(
          {
            provider: provider.name,
            operation: 'tokenExchange',
            error: err.message,
            circuitState: tokenBreaker.status.stats,
          },
          'SSO token exchange failed'
        );
        throw error;
      }
    },

    async getUserInfo(tokens: SSOTokens): Promise<SSOUserInfo> {
      try {
        return await userInfoBreaker.fire(tokens);
      } catch (error) {
        const err = error as Error;
        logger.error(
          {
            provider: provider.name,
            operation: 'userInfo',
            error: err.message,
            circuitState: userInfoBreaker.status.stats,
          },
          'SSO user info fetch failed'
        );
        throw error;
      }
    },
  };
}
