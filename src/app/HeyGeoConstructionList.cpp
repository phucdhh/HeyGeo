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

#include <QApplication>
#include <QCursor>
#include <QPainter>
#include <memory>
#include <QPaintEvent>
#include <QResizeEvent>
#include <QPixmap>
#include <QMouseEvent>
#include <QEvent>
#include "HeyGeoView.H"
#include "HeyGeoConstructionList.H"
#include "G_ref.H"

bool HeyGeoConstructionList::redrawsEnabled = true;
NotInConstructionSearcher HeyGeoConstructionList::nicSearcher;
ImplicitFinalSearcher HeyGeoConstructionList::ifSearcher;
ImplicitInitialSearcher HeyGeoConstructionList::iiSearcher;

HeyGeoConstructionList::HeyGeoConstructionList(HeyGeoDocument *inDoc, QWidget *parent)
  : QFrame(parent), doc(inDoc), current(0), hoffset(0), lastSel(NULL)
{
  connect(doc, SIGNAL(documentChanged()), this, SLOT(redrawBuffer()));
  vBar = new QScrollBar(Qt::Vertical, this);
  vBar->setMaximum(0);
  connect(vBar, SIGNAL(valueChanged(int)), this, SLOT(curItemChanged(int)));
  hBar = new QScrollBar(Qt::Horizontal, this);
  hBar->setMaximum(0);
  connect(hBar, SIGNAL(valueChanged(int)), this, SLOT(hoffsetChanged(int)));
  buffer = QPixmap(width(), height());

  connect(&scrollTimer, SIGNAL(timeout()), this, SLOT(autoScroll()));
}


void HeyGeoConstructionList::resizeEvent(QResizeEvent *)
{
  hBar->move(0, height() - HeyGeoView::ScrollBarThickness);
  hBar->resize(width() - HeyGeoView::ScrollBarThickness,
	       HeyGeoView::ScrollBarThickness);
  vBar->move(width() - HeyGeoView::ScrollBarThickness, 0);
  vBar->resize(HeyGeoView::ScrollBarThickness, height());
  buffer = QPixmap(width(), height());
  redrawBuffer();
}


void HeyGeoConstructionList::redrawBuffer()
{
  int i;

  if(!redrawsEnabled) return;

  buffer.fill();
  QPainter p(&buffer);

  if(doc->allRefs.size() == 0) {
    current = 0;
    vBar->blockSignals(true);
    vBar->setMaximum(0);
    vBar->blockSignals(false);
    hBar->setMaximum(0);
    repaint();
    return;
  }

  vBar->blockSignals(true);
  vBar->setMaximum(doc->allRefs.size() - 1);
  vBar->blockSignals(false);

  selectionChanged();

  if(current >= int(doc->allRefs.size())) current = doc->allRefs.size() - 1;

  vBar->blockSignals(true);
  vBar->setValue(current);
  vBar->blockSignals(false);

  int curCoord = 0;

  QPixmap pix(1,1);
  QPainter pixp(&pix);

  itemYCoords.clear();

  int maxwidth = 0;

  auto l_owner = std::make_unique<ListReferenceFetcher>();
  ListReferenceFetcher *l = l_owner.get();
  KFormula form;
  form.setReferenceFetcher(std::move(l_owner));

  nicSearcher.reInit();
  ifSearcher.reInit();
  iiSearcher.reInit();

  for(i = current; i < int(doc->allRefs.size()); ++i) {
    KFormula *f = &form;
    nameObject(doc->allRefs[i], form, *l, i);

    f->redraw(pixp);

    int fsize = f->size().height();
    int hsize = f->size().width();
    if(hsize > maxwidth) maxwidth = hsize;

    if(doc->allRefs[i]->getSelected()) {
      p.fillRect(0, curCoord, width(), fsize, QBrush(Qt::blue));
      p.drawRect(0, curCoord, width(), fsize);
    }

    f->setPos((hsize + 1) / 2 - hoffset, (fsize + 1) / 2 + curCoord);
    f->redraw(p);

    curCoord += fsize;
    if(curCoord > height() - HeyGeoView::ScrollBarThickness) break;
    itemYCoords.push_back(curCoord);
  }

  nicSearcher.reInit();
  ifSearcher.reInit();
  iiSearcher.reInit();

  hBar->setPageStep(width() - HeyGeoView::ScrollBarThickness);
  if(maxwidth >= hBar->value() + width() - HeyGeoView::ScrollBarThickness) {
    if(maxwidth > width() - HeyGeoView::ScrollBarThickness) {
      hBar->setMaximum(maxwidth - width() + HeyGeoView::ScrollBarThickness);
    }
  }
  else {
    hBar->setMaximum(qMax(0, hBar->value()));
  }

  repaint();
}


