# ChangeLog — HeyGeo

Tất cả các thay đổi đáng chú ý của dự án HeyGeo được ghi lại theo thứ tự thời gian ngược (mới nhất trên cùng).

Định dạng: `[YYYY-MM-DD HH:MM]`  
Căn cứ theo múi giờ ICT (UTC+7) — Việt Nam.

---

## [2026-03-14] — HeyGeoWeb: Dynamic measure & calculator display

### Sửa bug

#### G_MEASURE hiển thị giá trị tĩnh trên web
- **Vấn đề**: Tất cả đo lường không thuộc hệ tọa độ (distance, length, radius, angle, ratio, slope) xuất ra văn bản tĩnh. Khi kéo điểm, giá trị không cập nhật.
- **Sửa**: Thêm helper `measureNumExprJs()` tạo biểu thức JS động dùng `board.objects[...].X()/.Y()/.Radius()/.point1/.point2` cho từng kiểu đo lường. Wrapper `measureToJsFunc()` đóng gói thành `function(){return 'AB = '+expr.toFixed(2)+' cm';}` để JSXGraph gọi tự động mỗi lần board cập nhật.

#### G_CALCULATE chỉ hiển thị số (thiếu nhãn công thức)
- **Vấn đề**: `displayText` của `G_calculateObject` chỉ chứa giá trị số ("2.36"), không có nhãn công thức ("AB + CD = 2.36 cm").
- **Sửa**: (1) Thêm helper `expandCalcLabel()` khai triển chuỗi công thức (REFERENCE_NUM chars → parent labels) để tạo nhãn đọc được. (2) Mở rộng `calcFormulaToJs()` nhận thêm tham số `cmF` và xử lý cả parent `G_MEASURE` (dùng `measureNumExprJs()`). (3) Static fallback hiển thị `"formula = value"` thay vì chỉ `"value"`.

### Chi tiết kỹ thuật
- Hệ tọa độ: JSXGraph dùng y hướng lên, HeyGeo dùng y hướng xuống. Góc chuyển đổi: `atan2(-dy_jsx, dx)` thay gốc `atan2(dy_screen, dx)`.
- `cmF = SCALE * G_cmPerPixel()` (cm/JSXGraph unit) nhúng như hằng số export-time.
- Angle formula: `((-(a2-a0)+4π)%(2π))*180/π` khớp với desktop `fmod(-value+4π, 2π)*180/π`.
- Slope formula: `dy_jsx/dx_jsx` = độ dốc toán học = giá trị desktop (y-flip triệt tiêu dấu âm trước `p.getY()`).

### Files changed
- `src/app/HeyGeoWebExporter.cpp` — Thay thế `calcFormulaToJs()` (mở rộng hỗ trợ G_MEASURE parents); thêm `expandCalcLabel()`, `measureNumExprJs()`, `measureToJsFunc()`; tái cấu trúc `case G_MEASURE: case G_CALCULATE:` trong `appendElements()`.

---

## [2026-03-12] — Calculator: Color, Unit type cho phép tính lồng nhau

### Sửa lỗi

#### Màu sắc không áp dụng được cho biểu thức tính toán
- **Vấn đề**: Display → Color không đổi màu biểu thức đo lường / tính toán trên sketch. `G_valueObject::draw()` đặt màu pen đúng nhưng `KFormula::redraw()` luôn dùng `foreColor` nội bộ (mặc định đen) khi vẽ từng `box`, ghi đè lại màu đó.
- **Sửa**: Trong `G_valueObject::draw()` (`src/geometry/G_measureObject.cpp`), gọi `text.setForeColor(drawColor)` trước `text.redraw(p)` để `KFormula` theo màu drawstyle của ref.

#### Đơn vị sai khi dùng kết quả tính toán trong công thức mới
- **Vấn đề**: Khi dùng một `G_calculateObject` (ví dụ: `AD·AB = 37.24 cm²`) làm tham chiếu trong công thức kế tiếp, `getUnitType()` trả về dimensionless vì chỉ kiểm tra `G_MEASURE`. Hệ quả: `AD·AB / 1cm` hiển thị đơn vị `cm` thay vì `cm²/cm = cm`.
- **Sửa**: Thêm nhánh `G_CALCULATE` vào cả hai `CalculationReferenceFetcher` (`G_calculateObject.cpp`) và `CalculationDialogReferenceFetcher` (`HeyGeoCalculateEditor.cpp`): nếu ref là `G_CALCULATE`, gọi `getLhs()->evaluateUnit()` để lấy đúng kiểu đơn vị của công thức con.

### Files changed
- `src/geometry/G_measureObject.cpp` — `G_valueObject::draw()`: đồng bộ `foreColor` với drawstyle.
- `src/geometry/G_calculateObject.cpp` — `CalculationReferenceFetcher::getUnitType()`: xử lý `G_CALCULATE`.
- `src/app/HeyGeoCalculateEditor.cpp` — `CalculationDialogReferenceFetcher::getUnitType()`: xử lý `G_CALCULATE`.

---

## [2026-03-12] — Calculator: sửa lỗi CAT node trong evaluateUnit

### Sửa lỗi

#### `AD / 1cm` hiển thị đơn vị `cm` thay vì số thuần
- **Vấn đề**: `evaluateUnit()` trong `formula/kformula.cpp`, case `CAT` (implicit multiplication), kiểm tra `if (!b->b1 || b->b1->type != TEXT)` trước khi tra tên hàm. TEXT node `"1"` (chữ số người dùng nhập) thoả điều kiện TEXT, bị xử lý như tên hàm, không khớp tên nào → trả về dimensionless. Kết quả: `1cm` = CAT(TEXT"1", TEXT"cm") → dimensionless, khiến `AD / 1cm` = L − 0 = L (có đơn vị cm thay vì vô đơn vị).
- **Sửa**: Đảo logic — kiểm tra xem b1 có phải *tên hàm đã biết* không; nếu không → tính như phép nhân ngầm giữa hai toán hạng (`{u1.L + u2.L, u1.A + u2.A}`).

### Files changed
- `formula/kformula.cpp` — `KFormula::evaluateUnit()`, case `CAT`: cấu trúc lại logic phân biệt function call vs. implicit multiplication.

---

## [2026-03-12] — Calculator: menu Units, Toán tử spacing, Hỗ trợ đơn vị cm/in/px/deg/rad

### Tính năng

#### Menu "Units ▼" trong Calculator (kiểu GSP)
- Thêm nút **Units ▼** vào cột trái của Calculator dialog, ngay dưới "Functions ▼".
- Menu gồm: **cm** · **in** · **px** (phân cách) · **°** · **rad** — click chèn token đơn vị vào vị trí con trỏ công thức.
- Đơn vị hoạt động như hằng số nhân: `5 in` = 5 × 2.54 = 12.7 cm; `2 rad` = 2 × (180/π) = 114.59°.

#### Phân tích chiều (dimensional analysis) cho token đơn vị
- `evaluateUnit()` nhận diện TEXT node "cm"/"in"/"px" → `UnitType::length()`; "deg"/"rad" → `UnitType::angle()`.
- Cho phép kiểm tra chiều tự động: `AD / 1cm` → dimensionless; `5 in + 3 cm` → length; `AD * AB` → cm².

#### Truyền biến đơn vị vào evaluate()
- Cả `G_calculateObject::calculate()` (sketch) và `updateValue()` (live preview trong dialog) đều truyền hash `{"cm":1, "in":2.54, "px":G_cmPerPixel(), "deg":1, "rad":180/π}` vào `evaluate()`.

### Sửa lỗi

#### Khoảng cách toán tử `+` / `−` quá chật
- Padding hai bên toán tử PLUS / MINUS trong `formula/box.cpp` tăng từ 1px/3px lên `SPACE` (4px) đồng đều cả hai phía.

### Files changed
- `src/app/HeyGeoCalculateEditor.H` — thêm `unitsBtn`, `showUnitsMenu()`, `buildUnitsMenu()`.
- `src/app/HeyGeoCalculateEditor.cpp` — nút Units, `buildUnitsMenu()`, `showUnitsMenu()`; unit vars trong `updateValue()`; `getUnitType()` xử lý `G_CALCULATE`.
- `src/geometry/G_calculateObject.cpp` — `calculate()`: truyền unit vars vào `evaluate()`.
- `src/geometry/G_measureObject.cpp` — `G_cmPerPixel()`: bỏ `static`, expose ra ngoài.
- `src/geometry/G_object.H` — khai báo `double G_cmPerPixel()`.
- `formula/kformula.cpp` — `evaluateUnit()`: nhận diện token đơn vị cho TEXT node.
- `formula/box.cpp` — PLUS/MINUS padding: 1px/3px → 4px/4px.

