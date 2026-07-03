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


#include "HeyGeoDocument.H"
#include "HeyGeoConstruction.H"
#include "G_ref.H"
#include "G_refSearcher.H"

bool HeyGeoDocument::canNewSegment()
{
    if(selectedRefs.count() < 2) return false;

    for(qsizetype i = 0; i < selectedRefs.count(); i++) if(selectedRefs[i]->getType() != G_POINT) return false;

    return true;
}

bool HeyGeoDocument::canEditShowHidden()
{
    for(qsizetype i = 0; i < allRefs.count(); i++) {
        if(allRefs[i]->getType() != G_LOOP && allRefs[i]->getVisible() == false) return true;
    }

    return false;
}

bool HeyGeoDocument::canEditHide()
{
    for(qsizetype i = 0; i < selectedRefs.count(); i++) {
        if(selectedRefs[i]->getType() == G_LOOP) return false;
    }

    return selectedRefs.count() > 0;
}

bool HeyGeoDocument::canEditDelete()
{
    return selectedRefs.count() > 0;
}

bool HeyGeoDocument::canEditToggleLabels()
{
    for(qsizetype i = 0; i < selectedRefs.count(); i++) {
        if(selectedRefs[i]->getType() & (G_CURVE | G_POINT)) return true;
    }

    return false;
}

bool HeyGeoDocument::canEditChangeLabel()
{
    if(selectedRefs.count() != 1) return false;
    if(selectedRefs[0]->getType() & (G_CURVE | G_POINT)) return true;
    return false;
}

bool HeyGeoDocument::canEditChangeNumberOfSamples()
{
    if(selectedRefs.count() != 1) return false;
    if(selectedRefs[0]->getType() & G_LOCUS &&
        selectedRefs[0]->getDescendType() == G_OBJECT_LOCUS) return true;
    return false;
}

bool HeyGeoDocument::canEditChangeColor()
{
    if(selectedRefs.count() == 0) return true;

    // G_FUNCTION objects show f(x)=expr on canvas and support pen color changes
    for(qsizetype i = 0; i < selectedRefs.count(); i++)
        if(!(selectedRefs[i]->getType() & (G_TEXT | G_GEOMETRIC | G_FUNCTION))) return false;

    return true;
}

bool HeyGeoDocument::canEditChangeLinestyle()
{
    if(selectedRefs.count() == 0) return true;

    // Enable if at least one selected ref is a curve or locus;
    // setCurrentPenstyle/Width will skip non-curve refs in mixed selections.
    for(qsizetype i = 0; i < selectedRefs.count(); i++)
        if(selectedRefs[i]->getType() & (G_CURVE | G_LOCUS)) return true;

    return false;
}

bool HeyGeoDocument::canEditChangePointstyle()
{
    if(selectedRefs.count() == 0) return true;

    for(qsizetype i = 0; i < selectedRefs.count(); i++)
        if(!(selectedRefs[i]->getType() & G_POINT)) return false;

    return true;
}

bool HeyGeoDocument::canEditChangeFont()
{
    if(selectedRefs.count() == 0) return true;

    for(qsizetype i = 0; i < selectedRefs.count(); i++)
        if(!(selectedRefs[i]->getType() & (G_CURVE | G_POINT | G_TEXT)))
            return false;

    return true;
}

bool HeyGeoDocument::canNewRay()
{
    if(selectedRefs.count() < 2) return false;

    for(qsizetype i = 0; i < selectedRefs.count(); i++) if(selectedRefs[i]->getType() != G_POINT) return false;

    return true;
}

bool HeyGeoDocument::canNewLocus()
{
    if(selectedRefs.count() != 2) return false;

    if(selectedRefs[0]->getType() == G_POINT &&
        selectedRefs[0]->getDescendType() == G_CONSTRAINED_POINT &&
        selectedRefs[1]->getType() & G_GEOMETRIC) {

        BrokenLocusChainSearcher blcs(selectedRefs[1]);
        if(blcs.search(selectedRefs[0])) return true;
    }

    if(selectedRefs[1]->getType() == G_POINT &&
        selectedRefs[1]->getDescendType() == G_CONSTRAINED_POINT &&
        selectedRefs[0]->getType() & G_GEOMETRIC) {

        BrokenLocusChainSearcher blcs(selectedRefs[0]);
        if(blcs.search(selectedRefs[1])) return true;
    }

    return false;
}

