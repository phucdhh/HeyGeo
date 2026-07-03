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


#ifndef HeyGeoRECURSIONDIALOG_H
#define HeyGeoRECURSIONDIALOG_H

#include "HeyGeoConstruction.H"
#include <qdialog.h>
#include <qpushbutton.h>
#include <qspinbox.h>
#include <qlabel.h>

#define MAXCONSTRUCTOBJECTS 1000000
#define WARNOBJECTS 50000

class HeyGeoRecursionDialog : public QDialog
{
  Q_OBJECT
public:

  static int getRecurseDepth(HeyGeoConstruction *c)
  {
    if(c->loops.size() == 0) return 0;
    HeyGeoRecursionDialog d(c);
    d.exec();
    return d.output;
  }

protected slots:
  void accept() { lastOutput = output = spinBox->value(); QDialog::accept(); }
  void reject() { output = -1; QDialog::reject(); }

  void spinboxChanged(int value);

protected:
  HeyGeoRecursionDialog(HeyGeoConstruction *construction);

  int getNumberOfObjects(int depth);

  HeyGeoConstruction *c;
  int output;

  QSpinBox *spinBox;
  QPushButton *ok, *cancel;
  QLabel *label;

  double objectsConstructedAtEachLevel;
  double finalObjects;
  double initialObjects;

  static int lastOutput;
};

#endif //HeyGeoRECURSIONDIALOG_H
