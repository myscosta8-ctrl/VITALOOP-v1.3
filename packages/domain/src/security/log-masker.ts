export function maskSensitiveLogData(data: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('token') ||
      lowerKey.includes('authorization') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('key')
    ) {
      masked[key] = '[REDACTED_SECRET]';
    } else if (lowerKey.includes('cpf') && typeof value === 'string') {
      masked[key] = value.replace(/^(\d{3})\.\d{3}\.\d{3}-(\d{2})$/, '$1.***.***-$2');
    } else {
      masked[key] = value;
    }
  }

  return masked;
}
