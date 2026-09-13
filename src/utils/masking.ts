/**
 * Securely masks sensitive artifact values (such as cookie values or session tokens).
 * Never stores or displays raw tokens in logs or unauthenticated views.
 * 
 * Example:
 * maskValue("abc123456789") => "abc1••••••89"
 * maskValue("xyz") => "••••"
 */
export function maskValue(value?: string | null): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.length === 0) return '';
  if (trimmed.length <= 4) {
    return '••••';
  }
  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}••••${trimmed.slice(-2)}`;
  }
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-2);
  return `${prefix}••••••${suffix}`;
}
