/*
 *  HeyGeo — G_parameterObject.cpp
 *
 *  Implements the "New Parameter" (Number menu) GSP-style feature.
 *  A parameter is a standalone named scalar value (e.g. n = 3.00) that
 *  the user can change interactively.  On the canvas it displays like a
 *  measurement.  When exported to the web (Export to Web) it becomes a
 *  JSXGraph slider element so visitors can drag it to explore.
 */

#include "G_object.H"
#include "HeyGeoDocument.H"   // for G_undoChangeCalculation – reuse for undo

#include <QFont>
#include <QPainter>

// ────────────────────────────────────────────────────────────────────────────
//  G_parameterObject
// ────────────────────────────────────────────────────────────────────────────

G_parameterObject::G_parameterObject(G_ref *inWhere)
    : G_valueObject(inWhere, /*lhsRestricted=*/true),
      paramName(QStringLiteral("n")),
      minVal(0.0),
      maxVal(10.0),
      step(0.0)
{
    value = 1.0;
}

void G_parameterObject::setValue(double v)
{
    if (maxVal > minVal)
        value = qBound(minVal, v, maxVal);
    else
        value = v;
    dirtylhs = true;
}

void G_parameterObject::updatelhs()
{
    // Build plain display string, e.g. "n = 3.00"
    displayText = paramName + QStringLiteral(" = ") + QString::number(value, 'f', 2);
    // Parse it so the KFormula renderer draws it on the canvas
    lhs.parse(displayText);
    dirtylhs = false;
}

void G_parameterObject::save(QDataStream &stream)
{
    stream << pos;
    stream << paramName;
    stream << value;
    stream << minVal;
    stream << maxVal;
    stream << step;
}

void G_parameterObject::load(QDataStream &stream)
{
    stream >> pos;
    stream >> paramName;
    stream >> value;
    stream >> minVal;
    stream >> maxVal;
    stream >> step;
}
