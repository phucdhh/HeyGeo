/*
 *  HeyGeo – G_coordsys implementation
 */

#include "G_coordsys.H"
#include "G_drawstyle.H"
#include <QPainter>
#include <QPen>
#include <QFont>
#include <QFontMetrics>
#include <cmath>
#include <algorithm>
#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

// ── helpers ────────────────────────────────────────────────────────────────

// Round `raw` up to the nearest "nice" number: 1, 2, 5, 10, 20, 50, ...
static double niceStep(double raw)
{
    if (raw <= 0.0) return 1.0;
    double mag = std::pow(10.0, std::floor(std::log10(raw)));
    double m   = raw / mag;
    double n;
    if      (m <= 1.0) n = 1.0;
    else if (m <= 2.0) n = 2.0;
    else if (m <= 5.0) n = 5.0;
    else               n = 10.0;
    return n * mag;
}

// Format a tick value: integer if step >= 1, otherwise fixed decimals.
static QString formatTick(double val, double step)
{
    if (step >= 1.0) {
        return QString::number(qRound(val));
    } else if (step >= 0.1) {
        // 1 decimal place
        return QString::number(val, 'f', 1);
    } else {
        return QString::number(val, 'f', 2);
    }
}

G_coordsys::G_coordsys()
    : m_origin(300.0, 300.0)
    , m_scale(100.0)
    , m_scaleY(100.0)
    , m_gridForm(SQUARE_GRID)
    , m_xLabel(QStringLiteral("x"))
    , m_yLabel(QStringLiteral("y"))
    , m_showGrid(false)
    , m_snapGrid(false)
{}