---

## [2026-03-11] — GSP-style hover highlight cho các công cụ dựng hình

### Tính năng
Khi đang dùng các công cụ dựng hình (Point, Segment, Ray, Line, Compass, Polygon…), di chuột đến gần đối tượng sẽ kích hoạt hiệu ứng highlight kiểu GSP:

- **Đối tượng được snap tới sáng lên màu đỏ tươi** với độ dày nét tăng nhẹ.
- **Shadow mờ dần (soft glow) bao quanh** từng loại đối tượng:
  - *Điểm*: `QRadialGradient` tạo vành halo tối đỉnh tại cạnh điểm, mờ dần vào trong và ra ngoài.
  - *Đường thẳng / đoạn / tia*: 3 stroke pass chồng nhau (rộng→hẹp, mờ→đậm) tạo gradient bao quanh hai bên.
  - *Đường tròn*: tương tự, halo bên trong và bên ngoài vòng tròn.
- **Giao điểm hai đường**: khi con trỏ gần giao của hai đường (thẳng hoặc tròn), cả hai sáng lên đồng thời, kèm hình thoi nhỏ ◇ chỉ vị trí giao dự kiến.
- **Điểm luôn nằm trước**: sau khi vẽ highlight, toàn bộ điểm hiển thị được vẽ lại lên trên cùng để không bị nét đỏ che khuất (đúng thứ tự z-order của GSP).

### Files changed
- `src/app/HeyGeoView.H`
  - Thêm 3 thành viên: `toolHoveredRefs` (G_refs), `toolHoveredIsIntersection` (bool), khai báo `drawToolHoverHighlight(QPainter &)`.
- `src/app/HeyGeoView.cpp`
  - Khởi tạo `toolHoveredIsIntersection = false` trong constructor.
  - `mouseMoveEvent()`: phát hiện snap target (điểm ưu tiên, sau đó curve đơn, rồi hai curve → intersection), lưu vào `toolHoveredRefs`, trigger `repaint()` khi thay đổi.
  - `paintEvent()`: gọi `drawToolHoverHighlight(p)` sau `drawToolRubberband(p)`.
  - `setToolMode()` / `cancelCurrentTool()`: xóa `toolHoveredRefs` khi đổi/huỷ tool.
  - Thêm hàm `drawToolHoverHighlight()` với soft-glow multi-pass rendering.
- `src/app/HeyGeoDocument.H`
  - Thêm accessor `getAllRefs()` để `HeyGeoView` vẽ lại điểm sau highlight.

---

## [2026-03-10] — Sửa lỗi Arc through 3 Points không select được

### Vấn đề
Sau khi dựng cung tròn qua 3 điểm (Construct → Arc through 3 Points), cung không select được khi click vào, dẫn đến không thể thực hiện bất kỳ phép dựng nào tiếp theo (Center Point, Endpoints, Arc Sector, Intersection...).

### Nguyên nhân
Trong `G_arc::getExtents()` (`src/geometry/G_arc.cpp`), hai trường hợp tính giá trị tối đa của bounding box sử dụng **C++ comma operator** thay vì `qMax()`:

```cpp
// Lỗi — dùng comma operator: C++ bỏ e1, chỉ gán e2
else x2 = (e1.getX(), e2.getX());
else y2 = (e1.getY(), e2.getY());
```

Comma operator làm cho bounding box bị tính sai (rất nhỏ hoặc lệch), khiến `getSelectExtents().contains(click_point)` trong `whatAmIOn()` trả về `false` → click không nhận ra arc → arc không select được.

### Giải pháp
Thay comma operator bằng `qMax()`:

```cpp
else x2 = qMax(e1.getX(), e2.getX());
else y2 = qMax(e1.getY(), e2.getY());
```

### Files changed
- `src/geometry/G_arc.cpp` — `G_arc::getExtents()`: sửa hai dòng dùng comma operator thành `qMax()`.

---

## [2026-03-10] — Grid Form submenu (Polar / Square / Rectangular / Trig) + Trục Ox/Oy là G_LINE

### Added / Changed

#### Grid Form submenu (GSP-style)
- **`Graph → Grid Form`** trở thành submenu với 4 lựa chọn checkable (radio-style):
  - **Polar Grid** — vòng tròn đồng tâm (bán kính nguyên) + 12 đường xuyên tâm mỗi 30°; nhãn bán kính cạnh phải.
  - **Square Grid** *(mặc định)* — tỷ lệ x/y bằng nhau, tick và lưới vuông vắn như GSP.
  - **Rectangular Grid** — tỷ lệ x/y độc lập; điểm V (0,1) hiển thị để kéo lên/xuống đổi đơn vị trục Oy.
  - **Trigonometric Axis** — trục x nhãn bội số π (π/6, π/4, ..., 2π); trục y số thực thông thường.
- Mục cũ "Grid Form" (toggle grid) đổi tên thành **"Hide/Show Grid"** và giữ chức năng.

#### Điểm V — đơn vị trục Oy (`G_VERTICAL_POINT`)
- Kiểu điểm ràng buộc mới, đối xứng với `G_HORIZONTAL_POINT`: luôn bám O theo phương dọc (`x = parent.x`), `dy ≥ 10 px`.
- Tạo tự động khi `New Coordinate System`, **ẩn hoàn toàn** theo mặc định (Square Grid).
- Chỉ hiện khi chuyển sang **Rectangular Grid**; ẩn lại khi bỏ chế độ đó.
- `G_COORDSYS` nhận V làm `par[2]`; `update()` tính `scaleY = dist(O, V)` để vẽ tick trục y độc lập.

#### Trục Ox, Oy là đối tượng hình học (G_LINE)
- Mỗi hệ tọa độ mới gồm 2 đường `G_LINE` (xAxis = O→U, yAxis = O→V).
- Có thể **chọn (Select)** và **dựng điểm trên trục** bằng Point Tool như mọi G_LINE khác.
- `G_coordsys::draw()` chỉ vẽ đầu mũi tên + tick + nhãn; đường trục do `G_LINE` tự vẽ.

### Files changed
- `src/defs.H` — thêm `G_VERTICAL_POINT` vào `enum G_PointType`
- `src/geometry/G_coordsys.H` — thêm `enum GridForm`, field `m_scaleY`, `m_gridForm`, cập nhật API
- `src/geometry/G_coordsys.cpp` — `draw()`: dispatch theo GridForm; `save()`/`load()`: thêm `m_scaleY`, `m_gridForm`
- `src/geometry/G_graphObjects.cpp` — `update()`: tính `scaleY` từ `par[2]` khi RECTANGULAR_GRID
- `src/geometry/G_pointObject.cpp` — `update()`/`save()`/`load()`: case `G_VERTICAL_POINT`
- `src/geometry/G_object.H` — `resetP()`: thêm `G_VERTICAL_POINT`
- `src/app/BuildReverse.cpp` + `HeyGeoView.cpp` — drag: nhận diện `G_VERTICAL_POINT`
- `src/app/menu.cpp` — `graphNewCoordSys()`: tạo V (ẩn, par[2]); 4 handler `graphGridFormXxx()`; `applyGridForm()` show/hide V
- `src/app/HeyGeoDocument.H` — khai báo `getCurrentGridForm()`, 4 slot `graphGridFormXxx()`
- `src/app/HeyGeoMenus.cpp` — class `GridFormInfo` + `HeyGeoGridFormMenuMaintainer`; thay PCInfo "Grid Form" bằng submenu + "Hide/Show Grid"

---

## [2026-03-10] — Quỹ tích động trên Web: điểm locus (tracecurve) + bao hình đường thẳng (objectlocus)

### Vấn đề ban đầu
Khi export sang JSXGraph (HeyGeo Web), quỹ tích (`G_LOCUS`) bị mất hoặc hiển thị sai:
- **Tất cả 150 điểm snapshot có cùng tọa độ** — do `G_LINE.getExtents()` trả về hình chữ nhật sentinel (`-1000000,−1000000` / `2000000×2000000`), lấy trung tâm cho ra pixel(0,0) → tọa độ JSXGraph không đổi.
- **Starburst pattern** — sửa lần đầu dùng foot-of-perpendicular từ viewport center, nhưng mọi đường thẳng đều hội tụ về tâm.
- Thiếu `curveType: 'plot'` → JSXGraph bỏ qua curve khi parents là mảng số.
- `null` separator trong mảng → JavaScript `null` không phải `NaN` → JSXGraph không nhấc bút.

### Giải pháp cuối cùng

