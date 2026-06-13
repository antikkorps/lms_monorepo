/**
 * Shutdown state
 *
 * Tracks whether the process has begun a graceful shutdown so the readiness
 * probe (`GET /health/ready`) can report 503 and the load balancer can drain
 * this instance BEFORE the HTTP server stops accepting connections.
 */

let shuttingDown = false;

/** True once graceful shutdown has started. */
export function isShuttingDown(): boolean {
  return shuttingDown;
}

/**
 * Mark the process as shutting down. Idempotent — returns false if shutdown
 * was already in progress, so callers can guard against double signals
 * (e.g. SIGTERM followed by SIGINT).
 */
export function beginShutdown(): boolean {
  if (shuttingDown) {
    return false;
  }
  shuttingDown = true;
  return true;
}

/** Test-only: reset the flag between cases. */
export function resetShutdownState(): void {
  shuttingDown = false;
}
