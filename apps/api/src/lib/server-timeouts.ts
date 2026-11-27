import type { Server } from "node:http";

export const SERVER_SECURITY_TIMEOUTS = {
  keepAliveTimeoutMs: 5_000,
  headersTimeoutMs: 10_000,
  requestTimeoutMs: 30_000,
  maxHeadersCount: 100,
} as const;

/**
 * Hardens Node's HTTP server against Slowloris (slow headers / slow body)
 * and header-flood DoS attacks while keeping keepAliveTimeout < headersTimeout.
 */
export function applyServerSecurityTimeouts(server: Server): void {
  server.keepAliveTimeout = SERVER_SECURITY_TIMEOUTS.keepAliveTimeoutMs;
  server.headersTimeout = SERVER_SECURITY_TIMEOUTS.headersTimeoutMs;
  server.requestTimeout = SERVER_SECURITY_TIMEOUTS.requestTimeoutMs;
  server.maxHeadersCount = SERVER_SECURITY_TIMEOUTS.maxHeadersCount;
}
