/**
 * Backup file format shared by the browser (JSZip packing/unpacking) and the
 * server (validating and re-creating models). Kept free of browser and DB
 * imports so both sides — and the tests — can use it.
 */
import { sanitizeSvg } from './sanitizeSvg';

export const BACKUP_FORMAT = 'heygeo-backup';
export const BACKUP_VERSION = 1;
export const MAX_MODELS_PER_BACKUP = 200;

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 2000;
const MAX_GUIDE = 20000;
const MAX_THUMBNAIL = 200_000;
const MAX_JSON_BYTES = 2_000_000;
const MAX_CATEGORIES = 20;

export interface BackupModel {
  title: string;
  description: string | null;
  guide: string | null;
  jsonData: object;
  thumbnailSvg: string | null;
  categories: string[];
  isPublic: boolean;
  viewCount: number;
  createdAt: string | null;
  publishedAt: string | null;
}

export type BackupModelResult =
  | { ok: true; value: BackupModel }
  | { ok: false; reason: string };

class BackupError extends Error {}

function optionalText(value: unknown, max: number, label: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new BackupError(`${label} không phải chuỗi`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new BackupError(`${label} vượt quá ${max} ký tự`);
  return trimmed || null;
}

function isoDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/**
 * Accept one entry from an uploaded backup and return only the fields the
 * server is willing to store. Anything malformed or oversized is refused with a
 * reason the user can read. Ids and share tokens never survive: every restored
 * model becomes a fresh copy.
 */
export function sanitizeBackupModel(raw: unknown): BackupModelResult {
  try {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return { ok: false, reason: 'không phải một đối tượng mô hình' };
    }
    const input = raw as Record<string, unknown>;

    const title = optionalText(input.title, MAX_TITLE, 'tiêu đề');
    if (!title) throw new BackupError('thiếu tiêu đề');

    const description = optionalText(input.description, MAX_DESCRIPTION, 'mô tả');
    const guide = optionalText(input.guide, MAX_GUIDE, 'hướng dẫn');

    const json = input.jsonData;
    if (typeof json !== 'object' || json === null || Array.isArray(json)) {
      throw new BackupError('thiếu dữ liệu mô hình (jsonData)');
    }
    let serialized: string;
    try {
      serialized = JSON.stringify(json);
    } catch {
      throw new BackupError('dữ liệu mô hình không đọc được');
    }
    if (serialized.length > MAX_JSON_BYTES) {
      throw new BackupError(`dữ liệu mô hình vượt ${Math.round(MAX_JSON_BYTES / 1000)} KB`);
    }

    const thumbnail = optionalText(input.thumbnailSvg, MAX_THUMBNAIL, 'ảnh xem trước');
    const categories = Array.isArray(input.categories)
      ? input.categories
          .filter((c): c is string => typeof c === 'string' && c.trim().length > 0 && c.length <= 50)
          .slice(0, MAX_CATEGORIES)
      : [];

    return {
      ok: true,
      value: {
        title,
        description,
        guide,
        // Round-trip so Prisma receives plain JSON, free of functions or cycles.
        jsonData: JSON.parse(serialized) as object,
        thumbnailSvg: thumbnail ? sanitizeSvg(thumbnail) : null,
        categories,
        isPublic: input.isPublic === true,
        viewCount: Number.isInteger(input.viewCount) && (input.viewCount as number) >= 0
          ? (input.viewCount as number)
          : 0,
        createdAt: isoDate(input.createdAt),
        publishedAt: isoDate(input.publishedAt),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'dữ liệu không hợp lệ' };
  }
}

/** True when a parsed manifest belongs to a HeyGeo backup we can restore. */
export function isHeyGeoManifest(manifest: unknown): boolean {
  if (typeof manifest !== 'object' || manifest === null) return false;
  const m = manifest as Record<string, unknown>;
  return m.format === BACKUP_FORMAT && Number(m.version) <= BACKUP_VERSION;
}

/** heygeo-backup-<username>-<YYYYMMDD-HHMMSS>.zip */
export function backupFilename(username: string | null, email: string, at: Date): string {
  const source = (username || email.split('@')[0] || 'user').toLowerCase();
  const slug = source.replace(/[^a-z0-9_-]/g, '').slice(0, 30) || 'user';
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp =
    `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}` +
    `-${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}`;
  return `heygeo-backup-${slug}-${stamp}.zip`;
}
