/*
 *  HeyGeo – Graph G_object implementations
 *  G_coordsysObject, G_functionObject, G_functionPlotObject, G_paramCurveObject
 */

#include "G_object.H"
#include "G_drawstyle.H"
#include "defs.H"
#include "latex.h"
#include "platform/qt/graphic_qt.h"
#include <QPainter>
#include <QFontMetrics>
#include <QRegularExpression>
#include <cmath>
// ═══════════════════════════════════════════════════════════════════════════
//  G_coordsysObject
// ═══════════════════════════════════════════════════════════════════════════

G_coordsysObject::G_coordsysObject(G_ref *inWhere)
    : G_object(inWhere)
{
    // default origin somewhere near the centre of a 600×500 view
    cs.setOrigin(G_point(300.0, 250.0));
    cs.setScale(100.0);
}

void G_coordsysObject::draw(QPainter &p)
{
    cs.draw(p, *(where->getDrawstyle()), where->getSelected());
}

void G_coordsysObject::update()
{
    const G_refs &par = where->getParentsConst();
    if (par.count() >= 2) {
        G_point o = par[0]->getObject()->getPoint();
        G_point u = par[1]->getObject()->getPoint();

        cs.setOrigin(o);

        double dx = u.getX() - o.getX();
        double dy = u.getY() - o.getY();
        double d = std::sqrt(dx*dx + dy*dy);
        if (std::isnan(d) || d < 1.0) d = 1.0;
        cs.setScale(d);

        // For RECTANGULAR_GRID, derive y-scale from par[2] (V point)
        if (cs.gridForm() == G_coordsys::RECTANGULAR_GRID && par.count() >= 3) {
            G_point v = par[2]->getObject()->getPoint();
            double vdx = v.getX() - o.getX();
            double vdy = o.getY() - v.getY();  // screen y is inverted
            double scaleY = std::sqrt(vdx*vdx + vdy*vdy);
            if (std::isnan(scaleY) || scaleY < 1.0) scaleY = 1.0;
            cs.setScaleY(scaleY);
        } else {
            cs.setScaleY(cs.scale());
        }
    }
}

void G_coordsysObject::tempTransform(const ViewTransform &trans)
{
    G_point o = cs.origin();
    cs.setOrigin(G_point((o.getX() + trans.offsetX) * trans.zoom,
                         (o.getY() + trans.offsetY) * trans.zoom));
    cs.setScale(cs.scale() * trans.zoom);
}

// ═══════════════════════════════════════════════════════════════════════════
//  G_functionObject
// ═══════════════════════════════════════════════════════════════════════════

G_functionObject::G_functionObject(G_ref *inWhere)
    : G_object(inWhere), m_pos(80.0, 60.0)
{}

void G_functionObject::update()
{
    // Nothing to precompute; MicroTeX parses on every draw().
}

QString G_functionObject::displayString() const
{
    QString lbl = where->getLabel().getText();
    if (lbl.isEmpty()) lbl = QStringLiteral("f");
    QString var = func.varName().isEmpty() ? QStringLiteral("x") : func.varName();
    // Build plain-text "ugly" string, e.g. "f(x) = x^2+sin(x)"
    return lbl + QStringLiteral("(") + var + QStringLiteral(") = ") + func.formula();
}

// Convert a "ugly" formula string (e.g. "f(x) = x^2+sin(x)") to LaTeX.
// ── Helpers ──────────────────────────────────────────────────────────────────

// Returns the matching closing bracket index for an open bracket at pos `open`.
// open must point to '('.
static int matchClose(const QString &s, int open)
{
    int depth = 1;
    for (int j = open + 1; j < s.length(); ++j) {
        if (s[j] == '(') ++depth;
        else if (s[j] == ')' && --depth == 0) return j;
    }
    return s.length() - 1; // unmatched – return end
}