bool HeyGeoDocument::canNewBisector()
{
    if(selectedRefs.count() != 3) return false;

    if(selectedRefs[0]->getType() == G_POINT && selectedRefs[1]->getType() == G_POINT &&
        selectedRefs[2]->getType() == G_POINT) return true;

    return false;
}

bool HeyGeoDocument::canNewMidpoint()
{
    if(!selectedRefs.count()) return false;

    for(qsizetype i = 0; i < selectedRefs.count(); i++) if(selectedRefs[i]->getType() != G_SEGMENT) return false;

    return true;
}

bool HeyGeoDocument::canNewEndpoints()
{
    if(selectedRefs.count() != 1) return false;
    return (selectedRefs[0]->getType() & (G_SEGMENT | G_RAY | G_ARC)) != 0;
}

bool HeyGeoDocument::canNewCenterpoint()
{
    if(selectedRefs.count() != 1) return false;
    return (selectedRefs[0]->getType() & (G_CIRCLE | G_ARC)) != 0;
}

bool HeyGeoDocument::canNewPerpendicular()
{
    if(selectedRefs.count() < 2) return false;

    qsizetype straights = 0, pts = 0;

    for(qsizetype i = 0; i < selectedRefs.count(); i++) {
        if(selectedRefs[i]->getType() & G_STRAIGHT) straights++;
        else if(selectedRefs[i]->getType() == G_POINT) pts++;
        else return false;
    }

    if((straights == 1 && pts) || (straights && pts == 1)) return true;

    return false;
}

bool HeyGeoDocument::canNewLine()
{
    if(selectedRefs.count() < 2) return false;

    qsizetype straights = 0, pts = 0;

    for(qsizetype i = 0; i < selectedRefs.count(); i++) {
        if(selectedRefs[i]->getType() & G_STRAIGHT) straights++;
        else if(selectedRefs[i]->getType() == G_POINT) pts++;
        else return false;
    }

    if((straights == 1 && pts) || (straights && pts == 1) || (!straights && pts >= 2)) return true;

    return false;
}

static bool isLengthMeasure(const G_ref *r)
{
    if(r->getType() != G_MEASURE) return false;
    int dt = r->getDescendType();
    return dt == G_DISTANCE_MEASURE || dt == G_LENGTH_MEASURE || dt == G_RADIUS_MEASURE;
}

bool HeyGeoDocument::canNewCircle()
{
    if(selectedRefs.count() != 2) return false;

    if((selectedRefs[0]->getType() == G_POINT) && (selectedRefs[1]->getType() == G_POINT)) return true;
    if((selectedRefs[0]->getType() == G_POINT) && (selectedRefs[1]->getType() == G_SEGMENT)) return true;
    if((selectedRefs[1]->getType() == G_POINT) && (selectedRefs[0]->getType() == G_SEGMENT)) return true;
    if((selectedRefs[0]->getType() == G_POINT) && isLengthMeasure(selectedRefs[1])) return true;
    if((selectedRefs[1]->getType() == G_POINT) && isLengthMeasure(selectedRefs[0])) return true;

    return false;
}

bool HeyGeoDocument::canNewArc()
{
    if(selectedRefs.count() != 3) return false;

    if(selectedRefs[0]->getType() != G_POINT) return false;
    if(selectedRefs[1]->getType() != G_POINT) return false;
    if(selectedRefs[2]->getType() != G_POINT) return false;

    return true;
}

bool HeyGeoDocument::canNewIntersection()
{
    if(selectedRefs.count() != 2) return false;

    return (selectedRefs[0]->getType() & G_CURVE) && (selectedRefs[1]->getType() & G_CURVE);
}

