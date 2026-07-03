/*
 *  HeyGeo – G_function implementation
 */

#include "G_function.H"
#include "G_drawstyle.H"
#include "defs.H"
#include <QPainter>
#include <QPen>
#include <QHash>
#include <limits>
#include <QRect>
#include <QRegularExpression>
#include <cmath>
#include <optional>

// ═══════════════════════════════════════════════════════════════════
//  G_functionDef
// ═══════════════════════════════════════════════════════════════════

G_functionDef::G_functionDef()
    : m_formula(QStringLiteral("x"))
    , m_varName(QStringLiteral("x"))
    , m_tMin(-5.0)
    , m_tMax(5.0)
    , m_numSamples(300)
    , m_kf(true)     // restricted = true → can evaluate numerically
    , m_dirty(true)
{}

void G_functionDef::setFormula(const QString &expr)
{
    m_formula = expr;
    m_dirty   = true;
}

double G_functionDef::evaluate(double t,
                               const QHash<QString,double> &extraVars) const
{
    if (m_dirty) {
        // Parse using fromUgly to handle "^", "sqrt(", etc.
        m_kf.parse(KFormula::fromUgly(m_formula));
        m_dirty = false;
    }
    QHash<QString, double> vars = extraVars;
    vars[m_varName] = t;
    std::optional<int> err;
    double result = m_kf.evaluate(vars, &err);
    if (err && *err != 0) return BIG;
    return result;
}

void G_functionDef::save(QDataStream &s) const
{
    s << m_formula << m_varName
      << m_tMin    << m_tMax
      << m_numSamples;
}

void G_functionDef::load(QDataStream &s)
{
    s >> m_formula >> m_varName
      >> m_tMin    >> m_tMax
      >> m_numSamples;
    m_dirty = true;
}

// ── JavaScript translation ─────────────────────────────────────────────────
// Converts common math-formula notation to a JavaScript expression.
/* static */
QString G_functionDef::toJavaScript(const QString &formula,
                                     const QString &varName)
{
    // Start with the formula in "ugly" text form.
    QString js = formula;

    // ── multi-char function names (longest first to avoid partial replacements)
    struct { const char *from; const char *to; } fnMap[] = {
        { "arcsin",  "Math.asin"  },
        { "arccos",  "Math.acos"  },
        { "arctan",  "Math.atan"  },
        { "asin",    "Math.asin"  },
        { "acos",    "Math.acos"  },
        { "atan",    "Math.atan"  },
        { "atan2",   "Math.atan2" },
        { "sinh",    "Math.sinh"  },
        { "cosh",    "Math.cosh"  },
        { "tanh",    "Math.tanh"  },
        { "sin",     "Math.sin"   },
        { "cos",     "Math.cos"   },
        { "tan",     "Math.tan"   },
        { "abs",     "Math.abs"   },
        { "sqrt",    "Math.sqrt"  },
        { "cbrt",    "Math.cbrt"  },
        { "log10",   "Math.log10" },
        { "log2",    "Math.log2"  },
        { "log",     "Math.log"   },
        { "ln",      "Math.log"   },
        { "exp",     "Math.exp"   },
        { "floor",   "Math.floor" },
        { "ceil",    "Math.ceil"  },
        { "round",   "Math.round" },
        { "min",     "Math.min"   },
        { "max",     "Math.max"   },
        { "sign",    "Math.sign"  },
        { "pow",     "Math.pow"   },
        { nullptr, nullptr }
    };
    for (int k = 0; fnMap[k].from; ++k) {
        // Replace only word-boundary occurrences (not part of a longer name)
        QString from = QStringLiteral("\\b") + fnMap[k].from + QStringLiteral("\\b");
        js.replace(QRegularExpression(from, QRegularExpression::CaseInsensitiveOption),
                   QString::fromLatin1(fnMap[k].to));
    }

    // ── Constants ─────────────────────────────────────────────────────────────
    js.replace(QRegularExpression(QStringLiteral("\\bpi\\b"),
                                  QRegularExpression::CaseInsensitiveOption),
               QStringLiteral("Math.PI"));
    js.replace(QRegularExpression(QStringLiteral("\\bπ\\b")), QStringLiteral("Math.PI"));
    // Standalone 'e' (not part of another word or Math.xxx)
    js.replace(QRegularExpression(QStringLiteral("(?<![A-Za-z_])e(?![A-Za-z_\\d])")),
               QStringLiteral("Math.E"));

    // ── Power operator: x^n → Math.pow(x, n) ─────────────────────────────────
    // A simple left-right scan: replace "A^B" replacing the groups.
    // Only handle simple cases (identifier or parenthesised expression).
    // For complex cases we emit `** ` since modern JS supports it.
    js.replace(QChar('^'), QStringLiteral("**"));

    // ── Implicit multiplication: "2x" → "2*x", "3pi" etc. already handled ────
    // Replace digit followed by variable name
    {
        QRegularExpression re(QString::fromLatin1("(\\d)(%1)").arg(
                                  QRegularExpression::escape(varName)));
        js.replace(re, QString::fromLatin1("\\1*\\2"));
    }

    return js;
}

