# GSP binary `.gsp` format (reverse-engineered)

Ground truth: `GSP-reference/gsp_examples/*.gsp` + matching Web Sketchpad
`*.json` exports (23 pairs). Validated by `gspFormatProbe.test.ts`
(count/id/kind/parent/page-size invariants hold on **all 23 files**).
Builds seen: `GSP5_m_3060N/Jan 8 2026` (headers L28) and older
`GSP4_M_0594/*2006` (headers L16 — same field offsets).

## Framing

- File starts with magic bytes `47 53 50 34` ("GSP4"), u32@4 = 28, u32@8 = 900.
- **Page size: u16 @ 0x1e = width, u16 @ 0x20 = height** (exact vs JSON).
- Every record: `u32LE dataLen, u16LE type, u16LE aux(=0)`, then `dataLen`
  payload bytes. All ints LE. Doubles = 8-byte LE IEEE754.

## Object region

- Starts at a file-dependent offset (t1–t3: 0x772, t4: 0x7d6, Dong_ho:
  0x188be, Puzzle: 0x324d8). Preceded by validly-framed settings records
  (902, 1000, 2399–2419, 9004, 9008, 1201/1203 fonts, 10002–10023,
  10020 palette idx+RGBA, 10040–10044 text styles).
- Find it: scan every offset for a frame with `type==2000 && dataLen ∈
  {16,28}`; pick the candidate whose frame-chain runs clean to EOF with the
  most records (ties → earliest offset).
- An object = one type-2000 header record through a type-2007 L0 terminator.
- **Object id = 1-based ordinal in file order == JSON object key** (all 23).
- After the last object: 9000(L4, objectCount e.g. 3 in t1) / 999 / 903 / 901
  (or 1001 L0, 903, 901; old build: 1204 L16, 1003, 903, 901), then trailer.

## Type-2000 object header (payload, L28 in GSP5 / L16 in old builds)

