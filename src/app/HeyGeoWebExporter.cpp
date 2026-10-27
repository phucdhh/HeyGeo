/*
 *  HeyGeo
 *  Copyright (C) 2026 HeyGeo Contributors
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 */

#include "HeyGeoWebExporter.H"

#include "HeyGeoDocument.H"
#include "HeyGeoView.H"
#include "G_ref.H"
#include "G_object.H"
#include "G_drawstyle.H"
#include "G_refs.H"
#include "defs.H"
#include "formula/kformula.H"
#include "formula/box.H"
#include "geometry/G_function.H"

#include <QBuffer>
#include <QFile>
#include <QFileInfo>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QMap>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QPainter>
#include <QRegularExpression>
#include <QSvgGenerator>
#include <QUrl>

// --------------------------------------------------------------------------
// HeyGeoViewCtx
// --------------------------------------------------------------------------

QJsonArray HeyGeoViewCtx::boundingBox() const
{
    double hw = width  / (2.0 * zoom * SCALE);
    double hh = height / (2.0 * zoom * SCALE);
    // JSXGraph format: [x_min, y_max, x_max, y_min]
    return QJsonArray{ -hw, hh, hw, -hh };
}

// --------------------------------------------------------------------------
// Constructor
// --------------------------------------------------------------------------

HeyGeoWebExporter::HeyGeoWebExporter(QObject *parent) : QObject(parent) {}

// --------------------------------------------------------------------------
// buildIdMap  --  assign a unique JSXGraph string ID to every live ref
// --------------------------------------------------------------------------

static QString gTypePrefix(int type)
{
    switch (type) {
    case G_POINT:          return QStringLiteral("p");
    case G_SEGMENT:        return QStringLiteral("seg");
    case G_LINE:           return QStringLiteral("ln");
    case G_RAY:            return QStringLiteral("ray");
    case G_CIRCLE:         return QStringLiteral("cir");
    case G_ARC:            return QStringLiteral("arc");
    case G_POLYGON:        return QStringLiteral("poly");
    case G_CIRCLEINTERIOR: return QStringLiteral("cint");
    case G_ARCSECTOR:      return QStringLiteral("asec");
    case G_ARCSEGMENT:     return QStringLiteral("aseg");
    case G_LOCUS:          return QStringLiteral("loc");
    case G_MEASURE:        return QStringLiteral("mea");
    case G_CALCULATE:      return QStringLiteral("cal");
    case G_COORDSYS:       return QStringLiteral("cs");
    case G_FUNCTION:       return QStringLiteral("fn");
    case G_FUNCTIONPLOT:   return QStringLiteral("fp");
    case G_PARAMCURVE:     return QStringLiteral("pc");
    case G_PARAMETER:      return QStringLiteral("par");
    default:               return QStringLiteral("obj");
    }
}
void HeyGeoWebExporter::buildIdMap(HeyGeoDocument *doc,
                                    QMap<G_ref*, QString> &idMap)
{
    QMap<QString, int> counter;
    for (int i = 0; i < doc->getNumRefs(); ++i) {
        G_ref *ref = doc->getRef(i);
        if (ref->getDeleted()) continue;
        QString prefix = gTypePrefix(ref->getType());
        int n = counter.value(prefix, 0);
        counter[prefix] = n + 1;
        idMap[ref] = prefix + QString::number(n);
    }
}

// --------------------------------------------------------------------------
// pid -- look up a parent ref's JSXGraph ID (empty string if not found)
// --------------------------------------------------------------------------

QString HeyGeoWebExporter::pid(G_ref *ref,
                                const QMap<G_ref*, QString> &idMap) const
{
    if (!ref) return {};
    return idMap.value(ref, {});
}

// --------------------------------------------------------------------------
// refToAttrs -- JSXGraph attrs object from drawstyle + label metadata
// --------------------------------------------------------------------------

QJsonObject HeyGeoWebExporter::refToAttrs(G_ref *ref, bool isPoint, bool isFilled)
{
    QJsonObject attrs;
    G_drawstyle *ds = ref->getDrawstyle();

    if (ds) {
        attrs[QStringLiteral("strokeColor")] = ds->getPen().color().name();
        int pw = ds->getPen().width();
        if (pw > 0) attrs[QStringLiteral("strokeWidth")] = pw;

        switch (ds->getPen().style()) {
        case Qt::DashLine: attrs[QStringLiteral("dash")] = 2; break;
        case Qt::DotLine:  attrs[QStringLiteral("dash")] = 1; break;
        default: break;
        }

        if (isPoint) {
            switch (ds->getPointStyle()) {
            case SMALL_CIRCLE: attrs[QStringLiteral("size")] = 2; break;
            case LARGE_CIRCLE: attrs[QStringLiteral("size")] = 5; break;
            default:           attrs[QStringLiteral("size")] = 3; break;
            }
        }

        if (isFilled) {
            QColor fill = ds->getBrush().color();
            if (fill.isValid() && fill != Qt::transparent) {
                attrs[QStringLiteral("fillColor")]   = fill.name();
                attrs[QStringLiteral("fillOpacity")] = 0.4;
            } else {
                attrs[QStringLiteral("fillColor")]   = ds->getPen().color().name();
                attrs[QStringLiteral("fillOpacity")] = 0.2;
            }
        }

        // Export font information for labels
        QFont font = ds->getFont();
        int ptSize = font.pointSize();
        QString family = font.family();

        // Map desktop font families to web-safe equivalents
        QString webFamily;
        if (family.contains(QLatin1String("Latin Modern"), Qt::CaseInsensitive) ||
            family.contains(QLatin1String("CMU"), Qt::CaseInsensitive)) {
            webFamily = QStringLiteral("'Latin Modern Math', 'STIX Two Math', 'Times New Roman', serif");
        } else if (family.contains(QLatin1String("Times"), Qt::CaseInsensitive) ||
                   family.contains(QLatin1String("Georgia"), Qt::CaseInsensitive)) {
            webFamily = QStringLiteral("'Times New Roman', Georgia, serif");
        } else if (family.contains(QLatin1String("Arial"), Qt::CaseInsensitive) ||
                   family.contains(QLatin1String("Helvetica"), Qt::CaseInsensitive)) {
            webFamily = QStringLiteral("Arial, Helvetica, sans-serif");
        } else if (family.contains(QLatin1String("Courier"), Qt::CaseInsensitive) ||
                   family.contains(QLatin1String("Mono"), Qt::CaseInsensitive)) {
            webFamily = QStringLiteral("'Courier New', monospace");
        } else if (!family.isEmpty()) {
            webFamily = family;
        }

        QJsonObject labelAttrs;
        if (ptSize > 0)         labelAttrs[QStringLiteral("fontSize")]   = ptSize;
        if (!webFamily.isEmpty()) labelAttrs[QStringLiteral("fontFamily")] = webFamily;
        if (!labelAttrs.isEmpty()) attrs[QStringLiteral("label")] = labelAttrs;
    }

    QString labelText = ref->getLabel().getText();
    attrs[QStringLiteral("name")] = labelText;
    if (!ref->getLabelVisible() || labelText.isEmpty())
        attrs[QStringLiteral("withLabel")] = false;
    if (!ref->getVisible())
        attrs[QStringLiteral("visible")] = false;

    return attrs;
}

// --------------------------------------------------------------------------
// Invisible helper-point utility
// --------------------------------------------------------------------------

static QJsonObject invisPoint(const QString &id, double jx, double jy)
{
    QJsonObject el;
    el[QStringLiteral("type")]    = QStringLiteral("point");
    el[QStringLiteral("id")]      = id;
    el[QStringLiteral("parents")] = QJsonArray{ jx, jy };
    el[QStringLiteral("attrs")]   = QJsonObject{
        {QStringLiteral("visible"),   false},
        {QStringLiteral("withLabel"), false}
    };
    return el;
}

// JSXGraph transform element (translate/rotate/scale/reflect/generic)
static QJsonObject makeJsxTransform(const QString &id,
                                     const QString &type,
                                     const QJsonArray &parents)
{
    QJsonObject el;
    el[QStringLiteral("type")]    = QStringLiteral("transform");
    el[QStringLiteral("id")]      = id;
    el[QStringLiteral("parents")] = parents;
    el[QStringLiteral("attrs")]   = QJsonObject{{QStringLiteral("type"), type}};
    return el;
}

// Invisible JSXGraph point = transform applied to an existing named point
static QJsonObject invisPointViaTransform(const QString &id,
                                          const QString &srcPtId,
                                          const QString &transId)
{
    QJsonObject el;
    el[QStringLiteral("type")]    = QStringLiteral("point");
    el[QStringLiteral("id")]      = id;
    el[QStringLiteral("parents")] = QJsonArray{srcPtId, transId};
    el[QStringLiteral("attrs")]   = QJsonObject{
        {QStringLiteral("visible"),   false},
        {QStringLiteral("withLabel"), false}
    };
    return el;
}

// --------------------------------------------------------------------------
// expandCalcLabel -- expand a G_CALCULATE formula string to a readable
//   plain-text label by replacing IS_REFERENCE chars with parent labels.
// --------------------------------------------------------------------------
static QString expandCalcLabel(const G_calculateObject *calcObj,
                                const G_refs            &par)
{
    if (!calcObj) return QString();
    QString ugly = KFormula::toUgly(calcObj->getFormulaString());
    QString result;
    for (QChar ch : ugly) {
        int code = ch.unicode();
        if (IS_REFERENCE(code)) {
            int idx = code - REFERENCE_ABOVE;
            if (idx >= 0 && idx < (int)par.size() && par[idx]) {
                // If the parent is itself a G_CALCULATE, recursively expand
                // its formula so nested expressions like (A+B)/(C+D) render
                // correctly instead of showing the snapshot numeric value.
                auto *pCalc = dynamic_cast<G_calculateObject *>(par[idx]->getObject());
                if (pCalc) {
                    result += expandCalcLabel(pCalc, par[idx]->getParentsConst());
                } else {
                    auto *pvo = dynamic_cast<G_valueObject *>(par[idx]->getObject());
                    if (pvo) {
                        QString pDisp = pvo->getDisplayText();
                        int eqIdx = pDisp.indexOf(QStringLiteral(" = "));
                        result += (eqIdx >= 0) ? pDisp.left(eqIdx) : pDisp;
                    } else {
                        result += par[idx]->getLabel().getText();
                    }
                }
            }
        } else {
            result += ch;
        }
    }
    return result;
}

// --------------------------------------------------------------------------
// measureSpec -- one attrs.measure descriptor: { op, args, label, precision,
//   unit, scale }.  The web reads it in components/designer/measurement.ts and
// turns it into a live closure over the board, so what travels in the JSON is
// data about the measurement, never code to run.
//   scale carries the desktop centimetres-per-unit factor (cmF): the web
//   multiplies the board value by it before formatting, so the exported
//   measurement still reads in centimetres.
// --------------------------------------------------------------------------
static QJsonObject measureSpec(const QString &op,
                               const QStringList &args,
                               const QString &label = QString(),
                               const QString &unit = QString(),
                               double scale = 1.0)
{
    QJsonArray jargs;
    for (const QString &a : args) jargs.append(a);

    QJsonObject spec;
    spec[QStringLiteral("op")]        = op;
    spec[QStringLiteral("args")]      = jargs;
    spec[QStringLiteral("precision")] = 2;
    if (!label.isEmpty()) spec[QStringLiteral("label")] = label;
    if (!unit.isEmpty())  spec[QStringLiteral("unit")]  = unit;
    if (scale != 1.0)     spec[QStringLiteral("scale")] = scale;
    return spec;
}

/** The text before " = " in the desktop caption -- the web measurement label. */
static QString measureLabelText(G_valueObject *valObj)
{
    QString disp = valObj ? valObj->getDisplayText() : QString();
    int eq = disp.lastIndexOf(QStringLiteral(" = "));
    return (eq >= 0) ? disp.left(eq) : disp;
}

