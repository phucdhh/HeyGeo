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


#ifndef G_OBJECT_H
#define G_OBJECT_H

#include <qdatastream.h>

#include "formula/kformula.H"

#include "G_ref.H"
#include "G_point.H"
#include "G_line.H"
#include "G_segment.H"
#include "G_ray.H"
#include "G_circle.H"
#include "G_arc.H"
#include "G_locus.H"
#include "G_arcSector.H"
#include "G_arcSegment.H"
#include "G_circleInterior.H"
#include "G_polygon.H"
#include "G_coordsys.H"
#include "G_function.H"

// Returns centimetres per logical screen pixel (primary screen DPI).
// Defined in G_measureObject.cpp; used by the Calculator for unit conversions.
double G_cmPerPixel();

struct ViewTransform {
  ViewTransform() : offsetX(0), offsetY(0), zoom(1) {}
  ViewTransform(double x, double y, double z) : offsetX(x), offsetY(y), zoom(z) {}
  ViewTransform(const ViewTransform &t) : offsetX(t.offsetX), offsetY(t.offsetY), zoom(t.zoom) {}
  ViewTransform& operator=(const ViewTransform&) = default;
  double offsetX, offsetY, zoom;
};

class G_object
{
public:
  G_object();
  G_object(G_ref *inWhere) { where = inWhere; } 
  virtual ~G_object();

  virtual void draw(QPainter &p);

  virtual G_point getNearestPoint(const G_point &p) { return getGeoRef()->getNearestPoint(p); }

  virtual void translate(const G_point &p) { getGeoRef()->translate(p); }

  virtual QRect getScrollExtents() const { return QRect(); }
  virtual QRect getSelectExtents() const { return getScrollExtents(); }

  virtual bool inRect(QRect r) { return getGeoRef()->inRect(r); }

  virtual void save(QDataStream &) {}
  virtual void load(QDataStream &) {}

  virtual void tempTransform(const ViewTransform &trans);

  //these guys are to make writing update functions easier:  do not use them unless you know the type!
  G_object *parent(int i) { return where->getParents()[i]->getObject(); }
  virtual G_geometry *getGeoRef() { return NULL; }
  virtual G_straight *getStraightRef() { return (G_straight *)getGeoRef(); }
  virtual G_curve *getCurveRef() { return (G_curve *)getGeoRef(); }
  virtual G_filled *getFilledRef() { return (G_filled *)getGeoRef(); }
  virtual G_point getPoint() const { return G_point(); }
  virtual G_line getLine() const { return G_line(); }
  virtual G_ray getRay() const { return G_ray(); }
  virtual G_segment getSegment() const { return G_segment(); }
  virtual G_circle getCircle() const { return G_circle(); }
  virtual G_arc getArc() const { return G_arc(); }
  virtual G_locus getLocus() const { return G_locus(); }
  virtual double getNumValue() const { return 0; }
  virtual double getDisplayNumValue() const { return 0; }

protected:
  friend void G_ref::update(bool fromLocus);
  virtual void update();
  void updateTransform();

  G_ref *where;
};

//---------------------------G_pointObject-------------------------------

class G_pointObject : public G_object
{
public:
  G_pointObject(G_ref *inWhere) : G_object(inWhere), p(BIG) { } 
  virtual ~G_pointObject() {}

  virtual G_point getNearestPoint(const G_point &) { return point; }

  virtual void update();

  double getP() const { return p; }
  void setP(double inP) { p = inP; }
  void setPoint(const G_point &x) { point = x; resetP(); }
  void translate(const G_point &x) { point += x; resetP(); }

  virtual QRect getScrollExtents() const { return point.getExtents(); }

  virtual void save(QDataStream &stream);
  virtual void load(QDataStream &stream);

  G_geometry *getGeoRef() { return &point; }
  virtual G_point getPoint() const { return point; }
protected:
  void resetP() { if(where->getDescendType() == G_CONSTRAINED_POINT || where->getDescendType() == G_HORIZONTAL_POINT || where->getDescendType() == G_VERTICAL_POINT) p = BIG; }

