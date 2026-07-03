/*
 *  HeyGeo
 *  Copyright (C) 1999-2006 Ilya Baran
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
 *
 *  Send comments and/or bug reports to:
 *                 ibaran@mit.edu
 */


#include <stdio.h>
#include <QApplication>
#include <QScreen>

#include "G_object.H"
#include "G_drawstyle.H"
#include "HeyGeoDocument.H"
#include "G_coordsys.H"

// Returns centimetres per logical screen pixel, using the primary screen's DPI.
double G_cmPerPixel()
{
  QScreen *s = QGuiApplication::primaryScreen();
  if (!s) return 2.54 / 96.0;
  double physDpi = s->physicalDotsPerInchX();
  double dpr     = s->devicePixelRatio();
  if (physDpi <= 0 || dpr <= 0) return 2.54 / 96.0;
  return 2.54 * dpr / physDpi;
}

double G_measureObject::getDisplayNumValue() const
{
  int dtype = where->getDescendType();
  if (dtype == G_DISTANCE_MEASURE || dtype == G_LENGTH_MEASURE || dtype == G_RADIUS_MEASURE) {
    return value * G_cmPerPixel();
  } else if (dtype == G_AREA_MEASURE) {
    double cmp = G_cmPerPixel();
    return value * cmp * cmp;
  }
  // G_ANGLE_MEASURE: already stored in degrees.
  // G_RATIO_MEASURE, G_SLOPE_MEASURE, coord measures: dimensionless.
  return value;
}

void G_measureObject::calculate()
{
  QString tmp;

  switch(where->getDescendType()) {
  case G_DISTANCE_MEASURE:
    value = (
	     parent(0)->getPoint() -
	     parent(1)->getGeoRef()->getNearestPoint(parent(0)->getPoint())
	    ).length();
    break;
  case G_LENGTH_MEASURE:
    if(where->getParents()[0]->getType() == G_ARC) {
      value = parent(0)->getArc().getArcLength();
    }
    else if(where->getParents()[0]->getType() == G_CIRCLE) {
      value = parent(0)->getCircle().getRadius() * 2 * M_PI;
      break;
    }
    else { //parent is a segment
      value = parent(0)->getSegment().length();
    }

    break;
    
  case G_RADIUS_MEASURE:
    if(where->getParents()[0]->getType() == G_ARC) {
      value = parent(0)->getArc().getRadius();
    }
    else { //parent is a circle
      value = parent(0)->getCircle().getRadius();
    }
    break;

  case G_ANGLE_MEASURE:
    if(where->getParents()[0]->getType() == G_ARC) {
      value = parent(0)->getArc().getArcAngle() * 180. / M_PI;
    }
    else { //three points
      value = (parent(2)->getPoint() - parent(1)->getPoint()).angle() -
       	(parent(0)->getPoint() - parent(1)->getPoint()).angle();
      value = fmod(-value + 4 * M_PI, 2 * M_PI) * 180. / M_PI;
    }
    break;
    
  case G_RATIO_MEASURE:
    if(parent(1)->getSegment().length() == 0) {    
      value = BIG * 10;
    }
    else {
      value = parent(0)->getSegment().length() /
	parent(1)->getSegment().length();
    }
      
    break;

  case G_SLOPE_MEASURE:
    {
      G_point p = parent(0)->getStraightRef()->getDirection();
      if(p.getX() == 0) {
	value = BIG * 10;
      }
      else {
	value = -p.getY() / p.getX();
      }
    }

    break;

  case G_AREA_MEASURE:
    value = parent(0)->getFilledRef()->getArea();
    break;

  case G_ABSCISSA_MEASURE:
  case G_ORDINATE_MEASURE:
  case G_COORD_DISTANCE_MEASURE:
    {
      value = BIG * 10;
      G_coordsysObject *csObj = nullptr;
      // Prefer the coordsys parent that was recorded when the measure was created.
      // This ensures the value updates when the coordsys scale changes (e.g. U dragged).
      for (G_ref *r : where->getParentsConst()) {
        if (r && r->getType() == G_COORDSYS && !r->getDeleted()) {
          csObj = dynamic_cast<G_coordsysObject*>(r->getObject());
          break;
        }
      }
      // Fallback: search document (handles files saved before coordsys was added to parents).
      if (!csObj) {
        for (int i = 0; i < where->getDocument()->getNumRefs(); ++i) {
          G_ref *r = where->getDocument()->getRef(i);
          if (r && r->getType() == G_COORDSYS && !r->getDeleted()) {
            csObj = dynamic_cast<G_coordsysObject*>(r->getObject());
            break;
          }
        }
      }
      if (csObj) {
        double x1=0, y1=0, x2=0, y2=0;
        if (where->getDescendType() == G_ABSCISSA_MEASURE) {
            csObj->getCoordSys().screenToMath(parent(0)->getPoint(), x1, y1);
            value = x1;
        } else if (where->getDescendType() == G_ORDINATE_MEASURE) {
            csObj->getCoordSys().screenToMath(parent(0)->getPoint(), x1, y1);
            value = y1;
        } else if (where->getDescendType() == G_COORD_DISTANCE_MEASURE) {
            csObj->getCoordSys().screenToMath(parent(0)->getPoint(), x1, y1);
            csObj->getCoordSys().screenToMath(parent(1)->getPoint(), x2, y2);
            value = std::hypot(x1-x2, y1-y2);
        }
      }
    }
    break;

  }

  return;
}


