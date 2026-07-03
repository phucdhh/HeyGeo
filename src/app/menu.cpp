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

#include <algorithm>
#include <iostream>
#include <qlayout.h>
#include <qdialog.h>
#include <qpushbutton.h>
//Added by qt3to4:
#include <QHBoxLayout>
#include <QLabel>
#include <QVBoxLayout>

#include "HeyGeoCalculateEditor.H"
#include "HeyGeoView.H"
#include "HeyGeoConstruction.H"
#include "HeyGeoRecursionDialog.H"
#include "G_refSearcher.H"
#include "HeyGeoDocument.H"
#include "G_ref.H"
#include "G_object.H"
#include "HeyGeoSelectionGroupDialog.H"
#include "HeyGeoTransformDialog.H"
#include "HeyGeoNewParameterDialog.H"

#include "formula/kformulaedit.H"
#include "HeyGeoGraphDialogs.H"
#include <QGuiApplication>
#include <QScreen>


//this file contains all the menu handlers by HeyGeoDocument.

// ── Point on Object ──────────────────────────────────────────────────────────
void HeyGeoDocument::newPointOnObject()
{
  if(!canNewPointOnObject()) {
    Q_ASSERT(canNewPointOnObject());
    return;
  }

  G_refs new_refs;

  for(qsizetype i = 0; i < selectedRefs.count(); ++i) {
    G_refs par;
    par.append(selectedRefs[i]);
    G_ref *p = new G_ref();
    p->create(G_POINT, G_CONSTRAINED_POINT, par, this);
    // Place point at the parametric midpoint of the path (t = 0.5)
    G_curve *curve = p->getParents()[0]->getObject()->getCurveRef();
    if(curve) {
      G_point pos = curve->getPointOnCurve(0.5);
      ((G_pointObject *)(p->getObject()))->setPoint(pos);
      p->update();
    }
    new_refs.append(p);
  }

  clearSel();
  for(qsizetype i = 0; i < new_refs.count(); ++i) addSel(new_refs[i]);
  emit documentChanged();
}

// ── Arc on Circle ─────────────────────────────────────────────────────────────
void HeyGeoDocument::newArcOnCircle()
{
  if(!canNewArcOnCircle()) {
    Q_ASSERT(canNewArcOnCircle());
    return;
  }

  // Arrange refs: circle first, then the two points
  G_ref *circle = nullptr;
  G_refs pts;
  for(qsizetype i = 0; i < selectedRefs.count(); ++i) {
    if(selectedRefs[i]->getType() == G_CIRCLE)
      circle = selectedRefs[i];
    else
      pts.append(selectedRefs[i]);
  }

  if(!circle || pts.count() != 2) return;

  G_refs par;
  par.append(circle);
  par.append(pts[0]);
  par.append(pts[1]);

  G_ref *arc = new G_ref();
  arc->create(G_ARC, G_ONCIRCLE_ARC, par, this);

  clearSel();
  if(arc->getExists()) addSel(arc);
  emit documentChanged();
}


void HeyGeoDocument::newSegment()
{
  G_refs tmp;
  G_refs new_refs;
  int i;

  if(!canNewSegment()) {
    Q_ASSERT(canNewSegment());
    return;
  }

  if(selectedRefs.count() == 2) { // two points
    G_ref *s = new G_ref();
    s->create(G_SEGMENT, G_ENDPOINTS_SEGMENT, selectedRefs, this);
    clearSel();
    addSel(s);
    emit documentChanged();
    return;
  }

  for(i = 0; i < (int)selectedRefs.count(); i++) {
    G_ref *s = new G_ref();
    tmp.clear();
    tmp.append(selectedRefs[i]);
    if(i + 1 < (int)selectedRefs.count()) {
      tmp.append(selectedRefs[i + 1]);
    }
    else { tmp.append(selectedRefs[0]); }

    s->create(G_SEGMENT, G_ENDPOINTS_SEGMENT, tmp, this);

    new_refs.append(s);
  }
  clearSel();
  for(i = 0; i < (int)new_refs.count(); i++) addSel(new_refs[i]);
  emit documentChanged();
  return;
}


void HeyGeoDocument::newRay()
{
  G_refs tmp;
  G_refs new_refs;
  int i;

  if(!canNewRay()) {
    Q_ASSERT(canNewRay());
    return;
  }

  if(selectedRefs.count() == 2) { // two points
    G_ref *s = new G_ref();
    s->create(G_RAY, G_TWOPOINTS_RAY, selectedRefs, this);
    clearSel();
    addSel(s);
    emit documentChanged();
    return;
  }

  for(i = 0; i < (int)selectedRefs.count(); i++) {
    G_ref *s = new G_ref();
    tmp.clear();
    tmp.append(selectedRefs[i]);
    if(i + 1 < (int)selectedRefs.count()) {
      tmp.append(selectedRefs[i + 1]);
    }
    else { tmp.append(selectedRefs[0]); }

    s->create(G_RAY, G_TWOPOINTS_RAY, tmp, this);

    new_refs.append(s);
  }
  clearSel();
  for(i = 0; i < (int)new_refs.count(); i++) addSel(new_refs[i]);
  emit documentChanged();
  return;
}


void HeyGeoDocument::newBisector()
{
  if(!canNewBisector()) {
    Q_ASSERT(canNewBisector());
    return;
  }

  G_ref *p = new G_ref();

  p->create(G_RAY, G_BISECTOR_RAY, selectedRefs, this);

  clearSel();

  addSel(p);

  emit documentChanged();
}


void HeyGeoDocument::newIntersection()
{
  if(!canNewIntersection()) {
    Q_ASSERT(canNewIntersection());
    return;
  }

  G_ref *p = new G_ref();

  p->create(G_POINT, G_INTERSECTION_POINT, selectedRefs, this);

  if(!(selectedRefs[0]->getType() & G_STRAIGHT && selectedRefs[1]->getType() & G_STRAIGHT)) {
    G_ref *p1 = new G_ref();

    p1->create(G_POINT, G_INTERSECTION2_POINT, selectedRefs, this);
    
    clearSel();

    if(p->getExists()) addSel(p);
    if(p1->getExists()) addSel(p1);
  }
  else {
    clearSel();

    addSel(p);
  }

  emit documentChanged();
}


void HeyGeoDocument::newEndpoints()
{
  if(!canNewEndpoints()) {
    Q_ASSERT(canNewEndpoints());
    return;
  }

  G_ref *p = new G_ref();

  p->create(G_POINT, G_END_POINT, selectedRefs, this);

  if(!(selectedRefs[0]->getType() & G_RAY)) {
    G_ref *p1 = new G_ref();

    p1->create(G_POINT, G_END2_POINT, selectedRefs, this);
    
    clearSel();

    addSel(p);
    addSel(p1);
  }
  else {
    clearSel();

    addSel(p);
  }

  emit documentChanged();
}


void HeyGeoDocument::newCenterpoint()
{
  if(!canNewCenterpoint()) {
    Q_ASSERT(canNewCenterpoint());
    return;
  }

  G_ref *p = new G_ref();

  p->create(G_POINT, G_CENTER_POINT, selectedRefs, this);

  clearSel();

  addSel(p);

  emit documentChanged();
}


void HeyGeoDocument::newCircle()
{
  if(!canNewCircle()) {
    Q_ASSERT(canNewCircle());
    return;
  }

  G_refs tmp;

  G_ref *p = new G_ref();

  if(selectedRefs[0]->getType() == G_POINT && selectedRefs[1]->getType() == G_POINT) {
    //by center and point
    p->create(G_CIRCLE, G_CENTERPOINT_CIRCLE, selectedRefs, this);
  }
  else {
    //by center and radius
    if(selectedRefs[0]->getType() == G_POINT) {
      tmp = selectedRefs;
    }
    else { // reverse the order
      tmp.append(selectedRefs[1]);
      tmp.append(selectedRefs[0]);
    }
    
    p->create(G_CIRCLE, G_CENTERRADIUS_CIRCLE, tmp, this);
  }
  
  clearSel();

  addSel(p);

  emit documentChanged();
}