bool HeyGeoDocument::canNewArcSector()
{
    if(selectedRefs.count() == 1 && selectedRefs[0]->getType() == G_ARC) return true;
    return false;
}

bool HeyGeoDocument::canNewArcSegment()
{
    if(selectedRefs.count() == 1 && selectedRefs[0]->getType() == G_ARC) return true;
    return false;
}

bool HeyGeoDocument::canNewCircleInterior()
{
    if(selectedRefs.count() == 1 && selectedRefs[0]->getType() == G_CIRCLE) return true;
    return false;
}

bool HeyGeoDocument::canNewPolygon()
{
    if(selectedRefs.count() < 3) return false;
    for(qsizetype i = 0; i < selectedRefs.count(); ++i) {
        if(selectedRefs[i]->getType() != G_POINT) return false;
    }
    return true;
}

// Point on Object: needs 1 or more "path" objects (straight objects, circles, arcs)
bool HeyGeoDocument::canNewPointOnObject()
{
    if(selectedRefs.count() == 0) return false;
    for(qsizetype i = 0; i < selectedRefs.count(); ++i) {
        G_Type t = selectedRefs[i]->getType();
        if(!(t & (G_STRAIGHT | G_CIRCLE | G_ARC))) return false;
    }
    return true;
}

// Arc on Circle: exactly 1 circle + 2 points selected
bool HeyGeoDocument::canNewArcOnCircle()
{
    if(selectedRefs.count() != 3) return false;
    int circles = 0, points = 0;
    for(qsizetype i = 0; i < selectedRefs.count(); ++i) {
        if(selectedRefs[i]->getType() == G_CIRCLE) circles++;
        else if(selectedRefs[i]->getType() == G_POINT) points++;
        else return false;
    }
    return (circles == 1 && points == 2);
}

bool HeyGeoDocument::canNewCircleCenterRadius()
{
    if(selectedRefs.count() != 2) return false;
    if((selectedRefs[0]->getType() == G_POINT) && (selectedRefs[1]->getType() == G_SEGMENT)) return true;
    if((selectedRefs[1]->getType() == G_POINT) && (selectedRefs[0]->getType() == G_SEGMENT)) return true;
    if((selectedRefs[0]->getType() == G_POINT) && isLengthMeasure(selectedRefs[1])) return true;
    if((selectedRefs[1]->getType() == G_POINT) && isLengthMeasure(selectedRefs[0])) return true;
    return false;
}

bool HeyGeoDocument::canNewCircleCenterPoint()
{
    if(selectedRefs.count() != 2) return false;
    return (selectedRefs[0]->getType() == G_POINT) && (selectedRefs[1]->getType() == G_POINT);
}

bool HeyGeoDocument::canMeasureDistance()
{
    if(selectedRefs.count() != 2) return false;
    if(selectedRefs[0]->getType() != G_POINT && selectedRefs[1]->getType() != G_POINT)
        return false;
    if(selectedRefs[0]->getType() == selectedRefs[1]->getType()) return true;

    if(selectedRefs[0]->getType() & G_CURVE || selectedRefs[1]->getType() & G_CURVE)
        return true;

    return false;
}

bool HeyGeoDocument::canMeasureLength()
{
    if(selectedRefs.count() < 1) return false;

    for(qsizetype i = 0; i < selectedRefs.count(); ++i)
        if((selectedRefs[i]->getType() & (G_SEGMENT | G_ARC | G_CIRCLE)) == 0)
            return false;

    return true;
}

bool HeyGeoDocument::canMeasureRadius()
{
    if(selectedRefs.count() != 1) return false;

    if((selectedRefs[0]->getType() & (G_ARC | G_CIRCLE)) == 0)
        return false;

    return true;
}

bool HeyGeoDocument::canMeasureAngle()
{
    if(selectedRefs.count() == 1 &&
        selectedRefs[0]->getType() == G_ARC) return true;

    if(selectedRefs.count() != 3) return false;
    if((selectedRefs[0]->getType() & selectedRefs[1]->getType() &
         selectedRefs[2]->getType()) == G_POINT) return true;

    return false;
}