// --------------------------------------------------------------------------
// measureSpecFor -- the attrs.measure descriptor for a non-coord G_MEASURE.
//   Returns an empty object for the types the web has no declarative op for
//   (area, arc length) and for coord measures, which have their own ops.
// --------------------------------------------------------------------------
static QJsonObject measureSpecFor(G_ref *ref,
                                  const QMap<G_ref*, QString> &idMap,
                                  double cmF)
{
    int dtype = ref->getDescendType();
    const G_refs &par = ref->getParentsConst();
    auto objId = [&](G_ref *r) -> QString {
        if (!r) return QString();
        auto it = idMap.find(r);
        return (it != idMap.end()) ? *it : QString();
    };
    auto specOrNull = [&](const QString &op, const QStringList &args,
                          const QString &unit = QString(), double scale = 1.0) {
        for (const QString &id : args) if (id.isEmpty()) return QJsonObject();
        G_valueObject *valObj = dynamic_cast<G_valueObject *>(ref->getObject());
        return measureSpec(op, args, measureLabelText(valObj), unit, scale);
    };

    switch (dtype) {

    case G_DISTANCE_MEASURE: {
        if ((int)par.size() < 2) return QJsonObject();
        QString p0id = objId(par[0]);
        if (p0id.isEmpty() || par[0]->getType() != G_POINT) return QJsonObject();
        if (par[1] && par[1]->getType() == G_POINT)
            return specOrNull(QStringLiteral("distance"),
                              { p0id, objId(par[1]) },
                              QStringLiteral(" cm"), cmF);
        if (par[1] && (par[1]->getType() & G_SEGMENT))
            return specOrNull(QStringLiteral("pointSegmentDistance"),
                              { p0id, objId(par[1]) },
                              QStringLiteral(" cm"), cmF);
        return QJsonObject();
    }

    case G_LENGTH_MEASURE: {
        if (par.empty()) return QJsonObject();
        QString sid = objId(par[0]);
        if (par[0]->getType() == G_SEGMENT)
            return specOrNull(QStringLiteral("length"), { sid },
                              QStringLiteral(" cm"), cmF);
        if (par[0]->getType() == G_CIRCLE)
            return specOrNull(QStringLiteral("circumference"), { sid },
                              QStringLiteral(" cm"), cmF);
        return QJsonObject(); // G_ARC arc-length: no declarative op yet
    }

    case G_RADIUS_MEASURE: {
        if (par.empty()) return QJsonObject();
        if (!(par[0]->getType() & (G_CIRCLE | G_ARC))) return QJsonObject();
        return specOrNull(QStringLiteral("radius"), { objId(par[0]) },
                          QStringLiteral(" cm"), cmF);
    }

    case G_ANGLE_MEASURE: {
        if ((int)par.size() < 3) return QJsonObject(); // arc case: skip
        // par = [wing, vertex, wing]; the web op takes the same order.
        return specOrNull(QStringLiteral("angle"),
                          { objId(par[0]), objId(par[1]), objId(par[2]) },
                          QStringLiteral("\u00b0"));
    }

    case G_RATIO_MEASURE: {
        if ((int)par.size() < 2) return QJsonObject();
        QJsonObject spec = specOrNull(QStringLiteral("ratio"),
                                      { objId(par[0]), objId(par[1]) });
        // toUgly() gives "(num)/(den)"; the caption reads "num/den".
        QString label = spec.value(QStringLiteral("label")).toString();
        static const QRegularExpression ratioRe(QStringLiteral(R"(\(([^)]+)\)/\(([^)]+)\))"));
        QRegularExpressionMatch m = ratioRe.match(label);
        if (m.hasMatch())
            spec[QStringLiteral("label")] =
                m.captured(1) + QStringLiteral("/") + m.captured(2);
        return spec;
    }

    case G_SLOPE_MEASURE: {
        if (par.empty()) return QJsonObject(); // segment, line or ray
        return specOrNull(QStringLiteral("slope"), { objId(par[0]) });
    }

    default:
        return QJsonObject(); // coord measures, area, etc.: handled elsewhere
    }
}

// --------------------------------------------------------------------------
// coordMeasureSpec -- the attrs.measure of a measure taken against the
//   document coordinate system.  Its frame is named by the coordsys's own
//   origin and unit points, so the web recomputes it on every drag.
// --------------------------------------------------------------------------
static QJsonObject coordMeasureSpec(G_ref *ref,
                                    const HeyGeoDocument *doc,
                                    const QMap<G_ref*, QString> &idMap)
{
    const int descType = ref->getDescendType();
    if (descType != G_COORDINATES_MEASURE && descType != G_ABSCISSA_MEASURE &&
        descType != G_ORDINATE_MEASURE    && descType != G_COORD_DISTANCE_MEASURE)
        return QJsonObject();

    const G_refs &par = ref->getParentsConst();
    if (par.empty()) return QJsonObject();
    auto objId = [&](G_ref *r) -> QString { return r ? idMap.value(r, QString()) : QString(); };

    // Find csRef in this measure's parents first (new files),
    // then fall back to a document scan (for old files).
    G_ref *csRef = nullptr;
    for (int i = 0; i < (int)par.size(); ++i) {
        if (par[i] && par[i]->getType() == G_COORDSYS && !par[i]->getDeleted()) {
            csRef = par[i]; break;
        }
    }
    if (!csRef) {
        for (int i = 0; i < doc->getNumRefs(); ++i) {
            G_ref *r = doc->getRef(i);
            if (r && r->getType() == G_COORDSYS && !r->getDeleted()) {
                csRef = r; break;
            }
        }
    }
    if (!csRef) return QJsonObject();

    // O and U come from the coordsys's own parents, so the descriptor names
    // them and the web recomputes the frame on every drag.
    const G_refs &csPar = csRef->getParentsConst();
    QString oId = (csPar.size() >= 1) ? objId(csPar[0]) : QString();
    QString uId = (csPar.size() >= 2) ? objId(csPar[1]) : QString();

    // par[0] is always the first measured point.
    QString p0Id   = objId(par[0]);
    QString label0 = par[0]->getLabel().getText();

    // Second point (coord distance only): first G_POINT in par[1..n].
    QString p1Id, label1;
    if (descType == G_COORD_DISTANCE_MEASURE) {
        for (int i = 1; i < (int)par.size(); ++i) {
            if (par[i] && par[i]->getType() == G_POINT) {
                p1Id   = objId(par[i]);
                label1 = par[i]->getLabel().getText();
                break;
            }
        }
    }

    if (oId.isEmpty() || uId.isEmpty() || p0Id.isEmpty()) return QJsonObject();

    const QStringList frame{ oId, uId, p0Id };
    G_valueObject *valObj = dynamic_cast<G_valueObject *>(ref->getObject());
    const QString label = measureLabelText(valObj);
    switch (descType) {
    case G_ABSCISSA_MEASURE:
        return measureSpec(QStringLiteral("relativeAbscissa"), frame,
            QStringLiteral("x<sub>%1</sub>").arg(label0));
    case G_ORDINATE_MEASURE:
        return measureSpec(QStringLiteral("relativeOrdinate"), frame,
            QStringLiteral("y<sub>%1</sub>").arg(label0));
    case G_COORDINATES_MEASURE:
        return measureSpec(QStringLiteral("relativeCoordinates"), frame, label0);
    case G_COORD_DISTANCE_MEASURE:
        if (p1Id.isEmpty()) return QJsonObject();
        return measureSpec(QStringLiteral("relativeDistance"),
            QStringList{ oId, uId, p0Id, p1Id }, label0 + label1);
    default:
        return QJsonObject();
    }
}

static QJsonObject measureSpecForAny(G_ref *ref,
                                     const HeyGeoDocument *doc,
                                     const QMap<G_ref*, QString> &idMap,
                                     double cmF);

// --------------------------------------------------------------------------
// calcMeasureSpec -- attrs.measure for a G_CALCULATE: the formula as infix
//   text, with #0, #1 … standing for the values its parents display.  The web
//   evaluates that text with its own interpreter (HeyGeoWeb/components/
//   designer/expression.ts), so what travels in the JSON is an expression, not
//   a JavaScript body and not the number the desktop had already worked out.
//   Anything the interpreter has no rule for -- a stacked radical, a unit
//   symbol, a parent whose own caption is frozen -- returns empty, and the
//   element keeps the static caption it used to get.
// --------------------------------------------------------------------------
static QJsonObject calcMeasureSpec(G_ref *ref,
                                   const HeyGeoDocument *doc,
                                   const QMap<G_ref*, QString> &idMap,
                                   double cmF)
{
    G_calculateObject *calcObj = dynamic_cast<G_calculateObject *>(ref->getObject());
    if (!calcObj) return QJsonObject();

    const QString ugly = KFormula::toUgly(calcObj->getFormulaString());
    if (ugly.isEmpty()) return QJsonObject();

    const G_refs &par = ref->getParentsConst();
    QStringList args;
    QVector<QString> slot(par.size());   // parent -> its index in args
    QString expr;

    for (int i = 0; i < ugly.length(); ++i) {
        const int code = ugly[i].unicode();
        if (!IS_REFERENCE(code)) {
            const QChar ch = ugly[i];
            const bool arithmetic =
                ch == QLatin1Char('.') || ch == QLatin1Char(',') ||
                ch == QLatin1Char(' ')  || ch == QLatin1Char('+') ||
                ch == QLatin1Char('-')  || ch == QLatin1Char('*') ||
                ch == QLatin1Char('/')  || ch == QLatin1Char('^') ||
                ch == QLatin1Char('(')  || ch == QLatin1Char(')') ||
                ch == QLatin1Char('[')  || ch == QLatin1Char(']');
            const bool name =
                (ch >= QLatin1Char('a') && ch <= QLatin1Char('z')) ||
                (ch >= QLatin1Char('A') && ch <= QLatin1Char('Z')) ||
                (ch >= QLatin1Char('0') && ch <= QLatin1Char('9')) ||
                ch == QChar(0x03c0);                    // π
            if (!arithmetic && !name) return QJsonObject();
            expr += ch;
            continue;
        }

        const int idx = code - REFERENCE_ABOVE;
        if (idx < 0 || idx >= (int)par.size() || !par[idx]) return QJsonObject();
        if (slot[idx].isEmpty()) {
            const int ptype = par[idx]->getType();
            if (ptype != G_PARAMETER && !(ptype & (G_MEASURE | G_CALCULATE)))
                return QJsonObject();
            // A parent the web cannot recompute has no number to lend.
            if (ptype != G_PARAMETER &&
                measureSpecForAny(par[idx], doc, idMap, cmF).isEmpty())
                return QJsonObject();
            const QString id = idMap.value(par[idx], QString());
            if (id.isEmpty()) return QJsonObject();
            args << id;
            slot[idx] = QString::number(args.size() - 1);
        }
        expr += QLatin1Char('#') + slot[idx];
    }
    if (expr.isEmpty()) return QJsonObject();

    // The suffix G_calculateObject::update() puts after the number comes from
    // the same dimensional analysis, so the web caption reads alike.
    QString unit;
    const UnitType ut = calcObj->getLhs()->evaluateUnit();
    if      (ut.L == 1 && ut.A == 0) unit = QStringLiteral(" cm");
    else if (ut.L == 2 && ut.A == 0) unit = QStringLiteral(" cm\u00b2");
    else if (ut.L == 0 && ut.A == 1) unit = QStringLiteral("\u00b0");

    QJsonObject spec = measureSpec(QStringLiteral("calculate"), args,
                                   expandCalcLabel(calcObj, par), unit);
    spec[QStringLiteral("expr")] = expr;
    return spec;
}