void HeyGeoDocument::newArc()
{
  if(!canNewArc()) {
    Q_ASSERT(canNewArc());
    return;
  }

  G_ref *p = new G_ref();

  p->create(G_ARC, G_THREEPOINTS_ARC, selectedRefs, this);

  clearSel();

  addSel(p);

  emit documentChanged();
}


void HeyGeoDocument::newArcSector()
{
  if(!canNewArcSector()) {
    Q_ASSERT(canNewArcSector());
    return;
  }

  G_ref *p = new G_ref();

  p->create(G_ARCSECTOR, G_DEFAULT_FILLED, selectedRefs, this);

  clearSel();

  addSel(p);

  emit documentChanged();
}


void HeyGeoDocument::newArcSegment()
{
  if(!canNewArcSegment()) {
    Q_ASSERT(canNewArcSegment());
    return;
  }

  G_ref *p = new G_ref();

  p->create(G_ARCSEGMENT, G_DEFAULT_FILLED, selectedRefs, this);

  clearSel();

  addSel(p);

  emit documentChanged();
}


void HeyGeoDocument::newCircleInterior()
{
  if(!canNewCircleInterior()) {
    Q_ASSERT(canNewCircleInterior());
    return;
  }

  G_ref *p = new G_ref();

  p->create(G_CIRCLEINTERIOR, G_DEFAULT_FILLED, selectedRefs, this);

  clearSel();

  addSel(p);

  emit documentChanged();
}


void HeyGeoDocument::newPolygon()
{
  if(!canNewPolygon()) {
    Q_ASSERT(canNewPolygon());
    return;
  }

  G_ref *p = new G_ref();

  p->create(G_POLYGON, G_DEFAULT_FILLED, selectedRefs, this);

  clearSel();

  addSel(p);

  emit documentChanged();
}


void HeyGeoDocument::newLocus()
{
  if(!canNewLocus()) {
    Q_ASSERT(canNewLocus());
    return;
  }

  G_ref *p = new G_ref();

  DescendantSearcher ds(selectedRefs[0]);

  if(ds.search(selectedRefs[1])) {
    p->create(G_LOCUS, G_OBJECT_LOCUS, selectedRefs, this);
  }
  else {
    G_refs tmp;

    tmp.append(selectedRefs[1]);
    tmp.append(selectedRefs[0]);

    p->create(G_LOCUS, G_OBJECT_LOCUS, tmp, this);
  }

  clearSel();

  if(p->getExists()) {
    addSel(p);
  }

  emit documentChanged();
}


void HeyGeoDocument::newMidpoint()
{
  G_refs tmp;
  G_refs new_refs;
  int i;

  if(!canNewMidpoint()) {
    Q_ASSERT(canNewMidpoint());
    return;
  }

  for(i = 0; i < (int)selectedRefs.count(); i++) {
    G_ref *p = new G_ref();
    tmp.clear();
    tmp.append(selectedRefs[i]);

    p->create(G_POINT, G_MID_POINT, tmp, this);

    new_refs.append(p);
  }
  clearSel();

  for(i = 0; i < (int)new_refs.count(); i++) addSel(new_refs[i]);
  emit documentChanged();
  return;

}


void HeyGeoDocument::newPerpendicular()
{
  G_refs tmp, new_refs, pts, straights;
  int i;

  if(!canNewPerpendicular()) {
    Q_ASSERT(canNewPerpendicular());
    return;
  }


  for(i = 0; i < (int)selectedRefs.count(); i++) {
    if(selectedRefs[i]->getType() & G_STRAIGHT) straights.append(selectedRefs[i]);
    else if(selectedRefs[i]->getType() == G_POINT) pts.append(selectedRefs[i]);
  }

  if(pts.count() == 1) {
    for(i = 0; i < (int)straights.count(); i++) {
      G_ref *p = new G_ref();
      tmp.clear();
      tmp.append(pts[0]);
      tmp.append(straights[i]);
      
      p->create(G_LINE, G_PERPENDICULAR_LINE, tmp, this);
      
      new_refs.append(p);
    }
  }
  else { // straights.count() must be 1.
    for(i = 0; i < (int)pts.count(); i++) {
      G_ref *p = new G_ref();
      tmp.clear();
      tmp.append(pts[i]);
      tmp.append(straights[0]);
      
      p->create(G_LINE, G_PERPENDICULAR_LINE, tmp, this);
      
      new_refs.append(p);
    }
  }

  clearSel();

  for(i = 0; i < (int)new_refs.count(); i++) addSel(new_refs[i]);
  emit documentChanged();
  return;

}


void HeyGeoDocument::newLine()
{
  G_refs tmp, new_refs, pts, straights;
  int i;

  if(!canNewLine()) {
    Q_ASSERT(canNewLine());
    return;
  }


  for(i = 0; i < (int)selectedRefs.count(); i++) {
    if(selectedRefs[i]->getType() & G_STRAIGHT) straights.append(selectedRefs[i]);
    else if(selectedRefs[i]->getType() == G_POINT) pts.append(selectedRefs[i]);
  }

  if(pts.count() == 1) {
    for(i = 0; i < (int)straights.count(); i++) {
      G_ref *p = new G_ref();
      tmp.clear();
      tmp.append(pts[0]);
      tmp.append(straights[i]);
      
      p->create(G_LINE, G_PARALLEL_LINE, tmp, this);
      
      new_refs.append(p);
    }
  }
  else if(straights.count() == 0) {
    if(selectedRefs.count() == 2) { // two points
      G_ref *s = new G_ref();
      s->create(G_LINE, G_TWOPOINTS_LINE, selectedRefs, this);
      clearSel();
      addSel(s);
      emit documentChanged();
      return;
    }

    for(i = 0; i < (int)selectedRefs.count(); i++) {
      G_ref *s = new G_ref();
      tmp.clear();
      tmp.append(selectedRefs[i]);
      if(i + 1 < (int)selectedRefs.count()) {
	tmp.append(selectedRefs[i + 1]);
      }
      else { tmp.append(selectedRefs[0]); }
      
      s->create(G_LINE, G_TWOPOINTS_LINE, tmp, this);
      
      new_refs.append(s);
    }    
  }
  else { // straights.count() must be 1.
    for(i = 0; i < (int)pts.count(); i++) {
      G_ref *p = new G_ref();
      tmp.clear();
      tmp.append(pts[i]);
      tmp.append(straights[0]);
      
      p->create(G_LINE, G_PARALLEL_LINE, tmp, this);
      
      new_refs.append(p);
    }
  }

  clearSel();

  for(i = 0; i < (int)new_refs.count(); i++) addSel(new_refs[i]);
  emit documentChanged();
  return;

}


void HeyGeoDocument::editSelectAllOfType(int typeMask)
{
  clearSel();
  for(int i = 0; i < (int)allRefs.count(); i++) {
    if(allRefs[i]->isDrawn()) {
      if(typeMask == 0 || (allRefs[i]->getType() & typeMask))
        addSel(allRefs[i]);
    }
  }
  emit documentChanged();
}

void HeyGeoDocument::editSelectAll()
{
  editSelectAllOfType(0);
}

void HeyGeoDocument::editDelete()
{
  if(!canEditDelete()) {
    Q_ASSERT(canEditDelete());
    return;
  }

  G_refs toBeDeleted;

  toBeDeleted.topologicalSort(selectedRefs);

  //if this is a construction and we are deleting any givens, we must
  //also delete all loops:
  int i;

  if(isConstruction()) {
    for(i = toBeDeleted.count() - 1; i >= 0; i--) {
      if(toBeDeleted[i]->getGiven()) break;
    }
    
    if(i >= 0) { //if there was a given
      HeyGeoConstruction *me = (HeyGeoConstruction *)this;

      for(i = me->getLoops().count() - 1; i >= 0; i--) {
	toBeDeleted.appendUnique(me->getLoops()[i]);
      }
    }
  }

  allRefs.holdRemovals();

  for(i = toBeDeleted.count() - 1; i >= 0; i--) {
    toBeDeleted[i]->getChildren().clear(); //for performance
  }

  for(i = toBeDeleted.count() - 1; i >= 0; i--) {
    toBeDeleted[i]->remove();
  }

  allRefs.commitRemovals();

  emit documentChanged();
}