#### 1. Quỹ tích điểm — JSXGraph `tracecurve` (động hoàn toàn)
Khi `par[0]` là `G_CONSTRAINED_POINT` (glider) và `par[1]` là `G_POINT` (điểm truy vết):
- Export `{ "type": "tracecurve", "parents": [gliderId, traceId], "attrs": { "numberPoints": 300 } }`.
- JSXGraph built-in `tracecurve` di chuyển glider dọc theo slideObject, cập nhật toàn bộ chuỗi phụ thuộc, ghi lại tọa độ của điểm truy vết → hoàn toàn động, cập nhật khi kéo bất kỳ đối tượng cha nào.

#### 2. Bao hình đường thẳng — custom `objectlocus` (động)

**Nghiên cứu GSP/WSP — cách GSP giải quyết:**
- File GSP JSON: `{ "kind": "Sampler", "genus": "Envelope" }` với `drivenObject` (đường thẳng d), `driverObject` (điểm C trên đường tròn), `domainObject` (đường tròn), `numSamples: 58`.
- **Web Sketchpad (`wsp.js`)** — `GSP.gConstraints.GeomLocus` (line 56642) kế thừa `Locus` → `DriveChain`:
  1. `DriveChain.updateConstraintAncestry()`: **clone toàn bộ chuỗi phụ thuộc** từ driverObject đến drivenObject bằng `sketch.cloneGObjects(toClone)`.
  2. `GeomLocus.prepareDriverWalkInfo()`: tạo mảng `numSamples` vị trí đều nhau trên `domainObject` (đường tròn) bằng `drivePath.mapVectorPathValuesToPositions(pathValues)`.
  3. `Locus.constrain()`: loop `numSamples` lần — đặt `clonedDriver.geom.loc = positions[i]` → `sketch.constrainDriveChain(driveChain)` → cloned `drivenObject` (Straight/Line) tự tạo `vectorContext` và ghi geometry của mình bằng `fillSingleSample()`.
  4. Cloned driven object có thể là **bất kỳ loại geometry nào** (Point, Straight, Circle…) — mỗi loại implement `createVectorContext()` và `fillSingleSample()` riêng.
- **Điểm mấu chốt**: WSP clone toàn bộ chain để **không làm bẩn** board thật; sau đó sample độc lập trên chain clone.

**Giải pháp trong HeyGeo Web — mirror thuật toán WSP trực tiếp trong JSXGraph:**

JSXGraph không có built-in `tracecurve` cho line-object (chỉ hỗ trợ point). Ta tạo custom element `objectlocus`:

- **C++ exporter** (`HeyGeoWebExporter.cpp`): khi `par[1]` là `G_LINE`, export:
  ```json
  { "type": "objectlocus", "parents": ["gliderId", "drivenLineId"], "attrs": { "numberPoints": 150 } }
  ```
- **JSXGraphViewer.tsx**: handler `objectlocus` tạo JSXGraph `curve` với custom `updateDataArray`:
  1. Loop `numberPoints` lần qua `glider.slideObject.minX()` → `maxX()` (giống `tracecurve` nội bộ của JSXGraph, xem `jsxgraph/src/base/curve.js` line 2610).
  2. `glider.setPositionDirectly(COORDS_BY_USER, [x, y])` tại mỗi bước.
  3. Cập nhật chuỗi phụ thuộc từ glider → drivenLine theo thứ tự insertion (duyệt `board.objects`) — **không cần clone** vì JSXGraph update là synchronous và ta restore sau loop.
  4. Đọc `drivenLine.stdform` (`[c0, c1, c2]` với `c0 + c1·x + c2·y = 0`) → hướng đường `(-c2, c1)`, base point = `drivenLine.point1` (luôn là điểm finite ngay cả khi `point2` là ideal point ở vô cực).
  5. Extend ±15 board-units để tạo đoạn thẳng hữu hạn, nối bằng `NaN` separator.
  6. Restore `glider.position` và re-constrain chain.

**Tại sao dùng `stdform` thay vì `point1`/`point2` của line?**
- JSXGraph `normal` (perpendicular line) có `point2` là ideal point với tọa độ `Infinity` — không thể dùng để compute endpoint.
- `stdform[1] = c1`, `stdform[2] = c2` luôn hữu hạn và cho direction vector `(-c2, c1)` chính xác.

### Files changed
- `src/app/HeyGeoWebExporter.cpp` — G_LOCUS case: thêm nhánh `tracecurve` (G_POINT) và `objectlocus` (G_LINE) trước static snapshot fallback.
- `HeyGeoWeb/components/JSXGraphViewer.tsx`:
  - Thêm handler `objectlocus` với `updateDataArray` custom mirror thuật toán WSP GeomLocus.
  - Convert `null → NaN` trong parents mapping cho curve plot separator.

### Bài học kinh nghiệm
- **Luôn đọc nguồn gốc** (`wsp.js`) trước khi implement — thuật toán DriveChain/GeomLocus của WSP rất chuẩn và có thể mirror trực tiếp vào JSXGraph mà không cần clone chain.
- **`stdform`** là API bền vững nhất của JSXGraph Line — không bị ảnh hưởng bởi kiểu line (two-point, parallel, normal/perpendicular).
- **`tracecurve` nội bộ JSXGraph** (curve.js line ~2610) là template tuyệt vời: loop glider position → `setPositionDirectly` → update objects in insertion order → record → restore.
- **Không dùng `getExtents()`** của `G_LINE` cho bất kỳ mục đích tọa độ nào — trả về sentinel rect vô hạn.
- JSXGraph `objectlocus` là **fully dynamic**: kéo bất kỳ điểm cha nào (D, A, B, đường tròn) đều tính lại bao hình tức thì.

---

## [2026-03-09] — Hiển thị đo đạc theo phong cách GSP (đơn vị cm, ký hiệu chuẩn)

### Changed
- **Format nhãn đo đạc (lhs)** — bỏ tiền tố dài, bắt chước GSP:
  - Distance: `Distance A B` → `AB` (tên hai điểm ghép liền)
  - Length: `Length s_(1)` → `s_(1)` (chỉ tên đối tượng)
  - Angle: `Angle BAC` → `m∠BAC` (ký hiệu m∠ chuẩn)
  - Ratio: `Ratio AB/CD` → `AB/CD` (không có tiền tố)
- **Giá trị có đơn vị vật lý** — tính từ DPI vật lý màn hình (`QScreen::physicalDotsPerInchX()` / `devicePixelRatio()`):
  - Distance / Length / Radius: hiển thị **cm**, 2 chữ số thập phân (VD: `AB = 2.36 cm`)
  - Angle: hiển thị **°** (ký hiệu Unicode U+00B0), 2 chữ số thập phân
  - Area: hiển thị **cm²** (U+00B2)
  - Ratio / Slope / tọa độ: dimensionless, 2 chữ số thập phân
- **`G_valueObject::displayText`** — thêm trường `QString displayText` lưu chuỗi plain-text đầy đủ (VD: `"AB = 2.36 cm"`) dùng cho JSXGraph export; getter `getDisplayText()` và `getPos()` được thêm vào public API.
- **JSXGraph export G_MEASURE** — `HeyGeoWebExporter` nay dùng `valObj->getPos()` (vị trí thực của text object) và `valObj->getDisplayText()` (chuỗi GSP-style) thay vì `ref->getLabel().getText()` (luôn là `"M1"` / `"M2"`...).
- **`G_pointObject::update()` drag fix** — `BuildReverse` và `HeyGeoView` mouseMoveEvent được cập nhật để nhận diện `G_HORIZONTAL_POINT` như một loại điểm ràng buộc có thể kéo (tương tự `G_CONSTRAINED_POINT`), cho phép điểm U trên hệ trục tọa độ có thể kéo để co dãn đơn vị.

### Files changed
- `src/geometry/G_measureObject.cpp` — `updatelhs()`: đổi format nhãn; `G_measureObject::update()`: thêm đơn vị cm/°/cm², `displayText`; `G_valueObject::update()`: bỏ 4 chữ số về 2 chữ số; thêm `#include <QScreen>`
- `src/geometry/G_object.H` — thêm `displayText`, `getDisplayText()`, `getPos()` vào `G_valueObject`
- `src/app/HeyGeoWebExporter.cpp` — G_MEASURE/G_CALCULATE case: dùng `getPos()` + `getDisplayText()`
- `src/app/BuildReverse.cpp` — check `G_HORIZONTAL_POINT` cho single-constrained-point shortcut
- `src/app/HeyGeoView.cpp` — mouseMoveEvent: thêm `G_HORIZONTAL_POINT` vào điều kiện drag

---