// ── drawing ────────────────────────────────────────────────────────────────
void G_coordsys::draw(QPainter &p, const G_drawstyle &ds, bool selected) const
{
    Q_UNUSED(selected);

    const double ox = m_origin.getX();
    const double oy = m_origin.getY();
    const double reach = 3000.0;

    QPen axisPen = ds.getPen();
    p.setPen(axisPen);

    // ── shared label font ──────────────────────────────────────────────────
    QFont labelFont = ds.getFont();
    labelFont.setPointSize(10);
    labelFont.setItalic(false);

    if (m_gridForm == POLAR_GRID) {
        // ── POLAR GRID ─────────────────────────────────────────────────────
        const double scale = m_scale;
        const int maxR = static_cast<int>(reach / scale) + 1;
        QPen gridPen(QColor(180, 180, 180), 0, Qt::SolidLine);
        p.setFont(labelFont);
        QFontMetrics fm(labelFont);

        // Concentric circles
        for (int r = 1; r <= maxR; ++r) {
            double rpx = r * scale;
            if (rpx > reach) break;
            p.setPen(gridPen);
            p.drawEllipse(QPointF(ox, oy), rpx, rpx);
            QString lbl = QString::number(r);
            p.setPen(axisPen);
            p.drawText(QPointF(ox + rpx + 2, oy + fm.ascent() * 0.5), lbl);
        }

        // Radial lines every 30°
        p.setPen(gridPen);
        const int numLines = 12;
        for (int k = 0; k < numLines; ++k) {
            double angle = k * M_PI / 6.0;
            double cosA = std::cos(angle), sinA = std::sin(angle);
            p.drawLine(QPointF(ox + reach * cosA, oy - reach * sinA),
                       QPointF(ox - reach * cosA, oy + reach * sinA));
        }

        // Arrowheads on x and y axes
        p.setPen(axisPen);
        p.drawLine(QPointF(ox + reach, oy), QPointF(ox + reach - 10, oy - 5));
        p.drawLine(QPointF(ox + reach, oy), QPointF(ox + reach - 10, oy + 5));
        p.drawLine(QPointF(ox, oy - reach), QPointF(ox - 5, oy - reach + 10));
        p.drawLine(QPointF(ox, oy - reach), QPointF(ox + 5, oy - reach + 10));

        // Axis name labels
        QFont axFont = ds.getFont(); axFont.setPointSize(10); axFont.setItalic(true);
        p.setFont(axFont);
        p.drawText(QPointF(ox + reach - 20, oy - 6), m_xLabel);
        p.drawText(QPointF(ox + 6, oy - reach + 4), m_yLabel);

    } else if (m_gridForm == TRIG_AXIS) {
        // ── TRIGONOMETRIC AXIS ─────────────────────────────────────────────
        // x-axis: multiples of π/2 (or finer); y-axis: normal numbers.
        const double trigSteps[] = {M_PI/6, M_PI/4, M_PI/3, M_PI/2, M_PI, 2*M_PI};
        double trigStep = M_PI / 2;
        for (double ts : trigSteps) {
            if (ts * m_scale >= 80.0) { trigStep = ts; break; }
        }
        const double trigStepPx = trigStep * m_scale;
        const double stepY   = niceStep(120.0 / m_scaleY);
        const double stepYPx = stepY * m_scaleY;
        const double tickMajor = 5.0;

        // Arrowheads
        p.drawLine(QPointF(ox + reach, oy), QPointF(ox + reach - 10, oy - 5));
        p.drawLine(QPointF(ox + reach, oy), QPointF(ox + reach - 10, oy + 5));
        p.drawLine(QPointF(ox, oy - reach), QPointF(ox - 5, oy - reach + 10));
        p.drawLine(QPointF(ox, oy - reach), QPointF(ox + 5, oy - reach + 10));

        p.setFont(labelFont);
        QFontMetrics fm(labelFont);

        // x-axis ticks with π labels
        const int nX = static_cast<int>(reach / trigStepPx) + 1;
        for (int i = -nX; i <= nX; ++i) {
            if (i == 0) continue;
            double tx = ox + i * trigStepPx;
            p.drawLine(QPointF(tx, oy - tickMajor), QPointF(tx, oy + tickMajor));
            double frac = i * trigStep / M_PI;
            QString lbl;
            if (std::fabs(frac - qRound(frac)) < 1e-9) {
                int n = qRound(frac);
                if (n == 1) lbl = "π"; else if (n == -1) lbl = "-π";
                else lbl = QString::number(n) + "π";
            } else {
                for (int d = 2; d <= 6; ++d) {
                    double nd = frac * d;
                    if (std::fabs(nd - qRound(nd)) < 1e-9) {
                        int n = qRound(nd);
                        lbl = (n < 0) ? QString("-%1π/%2").arg(-n).arg(d)
                                      : QString("%1π/%2").arg(n).arg(d);
                        break;
                    }
                }
                if (lbl.isEmpty()) lbl = QString::number(frac, 'f', 2) + "π";
            }
            int tw = fm.horizontalAdvance(lbl);
            p.drawText(QPointF(tx - tw * 0.5, oy + tickMajor + fm.ascent() + 1), lbl);
        }

        // y-axis ticks: normal numbers
        const int nY = static_cast<int>(reach / stepYPx) + 1;
        for (int i = -nY; i <= nY; ++i) {
            if (i == 0) continue;
            double ty = oy - i * stepYPx;
            p.drawLine(QPointF(ox - tickMajor, ty), QPointF(ox + tickMajor, ty));
            QString lblY = formatTick(i * stepY, stepY);
            int twY = fm.horizontalAdvance(lblY);
            p.drawText(QPointF(ox - tickMajor - twY - 2, ty + fm.ascent() * 0.5), lblY);
        }

        // Optional grid
        if (m_showGrid) {
            QPen gridPen(QColor(180, 180, 180), 0, Qt::DotLine);
            p.setPen(gridPen);
            const int ngX = static_cast<int>(reach / trigStepPx) + 1;
            for (int i = -ngX; i <= ngX; ++i) {
                if (i == 0) continue;
                p.drawLine(QPointF(ox + i * trigStepPx, oy - reach),
                           QPointF(ox + i * trigStepPx, oy + reach));
            }
            const int ngY = static_cast<int>(reach / stepYPx) + 1;
            for (int i = -ngY; i <= ngY; ++i) {
                if (i == 0) continue;
                p.drawLine(QPointF(ox - reach, oy - i * stepYPx),
                           QPointF(ox + reach, oy - i * stepYPx));
            }
            p.setPen(axisPen);
        }

        QFont axFont = ds.getFont(); axFont.setPointSize(10); axFont.setItalic(true);
        p.setFont(axFont);
        p.drawText(QPointF(ox + reach - 20, oy - 6), m_xLabel);
        p.drawText(QPointF(ox + 6, oy - reach + 4), m_yLabel);

    } else {
        // ── SQUARE_GRID or RECTANGULAR_GRID ───────────────────────────────
        const double scaleX = m_scale;
        const double scaleY = (m_gridForm == RECTANGULAR_GRID) ? m_scaleY : m_scale;

        // Arrowheads (axis lines come from G_LINE refs)
        p.drawLine(QPointF(ox + reach, oy), QPointF(ox + reach - 10, oy - 5));
        p.drawLine(QPointF(ox + reach, oy), QPointF(ox + reach - 10, oy + 5));
        p.drawLine(QPointF(ox, oy - reach), QPointF(ox - 5, oy - reach + 10));
        p.drawLine(QPointF(ox, oy - reach), QPointF(ox + 5, oy - reach + 10));

        const double stepX   = niceStep(120.0 / scaleX);
        const double stepXPx = stepX * scaleX;
        const double stepY   = niceStep(120.0 / scaleY);
        const double stepYPx = stepY * scaleY;

        const double tickMajor = 5.0;
        const double tickMinor = 3.0;

        // Minor ticks on x-axis
        double minorStepX = 0.0;
        if (stepXPx / 5.0 >= 5.0)      minorStepX = stepX / 5.0;
        else if (stepXPx / 2.0 >= 5.0) minorStepX = stepX / 2.0;
        if (minorStepX > 0.0) {
            const int nMinX = static_cast<int>(reach / (minorStepX * scaleX)) + 1;
            for (int i = -nMinX; i <= nMinX; ++i) {
                double v = i * minorStepX;
                if (std::fabs(std::fmod(v, stepX)) < stepX * 1e-6) continue;
                double tx = ox + v * scaleX;
                p.drawLine(QPointF(tx, oy - tickMinor), QPointF(tx, oy + tickMinor));
            }
        }

        // Minor ticks on y-axis
        double minorStepY = 0.0;
        if (stepYPx / 5.0 >= 5.0)      minorStepY = stepY / 5.0;
        else if (stepYPx / 2.0 >= 5.0) minorStepY = stepY / 2.0;
        if (minorStepY > 0.0) {
            const int nMinY = static_cast<int>(reach / (minorStepY * scaleY)) + 1;
            for (int i = -nMinY; i <= nMinY; ++i) {
                double v = i * minorStepY;
                if (std::fabs(std::fmod(v, stepY)) < stepY * 1e-6) continue;
                double ty = oy - v * scaleY;
                p.drawLine(QPointF(ox - tickMinor, ty), QPointF(ox + tickMinor, ty));
            }
        }

        // Major ticks + labels
        p.setFont(labelFont);
        QFontMetrics fm(labelFont);

        const int nMajX = static_cast<int>(reach / stepXPx) + 1;
        for (int i = -nMajX; i <= nMajX; ++i) {
            if (i == 0) continue;
            double tx = ox + i * stepX * scaleX;
            p.drawLine(QPointF(tx, oy - tickMajor), QPointF(tx, oy + tickMajor));
            QString lbl = formatTick(i * stepX, stepX);
            int tw = fm.horizontalAdvance(lbl);
            p.drawText(QPointF(tx - tw * 0.5, oy + tickMajor + fm.ascent() + 1), lbl);
        }

        const int nMajY = static_cast<int>(reach / stepYPx) + 1;
        for (int i = -nMajY; i <= nMajY; ++i) {
            if (i == 0) continue;
            double ty = oy - i * stepY * scaleY;
            p.drawLine(QPointF(ox - tickMajor, ty), QPointF(ox + tickMajor, ty));
            QString lblY = formatTick(i * stepY, stepY);
            int twY = fm.horizontalAdvance(lblY);
            p.drawText(QPointF(ox - tickMajor - twY - 2, ty + fm.ascent() * 0.5), lblY);
        }

        // Axis name labels
        QFont axFont = ds.getFont(); axFont.setPointSize(10); axFont.setItalic(true);
        p.setFont(axFont);
        p.drawText(QPointF(ox + reach - 20, oy - 6), m_xLabel);
        p.drawText(QPointF(ox + 6, oy - reach + 4), m_yLabel);

        // Optional grid
        if (m_showGrid) {
            QPen gridPen(QColor(180, 180, 180), 0, Qt::DotLine);
            p.setPen(gridPen);
            const int ngX = static_cast<int>(reach / stepXPx) + 1;
            for (int i = -ngX; i <= ngX; ++i) {
                if (i == 0) continue;
                double gx = ox + i * stepX * scaleX;
                p.drawLine(QPointF(gx, oy - reach), QPointF(gx, oy + reach));
            }
            const int ngY = static_cast<int>(reach / stepYPx) + 1;
            for (int i = -ngY; i <= ngY; ++i) {
                if (i == 0) continue;
                double gy = oy - i * stepY * scaleY;
                p.drawLine(QPointF(ox - reach, gy), QPointF(ox + reach, gy));
            }
            p.setPen(axisPen);
        }
    }

    // ── selection highlight ────────────────────────────────────────────────
    if (selected) {
        p.setPen(QPen(QColor(0, 120, 255), 2));
        p.drawEllipse(QPointF(ox, oy), 6.0, 6.0);
    }
}

