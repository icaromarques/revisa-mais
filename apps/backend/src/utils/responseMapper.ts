/**
 * Maps Prisma camelCase entities to snake_case payloads expected by the frontend.
 */

function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function toSnakeCase<T = unknown>(value: T): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => toSnakeCase(item));
  if (typeof value !== 'object') return value;

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    result[camelToSnake(key)] = toSnakeCase(val);
  }
  return result;
}

export function bodyField<T = string>(
  body: Record<string, unknown>,
  camelKey: string,
  snakeKey?: string
): T | undefined {
  const sk = snakeKey || camelToSnake(camelKey);
  const val = body[camelKey] ?? body[sk];
  return val as T | undefined;
}

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

export function asString(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return String(value ?? '');
}

export function queryString(query: Record<string, unknown>, key: string): string | undefined {
  const val = query[key];
  if (val === undefined || val === null) return undefined;
  if (Array.isArray(val)) return val[0] ? String(val[0]) : undefined;
  return String(val);
}
