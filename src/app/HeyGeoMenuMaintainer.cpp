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

#include "HeyGeoMenuMaintainer.H"
#include "HeyGeoWindow.H"
#include "HeyGeoView.H"
#include <QMenu>

int HeyGeoCommandInfo::curId = 1;


HeyGeoMenuMaintainer::~HeyGeoMenuMaintainer()
{
  int i;
  
  for(i = 0; i < (int)subMaintainers.size(); ++i) {
    delete subMaintainers[i];
  }

  for(i = 0; i < (int)commands.size(); ++i) {
    delete commands[i];
  }

  if(myInfo != NULL) delete menu; //if we created our own menu.
  if(toolBar != NULL) { delete toolBar; }
}


void HeyGeoMenuMaintainer::add(HeyGeoMenuMaintainer *m)
{
  QAction *subAction = menu->addMenu(m->menu);
  if(subAction) subAction->setText(m->myInfo->menuText(window));
  m->myInfo->action = subAction;
  if(!m->updateOften()) QObject::connect(m->menu, SIGNAL(aboutToShow()), m, SLOT(update()));
  subMaintainers.push_back(m);
}
void HeyGeoMainMenuMaintainer::add(HeyGeoMenuMaintainer *m)
{
  QAction *subAction = menuBar->addMenu(m->menu);
  if(subAction) subAction->setText(m->myInfo->menuText(window));
  m->myInfo->action = subAction;
  if(!m->updateOften()) QObject::connect(m->menu, SIGNAL(aboutToShow()), m, SLOT(update()));
  subMaintainers.push_back(m);
}


void HeyGeoMenuMaintainer::add(HeyGeoCommandInfo *i)
{
    i->addTo(window, menu);
    if(toolBar != NULL) i->addTo(window, toolBar);
    commands.push_back(i);
}

void HeyGeoMenuMaintainer::update()
{
  int i;

  for(i = 0; i < (int)subMaintainers.size(); ++i) {
    if(subMaintainers[i]->updateOften()) subMaintainers[i]->update();
    HeyGeoCommandInfo *info = subMaintainers[i]->myInfo;
    if(info->action) {
      info->action->setEnabled(info->isEnabled(window));
      if(info->isChecked(window) != -1) info->action->setChecked(info->isChecked(window) == 1);
      QString txt = info->menuText(window);
      if(!txt.isNull() && txt != info->action->text()) info->action->setText(txt);
    }
  }

  for(i = 0; i < (int)commands.size(); ++i) {
    if(commands[i]->action) {
      commands[i]->action->setEnabled(commands[i]->isEnabled(window));
      if(commands[i]->isChecked(window) != -1)
        commands[i]->action->setChecked(commands[i]->isChecked(window) == 1);
      QString txt = commands[i]->menuText(window);
      if(txt != commands[i]->action->text()) commands[i]->action->setText(txt);
    }

    //tool button updates here
    if(toolBar == NULL) continue;
    QToolButton *tb = commands[i]->getToolButton();
    if(tb == NULL) continue;
    tb->setEnabled(commands[i]->isEnabled(window));
    tb->setCheckable(commands[i]->isChecked(window) != -1);
    tb->setChecked(commands[i]->isChecked(window) == 1);
    tb->setToolTip(commands[i]->menuText(window).remove('&'));
    tb->setIcon(commands[i]->iconSet(window));
  }
}
void HeyGeoMainMenuMaintainer::update()
{
  int i;

  for(i = 0; i < (int)subMaintainers.size(); ++i) {
    if(subMaintainers[i]->updateOften()) subMaintainers[i]->update();
    HeyGeoCommandInfo *info = subMaintainers[i]->myInfo;
    if(info->action) {
      info->action->setEnabled(info->isEnabled(window));
      if(info->isChecked(window) != -1) info->action->setChecked(info->isChecked(window) == 1);
      QString txt = info->menuText(window);
      if(!txt.isNull() && txt != info->action->text()) info->action->setText(txt);
    }
  }

  for(i = 0; i < (int)commands.size(); ++i) {
    if(commands[i]->action) {
      commands[i]->action->setEnabled(commands[i]->isEnabled(window));
      if(commands[i]->isChecked(window) != -1)
        commands[i]->action->setChecked(commands[i]->isChecked(window) == 1);
      QString txt = commands[i]->menuText(window);
      if(txt != commands[i]->action->text()) commands[i]->action->setText(txt);
    }

    //tool button updates here
    if(toolBar == NULL) continue;
    QToolButton *tb = commands[i]->getToolButton();
    if(tb == NULL) continue;
    tb->setEnabled(commands[i]->isEnabled(window));
    tb->setCheckable(commands[i]->isChecked(window) != -1);
    tb->setChecked(commands[i]->isChecked(window) == 1);
    tb->setToolTip(commands[i]->menuText(window).remove('&'));
    tb->setIcon(commands[i]->iconSet(window));
  }
}

bool HeyGeoCommandInfo::isEnabled(HeyGeoWindow *win) {
  if(win->getView()->getDrag() != HeyGeoView::NO_DRAG || win->getView()->getMenusEnabled() == false)
    return false;
  
  return privateIsEnabled(win);
}


