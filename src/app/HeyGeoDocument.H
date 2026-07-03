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


#ifndef HeyGeoDOCUMENT_H
#define HeyGeoDOCUMENT_H

#include "my_hash_map.H"
#include <QObject>
#include <QDataStream>
#include <QPrinter>
#include <QPicture>
#include <QDialog>
#include <QPushButton>
#include <QSpinBox>
#include <QLabel>
#include <QPointer>
#include <vector>
#include "G_refs.H"
#include "G_undoStack.H"
#include "G_drawstyle.H"
#include "HeyGeoSelectionGroupDialog.H"

class HeyGeoSelectionGroup;

struct ViewTransform;

class HeyGeoDocument : public QObject
{
    friend class HeyGeoConstructionList;
    Q_OBJECT
public:

    HeyGeoDocument();
    virtual ~HeyGeoDocument();

    virtual bool isConstruction() { return false; }

    int getNumRefs() const { return allRefs.size(); }

    friend QDataStream &operator<<(QDataStream &, HeyGeoDocument &);
    friend QDataStream &operator>>(QDataStream &, HeyGeoDocument &);

    static bool parseVersionString(const QString &s, bool *isConstruction = nullptr,
                                   int *majorVersion = nullptr, int *minorVersion = nullptr);

    virtual void addRef(G_ref *inRef);
    virtual void delRef(G_ref *inRef);

    G_ref *getRef(int which) const { return allRefs[which]; }

    void addView() { numViews++; }
    void delView() { numViews--; if(numViews == 0) delete this; }
    int getNumViews() const { return numViews; }

    void draw(QPainter &p, const ViewTransform &trans);
    void print(QPainter &p, const ViewTransform &trans);

    QRect getSize(const ViewTransform &trans);

    G_ref *getNextSel(G_refs inRefs, bool shiftDown);
    G_refs whatAmIOn(int x, int y, const ViewTransform &trans, bool pointsOnly = true);
    G_refs whatLabelsAmIOn(int x, int y, const ViewTransform &trans);

    void addSelect(const QRect &, const ViewTransform &trans);

    void addSel(G_ref *inRef);
    void delSel(G_ref *inRef);
    void clearSel();

    G_refs getSelected() const { return selectedRefs; }
    int selectedCount() const { return selectedRefs.count(); }
    const G_refs &getAllRefs() const { return allRefs; }

    void emitDocumentChanged() { emit documentChanged(); }
    void emitDocumentModified()
    { if(!changed) {changed = true; emit documentModified();} }
    void emitDocumentSaved(const QString &f)
    { filename = f; changed = false; emit documentSaved(f); }

    bool isModified() const { return changed; }

    QString getFilename() const { return filename; }

    QPrinter *getPrinter() const { return printer; }
    QPicture *getPicture() const { return picture; }

    G_drawstyle *getDefaultDrawstyle() { return defaultDrawstyle; }
    void setDefaultDrawstyle(G_drawstyle *inDrawstyle)
    { defaultDrawstyle->deleteReference(); defaultDrawstyle = inDrawstyle; }
    G_drawstyle *getDefaultDrawstyleForType(G_Type t);

    void addUndo(G_undo *undo) {
        if(isUndoing) {
            redoStack.push(undo);
        }
        else {
            undoStack.push(undo);
            if(!isRedoing) redoStack.clear();
        }
    }

    virtual bool isPointFreeable(G_ref *p);

    void topSortAllRefs() { allRefs.topologicalSort(allRefs); }

    QString autoLabel(G_ref *r);

    QColor getCurrentColor();
    void setCurrentColor(QColor color);
    Qt::PenStyle getCurrentPenstyle();
    void setCurrentPenstyle(Qt::PenStyle penstyle);
    int getCurrentPenWidth();
    void setCurrentPenWidth(int width);
    PointStyle getCurrentPointstyle();
    void setCurrentPointstyle(PointStyle style);
    int getCurrentFontsize();
    void setCurrentFontsize(int size);
    QFont getCurrentFont();
    void setCurrentFont(const QFont &font);

    bool canNewSegment();
    bool canNewRay();
    bool canNewMidpoint();
    bool canNewLine();
    bool canNewPerpendicular();
    bool canNewBisector();
    bool canNewCircle();
    bool canNewCircleCenterPoint();
    bool canNewCircleCenterRadius();
    bool canNewArc();
    bool canNewArcOnCircle();
    bool canNewIntersection();
    bool canNewEndpoints();
    bool canNewCenterpoint();
    bool canNewLocus();
    bool canNewPolygon();
    bool canNewArcSector();
    bool canNewArcSegment();
    bool canNewCircleInterior();
    bool canNewPointOnObject();

    bool canEditDelete();
    bool canEditHide();
    bool canEditToggleLabels();
    bool canEditChangeLabel();
    bool canEditShowHidden();
    bool canEditUndo() { return undoStack.count(); }
    bool canEditRedo() { return redoStack.count(); }
    bool canEditChangeNumberOfSamples();

    bool canEditChangeColor();
    bool canEditChangeLinestyle();
    bool canEditChangePointstyle();
    bool canEditChangeFont();

    bool canMeasureDistance();
    bool canMeasureLength();
    bool canMeasureRadius();
    bool canMeasureAngle();
    bool canMeasureRatio();
    bool canMeasureSlope();
    bool canMeasureArea();
    bool canMeasureCalculate();