## [2026-03-09] — Hệ trục toạ độ tương tác: điểm O và U

### Added
- **`G_HORIZONTAL_POINT`** — kiểu điểm ràng buộc ngang mới trong enum `G_PointType` (defs.H):
  - Luôn bám theo cha (điểm O) theo phương ngang: `y = parent.y`
  - Khoảng cách `dx = x − parent.x` luôn ≥ 10 px (không cho vượt qua O)
  - Serialization: lưu/đọc `p` (khoảng cách dx) giống `G_CONSTRAINED_POINT`
- **Điểm O (Origin)** — điểm tự do biểu diễn gốc hệ tọa độ; kéo O kéo toàn bộ hệ trục theo.
- **Điểm U (Unit)** — điểm `G_HORIZONTAL_POINT` con của O; kéo U co dãn đơn vị trục X; nhãn ẩn (`setLabelVisible(false)`).
- **Bỏ nhãn "O" cứng** trong `G_coordsys::draw()` — không còn vẽ chuỗi "O" tại gốc; điểm O tự hiển thị nhãn như mọi điểm khác.

### Files changed
- `src/defs.H` — thêm `G_HORIZONTAL_POINT` vào `enum G_PointType`
- `src/geometry/G_pointObject.cpp` — `update()`: case `G_HORIZONTAL_POINT`; `save()`/`load()`: serialize p; `resetP()`
- `src/geometry/G_object.H` — `resetP()`: thêm điều kiện `G_HORIZONTAL_POINT`
- `src/geometry/G_coordsys.cpp` — `draw()`: bỏ `p.drawText(..., "O")`
- `src/app/menu.cpp` — `graphNewCoordSys()`: tạo điểm U với `G_HORIZONTAL_POINT`, O là parent, ẩn nhãn U

---

## [2026-03-09] — Menu Measure: Tọa độ, Hoành độ, Tung độ, Phương trình

### Added
- **`Measure > Coordinates`** (`G_COORDINATES_MEASURE`) — hiển thị `P = (x; y)` trong hệ tọa độ hiện tại.
- **`Measure > Abscissa x`** (`G_ABSCISSA_MEASURE`) — hiển thị `x_P = val`.
- **`Measure > Ordinate y`** (`G_ORDINATE_MEASURE`) — hiển thị `y_P = val`.
- **`Measure > Equation`** (`G_EQUATION_MEASURE`) — hiển thị phương trình đường thẳng/đoạn/tia dạng `Ax + By + C = 0`, hoặc phương trình đường tròn dạng `(x-h)²+(y-k)²=r²`.
- Bốn loại đo trên yêu cầu có `G_COORDSYS` trong document; giá trị được tính qua `G_coordsys::screenToMath()`.

### Files changed
- `src/defs.H` — thêm 4 enum vào `G_MeasureType`
- `src/geometry/G_measureObject.cpp` — `calculate()` + `updatelhs()` + `update()`: xử lý 4 loại mới
- `src/app/cans.cpp` — thêm `canMeasureCoordinates()`, `canMeasureAbscissa()`, `canMeasureOrdinate()`, `canMeasureEquation()`
- `src/app/menu.cpp` — thêm `measureCoordinates()`, `measureAbscissa()`, `measureOrdinate()`, `measureEquation()`
- `src/app/HeyGeoDocument.H` — khai báo các can + slot mới
- `src/app/HeyGeoMenus.cpp` — nối dây 4 menu item mới vào Measure menu

---

## [2026-03-09] — Graph Menu: Hệ trục tọa độ, hàm số, đường tham số

### Added
- **`Graph > New Coordinate System`** — tạo hệ trục tọa độ (`G_COORDSYS`) với gốc O và điểm đơn vị U; hỗ trợ kéo O (di chuyển hệ trục) và kéo U (đổi tỷ lệ đơn vị).
- **`Graph > Define Axes...`** — dialog cấu hình nhãn trục X/Y cho `G_COORDSYS`.
- **`Graph > New Function...`** — dialog nhập biểu thức `f(x)`, tạo đối tượng `G_FUNCTION` (ẩn, làm cha cho đồ thị).
- **`Graph > Plot Function`** — vẽ đồ thị `y = f(x)` trên hệ trục tọa độ (`G_FUNCTIONPLOT`).
- **`Graph > Plot Curve`** — vẽ đường tham số `(x(t), y(t))` (`G_PARAMCURVE`).
- **`Graph > Plot As (x, y)`** — đặt một điểm lên hệ tọa độ theo giá trị đo (x, y).
- **`Graph > Plot Value on Axis`** — đặt điểm lên trục X theo một giá trị đo.
- **`Graph > Grid Form`** — toggle hiển thị lưới tọa độ.
- **`Graph > Snap Points`** — toggle snapping điểm vào lưới.
- **Các kiểu đối tượng mới**: `G_COORDSYS`, `G_FUNCTION`, `G_FUNCTIONPLOT`, `G_PARAMCURVE` trong `enum G_refType` (`defs.H`).
- **JSXGraph export**: tất cả kiểu trên đều được xuất sang JSXGraph JSON (`HeyGeoWebExporter`).

### Files changed
- `src/defs.H` — thêm `G_COORDSYS`, `G_FUNCTION`, `G_FUNCTIONPLOT`, `G_PARAMCURVE`; cập nhật `G_GEOMETRIC`, `G_VALUE`
- `src/geometry/G_coordsys.H/.cpp` — `G_coordsys`, `G_coordsysObject` (origin, scale, grid, snap, math↔screen)
- `src/geometry/G_function.H/.cpp` — `G_functionDef`, `G_functionObject`, `G_functionPlotObject`, `G_paramCurveObject`; `G_functionDef::toJavaScript()`
- `src/geometry/G_graphObjects.cpp` — draw, update, save/load cho FUNCTIONPLOT và PARAMCURVE
- `src/app/HeyGeoGraphDialogs.H/.cpp` — `HeyGeoCoordSysDialog`, `HeyGeoNewFunctionDialog`, `HeyGeoPlotFunctionDialog`, `HeyGeoPlotCurveDialog`
- `src/app/menu.cpp` — implement tất cả Graph handlers
- `src/app/cans.cpp` — implement tất cả `canGraph*()` predicates
- `src/app/HeyGeoDocument.H` — khai báo Graph slots và can-functions
- `src/app/HeyGeoMenus.cpp` — `HeyGeoGraphMenuMaintainer` nối dây toàn bộ Graph menu
- `src/geometry/G_ref.cpp` — `createObject()`: xử lý 4 kiểu mới
- `src/app/HeyGeoWebExporter.cpp` — xuất G_COORDSYS (axes + ticks), G_FUNCTION (skip), G_FUNCTIONPLOT (`functiongraph`), G_PARAMCURVE (`curve`)
- `heygeo.pro` — thêm các file nguồn mới

---

## [2026-03-10] — Hoàn thiện Menu Display (Color, Line Style, Point Style, Font)

### Fixed
- **`G_drawstyle::match()` — mất pen & brush khi tạo drawstyle mới** (`src/geometry/G_drawstyle.cpp`)  
  Một lỗi do chỉnh sửa trước đây đã vô tình xoá hai dòng gán `pen` và `brush` cho drawstyle mới tạo. Hậu quả: mọi yêu cầu đổi màu/kiểu nét đều bị bỏ qua vì drawstyle mới luôn dùng màu đen mặc định.  
  → Khôi phục lại:
  ```cpp
  if(p != 0) newDrawstyle->pen = *p; else newDrawstyle->pen = QPen();
  if(b != 0) newDrawstyle->brush = *b; else newDrawstyle->brush = QBrush(Qt::black, Qt::Dense4Pattern);
  ```

- **`canEditChangeLinestyle()` — quá nghiêm ngặt** (`src/app/cans.cpp`)  
  Trước đây yêu cầu **tất cả** đối tượng được chọn đều phải là `G_CURVE | G_LOCUS`. Nếu chọn hỗn hợp (đường + điểm) thì toàn bộ menu Line Style bị vô hiệu.  
  → Đổi sang: cho phép nếu **ít nhất một** đối tượng được chọn là `G_CURVE | G_LOCUS`.

- **`getCurrentPenstyle()` / `getCurrentPenWidth()`** (`src/app/HeyGeoDocument.cpp`)  
  Bỏ `Q_ASSERT(canEditChangeLinestyle())` và sửa để chỉ duyệt qua các ref kiểu `G_CURVE | G_LOCUS` khi đọc style hiện tại (bỏ qua điểm trong selection hỗn hợp).