class ParentLabelReferenceFetcher : public ReferenceFetcher
{
public:
  ParentLabelReferenceFetcher(G_ref *inRef) { ref = inRef; }

  virtual KFormula *getFormula(int reference_number)
  { return ref->getParents()[reference_number]->getLabel().getFormula(); }

protected:
  G_ref *ref;
};

// Fetches the label formulas from a segment's two endpoint parents.
class SegmentEndpointReferenceFetcher : public ReferenceFetcher
{
public:
  SegmentEndpointReferenceFetcher(G_ref *segRef) : seg(segRef) {}

  virtual KFormula *getFormula(int reference_number)
  {
    const G_refs &eps = seg->getParents();
    if(reference_number < (int)eps.count())
      return eps[reference_number]->getLabel().getFormula();
    return nullptr;
  }

private:
  G_ref *seg;
};

// Returns true when the segment still carries its auto-generated name s_(n).
// Auto-name internal form: 's' + QChar(Box::SUB) + '{' + digits + '}'
static bool segmentIsAutoNamed(G_ref *segRef)
{
  const QString t = segRef->getLabel().getText();
  if(t.length() < 4) return false;
  if(t[0] != 's' || t[1] != QChar(Box::SUB) || t[2] != '{' || t[t.length()-1] != '}') return false;
  for(int i = 3; i < t.length()-1; ++i)
    if(!t[i].isDigit()) return false;
  return true;
}


// Returns the plain-text LHS label for the Values menu (e.g. "MG" for a
// distance measure between points M and G).  Mirrors updatelhs() logic but
// produces a flat string rather than a KFormula for rendering.
QString G_measureObject::getMenuLabel() const
{
  // Helper: get the plain-text label of a parent (strips KFormula special chars).
  auto pLabel = [&](int i) -> QString {
    if (i >= (int)where->getParents().count()) return QString();
    return KFormula::toUgly(where->getParents()[i]->getLabel().getText());
  };

  int dtype = where->getDescendType();

  if (dtype == G_DISTANCE_MEASURE && where->getParents().count() >= 2)
    return pLabel(0) + pLabel(1);

  if (dtype == G_ANGLE_MEASURE) {
    if (!where->getParents().empty() &&
        where->getParents()[0]->getType() == G_ARC)
      return QStringLiteral("m\u2220") + pLabel(0);
    if (where->getParents().count() >= 3)
      return QStringLiteral("m\u2220") + pLabel(0) + pLabel(1) + pLabel(2);
  }

  if (dtype == G_RATIO_MEASURE && where->getParents().count() >= 2)
    return pLabel(0) + QStringLiteral("/") + pLabel(1);

  if (dtype == G_ABSCISSA_MEASURE && !where->getParents().empty())
    return QStringLiteral("x_") + pLabel(0);

  if (dtype == G_ORDINATE_MEASURE && !where->getParents().empty())
    return QStringLiteral("y_") + pLabel(0);

  if (dtype == G_COORD_DISTANCE_MEASURE && where->getParents().count() >= 2)
    return pLabel(0) + pLabel(1);

  if (dtype == G_LENGTH_MEASURE && !where->getParents().empty()) {
    G_ref *seg = where->getParents()[0];
    if (seg->getType() == G_SEGMENT && seg->getParents().count() >= 2) {
      // For G_SEGMENT parents, always try the endpoint labels first.
      // segmentIsAutoNamed() may return false for old-format files, so we
      // use endpoint labels when available (as the canvas rendering does).
      return KFormula::toUgly(seg->getParents()[0]->getLabel().getText())
           + KFormula::toUgly(seg->getParents()[1]->getLabel().getText());
    }
    // Non-segment parent (arc, circumference, etc.): parent's own label.
    return pLabel(0);
  }

  // Radius, slope, area, etc.: first parent's label.
  if (!where->getParents().empty()) return pLabel(0);
  return QString();
}