bool HeyGeoDocument::canMeasureRatio()
{
    if(selectedRefs.count() != 2) return false;

    if(selectedRefs[0]->getType() != G_SEGMENT) return false;
    if(selectedRefs[1]->getType() != G_SEGMENT) return false;

    return true;
}

bool HeyGeoDocument::canMeasureSlope()
{
    if(selectedRefs.count() != 1) return false;

    if(selectedRefs[0]->getType() & G_STRAIGHT) return true;

    return false;
}

bool HeyGeoDocument::canMeasureArea()
{
    if(selectedRefs.count() != 1) return false;

    if(selectedRefs[0]->getType() & G_FILLED) return true;

    return false;
}

bool HeyGeoDocument::canTransformChooseVector()
{
    if(selectedRefs.count() != 2) return false;

    if(selectedRefs[0]->getType() != G_POINT) return false;
    if(selectedRefs[1]->getType() != G_POINT) return false;

    return true;
}

bool HeyGeoDocument::canTransformChooseMirror()
{
    if(selectedRefs.count() != 1) return false;

    if(selectedRefs[0]->getType() & G_STRAIGHT) return true;

    return false;
}

bool HeyGeoDocument::canTransformChooseCenter()
{
    return (selectedRefs.count() == 1 && selectedRefs[0]->getType() == G_POINT);
}

bool HeyGeoDocument::canTransformChooseRatio()
{
    if(selectedRefs.count() == 1 && selectedRefs[0]->getType() & G_VALUE) return true;
    if(selectedRefs.count() != 2) return false;

    if(selectedRefs[0]->getType() != G_SEGMENT) return false;
    if(selectedRefs[1]->getType() != G_SEGMENT) return false;

    return true;
}

bool HeyGeoDocument::canTransformChooseAngle()
{
    if(selectedRefs.count() == 1 && selectedRefs[0]->getType() & G_VALUE) return true;
    if(selectedRefs.count() != 3) return false;
    if((selectedRefs[0]->getType() & selectedRefs[1]->getType() &
         selectedRefs[2]->getType()) == G_POINT) return true;

    return false;
}

bool HeyGeoDocument::canTransformClearChosen()
{
    return t_vector.count() + t_ratio.count() + t_center.count() +
               t_angle.count() + t_mirror.count() + t_distance.count() > 0;
}

bool HeyGeoDocument::canTransformChooseDistance()
{
    // Accept 2 points or 1 segment
    if(selectedRefs.count() == 2 &&
       selectedRefs[0]->getType() == G_POINT &&
       selectedRefs[1]->getType() == G_POINT) return true;
    if(selectedRefs.count() == 1 &&
       selectedRefs[0]->getType() == G_SEGMENT) return true;
    return false;
}

bool HeyGeoDocument::canTransformTranslate()
{
    // No longer requires a pre-marked vector; dialog provides Fixed modes.
    if(selectedRefs.count() == 0) return false;

    for(qsizetype i = 0; i < selectedRefs.count(); i++) {
        if(!(selectedRefs[i]->getType() & G_GEOMETRIC)) return false;
    }

    return true;
}

bool HeyGeoDocument::canTransformReflect()
{
    if(t_mirror.count() == 0) return false;
    if(selectedRefs.count() == 0) return false;

    for(qsizetype i = 0; i < selectedRefs.count(); i++) {
        if(!(selectedRefs[i]->getType() & G_GEOMETRIC)) return false;
    }

    return true;
}

bool HeyGeoDocument::canTransformScale()
{
    // Center still required; ratio can come from dialog.
    if(t_center.count() == 0) return false;
    if(selectedRefs.count() == 0) return false;

    for(qsizetype i = 0; i < selectedRefs.count(); i++) {
        if(!(selectedRefs[i]->getType() & G_GEOMETRIC)) return false;
    }

    return true;
}

