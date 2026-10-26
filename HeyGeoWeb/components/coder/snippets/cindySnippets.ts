// ══════════════════════════════════════════════════════════════════
// CindyJS Snippets – InsertMenu groups
// ══════════════════════════════════════════════════════════════════
import type { Group } from './types';

export const cindyBasicGroup: Group = {
  name: '📐 CindyJS Basic',
  categories: [
    {
      name: '⚙️ Canvas',
      items: [
        {
          label: 'Canvas cơ bản',
          code: `var instance = CindyJS({
  ports: [{ id: BOARDID, width: 600, height: 500, background: "rgb(255,255,255)" }],
  defaultAppearance: {
    dimDependent: 0.7,
    fontFamily: "sans-serif",
    lineSize: 1,
    pointSize: 5.0,
    textsize: 14.0,
  },
  angleUnit: "°",
  geometry: [],
  scripts: { cs_init: "init", cs_draw: "draw" },
  csconsole: false,
});
`,
        },
        {
          label: 'Canvas với lưới tọa độ',
          code: `var instance = CindyJS({
  ports: [{
    id: BOARDID,
    width: 600,
    height: 500,
    background: "rgb(245,245,250)",
    transform: [{ visibleRect: [-8, 8, 8, -8] }],
  }],
  defaultAppearance: { lineSize: 1, pointSize: 5 },
  angleUnit: "°",
  geometry: [],
  scripts: { cs_init: "init", cs_draw: "draw" },
  csconsole: false,
});
`,
        },
      ],
    },
    {
      name: '📍 Điểm',
      items: [
        {
          label: 'Điểm tự do (Free)',
          code: `{ name: "A", type: "Free", pos: [4, 1, 1], color: [1, 0, 0], labeled: true }`,
        },
        {
          label: 'Nhiều điểm tự do',
          code: `{ name: "A", type: "Free", pos: [4, -1, -1], color: [1, 0, 0], labeled: true },
{ name: "B", type: "Free", pos: [4, 2, -1], color: [1, 0, 0], labeled: true },
{ name: "C", type: "Free", pos: [4, 0.5, 2], color: [1, 0, 0], labeled: true },`,
        },
        {
          label: 'Điểm giao (Meet)',
          code: `{ name: "P", type: "Meet", args: ["line1", "line2"], color: [0.8, 0.2, 0], labeled: true }`,
        },
        {
          label: 'Trung điểm (Midpoint)',
          code: `{ name: "M", type: "Midpoint", args: ["A", "B"], color: [0.2, 0.6, 0.9], labeled: true }`,
        },
      ],
    },
    {
      name: '📏 Đường',
      items: [
        {
          label: 'Đoạn thẳng (Segment)',
          code: `{ name: "s", type: "Segment", args: ["A", "B"], color: [0, 0, 0.8] }`,
        },
        {
          label: 'Đường thẳng qua 2 điểm (Join)',
          code: `{ name: "l", type: "Join", args: ["A", "B"], color: [0.3, 0.3, 0.8] }`,
        },
        {
          label: 'Đường vuông góc (Orthogonal)',
          code: `{ name: "h", type: "Orthogonal", args: ["lineAB", "C"], color: [0.2, 0.7, 0.2] }`,
        },
        {
          label: 'Đường song song (Parallel)',
          code: `{ name: "p", type: "Parallel", args: ["lineAB", "C"], color: [0.5, 0.3, 0.8] }`,
        },
      ],
    },
    {
      name: '⭕ Hình tròn',
      items: [
        {
          label: 'Đường tròn qua tâm + điểm',
          code: `{ name: "c", type: "Circle", args: ["O", "A"], color: [0.8, 0.2, 0.2] }`,
        },
        {
          label: 'Đường tròn qua 3 điểm',
          code: `{ name: "cc", type: "CircleBy3", args: ["A", "B", "C"], color: [0.8, 0.2, 0.2] }`,
        },
      ],
    },
  ],
};