- **`setCurrentPenstyle()` / `setCurrentPenWidth()`** (`src/app/HeyGeoDocument.cpp`)  
  Thêm `if(!(... & (G_CURVE | G_LOCUS))) continue;` trong vòng lặp — chỉ áp dụng kiểu nét/độ dày cho đường cong và quỹ tích, bỏ qua điểm trong selection hỗn hợp.

### Added (các phiên trước — ghi lại tổng hợp)
- **Menu Display → Color** — mỗi mục hiển thị ô màu 16×16 kèm tên màu; có dấu ✓ theo màu hiện tại.
- **Menu Display → Line Style** — mỗi mục hiển thị icon nét (Solid/Dashed/Dotted) hoặc độ dày (Thin/Normal/Thick) cùng nhãn; có dấu ✓.
- **Menu Display → Point Style** — mỗi mục hiển thị icon điểm (Large/Medium/Small) cùng nhãn; có dấu ✓.
- **Menu Display → Font** — thêm danh sách font family (Latin Modern Roman, CMU Serif, Times New Roman, Arial, Courier New) phía trên danh sách cỡ chữ; mục "Font..." mở dialog chọn font hệ thống.
- **Font mặc định** đổi từ `"Arial"` sang `"Latin Modern Roman"` (`G_drawstyle::match()` và `G_drawstyle::defaultStyle()`).
- **KFormula font sync** — `G_label::draw()`, `setString()`, `setText()` gọi `output.setFont(d.getFont())` để đồng bộ font renderer KFormula với drawstyle.
- **Web Exporter font** — `HeyGeoWebExporter::refToAttrs()` xuất `label.fontFamily` và `label.fontSize` dưới dạng JSXGraph attrs; ánh xạ `"Latin Modern Roman"` → `'Latin Modern Math', 'STIX Two Math', serif`.

### Files changed
- `src/geometry/G_drawstyle.cpp` — sửa `match()`: khôi phục gán pen/brush; đổi font mặc định sang Latin Modern Roman
- `src/app/cans.cpp` — sửa `canEditChangeLinestyle()`: any-match thay vì all-match
- `src/app/HeyGeoDocument.cpp` — sửa `getCurrentPenstyle/Width()`, `setCurrentPenstyle/Width()`: hỗ trợ selection hỗn hợp
- `src/app/HeyGeoMenus.cpp` — `ColorInfo`, `LinestyleInfo`, `PointstyleInfo`: icon + tên + checkable; `FontFamilyInfo` mới; `HeyGeoEditFontMenuMaintainer` thêm font family list
- `src/geometry/G_label.cpp` — sync font KFormula trong `draw()`, `setString()`, `setText()`
- `src/app/HeyGeoWebExporter.cpp` — xuất font info (family, size) vào JSON

---

## [2026-03-10] — SVG Thumbnail cho Export to Web

### Added
- **`HeyGeoWebExporter::generateSvgThumbnail()`** — render canvas hiện tại ra chuỗi SVG in-memory (sử dụng `QSvgGenerator` + `QPainter`, kích thước 400×300 px) trước khi upload.
- **`uploadToServer()`** nhận thêm tham số `thumbnailSvg` và gửi kèm trong JSON payload dưới trường `thumbnailSvg`.
- **`HeyGeoWindow`** — gọi `generateSvgThumbnail()` ngay trước bước upload; truyền SVG string vào `uploadToServer()`.
- **Prisma schema** — thêm field `thumbnailSvg String? @db.Text` vào model `Model`.
- **API POST `/api/models`** — nhận và lưu `thumbnailSvg` vào DB.
- **API PUT `/api/models/[id]`** — cho phép cập nhật `thumbnailSvg`.
- **API GET `/api/models`** — trả về `thumbnailSvg` cùng với dữ liệu model.
- **`ModelCard.tsx`** — hiển thị SVG thumbnail bằng `<img src="data:image/svg+xml;...">` khi có `thumbnailSvg`; ngược lại vẫn hiển thị placeholder như cũ.
- **`dashboard/page.tsx`** — truyền `thumbnailSvg` xuống `ModelCard`.

### Why
Trước đây thumbnail trên heygeo.pedu.vn được tạo bằng cách render lại JSON qua JSXGraph mini — cấu trúc toán học thường hiển thị không chính xác. Nay thumbnail là SVG được render trực tiếp từ canvas HeyGeo Desktop lúc export, đảm bảo hiển thị đúng 100%.

### Files changed
- `src/app/HeyGeoWebExporter.H` — khai báo `generateSvgThumbnail()`, cập nhật signature `uploadToServer()`
- `src/app/HeyGeoWebExporter.cpp` — implement `generateSvgThumbnail()`, cập nhật `uploadToServer()`
- `src/app/HeyGeoWindow.cpp` — gọi `generateSvgThumbnail()` và truyền vào `uploadToServer()`
- `HeyGeoWeb/prisma/schema.prisma` — thêm field `thumbnailSvg`
- `HeyGeoWeb/app/api/models/route.ts` — GET + POST nhận/trả `thumbnailSvg`
- `HeyGeoWeb/app/api/models/[id]/route.ts` — PUT cập nhật `thumbnailSvg`
- `HeyGeoWeb/app/(main)/dashboard/page.tsx` — truyền `thumbnailSvg` vào `ModelCard`
- `HeyGeoWeb/components/ModelCard.tsx` — render SVG thumbnail

---

## [2026-03-10] — Hệ trục toạ độ (G_COORDSYS) — Export to Web hoàn chỉnh

### Added
- **Đo lường hệ toạ độ (Desktop)** — bốn loại đo mới liên kết với `G_COORDSYS`:
  - `Measure > Abscissa x` — hoành độ `x_P` của điểm P trong hệ toạ độ.
  - `Measure > Ordinate y` — tung độ `y_P` của điểm P trong hệ toạ độ.
  - `Measure > Coordinates` — cặp `(x_P; y_P)`.
  - `Measure > Coordinate Distance` — khoảng cách `CD` tính theo đơn vị hệ toạ độ.
- **G_COORDSYS Export to Web** — `HeyGeoWebExporter` xuất hệ trục thành các phần tử JSXGraph:
  - Hai **line** (kiểu `"line"`) thay cho `"axis"` để đảm bảo `needsRegularUpdate=true` và không sinh lưới giả.
  - Hai **ticks** với `insertTicks:false`, `ticksdistance` khớp đơn vị HeyGeo tại thời điểm xuất.
  - Điểm **V** ẩn (hàm vị trí) = U quay 90° CCW quanh O — định hướng trục Oy.
  - Ba **eventbinding** phụ trách hành vi tương tác (xem mục Changed).
- **Hiển thị subscript** — giá trị đo dạng `x<sub>C</sub>` (HTML subscript) trong JSXGraphViewer.
- **`axis ?? false` default** trong `JSXGraphViewer.tsx` — ngăn JSXGraph tự sinh lưới mặc định khi JSON không khai báo trường `axis`.

### Changed
- **`G_HORIZONTAL_POINT` → draggable** — `HeyGeoWebExporter` không còn xuất điểm U(1;0) dưới dạng `fixed:true`; nay xuất cùng nhánh với `G_FREE_POINT`.
- **Hệ trục rigid khi kéo O** (`eventbinding: move_with`, parents=[O, U]):  
  Khi người dùng kéo O, điểm U di chuyển theo cùng delta → hệ trục bình tịnh.
- **U bị ràng buộc ngang + thay đổi tỷ lệ** (`eventbinding: coordsys_u_drag`, parents=[U, O, xTicks, yTicks]):  
  - U chỉ di chuyển theo phương ngang, luôn nằm bên phải O (tối thiểu 0.1 đơn vị).  
  - Sau mỗi lần kéo U, `xTicks.setAttribute({ticksdistance: dist})` và `yTicks.setAttribute(...)` cập nhật khoảng chia ngay lập tức → tỷ lệ hệ trục thay đổi trực quan.
- **Measure funcStrings** — tính `sf = |OU|` động tại runtime từ toạ độ sống của O và U trong `board.objects`; giá trị đo được cập nhật khi kéo U.
- **`JSXGraphViewer.tsx`** — bổ sung xử lý hai loại `eventbinding` mới (`move_with`, `coordsys_u_drag`) trong vòng lặp khởi tạo phần tử.

### Fixed
- Bỏ lưới toạ độ thừa — thay `"axis"` bằng `"line"` (`axis.needsRegularUpdate=false` gây đóng băng trục; `axis.ticks.majorHeight=-1` tạo ra các vạch chạy ngang toàn màn hình giống lưới).
- Trục theo O khi kéo — trước đây O và U là hai điểm độc lập; nay binding `move_with` giữ khoảng cách O→U không đổi.

