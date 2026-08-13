export type FlagValue = boolean | number | string;

/**
 * Simple blackboard for dialogue gates / quest state.
 */
export class Flags {
  private readonly values = new Map<string, FlagValue>();

  get(key: string): FlagValue | undefined {
    return this.values.get(key);
  }

  has(key: string): boolean {
    return this.values.has(key);
  }

  set(key: string, value: FlagValue): void {
    this.values.set(key, value);
  }

  setMany(entries: Record<string, FlagValue>): void {
    for (const [key, value] of Object.entries(entries)) {
      this.values.set(key, value);
    }
  }

  /** True when every required flag matches (missing key fails). */
  matches(requirements?: Record<string, FlagValue>): boolean {
    if (!requirements) return true;
    for (const [key, expected] of Object.entries(requirements)) {
      if (this.values.get(key) !== expected) return false;
    }
    return true;
  }

  clear(): void {
    this.values.clear();
  }
}