export const cindyScriptsGroup: Group = {
  name: '📜 Scripts',
  categories: [
    {
      name: '🖊 Init / Draw',
      items: [
        {
          label: 'Block init + draw',
          code: `<script id="cs_init" type="text/x-cindyscript">
// Chạy 1 lần khi khởi tạo
// Ví dụ: thiết lập biến, giá trị ban đầu
</script>

<script id="cs_draw" type="text/x-cindyscript">
// Chạy mỗi frame (liên tục)
// Ví dụ: vẽ, cập nhật hoạt họa
</script>
`,
        },
        {
          label: 'Vẽ văn bản',
          code: `drawtext((0, 0), "Hello CindyJS", size -> 16, color -> (0,0,0));`,
        },
        {
          label: 'Vẽ đường thẳng (CS)',
          code: `draw((x1, y1), (x2, y2), color -> (0.2, 0.4, 0.8), size -> 2);`,
        },
        {
          label: 'Vẽ hình tròn (CS)',
          code: `drawcircle((cx, cy), r, color -> (0.8, 0.2, 0.2), size -> 1.5);`,
        },
        {
          label: 'Tô đa giác (CS)',
          code: `fillPolygon([(x1,y1), (x2,y2), (x3,y3)], color -> (0.3, 0.6, 1.0), alpha -> 0.3);`,
        },
      ],
    },
    {
      name: '🖱 Mouse / Tick',
      items: [
        {
          label: 'Mouse down handler',
          code: `<script id="cs_mousedown" type="text/x-cindyscript">
println("mousedown at " + mouse());
</script>
`,
        },
        {
          label: 'Tick / Animation',
          code: `<script id="cs_tick" type="text/x-cindyscript">
// Gọi mỗi tick (~60fps) cho hoạt họa
t = t + 0.02;
</script>
`,
        },
      ],
    },
    {
      name: '📌 Ví dụ đầy đủ',
      items: [
        {
          label: 'Tam giác + đường cao',
          code: `var instance = CindyJS({
  ports: [{ id: BOARDID, width: 600, height: 500, background: "rgb(255,255,255)" }],
  defaultAppearance: { lineSize: 1.5, pointSize: 6, textsize: 14 },
  angleUnit: "°",
  geometry: [
    { name: "A", type: "Free", pos: [4, -3, -1.5], color: [1, 0, 0], labeled: true },
    { name: "B", type: "Free", pos: [4,  3, -1.5], color: [1, 0, 0], labeled: true },
    { name: "C", type: "Free", pos: [4,  0,  3  ], color: [1, 0, 0], labeled: true },
    { name: "AB", type: "Segment", args: ["A", "B"], color: [0, 0, 0.8] },
    { name: "BC", type: "Segment", args: ["B", "C"], color: [0, 0, 0.8] },
    { name: "CA", type: "Segment", args: ["C", "A"], color: [0, 0, 0.8] },
    { name: "lAB", type: "Join", args: ["A", "B"], color: [0.8, 0.8, 0.8], visible: false },
    { name: "lBC", type: "Join", args: ["B", "C"], color: [0.8, 0.8, 0.8], visible: false },
    { name: "lCA", type: "Join", args: ["C", "A"], color: [0.8, 0.8, 0.8], visible: false },
    { name: "hA", type: "Orthogonal", args: ["lBC", "A"], color: [0.2, 0.7, 0.2] },
    { name: "hB", type: "Orthogonal", args: ["lCA", "B"], color: [0.2, 0.7, 0.2] },
    { name: "H",  type: "Meet",       args: ["hA", "hB"], color: [0.8, 0.2, 0.8], labeled: true },
  ],
  csconsole: false,
});
`,
        },
        {
          label: 'Hoạt họa xoay điểm',
          code: `var instance = CindyJS({
  ports: [{ id: BOARDID, width: 600, height: 500, background: "rgb(240,245,255)" }],
  defaultAppearance: { lineSize: 2, pointSize: 6, textsize: 14 },
  angleUnit: "°",
  geometry: [],
  scripts: { cs_tick: "tick" },
  csconsole: false,
});
`,
        },
      ],
    },
  ],
};
