/*
 *  HeyGeo – Graph function geometry objects
 *
 *  G_functionDef  – stores a formula string f(x) and evaluates it
 *  G_functionPlot – sampled polyline for y=f(x) on a coordinate system
 *  G_paramCurve   – sampled polyline for (x(t), y(t)) on a coordinate system
 */

#ifndef G_FUNCTION_H
#define G_FUNCTION_H

#include "G_coordsys.H"
#include "G_geometry.H"
#include "formula/kformula.H"
#include <QString>
#include <QList>
#include <QPointF>
#include <QRect>
#include <QPainter>
#include <qdatastream.h>

class G_drawstyle;

// ── G_functionDef ──────────────────────────────────────────────────────────
/**
 * Stores a function formula f(x) = expr or f(t) = expr.
 * Can be evaluated at any value of the independent variable.
 * When parents are supplied (G_VALUE/G_CALCULATE refs) they are passed
 * as parameters numbered 1...N via the KFormula reference mechanism.
 *
 * The "formula string" uses the same notation as KFormula (HeyGeo's calculator).
 * For web export it is translated to JavaScript.
 */
class G_functionDef
{
public:
    G_functionDef();

    // Set / get the raw formula string (e.g. "x^2 + sin(x)")
    void    setFormula(const QString &expr);
    QString formula()   const { return m_formula; }

    // Independent variable name (default "x"; use "t" for parametric)
    void    setVarName(const QString &v) { m_varName = v; }
    QString varName()   const { return m_varName; }

    // Domain for auto-sampling
    double  tMin() const { return m_tMin; }
    double  tMax() const { return m_tMax; }
    void    setDomain(double lo, double hi) { m_tMin = lo; m_tMax = hi; }

    // Number of samples used when drawing / exporting
    int     numSamples() const { return m_numSamples; }
    void    setNumSamples(int n) { m_numSamples = n; }

    // Evaluate at a single value; returns BIG on error
    double  evaluate(double t,
                     const QHash<QString,double> &extraVars = {}) const;

    // Serialisation
    void save(QDataStream &s) const;
    void load(QDataStream &s);

    // Translate the formula string to a JavaScript expression for JSXGraph export.
    // e.g.  "sin(x)^2 + pi"  →  "Math.pow(Math.sin(x),2)+Math.PI"
    static QString toJavaScript(const QString &formula,
                                const QString &varName = QStringLiteral("x"));

private:
    QString  m_formula;
    QString  m_varName;
    double   m_tMin;
    double   m_tMax;
    int      m_numSamples;
    mutable KFormula m_kf;
    mutable bool     m_dirty;
};

// ── G_functionPlot ─────────────────────────────────────────────────────────
/**
 * Visible plot of y = f(x) on a coordinate system.
 * Stores the function definition inline (a G_functionDef) plus a reference
 * to the coordinate system's origin/scale for drawing.
 */
class G_functionPlot
{
public:
    G_functionPlot();

    G_functionDef       &funcDef()       { return m_func; }
    const G_functionDef &funcDef() const { return m_func; }

    // Sample the curve on the current viewport and store in m_points.
    // Call this from G_functionPlotObject::update().
    void sample(const G_coordsys &cs, int viewW = 800);

    void draw(QPainter &p, const G_drawstyle &ds, bool selected) const;
    QRect getExtents() const;

    void save(QDataStream &s) const;
    void load(QDataStream &s);

    // Apply a viewport transform (translate then zoom) to all sampled points.
    // Called from G_functionPlotObject::tempTransform().
    void applyViewTransform(double tx, double ty, double zoom);

    // Find nearest sampled point to p; skip NaN break markers.
    G_point nearestPoint(const G_point &p) const;
    // Check if any sampled point falls inside r.
    bool inRect(const QRect &r) const;

    // Read-only access to sampled pixel points (for G_functionPlotCurve).
    const QList<QPointF>& sampledPoints() const { return m_points; }

private:
    G_functionDef m_func;
    QList<QPointF> m_points; // sampled screen-pixel points
};

// ── G_functionPlotCurve ───────────────────────────────────────────────────
/**
 * Adapter that lets G_functionPlot behave as a G_curve so that the
 * Point tool can place constrained (glider) points on function plots.
 *
 * All coordinates are in screen-pixel space, exactly like G_circle etc.
 */
class G_functionPlotCurve : public G_curve
{
public:
    explicit G_functionPlotCurve(G_functionPlot &fp) : m_fp(fp) {}

    // Called from G_functionPlotObject::update() so we can use the coordsys
    // for stable math-x parameterisation.
    void setCoordSys(const G_coordsys *cs) { m_cs = cs; }

    // ── G_geometry pure-virtual stubs ──────────────────────────────────────
    G_Type      getType()    const override { return G_FUNCTIONPLOT; }
    G_geometry *copy()       const override { return nullptr; }
    void draw(QPainter &, const G_drawstyle &, bool) override {}
    QRect       getExtents() const override { return QRect(); }
    void translate(const G_point &)      override {}
    void rotate(const G_point &, double) override {}
    void reflect(const G_straight &)     override {}
    void scale(const G_point &, double)  override {}

    // ── G_geometry implemented ─────────────────────────────────────────────
    G_point getNearestPoint(const G_point &p) const override;
    bool    inRect(const QRect &r)            const override;

    // ── G_curve interface ──────────────────────────────────────────────────
    G_point getPointOnCurve(double param)              const override;
    double  getParamFromPoint(const G_point &p)        const override;
    G_point getIntersection(const G_curve *c, int which = 0) const override;

private:
    G_functionPlot   &m_fp;
    const G_coordsys *m_cs = nullptr; // set by G_functionPlotObject::update()
};

// ── G_paramCurve ──────────────────────────────────────────────────────────
/**
 * Visible parametric curve (x(t), y(t)) on a coordinate system.
 */
class G_paramCurve
{
public:
    G_paramCurve();

    G_functionDef       &xFunc()       { return m_xFunc; }
    const G_functionDef &xFunc() const { return m_xFunc; }
    G_functionDef       &yFunc()       { return m_yFunc; }
    const G_functionDef &yFunc() const { return m_yFunc; }

    void sample(const G_coordsys &cs);
    void draw(QPainter &p, const G_drawstyle &ds, bool selected) const;
    QRect getExtents() const;

    void save(QDataStream &s) const;
    void load(QDataStream &s);

    // Apply a viewport transform (translate then zoom) to all sampled points.
    // Called from G_paramCurveObject::tempTransform().
    void applyViewTransform(double tx, double ty, double zoom);

    // Find nearest sampled point to p; skip NaN break markers.
    G_point nearestPoint(const G_point &p) const;
    // Check if any sampled point falls inside r.
    bool inRect(const QRect &r) const;

private:
    G_functionDef  m_xFunc;  // x(t) – varName should be "t"
    G_functionDef  m_yFunc;  // y(t) – varName should be "t"
    QList<QPointF> m_points;
};

#endif // G_FUNCTION_H