// ═══════════════════════════════════════════════════════════════════
//  G_functionPlot
// ═══════════════════════════════════════════════════════════════════

G_functionPlot::G_functionPlot()
{}

void G_functionPlot::sample(const G_coordsys &cs, int viewW)
{
    m_points.clear();
    const int N = m_func.numSamples();
    if (N < 2) return;

    // Domain in math units: span the visible viewport
    double xMath0, dummy;
    cs.screenToMath(G_point(0.0, 0.0), xMath0, dummy);
    double xMath1;
    cs.screenToMath(G_point(static_cast<double>(viewW), 0.0), xMath1, dummy);

    // Clamp to user-defined domain
    double lo = qMax(xMath0, m_func.tMin());
    double hi = qMin(xMath1, m_func.tMax());
    if (lo >= hi) { lo = m_func.tMin(); hi = m_func.tMax(); }

    const double step = (hi - lo) / N;
    double prevY = BIG;

    for (int i = 0; i <= N; ++i) {
        double x = lo + i * step;
        double y = m_func.evaluate(x);
        if (!myFinite(y) || qAbs(y) > 1e10) {
            prevY = BIG;
            continue;
        }
        G_point sc = cs.mathToScreen(x, y);
        QPointF sp(sc.getX(), sc.getY());
        if (prevY < BIG) {
            // Mark discontinuity if jump is very large
            double prevScY = cs.mathToScreen(x - step, prevY).getY();
            if (qAbs(sp.y() - prevScY) > 2000) {
                m_points.append(QPointF(qQNaN(), qQNaN())); // break marker
            }
        }
        m_points.append(sp);
        prevY = y;
    }
}

void G_functionPlot::draw(QPainter &p, const G_drawstyle &ds, bool selected) const
{
    if (m_points.size() < 2) return;

    QPen pen = ds.getPen();
    pen.setWidth(qMax(1, pen.width()));
    if (selected) pen.setWidth(pen.width() + 2);
    p.setPen(pen);

    QPointF prev;
    bool hasPrev = false;
    for (const QPointF &pt : m_points) {
        if (qIsNaN(pt.x())) { hasPrev = false; continue; }
        if (hasPrev) p.drawLine(prev, pt);
        prev = pt;
        hasPrev = true;
    }
}

QRect G_functionPlot::getExtents() const
{
    if (m_points.isEmpty()) return QRect();
    double x0 = m_points[0].x(), y0 = m_points[0].y();
    double x1 = x0, y1 = y0;
    for (const QPointF &pt : m_points) {
        if (qIsNaN(pt.x())) continue;
        x0 = qMin(x0, pt.x()); y0 = qMin(y0, pt.y());
        x1 = qMax(x1, pt.x()); y1 = qMax(y1, pt.y());
    }
    return QRect(static_cast<int>(x0), static_cast<int>(y0),
                 static_cast<int>(x1 - x0), static_cast<int>(y1 - y0));
}