// --------------------------------------------------------------------------
// measureSpecForAny -- the attrs.measure a value ref would be exported with,
//   whatever its kind.  Both the element itself and a calculation that reads
//   it ask this, so a caption is live in the browser for exactly the measures
//   the web can recompute.
// --------------------------------------------------------------------------
static QJsonObject measureSpecForAny(G_ref *ref,
                                     const HeyGeoDocument *doc,
                                     const QMap<G_ref*, QString> &idMap,
                                     double cmF)
{
    if (!ref || !idMap.contains(ref)) return QJsonObject();
    if (ref->getType() == G_MEASURE) {
        QJsonObject coord = coordMeasureSpec(ref, doc, idMap);
        return !coord.isEmpty() ? coord : measureSpecFor(ref, idMap, cmF);
    }
    if (ref->getType() == G_CALCULATE)
        return calcMeasureSpec(ref, doc, idMap, cmF);
    return QJsonObject();
}

// --------------------------------------------------------------------------
// appendElements -- convert one HeyGeo ref to JSXGraph element(s)
// --------------------------------------------------------------------------

void HeyGeoWebExporter::appendElements(G_ref *ref,
                                        const HeyGeoDocument *doc,
                                        const QMap<G_ref*, QString> &idMap,
                                        const HeyGeoViewCtx &ctx,
                                        QJsonArray &elements)
{
    if (!idMap.contains(ref)) return;

    const QString myId = idMap[ref];
    G_object *gobj     = ref->getObject();
    if (!gobj) return;

    const G_refs &par = ref->getParentsConst();

    switch (ref->getType()) {

    // ── POINT ────────────────────────────────────────────────────────────────
    case G_POINT: {
        G_point pt = gobj->getPoint();
        int dtype  = ref->getDescendType();
        QJsonObject el;
        el[QStringLiteral("id")] = myId;

        auto fixedPt = [&]() {
            el[QStringLiteral("type")]    = QStringLiteral("point");
            el[QStringLiteral("parents")] = QJsonArray{ ctx.toJsxX(pt.getX()),
                                                        ctx.toJsxY(pt.getY()) };
            QJsonObject attrs = refToAttrs(ref, true);
            attrs[QStringLiteral("fixed")] = true;
            el[QStringLiteral("attrs")]    = attrs;
        };

        if (dtype == G_FREE_POINT || dtype == G_HORIZONTAL_POINT) {
            // G_HORIZONTAL_POINT (e.g. U(1;0) of a coordsys) is constrained
            // in HeyGeo but we export it as a fully draggable point on the web.
            el[QStringLiteral("type")]    = QStringLiteral("point");
            el[QStringLiteral("parents")] = QJsonArray{ ctx.toJsxX(pt.getX()),
                                                        ctx.toJsxY(pt.getY()) };
            QJsonObject attrs = refToAttrs(ref, true);
            attrs[QStringLiteral("fixed")] = false;
            el[QStringLiteral("attrs")]    = attrs;

        } else if (dtype == G_CONSTRAINED_POINT && !par.empty()) {
            QString curveId = pid(par[0], idMap);
            if (!curveId.isEmpty()) {
                el[QStringLiteral("type")]    = QStringLiteral("glider");
                el[QStringLiteral("parents")] = QJsonArray{
                    ctx.toJsxX(pt.getX()), ctx.toJsxY(pt.getY()), curveId };
                el[QStringLiteral("attrs")]   = refToAttrs(ref, true);
            } else {
                fixedPt();
            }

        } else if ((dtype == G_INTERSECTION_POINT ||
                    dtype == G_INTERSECTION2_POINT) && par.size() >= 2) {
            QString id1 = pid(par[0], idMap), id2 = pid(par[1], idMap);
            if (!id1.isEmpty() && !id2.isEmpty()) {
                el[QStringLiteral("type")]    = QStringLiteral("intersection");
                el[QStringLiteral("parents")] = QJsonArray{
                    id1, id2,
                    (dtype == G_INTERSECTION2_POINT) ? 1 : 0 };
                el[QStringLiteral("attrs")]   = refToAttrs(ref, true);
            } else {
                fixedPt();
            }

        } else if (dtype == G_MID_POINT && !par.empty()) {
            G_ref *segRef       = par[0];
            const G_refs &sp    = segRef->getParentsConst();
            if (sp.size() >= 2) {
                QString p1 = pid(sp[0], idMap), p2 = pid(sp[1], idMap);
                if (!p1.isEmpty() && !p2.isEmpty()) {
                    el[QStringLiteral("type")]    = QStringLiteral("midpoint");
                    el[QStringLiteral("parents")] = QJsonArray{ p1, p2 };
                    el[QStringLiteral("attrs")]   = refToAttrs(ref, true);
                    elements.append(el);
                    return;
                }
            }
            fixedPt();

        } else if (dtype == G_CENTER_POINT && !par.empty()) {
            // Center of a circle or arc: try to reference the circle's own center parent
            G_ref *curveRef = par[0];
            const G_refs &cp = curveRef->getParentsConst();
            if (!cp.empty()) {
                QString centerId = pid(cp[0], idMap);
                if (!centerId.isEmpty()) {
                    // In JSXGraph, use a fixed point that mirrors the center parent's position.
                    el[QStringLiteral("type")]    = QStringLiteral("point");
                    el[QStringLiteral("parents")] = QJsonArray{
                        ctx.toJsxX(pt.getX()), ctx.toJsxY(pt.getY()) };
                    QJsonObject attrs = refToAttrs(ref, true);
                    attrs[QStringLiteral("fixed")] = true;
                    el[QStringLiteral("attrs")] = attrs;
                    elements.append(el);
                    return;
                }
            }
            fixedPt();

        } else if (dtype == G_TRANSLATED && par.size() >= 3) {
            // ── Dynamic translate transform ───────────────────────────────────
            // Use JessieCode expressions so the transform updates when vector endpoints move.
            // X(v2)-X(v1) and Y(v2)-Y(v1) reference the JSXGraph element coordinates.
            QString srcId = pid(par[0], idMap);
            QString v1Id  = pid(par[1], idMap);
            QString v2Id  = pid(par[2], idMap);
            if (!srcId.isEmpty()) {
                QString transId = myId + QStringLiteral("_tr");
                if (!v1Id.isEmpty() && !v2Id.isEmpty()) {
                    // Use $(id) JessieCode notation for board ID lookup (not bare identifiers).
                    // In compiled JessieCode, bare names use getvarJS() which doesn't resolve board IDs.
                    // $('id') compiles to $jc$.board.objects['id'], the correct runtime lookup.
                    elements.append(makeJsxTransform(transId, QStringLiteral("translate"),
                        QJsonArray{QString("X($('%1'))-X($('%2'))").arg(v2Id, v1Id),
                                   QString("Y($('%1'))-Y($('%2'))").arg(v2Id, v1Id)}));
                } else {
                    G_point vp1 = par[1]->getObject()->getPoint();
                    G_point vp2 = par[2]->getObject()->getPoint();
                    elements.append(makeJsxTransform(transId, QStringLiteral("translate"),
                        QJsonArray{(vp2.getX()-vp1.getX())/HeyGeoViewCtx::SCALE,
                                   -(vp2.getY()-vp1.getY())/HeyGeoViewCtx::SCALE}));
                }
                el[QStringLiteral("type")]    = QStringLiteral("point");
                el[QStringLiteral("parents")] = QJsonArray{srcId, transId};
                el[QStringLiteral("attrs")]   = refToAttrs(ref, true);
                elements.append(el);
                return;
            }
            fixedPt();

        } else if (dtype == G_REFLECTED && par.size() >= 2) {
            // ── Dynamic reflect transform ─────────────────────────────────────
            // JSXGraph reflect requires a "line" element as mirror.
            // If the HeyGeo mirror is not a G_LINE (e.g. segment or ray),
            // create an invisible helper line through its defining endpoints.
            QString srcId    = pid(par[0], idMap);
            G_ref  *mirrorRef = par[1];
            QString mirrorLineId;
            if (mirrorRef->getType() == G_LINE) {
                mirrorLineId = pid(mirrorRef, idMap);
            } else if ((mirrorRef->getType() & G_STRAIGHT) &&
                       mirrorRef->getParentsConst().size() >= 2) {
                const G_refs &mp = mirrorRef->getParentsConst();
                QString mp1 = pid(mp[0], idMap), mp2 = pid(mp[1], idMap);
                if (!mp1.isEmpty() && !mp2.isEmpty()) {
                    mirrorLineId = myId + QStringLiteral("_mln");
                    QJsonObject lnEl;
                    lnEl[QStringLiteral("type")]    = QStringLiteral("line");
                    lnEl[QStringLiteral("id")]      = mirrorLineId;
                    lnEl[QStringLiteral("parents")] = QJsonArray{mp1, mp2};
                    lnEl[QStringLiteral("attrs")]   = QJsonObject{
                        {QStringLiteral("visible"),   false},
                        {QStringLiteral("withLabel"), false}};
                    elements.append(lnEl);
                }
            }
            if (!srcId.isEmpty() && !mirrorLineId.isEmpty()) {
                QString reflId = myId + QStringLiteral("_rf");
                elements.append(makeJsxTransform(reflId, QStringLiteral("reflect"),
                                                 QJsonArray{mirrorLineId}));
                el[QStringLiteral("type")]    = QStringLiteral("point");
                el[QStringLiteral("parents")] = QJsonArray{srcId, reflId};
                el[QStringLiteral("attrs")]   = refToAttrs(ref, true);
                elements.append(el);
                return;
            }
            fixedPt();

        } else if (dtype == G_ROTATED && par.size() >= 3) {
            // ── Dynamic rotate transform (fixed angle, 3 parents) ─────────────
            // par[0] = source point, par[1] = center of rotation, par[2] = angle (degrees)
            // HeyGeo internal angle (screen CW) = (360 - deg) * PI / 180
            // JSXGraph CCW angle (Y-flipped)    = (deg - 360) * PI / 180
            QString srcId = pid(par[0], idMap);
            QString ctrId = pid(par[1], idMap);
            if (!srcId.isEmpty() && !ctrId.isEmpty()) {
                double angleDeg = par[2]->getObject()->getNumValue();
                double jsxAngle = (angleDeg - 360.0) * M_PI / 180.0;
                QString transId = myId + QStringLiteral("_ro");
                elements.append(makeJsxTransform(transId, QStringLiteral("rotate"),
                                                 QJsonArray{ jsxAngle, ctrId }));
                el[QStringLiteral("type")]    = QStringLiteral("point");
                el[QStringLiteral("parents")] = QJsonArray{ srcId, transId };
                el[QStringLiteral("attrs")]   = refToAttrs(ref, true);
                elements.append(el);
                return;
            }
            fixedPt();

        } else {
            fixedPt();
        }

        elements.append(el);
        break;
    }

    // ── SEGMENT ──────────────────────────────────────────────────────────────
    case G_SEGMENT: {
        QJsonObject el;
        el[QStringLiteral("type")] = QStringLiteral("segment");
        el[QStringLiteral("id")]   = myId;
        const int segDtype = ref->getDescendType();

        // Only use parent refs as endpoints for non-transform segments.
        // For IS_TRANSFORM, par[0] is the SOURCE object, not an endpoint.
        if (!IS_TRANSFORM(segDtype) && par.size() >= 2) {
            QString p1 = pid(par[0], idMap), p2 = pid(par[1], idMap);
            if (!p1.isEmpty() && !p2.isEmpty()) {
                el[QStringLiteral("parents")] = QJsonArray{ p1, p2 };
                el[QStringLiteral("attrs")]   = refToAttrs(ref);
                elements.append(el);
                return;
            }
        }

        // ── Transformed segment: try dynamic translate via source endpoints ──
        if (segDtype == G_TRANSLATED && par.size() >= 3) {
            G_ref *srcSeg      = par[0];
            const G_refs &sp   = srcSeg->getParentsConst();
            if (sp.size() >= 2) {
                QString ep1Id = pid(sp[0], idMap), ep2Id = pid(sp[1], idMap);
                if (!ep1Id.isEmpty() && !ep2Id.isEmpty()) {
                    QString v1Id  = pid(par[1], idMap);
                    QString v2Id  = pid(par[2], idMap);
                    QString transId = myId + QStringLiteral("_tr");
                    if (!v1Id.isEmpty() && !v2Id.isEmpty()) {
                        elements.append(makeJsxTransform(transId, QStringLiteral("translate"),
                            QJsonArray{QString("X($('%1'))-X($('%2'))").arg(v2Id, v1Id),
                                       QString("Y($('%1'))-Y($('%2'))").arg(v2Id, v1Id)}));
                    } else {
                        G_point vp1 = par[1]->getObject()->getPoint();
                        G_point vp2 = par[2]->getObject()->getPoint();
                        elements.append(makeJsxTransform(transId, QStringLiteral("translate"),
                            QJsonArray{(vp2.getX()-vp1.getX())/HeyGeoViewCtx::SCALE,
                                       -(vp2.getY()-vp1.getY())/HeyGeoViewCtx::SCALE}));
                    }
                    QString tep1 = myId + QStringLiteral("_ep1");
                    QString tep2 = myId + QStringLiteral("_ep2");
                    elements.append(invisPointViaTransform(tep1, ep1Id, transId));
                    elements.append(invisPointViaTransform(tep2, ep2Id, transId));
                    el[QStringLiteral("parents")] = QJsonArray{tep1, tep2};
                    el[QStringLiteral("attrs")]   = refToAttrs(ref);
                    elements.append(el);
                    return;
                }
            }
        }

        // Fallback: use computed segment geometry (correct for all IS_TRANSFORM types)
        G_segment seg = gobj->getSegment();
        QString h1 = myId + QStringLiteral("_h1"), h2 = myId + QStringLiteral("_h2");
        elements.append(invisPoint(h1,
            ctx.toJsxX(seg.getP1().getX()), ctx.toJsxY(seg.getP1().getY())));
        elements.append(invisPoint(h2,
            ctx.toJsxX(seg.getP2().getX()), ctx.toJsxY(seg.getP2().getY())));
        el[QStringLiteral("parents")] = QJsonArray{ h1, h2 };
        el[QStringLiteral("attrs")]   = refToAttrs(ref);
        elements.append(el);
        break;
    }

    // ── LINE ─────────────────────────────────────────────────────────────────
    case G_LINE: {
        QJsonObject el;
        el[QStringLiteral("id")] = myId;
        int dtype = ref->getDescendType();

        auto lineFromTwoIds = [&](const QString &p1, const QString &p2,
                                  const QString &jsxType) {
            el[QStringLiteral("type")]    = jsxType;
            el[QStringLiteral("parents")] = QJsonArray{ p1, p2 };
            el[QStringLiteral("attrs")]   = refToAttrs(ref);
            elements.append(el);
        };

        if (dtype == G_TWOPOINTS_LINE && par.size() >= 2) {
            QString p1 = pid(par[0], idMap), p2 = pid(par[1], idMap);
            if (!p1.isEmpty() && !p2.isEmpty()) {
                lineFromTwoIds(p1, p2, QStringLiteral("line")); return;
            }
        } else if (dtype == G_PARALLEL_LINE && par.size() >= 2) {
            QString lineId = pid(par[0], idMap), ptId = pid(par[1], idMap);
            if (!lineId.isEmpty() && !ptId.isEmpty()) {
                lineFromTwoIds(lineId, ptId, QStringLiteral("parallel")); return;
            }
        } else if (dtype == G_PERPENDICULAR_LINE && par.size() >= 2) {
            QString lineId = pid(par[0], idMap), ptId = pid(par[1], idMap);
            if (!lineId.isEmpty() && !ptId.isEmpty()) {
                lineFromTwoIds(lineId, ptId, QStringLiteral("normal")); return;
            }
        }
        // Fallback: two invis helper points far along the line
        G_line line = gobj->getLine();
        G_point base = line.getP1(), dir = line.getDirection();
        G_point pa = base + dir * 2000.0, pb = base - dir * 2000.0;
        QString h1 = myId + QStringLiteral("_h1"), h2 = myId + QStringLiteral("_h2");
        elements.append(invisPoint(h1,
            ctx.toJsxX(pa.getX()), ctx.toJsxY(pa.getY())));
        elements.append(invisPoint(h2,
            ctx.toJsxX(pb.getX()), ctx.toJsxY(pb.getY())));
        el[QStringLiteral("type")]    = QStringLiteral("line");
        el[QStringLiteral("parents")] = QJsonArray{ h1, h2 };
        el[QStringLiteral("attrs")]   = refToAttrs(ref);
        elements.append(el);
        break;
    }

    // ── RAY ──────────────────────────────────────────────────────────────────
    case G_RAY: {
        QJsonObject el;
        el[QStringLiteral("id")] = myId;
        int dtype = ref->getDescendType();

        if (dtype == G_TWOPOINTS_RAY && par.size() >= 2) {
            QString p1 = pid(par[0], idMap), p2 = pid(par[1], idMap);
            if (!p1.isEmpty() && !p2.isEmpty()) {
                el[QStringLiteral("type")]    = QStringLiteral("line");
                el[QStringLiteral("parents")] = QJsonArray{ p1, p2 };
                QJsonObject attrs = refToAttrs(ref);
                attrs[QStringLiteral("straightFirst")] = false;
                el[QStringLiteral("attrs")] = attrs;
                elements.append(el);
                return;
            }
        } else if (dtype == G_BISECTOR_RAY && par.size() >= 3) {
            // JSXGraph anglebisector: parents = [vertex, point1, point2]
            // GSP bisector: parents = [P1, vertex, P2] (vertex is middle point)
            QString v  = pid(par[1], idMap);   // vertex
            QString p1 = pid(par[0], idMap);
            QString p2 = pid(par[2], idMap);
            if (!v.isEmpty() && !p1.isEmpty() && !p2.isEmpty()) {
                el[QStringLiteral("type")]    = QStringLiteral("anglebisector");
                el[QStringLiteral("parents")] = QJsonArray{ p1, v, p2 };
                el[QStringLiteral("attrs")]   = refToAttrs(ref);
                elements.append(el);
                return;
            }
        }
        G_ray ray    = gobj->getRay();
        G_point orig = ray.getP1(), far = orig + ray.getDirection() * 2000.0;
        QString h1 = myId + QStringLiteral("_orig"), h2 = myId + QStringLiteral("_dir");
        elements.append(invisPoint(h1,
            ctx.toJsxX(orig.getX()), ctx.toJsxY(orig.getY())));
        elements.append(invisPoint(h2,
            ctx.toJsxX(far.getX()),  ctx.toJsxY(far.getY())));
        el[QStringLiteral("type")]    = QStringLiteral("line");
        el[QStringLiteral("parents")] = QJsonArray{ h1, h2 };
        QJsonObject attrs = refToAttrs(ref);
        attrs[QStringLiteral("straightFirst")] = false;
        el[QStringLiteral("attrs")] = attrs;
        elements.append(el);
        break;
    }

    // ── CIRCLE ───────────────────────────────────────────────────────────────
    case G_CIRCLE: {
        QJsonObject el;
        el[QStringLiteral("type")] = QStringLiteral("circle");
        el[QStringLiteral("id")]   = myId;
        const int circDtype = ref->getDescendType();

        // Only use par[0]=center, par[1]=on-circle for non-transform circles.
        if (!IS_TRANSFORM(circDtype) && par.size() >= 2) {
            QString cp = pid(par[0], idMap), op = pid(par[1], idMap);
            if (!cp.isEmpty() && !op.isEmpty()) {
                el[QStringLiteral("parents")] = QJsonArray{ cp, op };
                el[QStringLiteral("attrs")]   = refToAttrs(ref);
                elements.append(el);
                return;
            }
        }

        // ── Translated circle: translate center + on-circle point dynamically ──
        if (circDtype == G_TRANSLATED && par.size() >= 3) {
            G_ref *srcCirc   = par[0];
            const G_refs &sp = srcCirc->getParentsConst();
            if (sp.size() >= 2) {
                QString cpId = pid(sp[0], idMap), opId = pid(sp[1], idMap);
                if (!cpId.isEmpty() && !opId.isEmpty()) {
                    QString v1Id  = pid(par[1], idMap);
                    QString v2Id  = pid(par[2], idMap);
                    QString transId = myId + QStringLiteral("_tr");
                    if (!v1Id.isEmpty() && !v2Id.isEmpty()) {
                        elements.append(makeJsxTransform(transId, QStringLiteral("translate"),
                            QJsonArray{QString("X($('%1'))-X($('%2'))").arg(v2Id, v1Id),
                                       QString("Y($('%1'))-Y($('%2'))").arg(v2Id, v1Id)}));
                    } else {
                        G_point vp1 = par[1]->getObject()->getPoint();
                        G_point vp2 = par[2]->getObject()->getPoint();
                        elements.append(makeJsxTransform(transId, QStringLiteral("translate"),
                            QJsonArray{(vp2.getX()-vp1.getX())/HeyGeoViewCtx::SCALE,
                                       -(vp2.getY()-vp1.getY())/HeyGeoViewCtx::SCALE}));
                    }
                    QString tc = myId + QStringLiteral("_tc");
                    QString to = myId + QStringLiteral("_to");
                    elements.append(invisPointViaTransform(tc, cpId, transId));
                    elements.append(invisPointViaTransform(to, opId, transId));
                    el[QStringLiteral("parents")] = QJsonArray{tc, to};
                    el[QStringLiteral("attrs")]   = refToAttrs(ref);
                    elements.append(el);
                    return;
                }
            }
        }

        // Fallback: computed circle geometry
        {
            G_circle c = gobj->getCircle();
            double rx = c.getCenter().getX() + c.getRadius(), ry = c.getCenter().getY();
            QString hc = myId + QStringLiteral("_c"), hr = myId + QStringLiteral("_r");
            elements.append(invisPoint(hc,
                ctx.toJsxX(c.getCenter().getX()), ctx.toJsxY(c.getCenter().getY())));
            elements.append(invisPoint(hr, ctx.toJsxX(rx), ctx.toJsxY(ry)));
            el[QStringLiteral("parents")] = QJsonArray{ hc, hr };
            el[QStringLiteral("attrs")]   = refToAttrs(ref);
            elements.append(el);
        }
        break;
    }

    // ── CIRCLE INTERIOR ───────────────────────────────────────────────────────
    case G_CIRCLEINTERIOR: {
        QJsonObject el;
        el[QStringLiteral("type")] = QStringLiteral("circle");
        el[QStringLiteral("id")]   = myId;
        const int cintDtype = ref->getDescendType();

        // Only use par[0]=center, par[1]=on-circle for non-transform interiors.
        if (!IS_TRANSFORM(cintDtype) && par.size() >= 2) {
            QString cp = pid(par[0], idMap), op = pid(par[1], idMap);
            if (!cp.isEmpty() && !op.isEmpty()) {
                el[QStringLiteral("parents")] = QJsonArray{ cp, op };
                el[QStringLiteral("attrs")]   = refToAttrs(ref, false, true);
                elements.append(el);
                return;
            }
        }

        // Translated interior: find source circle parents and translate them
        if (cintDtype == G_TRANSLATED && par.size() >= 3) {
            G_ref *srcCint   = par[0];
            const G_refs &sp = srcCint->getParentsConst();
            if (sp.size() >= 2) {
                QString cpId = pid(sp[0], idMap), opId = pid(sp[1], idMap);
                if (!cpId.isEmpty() && !opId.isEmpty()) {
                    QString v1Id  = pid(par[1], idMap);
                    QString v2Id  = pid(par[2], idMap);
                    QString transId = myId + QStringLiteral("_tr");
                    if (!v1Id.isEmpty() && !v2Id.isEmpty()) {
                        elements.append(makeJsxTransform(transId, QStringLiteral("translate"),
                            QJsonArray{QString("X($('%1'))-X($('%2'))").arg(v2Id, v1Id),
                                       QString("Y($('%1'))-Y($('%2'))").arg(v2Id, v1Id)}));
                    } else {
                        G_point vp1 = par[1]->getObject()->getPoint();
                        G_point vp2 = par[2]->getObject()->getPoint();
                        elements.append(makeJsxTransform(transId, QStringLiteral("translate"),
                            QJsonArray{(vp2.getX()-vp1.getX())/HeyGeoViewCtx::SCALE,
                                       -(vp2.getY()-vp1.getY())/HeyGeoViewCtx::SCALE}));
                    }
                    QString tc = myId + QStringLiteral("_tc");
                    QString to = myId + QStringLiteral("_to");
                    elements.append(invisPointViaTransform(tc, cpId, transId));
                    elements.append(invisPointViaTransform(to, opId, transId));
                    el[QStringLiteral("parents")] = QJsonArray{tc, to};
                    el[QStringLiteral("attrs")]   = refToAttrs(ref, false, true);
                    elements.append(el);
                    return;
                }
            }
        }

        // Fallback: compute from circle geometry
        {
            // For circleInterior, get geometry via the corresponding circle object
            // The gobj is a G_circleInteriorObject; its getCircle() gives the circle.
            G_circle c = gobj->getCircle();
            if (c.getRadius() > 0) {
                double rx = c.getCenter().getX() + c.getRadius(), ry = c.getCenter().getY();
                QString hc = myId + QStringLiteral("_c"), hr = myId + QStringLiteral("_r");
                elements.append(invisPoint(hc,
                    ctx.toJsxX(c.getCenter().getX()), ctx.toJsxY(c.getCenter().getY())));
                elements.append(invisPoint(hr, ctx.toJsxX(rx), ctx.toJsxY(ry)));
                el[QStringLiteral("parents")] = QJsonArray{ hc, hr };
                el[QStringLiteral("attrs")]   = refToAttrs(ref, false, true);
                elements.append(el);
            }
        }
        break;
    }

    // ── ARC / ARCSECTOR / ARCSEGMENT ─────────────────────────────────────────
    case G_ARC:
    case G_ARCSECTOR:
    case G_ARCSEGMENT: {
        bool filled = (ref->getType() != G_ARC);
        int dtype   = ref->getDescendType();

        // ── Arc on Circle (G_ONCIRCLE_ARC) ───────────────────────────────────
        if (dtype == G_ONCIRCLE_ARC && par.size() >= 3) {
            // par[0]=circle, par[1]=startPoint, par[2]=endPoint
            // JSXGraph arc needs [centerPoint, startPoint, endPoint]
            G_ref *circRef = par[0];
            const G_refs &circPar = circRef->getParentsConst();
            QString centerId;
            if (!circPar.empty()) centerId = pid(circPar[0], idMap);
            if (centerId.isEmpty()) {
                // Emit invisible center helper from geometry
                G_circle circ = circRef->getObject()->getCircle();
                centerId = myId + QStringLiteral("_cc");
                elements.append(invisPoint(centerId,
                    ctx.toJsxX(circ.getCenter().getX()),
                    ctx.toJsxY(circ.getCenter().getY())));
            }
            QString ps = pid(par[1], idMap);
            QString pe = pid(par[2], idMap);
            if (!ps.isEmpty() && !pe.isEmpty()) {
                QString jsxType = filled ? QStringLiteral("sector")
                                         : QStringLiteral("arc");
                QJsonObject el;
                el[QStringLiteral("type")]    = jsxType;
                el[QStringLiteral("id")]      = myId;
                el[QStringLiteral("parents")] = QJsonArray{ centerId, ps, pe };
                el[QStringLiteral("attrs")]   = refToAttrs(ref, false, filled);
                elements.append(el);
                return;
            }
        }

        // ── Arc through 3 Points (G_THREEPOINTS_ARC) ─────────────────────────
        if (dtype == G_THREEPOINTS_ARC && par.size() >= 3) {
            QString p0 = pid(par[0], idMap);
            QString p1 = pid(par[1], idMap);
            QString p2 = pid(par[2], idMap);
            if (!p0.isEmpty() && !p1.isEmpty() && !p2.isEmpty()) {
                QString jsxType = (ref->getType() == G_ARCSECTOR)
                                  ? QStringLiteral("sector")
                                  : QStringLiteral("circumcirclearc");
                QJsonObject el;
                el[QStringLiteral("type")]    = jsxType;
                el[QStringLiteral("id")]      = myId;
                el[QStringLiteral("parents")] = QJsonArray{ p0, p1, p2 };
                el[QStringLiteral("attrs")]   = refToAttrs(ref, false, filled);
                elements.append(el);
                return;
            }
        }

        // ── Fallback: build from computed arc geometry ─────────────────────────
        {
            G_arc arc = gobj->getArc();
            if (!arc.isValid()) break;
            G_point startPt = arc.getPointOnCurve(0.0);
            G_point endPt   = arc.getPointOnCurve(1.0);

            QString centerId = myId + QStringLiteral("_c");
            elements.append(invisPoint(centerId,
                ctx.toJsxX(arc.getCenter().getX()),
                ctx.toJsxY(arc.getCenter().getY())));
            QString hs = myId + QStringLiteral("_s");
            QString he = myId + QStringLiteral("_e");
            elements.append(invisPoint(hs,
                ctx.toJsxX(startPt.getX()), ctx.toJsxY(startPt.getY())));
            elements.append(invisPoint(he,
                ctx.toJsxX(endPt.getX()),   ctx.toJsxY(endPt.getY())));
            QString jsxType = (ref->getType() == G_ARCSECTOR)
                              ? QStringLiteral("sector") : QStringLiteral("arc");
            QJsonObject el;
            el[QStringLiteral("type")]    = jsxType;
            el[QStringLiteral("id")]      = myId;
            el[QStringLiteral("parents")] = QJsonArray{ centerId, hs, he };
            el[QStringLiteral("attrs")]   = refToAttrs(ref, false, filled);
            elements.append(el);
        }
        break;
    }

    // ── POLYGON ───────────────────────────────────────────────────────────────
    case G_POLYGON: {
        const int polyDtype = ref->getDescendType();

        // ── Non-transform polygon: par[] are the vertex point refs ────────────
        if (!IS_TRANSFORM(polyDtype)) {
            QJsonArray pids;
            bool ok = true;
            for (int i = 0; i < (int)par.size(); ++i) {
                QString p = pid(par[i], idMap);
                if (p.isEmpty()) { ok = false; break; }
                pids.append(p);
            }
            if (!ok || pids.isEmpty()) break;
            QJsonObject el;
            el[QStringLiteral("type")]    = QStringLiteral("polygon");
            el[QStringLiteral("id")]      = myId;
            el[QStringLiteral("parents")] = pids;
            el[QStringLiteral("attrs")]   = refToAttrs(ref, false, true);
            elements.append(el);
            break;
        }

        // ── Translated polygon: dynamically translate each vertex ──────────────
        // par[0]=source polygon, par[1]=vector-start point, par[2]=vector-end point
        if (polyDtype == G_TRANSLATED && par.size() >= 3) {
            G_ref *srcPoly    = par[0];
            const G_refs &sp  = srcPoly->getParentsConst();
            if (!sp.empty()) {
                QString v1Id  = pid(par[1], idMap);
                QString v2Id  = pid(par[2], idMap);
                QString transId = myId + QStringLiteral("_tr");
                if (!v1Id.isEmpty() && !v2Id.isEmpty()) {
                    elements.append(makeJsxTransform(transId, QStringLiteral("translate"),
                        QJsonArray{QString("X($('%1'))-X($('%2'))").arg(v2Id, v1Id),
                                   QString("Y($('%1'))-Y($('%2'))").arg(v2Id, v1Id)}));
                } else {
                    G_point vp1 = par[1]->getObject()->getPoint();
                    G_point vp2 = par[2]->getObject()->getPoint();
                    elements.append(makeJsxTransform(transId, QStringLiteral("translate"),
                        QJsonArray{(vp2.getX()-vp1.getX())/HeyGeoViewCtx::SCALE,
                                   -(vp2.getY()-vp1.getY())/HeyGeoViewCtx::SCALE}));
                }
                QJsonArray polyPids;
                bool ok = true;
                for (int i = 0; i < (int)sp.size(); ++i) {
                    QString srcVid = pid(sp[i], idMap);
                    if (srcVid.isEmpty()) { ok = false; break; }
                    QString tvid = myId + QStringLiteral("_tv") + QString::number(i);
                    elements.append(invisPointViaTransform(tvid, srcVid, transId));
                    polyPids.append(tvid);
                }
                if (ok && !polyPids.isEmpty()) {
                    QJsonObject el;
                    el[QStringLiteral("type")]    = QStringLiteral("polygon");
                    el[QStringLiteral("id")]      = myId;
                    el[QStringLiteral("parents")] = polyPids;
                    el[QStringLiteral("attrs")]   = refToAttrs(ref, false, true);
                    elements.append(el);
                    break;
                }
            }
        }

        // ── Fallback for other IS_TRANSFORM polygons: static vertex positions ──
        // Use source polygon's vertex parent refs and compute transformed positions.
        if (par.size() >= 1) {
            G_ref *srcPoly   = par[0];
            const G_refs &sp = srcPoly->getParentsConst();
            // Compute the transform vector/matrix from this ref's computed state.
            // For each vertex, obtain its position from the source polygon's parent
            // point ref and apply the same geometric offset we see in gobj output.
            // Simplest: use the children of this ref to find translated vertex refs.
            // The children list contains the translated vertex points that
            // updateTransform() produced when this polygon was last updated.
            // Actually, polygon transform updates the POLYGON object in-place via
            // G_polygonObject::update() → updateTransform() → getGeoRef()->translate().
            // Since G_polygon::points is private, reconstruct from source parent offsets.
            if (!sp.empty()) {
                // Compute offset: actual_polygon_point[0] – source_parent_point[0]
                G_point srcVtx0 = sp[0]->getObject()->getPoint();
                // Get the actual translated positions from the source polygon's parents
                // but we can only do this if we know the transform. For the fallback,
                // just export each vertex as a fixed point at the computed offset position.
                // We iterate the source poly's parents and output at (src_pos + offset).
                // The offset is constant for translate, zero for all others when srcPoly
                // geometry is already correct per G_polygonObject::update().
                // Since we can't access G_polygon::points directly, use source parents:
                QJsonArray polyPids;
                bool ok = true;
                for (int i = 0; i < (int)sp.size(); ++i) {
                    G_point vpos = sp[i]->getObject()->getPoint();
                    // For any IS_TRANSFORM, we don't have the actual translated vertex.
                    // Export the source vertices as a static approximation.
                    // (This is a conservative fallback; dynamic exports are done above.)
                    QString hid = myId + QStringLiteral("_fv") + QString::number(i);
                    elements.append(invisPoint(hid,
                        ctx.toJsxX(vpos.getX()), ctx.toJsxY(vpos.getY())));
                    polyPids.append(hid);
                }
                if (ok && !polyPids.isEmpty()) {
                    QJsonObject el;
                    el[QStringLiteral("type")]    = QStringLiteral("polygon");
                    el[QStringLiteral("id")]      = myId;
                    el[QStringLiteral("parents")] = polyPids;
                    el[QStringLiteral("attrs")]   = refToAttrs(ref, false, true);
                    elements.append(el);
                }
            }
        }
        break;
    }

    // ── MEASURE / CALCULATE ───────────────────────────────────────────────────
    case G_MEASURE:
    case G_CALCULATE: {
        G_valueObject *valObj = dynamic_cast<G_valueObject *>(ref->getObject());
        G_point pos = valObj ? valObj->getPos() : ref->getLabel().getPos();
        double jx = ctx.toJsxX(pos.getX());
        double jy = ctx.toJsxY(pos.getY());
        double cmF = HeyGeoViewCtx::SCALE * G_cmPerPixel(); // cm per JSXGraph unit

        QJsonObject el;
        el[QStringLiteral("type")] = QStringLiteral("text");
        el[QStringLiteral("id")]   = myId;

        // A live caption when the web can recompute this one: a measure reads
        // the geometry, a calculation reads the numbers other captions show.
        QJsonObject measure = measureSpecForAny(ref, doc, idMap, cmF);

        // ── Emit element ──────────────────────────────────────────────────────
        // Resolve text color from the ref's drawstyle (respects per-object
        // color set by Display → Color in the desktop app).
        QString textColor = QStringLiteral("#333333");
        {
            G_drawstyle *ds = ref->getDrawstyle();
            if (ds) textColor = ds->getPen().color().name();
        }

        QJsonObject attrs{
            {QStringLiteral("fontSize"),    14},
            {QStringLiteral("strokeColor"), textColor}
        };
        QString caption;
        if (!measure.isEmpty()) {
            attrs[QStringLiteral("measure")] = measure;
            // The web recomputes the caption from the descriptor; parents 0 and
            // 1 say where it sits and index 2 is only the label it leads with.
            caption = measure.value(QStringLiteral("label")).toString();
        } else if (ref->getType() == G_CALCULATE && valObj) {
            // G_calculateObject::update() already put "formula = value" into the
            // display text, so the expanded formula is only a prefix when the
            // text has not got one yet.
            const QString text = valObj->getDisplayText();
            const QString formulaLabel =
                expandCalcLabel(dynamic_cast<G_calculateObject *>(valObj), par);
            if (formulaLabel.isEmpty() || text.startsWith(formulaLabel))
                caption = text;
            else
                caption = text.isEmpty()
                          ? formulaLabel
                          : formulaLabel + QStringLiteral(" = ") + text;
        } else {
            caption = valObj && !valObj->getDisplayText().isEmpty()
                      ? valObj->getDisplayText() : ref->getLabel().getText();
        }
        el[QStringLiteral("parents")] = QJsonArray{ jx, jy, caption };
        el[QStringLiteral("attrs")]   = attrs;
        elements.append(el);
        break;
    }

    // ── COORDINATE SYSTEM ─────────────────────────────────────────────────────
    case G_COORDSYS: {
        G_coordsysObject *csObj =
            dynamic_cast<G_coordsysObject *>(ref->getObject());
        if (!csObj) break;

        const G_coordsys &cs = csObj->getCoordSys();
        // par[0] = O (origin point), par[1] = U(1,0) point.
        // Use their JSXGraph IDs so the axes follow O and U when dragged.
        QString oId = (par.size() >= 1) ? pid(par[0], idMap) : QString();
        QString uId = (par.size() >= 2) ? pid(par[1], idMap) : QString();

        // Unit distance in JSXGraph board coordinates (O→U distance = 1 HeyGeo unit).
        double s = cs.scale();
        double u = s / ctx.zoom / HeyGeoViewCtx::SCALE;

        if (!oId.isEmpty() && !uId.isEmpty()) {
            // We use JSXGraph `line` (not `axis`) so that:
            //  - parent points O/U are NOT locked as isDraggable=false (axis does that)
            //  - needsRegularUpdate stays true (axis defaults to false → axes freeze)
            //  - no automatic full-height tick marks (axis.ticks.majorHeight=-1 → "grid")

            // V = U rotated 90° CCW around O (gives y-axis direction). The web
            // reads that as an image descriptor, not as code to run.
            QString vId = myId + QStringLiteral("_v");
            QJsonObject vEl;
            vEl[QStringLiteral("type")]    = QStringLiteral("point");
            vEl[QStringLiteral("id")]      = vId;
            vEl[QStringLiteral("parents")] = QJsonArray{ uId };
            vEl[QStringLiteral("attrs")]   = QJsonObject{
                {QStringLiteral("visible"),   false},
                {QStringLiteral("withLabel"), false},
                {QStringLiteral("image"),     QJsonObject{
                    {QStringLiteral("op"),  QStringLiteral("rotate")},
                    {QStringLiteral("of"),  QJsonArray{ oId }},
                    {QStringLiteral("angle"), 90} }} };
            elements.append(vEl);

            // x-axis: line through O and U, with right arrow.
            QJsonObject xLineEl;
            xLineEl[QStringLiteral("type")]    = QStringLiteral("line");
            xLineEl[QStringLiteral("id")]      = myId + QStringLiteral("_x");
            xLineEl[QStringLiteral("parents")] = QJsonArray{ oId, uId };
            QJsonObject xAttrs;
            xAttrs[QStringLiteral("straightFirst")] = true;
            xAttrs[QStringLiteral("straightLast")]  = true;
            xAttrs[QStringLiteral("lastArrow")]     = true;
            xAttrs[QStringLiteral("firstArrow")]    = false;
            xAttrs[QStringLiteral("withLabel")]     = true;
            xAttrs[QStringLiteral("name")]  = cs.xLabel().isEmpty()
                                              ? QStringLiteral("x") : cs.xLabel();
            xAttrs[QStringLiteral("label")] = QJsonObject{{QStringLiteral("position"),
                                                           QStringLiteral("rt")}};
            xLineEl[QStringLiteral("attrs")] = xAttrs;
            elements.append(xLineEl);

            // Ticks: static initial distance u. The viewer updates ticksdistance
            // imperatively via setAttribute when U is dragged (coordsys_u_drag binding).
            QString xTicksId = myId + QStringLiteral("_xticks");
            QString yTicksId = myId + QStringLiteral("_yticks");
            QJsonObject xTicksEl;
            xTicksEl[QStringLiteral("type")]    = QStringLiteral("ticks");
            xTicksEl[QStringLiteral("id")]      = xTicksId;
            xTicksEl[QStringLiteral("parents")] = QJsonArray{ myId + QStringLiteral("_x"), u };
            xTicksEl[QStringLiteral("attrs")]   = QJsonObject{
                {QStringLiteral("drawLabels"),    false},
                {QStringLiteral("insertTicks"),   false},
                {QStringLiteral("minorTicks"),    0},
                {QStringLiteral("majorHeight"),   12},
                {QStringLiteral("ticksdistance"), u}};
            elements.append(xTicksEl);

            // y-axis: line through O and V (V = U rotated 90° CCW around O).
            QJsonObject yLineEl;
            yLineEl[QStringLiteral("type")]    = QStringLiteral("line");
            yLineEl[QStringLiteral("id")]      = myId + QStringLiteral("_y");
            yLineEl[QStringLiteral("parents")] = QJsonArray{ oId, vId };
            QJsonObject yAttrs;
            yAttrs[QStringLiteral("straightFirst")] = true;
            yAttrs[QStringLiteral("straightLast")]  = true;
            yAttrs[QStringLiteral("lastArrow")]     = true;
            yAttrs[QStringLiteral("firstArrow")]    = false;
            yAttrs[QStringLiteral("withLabel")]     = true;
            yAttrs[QStringLiteral("name")]  = cs.yLabel().isEmpty()
                                              ? QStringLiteral("y") : cs.yLabel();
            yAttrs[QStringLiteral("label")] = QJsonObject{{QStringLiteral("position"),
                                                           QStringLiteral("rt")}};
            yLineEl[QStringLiteral("attrs")] = yAttrs;
            elements.append(yLineEl);

            // Ticks on y-axis (same static initial distance).
            QJsonObject yTicksEl;
            yTicksEl[QStringLiteral("type")]    = QStringLiteral("ticks");
            yTicksEl[QStringLiteral("id")]      = yTicksId;
            yTicksEl[QStringLiteral("parents")] = QJsonArray{ myId + QStringLiteral("_y"), u };
            yTicksEl[QStringLiteral("attrs")]   = QJsonObject{
                {QStringLiteral("drawLabels"),    false},
                {QStringLiteral("insertTicks"),   false},
                {QStringLiteral("minorTicks"),    0},
                {QStringLiteral("majorHeight"),   12},
                {QStringLiteral("ticksdistance"), u}};
            elements.append(yTicksEl);

            // When O is dragged, U follows (rigid translation of the whole system).
            QJsonObject bindEl;
            bindEl[QStringLiteral("type")]    = QStringLiteral("eventbinding");
            bindEl[QStringLiteral("id")]      = myId + QStringLiteral("_bind");
            bindEl[QStringLiteral("parents")] = QJsonArray{ oId, uId };
            bindEl[QStringLiteral("attrs")]   = QJsonObject{{QStringLiteral("event"),
                                                              QStringLiteral("move_with")}};
            elements.append(bindEl);

            // U constrained horizontal-right of O; dragging it changes unit scale.
            // parents: [uId, oId, xTicksId, yTicksId]
            QJsonObject constrEl;
            constrEl[QStringLiteral("type")]    = QStringLiteral("eventbinding");
            constrEl[QStringLiteral("id")]      = myId + QStringLiteral("_constr");
            constrEl[QStringLiteral("parents")] = QJsonArray{ uId, oId, xTicksId, yTicksId };
            constrEl[QStringLiteral("attrs")]   = QJsonObject{{QStringLiteral("event"),
                                                               QStringLiteral("coordsys_u_drag")}};
            elements.append(constrEl);
        } else {
            // Fallback: static coordinate pairs (no parent refs available).
            double jox = ctx.toJsxX(cs.origin().getX());
            double joy = ctx.toJsxY(cs.origin().getY());

            QJsonObject xLineEl;
            xLineEl[QStringLiteral("type")]    = QStringLiteral("line");
            xLineEl[QStringLiteral("id")]      = myId + QStringLiteral("_x");
            xLineEl[QStringLiteral("parents")] = QJsonArray{ QJsonArray{jox, joy},
                                                              QJsonArray{jox + u, joy} };
            QJsonObject xAttrs;
            xAttrs[QStringLiteral("straightFirst")] = true;
            xAttrs[QStringLiteral("straightLast")]  = true;
            xAttrs[QStringLiteral("lastArrow")]     = true;
            xAttrs[QStringLiteral("firstArrow")]    = false;
            xAttrs[QStringLiteral("withLabel")]     = true;
            xAttrs[QStringLiteral("name")]  = cs.xLabel().isEmpty()
                                              ? QStringLiteral("x") : cs.xLabel();
            xAttrs[QStringLiteral("label")] = QJsonObject{{QStringLiteral("position"),
                                                           QStringLiteral("rt")}};
            xLineEl[QStringLiteral("attrs")] = xAttrs;
            elements.append(xLineEl);

            QJsonObject yLineEl;
            yLineEl[QStringLiteral("type")]    = QStringLiteral("line");
            yLineEl[QStringLiteral("id")]      = myId + QStringLiteral("_y");
            yLineEl[QStringLiteral("parents")] = QJsonArray{ QJsonArray{jox, joy},
                                                              QJsonArray{jox, joy + u} };
            QJsonObject yAttrs;
            yAttrs[QStringLiteral("straightFirst")] = true;
            yAttrs[QStringLiteral("straightLast")]  = true;
            yAttrs[QStringLiteral("lastArrow")]     = true;
            yAttrs[QStringLiteral("firstArrow")]    = false;
            yAttrs[QStringLiteral("withLabel")]     = true;
            yAttrs[QStringLiteral("name")]  = cs.yLabel().isEmpty()
                                              ? QStringLiteral("y") : cs.yLabel();
            yAttrs[QStringLiteral("label")] = QJsonObject{{QStringLiteral("position"),
                                                           QStringLiteral("rt")}};
            yLineEl[QStringLiteral("attrs")] = yAttrs;
            elements.append(yLineEl);
        }
        break;
    }

    // ── FUNCTION DEFINITION (invisible) ────────────────────────────────────
    case G_FUNCTION:
        // Not rendered in JSXGraph – only used as a parent by FUNCTIONPLOT/PARAMCURVE
        break;

    // ── PARAMETER  (Number > New Parameter — exported as JSXGraph slider) ──
    case G_PARAMETER: {
        G_parameterObject *paramObj =
            dynamic_cast<G_parameterObject *>(ref->getObject());
        if (!paramObj) break;

        // Screen position of the parameter text label
        G_point pos = paramObj->getPos();
        double jx   = ctx.toJsxX(pos.getX());
        double jy   = ctx.toJsxY(pos.getY());

        // Slider half-width in JSXGraph coordinates (50 px → board units)
        double halfW = 50.0 / ctx.zoom / HeyGeoViewCtx::SCALE;

        // JSXGraph slider parents: [[x1,y1],[x2,y2],[min,val,max]]
        QJsonObject el;
        el[QStringLiteral("type")] = QStringLiteral("slider");
        el[QStringLiteral("id")]   = myId;
        el[QStringLiteral("parents")] = QJsonArray{
            QJsonArray{ jx - halfW, jy },
            QJsonArray{ jx + halfW, jy },
            QJsonArray{ paramObj->getMinVal(),
                        paramObj->getNumValue(),
                        paramObj->getMaxVal() }
        };
        QJsonObject attrs;
        attrs[QStringLiteral("name")]       = paramObj->getParamName();
        attrs[QStringLiteral("snapWidth")]  = paramObj->getStep() > 0
                                              ? QJsonValue(paramObj->getStep())
                                              : QJsonValue(0.01);
        attrs[QStringLiteral("precision")]  = 2;
        attrs[QStringLiteral("withLabel")]  = true;
        el[QStringLiteral("attrs")]         = attrs;
        elements.append(el);
        break;
    }

    // ── FUNCTION PLOT  y = f(x) ────────────────────────────────────────────
    case G_FUNCTIONPLOT: {
        G_functionPlotObject *fpObj =
            dynamic_cast<G_functionPlotObject *>(ref->getObject());
        if (!fpObj) break;

        const G_functionDef &fd = fpObj->getFunctionPlot().funcDef();
        QString jsExpr = G_functionDef::toJavaScript(fd.formula(), fd.varName());

        QJsonObject el;
        el[QStringLiteral("type")] = QStringLiteral("functiongraph");
        el[QStringLiteral("id")]   = myId;

        // JSXGraph functiongraph parents: [f(x), xMin, xMax]
        // We embed the formula as an inline JS function string.
        el[QStringLiteral("parents")] = QJsonArray{
            QStringLiteral("function(%1){ return %2; }").arg(fd.varName(), jsExpr),
            fd.tMin(),
            fd.tMax()
        };
        el[QStringLiteral("attrs")] = refToAttrs(ref, false, false);
        elements.append(el);
        break;
    }

    // ── PARAMETRIC CURVE  (x(t), y(t)) ────────────────────────────────────
    case G_PARAMCURVE: {
        G_paramCurveObject *pcObj =
            dynamic_cast<G_paramCurveObject *>(ref->getObject());
        if (!pcObj) break;

        const G_paramCurve &pc = pcObj->getParamCurve();
        QString xJs = G_functionDef::toJavaScript(pc.xFunc().formula(),
                                                   pc.xFunc().varName());
        QString yJs = G_functionDef::toJavaScript(pc.yFunc().formula(),
                                                   pc.yFunc().varName());
        double tMin = pc.xFunc().tMin();
        double tMax = pc.xFunc().tMax();

        QJsonObject el;
        el[QStringLiteral("type")] = QStringLiteral("curve");
        el[QStringLiteral("id")]   = myId;
        // JSXGraph curve parents: [x(t), y(t), tMin, tMax]
        el[QStringLiteral("parents")] = QJsonArray{
            QStringLiteral("function(t){ return %1; }").arg(xJs),
            QStringLiteral("function(t){ return %1; }").arg(yJs),
            tMin,
            tMax
        };
        el[QStringLiteral("attrs")] = refToAttrs(ref, false, false);
        elements.append(el);
        break;
    }

    // ── LOCUS ────────────────────────────────────────────────────────────────
    case G_LOCUS: {
        // ── Dynamic tracecurve (point locus only) ────────────────────────────
        // For G_OBJECT_LOCUS where:
        //   par[0] = G_CONSTRAINED_POINT (the glider, e.g. C on the circle)
        //   par[1] = G_POINT (the traced point, e.g. E = midpoint of CD)
        // we export a JSXGraph "tracecurve" [gliderId, tracepointId].
        // This is fully dynamic: moving D, A, B etc. recalculates the locus.
        //
        // For object locus (par[1] is not G_POINT) we fall through to the
        // static snapshot export below.
        if (ref->getDescendType() == G_OBJECT_LOCUS &&
            par.size() >= 2 &&
            par[1]->getType() == G_POINT)
        {
            QString gliderId  = pid(par[0], idMap);
            QString traceId   = pid(par[1], idMap);
            if (!gliderId.isEmpty() && !traceId.isEmpty()) {
                QJsonObject el;
                el[QStringLiteral("type")]    = QStringLiteral("tracecurve");
                el[QStringLiteral("id")]      = myId;
                el[QStringLiteral("parents")] = QJsonArray{ gliderId, traceId };
                QJsonObject locAttrs = refToAttrs(ref);
                locAttrs[QStringLiteral("numberPoints")] = 300;
                el[QStringLiteral("attrs")]   = locAttrs;
                elements.append(el);
                break;
            }
        }

        // ── Dynamic object locus (line envelope) ─────────────────────────────
        // If par[0] = G_CONSTRAINED_POINT (glider) and par[1] = G_LINE,
        // export a JSXGraph "objectlocus" element. The viewer attaches a custom
        // updateDataArray that mirrors the WSP DriveChain/GeomLocus algorithm:
        // glider moves along its path, the dependency chain is re-constrained,
        // and the driven line's stdform is sampled to produce the envelope.
        if (ref->getDescendType() == G_OBJECT_LOCUS &&
            par.size() >= 2 &&
            par[1]->getType() == G_LINE)
        {
            QString gliderId = pid(par[0], idMap);
            QString drivenId = pid(par[1], idMap);
            if (!gliderId.isEmpty() && !drivenId.isEmpty()) {
                QJsonObject el;
                el[QStringLiteral("type")]    = QStringLiteral("objectlocus");
                el[QStringLiteral("id")]      = myId;
                el[QStringLiteral("parents")] = QJsonArray{ gliderId, drivenId };
                QJsonObject locAttrs = refToAttrs(ref);
                locAttrs[QStringLiteral("numberPoints")] = 150;
                el[QStringLiteral("attrs")]   = locAttrs;
                elements.append(el);
                break;
            }
        }

        // ── Static snapshot fallback (object locus / tracecurve not possible) ─
        G_locusObject *locObj = dynamic_cast<G_locusObject *>(gobj);
        if (!locObj || !locObj->locus.isValid()) break;

        const QList<G_geometry *> &objs = locObj->locus.getObjects();
        if (objs.isEmpty()) break;

        QJsonArray xArr, yArr;
        const double halfLen = 700.0; // pixels
        G_point lastSegPt;
        bool hasLastSegPt = false;

        for (G_geometry *geo : objs) {
            switch (geo->getType()) {
            case G_SEGMENT: {
                const G_segment *seg = static_cast<const G_segment *>(geo);
                G_point sp1 = seg->getP1(), sp2 = seg->getP2();
                if (!hasLastSegPt || !(sp1 == lastSegPt)) {
                    xArr.append(ctx.toJsxX(sp1.getX()));
                    yArr.append(ctx.toJsxY(sp1.getY()));
                }
                xArr.append(ctx.toJsxX(sp2.getX()));
                yArr.append(ctx.toJsxY(sp2.getY()));
                lastSegPt = sp2; hasLastSegPt = true;
                break;
            }
            case G_LINE: {
                G_line *ln = static_cast<G_line *>(geo);
                G_point base = ln->getP1();
                G_point d    = ln->getDirection();
                G_point ptA(base.getX() + d.getX() * halfLen,
                            base.getY() + d.getY() * halfLen);
                G_point ptB(base.getX() - d.getX() * halfLen,
                            base.getY() - d.getY() * halfLen);
                xArr.append(ctx.toJsxX(ptA.getX())); yArr.append(ctx.toJsxY(ptA.getY()));
                xArr.append(ctx.toJsxX(ptB.getX())); yArr.append(ctx.toJsxY(ptB.getY()));
                xArr.append(QJsonValue::Null);        yArr.append(QJsonValue::Null);
                hasLastSegPt = false;
                break;
            }
            case G_RAY: {
                G_ray *rn = static_cast<G_ray *>(geo);
                G_point start = rn->getP1();
                G_point d     = rn->getDirection();
                G_point ptEnd(start.getX() + d.getX() * halfLen,
                              start.getY() + d.getY() * halfLen);
                xArr.append(ctx.toJsxX(start.getX())); yArr.append(ctx.toJsxY(start.getY()));
                xArr.append(ctx.toJsxX(ptEnd.getX())); yArr.append(ctx.toJsxY(ptEnd.getY()));
                xArr.append(QJsonValue::Null);          yArr.append(QJsonValue::Null);
                hasLastSegPt = false;
                break;
            }
            case G_CIRCLE: {
                G_point rep = static_cast<G_circle *>(geo)->getCenter();
                if (rep.isValid()) { xArr.append(ctx.toJsxX(rep.getX())); yArr.append(ctx.toJsxY(rep.getY())); }
                hasLastSegPt = false;
                break;
            }
            case G_ARC:
            case G_ARCSECTOR:
            case G_ARCSEGMENT: {
                G_point rep = static_cast<G_arc *>(geo)->getCenter();
                if (rep.isValid()) { xArr.append(ctx.toJsxX(rep.getX())); yArr.append(ctx.toJsxY(rep.getY())); }
                hasLastSegPt = false;
                break;
            }
            case G_POINT: {
                G_point rep = *static_cast<G_point *>(geo);
                if (rep.isValid()) { xArr.append(ctx.toJsxX(rep.getX())); yArr.append(ctx.toJsxY(rep.getY())); }
                hasLastSegPt = false;
                break;
            }
            default:
                hasLastSegPt = false;
                break;
            }
        }

        if (xArr.isEmpty()) break;

        QJsonObject el;
        el[QStringLiteral("type")]    = QStringLiteral("curve");
        el[QStringLiteral("id")]      = myId;
        el[QStringLiteral("parents")] = QJsonArray{ xArr, yArr };
        QJsonObject locAttrs = refToAttrs(ref);
        locAttrs[QStringLiteral("curveType")] = QStringLiteral("plot");
        el[QStringLiteral("attrs")]   = locAttrs;
        elements.append(el);
        break;
    }

    default:
        break;
    }
}

