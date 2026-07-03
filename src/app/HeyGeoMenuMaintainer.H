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

#ifndef HeyGeoMENUMAINTAINER_H
#define HeyGeoMENUMAINTAINER_H

#include "defs.H"
#include <vector>
#include <iostream>

#include <qobject.h>
#include <QMenu>
#include <QToolBar>
#include <QToolButton>
#include <QMenuBar>
#include <QAction>
#include <QKeySequence>

class HeyGeoWindow;

//-------------------CommandInfo class

class HeyGeoCommandInfo //: public Qt
{
public:
  HeyGeoCommandInfo() { id = ++curId; toolButton = NULL; }
  virtual ~HeyGeoCommandInfo() {}

  virtual int getID() { return id; }

  bool isEnabled(HeyGeoWindow *win);
  virtual int isChecked(HeyGeoWindow * /*win*/) { return -1; } //uncheckable by default
  virtual QString menuText(HeyGeoWindow * /*win*/) { return QString(); }
  virtual QIcon iconSet(HeyGeoWindow * /*win*/) { return QIcon(); }
  virtual QObject *receiver(HeyGeoWindow * /*win*/) { return NULL; }
  virtual const char *member() { return NULL; }
  virtual QKeySequence shortCutKey() { return {}; } // no shortcut by default
  
  virtual void addTo(HeyGeoWindow *win, QMenu *menu)
  {
    action = menu->addAction(menuText(win));
    if(action) {
      if(!shortCutKey().isEmpty()) action->setShortcut(shortCutKey());
      if(receiver(win) && member())
        QObject::connect(action, SIGNAL(triggered()), receiver(win), member());
      action->setCheckable(isChecked(win) != -1);
    }
  }

  virtual void addTo(HeyGeoWindow *win, QToolBar *toolBar)
  {
    QIcon is = iconSet(win);
    if(is.isNull()) { toolButton = nullptr; return; }
    toolButton = new QToolButton(toolBar);
    toolButton->setIcon(is);
    toolButton->setToolTip(menuText(win).remove('&'));
    if(receiver(win) && member())
      QObject::connect(toolButton, SIGNAL(clicked()), receiver(win), member());
    toolButton->setCheckable(isChecked(win) != -1);
    toolBar->addWidget(toolButton);
  }

  virtual QToolButton *getToolButton() { return toolButton; }

  static void resetID() { curId = 1; }

protected:
  virtual bool privateIsEnabled(HeyGeoWindow * /*win*/) { return true; }

  int id;
  QToolButton *toolButton = nullptr;

public:
  QAction *action = nullptr;

private:
  static int curId;
};


//--------------------MenuMaintainer class


class HeyGeoMenuMaintainer : public QObject
{
  Q_OBJECT
public:
  HeyGeoMenuMaintainer(HeyGeoWindow *win) : window(win), toolBar(NULL) { }
  virtual ~HeyGeoMenuMaintainer();

public slots:
  virtual void update();

protected:
  virtual void add(HeyGeoMenuMaintainer *m);
  virtual void add(HeyGeoCommandInfo *i);

public:
  virtual bool updateOften() { return true; }
protected:
  virtual void addSep() { menu->addSeparator(); if(toolBar != NULL) toolBar->addSeparator(); }
  void addNonToolbarSep() { menu->addSeparator(); }

public:
  QMenu *menu;
  HeyGeoCommandInfo *myInfo;
  HeyGeoWindow *window;
  QToolBar *toolBar;
  vector<HeyGeoMenuMaintainer *> subMaintainers;
  vector<HeyGeoCommandInfo *> commands;

  virtual void privateToolbarVisibilityChanged(bool /*visible*/) {}

protected slots:
  virtual void toolbarVisibilityChanged(bool visible) { privateToolbarVisibilityChanged(visible); }

};


//---------------------MainMenuMaintainer

class HeyGeoMainMenuMaintainer : public HeyGeoMenuMaintainer
{
  Q_OBJECT
public:
  HeyGeoMainMenuMaintainer(HeyGeoWindow *win);
public slots:
  virtual void update();
protected:
  virtual void addSep() { menuBar->addSeparator(); if(toolBar != NULL) toolBar->addSeparator(); }
  QMenuBar* menuBar;
  virtual void add(HeyGeoMenuMaintainer *m);
};


#endif //HeyGeoMENUMAINTAINER_H

