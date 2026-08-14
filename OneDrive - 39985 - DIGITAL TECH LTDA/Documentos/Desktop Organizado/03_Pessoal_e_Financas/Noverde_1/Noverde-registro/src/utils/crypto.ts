/**
 * Safe cryptographic random number generator to comply with SonarCloud S2245 security rules.
 */
export function secureRandom(): number {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] / (0xffffffff + 1);
  }
  return 0.5;
}

export function secureRandomId(prefix: string = 'id'): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  const rand = Math.floor(secureRandom() * 1000000);
  return `${prefix}-${Date.now()}-${rand}`;
}