void G_measureObject::updatelhs(){
  QString tmp;

  lhs.setReferenceFetcher(std::make_unique<ParentLabelReferenceFetcher>(where));

  switch(where->getDescendType()) {
  case G_DISTANCE_MEASURE:
    // GSP style: "AB" (no prefix, names concatenated)
    tmp = qApp->translate("G_measureObject", "{%1}{%2}", "");
    break;
  case G_LENGTH_MEASURE:
    if(where->getParents()[0]->getType() == G_CIRCLE) {
      tmp = qApp->translate("G_measureObject", "Circumference {%1}", "");
      break;
    }
    // For auto-named segments: show endpoint names as the label (e.g. "AB").
    if(where->getParents()[0]->getType() == G_SEGMENT &&
       where->getParents()[0]->getParents().count() >= 2 &&
       segmentIsAutoNamed(where->getParents()[0])) {
      lhs.setReferenceFetcher(
          std::make_unique<SegmentEndpointReferenceFetcher>(where->getParents()[0]));
      tmp = "{%1}{%2}";
      break;
    }
    // User-renamed segment or arc: use the object's own label.
    tmp = qApp->translate("G_measureObject", "{%1}", "");
    break;
    
  case G_RADIUS_MEASURE:
    tmp = qApp->translate("G_measureObject", "Radius {%1}", "");
    break;

  case G_ANGLE_MEASURE:
    if(where->getParents()[0]->getType() == G_ARC) {
      // GSP style: m∠ prefix
      tmp = qApp->translate("G_measureObject", "m\u2220{%1}", "");
    }
    else { //three points
      // GSP style: m∠BAC
      tmp = qApp->translate("G_measureObject", "m\u2220{%1}{%2}{%3}", "");
    }
    break;
    
  case G_RATIO_MEASURE:
    // GSP style: AB/CD (no "Ratio" prefix)
    tmp = qApp->translate("G_measureObject", "{%1}/{%2}", "");
    break;

  case G_SLOPE_MEASURE:
    tmp = qApp->translate("G_measureObject", "Slope {%1}", "");
    break;

  case G_AREA_MEASURE:
    tmp = qApp->translate("G_measureObject", "Area {%1}", "");
    break;

  case G_COORDINATES_MEASURE:
    tmp = qApp->translate("G_measureObject", "Coordinates {%1}", "");
    break;
  case G_ABSCISSA_MEASURE:
    // x with proper KFormula subscript: x<SUB>{<ref>}
    tmp = QString("x") + QChar(Box::SUB) + "{%1}";
    break;
  case G_ORDINATE_MEASURE:
    tmp = QString("y") + QChar(Box::SUB) + "{%1}";
    break;
  case G_COORD_DISTANCE_MEASURE:
    // GSP style: just the two point labels concatenated (no prefix)
    tmp = qApp->translate("G_measureObject", "{%1}{%2}", "");
    break;
  case G_EQUATION_MEASURE:
    tmp = qApp->translate("G_measureObject", "Equation {%1}", "");
    break;

  }

  tmp.replace("%1", QString((QChar)int(REFERENCE_NUM(0))));
  tmp.replace("%2", QString((QChar)int(REFERENCE_NUM(1))));
  tmp.replace("%3", QString((QChar)int(REFERENCE_NUM(2))));

  lhs.parse(tmp);
  dirtylhs = false;

  return;
}


//this class is for having text reference lhs.
class LhsReferenceFetcher : public ReferenceFetcher
{
public:
  LhsReferenceFetcher(G_valueObject *inValObj) { valueObject = inValObj; }
  
  virtual KFormula* getFormula(int) { return valueObject->getLhs(); }
  
protected:
  G_valueObject *valueObject;
};


void G_valueObject::update()
{
  if(dirtylhs) updatelhs();
  calculate();

  text.setReferenceFetcher(std::make_unique<LhsReferenceFetcher>(this));

  QString valStr;
  if(fabs(value) >= BIG) {
    valStr = qApp->translate("G_valueObject", "undefined", "");
  }
  else {
    valStr = QString::number(value, 'f', 2);
  }

  QString tmp = QChar(int(REFERENCE_NUM(0))) + QStringLiteral(" = ") + valStr;
  displayText = valStr; // plain fallback
  text.parse(tmp);
	     
  return;
}