// --------------------------------------------------------------------------
// generateSvgThumbnail -- render the current view to an in-memory SVG
// --------------------------------------------------------------------------

QString HeyGeoWebExporter::generateSvgThumbnail(HeyGeoDocument *doc,
                                                  HeyGeoView     *view,
                                                  int             thumbW,
                                                  int             thumbH)
{
    if (!doc || !view) return {};

    double viewW = view->width()  - HeyGeoView::ScrollBarThickness;
    double viewH = view->height() - HeyGeoView::ScrollBarThickness;
    if (viewW <= 0 || viewH <= 0) return {};

    QBuffer buf;
    buf.open(QIODevice::WriteOnly);

    QSvgGenerator generator;
    generator.setOutputDevice(&buf);
    generator.setSize(QSize(thumbW, thumbH));
    generator.setViewBox(QRect(0, 0, thumbW, thumbH));

    QPainter p(&generator);
    p.setRenderHint(QPainter::Antialiasing, true);
    p.setRenderHint(QPainter::SmoothPixmapTransform, true);

    // Fill background white before scaling
    p.fillRect(0, 0, thumbW, thumbH, Qt::white);

    // Scale the painter so the full view (viewW x viewH) fits inside the thumbnail,
    // centred with letter-boxing if the aspect ratios differ.
    double scale = qMin(thumbW / viewW, thumbH / viewH);
    double tx = (thumbW - viewW * scale) / 2.0;
    double ty = (thumbH - viewH * scale) / 2.0;
    p.translate(tx, ty);
    p.scale(scale, scale);

    doc->print(p, ViewTransform(view->getOffsetX(), view->getOffsetY(), view->getZoom()));
    p.end();

    buf.close();
    return QString::fromUtf8(buf.data());
}

