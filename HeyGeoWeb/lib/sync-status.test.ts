import { describe, expect, it } from 'vitest';
import { computeSyncRows, summarize } from './sync-status';

const server = [
  { id: 'a', title: 'Đường chéo hình bình hành', updatedAt: '2026-11-01T00:00:00.000Z' },
  { id: 'b', title: 'Quỹ tích elip', updatedAt: '2026-11-02T00:00:00.000Z' },
  { id: 'c', title: 'Phép vị tự', updatedAt: '2026-11-03T00:00:00.000Z' },
];

describe('computeSyncRows', () => {
  it('marks a model that is only on the server as missing', () => {
    const rows = computeSyncRows(server, []);
    expect(rows.map((r) => r.status)).toEqual(['missing', 'missing', 'missing']);
  });

  it('marks matching timestamps as synced', () => {
    const rows = computeSyncRows(server, [
      {
        id: 'b',
        title: 'Quỹ tích elip',
        updatedAt: '2026-11-02T00:00:00.000Z',
        syncedAt: '2026-11-02T01:00:00.000Z',
      },
    ]);
    expect(rows.find((r) => r.id === 'b')?.status).toBe('synced');
  });

  it('marks a browser copy older than the server as stale', () => {
    const rows = computeSyncRows(server, [
      {
        id: 'b',
        title: 'Quỹ tích elip',
        updatedAt: '2026-10-30T00:00:00.000Z',
        syncedAt: '2026-10-30T02:00:00.000Z',
      },
    ]);
    expect(rows.find((r) => r.id === 'b')?.status).toBe('stale');
  });

  it('keeps browser-only models after the server rows', () => {
    const rows = computeSyncRows(
      [{ id: 'a', title: 'A', updatedAt: '2026-11-01T00:00:00.000Z' }],
      [
        {
          id: 'z',
          title: 'Mô hình đã xoá trên server',
          updatedAt: '2026-10-01T00:00:00.000Z',
          syncedAt: '2026-10-01T00:00:00.000Z',
        },
      ],
    );
    expect(rows.map((r) => r.id)).toEqual(['a', 'z']);
    expect(rows[1].status).toBe('localOnly');
  });

  it('ignores unparsable timestamps instead of throwing', () => {
    const rows = computeSyncRows(
      [{ id: 'a', title: 'A', updatedAt: 'not-a-date' }],
      [{ id: 'a', title: 'A', updatedAt: 'also-bad', syncedAt: '' }],
    );
    expect(rows[0].status).toBe('synced');
  });
});

describe('summarize', () => {
  it('counts each status and flags rows needing a decision', () => {
    const rows = computeSyncRows(server, [
      {
        id: 'b',
        title: 'Quỹ tích elip',
        updatedAt: '2026-11-02T00:00:00.000Z',
        syncedAt: '2026-11-02T03:00:00.000Z',
      },
      {
        id: 'y',
        title: 'Chỉ có trong trình duyệt',
        updatedAt: '2026-10-01T00:00:00.000Z',
        syncedAt: '2026-10-01T00:00:00.000Z',
      },
    ]);
    expect(summarize(rows)).toEqual({
      total: 4,
      missing: 2,
      synced: 1,
      stale: 0,
      localOnly: 1,
      needsChoice: 3,
    });
  });
});