### Files changed
- `src/app/HeyGeoWebExporter.cpp` — G_POINT case (G_HORIZONTAL_POINT), G_COORDSYS case (toàn bộ), measure funcStrings
- `HeyGeoWeb/components/JSXGraphViewer.tsx` — `axis ?? false`, xử lý `eventbinding` move_with & coordsys_u_drag

---

## [2026-03-09] — Hoàn thiện menu Transform theo GSP + sửa Export to Web (IS_TRANSFORM)

### Added
- **GSP-style Transform Dialogs** (`src/app/HeyGeoTransformDialog.H/.cpp`):
  - `HeyGeoTranslateDialog` — 3 tab: By Marked Vector / Rectangular (dx, dy) / Polar (distance, angle).
  - `HeyGeoRotateDialog` — 2 tab: By Marked Angle / Fixed Angle (degrees + CCW/CW radio).
  - `HeyGeoDilateDialog` — 2 tab: By Marked Ratio / Fixed Ratio (scale factor).
- **Mark Distance** (`Transform > Mark &Distance`) — kết nối `transformChooseDistance()` và `canTransformChooseDistance()` (chọn 2 điểm hoặc 1 đoạn thẳng); hiển thị đường highlight màu vàng + tick marks ở mỗi đầu trong `draw()`.
- **`createConstantValueRef(double)`** — tạo G_CALCULATE ref vô hình với giá trị hằng số, dùng cho Rotate/Dilate Fixed mode.
- **`createFixedPointRef(double, double)`** — tạo G_FREE_POINT ref vô hình tại toạ độ tài liệu chỉ định, dùng cho Translate Fixed mode.

### Changed
- **`Transform > Translate...`** — thay silent action bằng dialog; tab "By Marked Vector" sử dụng t_vector như cũ; tab "Rectangular/Polar" tạo hai điểm helper vô hình rồi thực hiện G_TRANSLATED.
- **`Transform > Rotate...`** — thay silent action bằng dialog; tab "By Marked Angle" giữ hành vi cũ; tab "Fixed Angle" tạo G_CALCULATE ref với giá trị góc và thực hiện G_ROTATED với 3 cha.
- **`Transform > Dilate...`** — thay silent action bằng dialog; tab "By Marked Ratio" giữ hành vi cũ; tab "Fixed Ratio" tạo G_CALCULATE ref với giá trị tỷ lệ.
- **`canTransformTranslate()`** — bỏ yêu cầu `t_vector.count() > 0`; chỉ cần có đối tượng được chọn (dialog cung cấp chế độ Fixed).
- **`canTransformRotate()`** — bỏ yêu cầu `t_angle.count() > 0`; vẫn cần t_center.
- **`canTransformScale()`** — bỏ yêu cầu `t_ratio.count() > 0`; vẫn cần t_center.
- **`canTransformClearChosen()`** — kể thêm `t_distance`.
- **`transformClearChosen()`** — xoá thêm `t_distance`.
- **`delRef()`** — thêm `if(t_distance.containsRef(inRef)) t_distance.clear()`.
- **`HeyGeoDocument.H`** — thêm `t_distance`, `canTransformChooseDistance()`, `transformChooseDistance()`, `createConstantValueRef()`, `createFixedPointRef()` vào lớp HeyGeoDocument.

### Fixed
- **`fixedAngleDeg()`** trong `HeyGeoRotateDialog` — sửa công thức: CCW trả về `+θ`, CW trả về `360 − θ` (khớp với `(360 − value)/180·π` trong `updateTransform()`).

### Fixed (Export to Web — IS_TRANSFORM)
- **`HeyGeoWebExporter::appendElements()`** — sửa các bug gây xuất JSON sai cho đối tượng được transform:
  - `G_SEGMENT` IS_TRANSFORM: thêm guard `!IS_TRANSFORM(dtype)` trước branch `par.size() >= 2`.
  - `G_CIRCLE` IS_TRANSFORM: tương tự guard; thêm fallback dynamic translate.
  - `G_CIRCLEINTERIOR` IS_TRANSFORM: guard + fallback (trước đây break ngay, không có output).
  - `G_POLYGON` IS_TRANSFORM: guard + dynamic translate từng đỉnh thông qua JSXGraph transform element.
  - `G_POINT + G_TRANSLATED`: xuất JSXGraph `{type:"transform", attrs:{type:"translate"}}` + point tham chiếu source + transform (dynamic).
  - `G_POINT + G_REFLECTED`: xuất JSXGraph `{type:"transform", attrs:{type:"reflect"}}` với đường gương.



### Added
- **Point on Object** (`Construct > Point on Object`) — tạo điểm bị ràng buộc (`G_CONSTRAINED_POINT`) trên đường thẳng, đoạn thẳng, tia, đường tròn hoặc cung tròn được chọn; điểm được đặt tại tham số t = 0.5 (giữa đường).
- **Arc on Circle** (`Construct > Arc on Circle`) — thêm kiểu cung mới `G_ONCIRCLE_ARC` (cha: 1 đường tròn + 2 điểm); cung được tính toán bằng cách chiếu hai điểm lên đường tròn, sau đó nội suy CCW.
- **`canNewPointOnObject()`** — kích hoạt menu khi ≥ 1 đối tượng đường (straight | circle | arc) được chọn.
- **`canNewArcOnCircle()`** — kích hoạt menu khi chọn đúng 1 đường tròn + 2 điểm.
- **`canNewCircleCenterPoint()`** — kích hoạt menu khi chọn đúng 2 điểm.
- **`canNewCircleCenterRadius()`** — kích hoạt menu khi chọn 1 điểm + 1 đoạn thẳng.

### Changed
- **`Construct > Circle by Center+Point`** — thay `NewCInfo` (stub) bằng `PCInfo` kết nối vào `newCircle()` với điều kiện `canNewCircleCenterPoint()`.
- **`Construct > Circle by Center+Radius`** — thay `UDInfo` bằng `PCInfo` kết nối vào `newCircle()` với điều kiện `canNewCircleCenterRadius()`.
- **`Construct > Arc on Circle`** — thay `UDInfo` bằng `PCInfo` kết nối vào `newArcOnCircle()` mới.
- **`Construct > Point on Object`** — thay `UDInfo` bằng `PCInfo` kết nối vào `newPointOnObject()` mới.
- **`G_arcObject::update()`** — bổ sung xử lý case `G_ONCIRCLE_ARC`: tính góc của hai điểm trên đường tròn rồi dựng `G_arc` theo chiều CCW.

### Fixed (Export to Web — JSXGraph JSON)
- **Angle Bisector** (`G_BISECTOR_RAY`) — trước đây rơi vào fallback generic ray; nay xuất đúng kiểu JSXGraph `"anglebisector"` với parents `[p1, vertex, p2]`.
- **Arc qua 3 điểm** (`G_THREEPOINTS_ARC`) — trước đây xuất sai kiểu `"arc"` (cần center+start+end); nay xuất đúng `"circumcirclearc"` (3 điểm trên cung).
- **Arc on Circle** (`G_ONCIRCLE_ARC`) — xuất kiểu JSXGraph `"arc"` với parents là `[center_point, startPoint, endPoint]`; center lấy từ parents của đường tròn cha.
- **Center Point** (`G_CENTER_POINT`) — cải thiện: ưu tiên tham chiếu đến điểm tâm của đường tròn cha thay vì tạo một điểm cố định.

### Files changed
- `src/defs.H` — thêm `G_ONCIRCLE_ARC` vào enum `G_ArcType`
- `src/geometry/G_arcObject.cpp` — thêm case `G_ONCIRCLE_ARC` trong `update()`; thêm `#include <cmath>`
- `src/app/cans.cpp` — thêm `canNewPointOnObject()`, `canNewArcOnCircle()`, `canNewCircleCenterPoint()`, `canNewCircleCenterRadius()`
- `src/app/menu.cpp` — thêm `newPointOnObject()`, `newArcOnCircle()`
- `src/app/HeyGeoDocument.H` — thêm khai báo các can-function và slot mới
- `src/app/HeyGeoMenus.cpp` — nối dây lại 4 menu item trong Construct; xóa `circleFunc` không dùng
- `src/app/HeyGeoWebExporter.cpp` — sửa 4 lỗi xuất JSON (bisector, 3-point arc, arc-on-circle, center point)

---

## [2026-03-08] — Export to Web: Phép tịnh tiến động (dynamic translate transform)

### Fixed
- **Phép tịnh tiến không cập nhật khi kéo vector (Desktop → Web)**: Khi thay đổi vector tịnh tiến (kéo điểm đầu/cuối), ảnh của các đối tượng trên web viewer không thay đổi theo — vì transform được xuất với giá trị số cố định tại thời điểm export.

