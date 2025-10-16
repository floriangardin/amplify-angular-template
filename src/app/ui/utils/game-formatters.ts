/**
 * Utility functions for game formatting
 */

/**
 * Format a number as currency
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Get color for impact value (positive/negative/neutral)
 */
export function getImpactColor(value: number): string {
  if (value > 0) return '#35adb6';
  if (value < 0) return '#cf5628';
  return '#5f6368';
}

/**
 * Get sign for impact value
 */
export function getImpactSign(value: number, hideNegative = false): string {
  if (value > 0) return '+';
  if (value < 0) return hideNegative ? '' : '-';
  return '';
}

/**
 * Format time in MM:SS format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format stat change with sign and color
 */
export interface FormattedStatChange {
  value: number;
  absValue: number;
  sign: string;
  color: string;
  formatted: string;
}

export function formatStatChange(value: number, isCurrency: boolean): FormattedStatChange {
  return {
    value,
    absValue: Math.abs(value),
    sign: getImpactSign(value),
    color: getImpactColor(value),
    formatted: isCurrency ? formatCurrency(Math.abs(value)) : `${Math.abs(value)}%`
  };
}