  G_point point;
  double p; //parameter for constrained points
};

//-------------------------------G_lineObject-------------------------

class G_lineObject : public G_object
{
public:
  G_lineObject(G_ref *inWhere) : G_object(inWhere) { } 
  virtual ~G_lineObject() {}

  virtual void update();
  virtual QRect getSelectExtents() const { return line.getExtents(); }

  virtual G_line getLine() const { return line; }
  G_geometry *getGeoRef() { return &line; }

protected:
  G_line line;
};

//-----------------------------G_rayObject---------------------------

class G_rayObject : public G_object
{
public:
  G_rayObject(G_ref *inWhere) : G_object(inWhere) { } 
  virtual ~G_rayObject() {}

  virtual void update();
  virtual QRect getSelectExtents() const { return ray.getExtents(); }
  virtual QRect getScrollExtents() const { return ray.getP1().getExtents(); }

  virtual G_ray getRay() const { return ray; }
  G_geometry *getGeoRef() { return &ray; }

protected:
  G_ray ray;
};

//---------------------------G_segmentObject---------------------------

class G_segmentObject : public G_object
{
public:
  G_segmentObject(G_ref *inWhere) : G_object(inWhere) { } 
  virtual ~G_segmentObject() {}

  virtual void update();
  virtual QRect getScrollExtents() const { return segment.getExtents(); }

  virtual G_segment getSegment() const { return segment; }
  G_geometry *getGeoRef() { return &segment; }

protected:
  G_segment segment;
};

//-------------------------G_circleObject---------------------------

class G_circleObject : public G_object
{
public:
  G_circleObject(G_ref *inWhere) : G_object(inWhere) { } 
  virtual ~G_circleObject() {}

  virtual void update();
  virtual QRect getScrollExtents() const { return circle.getExtents(); }

  virtual G_circle getCircle() const { return circle; }
  G_geometry *getGeoRef() { return &circle; }

protected:
  G_circle circle;
};

//----------------------------G_arcObject------------------------------

class G_arcObject : public G_object
{
public:
  G_arcObject(G_ref *inWhere) : G_object(inWhere) { } 
  virtual ~G_arcObject() {}

  virtual void update();
  virtual QRect getScrollExtents() const { return arc.getExtents(); }

  virtual G_arc getArc() const { return arc; }
  G_geometry *getGeoRef() { return &arc; }

protected:
  G_arc arc;
};

//---------------------------G_locusObject------------------------
class G_locusObject : public G_object
{
public:
  G_locusObject(G_ref *inWhere) : G_object(inWhere), maxSamples(150) { }
  virtual ~G_locusObject() {}

  virtual void update();
  virtual QRect getSelectExtents() const { return locus.getExtents(); }

  virtual void save(QDataStream &stream) { stream << maxSamples; }
  virtual void load(QDataStream &stream) { stream >> maxSamples; }

  virtual G_locus getLocus() const { return locus; }
  G_geometry *getGeoRef() { return &locus; }

  virtual void generateObjectLocus();
  virtual void generatePointLocus();

  virtual void setMaxSamples(int samples) { maxSamples = samples; }
  virtual int getMaxSamples() { return maxSamples; }

  //protected:
public:
  G_locus locus;

  int maxSamples;

};


//---------------------------G_valueObject------------------------
//pure virtual--base for measure and calculation
//partly implemented in G_measureObject.cpp
class G_valueObject : public G_object
{
public:
  G_valueObject(G_ref *inWhere, bool lhsRestricted = false) :
    G_object(inWhere), dirtylhs(true), lhs(lhsRestricted) {}

  virtual void update();

  virtual void calculate() = 0;
  virtual void updatelhs() = 0;

  virtual void draw(QPainter &p);

