/** The range the desktop's Sample Change dialog offers, spinner step included. */
export const SAMPLES = { min: 15, max: 40000, step: 5 } as const;

/** Why this count cannot be used, or null when it can. */
export function samplesProblem(value: number): string | null {
  if (!Number.isInteger(value)) return 'Số mẫu phải là số nguyên.';
  if (value < SAMPLES.min || value > SAMPLES.max) {
    return `Số mẫu phải từ ${SAMPLES.min} đến ${SAMPLES.max}.`;
  }
  return null;
}