// Base implementation: parse LHS from displayText (works for G_parameterObject etc.)
QString G_valueObject::getMenuLabel() const
{
  const QString dt = displayText.trimmed();
  const int eq = dt.indexOf(QStringLiteral(" = "));
  if (eq > 0) return dt.left(eq).trimmed();
  return dt;
}


bool G_valueObject::inRect(QRect r)
{
  QRect tmp;
  
  tmp.setSize(text.size());
  tmp.moveCenter(pos.toQPoint());

  return tmp.intersects(r);
}


G_point G_valueObject::getNearestPoint(const G_point &p)
{
  QRect tmp;
  
  tmp.setSize(text.size());
  tmp.moveCenter(pos.toQPoint());

  if(tmp.contains(p.toQPoint())) return p;
  else return pos; //TODO! this is wrong, but I'm too bored to do it right now.
}


void G_valueObject::draw(QPainter &p)
{
  QRect r = p.window();

  if((pos - G_point(r.center())).lengthsq() > DRAW_MAX * DRAW_MAX) return;

  text.setPos(ROUND(pos.getX()), ROUND(pos.getY()));

  p.setFont(where->getDrawstyle()->getFont());

  QColor drawColor = where->getDrawstyle()->getPen().color();
  p.setPen(QPen(drawColor));
  // KFormula::redraw() routes drawing through box::draw(..., &foreColor),
  // which overrides the painter pen.  Sync foreColor so the chosen colour
  // is actually used when painting the label on the sketch.
  text.setForeColor(drawColor);

  lhs.makeDirty();
  text.makeDirty();

  text.redraw(p);

  if(where->getSelected()) {
    p.setBrush(QBrush());
    p.setPen(QPen(G_drawstyle::getBorderColor(where->getDrawstyle()->getPen().color()), 2));
    p.drawRect(getSelectExtents());
  }

}