void HeyGeoDocument::editUndo()
{
  if(!canEditUndo()) {
    Q_ASSERT(canEditUndo());
    return;
  }

  isUndoing = true;

  undoStack.DoIt();

  isUndoing = false;

  redoStack.opFinished();

  emit documentChanged();
}


void HeyGeoDocument::editRedo()
{
  if(!canEditRedo()) {
    Q_ASSERT(canEditRedo());
    return;
  }

  isRedoing = true;

  redoStack.DoIt();

  isRedoing = false;

  emit documentChanged();
}


void HeyGeoDocument::editToggleLabels()
{
  int i;

  if(!canEditToggleLabels()) {
    Q_ASSERT(canEditToggleLabels());
    return;
  }

  for(i = 0; i < (int)selectedRefs.count(); i++) {
    if(selectedRefs[i]->getType() & (G_CURVE | G_POINT)) {
      selectedRefs[i]->setLabelVisible(!(selectedRefs[i]->getLabelVisible()));
    }
  }

  emit documentChanged();
  emitDocumentModified();
}


void HeyGeoDocument::editHideLabels()
{
  int i;

  if(!canEditToggleLabels()) {
    Q_ASSERT(canEditToggleLabels());
    return;
  }

  for(i = 0; i < (int)selectedRefs.count(); i++) {
    if(selectedRefs[i]->getType() & (G_CURVE | G_POINT)) {
      selectedRefs[i]->setLabelVisible(false);
    }
  }

  emit documentChanged();
  emitDocumentModified();
}


void HeyGeoDocument::editShowLabels()
{
  int i;

  if(!canEditToggleLabels()) {
    Q_ASSERT(canEditToggleLabels());
    return;
  }

  for(i = 0; i < (int)selectedRefs.count(); i++) {
    if(selectedRefs[i]->getType() & (G_CURVE | G_POINT)) {
      selectedRefs[i]->setLabelVisible(true);
    }
  }

  emit documentChanged();
  emitDocumentModified();
}


void HeyGeoDocument::editChangeLabel()
{

  QDialog labelDlg;
  labelDlg.setModal(true);
  QPushButton *ok, *cancel;
  KFormulaEdit *edit;
  
  QVBoxLayout vlayout(&labelDlg);

  edit = new KFormulaEdit(&labelDlg);
  edit->setText(selectedRefs[0]->getLabel().getText());

  vlayout.addWidget(edit);
  
  QHBoxLayout hlayout;
  vlayout.addLayout(&hlayout);

  ok = new QPushButton(qApp->translate("HeyGeoDocument", "OK", ""), &labelDlg );
  hlayout.addWidget(ok);
  QObject::connect( ok, SIGNAL(clicked()), &labelDlg, SLOT(accept()) );
  ok->setDefault(true);
  cancel = new QPushButton(qApp->translate("HeyGeoDocument", "Cancel", ""), &labelDlg );
  hlayout.addWidget(cancel);
  QObject::connect( cancel, SIGNAL(clicked()), &labelDlg, SLOT(reject()) );

  labelDlg.resize(QSize(300, 200).expandedTo(edit->getFormula()->size() +
					     QSize(20, 20 + ok->height())));
  
  labelDlg.exec();
  if(labelDlg.result() == QDialog::Rejected) return;
  
  addUndo(new G_undoChangeLabel(selectedRefs[0]));
  selectedRefs[0]->getLabel().setText(edit->text());

  emit documentChanged();
  emitDocumentModified();
}


void HeyGeoDocument::editHide()
{
  int i;
  if(!canEditHide()) {
    Q_ASSERT(canEditHide());
    return;
  }

  for(i = 0; i < (int)selectedRefs.count(); i++) {
    addUndo(new G_undoShowHide(selectedRefs[i]));

    selectedRefs[i]->setVisible(!selectedRefs[i]->getVisible());
    if(selectedRefs[i]->getVisible() == false) {
      delSel(selectedRefs[i]);
      i--;
    }

  }

  emit documentChanged();
  emitDocumentModified();
}


void HeyGeoDocument::editShowHidden()
{
  int i;
  if(!canEditShowHidden()) {
    Q_ASSERT(canEditShowHidden());
    return;
  }

  clearSel();

  for(i = 0; i < (int)allRefs.count(); i++) {
    if(allRefs[i]->getVisible() == false && allRefs[i]->getType() != G_LOOP) {
      addUndo(new G_undoShowHide(allRefs[i]));

      allRefs[i]->setVisible(true);
      addSel(allRefs[i]);
    }
  }

  emit documentChanged();
  emitDocumentModified();
}


void HeyGeoDocument::editChangeNumberOfSamples()
{
  if(!canEditChangeNumberOfSamples()) {
    Q_ASSERT(canEditChangeNumberOfSamples());
  }

  HeyGeoSampleChangeDialog d(selectedRefs[0], this);
  d.exec();
}

HeyGeoSampleChangeDialog::HeyGeoSampleChangeDialog(G_ref *inLocus,
					       HeyGeoDocument *inDoc)
  : QDialog(nullptr), doc(inDoc)
{
  setModal(true);
  locus = (G_locusObject *)(inLocus->getObject());
  originalNumSamples = locus->getMaxSamples();
  QLabel *l = new QLabel(tr("Samples in locus:"), this);
  l->setGeometry(10, 10, 100, 30);
  QSpinBox *box = new QSpinBox(this);
  box->setRange(15, 40000);
  box->setSingleStep(5);
  box->setValue(locus->getMaxSamples());
  box->setGeometry(130, 10, 100, 30);
  connect(box, SIGNAL(valueChanged(int)), SLOT(setIt(int)));
  QPushButton *ok, *cancel;
  ok = new QPushButton(tr("OK"), this );
  ok->setGeometry( 10,60, 100,30 );
  connect( ok, SIGNAL(clicked()), SLOT(accept()) );
  cancel = new QPushButton(tr("Cancel"), this );
  cancel->setGeometry( 130,60, 100,30 );
  connect( cancel, SIGNAL(clicked()), SLOT(reject()) );
  objectsToUpdate.topologicalSort(inLocus);
}

void HeyGeoSampleChangeDialog::setIt(int val)
{
  locus->setMaxSamples(val);
  objectsToUpdate.update();
  doc->emitDocumentChanged();
}

// ── Measure-column helper ─────────────────────────────────────────────────────
// Positions a newly-created value object (measure / calculate / parameter) so
// that it appears below the most-recently-created visible value object at the
// same left-edge (giving a tidy column). Falls back to `fallback` when there
// is no existing value object on the canvas yet.
static void positionNewValueObject(HeyGeoDocument *doc, G_ref *newRef,
                                   const G_point &fallback)
{
  // Find the most-recently-created visible value object other than newRef itself.
  G_valueObject *prev = nullptr;
  for (int i = doc->getNumRefs() - 1; i >= 0; --i) {
    G_ref *r = doc->getRef(i);
    if (r == newRef || r->getDeleted()) continue;
    int t = r->getType();
    if ((t & G_VALUE) && !(t & G_FUNCTION)) {
      prev = dynamic_cast<G_valueObject *>(r->getObject());
      if (prev) break;
    }
  }

  if (!prev) {
    newRef->getObject()->translate(fallback);
    return;
  }

  QRect prevExt = prev->getScrollExtents();
  QRect newExt  = newRef->getObject()->getScrollExtents();

  int leftEdge = prevExt.left();
  int newH     = (newExt.height() > 0) ? newExt.height() : 20;
  int newW     = (newExt.width()  > 0) ? newExt.width()  : 80;
  int gap      = 6;

  double centerX = leftEdge + newW / 2.0;
  double centerY = prevExt.bottom() + gap + newH / 2.0;
  newRef->getObject()->translate(G_point(centerX, centerY));
}