void G_functionPlot::save(QDataStream &s) const { m_func.save(s); }
void G_functionPlot::load(QDataStream &s)       { m_func.load(s); }

void G_functionPlot::applyViewTransform(double tx, double ty, double zoom)
{
    for (QPointF &pt : m_points) {
        if (!qIsNaN(pt.x())) {
            pt.rx() = (pt.rx() + tx) * zoom;
            pt.ry() = (pt.ry() + ty) * zoom;
        }
    }
}

G_point G_functionPlot::nearestPoint(const G_point &p) const
{
    G_point best(p.getX(), p.getY());
    double bestDist = std::numeric_limits<double>::max();
    for (const QPointF &pt : m_points) {
        if (qIsNaN(pt.x())) continue;
        double dx = pt.x() - p.getX();
        double dy = pt.y() - p.getY();
        double d = dx*dx + dy*dy;
        if (d < bestDist) { bestDist = d; best = G_point(pt.x(), pt.y()); }
    }
    return best;
}

bool G_functionPlot::inRect(const QRect &r) const
{
    for (const QPointF &pt : m_points) {
        if (!qIsNaN(pt.x()) && r.contains(QPoint(qRound(pt.x()), qRound(pt.y()))))
            return true;
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════════
//  G_paramCurve
// ═══════════════════════════════════════════════════════════════════

G_paramCurve::G_paramCurve()
{
    m_xFunc.setVarName(QStringLiteral("t"));
    m_xFunc.setFormula(QStringLiteral("cos(t)"));
    m_xFunc.setDomain(0.0, 2 * M_PI);
    m_yFunc.setVarName(QStringLiteral("t"));
    m_yFunc.setFormula(QStringLiteral("sin(t)"));
    m_yFunc.setDomain(0.0, 2 * M_PI);
}

void G_paramCurve::sample(const G_coordsys &cs)
{
    m_points.clear();
    const int N = m_xFunc.numSamples();
    if (N < 2) return;

    double lo = m_xFunc.tMin();
    double hi = m_xFunc.tMax();
    const double step = (hi - lo) / N;

    for (int i = 0; i <= N; ++i) {
        double t = lo + i * step;
        double x = m_xFunc.evaluate(t);
        double y = m_yFunc.evaluate(t);
        if (!myFinite(x) || !myFinite(y) ||
            qAbs(x) > 1e10 || qAbs(y) > 1e10) {
            m_points.append(QPointF(qQNaN(), qQNaN())); // break marker
            continue;
        }
        G_point sc = cs.mathToScreen(x, y);
        m_points.append(QPointF(sc.getX(), sc.getY()));
    }
}

void G_paramCurve::draw(QPainter &p, const G_drawstyle &ds, bool selected) const
{
    if (m_points.size() < 2) return;

    QPen pen = ds.getPen();
    pen.setWidth(qMax(1, pen.width()));
    if (selected) pen.setWidth(pen.width() + 2);
    p.setPen(pen);

    QPointF prev;
    bool hasPrev = false;
    for (const QPointF &pt : m_points) {
        if (qIsNaN(pt.x())) { hasPrev = false; continue; }
        if (hasPrev) p.drawLine(prev, pt);
        prev = pt;
        hasPrev = true;
    }
}

QRect G_paramCurve::getExtents() const
{
    if (m_points.isEmpty()) return QRect();
    double x0 = m_points[0].x(), y0 = m_points[0].y();
    double x1 = x0, y1 = y0;
    for (const QPointF &pt : m_points) {
        if (qIsNaN(pt.x())) continue;
        x0 = qMin(x0, pt.x()); y0 = qMin(y0, pt.y());
        x1 = qMax(x1, pt.x()); y1 = qMax(y1, pt.y());
    }
    return QRect(static_cast<int>(x0), static_cast<int>(y0),
                 static_cast<int>(x1 - x0), static_cast<int>(y1 - y0));
}

void G_paramCurve::save(QDataStream &s) const { m_xFunc.save(s); m_yFunc.save(s); }
void G_paramCurve::load(QDataStream &s)       { m_xFunc.load(s); m_yFunc.load(s); }

void G_paramCurve::applyViewTransform(double tx, double ty, double zoom)
{
    for (QPointF &pt : m_points) {
        if (!qIsNaN(pt.x())) {
            pt.rx() = (pt.rx() + tx) * zoom;
            pt.ry() = (pt.ry() + ty) * zoom;
        }
    }
}

G_point G_paramCurve::nearestPoint(const G_point &p) const
{
    G_point best(p.getX(), p.getY());
    double bestDist = std::numeric_limits<double>::max();
    for (const QPointF &pt : m_points) {
        if (qIsNaN(pt.x())) continue;
        double dx = pt.x() - p.getX();
        double dy = pt.y() - p.getY();
        double d = dx*dx + dy*dy;
        if (d < bestDist) { bestDist = d; best = G_point(pt.x(), pt.y()); }
    }
    return best;
}

bool G_paramCurve::inRect(const QRect &r) const
{
    for (const QPointF &pt : m_points) {
        if (!qIsNaN(pt.x()) && r.contains(QPoint(qRound(pt.x()), qRound(pt.y()))))
            return true;
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════════════════
//  G_functionPlotCurve  (G_curve adapter for G_functionPlot)
// ═══════════════════════════════════════════════════════════════════════════

// Return a sorted list of valid (non-NaN) sampled pixel points.
static QList<QPointF> validPoints(const QList<QPointF> &pts)
{
    QList<QPointF> v;
    v.reserve(pts.size());
    for (const QPointF &p : pts)
        if (!qIsNaN(p.x()) && !qIsNaN(p.y()))
            v.append(p);
    return v;
}

G_point G_functionPlotCurve::getNearestPoint(const G_point &p) const
{
    return m_fp.nearestPoint(p);
}

bool G_functionPlotCurve::inRect(const QRect &r) const
{
    return m_fp.inRect(r);
}

// param is the math x-coordinate of the point on the function.
// When m_cs is set this gives stable positions even when the coordsys moves.
G_point G_functionPlotCurve::getPointOnCurve(double param) const
{
    if (m_cs) {
        double y = m_fp.funcDef().evaluate(param);
        if (!std::isfinite(y) || std::abs(y) > 1e10) return G_point();
        return m_cs->mathToScreen(param, y);
    }
    // Fallback: pixel-index (no coordsys reference available)
    QList<QPointF> vp = validPoints(m_fp.sampledPoints());
    if (vp.isEmpty()) return G_point();
    int idx = qBound(0, (int)std::round(param * (vp.size() - 1)), vp.size() - 1);
    return G_point(vp[idx].x(), vp[idx].y());
}

// Returns the math x-coordinate of the sampled point nearest to p.
// Stored as the constrained-point param so it is stable across CS moves.
double G_functionPlotCurve::getParamFromPoint(const G_point &p) const
{
    if (m_cs) {
        double mathX, mathY;
        m_cs->screenToMath(p, mathX, mathY);
        // Clamp to the function's user-defined domain
        double lo = m_fp.funcDef().tMin();
        double hi = m_fp.funcDef().tMax();
        return qBound(lo, mathX, hi);
    }
    // Fallback: normalised pixel-index
    QList<QPointF> vp = validPoints(m_fp.sampledPoints());
    if (vp.isEmpty()) return 0.5;
    double best = std::numeric_limits<double>::max();
    int bestIdx = 0;
    for (int i = 0; i < vp.size(); ++i) {
        double dx = vp[i].x() - p.getX(), dy = vp[i].y() - p.getY();
        double d = dx*dx + dy*dy;
        if (d < best) { best = d; bestIdx = i; }
    }
    return (vp.size() <= 1) ? 0.5 : (double)bestIdx / (vp.size() - 1);
}

G_point G_functionPlotCurve::getIntersection(const G_curve *, int) const
{
    return G_point(); // not required for glider points
}