bool HeyGeoDocument::canTransformRotate()
{
    // Center still required; angle can come from dialog.
    if(t_center.count() == 0) return false;
    if(selectedRefs.count() == 0) return false;

    for(qsizetype i = 0; i < selectedRefs.count(); i++) {
        if(!(selectedRefs[i]->getType() & G_GEOMETRIC)) return false;
    }

    return true;
}

bool HeyGeoDocument::canMeasureCalculate()
{
    if(selectedRefs.size() == 0) return true;
    if(selectedRefs.size() == 1 && selectedRefs[0]->getType() & G_VALUE) return true;
    return false;
}

bool HeyGeoDocument::canPlay(int which)
{
    return HeyGeoConstruction::getAllConstructions()[which]->doesMatch(selectedRefs);
}

// ── Graph menu can-conditions ─────────────────────────────────────────────────

// Coordinate system can always be created
bool HeyGeoDocument::canGraphNewCoordSys() { return true; }

// Define axes: exactly one G_COORDSYS selected
bool HeyGeoDocument::canGraphDefineAxes()
{
    if (selectedRefs.count() != 1) return false;
    return selectedRefs[0]->getType() == G_COORDSYS;
}

// Plot as (x,y): exactly 2 numeric values selected + at least one coord sys in doc
bool HeyGeoDocument::canGraphPlotAsXY()
{
    if (selectedRefs.count() != 2) return false;
    if (!(selectedRefs[0]->getType() & G_VALUE)) return false;
    if (!(selectedRefs[1]->getType() & G_VALUE)) return false;
    for (qsizetype i = 0; i < allRefs.count(); ++i)
        if (allRefs[i]->getType() == G_COORDSYS && !allRefs[i]->getDeleted()) return true;
    return false;
}

// Plot value on axis: exactly 1 numeric value selected + coord sys in doc
bool HeyGeoDocument::canGraphPlotValueOnAxis()
{
    if (selectedRefs.count() != 1) return false;
    if (!(selectedRefs[0]->getType() & G_VALUE)) return false;
    for (qsizetype i = 0; i < allRefs.count(); ++i)
        if (allRefs[i]->getType() == G_COORDSYS && !allRefs[i]->getDeleted()) return true;
    return false;
}

// New function: always possible
bool HeyGeoDocument::canGraphNewFunction() { return true; }

// Plot function: exactly 1 G_FUNCTION selected + coord sys in doc
bool HeyGeoDocument::canGraphPlotFunction()
{
    if (selectedRefs.count() != 1) return false;
    if (selectedRefs[0]->getType() != G_FUNCTION) return false;
    for (qsizetype i = 0; i < allRefs.count(); ++i)
        if (allRefs[i]->getType() == G_COORDSYS && !allRefs[i]->getDeleted()) return true;
    return false;
}

// Plot parametric curve: always possible (dialog creates everything)
bool HeyGeoDocument::canGraphPlotCurve() { return true; }

// Grid form: at least one coord sys in doc
bool HeyGeoDocument::canGraphGridForm()
{
    for (qsizetype i = 0; i < allRefs.count(); ++i)
        if (allRefs[i]->getType() == G_COORDSYS && !allRefs[i]->getDeleted()) return true;
    return false;
}

// Snap points: at least one coord sys in doc
bool HeyGeoDocument::canGraphSnapPoints()
{
    for (qsizetype i = 0; i < allRefs.count(); ++i)
        if (allRefs[i]->getType() == G_COORDSYS && !allRefs[i]->getDeleted()) return true;
    return false;
}

bool HeyGeoDocument::canMeasureCoordinates() {
    // Requires: at least one point selected AND a coordinate system in the document.
    if (selectedRefs.count() == 0) return false;
    for (qsizetype i = 0; i < selectedRefs.count(); i++) {
        if (selectedRefs[i]->getType() != G_POINT) return false;
    }
    // Check that a coordinate system exists in the document
    for (qsizetype i = 0; i < allRefs.count(); ++i)
        if (allRefs[i]->getType() == G_COORDSYS && !allRefs[i]->getDeleted()) return true;
    return false;
}

