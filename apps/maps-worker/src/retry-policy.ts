export function getNextAttemptDelayMs(attempts: number): number {
  if (attempts <= 1) {
    return 60_000;
  }

  return 5 * 60_000;
}

export function shouldFailPermanently(attempts: number, maxAttempts: number): boolean {
  return attempts >= maxAttempts;
}