void HeyGeoConstructionList::selectionChanged()
{
  if(scrollTimer.isActive()) return; //don't do this when scrolling.
  if(doc->selectedRefs.size() == 0) { lastSel = NULL; return; }
  int sel = doc->allRefs.find(doc->selectedRefs.back());

  if(doc->allRefs[sel] == lastSel) return;
  lastSel = doc->allRefs[sel];

  if(sel >= current && sel <= current + (int)itemYCoords.size()) return;
  current = sel;
}

void HeyGeoConstructionList::paintEvent(QPaintEvent *)
{
  QPainter p(this);
  p.drawPixmap(0, 0, buffer);
}


void HeyGeoConstructionList::curItemChanged(int newCurrent)
{
  current = newCurrent;
  redrawBuffer();
}


void HeyGeoConstructionList::hoffsetChanged(int newHoffset)
{
  hoffset = newHoffset;
  redrawBuffer();
}


void HeyGeoConstructionList::mouseReleaseEvent(QMouseEvent *)
{
  scrollTimer.stop();
}


void HeyGeoConstructionList::mousePressEvent(QMouseEvent *ev)
{
  if(doc->allRefs.size() == 0) return;
  if(ev->button() != Qt::LeftButton) return;

  if((ev->modifiers() & Qt::ShiftModifier) == 0) doc->clearSel();
  int which = getItemFromYCoord((int)ev->position().y());
  if(which >= 0) {
    if(doc->allRefs[which]->getSelected()) {
      doc->delSel(doc->allRefs[which]);
    }
    else {
      doc->addSel(doc->allRefs[which]);
    }
  }

  if((int)ev->position().y() > itemYCoords.back()) dragStart = doc->allRefs.size() - 1;
  else dragStart = which;

  selectedAtDragStart = doc->getSelected();

  doc->emitDocumentChanged();
}


void HeyGeoConstructionList::mouseMoveEvent(QMouseEvent *ev)
{
  if((ev->buttons() & Qt::LeftButton) == 0) return;

  if(scrollTimer.isActive() == false) scrollTimer.start(10);

  int which = getItemFromYCoord((int)ev->position().y());
  if((int)ev->position().y() < 0 && current > 0) { which = --current; }
  if((int)ev->position().y() > itemYCoords.back() && current + itemYCoords.size() < doc->allRefs.size()) {
    which = current + itemYCoords.size();
    current++;
  }
  else if((int)ev->position().y() > itemYCoords.back() && doc->allRefs.size() > 0) {
    which = doc->allRefs.size() - 1;
  }
  if(which == -1) return;
  int dir = which > dragStart ? 1 : -1;
  int i;

  G_refs sel = doc->getSelected();

  for(i = 0; i < (int)(sel.size()); i++) {
    if(selectedAtDragStart.find(sel[i]) == -1) doc->delSel(sel[i]);
  }

  for(i = dragStart; i * dir <= which * dir; i += dir) {
    if(selectedAtDragStart.find(doc->allRefs[i]) == -1) doc->addSel(doc->allRefs[i]);    
  }

  doc->emitDocumentChanged();

}

void HeyGeoConstructionList::autoScroll()
{
  QApplication::postEvent(this, new QMouseEvent(QEvent::MouseMove,
						mapFromGlobal(QCursor::pos()),
						QCursor::pos(),
						Qt::LeftButton, Qt::LeftButton, Qt::NoModifier));
}


