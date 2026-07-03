# HeyGeo Web Platform – Requirements for heygeo.pedu.vn

> This document describes the requirements that the **HeyGeo desktop app**
> expects from the web service hosted at **heygeo.pedu.vn**.  
> The team building the web platform should implement every endpoint and UI
> feature described here.

---

## 1. Overview

HeyGeo desktop can **export a geometry sketch as JSON** and either:

1. Save the `.heyjson` file locally (offline, no server needed), or  
2. **Upload it directly** to `heygeo.pedu.vn` through a REST API.

Once uploaded, authenticated users can view their sketches through a
browser-based dashboard. Each sketch is rendered interactively using
[JSXGraph](https://jsxgraph.uni-bayreuth.de/).

---

## 2. JSON Format

HeyGeo exports sketches in the following self-contained JSON format.

```jsonc
{
  "version": "1.0",
  "generator": "HeyGeo",
  "title": "My Circumcircle",

  // Viewport describes the pixel canvas that was visible in the desktop app.
  // Use it to set up the JSXGraph board's bounding box.
  "viewport": {
    "width":   780,   // canvas width in pixels (excluding scrollbars)
    "height":  560,   // canvas height in pixels
    "offsetX": 0.0,   // horizontal pan offset (HeyGeo document coords)
    "offsetY": 0.0,   // vertical   pan offset
    "zoom":    1.0    // current zoom factor
  },

  // Objects listed in topological (dependency) order.
  "objects": [
    {
      "id":           0,           // sequential index (0-based, no gaps)
      "type":         "point",     // see §2.1 Type Strings
      "descendType":  "free",      // see §2.2 DescendType Strings
      "visible":      true,
      "label":        "A",
      "labelVisible": true,
      "parents":      [],          // indices of parent objects in this array
      "x": 200.0,                  // screen-pixel x (y increases downward)
      "y": 150.0,                  // screen-pixel y
      "style": {
        "color":      "#000000",   // stroke / point color (CSS hex)
        "lineWidth":  1,           // pen thickness in pixels
        "lineStyle":  "solid",     // "solid" | "dashed" | "dotted"
        "pointStyle": "medium"     // "small" | "medium" | "large"
      }
    },
    {
      "id":          2,
      "type":        "segment",
      "descendType": "endpoints",
      "visible":     true,
      "label":       "",
      "labelVisible": false,
      "parents":     [0, 1],       // indices of the two endpoint objects
      "x1": 200.0, "y1": 150.0,   // computed endpoint 1
      "x2": 380.0, "y2": 150.0,   // computed endpoint 2
      "style": { "color": "#000000", "lineWidth": 1, "lineStyle": "solid" }
    },
    {
      "id":          5,
      "type":        "circle",
      "descendType": "centerRadius",
      "visible":     true,
      "label":       "c",
      "labelVisible": true,
      "parents":     [0, 1],
      "cx": 200.0, "cy": 150.0,   // center
      "r":  90.5,                  // radius in pixels
      "style": { "color": "#0000ff", "lineWidth": 2, "lineStyle": "solid" }
    }
  ]
}
```

### 2.1 Type Strings

| `type`            | Geometry            |
|-------------------|---------------------|
| `"point"`         | Point               |
| `"segment"`       | Line segment        |
| `"line"`          | Infinite line       |
| `"ray"`           | Ray                 |
| `"circle"`        | Circle              |
| `"arc"`           | Arc of a circle     |
| `"polygon"`       | Polygon (open/filled)|
| `"circleInterior"`| Filled circle disk  |
| `"arcSector"`     | Circular sector     |
| `"arcSegment"`    | Circular segment    |
| `"locus"`         | Locus curve         |
| `"measure"`       | Numeric measurement |
| `"calculate"`     | Calculated value    |
| `"annotation"`    | Text annotation     |

### 2.2 DescendType Strings (Points)

| `descendType`      | Meaning                        |
|--------------------|--------------------------------|
| `"free"`           | Freely draggable point         |
| `"constrained"`    | Point on a path                |
| `"intersection"`   | First intersection             |
| `"intersection2"`  | Second intersection            |
| `"midpoint"`       | Midpoint of a segment          |
| `"endpoint"`       | Endpoint of a segment/arc      |
| `"center"`         | Center of a circle/arc         |
| `"translated"`     | Under a translation transform  |
| `"rotated"`        | Under a rotation transform     |
| `"scaled"`         | Under a scaling transform      |
| `"reflected"`      | Under a reflection transform   |

### 2.3 Per-type Geometry Fields

| `type`     | Extra fields                                                         |
|------------|----------------------------------------------------------------------|
| `point`    | `x`, `y`                                                             |
| `segment`  | `x1`, `y1`, `x2`, `y2`                                               |
| `line`     | `px`, `py` (point on line), `dx`, `dy` (unit direction)              |
| `ray`      | `px`, `py` (origin), `dx`, `dy` (unit direction)                     |
| `circle`   | `cx`, `cy` (center), `r` (radius)                                    |
| `arc`      | `cx`, `cy`, `r`, `midX`, `midY` (point on arc midpoint), `arcAngle`, `cw` (bool) |
| `polygon`  | Geometry fully determined by `parents` (vertex point indices)         |
| others     | Geometry fully determined by `parents`                               |

> **Coordinate system:** HeyGeo uses a screen-pixel coordinate system where
> **y increases downward**. To place objects on a JSXGraph board you need to
> transform: `jx = (px - viewport.offsetX) / viewport.zoom` and
> `jy = -(py - viewport.offsetY) / viewport.zoom` (flip y).  
> Choose the JSXGraph bounding box to match: e.g.
> `[-offsetX/zoom, offsetY/zoom + height/zoom, -offsetX/zoom + width/zoom, offsetY/zoom]`.

---

## 3. REST API

Base URL: `https://heygeo.pedu.vn/api/v1`

All endpoints use JSON bodies (`Content-Type: application/json`).  
Authenticated endpoints require the header:

```
Authorization: Bearer <api_token>
```

---

### 3.1 Upload a Sketch

```
POST /api/v1/sketches
```

**Request body:** the HeyGeo JSON object (see §2).

**Success response** `201 Created`:

```json
{
  "id":      "sketch_abc123",
  "url":     "https://heygeo.pedu.vn/sketch/abc123",
  "message": "Sketch uploaded successfully"
}
```

**Error responses:**

| Status | Meaning                        |
|--------|--------------------------------|
| 400    | Malformed JSON or missing fields|
| 401    | Missing or invalid token       |
| 413    | Payload too large (> 5 MB)     |
| 500    | Server error                   |

---

### 3.2 List User's Sketches

```
GET /api/v1/sketches
```

**Response:**

```json
{
  "sketches": [
    {
      "id":         "sketch_abc123",
      "title":      "My Circumcircle",
      "createdAt":  "2026-03-07T10:00:00Z",
      "updatedAt":  "2026-03-07T10:00:00Z",
      "url":        "https://heygeo.pedu.vn/sketch/abc123",
      "thumbnail":  "https://heygeo.pedu.vn/thumbs/abc123.png"
    }
  ]
}
```

---

### 3.3 Get a Single Sketch (JSON)

```
GET /api/v1/sketches/{id}
```

Returns the raw HeyGeo JSON that was uploaded.

---

### 3.4 Delete a Sketch

```
DELETE /api/v1/sketches/{id}
```

Response `204 No Content` on success.

---

### 3.5 Generate / Rotate API Token

```
POST /api/v1/auth/token
```

Authenticated via standard login session cookie.  
Returns:

```json
{ "token": "eyJ..." }
```

---

## 4. Web Dashboard

The user dashboard at `https://heygeo.pedu.vn/dashboard` must:

- Show a grid/list of the user's uploaded sketches with thumbnail previews.
- Allow renaming, sharing (public/private toggle), and deleting sketches.
- Provide an **API Token** section where users can copy their token to paste
  into the HeyGeo desktop app ("Export to Web" dialog).

---

## 5. Sketch Viewer

Each sketch at `https://heygeo.pedu.vn/sketch/{id}` must:

1. Load the HeyGeo JSON from the API.
2. Apply the coordinate transformation (§2.3) to convert to JSXGraph coords.
3. Render every object using [JSXGraph](https://github.com/jsxgraph/jsxgraph):

| HeyGeo type        | JSXGraph element                        |
|--------------------|-----------------------------------------|
| `point`            | `board.create('point', [jx, jy], ...)`  |
| `segment`          | `board.create('segment', [p1, p2], ...)` |
| `line`             | `board.create('line', [p1, dir], ...)`  |
| `ray`              | Use `board.create('line')` with `straightFirst:false` |
| `circle`           | `board.create('circle', [center, r], ...)` |
| `arc`              | `board.create('arc', [center, p2, p3], ...)` |
| `polygon`          | `board.create('polygon', [pts...], ...)` |
| `circleInterior`   | `board.create('circle')` with fill color |
| `arcSector`        | `board.create('sector', ...)`           |
| `arcSegment`       | `board.create('arc')` with `hasInnerPoints:true` |
| `locus`            | Rendered as a `curve` using sample points |
| `measure`/`calculate` | Displayed as a text label           |

4. Apply style properties: `color`, `lineWidth`, `lineStyle`, `pointStyle`.
5. Show labels where `labelVisible` is `true`.
6. Allow basic pan & zoom via JSXGraph's built-in navigation.
7. Provide a **Download JSON** button.
8. Optionally allow the viewer to drag free points to explore the construction
   interactively (using `descendType == "free"` and recomputing dependent
   objects via the `parents` dependency graph).

---

## 6. Authentication

- Use standard email/password sign-up + login.
- OAuth2 via Google is recommended as an additional option.
- The API token can be generated and rotated from the dashboard (§4).
- Tokens do not expire automatically but can be revoked by the user.

---

## 7. Storage

- Store each sketch as a single JSON document in a database
  (PostgreSQL JSONB or MongoDB are both suitable).
- Maximum sketch size: **5 MB**.
- Thumbnail generation: render a 400 × 300 PNG server-side (Node.js + headless
  browser, or an SVG-to-PNG pipeline) after upload.
- Public sketches are accessible without authentication; private sketches
  require the owner's session.

---

## 8. CORS

The API must allow cross-origin requests from `app://heygeo` (Qt WebEngine)
and `http://localhost:*` for local development:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
```

---

## 9. Rate Limiting

| Endpoint              | Limit                  |
|-----------------------|------------------------|
| POST /sketches        | 60 uploads / hour / user |
| GET  /sketches        | 300 requests / minute  |
| Public sketch viewer  | No auth required, CDN cached |

---

*Generated by the HeyGeo project – last updated 2026-03-07.*