| offset | field |
|---|---|
| 0 | u16 geomCode (construction code, see table) |
| 2 | u16 flags2 — **hidden ⇔ flags2 != 0** (t4#14 hidden unit pt = 4) |
| 4 | u16 0 (opaque) |
| 6 | u16 opaque (small int; NOT parent count) |
| 8 | u16 **classId — primary kind discriminator** |
| 10 | u8 penCode: low nibble = width index; high nibble 1 = dashed (0x11/0x12), 0x21 = w1 solid, 0x22 = default, 0x20/0x23 seen |
| 11 | u8 family: 2 = point-like, 1 = stroke/text/button, 0 = old build |
| 12–14 | RGB color bytes direct (15 = 0 pad): `ff0000` red, `000080` navy, `0000ff` blue, `008000` green, `ff8000` button-orange, `606060` axis, `c0c0c0` coordsys |
| 16–27 | opaque tail (often `ffff` + u16s + `c1bd` …) |

## Record types inside objects

| type | meaning / payload layout |
|---|---|
| 2000 | object header (above) |
| 2002 | parents: `u32 count, u32 ids…` in constraint-specific order (segment/line/ray/circle = [p0,p1]; arc-around-point = [center,p0,p1]; parallel/perp = [point,line]; button = action targets). Ordinals = JSON ids. Multiset == JSON `parents` values on all 23 files. **Exception, measured on all 53 Move buttons: the binary alternates `[mover, destination, …]` where the paired JSON lists the very same ids reversed** — the exporter's own captions decide which end travels: "Move A → B" is binary [A,B] / JSON [B,A], "Move R -> O" is binary [R,O] / JSON [O,R]. Other button kinds keep the JSON order. |
| 2003 | value block: `u16 geomCodeDup, u16 unk(14/28), …doubles` (offsets below). On **animate button** (class 23): 36-byte state blob: `u16@0=62, u32@4 dirFlags (0x0 fwd+repeat, 0x20000000 both+repeat, 0x81______ no-repeat), f32@8 speedPx_s (24=rate3, 96=rate6), f32@12/@16 (time-interval related), f32@20=25600.0` |
| 2005 | label: 22-byte header, `u16 len @22`, UTF-8 @24, NUL. Auto-label starts `06 00 01 00 …` with labelOffsetX/Y = **i16 @6/@8** (t1: 8,5; t4 B: 0,-22). Named/text-style labels start `07 00` (or `04 00`/`06 00` on buttons) with 8-byte font token `986e12c1515c6141` @12. Presence of 2005 ⇔ JSON label shown. |
| 2007 | object terminator (L0) |
| 2008 | L2 u16 0–3; appears with labels; **NOT** point radius (unknown flag) |
| 2200/2211 | bounding rect: `u16 x1,y1,x2,y2` |
| 2201 | free-point coords: `f64 x, f64 y` (screen px, exact == JSON loc) |
| 2300 | text block: `[u32 2300][u32 innerLen][u32 4 kind][i16 x][i16 y][u16 strlen][MFS UTF-8][00]`. x/y may be **negative** (Banh_xe#100: −31,−136). MFS differs from JSON: binary `<VL<TCx…>>` vs JSON `<VL<T'…'>>`. |
| 2306 | locus/function-plot sampler sample data (**undecoded**) |
| 2307 | measurement display: same display header as 2300 (x,y = JSON geom.loc; text usually `<0>`), then `u16 0000, u16 0006, u16 @26, u32@28 precision` (t4: 2 == JSON style.precision) |
| 2308 | coordsys marker (L8, opaque) |
| 2309 | axis orientation: `u32` 1 = horizontal, 0 = vertical |
| 2310 | button action: `[u32 2310][u32 24][u32 12] [u16@12 actionKind: 0=hide/toggle,1=show,2=animate,3=move,7=present] [u16@14 subtype: toggle 6/7, present 0=simult/1=seq, move rate-token] [u32@16 (600 on Present)] [i16@20 x][i16@22 y]` — **x/y signed**, exact == JSON geom.loc |
| 2311 | number block (parameters AND calculations/functions): display header (=22 for `<0>`), then `u16@22 0, u16@24 6, u16@26 precision, u32@28 0, u32@32 2311, u32@36 restLen, u32@40 48, u16@44, u16@46=4, u16@48, u16@50=3, f64@52 step, f64@60 min, f64@68 max, f64@76 default, f64@84 1.0, tail u16s`. Verified: scalar default range −100..100 step .01 default 1; angle rad 0..2π step 5° default 45°; distance screen-units (1cm = 28.346456692913385) 0..100cm step 1cm. **Edited non-integer current values are NOT in these fields** (30°, 3cm absent) — unknown. On a Calculation the same block opens with the display placeholder and then holds the token stream decoded below (count at u16@44, precision at u16@28); a Function or Derivative keeps its own body instead. Those objects carry no 2307. |
| 2314 | IterateMap internals (**undecoded**) |
| 2216/2316/8004 | picture data on class 78 (**undecoded**) |
| 9006 | empty-ish records inside some objects; **NOT trace** (traced objects lack it) — unknown |

## 2003 offsets per construction code

Verified against the paired exports on every Rotate / Translate* / Dilate* object.

| code | construction | doubles |
|---|---|---|
| 16 | TranslateVector | none — the vector is parents [p0, p1] |
| 17 | TranslateFixXFixY | `@4` dx, `@24` dy, **already y-up** |
| 21 | TranslateFixDistFixAngle | `@4` sin θ, `@12` cos θ, `@20` −θ° (display), `@32` length in page px, `@40` the same length in the sketch's unit |
| 24 | TranslateMeasureDistFixAngle | fixed direction in `@4/@12/@20`, length is parent 1 |
| 26 | TranslateMeasureDistMeasureAngle | both read off the page, parents 1 and 2 |
| 27 | Rotate | `@4` sin θ, `@12` cos θ, `@20` −θ° |
| 29 | RotateMeasureAngle | fixed map unused; the angle is parent 2 |
| 30 | DilateFixFactor | `@4` factor |
| 33 | DilateMeasureFactor | the factor is parent 2 |
| 34 | Reflect | the mirror is parent 1 |

**Unit of a typed length.** `@32/@40` is the page-pixel-per-unit factor of the
sketch that wrote the file. It is 1 for a 72-dpi sketch and one of
`{72, 72/25.4, 720/25.4}×4/3` (point, mm, cm, inch) for a 96-dpi one, so a length
that is a physical unit at 96 dpi has to be multiplied back down. Distance and
angle units are an application preference and are **never stored per sketch**;
only the precision is.

**Element-level copies.** A transformed segment / line / ray / circle / arc /
polygon carries the same record and code as a transformed point, with the source
object as parent 0; every one of its defining points rides the same map.

## Points on a path (class 10, geomCode 15)

No 2201 anywhere — the position is the parameter. The 2003 block is 12 bytes for
a straight path and 20 for a circle or an arc:

- straight: `@4` = the parameter the export writes as `value` — a **ratio** along
  a segment, a signed **distance in the sketch's unit** along a line or a ray
  (a value of 2.7 or 5.5 on a 780-px page can only be centimetres).
- circle / arc: `@4` = cos 2πt, `@12` = sin 2πt, exact on all 34 points of the
  corpus. The pair gives the half of the turn, measured from the path's own
  radius point; `t` itself is not stored.

**The sketch's length unit**, in page pixels, is 28.3464567 (a 72-pixel-per-inch
centimetre) or 37.7952756 for a sketch written by a 96-dpi build. Any object with
a typed length (code 21, doubles at 32 as drawn and 40 as typed) says which: the
ratio is one of `{1, 28.3465, 283.465, 72}` for the first and the same figures
×4/3 for the second. With no such object the 72-dpi figure is assumed.

**How the importer places one.** A turn or a ratio becomes a plain pair of
numbers when the path's own points are in the file. When they are not (a line's
second point is very often constructed), the document keeps the reading instead —
`attrs.glide = {ratio} | {distance} | {turn}` — and the registry walks the path
the board has just built to find the point. That is the only way a distance
along a line can be placed, because the line's direction is the board's answer,
not the file's.