    bool canMeasureCoordinates();
    bool canMeasureAbscissa();
    bool canMeasureOrdinate();
    bool canMeasureCoordinateDistance();
    bool canMeasureEquation();

    // ── Number menu ──────────────────────────────────────────────────────────
    bool canNumberNewParameter();  // always true — no selection required

    bool canTransformChooseVector();
    bool canTransformChooseMirror();
    bool canTransformChooseCenter();
    bool canTransformChooseRatio();
    bool canTransformChooseAngle();
    bool canTransformChooseDistance();
    bool canTransformClearChosen();
    bool canTransformTranslate();
    bool canTransformRotate();
    bool canTransformScale();
    bool canTransformReflect();

    bool canPlay(int which);

    // ── Graph ────────────────────────────────────────────────────────────────
    bool canGraphNewCoordSys();
    bool canGraphDefineAxes();
    bool canGraphPlotAsXY();
    bool canGraphPlotValueOnAxis();
    bool canGraphNewFunction();
    bool canGraphPlotFunction();
    bool canGraphPlotCurve();
    bool canGraphGridForm();
    bool canGraphSnapPoints();
    int  getCurrentGridForm();  // returns G_coordsys::GridForm as int, or -1 if none

public slots:
    void newSegment();
    void newRay();
    void newMidpoint();
    void newLine();
    void newPerpendicular();
    void newBisector();
    void newCircle();
    void newIntersection();
    void newEndpoints();
    void newCenterpoint();
    void newArc();
    void newArcOnCircle();
    void newLocus();
    void newPolygon();
    void newArcSector();
    void newArcSegment();
    void newCircleInterior();
    void newPointOnObject();

    void editUndo();
    void editRedo();
    void editDelete();
    void editSelectAll();
    void editSelectAllOfType(int typeMask); // 0 = all visible objects
    void editToggleLabels();
    void editHideLabels();
    void editShowLabels();
    void editChangeLabel();
    void editHide();
    void editShowHidden();
    void editChangeNumberOfSamples();
    void editShowSelectionGroupDialog();

    void measureDistance();
    void measureLength();
    void measureRadius();
    void measureAngle();
    void measureRatio();
    void measureSlope();
    void measureArea();
    void measureCalculate();

    void measureCoordinates();
    void measureAbscissa();
    void measureOrdinate();
    void measureCoordinateDistance();
    void measureEquation();

    // Align/distribute selected value expressions (invoked by Shift+Enter).
    // spread=false → compact spacing (4 px gap); spread=true → wider spacing (14 px gap).
    void alignValueObjects(bool spread);

    // ── Number menu slots ────────────────────────────────────────────────────
    void numberNewParameter();

    void transformChooseVector();
    void transformChooseMirror();
    void transformChooseAngle();
    void transformChooseCenter();
    void transformChooseRatio();
    void transformChooseDistance();
    void transformClearChosen();
    void transformTranslate();
    void transformReflect();
    void transformRotate();
    void transformScale();

    void doPlay(int which);

    // ── Graph menu slots ─────────────────────────────────────────────────────
    void graphNewCoordSys();
    void graphDefineAxes();
    void graphPlotAsXY();
    void graphPlotValueOnAxis();
    void graphNewFunction();
    void graphPlotFunction();
    void graphPlotCurve();
    void graphGridForm();          // toggle show/hide grid
    void graphGridFormSquare();
    void graphGridFormRectangular();
    void graphGridFormPolar();
    void graphGridFormTrig();
    void graphSnapPoints();

signals:
    void documentChanged();
    void documentSaved(const QString &filename);
    void documentModified();

protected slots:
    void IChanged() { undoStack.opFinished(); }

protected:
    void afterLoadDraw();
    bool isUndoing;
    bool isRedoing;

    G_refs allRefs;
    G_refs selectedRefs;

    G_refs t_vector, t_ratio, t_center, t_angle, t_mirror, t_distance;

    // ── helpers for fixed-value transforms ─────────────────────────────────
    // Creates an invisible G_CALCULATE ref with a constant numeric value.
    G_ref *createConstantValueRef(double value);
    // Creates an invisible G_FREE_POINT ref at the given document coordinates.
    G_ref *createFixedPointRef(double x, double y);

    G_undoStack undoStack;
    G_undoStack redoStack;

    hash_map<int, int> labelData;

    G_drawstyle *defaultDrawstyle;
    G_drawstyle *defaultPointDrawstyle;
    G_drawstyle *defaultStraightDrawstyle;
    G_drawstyle *defaultCircleDrawstyle;

    bool changed;
    QString filename;

    QPrinter *printer;
    QPicture *picture;

    QPointer<HeyGeoSelectionGroupDialog> selectionGroupDialog;
    std::vector<HeyGeoSelectionGroup *> selectionGroups;
private:
    int numViews;
};

QDataStream &operator<<(QDataStream &, HeyGeoDocument &);
QDataStream &operator>>(QDataStream &, HeyGeoDocument &);

class G_locusObject;
class HeyGeoSampleChangeDialog : public QDialog
{
    Q_OBJECT
public:
    HeyGeoSampleChangeDialog(G_ref *inLocus, HeyGeoDocument *inDoc);

public slots:
    void setIt(int val);
    void reject() { setIt(originalNumSamples); QDialog::reject(); }

protected:
    G_locusObject *locus;
    HeyGeoDocument *doc;
    int originalNumSamples;
    G_refs objectsToUpdate;
};

#endif // HeyGeoDOCUMENT_H