- **TypeError: Cannot read properties of undefined (reading 'X')**: JSXGraph render error khi mở mô hình có phép tịnh tiến. Hai nguyên nhân gốc:
  1. **JessieCode compiled mode**: `getvarJS()` không resolve bare identifier thành board object (code path đó bị comment out trong JSXGraph). Biểu thức `X(p0)` biên dịch thành `$jc$.X(p0)` trong đó `p0` là biến JS `undefined` → crash.
  2. **JSXGraphViewer.tsx** không truyền `id` vào `board.create()` → JSXGraph tự sinh ID ngẫu nhiên → `board.objects['p0']` = `undefined` dù có dùng `$('p0')` notation.

### Changed
- **`HeyGeoWebExporter.cpp`** — 5 G_TRANSLATED sites (G_POINT, G_SEGMENT, G_CIRCLE, G_CIRCLEINTERIOR, G_POLYGON): đổi JessieCode expression từ bare identifier sang `$('id')` notation:
  - Trước: `"X(%1)-X(%2)"` / `"Y(%1)-Y(%2)"`
  - Sau: `"X($('%1'))-X($('%2'))"` / `"Y($('%1'))-Y($('%2'))"`
  - `$('id')` được JessieCode biên dịch thành `$jc$.board.objects['id']` — runtime board ID lookup chính xác.

- **`HeyGeoWeb/components/JSXGraphViewer.tsx`** — truyền `id` vào `attrs` khi gọi `board.create()`:
  ```ts
  // Trước:
  const created = board.create(el.type, parents, el.attrs ?? {});
  // Sau:
  const attrs = el.id ? { id: el.id, ...(el.attrs ?? {}) } : (el.attrs ?? {});
  const created = board.create(el.type, parents, attrs);
  ```
  Đảm bảo JSXGraph đăng ký element trong `board.objects` với đúng ID (`p0`, `p1`, `seg0`...) để JessieCode `$('id')` có thể tìm thấy tại runtime.

### Added
- **`rsync.md`** — tài liệu hoá quy trình build & deploy từ local (iMac) lên server (M2 Pro / heygeo.pedu.vn):
  - Lệnh pull/push qua rsync
  - Build Next.js standalone trên server (`/opt/homebrew/bin/npm run build`)
  - Copy static files vào `.next/standalone/` và restart LaunchDaemon `com.heygeo.app`
  - Dùng `sshpass -f ~/.heygeo_pass` (password lưu file chmod 600, không commit)

### Files changed
- `src/app/HeyGeoWebExporter.cpp` — 5 G_TRANSLATED sites
- `HeyGeoWeb/components/JSXGraphViewer.tsx` — truyền `id` vào `board.create()`
- `rsync.md` — quy trình build & deploy

---

## [2026-03-08] — Sửa lỗi không mở được file KSEG cũ trong examples/

### Fixed
- **Không thể mở file `.seg` / `.sec` trong thư mục `examples/`**: Các file này được tạo bởi ứng dụng gốc **KSEG** nên chứa version string `"KSeg Document Version 0.2"` / `"KSeg Construction Version 0.2"` trong phần header nhị phân. Sau khi đổi tên thương hiệu sang HeyGeo, hàm `parseVersionString` chỉ nhận dạng tiền tố `"HeyGeo ..."` → toàn bộ file KSEG cũ bị từ chối với thông báo "Invalid file".

### Changed
- **`HeyGeoDocument::parseVersionString()`** (`src/app/HeyGeoDocument.cpp`) — bổ sung nhận dạng tiền tố `"KSeg Document Version "` và `"KSeg Construction Version "` song song với `"HeyGeo ..."`. Không cần chuyển đổi file cũ — ứng dụng tự nhận ra cả hai định dạng khi mở.

---

## [2026-03-07 22:07] — Hoàn thiện menu theo GSP: bỏ Play, đổi View→Windows, chuẩn hóa phím tắt

### Changed
- **Xóa menu Play** khỏi menu bar — construction playback không còn trong menu chính (chức năng vẫn tồn tại trong code nhưng không được hiển thị).
- **Đổi tên menu "View" → "Windows"** (`HeyGeoViewMenuMaintainer` → `HeyGeoWindowsMenuMaintainer`) để khớp với GSP. Cấu trúc lại theo chuẩn GSP Windows menu:
  - New View (chức năng hiện có)
  - Phần điều hướng: Pan, Zoom In, Zoom To Fit, Original Zoom (toolbar items)
  - Minimize / Zoom (stub — Mac OS X window management)
  - Bring All to Front (stub — Mac OS X)
- **Thứ tự menu chính** giờ là: `File → Edit → Display → Construct → Measure → Number → Transform → Graph → Windows → [Construction] → Help`
- **Phím tắt chuẩn GSP** — cập nhật theo `GSP-reference/Reference Center/menus_*.htm`:
  - Edit > **Redo**: `Ctrl+Y` → **`Ctrl+R`** (đúng theo GSP)
  - Display > **Show/Hide Label**: `Ctrl+L` → **`Ctrl+K`** (đúng theo GSP `menus_display_showhidelabel.htm`)
  - Display > **Show All Hidden**: đã xóa shortcut `Ctrl+U` (GSP không có shortcut cho mục này)
  - Construct > **Midpoint**: `Alt+M` → **`Ctrl+M`** (đúng theo GSP)
  - Construct > **Intersection**: `Alt+I` → **`Ctrl+I`** (đúng theo GSP)
  - Construct > **Segment**: `Alt+S` → **`Ctrl+L`** (đúng theo GSP)

---

## [2026-03-07 18:37] — Cấu trúc lại menu theo chuẩn GSP

### Changed
- **Thứ tự menu** giờ giống GSP 5: `File → Edit → Display → Construct → Measure → Number → Transform → Graph → View → Play → Help`
- **File menu** — sắp xếp lại theo GSP: New Sketch / New Construction, Open, Close, Save / Save As, *Document Options* (stub), Print Preview (stub), Print, Export to Image / SVG, Language, Quit; recent files list vẫn giữ nguyên.
- **Edit menu** — theo chuẩn GSP: Undo/Redo, Cut/Copy/Paste (stub), Clear (= Delete), Select All / Select Parents / Select Children (stub), Split/Merge (stub), Edit Definition (stub), Properties (stub), Preferences, Action Buttons (stub), Selection Groups.
- **Construct menu** (đổi tên từ "New") — thứ tự theo GSP: Point on Object (stub), Midpoint, Intersection, Endpoints, Center Point; Segment, Ray, Line, Perpendicular Line, Angle Bisector; Circle by Center+Point, Circle by Center+Radius (stub), Arc on Circle (stub), Arc through 3 Points; Polygon Interior, Circle Interior, Arc Sector Interior, Arc Segment Interior; Locus.
- **Measure menu** — bổ sung theo GSP: Perimeter (stub), Circumference (stub), Arc Angle (stub), Value of Point (stub), Coordinates / Abscissa / Ordinate (stub), Coordinate Distance (stub), Equation (stub).
- **Transform menu** — đổi tên "Choose →" thành **"Mark →"** cho đúng thuật ngữ GSP; đổi "Scale" thành **"Dilate"**; thêm Iterate (stub), Define/Edit Custom Transforms (stub). Mark items đứng trước Transform operations theo chuẩn GSP.

### Added
- **Display menu** (mới hoàn toàn) — tách các mục hiển thị ra khỏi Edit: Color, Line Style, Point Style, Font, Text Style (stub); Show/Hide Labels, Label Objects; Hide Objects, Show All Hidden; Animate Objects / Increase Speed / Decrease Speed / Stop Animation / Motion Controller (stub); Trace Objects / Erase Traces (stub); Change Number of Samples.
- **Number menu** (mới hoàn toàn) — theo GSP: New Parameter (stub), Calculate, Tabulate (stub), Add/Remove Table Data (stub), Define Function from Drawing (stub).
- **Graph menu** (mới hoàn toàn) — theo GSP: New Coordinate System (stub), Define Axes (stub), Plot as (x,y) (stub), Plot Value on Axis (stub), New Function (stub), Plot Function (stub), Plot Curve (stub), Plot Table Data (stub), Grid Form (stub), Snap Points (stub), Derivative (stub).
- **`showUnderDevelopment()` slot** trong `HeyGeoWindow` — mọi mục menu chưa có tính năng thực đều gọi slot này, hiển thị hộp thoại thông báo "This feature is currently under development."
- **`UDInfo` class** trong `HeyGeoMenus.cpp` — lớp helper gọn nhẹ để tạo nhanh menu item "stub" kết nối vào `showUnderDevelopment()`.

