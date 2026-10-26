import fs from 'fs';
import path from 'path';
import type { Metadata } from 'next';
import ReleaseContent, { type Release } from './ReleaseContent';

export const metadata: Metadata = {
  title: 'HeyGeo – Ứng dụng Hình học Động',
  description:
    'Tải về HeyGeo Desktop cho Windows, macOS Apple Silicon và macOS Intel. Ứng dụng hình học động mạnh mẽ, miễn phí, mã nguồn mở.',
};

// ─── Build auto-scanner ───────────────────────────────────────────────────────
//
// Đặt file .zip vào thư mục release/ theo quy ước đặt tên:
//   HeyGeo_{PlatformKey}_{YYYY-MM-DD[-HH-MM]}.zip
// Ví dụ: HeyGeo_Mac_Arm_2026-03-12.zip
//         HeyGeo_Win_Intel_2026-03-16-12-21.zip
//
// Trang sẽ tự động hiển thị bản MỚI NHẤT của mỗi nền tảng.

interface PlatformConfig {
  platform: string;
  arch: string;
  icon: string;
  note: string;
}

/** Thứ tự hiển thị và metadata hiển thị cho từng platform key */
const PLATFORM_CONFIG: Record<string, PlatformConfig> = {
  Mac_Arm: {
    platform: 'macOS Apple Silicon',
    arch: 'M1 / M2 / M3 / M4',
    icon: '🍎',
    note: 'Yêu cầu macOS 13 Ventura trở lên',
  },
  Mac_Intel: {
    platform: 'macOS Intel',
    arch: 'Intel x86_64',
    icon: '🍎',
    note: 'Yêu cầu macOS 12 Monterey trở lên',
  },
  Win_Intel: {
    platform: 'Windows x64',
    arch: 'Intel / AMD 64-bit',
    icon: '🪟',
    note: 'Yêu cầu Windows 10 64-bit trở lên. Giải nén và chạy file .exe.',
  },
};

const PLATFORM_ORDER = ['Mac_Arm', 'Mac_Intel', 'Win_Intel'];

/** Các nền tảng chưa có build — hiển thị "Sắp có" */
const UNAVAILABLE: Release[] = [
  {

    platform: 'Linux',
    arch: 'x86_64 / arm64',
    icon: '🐧',
    filename: null,
    version: '—',
    available: false,
    note: 'Build từ mã nguồn (xem README)',
  },
];

/** Phân tích tên file → { platformKey, date } hoặc null nếu không đúng quy ước */
function parseBuildFilename(filename: string): { platformKey: string; date: string } | null {
  if (!filename.endsWith('.zip')) return null;
  const base = filename.slice(0, -4); // bỏ .zip
  const parts = base.split('_');
  if (parts[0] !== 'HeyGeo' || parts.length < 3) return null;

  // Tìm vị trí phần ngày: bắt đầu bằng 4 chữ số (năm)
  let dateIdx = -1;
  for (let i = 1; i < parts.length; i++) {
    if (/^\d{4}/.test(parts[i])) {
      dateIdx = i;
      break;
    }
  }
  if (dateIdx < 2) return null;

  const platformKey = parts.slice(1, dateIdx).join('_'); // vd: 'Mac_Arm', 'Win_Intel'
  const date = parts.slice(dateIdx).join('_');            // vd: '2026-03-16-12-21'
  return { platformKey, date };
}

/** Quét thư mục release/ và trả về danh sách bản build mới nhất mỗi nền tảng */
function getLatestBuilds(): Release[] {
  const releaseDir = path.join(process.cwd(), 'release');
  let files: string[] = [];
  try {
    files = fs.readdirSync(releaseDir).filter(f => f.endsWith('.zip'));
  } catch {
    files = [];
  }

  // Nhóm theo platform key
  const byPlatform: Record<string, string[]> = {};
  for (const file of files) {
    const parsed = parseBuildFilename(file);
    if (!parsed || !PLATFORM_CONFIG[parsed.platformKey]) continue;
    (byPlatform[parsed.platformKey] ??= []).push(file);
  }

  // Với mỗi platform, chọn bản mới nhất (sort lexicographic giảm dần theo date string)
  const available: Release[] = PLATFORM_ORDER
    .filter(key => byPlatform[key]?.length)
    .map(key => {
      const config = PLATFORM_CONFIG[key];
      const platformFiles = [...byPlatform[key]];
      platformFiles.sort((a, b) => {
        const da = parseBuildFilename(a)?.date ?? '';
        const db = parseBuildFilename(b)?.date ?? '';
        return db.localeCompare(da); // giảm dần → mới nhất đầu tiên
      });

      const latest = platformFiles[0];
      const dateStr = parseBuildFilename(latest)?.date ?? '—';
      const version = dateStr.length >= 10 ? dateStr.substring(0, 10) : dateStr;
      return { ...config, filename: latest, version, available: true };
    });

  return [...available, ...UNAVAILABLE];
}


export default function ReleasePage() {
  return <ReleaseContent releases={getLatestBuilds()} />;
}