// Convert infix "ugly" formula string to LaTeX.
// Handles: trig/log named functions, sqrt, ^, and / → \frac.
static QString uglyToLatex(const QString &src, bool addPi = false)
{
    QString s = src;

    // ── Named functions (longer names first to avoid partial matches) ──────────
    s.replace("arcsin(", "\\arcsin(");
    s.replace("arccos(", "\\arccos(");
    s.replace("arctan(", "\\arctan(");
    s.replace("asin(",   "\\arcsin(");
    s.replace("acos(",   "\\arccos(");
    s.replace("atan(",   "\\arctan(");
    s.replace("log10(",  "\\log_{10}(");
    s.replace("sin(",    "\\sin(");
    s.replace("cos(",    "\\cos(");
    s.replace("tan(",    "\\tan(");
    s.replace("cot(",    "\\cot(");
    s.replace("ln(",     "\\ln(");
    s.replace("exp(",    "\\exp(");
    s.replace("log(",    "\\log(");
    s.replace("sgn(",    "\\mathrm{sgn}(");
    s.replace("round(",  "\\mathrm{round}(");
    s.replace("floor(",  "\\lfloor ");
    s.replace("ceil(",   "\\lceil ");

    if (addPi)
        s.replace(QRegularExpression(QStringLiteral("\\bpi\\b")), QStringLiteral("\\pi"));

    // ── sqrt(expr) → \sqrt{expr} ───────────────────────────────────────────────
    {
        int i = 0;
        while ((i = s.indexOf("sqrt(", i)) >= 0) {
            // find the '(' that sqrt introduced
            int openParen = i + 4; // points to '('
            int closeParen = matchClose(s, openParen);
            // Replace 'sqrt(' ... ')' with '\sqrt{' ... '}'
            s[closeParen] = '}';
            s.replace(i, 5, "\\sqrt{");
            // Note: replace shifts indices – restart search from current pos
            i += 6;
        }
    }

    // ── ^N or ^(expr) → ^{N} or ^{expr} ──────────────────────────────────────
    {
        QString out;
        int n = s.length();
        for (int i = 0; i < n; ++i) {
            if (s[i] != '^' || i + 1 >= n) { out += s[i]; continue; }
            out += '^';
            if (s[i+1] == '{') {
                // Already braced
            } else if (s[i+1] == '(') {
                out += '{'; i += 2;
                int depth = 1;
                for (; i < n && depth > 0; ++i) {
                    if (s[i] == '(') { ++depth; out += s[i]; }
                    else if (s[i] == ')') {
                        if (--depth == 0) out += '}';
                        else out += s[i];
                    } else out += s[i];
                }
                --i;
            } else {
                out += '{'; ++i;
                if (i < n && s[i] == '-') out += s[i++];
                while (i < n && (s[i].isLetterOrNumber() || s[i] == '.' || s[i] == '\\'))
                    out += s[i++];
                // consume rest of a latex command like \pi
                while (i < n && s[i].isLetter()) out += s[i++];
                out += '}'; --i;
            }
        }
        s = out;
    }

    // ── A/B → \frac{A}{B} ────────────────────────────────────────────────────
    // We do multiple passes until no bare '/' remains at depth 0.
    auto isFracSlash = [](const QString &str, int pos) -> bool {
        // A slash is a candidate for \frac only if it is at parenthesis depth 0
        int depth = 0;
        for (int k = 0; k < pos; ++k) {
            if (str[k] == '(') ++depth;
            else if (str[k] == ')') --depth;
        }
        return depth == 0;
    };

    // Helper: given string s and a slash position sl, find the start of the
    // numerator (token to the left of sl) and return [numStart, sl-1].
    // A "token" is: a parenthesised group, or a run of alphanumeric/. chars.
    auto leftToken = [](const QString &str, int sl) -> QPair<int,int> {
        int r = sl - 1;
        while (r >= 0 && str[r] == ' ') --r;
        if (r < 0) return {0, -1};
        if (str[r] == ')') {
            // walk back to matching '('
            int depth = 1;
            int l = r - 1;
            for (; l >= 0 && depth > 0; --l) {
                if (str[l] == ')') ++depth;
                else if (str[l] == '(') --depth;
            }
            ++l; // l was one past the '('
            // also grab any function name before the '('
            int fl = l - 1;
            while (fl >= 0 && (str[fl].isLetter() || str[fl] == '\\' || str[fl] == '_' || str[fl] == '{')) --fl;
            return {fl + 1, r};
        }
        // plain token: letters, digits, dots, backslash commands, {}
        if (str[r] == '}') {
            int depth = 1, l = r - 1;
            for (; l >= 0 && depth > 0; --l) {
                if (str[l] == '}') ++depth;
                else if (str[l] == '{') --depth;
            }
            ++l;
            // grab preceding \ commands
            while (l > 0 && str[l-1].isLetter()) --l;
            if (l > 0 && str[l-1] == '\\') --l;
            return {l, r};
        }
        int l = r;
        while (l > 0 && (str[l-1].isLetterOrNumber() || str[l-1] == '.' || str[l-1] == '_')) --l;
        return {l, r};
    };

    // Helper: right token starting at sl+1
    auto rightToken = [](const QString &str, int sl) -> QPair<int,int> {
        int l = sl + 1;
        while (l < str.length() && str[l] == ' ') ++l;
        if (l >= str.length()) return {l, l};
        if (str[l] == '-') ++l; // leading minus for denominator
        if (l < str.length() && str[l] == '(') {
            int depth = 1, r = l + 1;
            for (; r < str.length() && depth > 0; ++r) {
                if (str[r] == '(') ++depth;
                else if (str[r] == ')') --depth;
            }
            return {sl+1, r-1};
        }
        // plain token
        int r = l;
        while (r < str.length() && (str[r].isLetterOrNumber() || str[r] == '.' || str[r] == '_')) ++r;
        return {sl+1, r-1};
    };

    for (int pass = 0; pass < 20; ++pass) {
        int sl = -1;
        for (int i = 0; i < s.length(); ++i) {
            if (s[i] == '/' && isFracSlash(s, i)) { sl = i; break; }
        }
        if (sl < 0) break;
        auto [ns, ne] = leftToken(s, sl);
        auto [ds, de] = rightToken(s, sl);
        if (ns > ne || ds > de) break; // safety
        QString num = s.mid(ns, ne - ns + 1).trimmed();
        QString den = s.mid(ds, de - ds + 1).trimmed();
        // Strip outer parens from num/den if they fully wrap it
        auto stripParens = [](const QString &t) -> QString {
            if (t.length() >= 2 && t.front() == '(' && t.back() == ')') {
                int d = 1;
                for (int k = 1; k < t.length() - 1; ++k) {
                    if (t[k] == '(') ++d; else if (t[k] == ')') --d;
                    if (d == 0) return t; // closing paren before end – not wrapping
                }
                return t.mid(1, t.length() - 2);
            }
            return t;
        };
        num = stripParens(num);
        den = stripParens(den);
        QString frac = "\\dfrac{" + num + "}{" + den + "}";
        s = s.left(ns) + frac + s.mid(de + 1);
    }

    return s;
}