// --------------------------------------------------------------------------
// buildJsonData -- produce the HeyGeoData object  (inner jsonData)
// --------------------------------------------------------------------------

QJsonObject HeyGeoWebExporter::buildJsonData(HeyGeoDocument *doc,
                                              HeyGeoView     *view,
                                              const QString  &title)
{
    HeyGeoViewCtx ctx;
    if (view) {
        ctx.offsetX = view->getOffsetX();
        ctx.offsetY = view->getOffsetY();
        ctx.zoom    = view->getZoom();
        ctx.width   = view->width()  - HeyGeoView::ScrollBarThickness;
        ctx.height  = view->height() - HeyGeoView::ScrollBarThickness;
    }

    QMap<G_ref*, QString> idMap;
    buildIdMap(doc, idMap);

    QJsonArray elements;
    // First pass: all geometric elements (points, segments, circles, sliders, etc.)
    // so that they are in board.objects before any text/measure function fires.
    // G_MEASURE and G_CALCULATE are deferred to the second pass because their
    // JS function closures reference other board elements via board.objects[id],
    // and those elements must already exist when the text content is first evaluated.
    for (int i = 0; i < doc->getNumRefs(); ++i) {
        G_ref *ref = doc->getRef(i);
        if (ref->getDeleted()) continue;
        int t = ref->getType();
        if (t == G_MEASURE || t == G_CALCULATE) continue;
        appendElements(ref, doc, idMap, ctx, elements);
    }
    // Second pass: measure/calculate text elements.
    for (int i = 0; i < doc->getNumRefs(); ++i) {
        G_ref *ref = doc->getRef(i);
        if (ref->getDeleted()) continue;
        int t = ref->getType();
        if (t != G_MEASURE && t != G_CALCULATE) continue;
        appendElements(ref, doc, idMap, ctx, elements);
    }

    // ── Text annotations ──────────────────────────────────────────────────────
    // Emit as a separate "annotations" array (not JSXGraph elements).
    // content stays in the native HeyGeo $...$ / $$...$$ format.
    // The viewer (JSXGraphViewer.tsx) renders them as HTML overlays with KaTeX.
    QJsonArray annotations;
    if (view) {
        const auto &anns = view->getTextAnnotations();
        for (const HeyGeoView::TextAnnotation &ann : anns) {
            if (ann.content.trimmed().isEmpty()) continue;
            // Convert world coords to screen pixel fractions (0..1) for responsive layout
            double sx = (ann.worldX + ctx.offsetX) * ctx.zoom;
            double sy = (ann.worldY + ctx.offsetY) * ctx.zoom;
            double sw = ann.worldW * ctx.zoom;
            double sh = ann.worldH * ctx.zoom;
            // Express as fraction of canvas size for resolution-independence
            double fx = (ctx.width  > 0) ? sx / ctx.width  : 0;
            double fy = (ctx.height > 0) ? sy / ctx.height : 0;
            double fw = (ctx.width  > 0) ? sw / ctx.width  : 0.3;
            double fh = (ctx.height > 0) ? sh / ctx.height : 0.2;
            QJsonObject obj;
            obj[QStringLiteral("content")]   = ann.content;
            obj[QStringLiteral("x")]         = fx;
            obj[QStringLiteral("y")]         = fy;
            obj[QStringLiteral("w")]         = fw;
            obj[QStringLiteral("h")]         = fh;
            obj[QStringLiteral("fontSize")]  = ann.fontSize;
            obj[QStringLiteral("fontColor")] = ann.fontColor.name();  // "#rrggbb"
            annotations.append(obj);
        }
    }

    QJsonObject root;
    root[QStringLiteral("version")]     = QStringLiteral("1.0");
    root[QStringLiteral("title")]       = title.isEmpty()
                                          ? QFileInfo(doc->getFilename()).baseName()
                                          : title;
    // Build a content-aware bounding box.
    //
    // Strategy:
    //   1. Collect all G_POINT positions (these anchor the geometric construction).
    //   2. Also include measure/calculate/parameter text positions, BUT only when
    //      they lie within 3× the half-span of the point set from its centroid.
    //      This prevents accidentally-distant measure labels (e.g. placed far from
    //      the construction in the desktop doc) from shrinking the initial view.
    //   3. If there are no points at all, fall back to all measure positions.
    {
        // --- Pass 1: point positions ---
        double ptXmin = 1e9, ptXmax = -1e9, ptYmin = 1e9, ptYmax = -1e9;
        for (int i = 0; i < doc->getNumRefs(); ++i) {
            G_ref *r = doc->getRef(i);
            if (r->getDeleted() || !r->getObject()) continue;
            if (r->getType() != G_POINT) continue;
            G_point pt = r->getObject()->getPoint();
            double jx = ctx.toJsxX(pt.getX()), jy = ctx.toJsxY(pt.getY());
            if (jx < ptXmin) ptXmin = jx;  if (jx > ptXmax) ptXmax = jx;
            if (jy < ptYmin) ptYmin = jy;  if (jy > ptYmax) ptYmax = jy;
        }
        bool hasPts = ptXmax > ptXmin && ptYmax > ptYmin;

        double bbXmin = ptXmin, bbXmax = ptXmax, bbYmin = ptYmin, bbYmax = ptYmax;

        if (hasPts) {
            // --- Pass 2: include nearby measure/label positions ---
            // Cutoff: within 3× half-span of the point set from its centroid.
            double cx = (ptXmin + ptXmax) * 0.5, cy = (ptYmin + ptYmax) * 0.5;
            double rx = (ptXmax - ptXmin) * 1.5 + 3.0;
            double ry = (ptYmax - ptYmin) * 1.5 + 3.0;
            for (int i = 0; i < doc->getNumRefs(); ++i) {
                G_ref *r = doc->getRef(i);
                if (r->getDeleted() || !r->getObject()) continue;
                int type = r->getType();
                if (type != G_MEASURE && type != G_CALCULATE && type != G_PARAMETER)
                    continue;
                auto *vo = dynamic_cast<G_valueObject *>(r->getObject());
                if (!vo) continue;
                G_point pt = vo->getPos();
                double jx = ctx.toJsxX(pt.getX()), jy = ctx.toJsxY(pt.getY());
                if (fabs(jx - cx) <= rx && fabs(jy - cy) <= ry) {
                    if (jx < bbXmin) bbXmin = jx;  if (jx > bbXmax) bbXmax = jx;
                    if (jy < bbYmin) bbYmin = jy;  if (jy > bbYmax) bbYmax = jy;
                }
            }
        } else {
            // No points — fall back to all measure/calculate/parameter positions.
            bbXmin = 1e9; bbXmax = -1e9; bbYmin = 1e9; bbYmax = -1e9;
            for (int i = 0; i < doc->getNumRefs(); ++i) {
                G_ref *r = doc->getRef(i);
                if (r->getDeleted() || !r->getObject()) continue;
                int type = r->getType();
                if (type != G_MEASURE && type != G_CALCULATE && type != G_PARAMETER)
                    continue;
                auto *vo = dynamic_cast<G_valueObject *>(r->getObject());
                if (!vo) continue;
                G_point pt = vo->getPos();
                double jx = ctx.toJsxX(pt.getX()), jy = ctx.toJsxY(pt.getY());
                if (jx < bbXmin) bbXmin = jx;  if (jx > bbXmax) bbXmax = jx;
                if (jy < bbYmin) bbYmin = jy;  if (jy > bbYmax) bbYmax = jy;
            }
        }

        QJsonArray bb;
        if (bbXmax > bbXmin && bbYmax > bbYmin) {
            double px = qMax((bbXmax - bbXmin) * 0.15, 1.5);
            double py = qMax((bbYmax - bbYmin) * 0.15, 1.5);
            bb = QJsonArray{ bbXmin - px, bbYmax + py, bbXmax + px, bbYmin - py };
        } else {
            bb = ctx.boundingBox();
        }
        root[QStringLiteral("boundingbox")] = bb;
    }
    root[QStringLiteral("axis")]        = false;
    root[QStringLiteral("grid")]        = false;
    root[QStringLiteral("elements")]    = elements;
    if (!annotations.isEmpty())
        root[QStringLiteral("annotations")] = annotations;
    return root;
}

