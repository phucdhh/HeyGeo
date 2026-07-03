/*
 *  HeyGeo – Coordinate System geometry object
 *  Represents a rectangular x-y coordinate system with visible axes, tick
 *  marks, and optional grid.  Closely mirrors the GSP "Define Coordinate
 *  System" feature.
 *
 *  Parents: none (free object – the user positions the origin by dragging)
 *
 *  Stored data:
 *    origin  – screen-pixel position of the mathematical (0,0) point
 *    scale   – pixels per unit (default 100)
 *    xLabel / yLabel  – axis label strings
 *    showGrid / snapGrid  – display and snap flags
 */

#ifndef G_COORDSYS_H
#define G_COORDSYS_H

#include "G_point.H"
#include <QString>
#include <QRect>
#include <QPainter>
#include <qdatastream.h>

// Forward declarations
class G_drawstyle;

// ── Coordinate-system geometry ─────────────────────────────────────────────
class G_coordsys
{
public:
    // GSP-compatible grid display modes
    enum GridForm {
        SQUARE_GRID      = 0,  ///< Equal x/y scale (default)
        RECTANGULAR_GRID = 1,  ///< Independent x and y scale
        POLAR_GRID       = 2,  ///< Polar coordinates
        TRIG_AXIS        = 3   ///< x-axis labelled in multiples of π
    };

    G_coordsys();

    // Position & scale
    G_point  origin()  const { return m_origin; }
    double   scale()   const { return m_scale; }   // pixels per unit (x)
    double   scaleY()  const { return m_scaleY; }  // pixels per unit (y); equals scale() unless RECTANGULAR_GRID
    void     setOrigin(const G_point &o) { m_origin = o; }
    void     setScale(double s)          { m_scale  = s; }
    void     setScaleY(double s)         { m_scaleY = s; }

    // Grid form
    GridForm gridForm() const          { return m_gridForm; }
    void     setGridForm(GridForm f)   { m_gridForm = f; }

    // Labels
    QString  xLabel() const { return m_xLabel; }
    QString  yLabel() const { return m_yLabel; }
    void     setXLabel(const QString &l) { m_xLabel = l; }
    void     setYLabel(const QString &l) { m_yLabel = l; }

    // Grid / snap
    bool     showGrid()  const { return m_showGrid; }
    bool     snapGrid()  const { return m_snapGrid; }
    void     setShowGrid(bool b) { m_showGrid = b; }
    void     setSnapGrid(bool b) { m_snapGrid = b; }

    // Drawing
    void draw(QPainter &p, const G_drawstyle &ds, bool selected) const;

    // Geometry helpers
    QRect    getExtents() const;

    // Serialisation
    void save(QDataStream &s) const;
    void load(QDataStream &s);

    // Coordinate conversion  (math unit ↔ screen pixel)
    G_point  mathToScreen(double x, double y) const;
    void     screenToMath(const G_point &pt, double &x, double &y) const;

private:
    G_point  m_origin;    // screen pixels
    double   m_scale;     // x pixels per unit
    double   m_scaleY;    // y pixels per unit (= m_scale for non-rectangular)
    GridForm m_gridForm;  // current display mode
    QString  m_xLabel;
    QString  m_yLabel;
    bool     m_showGrid;
    bool     m_snapGrid;
};

QDataStream &operator<<(QDataStream &s, const G_coordsys &cs);
QDataStream &operator>>(QDataStream &s, G_coordsys &cs);

#endif // G_COORDSYS_H