QRect G_functionObject::getScrollExtents() const
{
    if (!m_lastSize.isEmpty()) {
        QRect r;
        r.setSize(m_lastSize);
        r.moveCenter(m_pos.toQPoint());
        return r;
    }
    // Fallback before first draw
    QFontMetrics fm(where->getDrawstyle()->getFont());
    QRect r = fm.boundingRect(displayString());
    r.moveCenter(m_pos.toQPoint());
    return r;
}

void G_functionObject::draw(QPainter &p)
{
    QRect win = p.window();
    if ((m_pos - G_point(win.center())).lengthsq() > DRAW_MAX * DRAW_MAX) return;

    QColor c = where->getDrawstyle()->getPen().color();
    tex::color fg = ((tex::color)255 << 24) |
                    ((tex::color)c.red()   << 16) |
                    ((tex::color)c.green() <<  8) |
                    ((tex::color)c.blue());

    const float textSize = qMax(10.0f,
        (float)where->getDrawstyle()->getFont().pointSize());
    const QString latexStr = uglyToLatex(displayString());

    try {
        tex::TeXRender *r = tex::LaTeX::parse(
            latexStr.toStdWString(), 600, textSize, textSize * 0.2f, fg);
        if (!r) return;
        const int w = r->getWidth(), h = r->getHeight();
        m_lastSize = QSize(w, h);
        const int drawX = ROUND(m_pos.getX()) - w / 2;
        const int drawY = ROUND(m_pos.getY()) - h / 2;
        p.save();
        { tex::Graphics2D_qt g2(&p); r->draw(g2, drawX, drawY); }
        p.restore();
        delete r;

        if (where->getSelected()) {
            p.setBrush(QBrush());
            p.setPen(QPen(G_drawstyle::getBorderColor(c), 2));
            p.drawRect(QRect(drawX - 2, drawY - 2, w + 4, h + 4));
        }
    } catch (...) {}
}