// --------------------------------------------------------------------------
// toFileBytes -- indented JSON for saving to a .heyjson file
// --------------------------------------------------------------------------

QByteArray HeyGeoWebExporter::toFileBytes(HeyGeoDocument *doc,
                                           HeyGeoView     *view,
                                           const QString  &title)
{
    return QJsonDocument(buildJsonData(doc, view, title))
               .toJson(QJsonDocument::Indented);
}

// --------------------------------------------------------------------------
// uploadToServer -- POST /api/models  (web team spec)
// --------------------------------------------------------------------------

void HeyGeoWebExporter::uploadToServer(const QJsonObject &jsonData,
                                        const QString     &apiToken,
                                        const QString     &title,
                                        const QString     &description,
                                        const QString     &guide,
                                        const QString     &thumbnailSvg)
{
    QNetworkAccessManager *mgr = new QNetworkAccessManager(this);

    QNetworkRequest req(QUrl(QStringLiteral("https://heygeo.pedu.vn/api/models")));
    req.setHeader(QNetworkRequest::ContentTypeHeader,
                  QStringLiteral("application/json"));
    if (!apiToken.isEmpty())
        req.setRawHeader("Authorization",
                         QByteArray("Bearer ") + apiToken.toUtf8());

    QJsonObject body;
    body[QStringLiteral("title")]       = title;
    body[QStringLiteral("description")] = description;
    body[QStringLiteral("guide")]       = guide;
    body[QStringLiteral("isPublic")]    = true;
    body[QStringLiteral("jsonData")]    = jsonData;
    if (!thumbnailSvg.isEmpty())
        body[QStringLiteral("thumbnailSvg")] = thumbnailSvg;

    QByteArray payload = QJsonDocument(body).toJson(QJsonDocument::Compact);
    QNetworkReply *reply = mgr->post(req, payload);

    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        bool success = (reply->error() == QNetworkReply::NoError);
        QString shareUrl, message;
        if (success) {
            QJsonObject resp =
                QJsonDocument::fromJson(reply->readAll()).object();
            // Server returns shareUrl directly at the root level when isPublic=true
            shareUrl = resp[QStringLiteral("shareUrl")].toString();
            message = tr("Upload successful");
        } else {
            message = reply->errorString();
        }
        emit uploadFinished(success, message, shareUrl);
        reply->deleteLater();
    });
}
