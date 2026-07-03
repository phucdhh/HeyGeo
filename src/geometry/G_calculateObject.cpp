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
#include <cmath>

#include "G_object.H"
#include "G_undo.H"
#include "HeyGeoDocument.H"


class CalculationReferenceFetcher : public ReferenceFetcher
{
public:
  CalculationReferenceFetcher(G_ref *inRef) { ref = inRef; }

  double getValue(int reference_number) override
  { return ref->getParents()[reference_number]->getObject()->getDisplayNumValue(); }

  KFormula *getFormula(int reference_number) override
  { return ((G_valueObject *)(ref->getParents()[reference_number]->getObject()))->getLhs(); }

  UnitType getUnitType(int reference_number) const override
  {
    G_ref *p = ref->getParents()[reference_number];
    if (p->getType() & G_MEASURE) {
      int dt = p->getDescendType();
      if (dt == G_DISTANCE_MEASURE || dt == G_LENGTH_MEASURE || dt == G_RADIUS_MEASURE)
        return UnitType::length();
      if (dt == G_ANGLE_MEASURE)
        return UnitType::angle();
      if (dt == G_AREA_MEASURE)
        return UnitType::area();
      return UnitType::dimensionless();
    }
    // For calculation results, derive unit from that formula's dimensional analysis.
    if (p->getType() & G_CALCULATE)
      return static_cast<G_valueObject *>(p->getObject())->getLhs()->evaluateUnit();
    return UnitType::dimensionless();
  }

protected:
  G_ref * ref;
};


G_calculateObject::G_calculateObject(G_ref *inWhere)
  :G_valueObject(inWhere, true)
{
  lhs.setReferenceFetcher(std::make_unique<CalculationReferenceFetcher>(where));
}


void G_calculateObject::changeFormula(const G_refs& newParents, const QString &newFormulaString)
{
  if(where->getParents() == newParents && newFormulaString == formulaString) return;

  where->getDocument()->addUndo(new G_undoChangeCalculation(where));

  where->reconstrain(G_REGULAR_CALCULATE, newParents);
  formulaString = newFormulaString;

  dirtylhs = true;

  update();
}


// Returns the expanded formula string as a plain-text LHS label.
// e.g. for formula "MG/MR" → "(MG)/(MR)" using parent menu labels.
QString G_calculateObject::getMenuLabel() const
{
  const QString ugly = KFormula::toUgly(formulaString);
  const G_refs &pars = where->getParents();
  QString result;
  for (QChar ch : ugly) {
    int code = ch.unicode();
    if (IS_REFERENCE(code)) {
      int idx = code - REFERENCE_ABOVE;
      if (idx >= 0 && idx < (int)pars.count() && pars[idx]) {
        auto *pvo = dynamic_cast<G_valueObject *>(pars[idx]->getObject());
        if (pvo) {
          result += pvo->getMenuLabel();
        } else {
          result += KFormula::toUgly(pars[idx]->getLabel().getText());
        }
      }
    } else {
      result += ch;
    }
  }
  if (result.isEmpty())
    result = KFormula::toUgly(where->getLabel().getText());
  return result;
}

void G_calculateObject::update()
{
  G_valueObject::update();  // computes value, formats text (no unit yet)

  if (fabs(value) >= BIG) return;  // undefined – no unit suffix

  // Build a human-readable expanded formula using parent menu labels (reliable).
  const QString expandedLhs = getMenuLabel();

  // Determine the result unit via full dimensional analysis of the formula tree:
  // e.g. AD/AB → (cm)/(cm) = dimensionless; AD+AB → cm; AD*AB → cm².
  UnitType ut = lhs.evaluateUnit();

  QString unitSuffix;
  if (ut.L == 1 && ut.A == 0) unitSuffix = QStringLiteral(" cm");
  else if (ut.L == 2 && ut.A == 0) unitSuffix = QStringLiteral(" cm\u00B2");
  else if (ut.L == 0 && ut.A == 1) unitSuffix = QStringLiteral("\u00B0");

  // Set displayText for Values menu, regardless of whether there's a unit.
  QString valStr = QString::number(value, 'f', 2);
  displayText = expandedLhs + QStringLiteral(" = ") + valStr + unitSuffix;

  if (unitSuffix.isEmpty()) return;

  // Re-parse the rendered formula 'text' with unit suffix for on-canvas display.
  QString tmp = QChar(int(REFERENCE_NUM(0))) + QStringLiteral(" = ") + valStr + unitSuffix;
  // LhsReferenceFetcher was already set on 'text' by G_valueObject::update().
  text.parse(tmp);
}

void G_calculateObject::calculate()
{
  //first check to make sure its parents are defined
  for(int i = 0; i < (int)where->getParents().count(); ++i) {
    if(fabs(parent(i)->getNumValue()) >= BIG) {
      value = BIG * 10;
      return;
    }
  }

  lhs.setReferenceFetcher(std::make_unique<CalculationReferenceFetcher>(where));

  // Unit keywords: "cm"=1, "in"=2.54 cm/in, "px"=1px in cm, "deg"=1, "rad"=180/π
  QHash<QString, double> unitVars;
  unitVars["cm"]  = 1.0;
  unitVars["in"]  = 2.54;
  unitVars["px"]  = G_cmPerPixel();
  unitVars["deg"] = 1.0;
  unitVars["rad"] = 180.0 / M_PI;

  std::optional<int> errorOpt;
  value = lhs.evaluate(unitVars, &errorOpt);
  if (errorOpt.value_or(0) != 0) value = BIG * 10;
}

void G_calculateObject::convertFormulaStringOnLoad()
{
  int i;
  
  for(i = 0; i < (int)formulaString.length(); ++i) {
    if(formulaString[i].unicode() > OLD_UNUSED_OFFSET && formulaString[i].unicode() < OLD_UNUSED_OFFSET + 300)
      formulaString[i] = QChar(formulaString[i].unicode() + (UNUSED_OFFSET - OLD_UNUSED_OFFSET));
  }
}

QString G_calculateObject::convertFormulaStringOnSave(QString tmp) const
{
  for(int i = 0; i < (int)tmp.length(); ++i)
    if(tmp[i].unicode() > UNUSED_OFFSET &&
       tmp[i].unicode() < UNUSED_OFFSET + 300)
      tmp[i] = QChar((int)(tmp[i].unicode()) +
		     (OLD_UNUSED_OFFSET - UNUSED_OFFSET));

  return tmp;
}