QRect G_coordsys::getExtents() const
{
    // Return a box around the origin (sufficient for scroll / pan)
    int ox = static_cast<int>(m_origin.getX());
    int oy = static_cast<int>(m_origin.getY());
    return QRect(ox - 10, oy - 10, 20, 20);
}

// ── coordinate conversion ──────────────────────────────────────────────────
G_point G_coordsys::mathToScreen(double x, double y) const
{
    return G_point(m_origin.getX() + x * m_scale,
                   m_origin.getY() - y * m_scale);   // y-axis is flipped
}

void G_coordsys::screenToMath(const G_point &pt, double &x, double &y) const
{
    x =  (pt.getX() - m_origin.getX()) / m_scale;
    y = -(pt.getY() - m_origin.getY()) / m_scale;
}

// ── serialisation ──────────────────────────────────────────────────────────
void G_coordsys::save(QDataStream &s) const
{
    s << m_origin << m_scale << m_scaleY << (qint32)m_gridForm
      << m_xLabel << m_yLabel << m_showGrid << m_snapGrid;
}

void G_coordsys::load(QDataStream &s)
{
    qint32 gf = SQUARE_GRID;
    s >> m_origin >> m_scale >> m_scaleY >> gf
      >> m_xLabel >> m_yLabel >> m_showGrid >> m_snapGrid;
    m_gridForm = static_cast<GridForm>(gf);
}

QDataStream &operator<<(QDataStream &s, const G_coordsys &cs)
{
    cs.save(s); return s;
}
QDataStream &operator>>(QDataStream &s, G_coordsys &cs)
{
    cs.load(s); return s;
}