// ── Align / distribute selected value objects (Shift+Enter) ──────────────────
void HeyGeoDocument::alignValueObjects(bool spread)
{
  struct Entry { G_ref *ref; G_valueObject *vo; };
  std::vector<Entry> vals;

  for (qsizetype i = 0; i < selectedRefs.count(); ++i) {
    G_ref *r = selectedRefs.at(i);
    int t = r->getType();
    if ((t & G_VALUE) && !(t & G_FUNCTION) && !r->getDeleted()) {
      G_valueObject *vo = dynamic_cast<G_valueObject *>(r->getObject());
      if (vo) vals.push_back({r, vo});
    }
  }

  if (vals.size() < 2) return;

  // Sort top-to-bottom by current screen position
  std::sort(vals.begin(), vals.end(), [](const Entry &a, const Entry &b) {
    return a.vo->getScrollExtents().top() < b.vo->getScrollExtents().top();
  });

  // Leftmost left edge among all selected value objects
  int leftEdge = vals[0].vo->getScrollExtents().left();
  for (auto &e : vals)
    leftEdge = std::min(leftEdge, e.vo->getScrollExtents().left());

  int gap = spread ? 14 : 4;
  int y   = vals[0].vo->getScrollExtents().top();

  for (auto &e : vals) {
    QRect ext = e.vo->getScrollExtents();
    int h = std::max(ext.height(), 20);
    int w = std::max(ext.width(),  40);
    double newCenterX = leftEdge + w / 2.0;
    double newCenterY = y + h / 2.0;
    G_point delta = G_point(newCenterX, newCenterY) - e.vo->getPos();
    e.vo->translate(delta);
    y += h + gap;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

void HeyGeoDocument::measureDistance()
{
  if(!canMeasureDistance()) {
    Q_ASSERT(canMeasureDistance());
    return;
  }

  G_ref *p = new G_ref();
  G_refs tmp;

  if(selectedRefs[0]->getType() == G_POINT) tmp = selectedRefs;
  else {
    tmp.append(selectedRefs[1]);
    tmp.append(selectedRefs[0]);
  }

  p->create(G_MEASURE, G_DISTANCE_MEASURE, tmp, this);

  //move it close to the (first) object, aligned with existing measure column
  positionNewValueObject(this, p,
      G_point(selectedRefs[0]->getObject()->getScrollExtents().center()) +
      G_point(INTRAND(-100, 100), INTRAND(-100, 100)));

  clearSel();

  addSel(p);

  emit documentChanged();  
}


void HeyGeoDocument::measureLength()
{
  if(!canMeasureLength()) {
    Q_ASSERT(canMeasureLength());
    return;
  }

  for(qsizetype i = 0; i < selectedRefs.count(); ++i) {
    G_ref *p = new G_ref();
    G_refs l; l.push_back(selectedRefs[i]);
    p->create(G_MEASURE, G_LENGTH_MEASURE, l, this);
    //move it close to the object, aligned with existing measure column
    positionNewValueObject(this, p,
        G_point(selectedRefs[i]->getObject()->getScrollExtents().center()) +
        G_point(INTRAND(-100, 100), INTRAND(-100, 100)));
  }

  clearSel();

  emit documentChanged();
}


void HeyGeoDocument::measureRadius()
{
  if(!canMeasureRadius()) {
    Q_ASSERT(canMeasureRadius());
    return;
  }

  G_ref *p = new G_ref();

  p->create(G_MEASURE, G_RADIUS_MEASURE, selectedRefs, this);

  //move it close to the object, aligned with existing measure column
  positionNewValueObject(this, p,
      G_point(selectedRefs[0]->getObject()->getScrollExtents().center()) +
      G_point(INTRAND(-100, 100), INTRAND(-100, 100)));

  clearSel();

  addSel(p);

  emit documentChanged();  
}

void HeyGeoDocument::measureAngle()
{
  if(!canMeasureAngle()) {
    Q_ASSERT(canMeasureAngle());
    return;
  }

  G_ref *p = new G_ref();

  p->create(G_MEASURE, G_ANGLE_MEASURE, selectedRefs, this);

  //move it close to the (first) object, aligned with existing measure column
  positionNewValueObject(this, p,
      G_point(selectedRefs[0]->getObject()->getScrollExtents().center()) +
      G_point(INTRAND(-100, 100), INTRAND(-100, 100)));

  clearSel();

  addSel(p);

  emit documentChanged();  
}


void HeyGeoDocument::measureRatio()
{
  if(!canMeasureRatio()) {
    Q_ASSERT(canMeasureRatio());
    return;
  }

  G_ref *p = new G_ref();

  p->create(G_MEASURE, G_RATIO_MEASURE, selectedRefs, this);

  //move it close to the (first) object, aligned with existing measure column
  positionNewValueObject(this, p,
      G_point(selectedRefs[0]->getObject()->getScrollExtents().center()) +
      G_point(INTRAND(-100, 100), INTRAND(-100, 100)));

  addSel(p);

  emit documentChanged();  
}


void HeyGeoDocument::measureSlope()
{
  if(!canMeasureSlope()) {
    Q_ASSERT(canMeasureSlope());
    return;
  }

  G_ref *p = new G_ref();

  p->create(G_MEASURE, G_SLOPE_MEASURE, selectedRefs, this);

  //move it close to the (first) object, aligned with existing measure column
  {
    G_point slFallback = (selectedRefs[0]->getType() != G_LINE)
      ? G_point(selectedRefs[0]->getObject()->getScrollExtents().center()) + G_point(INTRAND(-100, 100), INTRAND(-100, 100))
      : selectedRefs[0]->getObject()->getLine().getP1() + G_point(INTRAND(-100, 100), INTRAND(-100, 100));
    positionNewValueObject(this, p, slFallback);
  }

  clearSel();

  addSel(p);

  emit documentChanged();  
}


void HeyGeoDocument::measureArea()
{
  if(!canMeasureArea()) {
    Q_ASSERT(canMeasureArea());
    return;
  }

  G_ref *p = new G_ref();

  p->create(G_MEASURE, G_AREA_MEASURE, selectedRefs, this);

  //move it close to the (first) object, aligned with existing measure column
  positionNewValueObject(this, p,
      G_point(selectedRefs[0]->getObject()->getScrollExtents().center()) +
      G_point(INTRAND(-100, 100), INTRAND(-100, 100)));

  clearSel();

  addSel(p);

  emit documentChanged();  
}


void HeyGeoDocument::measureCoordinates()
{
  if (!canMeasureCoordinates()) return;
  // Find the active coordsys ref so it becomes a parent → measure updates when scale changes.
  G_ref *csRef = nullptr;
  for (qsizetype i = 0; i < allRefs.count(); ++i)
    if (allRefs[i]->getType() == G_COORDSYS && !allRefs[i]->getDeleted()) { csRef = allRefs[i]; break; }
  for (qsizetype i = 0; i < selectedRefs.count(); i++) {
    G_ref *p = new G_ref();
    G_refs l; l.push_back(selectedRefs[i]);
    if (csRef) l.push_back(csRef);
    p->create(G_MEASURE, G_COORDINATES_MEASURE, l, this);
    positionNewValueObject(this, p,
        G_point(l[0]->getObject()->getScrollExtents().center()) + G_point(INTRAND(20, 60), INTRAND(20, 60)));
  }
  clearSel();
  emit documentChanged();
}

void HeyGeoDocument::measureAbscissa()
{
  if (!canMeasureAbscissa()) return;
  G_ref *csRef = nullptr;
  for (qsizetype i = 0; i < allRefs.count(); ++i)
    if (allRefs[i]->getType() == G_COORDSYS && !allRefs[i]->getDeleted()) { csRef = allRefs[i]; break; }
  for (qsizetype i = 0; i < selectedRefs.count(); i++) {
    G_ref *p = new G_ref();
    G_refs l; l.push_back(selectedRefs[i]);
    if (csRef) l.push_back(csRef);
    p->create(G_MEASURE, G_ABSCISSA_MEASURE, l, this);
    positionNewValueObject(this, p,
        G_point(l[0]->getObject()->getScrollExtents().center()) + G_point(INTRAND(20, 60), INTRAND(20, 60)));
  }
  clearSel();
  emit documentChanged();
}

void HeyGeoDocument::measureOrdinate()
{
  if (!canMeasureOrdinate()) return;
  G_ref *csRef = nullptr;
  for (qsizetype i = 0; i < allRefs.count(); ++i)
    if (allRefs[i]->getType() == G_COORDSYS && !allRefs[i]->getDeleted()) { csRef = allRefs[i]; break; }
  for (qsizetype i = 0; i < selectedRefs.count(); i++) {
    G_ref *p = new G_ref();
    G_refs l; l.push_back(selectedRefs[i]);
    if (csRef) l.push_back(csRef);
    p->create(G_MEASURE, G_ORDINATE_MEASURE, l, this);
    positionNewValueObject(this, p,
        G_point(l[0]->getObject()->getScrollExtents().center()) + G_point(INTRAND(20, 60), INTRAND(20, 60)));
  }
  clearSel();
  emit documentChanged();
}

void HeyGeoDocument::measureCoordinateDistance()
{
  if (!canMeasureCoordinateDistance()) return;
  G_ref *csRef = nullptr;
  for (qsizetype i = 0; i < allRefs.count(); ++i)
    if (allRefs[i]->getType() == G_COORDSYS && !allRefs[i]->getDeleted()) { csRef = allRefs[i]; break; }
  G_refs l = selectedRefs;
  if (csRef) l.push_back(csRef);
  G_ref *p = new G_ref();
  p->create(G_MEASURE, G_COORD_DISTANCE_MEASURE, l, this);
  positionNewValueObject(this, p,
      G_point(selectedRefs[0]->getObject()->getScrollExtents().center()) + G_point(INTRAND(20, 60), INTRAND(20, 60)));
  clearSel();
  addSel(p);
  emit documentChanged();
}

void HeyGeoDocument::measureEquation()
{
  if (!canMeasureEquation()) return;
  for (qsizetype i = 0; i < selectedRefs.count(); i++) {
    G_ref *p = new G_ref();
    G_refs l; l.push_back(selectedRefs[i]);
    p->create(G_MEASURE, G_EQUATION_MEASURE, l, this);
    positionNewValueObject(this, p,
        G_point(l[0]->getObject()->getScrollExtents().center()) + G_point(INTRAND(20, 60), INTRAND(20, 60)));
  }
  clearSel();
  emit documentChanged();
}

void HeyGeoDocument::transformChooseVector()
{
  if(!canTransformChooseVector()) {
    Q_ASSERT(canTransformChooseVector());
    return;
  }

  t_vector = selectedRefs;
  
  emit documentChanged();
}


void HeyGeoDocument::transformChooseMirror()
{
  if(!canTransformChooseMirror()) {
    Q_ASSERT(canTransformChooseMirror());
    return;
  }

  t_mirror = selectedRefs;
  
  emit documentChanged();
}


void HeyGeoDocument::transformChooseRatio()
{
  if(!canTransformChooseRatio()) {
    Q_ASSERT(canTransformChooseRatio());
    return;
  }

  t_ratio = selectedRefs;
  
  emit documentChanged();
}


void HeyGeoDocument::transformChooseCenter()
{
  if(!canTransformChooseCenter()) {
    Q_ASSERT(canTransformChooseCenter());
    return;
  }

  t_center = selectedRefs;
  
  emit documentChanged();
}


void HeyGeoDocument::transformChooseAngle()
{
  if(!canTransformChooseAngle()) {
    Q_ASSERT(canTransformChooseAngle());
    return;
  }

  t_angle = selectedRefs;
  
  emit documentChanged();
}


void HeyGeoDocument::transformClearChosen()
{
  if(!canTransformClearChosen()) {
    Q_ASSERT(canTransformClearChosen());
    return;
  }

  t_vector.clear(); t_ratio.clear(); t_center.clear(); t_angle.clear(); t_mirror.clear();
  t_distance.clear();
  emit documentChanged();
}


void HeyGeoDocument::transformChooseDistance()
{
  if(!canTransformChooseDistance()) {
    Q_ASSERT(canTransformChooseDistance());
    return;
  }

  t_distance = selectedRefs;

  emit documentChanged();
}


// ── helper: find the active view for this document ────────────────────────────
static HeyGeoView *findView(HeyGeoDocument *doc)
{
  QList<HeyGeoView *> allViews = HeyGeoView::getAllViews();
  for(int i = 0; i < allViews.count(); ++i)
    if(allViews[i]->isActiveWindow() && allViews[i]->getDocument() == doc)
      return allViews[i];
  for(int i = 0; i < allViews.count(); ++i)
    if(allViews[i]->getDocument() == doc)
      return allViews[i];
  return nullptr;
}

// ── helper: create an invisible G_CALCULATE ref with a constant numeric value
G_ref *HeyGeoDocument::createConstantValueRef(double value)
{
  G_refs noParents;
  G_ref *r = new G_ref();
  r->create(G_CALCULATE, G_REGULAR_CALCULATE, noParents, this, false);
  ((G_calculateObject *)(r->getObject()))->changeFormula(noParents, QString::number(value));
  r->setVisible(false);
  return r;
}

// ── helper: create an invisible G_FREE_POINT ref at document coordinates (x, y)
G_ref *HeyGeoDocument::createFixedPointRef(double x, double y)
{
  G_refs noParents;
  G_ref *r = new G_ref();
  r->create(G_POINT, G_FREE_POINT, noParents, this, false);
  if(x != 0.0 || y != 0.0)
    r->getObject()->translate(G_point(x, y));
  r->setVisible(false);
  return r;
}


void HeyGeoDocument::transformTranslate()
{
  if(!canTransformTranslate()) {
    Q_ASSERT(canTransformTranslate());
    return;
  }

  HeyGeoView *curView = findView(this);
  HeyGeoTranslateDialog dlg(t_vector.count() > 0, QString(), curView);
  if(dlg.exec() != QDialog::Accepted) return;

  G_refs new_refs;

  if(dlg.mode() == HeyGeoTranslateDialog::ByVector) {
    // Translate by the pre-marked vector
    for(int i = 0; i < (int)selectedRefs.count(); i++) {
      G_ref *p = new G_ref();
      G_refs parents = t_vector;
      parents.insert(0, selectedRefs[i]);
      p->create(selectedRefs[i]->getType(), G_TRANSLATED, parents, this);
      new_refs.append(p);
    }
  } else {
    // Fixed value: create two invisible helper points at (0,0) and (dx,dy)
    double dx = dlg.dx(), dy = dlg.dy();
    G_ref *hp1 = createFixedPointRef(0.0, 0.0);
    G_ref *hp2 = createFixedPointRef(dx, dy);
    for(int i = 0; i < (int)selectedRefs.count(); i++) {
      G_ref *p = new G_ref();
      G_refs parents;
      parents.append(selectedRefs[i]);
      parents.append(hp1);
      parents.append(hp2);
      p->create(selectedRefs[i]->getType(), G_TRANSLATED, parents, this);
      new_refs.append(p);
    }
  }

  clearSel();
  for(int i = 0; i < (int)new_refs.count(); i++) addSel(new_refs[i]);
  emit documentChanged();
  return;
}


void HeyGeoDocument::transformReflect()
{
  if(!canTransformReflect()) {
    Q_ASSERT(canTransformReflect());
    return;
  }

  G_refs parents;
  G_refs new_refs;
  int i;

  for(i = 0; i < (int)selectedRefs.count(); i++) {
    G_ref *p = new G_ref();
    parents = t_mirror;
    parents.insert(0, selectedRefs[i]);

    p->create(parents[0]->getType(), G_REFLECTED, parents, this);

    new_refs.append(p);
  }
  clearSel();

  for(i = 0; i < (int)new_refs.count(); i++) addSel(new_refs[i]);
  emit documentChanged();
  return;
}


void HeyGeoDocument::transformRotate()
{
  if(!canTransformRotate()) {
    Q_ASSERT(canTransformRotate());
    return;
  }

  HeyGeoView *curView = findView(this);
  HeyGeoRotateDialog dlg(t_angle.count() > 0, QString(), QString(), curView);
  if(dlg.exec() != QDialog::Accepted) return;

  G_refs new_refs;

  if(dlg.mode() == HeyGeoRotateDialog::ByMarkedAngle) {
    for(int i = 0; i < (int)selectedRefs.count(); i++) {
      G_ref *p = new G_ref();
      G_refs parents = t_angle;
      parents.insert(0, t_center[0]);
      parents.insert(0, selectedRefs[i]);
      p->create(selectedRefs[i]->getType(), G_ROTATED, parents, this);
      new_refs.append(p);
    }
  } else {
    G_ref *angleRef = createConstantValueRef(dlg.fixedAngleDeg());
    for(int i = 0; i < (int)selectedRefs.count(); i++) {
      G_ref *p = new G_ref();
      G_refs parents;
      parents.append(selectedRefs[i]);
      parents.append(t_center[0]);
      parents.append(angleRef);
      p->create(selectedRefs[i]->getType(), G_ROTATED, parents, this);
      new_refs.append(p);
    }
  }

  clearSel();
  for(int i = 0; i < (int)new_refs.count(); i++) addSel(new_refs[i]);
  emit documentChanged();
  return;
}


void HeyGeoDocument::transformScale()
{
  if(!canTransformScale()) {
    Q_ASSERT(canTransformScale());
    return;
  }

  HeyGeoView *curView = findView(this);
  HeyGeoDilateDialog dlg(t_ratio.count() > 0, QString(), QString(), curView);
  if(dlg.exec() != QDialog::Accepted) return;

  G_refs new_refs;

  if(dlg.mode() == HeyGeoDilateDialog::ByMarkedRatio) {
    for(int i = 0; i < (int)selectedRefs.count(); i++) {
      G_ref *p = new G_ref();
      G_refs parents = t_ratio;
      parents.insert(0, t_center[0]);
      parents.insert(0, selectedRefs[i]);
      p->create(selectedRefs[i]->getType(), G_SCALED, parents, this);
      new_refs.append(p);
    }
  } else {
    G_ref *ratioRef = createConstantValueRef(dlg.fixedRatio());
    for(int i = 0; i < (int)selectedRefs.count(); i++) {
      G_ref *p = new G_ref();
      G_refs parents;
      parents.append(selectedRefs[i]);
      parents.append(t_center[0]);
      parents.append(ratioRef);
      p->create(selectedRefs[i]->getType(), G_SCALED, parents, this);
      new_refs.append(p);
    }
  }

  clearSel();
  for(int i = 0; i < (int)new_refs.count(); i++) addSel(new_refs[i]);
  emit documentChanged();
  return;
}


void HeyGeoDocument::measureCalculate()
{
  if(!canMeasureCalculate()) {
    Q_ASSERT(canMeasureCalculate());
    return;
  }

  //find the appropriate view which originated the command:
  HeyGeoView *curView = 0;

  QList<HeyGeoView *> allViews = HeyGeoView::getAllViews();
  unsigned int i;

  for(i = 0; i < (unsigned int)allViews.count(); ++i) {
    if(allViews.at(i)->isActiveWindow() && allViews.at(i)->getDocument() == this) {
      curView = allViews.at(i);
      break;
    }
  }
  if(curView == 0) for(i = 0; i < (unsigned int)allViews.count(); ++i) {
    if(allViews.at(i)->getDocument() == this) {
      curView = allViews.at(i);
      break;
    }
  }

  Q_ASSERT(curView != 0);

  QString str;
  if(selectedRefs.size() != 0) str = QString(QChar(int(REFERENCE_NUM(0))));

  HeyGeoCalculateEditor *e = new HeyGeoCalculateEditor(curView, str, selectedRefs);

  e->run();
  if(e->result() == QDialog::Rejected) { delete e; return; }

  G_ref *p = new G_ref();

  p->create(G_CALCULATE, G_REGULAR_CALCULATE, e->getOutputParents(), this);
  ((G_calculateObject *)(p->getObject()))->setInitialFormulaString(e->getOutputString());

  delete e;

  p->update();

  // Place the calculation aligned with the existing measure column.
  positionNewValueObject(this, p, G_point(INTRAND(100, 400), INTRAND(100, 300)));
  clearSel();

  addSel(p);
  emit documentChanged();
  return;
}

// ── Number > New Parameter ────────────────────────────────────────────────────
void HeyGeoDocument::numberNewParameter()
{
    if (!canNumberNewParameter()) return;

    // Find caller view for dialog parenting
    HeyGeoView *curView = nullptr;
    const QList<HeyGeoView *> allViews = HeyGeoView::getAllViews();
    for (HeyGeoView *v : allViews) {
        if (v->isActiveWindow() && v->getDocument() == this) { curView = v; break; }
    }
    if (!curView) for (HeyGeoView *v : allViews) {
        if (v->getDocument() == this) { curView = v; break; }
    }

    HeyGeoNewParameterDialog dlg(curView);
    if (dlg.exec() != QDialog::Accepted) return;

    G_ref *r = new G_ref();
    G_refs noParents;
    r->create(G_PARAMETER, G_SCALAR_PARAMETER, noParents, this);

    auto *paramObj = static_cast<G_parameterObject *>(r->getObject());
    paramObj->setParamName(dlg.getName());
    paramObj->setRange(dlg.getMin(), dlg.getMax());
    paramObj->setValue(dlg.getValue());

    r->update();

    // Place at same column as existing measure expressions, or random fallback.
    positionNewValueObject(this, r, G_point(INTRAND(100, 400), INTRAND(100, 300)));

    clearSel();
    addSel(r);
    emit documentChanged();
}

void HeyGeoDocument::editShowSelectionGroupDialog()
{
  HeyGeoView *curView = 0;
  QList<HeyGeoView *> allViews = HeyGeoView::getAllViews();
  unsigned int i;

  for(i = 0; i < (unsigned int)allViews.count(); ++i) {
    if(allViews.at(i)->isActiveWindow() && allViews.at(i)->getDocument() == this) {
      curView = allViews.at(i);
      break;
    }
  }
  if(curView == 0) for(i = 0; i < (unsigned int)allViews.count(); ++i) {
    if(allViews.at(i)->getDocument() == this) {
      curView = allViews.at(i);
      break;
    }
  }

  Q_ASSERT(curView != 0);

  if(!selectionGroupDialog.isNull()) {
    if(curView != selectionGroupDialog->parent()) delete selectionGroupDialog;
    else {
      selectionGroupDialog->show();
      selectionGroupDialog->activateWindow();
      return;
    }
  }

  selectionGroupDialog = new HeyGeoSelectionGroupDialog(curView, selectionGroups, this);

  selectionGroupDialog->show();
  selectionGroupDialog->activateWindow();
}

void HeyGeoDocument::doPlay(int which)
{
  if(!canPlay(which)) {
    Q_ASSERT(canPlay(which));
    return;
  }

  HeyGeoConstruction *c = HeyGeoConstruction::getAllConstructions()[which];

  int depth = HeyGeoRecursionDialog::getRecurseDepth(c);
  if(depth == -1) return;

  emit documentChanged(); //force a repaint

  c->allRefs.topologicalSort(c->allRefs);

  c->play(selectedRefs, this, depth);

  clearSel();

  emit documentChanged();
  return;
}


void HeyGeoConstruction::constructionMakeNormal()
{
  if(!canConstructionMakeNormal()) {
    Q_ASSERT(canConstructionMakeNormal());
    return;
  }

  int i;
  for(i = 0; i < (int)(selectedRefs.size()); ++i) {
    makeNormal(selectedRefs[i]);
  }

  emit documentChanged();
  return;
}


void HeyGeoConstruction::constructionMakeGiven()
{
  if(!canConstructionMakeGiven()) {
    Q_ASSERT(canConstructionMakeGiven());
    return;
  }

  int i;
  for(i = 0; i < (int)(selectedRefs.size()); ++i) {
    makeGiven(selectedRefs[i]);
  }

  emit documentChanged();
  return;
}


void HeyGeoConstruction::constructionMakeFinal()
{
  if(!canConstructionMakeFinal()) {
    Q_ASSERT(canConstructionMakeFinal());
    return;
  }

  int i;
  for(i = 0; i < (int)(selectedRefs.size()); ++i) {
    makeFinal(selectedRefs[i]);
  }

  emit documentChanged();
  return;
}


void HeyGeoConstruction::constructionMakeInitial()
{
  if(!canConstructionMakeInitial()) {
    Q_ASSERT(canConstructionMakeInitial());
    return;
  }

  int i;
  for(i = 0; i < (int)(selectedRefs.size()); ++i) {
    makeInitial(selectedRefs[i]);
  }

  emit documentChanged();
  return;
}


void HeyGeoConstruction::constructionRecurse()
{
  if(!canConstructionRecurse()) {
    Q_ASSERT(canConstructionRecurse());
    return;
  }
  
  G_ref *p = new G_ref();

  vector<int> perm;
  G_refs permuted;
  bool tmp = match(selectedRefs, given, perm);
  Q_ASSERT(tmp);
  int i;
  for(i = 0; i < (int)selectedRefs.count(); ++i) {
    permuted.append(selectedRefs[perm[i]]);
  }

  p->create(G_LOOP, 0, permuted, this);

  clearSel();

  addSel(p);

  emit documentChanged();  
}

// ═══════════════════════════════════════════════════════════════════════
//  Graph menu handlers
// ═══════════════════════════════════════════════════════════════════════

// Helper: find the first G_COORDSYS ref in the document (or nullptr)
static G_ref *findCoordSys(HeyGeoDocument *doc)
{
    for (int i = 0; i < doc->getNumRefs(); ++i) {
        G_ref *r = doc->getRef(i);
        if (!r->getDeleted() && r->getType() == G_COORDSYS) return r;
    }
    return nullptr;
}

void HeyGeoDocument::graphNewCoordSys()
{
    // Compute 1 cm in logical pixels so that 1 math unit = 1 cm on screen.
    double pixPerCm = 37.8;  // fallback: 96 DPI / 2.54
    QScreen *screen = QGuiApplication::primaryScreen();
    if (screen) {
        double dpi = screen->physicalDotsPerInchX();
        double dpr = screen->devicePixelRatio();
        if (dpi > 0 && dpr > 0)
            pixPerCm = dpi / (dpr * 2.54);
    }

    G_refs noParents;

    // Place origin near the centre-left of a default 600×500 view.
    const double ox = 200.0, oy = 300.0;

    // Create Origin Point
    G_ref *po = new G_ref();
    po->create(G_POINT, G_FREE_POINT, noParents, this, true);
    po->getObject()->getGeoRef()->translate(G_point(ox, oy));
    po->getLabel().setString("O");
    po->setLabelVisible(true);

    // Create Unit Point: exactly 1 cm to the right of O → 1 unit = 1 cm
    G_ref *pu = new G_ref();
    G_refs uParents;
    uParents.push_back(po);
    pu->create(G_POINT, G_HORIZONTAL_POINT, uParents, this, true);
    dynamic_cast<G_pointObject*>(pu->getObject())->setPoint(
        G_point(ox + pixPerCm, oy));
    pu->getLabel().setString("U");
    pu->setLabelVisible(false);

    // Create Vertical Unit Point: exactly 1 cm above O (screen y is flipped)
    G_ref *pv = new G_ref();
    G_refs vParents;
    vParents.push_back(po);
    pv->create(G_POINT, G_VERTICAL_POINT, vParents, this, true);
    dynamic_cast<G_pointObject*>(pv->getObject())->setPoint(
        G_point(ox, oy - pixPerCm));
    pv->getLabel().setString("V");
    pv->setLabelVisible(false);
    pv->setVisible(false);  // hidden by default (Square Grid mode)

    // Create X-axis as a G_LINE through O and U (selectable, point-on-axis capable)
    G_ref *xAxis = new G_ref();
    G_refs xParents;
    xParents.push_back(po);
    xParents.push_back(pu);
    xAxis->create(G_LINE, G_TWOPOINTS_LINE, xParents, this);
    xAxis->setLabelVisible(false);
    {
        QPen thinBlack(Qt::black, 0, Qt::SolidLine);
        xAxis->setDrawstyle(G_drawstyle::match(ANY, nullptr, &thinBlack, nullptr));
    }

    // Create Y-axis as a G_LINE through O and V (selectable, point-on-axis capable)
    G_ref *yAxis = new G_ref();
    G_refs yParents;
    yParents.push_back(po);
    yParents.push_back(pv);
    yAxis->create(G_LINE, G_TWOPOINTS_LINE, yParents, this);
    yAxis->setLabelVisible(false);
    {
        QPen thinBlack(Qt::black, 0, Qt::SolidLine);
        yAxis->setDrawstyle(G_drawstyle::match(ANY, nullptr, &thinBlack, nullptr));
    }

    // Create Coordinate System (draws tick marks and labels; axis lines come from G_LINE refs above)
    G_ref *pcs = new G_ref();
    G_refs csParents;
    csParents.append(po);
    csParents.append(pu);
    csParents.append(pv);  // par[2]=V for Rectangular Grid y-scale
    pcs->create(G_COORDSYS, G_RECTANGULAR_COORDSYS, csParents, this);

    // Apply Thin (width=0) Black drawstyle to the coordinate system tick marks.
    QPen thinBlack(Qt::black, 0, Qt::SolidLine);
    pcs->setDrawstyle(G_drawstyle::match(ANY, nullptr, &thinBlack, nullptr));

    clearSel();
    addSel(pcs);
    emit documentChanged();
}


void HeyGeoDocument::graphDefineAxes()
{
    if (!canGraphDefineAxes()) { Q_ASSERT(false); return; }
    G_ref *csRef = selectedRefs[0];
    G_coordsysObject *csObj =
        dynamic_cast<G_coordsysObject *>(csRef->getObject());
    if (!csObj) return;

    HeyGeoCoordSysDialog dlg(csObj->getCoordSys());
    if (dlg.exec() != QDialog::Accepted) return;
    emit documentChanged();
}

void HeyGeoDocument::graphNewFunction()
{
    HeyGeoView *curView = findView(this);
    HeyGeoNewFunctionDialog dlg(curView);
    if (dlg.exec() != QDialog::Accepted) return;

    QString expr = dlg.formula();
    if (expr.isEmpty()) return;

    G_refs noParents;
    G_ref *p = new G_ref();
    p->create(G_FUNCTION, G_EXPLICIT_FUNCTION, noParents, this);

    // Set default drawstyle: 14pt font (user can change via object properties)
    {
        QFont fnFont(QStringLiteral("Latin Modern Roman"), 14);
        fnFont.setItalic(true);
        QPen fnPen(Qt::black, 1);
        G_drawstyle *ds = G_drawstyle::match(ANY, &fnFont, &fnPen, nullptr);
        p->changeDrawstyle(ds);
    }

    G_functionObject *fnObj =
        dynamic_cast<G_functionObject *>(p->getObject());
    if (fnObj) {
        fnObj->getFuncDef().setFormula(expr);
        fnObj->getFuncDef().setVarName(QStringLiteral("x"));
        fnObj->getFuncDef().setDomain(dlg.xMin(), dlg.xMax());
        fnObj->getFuncDef().setNumSamples(dlg.numSamples());
    }
    // Give a label name; the draw() will show "f(x) = expr" on the canvas
    p->getLabel().setString(QStringLiteral("f"));

    // Position below any existing function label, or at the default corner
    G_functionObject *prevFn = nullptr;
    for (int i = getNumRefs() - 1; i >= 0; --i) {
        G_ref *r = getRef(i);
        if (r == p || r->getDeleted()) continue;
        if (r->getType() & G_FUNCTION) {
            prevFn = dynamic_cast<G_functionObject *>(r->getObject());
            if (prevFn) break;
        }
    }
    if (fnObj) {
        if (prevFn) {
            QRect prevExt = prevFn->getScrollExtents();
            QRect newExt  = fnObj->getScrollExtents();
            int newH = (newExt.height() > 0) ? newExt.height() : 18;
            int newW = (newExt.width()  > 0) ? newExt.width()  : 120;
            double centerX = prevExt.left() + newW / 2.0;
            double centerY = prevExt.bottom() + 6 + newH / 2.0;
            // Reset default pos (80,60) first, then translate to correct spot
            fnObj->translate(G_point(centerX - 80.0, centerY - 60.0));
        }
        // else: use default (80, 60) set in constructor
    }

    clearSel();
    addSel(p);
    emit documentChanged();
}

void HeyGeoDocument::graphPlotFunction()
{
    if (!canGraphPlotFunction()) { Q_ASSERT(false); return; }

    G_ref *fnRef = selectedRefs[0];
    G_ref *csRef = findCoordSys(this);
    if (!csRef) return;

    G_refs parents;
    parents.append(csRef);
    parents.append(fnRef);

    G_ref *p = new G_ref();
    p->create(G_FUNCTIONPLOT, G_EXPLICIT_FUNCTIONPLOT, parents, this);

    // GSP default: function plots are drawn in purple with slightly thicker line
    {
        QPen bluePen(QColor(128, 0, 128), 2);
        G_drawstyle *ds = G_drawstyle::match(ANY, nullptr, &bluePen, nullptr);
        p->changeDrawstyle(ds);
    }

    clearSel();
    addSel(p);
    emit documentChanged();
}

void HeyGeoDocument::graphPlotCurve()
{
    HeyGeoPlotCurveDialog dlg(nullptr);
    if (dlg.exec() != QDialog::Accepted) return;

    if (dlg.xFormula().isEmpty() || dlg.yFormula().isEmpty()) return;

    G_ref *csRef = findCoordSys(this);
    if (!csRef) {
        // Auto-create a coordinate system if none exists
        G_refs noParents;
        G_ref *cs = new G_ref();
        cs->create(G_COORDSYS, G_RECTANGULAR_COORDSYS, noParents, this);
        cs->getObject()->translate(G_point(300, 250));
        csRef = cs;
    }

    // Create x(t) function
    G_refs noParents;
    G_ref *xRef = new G_ref();
    xRef->create(G_FUNCTION, G_EXPLICIT_FUNCTION, noParents, this);
    {
        G_functionObject *fn =
            dynamic_cast<G_functionObject *>(xRef->getObject());
        if (fn) {
            fn->getFuncDef().setFormula(dlg.xFormula());
            fn->getFuncDef().setVarName(QStringLiteral("t"));
            fn->getFuncDef().setDomain(dlg.tMin(), dlg.tMax());
            fn->getFuncDef().setNumSamples(dlg.numSamples());
        }
    }

    // Create y(t) function
    G_ref *yRef = new G_ref();
    yRef->create(G_FUNCTION, G_EXPLICIT_FUNCTION, noParents, this);
    {
        G_functionObject *fn =
            dynamic_cast<G_functionObject *>(yRef->getObject());
        if (fn) {
            fn->getFuncDef().setFormula(dlg.yFormula());
            fn->getFuncDef().setVarName(QStringLiteral("t"));
            fn->getFuncDef().setDomain(dlg.tMin(), dlg.tMax());
            fn->getFuncDef().setNumSamples(dlg.numSamples());
        }
    }

    // Create the parametric curve
    G_refs parents;
    parents.append(csRef);
    parents.append(xRef);
    parents.append(yRef);

    G_ref *p = new G_ref();
    p->create(G_PARAMCURVE, G_EXPLICIT_PARAMCURVE, parents, this);

    clearSel();
    addSel(p);
    emit documentChanged();
}

void HeyGeoDocument::graphPlotAsXY()
{
    if (!canGraphPlotAsXY()) { Q_ASSERT(false); return; }

    G_ref *csRef = findCoordSys(this);
    if (!csRef) return;

    double xVal = selectedRefs[0]->getObject()->getNumValue();
    double yVal = selectedRefs[1]->getObject()->getNumValue();

    G_coordsysObject *csObj =
        dynamic_cast<G_coordsysObject *>(csRef->getObject());
    if (!csObj) return;

    G_point screenPt = csObj->getCoordSys().mathToScreen(xVal, yVal);

    G_refs noParents;
    G_ref *pt = new G_ref();
    pt->create(G_POINT, G_FREE_POINT, noParents, this);
    pt->getObject()->translate(screenPt);

    clearSel();
    addSel(pt);
    emit documentChanged();
}

void HeyGeoDocument::graphPlotValueOnAxis()
{
    if (!canGraphPlotValueOnAxis()) { Q_ASSERT(false); return; }

    G_ref *csRef = findCoordSys(this);
    if (!csRef) return;

    double val = selectedRefs[0]->getObject()->getNumValue();

    G_coordsysObject *csObj =
        dynamic_cast<G_coordsysObject *>(csRef->getObject());
    if (!csObj) return;

    G_point screenPt = csObj->getCoordSys().mathToScreen(val, 0.0);

    G_refs noParents;
    G_ref *pt = new G_ref();
    pt->create(G_POINT, G_FREE_POINT, noParents, this);
    pt->getObject()->translate(screenPt);

    clearSel();
    addSel(pt);
    emit documentChanged();
}

// ── Grid Form actions ──────────────────────────────────────────────────────

// Internal helper: set all coord-sys objects to a new grid form and
// show/hide the V point (par[2]) accordingly.
static void applyGridForm(HeyGeoDocument *doc, G_coordsys::GridForm form)
{
    for (int i = 0; i < doc->getNumRefs(); ++i) {
        G_ref *r = doc->getRef(i);
        if (r->getDeleted() || r->getType() != G_COORDSYS) continue;
        G_coordsysObject *csObj =
            dynamic_cast<G_coordsysObject *>(r->getObject());
        if (!csObj) continue;
        csObj->getCoordSys().setGridForm(form);
        // Show V only for Rectangular Grid (par[2])
        const G_refs &par = r->getParentsConst();
        if (par.count() >= 3)
            par[2]->setVisible(form == G_coordsys::RECTANGULAR_GRID);
    }
}

int HeyGeoDocument::getCurrentGridForm()
{
    for (int i = 0; i < getNumRefs(); ++i) {
        G_ref *r = getRef(i);
        if (!r->getDeleted() && r->getType() == G_COORDSYS) {
            G_coordsysObject *csObj =
                dynamic_cast<G_coordsysObject *>(r->getObject());
            if (csObj) return static_cast<int>(csObj->getCoordSys().gridForm());
        }
    }
    return -1;
}

void HeyGeoDocument::graphGridFormSquare()
{
    if (!canGraphGridForm()) { Q_ASSERT(false); return; }
    applyGridForm(this, G_coordsys::SQUARE_GRID);
    emit documentChanged();
}

void HeyGeoDocument::graphGridFormRectangular()
{
    if (!canGraphGridForm()) { Q_ASSERT(false); return; }
    applyGridForm(this, G_coordsys::RECTANGULAR_GRID);
    emit documentChanged();
}

void HeyGeoDocument::graphGridFormPolar()
{
    if (!canGraphGridForm()) { Q_ASSERT(false); return; }
    applyGridForm(this, G_coordsys::POLAR_GRID);
    emit documentChanged();
}

void HeyGeoDocument::graphGridFormTrig()
{
    if (!canGraphGridForm()) { Q_ASSERT(false); return; }
    applyGridForm(this, G_coordsys::TRIG_AXIS);
    emit documentChanged();
}

void HeyGeoDocument::graphGridForm()
{
    if (!canGraphGridForm()) { Q_ASSERT(false); return; }

    for (int i = 0; i < getNumRefs(); ++i) {
        G_ref *r = getRef(i);
        if (r->getDeleted() || r->getType() != G_COORDSYS) continue;
        G_coordsysObject *csObj =
            dynamic_cast<G_coordsysObject *>(r->getObject());
        if (!csObj) continue;
        bool newState = !csObj->getCoordSys().showGrid();
        csObj->getCoordSys().setShowGrid(newState);
    }
    emit documentChanged();
}

void HeyGeoDocument::graphSnapPoints()
{
    if (!canGraphSnapPoints()) { Q_ASSERT(false); return; }

    for (int i = 0; i < getNumRefs(); ++i) {
        G_ref *r = getRef(i);
        if (r->getDeleted() || r->getType() != G_COORDSYS) continue;
        G_coordsysObject *csObj =
            dynamic_cast<G_coordsysObject *>(r->getObject());
        if (!csObj) continue;
        bool newState = !csObj->getCoordSys().snapGrid();
        csObj->getCoordSys().setSnapGrid(newState);
    }
    emit documentChanged();
}

