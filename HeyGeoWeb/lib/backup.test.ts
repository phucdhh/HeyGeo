import { describe, expect, it } from 'vitest';
import {
  backupFilename,
  isHeyGeoManifest,
  sanitizeBackupModel,
  BACKUP_FORMAT,
  BACKUP_VERSION,
} from './backup';

const valid = {
  id: 'clxx-old',
  shareToken: 'secret-token',
  title: '  Đường trung trực  ',
  description: '',
  guide: null,
  jsonData: { objects: [{ name: 'A' }] },
  thumbnailSvg: '<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>',
  categories: ['measurement', '', 42],
  isPublic: true,
  viewCount: 7,
  createdAt: '2026-10-01T08:00:00.000Z',
  publishedAt: 'not-a-date',
};

describe('sanitizeBackupModel', () => {
  it('trims the title, drops empty text and coerces bad categories', () => {
    const result = sanitizeBackupModel(valid);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.title).toBe('Đường trung trực');
    expect(result.value.description).toBeNull();
    expect(result.value.categories).toEqual(['measurement']);
    expect(result.value.createdAt).toBe('2026-10-01T08:00:00.000Z');
    expect(result.value.publishedAt).toBeNull();
  });

  it('never lets an id or share token from the file reach the database', () => {
    const result = sanitizeBackupModel(valid);
    expect(result.ok && 'id' in result.value).toBe(false);
    expect(result.ok && 'shareToken' in result.value).toBe(false);
  });

  it('refuses entries without a title or without model data', () => {
    expect(sanitizeBackupModel({ ...valid, title: '   ' })).toMatchObject({ ok: false });
    expect(sanitizeBackupModel({ ...valid, jsonData: null })).toMatchObject({
      ok: false,
      reason: expect.stringContaining('jsonData'),
    });
  });

  it('refuses non-objects and oversized payloads', () => {
    expect(sanitizeBackupModel('hello')).toMatchObject({ ok: false });
    expect(sanitizeBackupModel([valid])).toMatchObject({ ok: false });

    const huge = { ...valid, jsonData: { blob: 'x'.repeat(2_100_000) } };
    expect(sanitizeBackupModel(huge)).toMatchObject({ ok: false });

    expect(sanitizeBackupModel({ ...valid, title: 'd'.repeat(300) })).toMatchObject({
      ok: false,
      reason: expect.stringContaining('tiêu đề'),
    });
  });

  it('strips scripts from a thumbnail coming from a backup file', () => {
    const result = sanitizeBackupModel({
      ...valid,
      thumbnailSvg: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    });
    expect(result.ok && /script/i.test(result.value.thumbnailSvg ?? '')).toBe(false);
  });

  it('treats a negative or fractional view count as zero', () => {
    const result = sanitizeBackupModel({ ...valid, viewCount: -3 });
    expect(result.ok && result.value.viewCount).toBe(0);
  });
});

describe('isHeyGeoManifest', () => {
  it('accepts our own format up to the current version', () => {
    expect(isHeyGeoManifest({ format: BACKUP_FORMAT, version: BACKUP_VERSION })).toBe(true);
    expect(isHeyGeoManifest({ format: BACKUP_FORMAT, version: 1 })).toBe(true);
  });

  it('rejects other archives and unreadable manifests', () => {
    expect(isHeyGeoManifest({ format: 'ggb-backup', version: 1 })).toBe(false);
    expect(isHeyGeoManifest({ format: BACKUP_FORMAT, version: 99 })).toBe(false);
    expect(isHeyGeoManifest(null)).toBe(false);
    expect(isHeyGeoManifest('zip')).toBe(false);
  });
});

describe('backupFilename', () => {
  const at = new Date(2026, 10, 5, 9, 7, 3); // local time: 05/11/2026 09:07:03

  it('uses the username and a local timestamp', () => {
    expect(backupFilename('minh_phuc', 'a@b.com', at)).toBe('heygeo-backup-minh_phuc-20261105-090703.zip');
  });

  it('falls back to the email local-part and sanitizes it', () => {
    expect(backupFilename(null, 'Phuc.Dang@pedu.vn', at)).toBe('heygeo-backup-phucdang-20261105-090703.zip');
    expect(backupFilename('../../x!', 'a@b.com', at)).toBe('heygeo-backup-x-20261105-090703.zip');
  });

  it('never produces an empty slug', () => {
    expect(backupFilename('%%%', '', at)).toBe('heygeo-backup-user-20261105-090703.zip');
    expect(backupFilename('', '', at)).toBe('heygeo-backup-user-20261105-090703.zip');
  });
});
