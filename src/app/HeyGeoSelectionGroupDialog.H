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

#ifndef HeyGeoSELECTIONGROUPDIALOG_H
#define HeyGeoSELECTIONGROUPDIALOG_H

#include <qstring.h>
#include <qdialog.h>
#include <qlabel.h>
#include <qapplication.h>
#include <qlayout.h>
#include <qlistwidget.h>
#include <qcheckbox.h>
#include <qpushbutton.h>
#include <QMouseEvent>
#include <QShowEvent>
#include <QEvent>
#include <vector>
#include "defs.H"

class HeyGeoSelectionGroup;
class HeyGeoView;
class HeyGeoDocument;

class HeyGeoSelectionGroupDialog : public QDialog
{
    Q_OBJECT

public:
    HeyGeoSelectionGroupDialog(HeyGeoView *view, vector<HeyGeoSelectionGroup *> &inGroups, HeyGeoDocument *inDoc);

protected:
    void showEvent(QShowEvent *);

    bool shiftDown;
    bool eventFilter(QObject *, QEvent *ev) {
        if(ev->type() == QEvent::MouseButtonPress)
            shiftDown = ((QMouseEvent *)ev)->modifiers() & Qt::ShiftModifier;
        return false;
    }

private slots:
    void select();
    void deselect();
    void deleteGroup();
    void newGroup();
    void updateButtons();

private:
    bool justMade;

    int numFixedGroups;

    QListWidget *groupLBox;
    QPushButton *selectBut, *deselectBut, *deleteBut, *newBut, *closeBut;
    QCheckBox *affectInvisible;

    HeyGeoDocument *doc;
    vector<HeyGeoSelectionGroup *> &groups;
};

#endif //HeyGeoSELECTIONGROUPDIALOG_H
