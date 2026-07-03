/*
 *  HeyGeo/formula
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

#include "MatrixDialog.H"
#include <qpushbutton.h>
#include <qspinbox.h>
#include <qlabel.h>
#include <qcheckbox.h>
#include <qlayout.h>
//Added by qt3to4:
#include <QGridLayout>

#define DEFAULT_SIZE 3
#define MAX_SIZE     20

//dialog constructor--make separate file!
MatrixDialog::MatrixDialog(QWidget *parent)
  : QDialog(parent)
{
  w = h = DEFAULT_SIZE;

  zeroFill = false;

  setWindowTitle("Matrix Dialog");
  setModal(true);

  QPushButton *ok, *cancel;
  QLabel *rows, *columns;

  QGridLayout *grid = new QGridLayout(this);
  grid->setSpacing(10);

  rows = new QLabel(tr("Rows:"), this);
  columns = new QLabel(tr("Columns:"), this);

  grid->addWidget(rows, 0, 0);
  grid->addWidget(columns, 0, 1);

  QSpinBox *width, *height;

  height = new QSpinBox(this);
  height->setMinimum(1);
  height->setMaximum(MAX_SIZE);
  height->setSingleStep(1);
  height->setValue(DEFAULT_SIZE);
  grid->addWidget(height, 1, 0);
  connect(height, &QSpinBox::valueChanged, this, &MatrixDialog::setHeight);

  width = new QSpinBox(this);
  width->setMinimum(1);
  width->setMaximum(MAX_SIZE);
  width->setSingleStep(1);
  width->setValue(DEFAULT_SIZE);
  grid->addWidget(width, 1, 1);
  connect(width, &QSpinBox::valueChanged, this, &MatrixDialog::setWidth);

  QCheckBox *fill = new QCheckBox(tr("Zero-Fill"), this);
  grid->addWidget(fill, 2, 0, 1, 2);
  connect(fill, SIGNAL(toggled(bool)), SLOT(setFill(bool)));

  ok = new QPushButton(tr("OK"), this);
  ok->setDefault(true);
  grid->addWidget(ok, 3, 0);
  connect(ok, SIGNAL(clicked()), SLOT(accept()));
  
  cancel = new QPushButton(tr("Cancel"), this);
  grid->addWidget(cancel, 3, 1);
  connect(cancel, SIGNAL(clicked()), SLOT(reject()));

  height->setFocus();
}

void MatrixDialog::setHeight(int value)
{
  h = value;
}

void MatrixDialog::setWidth(int value)
{
  w = value;
}

void MatrixDialog::setFill(bool value)
{
  zeroFill = value;
}