## Measurements (class 48 / 49 / 51)

A Measure object writes **no number**: the value is whatever the geometry works
out to. It also carries no 2003. What it does carry is the 2307 display block —
position (JSON `geom.loc`), a `<0>` placeholder, and the precision as u32 at
`consumed + 6` — and its parents in the order they were picked.

| (class, code) | constraint | parents | meaning |
|---|---|---|---|
| 48/49/51, 36 | MeasurementLength | 1 straight | length of a segment |
| 48/49/51, 37 | MeasurementDistance | 2 points | distance |
| 48/49/51, 38 | MeasurementDistance | point, straight | point-to-line |
| 48/49/51, 41 | MeasurementAngle | 3 points | angle, **vertex is the middle point** |
| 48/49/51, 43 | MeasurementArcAngle | 1 arc | sweep of an arc |
| 48/49/51, 46 | MeasurementRadius | 1 circle | radius |
| 48/49/51, 47 | MeasurementRatio | 2 straight / 3 points | ratio of two lengths / of three collinear points |
| 48/49/51, 65 / 87 | MeasureCoord / AnalyticSlope | + coordsys | skipped (needs an imported frame) |

**Calculations** have no 2307 either: their formula lives in the 2311 block.
After the display header (caption position at 12/14) the block keeps `u16@28` =
precision, `u16@44` = token count, and then the stream itself — the last
`2 × count` bytes, two bytes a token, **in the order the formula was typed**:

| class | value | print |
|---|---|---|
| 0x00 | 0–9, 10, 11, 12, 13 | digit, `.`, `(`, `)`, `π` (a number is spelled digit by digit) |
| 0x01 | 0 / 1 | unit: radians / degrees |
| 0x02 | 1 | unit: cm (other values not seen) |
| 0x10 | 0–4 | `+ - * / ^` |
| 0x20 | 0–12 | `sin cos tan asin acos atan abs sqrt ln log sgn round trunc` |
| 0x60 | N | operand `@N`, indexing record 2002's parent list |
| 0x70 | N | call the function held by operand N (no syntax here; such a formula is skipped) |

Verified by rebuilding all **1124** calculations of the 23 examples and
comparing them, character for character, with the formula the official export
writes for the same object.