  virtual void translate(const G_point &p) { pos += p; }
  virtual G_point getNearestPoint(const G_point &p);

  virtual QRect getScrollExtents() const
  { QRect tmp; tmp.setSize(text.size()); tmp.moveCenter(pos.toQPoint()); return tmp; }

  virtual bool inRect(QRect r);

  virtual double getNumValue() const { return value; }
  // Returns value in display units (cm for distances, degrees for angles, etc.).
  // Override in G_measureObject to apply the same scaling used for display.
  virtual double getDisplayNumValue() const { return value; }

  virtual void tempTransform(const ViewTransform &trans);

  KFormula *getLhs() { return &lhs; } //only to be used by ReferenceFetcher classes.

  // Accessible plain-text representation (e.g. "AB = 2.36 cm") for export use.
  QString getDisplayText() const { return displayText; }

  // Returns just the LHS label as plain text (e.g. "AB" for a distance measure).
  // Used by the Values menu to show meaningful names without " = value" suffix.
  // Subclasses override this for geometry-aware computation.
  virtual QString getMenuLabel() const;

  G_point getPos() const { return pos; }

protected:
  double value;

  bool dirtylhs;

  KFormula lhs;
  KFormula text;
  G_point pos;
  QString displayText;
};


//---------------------------G_measureObject------------------------
class G_measureObject : public G_valueObject
{
public:
  G_measureObject(G_ref *inWhere) : G_valueObject(inWhere) {}
  virtual ~G_measureObject() {}

  virtual void calculate() override;
  virtual void updatelhs() override;
  virtual void update() override;
  virtual double getDisplayNumValue() const override;
  virtual QString getMenuLabel() const override;

  virtual void save(QDataStream &stream) override { stream << pos; }
  virtual void load(QDataStream &stream) override { stream >> pos; }
};


//---------------------------G_calculateObject------------------------
class G_calculateObject : public G_valueObject
{
public:
  G_calculateObject(G_ref *inWhere);
  virtual ~G_calculateObject() {}

  virtual void calculate() override;
  virtual void update() override;
  virtual void updatelhs() override { lhs.parse(formulaString); dirtylhs = false; }
  virtual QString getMenuLabel() const override;

  void changeFormula(const G_refs& newParents, const QString &newFormulaString);

  void setInitialFormulaString(const QString &newFormulaString)
  { formulaString = newFormulaString; dirtylhs = true;}

  virtual void save(QDataStream &stream) override { stream << pos; stream << convertFormulaStringOnSave(formulaString); }
  virtual void load(QDataStream &stream) override { stream >> pos; stream >> formulaString; convertFormulaStringOnLoad(); }

  void convertFormulaStringOnLoad();
  QString convertFormulaStringOnSave(QString s) const;

  QString getFormulaString() const { return formulaString; }

protected:
  QString formulaString;
};


//---------------------------G_parameterObject------------------------
// GSP-style "New Parameter": a standalone named scalar value that the
// user can adjust on screen (drag / double-click). Exported to the web
// as a JSXGraph slider element.
class G_parameterObject : public G_valueObject
{
public:
  G_parameterObject(G_ref *inWhere);
  virtual ~G_parameterObject() {}

  // G_valueObject interface
  virtual void calculate() override {}   // value is set directly by user
  virtual void updatelhs() override;

  // Persistence
  virtual void save(QDataStream &stream) override;
  virtual void load(QDataStream &stream) override;

  // Accessors
  double getMinVal()  const { return minVal;  }
  double getMaxVal()  const { return maxVal;  }
  double getStep()    const { return step;    }
  QString getParamName() const { return paramName; }

  // Mutators — call update() after changing to refresh the display
  void setParamName(const QString &n) { paramName = n; dirtylhs = true; }
  void setRange(double mn, double mx, double st = 0.0) { minVal = mn; maxVal = mx; step = st; }
  void setValue(double v);

protected:
  QString paramName;  // e.g. "n"
  double minVal;      // slider minimum
  double maxVal;      // slider maximum
  double step;        // animation / scroll step (0 = auto)
};