### Files changed
- `src/app/HeyGeoMenus.cpp` — toàn bộ cấu trúc menu
- `src/app/HeyGeoWindow.H` — thêm slot `showUnderDevelopment()`
- `src/app/HeyGeoWindow.cpp` — thêm implementation `showUnderDevelopment()`

---

## [2026-03-07 00:58] — Sửa crash Point Tool & thay thế right-click

### Fixed
- **Crash khi chọn Point Tool**: Phát hiện vòng lặp tín hiệu đệ quy vô hạn giữa `HeyGeoToolBar::syncToolMode()` và `HeyGeoView::setToolMode()`. Hàm `syncToolMode()` gọi `activateTool()`, hàm này phát signal `toolModeChanged` → gọi lại `setToolMode` → phát lại signal → gọi lại `syncToolMode` → stack overflow / crash. Sửa bằng cách tách `syncToolMode()` thành hàm chỉ cập nhật trạng thái checked của button, không phát tín hiệu.

### Changed
- **Xóa tính năng nhấn chuột phải để tạo điểm**: Hành vi cũ (right-click vào vùng trống → tạo free point; right-click vào đường → tạo điểm constrained; right-click vào giao điểm 2 đường → tạo intersection point) đã bị xóa bỏ hoàn toàn. Tính năng này không trực quan và gây nhầm lẫn với chuẩn UX của GSP.

### Added
- **Context Menu khi nhấn chuột phải**: Thay thế hành vi right-click cũ bằng context menu theo đúng chuẩn GSP. Right-click vào một đối tượng sẽ tự động chọn đối tượng đó và hiện menu với các mục:
  - **Toggle Label** — bật/tắt nhãn
  - **Edit Label...** — đổi tên nhãn
  - **Hide** — ẩn đối tượng
  - **Delete** — xóa đối tượng

### Files changed
- `src/app/HeyGeoToolBar.cpp` — sửa `syncToolMode()`
- `src/app/HeyGeoView.cpp` — xóa right-click point creation, thêm context menu, thêm `#include <QMenu>`

---

## [2026-03-07 00:00] — Thanh công cụ GSP-style (Tool Bar)

### Added
- **Thanh công cụ dọc GSP-style** nằm ở cạnh trái cửa sổ (`Qt::LeftToolBarArea`), bao gồm 9 nhóm công cụ:

  | # | Công cụ | Mô tả |
  |---|---------|-------|
  | 1 | **Selection** | Chọn và di chuyển đối tượng (mặc định) |
  | 2 | **Point** | Đặt điểm tự do / trên đường / giao điểm bằng left-click |
  | 3 | **Compass** | Vẽ đường tròn bằng 2 click: tâm → điểm trên đường tròn |
  | 4 | **Straight Edge** | Flyout: Segment / Ray / Line (2 click) |
  | 5 | **Polygon** | Flyout: Polygon / Filled Polygon / Open Polygon (multi-click, double-click để đóng) |
  | 6 | **Text** | Click đối tượng để bật/tắt nhãn |
  | 7 | **Pen** | Đánh dấu đoạn thẳng / góc (placeholder) |
  | 8 | **Information** | Click đối tượng để xem thông tin |
  | 9 | **Custom** | Chạy construction tùy chỉnh (placeholder) |

- **Hệ thống Tool Mode** mới trong `HeyGeoView`: enum `ToolMode` (13 giá trị), routing left-click theo tool đang active, rubber-band preview bằng đường đứt nét xanh, phím `Escape` để hủy giữa chừng.
- **Icons**: Tất cả icon vẽ bằng `QPainter` / `QPainterPath` — không dùng file ảnh ngoài.
- **Snapping**: Khi dùng Point/Compass/Segment/Ray/Line tool, click gần điểm có sẵn (<6px) sẽ snap vào điểm đó thay vì tạo điểm mới.

### Files added
- `src/app/HeyGeoToolBar.H`
- `src/app/HeyGeoToolBar.cpp`

### Files changed
- `src/app/HeyGeoView.H` — thêm `ToolMode` enum, members, slots, signals
- `src/app/HeyGeoView.cpp` — thêm tool routing, rubber-band, `getOrCreatePoint()`, `handleToolClick()`, `handleToolDoubleClick()`, `drawToolRubberband()`
- `src/app/HeyGeoWindow.H` — thêm `gspToolBar` member
- `src/app/HeyGeoWindow.cpp` — khởi tạo toolbar và kết nối signals
- `heygeo.pro` — đăng ký file mới vào build

---

## [2026-03-06 00:00] — Nâng cấp chất lượng hiển thị (Anti-aliasing & HiDPI)

### Fixed
- **Màn hình Retina bị mờ**: Buffer canvas chỉ render ở logical pixel (ví dụ 800×600) rồi bị Qt kéo giãn lên physical pixel (1600×1200 trên màn 2×) → mờ và ráp. Sửa bằng cách nhân buffer size với `devicePixelRatio()` và gọi `buffer.setDevicePixelRatio(dpr)`.
- **Đường thẳng / điểm / đường tròn bị răng cưa**: Tọa độ vẽ bị ép về số nguyên (hàm `drawLine(QPoint, QPoint)`, `drawEllipse(int,int,int,int)`) khiến sub-pixel anti-aliasing bị vô hiệu. Sửa bằng cách dùng `QPointF` và `QRectF` trên toàn bộ code vẽ hình học.

### Changed
- `src/app/HeyGeoView.cpp` — HiDPI buffer với `devicePixelRatio()`
- `src/geometry/G_point.H` — thêm phương thức `toQPointF()`
- `src/geometry/G_point.cpp` — `drawEllipse` dùng `QRectF`
- `src/geometry/G_segment.cpp` — `drawLine` dùng `QPointF`
- `src/geometry/G_circle.cpp` — `drawEllipse` dùng `QRectF`
- `src/geometry/G_arc.cpp` — `drawArc` dùng `QRectF`
- `src/geometry/G_polygon.cpp` — dùng `QPolygonF` thay `QPolygon`

---

## [2026-01-00 00:00] — Giai đoạn 1: Di chuyển sang Qt 6 & đổi tên HeyGeo

### Added
- Fork từ **KSEG 0.403** (Ilya Baran, MIT, 1999–2006)
- Script `rebuild.sh` — tự động `qmake` + `make` + đóng gói `.app` trên macOS Apple Silicon
- `README.md` mới bằng tiếng Anh với hướng dẫn build cho macOS và Linux

### Changed / Fixed — Build system
- Viết lại toàn bộ `heygeo.pro`: thêm `QT += core gui widgets printsupport xml svg`, bật `CONFIG += c++17`, xóa cú pháp Qt 3/4 lỗi thời

### Changed / Fixed — Qt 3 → Qt 6 API
| API cũ | API mới |
|--------|---------|
| `Q3PtrList`, `Q3Dict` | `QList`, `QHash` |
| `QColor(r,g,b, QColor::Hsv)` | `QColor::fromHsv(h,s,v)` |
| `bitBlt(...)` | `QPainter::drawPixmap(...)` |
| `QPaintDevice::isExtDev()` | `dynamic_cast<QPrinter*>(device())` |
| `QPixmap::setOptimization(...)` | *(removed)* |
| `QApplication::setMainWidget(...)` | *(removed)* |
| `QDesktopWidget` | `QScreen` |
| `drawWinFocusRect(...)` | `QPainter::drawRect` với `Qt::DashLine` |
| `SIGNAL/SLOT` macros (phần lớn) | `connect(obj, &Class::signal, ...)` |

### Changed / Fixed — C++17 / Clang
- Xóa từ khóa `register` (deprecated C++17)
- Sửa ambiguous overload cho `qAbs`, `qMax`, `qMin` với kiểu `double`
- Thay `std::hash_map` / `std::hash_set` (SGI non-standard) bằng `std::unordered_map` / `std::unordered_set`
- Chuẩn hóa tất cả include style: `<qpainter.h>` → `<QPainter>`, v.v.

### Changed — Formula editor
- Port `kformula.cpp` / `kformulaedit.cpp` sang Qt 6 (widget painting, font metrics, input handling)

### Changed — Branding
- Đổi tên "kseg" → "HeyGeo" trong title bar, file filter, About dialog

---

*Dự án HeyGeo được phát triển từ nền tảng KSEG — © 1999–2006 Ilya Baran (MIT). Phiên bản HeyGeo và các nâng cấp tiếp theo thuộc về nhóm phát triển HeyGeo.*