void G_measureObject::update()
{
  // For segment-length measures recompute lhs every update so that switching
  // between auto-name ("AB") and user-renamed ("l") is always live.
  if(where->getDescendType() == G_LENGTH_MEASURE &&
     !where->getParents().empty() &&
     where->getParents()[0]->getType() == G_SEGMENT)
    dirtylhs = true;
  if(dirtylhs) updatelhs();
  calculate();

  if (where->getDescendType() == G_COORDINATES_MEASURE || where->getDescendType() == G_EQUATION_MEASURE) {
      G_coordsysObject *csObj = nullptr;
      // Prefer coordsys from parents, fallback to document search.
      for (G_ref *r : where->getParentsConst()) {
        if (r && r->getType() == G_COORDSYS && !r->getDeleted()) {
          csObj = dynamic_cast<G_coordsysObject*>(r->getObject());
          break;
        }
      }
      if (!csObj) {
        for (int i = 0; i < where->getDocument()->getNumRefs(); ++i) {
          G_ref *r = where->getDocument()->getRef(i);
          if (r && r->getType() == G_COORDSYS && !r->getDeleted()) {
            csObj = dynamic_cast<G_coordsysObject*>(r->getObject());
            break;
          }
        }
      }
      
      QString customStr;
      if (csObj) {
          if (where->getDescendType() == G_COORDINATES_MEASURE) {
              double x, y;
              csObj->getCoordSys().screenToMath(parent(0)->getPoint(), x, y);
              QString xs = QString::number(x, 'f', 2);
              QString ys = QString::number(y, 'f', 2);
              customStr = QChar(int(REFERENCE_NUM(0))) + QString(" = (%1; %2)").arg(xs, ys);
              // plain-text version for JSXGraph/web export
              QString pName = where->getParents()[0]->getLabel().getText();
              displayText = pName + QString(" = (%1; %2)").arg(xs, ys);
          } else if (where->getDescendType() == G_EQUATION_MEASURE) {
              if (where->getParents()[0]->getType() == G_LINE || where->getParents()[0]->getType() == G_SEGMENT || where->getParents()[0]->getType() == G_RAY) {
                  G_point dir = parent(0)->getStraightRef()->getDirection();
                  G_point pt = parent(0)->getStraightRef()->getPointOnCurve(0.5);
                  double px, py, dx, dy, x2, y2;
                  csObj->getCoordSys().screenToMath(pt, px, py);
                  csObj->getCoordSys().screenToMath(pt + dir, x2, y2);
                  dx = x2 - px; dy = y2 - py;
                  double A = -dy, B = dx, C = dy * px - dx * py;
                  if (std::abs(A) < 1e-6 && std::abs(B) < 1e-6) A = 1;
                  customStr = QChar(int(REFERENCE_NUM(0))) + QString(": %1x %2 %3y %4 %5 = 0")
                                .arg(QString::number(A, 'f', 2))
                                .arg(B >= 0 ? "+" : "-")
                                .arg(QString::number(std::abs(B), 'f', 2))
                                .arg(C >= 0 ? "+" : "-")
                                .arg(QString::number(std::abs(C), 'f', 2));
              } else if (where->getParents()[0]->getType() == G_CIRCLE) {
                  G_point c = parent(0)->getCircle().getCenter();
                  double r = parent(0)->getCircle().getRadius() / csObj->getCoordSys().scale();
                  double cx, cy;
                  csObj->getCoordSys().screenToMath(c, cx, cy);
                  customStr = QChar(int(REFERENCE_NUM(0))) + QString(": (x %1 %2)^2 + (y %3 %4)^2 = %5")
                                .arg(cx >= 0 ? "-" : "+").arg(QString::number(std::abs(cx), 'f', 2))
                                .arg(cy >= 0 ? "-" : "+").arg(QString::number(std::abs(cy), 'f', 2))
                                .arg(QString::number(r * r, 'f', 2));
              }
              if (!customStr.isEmpty()) {
                  QString pName = where->getParents()[0]->getLabel().getText();
                  displayText = pName + ": " + customStr.mid(1); // skip REFERENCE_NUM char
              }
          }
      }
      
      text.setReferenceFetcher(std::make_unique<LhsReferenceFetcher>(this));
      text.parse(customStr);
      return;
  }

  // GSP-style: formatted value with physical units
  text.setReferenceFetcher(std::make_unique<LhsReferenceFetcher>(this));

  int dtype = where->getDescendType();
  QString valueStr, unitStr;

  if (fabs(value) >= BIG) {
    valueStr = qApp->translate("G_valueObject", "undefined", "");
  } else {
    double cmp = G_cmPerPixel();
    if (dtype == G_DISTANCE_MEASURE || dtype == G_LENGTH_MEASURE || dtype == G_RADIUS_MEASURE) {
      valueStr = QString::number(value * cmp, 'f', 2);
      unitStr  = QStringLiteral(" cm");
    } else if (dtype == G_ANGLE_MEASURE) {
      valueStr = QString::number(value, 'f', 2);
      unitStr  = QStringLiteral("\u00B0"); // degree symbol °
    } else if (dtype == G_AREA_MEASURE) {
      valueStr = QString::number(value * cmp * cmp, 'f', 2);
      unitStr  = QStringLiteral(" cm\u00B2"); // cm²
    } else {
      // ratio, slope, coord measures: dimensionless
      valueStr = QString::number(value, 'f', 2);
    }
  }

  // Build expanded plain-text label for JSXGraph export
  auto pLabel = [&](int i) { return where->getParents()[i]->getLabel().getText(); };
  QString expandedLhs;
  if (dtype == G_DISTANCE_MEASURE) {
    expandedLhs = pLabel(0) + pLabel(1);
  } else if (dtype == G_ANGLE_MEASURE && where->getParents()[0]->getType() != G_ARC) {
    expandedLhs = QStringLiteral("m\u2220") + pLabel(0) + pLabel(1) + pLabel(2);
  } else if (dtype == G_RATIO_MEASURE) {
    expandedLhs = pLabel(0) + "/" + pLabel(1);
  } else if (dtype == G_ABSCISSA_MEASURE) {
    expandedLhs = QStringLiteral("x_") + pLabel(0);  // plain-text subscript for JSXGraph
  } else if (dtype == G_ORDINATE_MEASURE) {
    expandedLhs = QStringLiteral("y_") + pLabel(0);
  } else if (dtype == G_COORD_DISTANCE_MEASURE && (int)where->getParents().size() >= 2) {
    expandedLhs = pLabel(0) + pLabel(1);  // compact "AB" style like distance measure
  } else if (dtype == G_LENGTH_MEASURE && !where->getParents().empty() &&
             where->getParents()[0]->getType() == G_SEGMENT) {
    G_ref *segRef = where->getParents()[0];
    if(segmentIsAutoNamed(segRef) && segRef->getParents().count() >= 2)
      expandedLhs = segRef->getParents()[0]->getLabel().getText()
                  + segRef->getParents()[1]->getLabel().getText();
    else
      expandedLhs = pLabel(0);
  } else {
    expandedLhs = pLabel(0);
  }
  displayText = expandedLhs + QStringLiteral(" = ") + valueStr + unitStr;

  QString tmp = QChar(int(REFERENCE_NUM(0))) + QStringLiteral(" = ") + valueStr + unitStr;
  text.parse(tmp);
}