//-------------------------G_arcSectorObject---------------------------

class G_arcSectorObject : public G_object
{
public:
  G_arcSectorObject(G_ref *inWhere) : G_object(inWhere) { } 
  virtual ~G_arcSectorObject() {}

  virtual void update();
  virtual QRect getScrollExtents() const { return arcSector.getExtents(); }

  G_geometry *getGeoRef() { return &arcSector; }

protected:
  G_arcSector arcSector;
};


//-------------------------G_arcSegmentObject---------------------------

class G_arcSegmentObject : public G_object
{
public:
  G_arcSegmentObject(G_ref *inWhere) : G_object(inWhere) { } 
  virtual ~G_arcSegmentObject() {}

  virtual void update();
  virtual QRect getScrollExtents() const { return arcSegment.getExtents(); }

  G_geometry *getGeoRef() { return &arcSegment; }

protected:
  G_arcSegment arcSegment;
};


//-------------------------G_circleInteriorObject---------------------------

class G_circleInteriorObject : public G_object
{
public:
  G_circleInteriorObject(G_ref *inWhere) : G_object(inWhere) { } 
  virtual ~G_circleInteriorObject() {}

  virtual void update();
  virtual QRect getScrollExtents() const { return circleInterior.getExtents(); }

  G_geometry *getGeoRef() { return &circleInterior; }

protected:
  G_circleInterior circleInterior;
};

//-------------------------G_polygonObject---------------------------

class G_polygonObject : public G_object
{
public:
  G_polygonObject(G_ref *inWhere) : G_object(inWhere) { } 
  virtual ~G_polygonObject() {}

  virtual void update();
  virtual QRect getScrollExtents() const { return polygon.getExtents(); }

  G_geometry *getGeoRef() { return &polygon; }

protected:
  G_polygon polygon;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Graph objects
// ─────────────────────────────────────────────────────────────────────────────

//---------------------------G_coordsysObject---------------------------
/**
 * Renders a cartesian coordinate system (axes, ticks, labels, optional grid).
 * Has no parents – it is a free object that the user can drag.
 */
class G_coordsysObject : public G_object
{
public:
  G_coordsysObject(G_ref *inWhere);
  virtual ~G_coordsysObject() {}

  virtual void draw(QPainter &p) override;
  virtual void update() override;

  virtual void translate(const G_point &p) override
  {
      if (where->getParents().count() < 2) cs.setOrigin(cs.origin() + p);
  }

  virtual QRect getScrollExtents() const override { return cs.getExtents(); }
  virtual QRect getSelectExtents() const override { return cs.getExtents(); }

  virtual void save(QDataStream &s) override { cs.save(s); }
  virtual void load(QDataStream &s) override { cs.load(s); }

  G_coordsys       &getCoordSys()       { return cs; }
  const G_coordsys &getCoordSys() const { return cs; }

  virtual void tempTransform(const ViewTransform &trans) override;
  virtual G_point getNearestPoint(const G_point &) override { return cs.origin(); }
  virtual bool inRect(QRect r) override { return r.contains(cs.origin().toQPoint()); }

protected:
  G_coordsys cs;
};


//---------------------------G_functionObject---------------------------
/**
 * Stores a function definition f(x) = expr.
 * Displayed as a draggable text label "f(x) = expr" on the canvas.
 * Can optionally have G_VALUE parents (parameters a, b, …).
 */
class G_functionObject : public G_object
{
public:
  G_functionObject(G_ref *inWhere);
  virtual ~G_functionObject() {}

  virtual void draw(QPainter &p) override;
  virtual void update() override;

  virtual QRect getScrollExtents() const override;
  virtual QRect getSelectExtents() const override { return getScrollExtents(); }

  virtual void save(QDataStream &s) override { s << m_pos; func.save(s); }
  virtual void load(QDataStream &s) override { s >> m_pos; func.load(s); }