**Functions** (class 57) and **Derivatives** (class 75) share the block but keep
a body of their own after the display header; their definition stays undecoded,
so they are skipped with a note.

## classId → kind (+ geomCode construction table)

| class | kind | geomCode seen |
|---|---|---|
| 4 | point | 0 Free; 16/17/21/24/26/34 Translate*; 27/28/29 Rotate; 30/33 Dilate; plus Reflect 34 |
| 10 | point | 15 PointOnPath |
| 11 | point | 1 Midpoint |
| 40 | point | 52 HorizontalUnitPoint, 54 UnitPointInternalSquare |
| 41 | point | 0 OriginPoint (free, has 2201) |
| 45 | point | 9/11/12/13/14 Intersection (slot index) |
| 56 | point | 67/69 PlottedPoint |
| 12 | line | 63 | 44 line | 7 Bisector | 46 line | 6 Parallel | 47 line | 5 Perpendicular |
| 13 | ray | 64 | 14 segment | 2 | 28 circle | 3 CircleFromTwoPoints, 4 CircleByRadius |
| 67 | arc | 79 ArcOnCircle, 80 ArcAroundPoint, 81 Arc3Points |
| 15/52/53/54/55 | polygon | 8 (vertex count 5/3/4/5/6) |
| 16/68/69 | interior | 10 CircleInterior / 82 ArcSector / 83 ArcSegment |
| 19 | text | 0 Caption | 59 text | 73 CompositeText, 90 Pegged |
| 79/80/81 | number | 0 (Scalar/Distance/Angle parameter) |
| 23 | button | 62 (Action) |
| 48/49/51 | measurement | 36/37/38/41/43/46/47/65/87 measures (table above); 48/0 = Calculation/Expression |
| 57 measurement | 0/71 Function | 75 measurement | 78 Derivative |
| 38 | other | Axis (2309) | 39 | other | 61 CoordSys (2308) |
| 42/43 | other | 35 Locus/Envelope sampler (2306) | 58 | other | 72 FunctionPlot |
| 64/65/78 | other | 89 IterateMap / 77 IterateImage / Picture |

## t1_free_points.gsp record map (L2278 file)

```
0x00  "GSP4" hdr (w780 @0x1e, h540 @0x20)
0x28  902 L478 | 0x20e 1006 | 0x216 1007 | 0x21e 903 | 0x226 902 L256
0x32e 1000 L36 | 0x35a.. 2400/2401/… L6 (label slot "mystery" = framed recs)
0x480 9004 L26 "GSP5_m_3060N/Jan  8 2026" | 0x4a2 9008 L4=0x48
0x4ae 1201 "Times New Roman" | 0x4c8 1203 | 0x4e4-0x516 10002-10007
0x520-0x5e4 10020 ×15 palette (u16 idx + RGBA) | 0x5f2-0x642 misc
0x64c-0x746 10044 ×6 text styles
objects @0x772:
  A  2000@0x772 L28 | 2005@0x796 L26 "A" off(8,5) | 2008@0x7b8 | 2201@0x7c2 (119,54) | 2007@0x7da
  B  2000@0x7e2      | 2005@0x806 "B" | 2008@0x828 | 2201@0x832 (106,139) | 2007@0x84a
  C  2000@0x852      | 2005@0x876 "C" | 2008@0x898 | 2201@0x8a2 (217,127) | 2007@0x8ba
0x8c2 9000 L4 = 3 | 999/903/901 | trailer u32 pairs (0x3e9/0x3eb, 0x387, 0x385) → EOF 0x8e6
```

## Open unknowns (parser keeps raw spans + unknownTypes)

2008 semantics; 9006; 2306 sampler samples; 2314 IterateMap; picture blobs
2216/2316/8004; non-integer current parameter values; the bodies of Function
(class 57) and Derivative (class 75) in 2311; unit tag 0x02 values other than
cm; the parameter of a point on a line or a ray (a distance, but in which
unit); move-button rate subtype vs JSON `rate`; header bytes 4/6/16–27; trace
rendering data (looks session-only).
