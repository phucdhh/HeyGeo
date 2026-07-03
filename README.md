# HeyGeo

**HeyGeo** is an interactive geometry application for macOS (and other platforms supported by Qt). It lets you construct geometric figures — points, lines, circles, arcs, polygons, and more — then explore their properties dynamically as you drag elements around the canvas.

HeyGeo is a modernised fork of the classic [KSEG](http://www.mit.edu/~ibaran/kseg.html) application (by Ilya Baran), fully migrated to **Qt 6** and built natively for **Apple Silicon (arm64)**.

---

## Features

- Interactive geometric constructions with live updates
- Points, line segments, rays, lines, circles, arcs, arc sectors, arc segments
- Polygons and circle interiors
- Measurements: distance, length, area, angle, slope, ratio
- Computed values (calculator with formula editor)
- Locus traces
- Construction playback (script / macro replay)
- Selection groups
- LaTeX-style formula labels
- Multi-language UI (English, French, German, Spanish, Portuguese, Italian, Japanese, Russian, Dutch, Hungarian, Welsh, and more)
- Export to image (PNG, JPEG, BMP, etc.) with high-quality upsampling
- Print support

---

## Building from Source

### Requirements

- **Qt 6.x** (tested with Qt 6.10.1)
- **C++17** compiler (Apple Clang on macOS, GCC on Linux)
- `zlib` (`-lz`)

### macOS (Homebrew Qt)

```bash
# Install Qt via Homebrew
brew install qt

# Clone and build
git clone <repo-url> HeyGeo
cd HeyGeo
qmake heygeo.pro
make -j$(sysctl -n hw.logicalcpu)

# Run
open heygeo.app
```

### Linux

```bash
sudo apt install qt6-base-dev qt6-tools-dev libz-dev   # Debian/Ubuntu
qmake heygeo.pro
make -j$(nproc)
./heygeo
```

---

## Project Structure

```
HeyGeo/
├── heygeo.pro              # Qt project file
├── main.cpp                # Entry point
├── HeyGeo*.cpp / .H        # Main application classes
├── G_*.cpp / .H            # Geometry object implementations
├── menu.cpp                # Document menu actions
├── formula/                # Formula / expression engine
├── pics/                   # XPM icon resources
├── languages/              # Translation files (.ts / .qm)
├── help/                   # HTML help files
└── examples/               # Sample .seg / .sec construction files
```

### Key Classes

| Class | Description |
|---|---|
| `HeyGeoWindow` | Main application window, menus, toolbars |
| `HeyGeoView` | Canvas widget — rendering and mouse interaction |
| `HeyGeoDocument` | Document model — objects, undo stack, selection |
| `HeyGeoConstruction` | Recorded construction (script) |
| `HeyGeoProperties` | Persistent user preferences |
| `HeyGeoMenuMaintainer` | Dynamic menu/toolbar state management |
| `G_ref` / `G_object` | Geometry object graph nodes |

---

## Usage

- **Left-click** on the canvas to create points and select objects.
- **Drag** selected objects to move them; dependent objects update automatically.
- Use the **Construct** menu to add derived objects (midpoint, intersection, perpendicular, etc.).
- Use the **Measure** menu to attach measurements to objects.
- Use the **Transform** menu for rotations, reflections, translations, and dilations.
- Save constructions as `.seg` files; save scripts as `.sec` files.
- Play back a script via **File → Quick Play**.

---

## Languages

Language files live in the `languages/` directory. To switch language, go to **File → Choose Language** and pick a `.qm` file (e.g. `heygeo_fr.qm` for French).

---

## License

HeyGeo is distributed under the **GNU General Public License v2** (or later). See [COPYING](COPYING) for the full text.

Original KSEG source © Ilya Baran.  
Qt 6 migration and HeyGeo branding by contributors.

---

## Contributing

Pull requests, bug reports, and translations are welcome. Please open an issue on the project repository to discuss changes before submitting large patches.