  G_functionDef       &getFuncDef()       { return func; }
  const G_functionDef &getFuncDef() const { return func; }

  virtual double getNumValue() const override
  { return func.evaluate(0.0); }

  virtual void translate(const G_point &d) override { m_pos += d; }
  virtual void tempTransform(const ViewTransform &trans) override
  { m_pos.translate(G_point(trans.offsetX, trans.offsetY)); m_pos.scale(G_point(0,0), trans.zoom); }
  virtual G_point getNearestPoint(const G_point &p) override
  { return getScrollExtents().contains(p.toQPoint()) ? p : m_pos; }
  virtual bool inRect(QRect r) override { return getScrollExtents().intersects(r); }
  G_point getPos() const { return m_pos; }

  // Build the display string "f(x) = expr"
  QString displayString() const;

protected:
  G_functionDef    func;
  G_point          m_pos;
  mutable QSize    m_lastSize;   // cached render size (updated in draw())
};


//---------------------------G_functionPlotObject---------------------------
/**
 * Visible plot of y = f(x) on a coordinate system.
 * Parents: [0]=G_COORDSYS ref, [1]=optional G_FUNCTION ref
 *          (if no G_FUNCTION parent, f is stored inline)
 */
class G_functionPlotObject : public G_object
{
public:
  G_functionPlotObject(G_ref *inWhere);
  virtual ~G_functionPlotObject() {}

  virtual void draw(QPainter &p) override;
  virtual void update() override;

  virtual void translate(const G_point &p) override
  { Q_UNUSED(p); /* plot position is fully driven by coord-sys */ }

  virtual QRect getScrollExtents() const override { return plot.getExtents(); }
  virtual QRect getSelectExtents() const override { return plot.getExtents(); }

  virtual void save(QDataStream &s) override { plot.save(s); }
  virtual void load(QDataStream &s) override { plot.load(s); }

  G_functionPlot       &getFunctionPlot()       { return plot; }
  const G_functionPlot &getFunctionPlot() const { return plot; }

  virtual void tempTransform(const ViewTransform &trans) override;
  virtual G_point getNearestPoint(const G_point &p) override { return plot.nearestPoint(p); }
  virtual bool inRect(QRect r) override { return plot.inRect(r); }

  // Provide a G_curve interface so constrained (glider) points work on plots.
  virtual G_curve *getCurveRef() override { return &m_curveRef; }

protected:
  G_functionPlot      plot;
  G_functionPlotCurve m_curveRef; // must be declared AFTER plot
  int viewW; // cached viewport width for sampling
};


//---------------------------G_paramCurveObject---------------------------
/**
 * Visible parametric curve (x(t), y(t)) on a coordinate system.
 * Parents: [0]=G_COORDSYS ref, [1]=G_FUNCTION x(t), [2]=G_FUNCTION y(t)
 */
class G_paramCurveObject : public G_object
{
public:
  G_paramCurveObject(G_ref *inWhere);
  virtual ~G_paramCurveObject() {}

  virtual void draw(QPainter &p) override;
  virtual void update() override;

  virtual void translate(const G_point &p) override { Q_UNUSED(p); }

  virtual QRect getScrollExtents() const override { return curve.getExtents(); }
  virtual QRect getSelectExtents() const override { return curve.getExtents(); }

  virtual void save(QDataStream &s) override { curve.save(s); }
  virtual void load(QDataStream &s) override { curve.load(s); }

  G_paramCurve       &getParamCurve()       { return curve; }
  const G_paramCurve &getParamCurve() const { return curve; }

  virtual void tempTransform(const ViewTransform &trans) override;
  virtual G_point getNearestPoint(const G_point &p) override { return curve.nearestPoint(p); }
  virtual bool inRect(QRect r) override { return curve.inRect(r); }

protected:
  G_paramCurve curve;
};


#endif //G_OBJECT_H