bool HeyGeoDocument::canMeasureAbscissa() {
    return canMeasureCoordinates();
}

bool HeyGeoDocument::canMeasureOrdinate() {
    return canMeasureCoordinates();
}

bool HeyGeoDocument::canMeasureCoordinateDistance() {
    return canMeasureCoordinates() && selectedRefs.count() == 2;
}

bool HeyGeoDocument::canMeasureEquation() {
    if (selectedRefs.count() == 0) return false;
    for (qsizetype i = 0; i < selectedRefs.count(); i++) {
        G_Type t = selectedRefs[i]->getType();
        if (t != G_LINE && t != G_CIRCLE) return false;
    }
    return true;
}

// ── Number menu ──────────────────────────────────────────────────────────────
bool HeyGeoDocument::canNumberNewParameter()
{
    return true;   // always available; needs no selection
}

bool HeyGeoConstruction::canConstructionMakeNormal()
{
    bool allNormal = true;

    for(size_t i = 0; i < selectedRefs.size(); ++i) {
        if(selectedRefs[i]->getNormal() == false) allNormal = false;

        if(canMakeNormal(selectedRefs[i]) == false) return false;
    }

    return !allNormal;
}

bool HeyGeoConstruction::canConstructionMakeGiven()
{
    bool allGiven = true;

    CanMakeGivenSearcher s;

    for(size_t i = 0; i < selectedRefs.size(); ++i) {
        if(selectedRefs[i]->getGiven() == false) allGiven = false;
        else continue;

        if(canMakeNormal(selectedRefs[i]) == false) return false;
        if(canMakeGiven(selectedRefs[i]) == false) return false;
        if(s.search(selectedRefs[i])) return false;
    }

    return !allGiven;
}

bool HeyGeoConstruction::canConstructionMakeFinal()
{
    bool allFinal = true;

    CanMakeFinalSearcher s;
    ImplicitInitialSearcher iis;

    for(size_t i = 0; i < selectedRefs.size(); ++i) {
        if(selectedRefs[i]->getFinal() == false) allFinal = false;
        else continue;

        if(canMakeNormal(selectedRefs[i]) == false) return false;
        if(canMakeFinal(selectedRefs[i]) == false) return false;
        if(s.search(selectedRefs[i])) return false;
        if(selectedRefs[i]->getParentsConst().size() != 0 &&
            iis.search(selectedRefs[i]->getParentsConst()) == false) return false;
    }

    return !allFinal;
}

bool HeyGeoConstruction::canConstructionMakeInitial()
{
    bool allInitial = true;

    CanMakeInitialAncSearcher s1;
    CanMakeInitialDesSearcher s2;

    for(size_t i = 0; i < selectedRefs.size(); ++i) {
        if(selectedRefs[i]->getInitial() == false) allInitial = false;
        else continue;

        if(canMakeNormal(selectedRefs[i]) == false) return false;
        if(canMakeInitial(selectedRefs[i]) == false) return false;
        if(s1.search(selectedRefs[i])) return false;
        if(s2.search(selectedRefs[i])) return false;

        ImplicitInitialSearcher iis(selectedRefs[i]);
        for(size_t j = 0; j < final.size(); ++j) {
            if(final[j] == selectedRefs[i]) continue;
            if(final[j]->getParentsConst().size() && iis.search(final[j]->getParentsConst()) == false)
                return false;
        }
    }

    return !allInitial;
}

bool HeyGeoConstruction::canConstructionRecurse()
{
    CanMakeInitialAncSearcher s1;
    NotInConstructionSearcher s2;

    for(size_t i = 0; i < selectedRefs.size(); ++i) {
        if(s1.search(selectedRefs[i]) == true) return false;
        if(selectedRefs[i]->getGiven() == false && s2.search(selectedRefs[i]) == false) return false;
    }

    return selectedRefs.size() > 0 && doesMatch(selectedRefs);
}