// ═══════════════════════════════════════════════════════════════════════════
//  G_functionPlotObject
// ═══════════════════════════════════════════════════════════════════════════

G_functionPlotObject::G_functionPlotObject(G_ref *inWhere)
    : G_object(inWhere), m_curveRef(plot), viewW(800)
{}

void G_functionPlotObject::update()
{
    // Parent[0] must be a G_COORDSYS ref
    const G_refs &par = where->getParentsConst();
    if (par.empty()) return;

    G_ref *csRef = par[0];
    if (!csRef || csRef->getType() != G_COORDSYS) return;

    G_coordsysObject *csObj =
        dynamic_cast<G_coordsysObject *>(csRef->getObject());
    if (!csObj) return;

    const G_coordsys &cs = csObj->getCoordSys();

    // If there is a G_FUNCTION parent, copy its formula/domain
    if (par.count() >= 2 && par[1]->getType() == G_FUNCTION) {
        G_functionObject *fnObj =
            dynamic_cast<G_functionObject *>(par[1]->getObject());
        if (fnObj) {
            // Sync the inline plot function from the parent function definition
            plot.funcDef().setFormula(fnObj->getFuncDef().formula());
            plot.funcDef().setVarName(fnObj->getFuncDef().varName());
            plot.funcDef().setDomain(fnObj->getFuncDef().tMin(),
                                     fnObj->getFuncDef().tMax());
            plot.funcDef().setNumSamples(fnObj->getFuncDef().numSamples());
        }
    }

    plot.sample(cs, viewW);
    m_curveRef.setCoordSys(&cs);
}

void G_functionPlotObject::draw(QPainter &p)
{
    plot.draw(p, *(where->getDrawstyle()), where->getSelected());
}

void G_functionPlotObject::tempTransform(const ViewTransform &trans)
{
    plot.applyViewTransform(trans.offsetX, trans.offsetY, trans.zoom);
}

// ═══════════════════════════════════════════════════════════════════════════
//  G_paramCurveObject
// ═══════════════════════════════════════════════════════════════════════════

G_paramCurveObject::G_paramCurveObject(G_ref *inWhere)
    : G_object(inWhere)
{}

void G_paramCurveObject::update()
{
    const G_refs &par = where->getParentsConst();
    if (par.empty()) return;

    G_ref *csRef = par[0];
    if (!csRef || csRef->getType() != G_COORDSYS) return;
    G_coordsysObject *csObj =
        dynamic_cast<G_coordsysObject *>(csRef->getObject());
    if (!csObj) return;

    const G_coordsys &cs = csObj->getCoordSys();

    // If parents[1] and parents[2] are G_FUNCTION refs, copy their defs
    if (par.count() >= 3) {
        auto syncFn = [](G_ref *fnRef, G_functionDef &dest) {
            if (!fnRef || fnRef->getType() != G_FUNCTION) return;
            G_functionObject *fnObj =
                dynamic_cast<G_functionObject *>(fnRef->getObject());
            if (!fnObj) return;
            dest.setFormula(fnObj->getFuncDef().formula());
            dest.setVarName(fnObj->getFuncDef().varName());
            dest.setDomain(fnObj->getFuncDef().tMin(),
                           fnObj->getFuncDef().tMax());
            dest.setNumSamples(fnObj->getFuncDef().numSamples());
        };
        syncFn(par[1], curve.xFunc());
        syncFn(par[2], curve.yFunc());
    }

    curve.sample(cs);
}

void G_paramCurveObject::draw(QPainter &p)
{
    curve.draw(p, *(where->getDrawstyle()), where->getSelected());
}

void G_paramCurveObject::tempTransform(const ViewTransform &trans)
{
    curve.applyViewTransform(trans.offsetX, trans.offsetY, trans.zoom);
}
