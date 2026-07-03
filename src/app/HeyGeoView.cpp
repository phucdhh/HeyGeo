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


#include <QScrollBar>
#include <QApplication>
#include <QCursor>
#include <QMenu>
#include <QBitmap>
#include <QDateTime>
#include <QElapsedTimer>
#include <QPixmap>
#include <QResizeEvent>
#include <QMouseEvent>
#include <QPaintEvent>
#include <QKeyEvent>
#include <QMessageBox>
#include <QPainter>
#include <cmath>
#include <unordered_map>
#include "HeyGeoView.H"
#include "G_point.H"
#include "G_line.H"
#include "G_segment.H"
#include "G_drawstyle.H"
#include "G_label.H"
#include "HeyGeoDocument.H"
#include "HeyGeoConstruction.H"
#include "HeyGeoCalculateEditor.H"
#include "HeyGeoGraphDialogs.H"
#include "G_object.H"
#include "HeyGeoConstructionList.H"
#include "G_refSearcher.H"
#include "HeyGeoProperties.H"
#include "G_ref.H"
#include "formula/kformula.H"
#include <QTextEdit>
#include <QSpinBox>
#include <QPushButton>
#include <QColorDialog>
#include <QLabel>
#include <QHBoxLayout>
#include "pics/zoom_cursor.xpm"
#include "latex.h"
#include "platform/qt/graphic_qt.h"
#include <QPainterPath>

// ─────────────────────────────────────────────────────────────────────────────
//  Text Tool: build custom hand cursors (GSP-sized ~20×20)
// (Custom text tool hand cursors removed — Qt::PointingHandCursor used instead,
//  matching the Selection Tool drag hand for consistency.)\n

//the following class and the function after are for determining if A can be
//reconstrained to B.

class ATypeFinder : public G_refSearcher
{
public:
  enum AType {
    Normal,
    Given,
    Initial,
    Final
  };

  ATypeFinder(G_ref *inB) { B = inB; type = Normal; }

  bool is_found(const G_ref *ref)
  {
    if(ref == B) return true;
    if(ref->getGiven()) type = Given;
    if(ref->getInitial() && type != Given) type = Initial;
    if(ref->getFinal() && type == Normal) type = Final;
    return false;
  }

  G_refs search_next(const G_ref *ref) { return ref->getChildrenConst(); }

  AType type;
  G_ref *B;
};

//----------------------------------------------------------------------------------


bool canReconstrain(G_ref *A, G_ref *B)
{
  if((B->getType() & (G_POINT | G_CURVE | G_FUNCTIONPLOT | G_PARAMCURVE)) == 0) return false;

  if(B->getDocument()->isConstruction() && B->getType() == G_POINT && A->getGiven() &&
     ((HeyGeoConstruction *)(B->getDocument()))->hasLoops()) return false;

  ATypeFinder atf(B);
  if(atf.search(A) == true) return false;

  if(atf.type == ATypeFinder::Normal || B->getDocument()->isConstruction() == false) return true;  

  HeyGeoConstruction *c = (HeyGeoConstruction *)(B->getDocument());

  ImplicitInitialSearcher iis(A);
  if(iis.search(B) == false) {
    int j;
    for(j = 0; j < (int)c->getFinal().size(); ++j) {
      if(c->getFinal()[j]->getParentsConst().size() && iis.search(c->getFinal()[j]->getParentsConst()) == false)
	return false;
    }

  }


  if(atf.type == ATypeFinder::Given) {
    CanMakeGivenSearcher cmgs;
    if(cmgs.search(B) == true) return false;
  }

  if(atf.type == ATypeFinder::Initial) {
    CanMakeInitialAncSearcher cmias;
    if(cmias.search(B) == true) return false;
  }

  return true;
}

//----------------------------------------------------------------------------------
//----------------------------------------------------------------------------------


HeyGeoView::SelectType HeyGeoView::selectType;
QList<HeyGeoView*> HeyGeoView::allViews;
QPainter *HeyGeoView::constructionPainter;
ViewTransform HeyGeoView::constructionTransform;

int HeyGeoView::ScrollBarThickness = 20;

HeyGeoView::HeyGeoView(HeyGeoDocument *inDoc, QWidget *parent)
  : QWidget(parent)
{
  allViews.append(this);

  menusEnabled = true;
  nextZoom = false;
  nextPan = false;

  doc = inDoc;

  doc->addView();
  docReferenceRemoved = false;

  connect(doc, &HeyGeoDocument::documentChanged, this, &HeyGeoView::redrawBuffer);
  connect(doc, &HeyGeoDocument::documentModified, this, &HeyGeoView::documentModified);
  connect(doc, &HeyGeoDocument::documentSaved, this, &HeyGeoView::documentSaved);

  setMinimumSize(ScrollBarThickness * 4, ScrollBarThickness * 4);
  {
    qreal dpr = devicePixelRatio();
    buffer = QPixmap(qRound(width() * dpr), qRound(height() * dpr));
    buffer.setDevicePixelRatio(dpr);
  }

  //buffer.setOptimization(QPixmap::BestOptim);

  forcePaint = true;

  if(HeyGeoProperties::getProperty("SelectType").toLower() == "borderselect")
      selectType = BORDER_SELECT;
  else if(HeyGeoProperties::getProperty("SelectType").toLower() == "blinkingselect")
      selectType = BLINKING_SELECT;

  hBar = new QScrollBar(Qt::Horizontal, this);
  vBar = new QScrollBar(Qt::Vertical, this);

  if(ScrollBarThickness == 20) ScrollBarThickness = hBar->sizeHint().height();

  setMouseTracking(true);
  setFocusPolicy(Qt::ClickFocus);  // allow keyPressEvent (Delete, Escape)

  drag = NO_DRAG;
  pressedRef = nullptr;
  pressedRefWasSelected = false;

  offsetX = offsetY = 0;
  zoom = 1;

  // Tool mode initialisation
  currentTool = SELECTION_TOOL;
  toolMouseX = toolMouseY = 0;
  toolRubberbandActive = false;
  toolHoveredIsIntersection = false;

  // Text Tool state
  textHoveredRef       = nullptr;
  textLabelHoveredRef  = nullptr;
  textLastClickedRef   = nullptr;
  textEditWidget       = nullptr;
  textEditCommitting   = false;
  textEditAnnotationIndex = -1;
  textAnnotationSelected     = -1;
  textAnnotationDragWorldX    = 0;
  textAnnotationDragWorldY    = 0;
  textAnnotationResizeCorner  = -1;
  textAnnotationResizeAnchorX = 0;
  textAnnotationResizeAnchorY = 0;

  connect(hBar, &QScrollBar::valueChanged, this, &HeyGeoView::moved);
  connect(vBar, &QScrollBar::valueChanged, this, &HeyGeoView::moved);

  setAutoFillBackground(false);

  connect(&selectTimer, SIGNAL(timeout()), this, SLOT(selectTimeout()));
}

//document deletion works like this: if we're not deleting the last
//view (there are other views pointing to the document), we call
//delView in delDocumentRef (to decrease the reference count) and set
//docReferenceRemoved to mark that the reference count of the document
//has been decreased.  Otherwise, we only delete the document when it
//comes time to destroy the view.
HeyGeoView::~HeyGeoView()
{
  if(!docReferenceRemoved) doc->delView();
  allViews.removeOne(this);
}

void HeyGeoView::delDocumentRef()
{
  if(doc->getNumViews() > 1) {
    doc->delView();
    docReferenceRemoved = true;
  }
}

static bool inMoved = false; //recursion prevention
void HeyGeoView::moved(int)
{
  if(inMoved) return;
  inMoved = true;

  offsetX -= ((double)hBar->value()) / zoom;
  offsetY -= ((double)vBar->value()) / zoom;

  redrawBuffer();
  inMoved = false;
}

void HeyGeoView::resizeEvent(QResizeEvent *e)
{
  hBar->move(0, height() - ScrollBarThickness);
  hBar->resize(width() - ScrollBarThickness, ScrollBarThickness);
  vBar->move(width() - ScrollBarThickness, 0);
  vBar->resize(ScrollBarThickness, height());

  {
    qreal dpr = devicePixelRatio();
    QSize sz = (e->size() - QSize(ScrollBarThickness, ScrollBarThickness)) * dpr;
    buffer = QPixmap(sz);
    buffer.setDevicePixelRatio(dpr);
  }

  redrawBuffer();
}

void HeyGeoView::redrawBuffer()
{
  QPainter p;

  if(drag == NO_DRAG || (drag != LABEL_DRAG && drag != TEXT_DRAG && objectsUpdating.count() == 0)) {
    if(drag != ZOOM_DRAG && drag != PAN_DRAG && !inMoved) emit updateMenus();
  }

  if(selectType == BLINKING_SELECT) {
    if(doc->getSelected().count() > 0) {
      if(!selectTimer.isActive()) selectTimer.start(319);
    }
    else {
      if(selectTimer.isActive()) selectTimer.stop();
    }
  }
  else if(selectTimer.isActive()) selectTimer.stop();

  buffer.fill(QColor(HeyGeoProperties::getProperty("BackgroundColor")));

  p.begin(&buffer);
  p.setRenderHint(QPainter::Antialiasing, true);
  p.setRenderHint(QPainter::SmoothPixmapTransform, true);

  doc->draw(p, ViewTransform(offsetX, offsetY, zoom));

  p.end();

  if(forcePaint) repaint();
}

void HeyGeoView::paintEvent(QPaintEvent *)
{
  if(doc == NULL) return;

  if(drag == RECTANGLE_DRAG) {
      QPainter p(this);
      p.drawPixmap(0, 0, buffer);
      // Draw selection rectangle
      p.setPen(Qt::DashLine);
      p.drawRect(QRect(dragStartX, dragStartY, dragCurX - dragStartX, dragCurY - dragStartY).normalized());
      // Also draw text annotations so they stay visible during selection drag
      for(int annI = 0; annI < textAnnotations.size(); ++annI) {
          const TextAnnotation &ann = textAnnotations[annI];
          int sx = qRound(zoom * (ann.worldX + offsetX));
          int sy = qRound(zoom * (ann.worldY + offsetY));
          int sw = qRound(zoom * ann.worldW);
          int sh = qRound(zoom * ann.worldH);
          if(sw < 4 || sh < 4) continue;
          if (!ann.cachedPixmap.isNull()) {
              p.save();
              p.setClipRect(QRect(sx, sy, sw, sh));
              p.drawPixmap(sx, sy, ann.cachedPixmap);
              p.restore();
          }
          p.setPen(QPen(QColor(150, 150, 180, 100), 1, Qt::DotLine));
          p.setBrush(Qt::NoBrush);
          p.drawRect(QRect(sx, sy, sw, sh));
      }
  } else {
      QRect tmp = doc->getSize(ViewTransform(offsetX, offsetY, zoom));
      if(tmp.isEmpty() || tmp.isNull()) tmp = QRect(1, 1, 2, 2);

      hBar->setRange(qMin(0, tmp.left()), qMax(0, tmp.right() - width() + ScrollBarThickness));
      hBar->setPageStep(width() - ScrollBarThickness);
      hBar->setValue(0);

      vBar->setRange(qMin(0, tmp.top()), qMax(0, tmp.bottom() - height() + ScrollBarThickness));
      vBar->setPageStep(height() - ScrollBarThickness);
      vBar->setValue(0);

      QPainter p(this);
      p.drawPixmap(0, 0, buffer); // Thay thế bitBlt

      // Draw tool rubber-band preview on top of the buffer
      drawToolRubberband(p);
      // GSP-style hover highlight (red glow on snap targets during construction)
      drawToolHoverHighlight(p);

      // ── Draw committed text annotations ──────────────────────────────────
      for(int annI = 0; annI < textAnnotations.size(); ++annI) {
          const TextAnnotation &ann = textAnnotations[annI];
          int sx = qRound(zoom * (ann.worldX + offsetX));
          int sy = qRound(zoom * (ann.worldY + offsetY));
          int sw = qRound(zoom * ann.worldW);
          int sh = qRound(zoom * ann.worldH);
          if(sw < 4 || sh < 4) continue;

          // Draw background fill (no border stroke — border comes from outer selection rect)
          if(annI == textAnnotationSelected && !textEditWidget) {
              p.setPen(Qt::NoPen);
              p.setBrush(QColor(230, 240, 255, 80));
              p.drawRoundedRect(QRect(sx, sy, sw, sh), 3, 3);
          }

          // Draw from pre-rendered cache — zero KFormula cost per frame
          if (!ann.cachedPixmap.isNull()) {
              p.save();
              p.setClipRect(QRect(sx, sy, sw, sh));
              p.drawPixmap(sx, sy, ann.cachedPixmap);
              p.restore();
          }

          // Selection handles and border — only when SELECTION_TOOL is active
          // (never show the selection frame while a text-edit widget is open).
          if(annI == textAnnotationSelected && !textEditWidget) {
              p.setPen(QPen(QColor(50, 120, 220), 2, Qt::SolidLine));
              p.setBrush(Qt::NoBrush);
              p.drawRect(QRect(sx - 3, sy - 3, sw + 6, sh + 6));

              // Corner drag handles
              p.setBrush(QColor(50, 120, 220));
              p.setPen(Qt::NoPen);
              const int hs = 5;
              for(QPoint corner : {QPoint(sx-3, sy-3), QPoint(sx+sw+3-hs, sy-3),
                                   QPoint(sx-3, sy+sh+3-hs), QPoint(sx+sw+3-hs, sy+sh+3-hs)}) {
                  p.drawRect(QRect(corner, QSize(hs, hs)));
              }
          }
      }

      // ── TEXT_DRAG rubber-band ─────────────────────────────────────────────
      if(drag == TEXT_DRAG) {
          QRect textRect = QRect(dragStartX, dragStartY,
                                  dragCurX - dragStartX,
                                  dragCurY - dragStartY).normalized();
          // Dashed blue border
          p.setPen(QPen(QColor(50, 100, 220), 1.5, Qt::DashLine));
          p.setBrush(QColor(200, 215, 255, 60));
          p.drawRect(textRect);
          // Small "T" hint in top-left corner
          if(textRect.width() > 24 && textRect.height() > 16) {
              p.setPen(QColor(50, 100, 220));
              QFont f = p.font(); f.setBold(true); f.setPixelSize(12); p.setFont(f);
              p.drawText(textRect.adjusted(4, 2, -2, -2), Qt::AlignTop | Qt::AlignLeft, "T");
          }
      }
  }

}


void HeyGeoView::documentSaved(const QString &filename)
{
  topLevelWidget()->setWindowTitle(QString("heygeo: ") + filename);
}

void HeyGeoView::documentModified()
{
  QString caption = "heygeo: ";
  if(getDocument()->getFilename().isEmpty()) caption += tr("Untitled");
  else caption += getDocument()->getFilename();
  caption += '*';

  if(topLevelWidget()->windowTitle() != caption) topLevelWidget()->setWindowTitle(caption);
}

//---------------------MOUSE PRESS EVENT-----------------------------
void HeyGeoView::mousePressEvent(QMouseEvent *e)
{
  if(doc == NULL) return;

  dragCurX = dragStartX = lastMouseX = (int)e->position().x();
  dragCurY = dragStartY = lastMouseY = (int)e->position().y();

  if(drag != NO_DRAG) return;

  if(nextPan || e->button() == Qt::MiddleButton) {
    drag = PAN_DRAG; if(!nextPan) { nextPan = true; updateStatusBar(Qt::NoModifier); }
    emit updateMenus();
    return;
  }
  if(nextZoom) { drag = ZOOM_DRAG; emit updateMenus(); return; }

  // ── TEXT_TOOL: handle separately before generic dispatcher ───────────────
  if(e->button() == Qt::LeftButton && currentTool == TEXT_TOOL) {
      // If there is an open text-edit widget and user clicks outside it,
      // commit it first.
      if(textEditWidget && !textEditWidget->geometry().contains(e->pos()))
          commitTextAnnotation();

      ViewTransform vt(offsetX, offsetY, zoom);

      // Priority 1: label hover → drag label (stays clamped to its object)
      G_refs labels = doc->whatLabelsAmIOn((int)e->position().x(), (int)e->position().y(), vt);
      if(!labels.empty()) {
          setCursor(Qt::PointingHandCursor);
          drag = LABEL_DRAG;
          objectsDragged.append(labels[0]);
          objectsDragged[0]->getObject()->tempTransform(vt);
          dragOffset = labels[0]->getLabelPos() - G_point((int)e->position().x(), (int)e->position().y());
          objectsDragged[0]->getObject()->tempTransform(
              ViewTransform(-offsetX * zoom, -offsetY * zoom, 1.0 / zoom));
          updateStatusBar(e->modifiers());
          return;
      }

      // Priority 2: geometry object → toggle label
      G_refs near = doc->whatAmIOn((int)e->position().x(), (int)e->position().y(), vt);
      if(!near.empty()) {
          G_ref *r = near[0];
          doc->clearSel();
          doc->addSel(r);
          if(doc->canEditToggleLabels())
              doc->editToggleLabels();
          textLastClickedRef = r;
          doc->emitDocumentChanged();
          doc->emitDocumentModified();
      } else {
          // Priority 3: empty space → begin TEXT_DRAG
          drag = TEXT_DRAG;
          dragStartX = dragCurX = (int)e->position().x();
          dragStartY = dragCurY = (int)e->position().y();
      }
      updateStatusBar(e->modifiers());
      return;
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── Dispatch to active drawing tool (left-click only) ─────────────────────
  if(e->button() == Qt::LeftButton && currentTool != SELECTION_TOOL) {
    handleToolClick((int)e->position().x(), (int)e->position().y());
    updateStatusBar(e->modifiers());
    return;
  }
  // ──────────────────────────────────────────────────────────────────────────

  if(e->button() == Qt::LeftButton) {//----------------LEFT BUTTON PRESSED

    // Commit any open inline text editor if click is outside it
    if(textEditWidget && !textEditWidget->geometry().contains(e->pos()))
        commitTextAnnotation();

    // Check text annotations FIRST (highest z-order, before geometry hit-test)
    if(!(e->modifiers() & Qt::ControlModifier)) {
        // Priority: resize corner > move drag
        int corner = hitTestAnnotationCorner((int)e->position().x(), (int)e->position().y());
        if (corner >= 0) {
            // Start corner resize
            textAnnotationResizeCorner = corner;
            const TextAnnotation &ann = textAnnotations[textAnnotationSelected];
            // Anchor = world coords of the OPPOSITE corner
            bool anchorRight  = (corner == 0 || corner == 2); // TL,BL → anchor right
            bool anchorBottom = (corner == 0 || corner == 1); // TL,TR → anchor bottom
            textAnnotationResizeAnchorX = ann.worldX + (anchorRight  ? ann.worldW : 0);
            textAnnotationResizeAnchorY = ann.worldY + (anchorBottom ? ann.worldH : 0);
            drag = TEXT_ANNOTATION_RESIZE;
            lastMouseX = (int)e->position().x();
            lastMouseY = (int)e->position().y();
            doc->clearSel();
            doc->emitDocumentChanged();
            updateStatusBar(e->modifiers());
            repaint();
            return;
        }
        int annIdx = hitTestAnnotation((int)e->position().x(), (int)e->position().y());
        if (annIdx >= 0) {
            textAnnotationSelected = annIdx;
            // After selecting, immediately check if the click landed on a corner
            // so the user can resize without having to click twice.
            int c2 = hitTestAnnotationCorner((int)e->position().x(), (int)e->position().y());
            if (c2 >= 0) {
                textAnnotationResizeCorner = c2;
                const TextAnnotation &ann2 = textAnnotations[textAnnotationSelected];
                bool anchorRight2  = (c2 == 0 || c2 == 2);
                bool anchorBottom2 = (c2 == 0 || c2 == 1);
                textAnnotationResizeAnchorX = ann2.worldX + (anchorRight2  ? ann2.worldW : 0);
                textAnnotationResizeAnchorY = ann2.worldY + (anchorBottom2 ? ann2.worldH : 0);
                drag = TEXT_ANNOTATION_RESIZE;
            } else {
                drag = TEXT_ANNOTATION_DRAG;
            }
            lastMouseX = (int)e->position().x();
            lastMouseY = (int)e->position().y();
            doc->clearSel();
            doc->emitDocumentChanged();
            updateStatusBar(e->modifiers());
            setFocus();
            repaint();
            return;
        }
    }

    G_refs tmp = doc->whatAmIOn((int)e->position().x(), (int)e->position().y(), ViewTransform(offsetX, offsetY, zoom));

    if(e->modifiers() & Qt::ControlModifier && !(e->modifiers() & Qt::ShiftModifier)) { //CTRL pressed--reconstrain
      if(tmp.count() == 0 || tmp[0]->getType() != G_POINT) return;

      if(!doc->isPointFreeable(tmp[0])) return;

      reconstrainUndo = new G_undoReconstrain(tmp[0]);

      tmp[0]->reconstrain(G_FREE_POINT, G_refs());

      drag = RECONSTRAIN_DRAG;
      objectsDragged.append(tmp[0]);
      doc->clearSel();
      doc->addSel(tmp[0]);

      setCursor(Qt::PointingHandCursor);

      doc->emitDocumentChanged();

      updateStatusBar(e->modifiers());

      return;
    }

    if(tmp.count() == 0 || ((e->modifiers() & Qt::ControlModifier) && (e->modifiers() & Qt::ShiftModifier))) {
      tmp = doc->whatLabelsAmIOn((int)e->position().x(), (int)e->position().y(), ViewTransform(offsetX, offsetY, zoom));
      
      if(tmp.count() == 0) {
        // Annotation hit already checked above; start rectangle selection
        doc->clearSel();

	drag = RECTANGLE_DRAG;
	textAnnotationSelected = -1;
	doc->emitDocumentChanged();
	return;
      }

      setCursor(Qt::PointingHandCursor);

      drag = LABEL_DRAG;
      objectsDragged.append(tmp[0]);
      objectsDragged[0]->getObject()->tempTransform(ViewTransform(offsetX, offsetY, zoom));
      dragOffset = tmp[0]->getLabelPos() - G_point((int)e->position().x(), (int)e->position().y());
      objectsDragged[0]->getObject()->tempTransform(ViewTransform(-offsetX * zoom, -offsetY * zoom, 1. / zoom));
      return;
    }


    G_ref *r = doc->getNextSel(tmp, true);

    pressedRef = r;
    pressedRefWasSelected = r ? r->getSelected() : false;

    if(r && !pressedRefWasSelected) doc->addSel(r);
    // If r was already selected: keep full selection so drag moves all selected objects.
    // If no drag occurs, we'll toggle it off on release.

    //for a constrained point, grab the offset
    if(doc->getSelected().count() == 1 && doc->getSelected()[0]->getType() == G_POINT) {
      dragOffset = doc->getSelected()[0]->getObject()->getPoint() -
	(G_point((int)e->position().x(), (int)e->position().y()) / zoom - G_point(offsetX, offsetY));
    }

    setCursor(Qt::PointingHandCursor);

    drag = MOVE_DRAG;
  }
  else if(e->button() == Qt::RightButton) { //-----------RIGHT BUTTON - CONTEXT MENU
    // Select the topmost object under the cursor (if nothing already selected there)
    G_refs tmp = doc->whatAmIOn((int)e->position().x(), (int)e->position().y(), ViewTransform(offsetX, offsetY, zoom), false);

    if(tmp.count() > 0) {
      G_ref *r = tmp[0];
      if(!r->getSelected()) {
        doc->clearSel();
        doc->addSel(r);
        doc->emitDocumentChanged();
      }
    }

    // Helper lambda: show "Under Development" message for unimplemented GSP features
    auto showUD = [this]() {
      QMessageBox::information(this, tr("Under Development"),
                               tr("This feature is currently under development."));
    };

    // Build context menu based on current selection
    QMenu contextMenu(this);

    if(doc->getSelected().count() > 0) {
      // ────── GSP Object Context Menu ──────────────────────────────────────

      // Properties... (Under Development)
      contextMenu.addAction(tr("Properties..."), showUD);

      contextMenu.addSeparator();

      // ── Appearance submenus ──────────────────────────────────────────────

      // Color submenu
      if(doc->canEditChangeColor()) {
        QMenu *colorMenu = contextMenu.addMenu(tr("Color"));
        struct ColorEntry { QColor color; QString name; };
        const QList<ColorEntry> colors = {
          { Qt::black,   tr("Black")   },
          { Qt::gray,    tr("Gray")    },
          { Qt::red,     tr("Red")     },
          { Qt::green,   tr("Green")   },
          { Qt::blue,    tr("Blue")    },
          { Qt::yellow,  tr("Yellow")  },
          { Qt::magenta, tr("Magenta") },
          { Qt::cyan,    tr("Cyan")    }
        };
        QColor curColor = doc->getCurrentColor();
        for(const ColorEntry &ce : colors) {
          QPixmap pm(16, 16);
          pm.fill(ce.color);
          { QPainter pa(&pm); pa.setPen(Qt::darkGray); pa.drawRect(0, 0, 15, 15); }
          QAction *a = colorMenu->addAction(QIcon(pm), ce.name, [this, ce]() {
            doc->setCurrentColor(ce.color);
            doc->emitDocumentChanged();
            doc->emitDocumentModified();
          });
          a->setCheckable(true);
          a->setChecked(curColor == ce.color);
        }
        colorMenu->addSeparator();
        colorMenu->addAction(tr("Other..."), showUD); // color picker – Under Development
      }

      // Line Style submenu
      if(doc->canEditChangeLinestyle()) {
        QMenu *lineMenu = contextMenu.addMenu(tr("Line Style"));
        Qt::PenStyle curStyle = doc->getCurrentPenstyle();
        int curWidth = doc->getCurrentPenWidth();
        auto addStyleEntry = [&](const QString &name, Qt::PenStyle style, int width) {
          QPixmap pm(60, 16); pm.fill(Qt::white);
          { QPainter pa(&pm); QPen p(Qt::black, width < 0 ? 1 : width, style); pa.setPen(p); pa.drawLine(4, 8, 56, 8); }
          QAction *a = lineMenu->addAction(QIcon(pm), name, [this, style, width]() {
            if(width < 0) doc->setCurrentPenstyle(style);
            else          doc->setCurrentPenWidth(width);
            emit updateMenus();
          });
          a->setCheckable(true);
          a->setChecked(width < 0 ? curStyle == style : curWidth == width);
        };
        addStyleEntry(tr("Solid"),  Qt::SolidLine, -1);
        addStyleEntry(tr("Dashed"), Qt::DashLine,  -1);
        addStyleEntry(tr("Dotted"), Qt::DotLine,   -1);
        lineMenu->addSeparator();
        addStyleEntry(tr("Thin"),   Qt::SolidLine, 0);
        addStyleEntry(tr("Normal"), Qt::SolidLine, 2);
        addStyleEntry(tr("Thick"),  Qt::SolidLine, 3);
      }

      // Point Style submenu
      if(doc->canEditChangePointstyle()) {
        QMenu *ptMenu = contextMenu.addMenu(tr("Point Style"));
        PointStyle curPt = doc->getCurrentPointstyle();
        auto addPtEntry = [&](PointStyle style, const QString &name) {
          QPixmap pm(32, 32); pm.fill(Qt::white);
          {
            QPainter pa(&pm); QBrush b(Qt::black);
            G_drawstyle *d = G_drawstyle::match(style, 0, 0, &b);
            G_point(16, 16).draw(pa, *d);
            d->deleteReference();
          }
          QAction *a = ptMenu->addAction(QIcon(pm), name, [this, style]() {
            doc->setCurrentPointstyle(style);
            emit updateMenus();
          });
          a->setCheckable(true);
          a->setChecked(curPt == style);
        };
        addPtEntry(LARGE_CIRCLE,  tr("Large"));
        addPtEntry(MEDIUM_CIRCLE, tr("Medium"));
        addPtEntry(SMALL_CIRCLE,  tr("Small"));
      }

      // Text Style (Under Development)
      contextMenu.addAction(tr("Text Style"), showUD);

      contextMenu.addSeparator();

      // ── Trace ────────────────────────────────────────────────────────────
      contextMenu.addAction(tr("Trace Object"), showUD);

      contextMenu.addSeparator();

      // ── Labels ───────────────────────────────────────────────────────────
      if(doc->canEditToggleLabels())
        contextMenu.addAction(tr("Show/Hide Label"), [this]() {
          doc->editToggleLabels();
          doc->emitDocumentChanged();
        });
      if(doc->canEditChangeLabel())
        contextMenu.addAction(tr("Edit Label..."), [this]() {
          doc->editChangeLabel();
          doc->emitDocumentChanged();
        });

      contextMenu.addSeparator();

      // ── Select relatives ─────────────────────────────────────────────────
      contextMenu.addAction(tr("Select Parents"),  showUD);
      contextMenu.addAction(tr("Select Children"), showUD);

      contextMenu.addSeparator();

      // ── Animation ────────────────────────────────────────────────────────
      contextMenu.addAction(tr("Animate..."), showUD);

      contextMenu.addSeparator();

      // ── Hide ─────────────────────────────────────────────────────────────
      if(doc->canEditHide())
        contextMenu.addAction(tr("Hide"), [this]() {
          doc->editHide();
          doc->emitDocumentChanged();
        });

      contextMenu.addSeparator();

      // ── Advanced object operations (Under Development) ───────────────────
      contextMenu.addAction(tr("Split/Merge"),       showUD);
      contextMenu.addAction(tr("Edit Definition..."), showUD);
      contextMenu.addAction(tr("Bring to Front"),    showUD);
      contextMenu.addAction(tr("Send to Back"),      showUD);

      contextMenu.addSeparator();

      // ── Parameter / resolution controls (Under Development) ─────────────
      contextMenu.addAction(tr("Increase Value"),      showUD);
      contextMenu.addAction(tr("Decrease Value"),      showUD);
      contextMenu.addAction(tr("Increase Resolution"), showUD);
      contextMenu.addAction(tr("Decrease Resolution"), showUD);

      contextMenu.addSeparator();

      // ── Delete ───────────────────────────────────────────────────────────
      if(doc->canEditDelete())
        contextMenu.addAction(tr("Delete"), [this]() {
          doc->editDelete();
          doc->emitDocumentChanged();
        });

    } else {
      // ────── GSP Sketch Context Menu (right-click on empty space) ─────────

      // Preferences...
      contextMenu.addAction(tr("Preferences..."), [this]() {
        QMetaObject::invokeMethod(window(), "editPreferences");
      });

      contextMenu.addSeparator();

      // Select
      contextMenu.addAction(tr("Select All"), [this]() {
        selectAllForActiveTool();
      });
      contextMenu.addAction(tr("Select Parents"),  showUD);
      contextMenu.addAction(tr("Select Children"), showUD);

      contextMenu.addSeparator();

      // Show All Hidden
      if(doc->canEditShowHidden())
        contextMenu.addAction(tr("Show All Hidden"), [this]() {
          doc->editShowHidden();
          doc->emitDocumentChanged();
        });

      contextMenu.addSeparator();

      // Undo / Redo
      if(doc->canEditUndo())
        contextMenu.addAction(tr("Undo"), [this]() {
          doc->editUndo();
          doc->emitDocumentChanged();
        });
      if(doc->canEditRedo())
        contextMenu.addAction(tr("Redo"), [this]() {
          doc->editRedo();
          doc->emitDocumentChanged();
        });
    }

    if(!contextMenu.isEmpty())
      contextMenu.exec(mapToGlobal(e->pos()));
  }

  updateStatusBar(e->modifiers());
  doc->emitDocumentChanged();
}

//--------------------------MOUSE MOVE EVENT-----------------------------
void HeyGeoView::mouseMoveEvent(QMouseEvent *e)
{
  if(doc == NULL) return;

  if(drag != NO_DRAG) {
    HeyGeoConstructionList::disableRedraws();
  }

  if(drag == NO_DRAG) { //display status message
    updateStatusBar(e->modifiers());
  }

  if((int)e->position().x() == lastMouseX && (int)e->position().y() == lastMouseY) return;

  // Update rubber-band end-point for active drawing tools
  if(drag == NO_DRAG && toolRubberbandActive && currentTool != SELECTION_TOOL) {
    toolMouseX = (int)e->position().x();
    toolMouseY = (int)e->position().y();
    repaint();
  }

  // SELECTION_TOOL: update cursor when hovering over annotation corner handles
  if(drag == NO_DRAG && currentTool == SELECTION_TOOL) {
    int corner = hitTestAnnotationCorner((int)e->position().x(), (int)e->position().y());
    if (corner >= 0) {
        setCursor((corner == 0 || corner == 3) ? Qt::SizeFDiagCursor : Qt::SizeBDiagCursor);
    } else if (hitTestAnnotation((int)e->position().x(), (int)e->position().y()) >= 0) {
        setCursor(Qt::SizeAllCursor);
    } else {
        unsetCursor();
    }
  }

  // TEXT_TOOL: live hover-cursor update (label > geometry > empty)
  if(drag == NO_DRAG && currentTool == TEXT_TOOL) {
    // If there is an active text edit widget and mouse is inside it → I-beam
    if(textEditWidget && textEditWidget->geometry().contains(e->pos())) {
        setCursor(Qt::IBeamCursor);
    } else {
        ViewTransform vt(offsetX, offsetY, zoom);
        G_refs labels = doc->whatLabelsAmIOn((int)e->position().x(), (int)e->position().y(), vt);
        if(!labels.empty()) {
            G_ref *newLabel = labels[0];
            if(newLabel != textLabelHoveredRef || textHoveredRef != nullptr) {
                textLabelHoveredRef = newLabel;
                textHoveredRef = nullptr;
                setCursor(Qt::PointingHandCursor);
            }
        } else {
            textLabelHoveredRef = nullptr;
            G_refs near = doc->whatAmIOn((int)e->position().x(), (int)e->position().y(), vt);
            G_ref *newHover = near.empty() ? nullptr : near[0];
            if(newHover != textHoveredRef) {
                textHoveredRef = newHover;
                setCursor(newHover ? Qt::PointingHandCursor : Qt::ArrowCursor);
            }
        }
        updateStatusBar(e->modifiers());
    }
  }

  // TEXT_DRAG: track the current corner of the text rectangle
  if(drag == TEXT_DRAG) {
    dragCurX = (int)e->position().x();
    dragCurY = (int)e->position().y();
    repaint();
  }

  // GSP-style hover highlight: detect snap targets during construction tools
  if(drag == NO_DRAG && currentTool != SELECTION_TOOL && currentTool != TEXT_TOOL) {
    ViewTransform vt(offsetX, offsetY, zoom);
    G_refs nearby = doc->whatAmIOn((int)e->position().x(), (int)e->position().y(), vt, false);
    G_refs newHover;
    bool newIsIntersection = false;
    if(!nearby.empty() && nearby[0]->getType() == G_POINT) {
      newHover.append(nearby[0]);
    } else {
      G_refs curves;
      for(int i = 0; i < (int)nearby.count(); i++)
        if(nearby[i]->getType() & (G_CURVE | G_FUNCTIONPLOT | G_PARAMCURVE)) curves.append(nearby[i]);
      if(curves.count() >= 2) { newHover.append(curves[0]); newHover.append(curves[1]); newIsIntersection = true; }
      else if(curves.count() == 1) { newHover.append(curves[0]); }
    }
    if(newHover != toolHoveredRefs || newIsIntersection != toolHoveredIsIntersection) {
      toolHoveredRefs = newHover;
      toolHoveredIsIntersection = newIsIntersection;
      repaint();
    }
  }

  // TEXT_ANNOTATION_DRAG: move a committed text annotation
  if (drag == TEXT_ANNOTATION_DRAG && textAnnotationSelected >= 0) {
      double dx = ((int)e->position().x() - lastMouseX) / zoom;
      double dy = ((int)e->position().y() - lastMouseY) / zoom;
      textAnnotations[textAnnotationSelected].worldX += dx;
      textAnnotations[textAnnotationSelected].worldY += dy;
      lastMouseX = (int)e->position().x();
      lastMouseY = (int)e->position().y();
      repaint();
  }

  // TEXT_ANNOTATION_RESIZE: resize by dragging a corner handle.
  // Rebuild the cache on every move so content wraps live.
  if (drag == TEXT_ANNOTATION_RESIZE && textAnnotationSelected >= 0) {
      double curWorldX = (int)e->position().x() / zoom - offsetX;
      double curWorldY = (int)e->position().y() / zoom - offsetY;
      TextAnnotation &ann = textAnnotations[textAnnotationSelected];
      double ax = textAnnotationResizeAnchorX;
      double ay = textAnnotationResizeAnchorY;
      double newX = qMin(curWorldX, ax);
      double newY = qMin(curWorldY, ay);
      double newW = qMax(0.1, qAbs(curWorldX - ax));
      double newH = qMax(0.1, qAbs(curWorldY - ay));
      ann.worldX = newX;  ann.worldY = newY;
      ann.worldW = newW;  ann.worldH = newH;
      lastMouseX = (int)e->position().x();  lastMouseY = (int)e->position().y();
      rebuildAnnotationCache(textAnnotationSelected);
      repaint();
  }

  if(drag == RECTANGLE_DRAG) {
    dragCurX = (int)e->position().x();
    dragCurY = (int)e->position().y();

    repaint();
  }

  if(drag == LABEL_DRAG) {
    objectsDragged[0]->getObject()->tempTransform(ViewTransform(offsetX, offsetY, zoom));
    objectsDragged[0]->setLabelPos(dragOffset + G_point((int)e->position().x(), (int)e->position().y()));
    objectsDragged[0]->getObject()->tempTransform(ViewTransform(-offsetX * zoom, -offsetY * zoom, 1. / zoom));
    doc->emitDocumentChanged();
    doc->emitDocumentModified();
  }

  if(drag == RECONSTRAIN_DRAG) {
    if(objectsUpdating.count() == 0) {
      objectsUpdating.topologicalSort(objectsDragged);
    }
    
    int i;

    for(i = 0; i < (int)objectsDragged.count(); i++) {
      objectsDragged[i]->getObject()->translate(G_point((int)e->position().x() - lastMouseX, (int)e->position().y() - lastMouseY) / zoom);
    }
    objectsUpdating.update();
    
    doc->emitDocumentChanged();
    doc->emitDocumentModified();
    updateStatusBar(e->modifiers());
  }

  if(drag == MOVE_DRAG) {
    if(objectsDragged.count() == 0 && doc->getSelected().count()) {
      // When dragging a newly-selected object, make it the only selection.
      if(pressedRef && !pressedRefWasSelected) {
        doc->clearSel();
        doc->addSel(pressedRef);
        pressedRef = nullptr;
      }
      dragPattern = BuildReverse(doc->getSelected());
      objectsDragged.clear();
      hash_map<G_ref *, G_matrix>::iterator it;
      for(it = dragPattern.begin(); it != dragPattern.end(); ++it) {
	objectsDragged.append((*it).first);
      }
      objectsUpdating.topologicalSort(objectsDragged);
    }

    if(objectsDragged.count() == 1 && objectsDragged[0]->getType() == G_POINT &&
       (objectsDragged[0]->getDescendType() == G_CONSTRAINED_POINT || objectsDragged[0]->getDescendType() == G_HORIZONTAL_POINT || objectsDragged[0]->getDescendType() == G_VERTICAL_POINT)) { // a constrained point is moving.
      ((G_pointObject *)(objectsDragged[0]->getObject()))->
	setPoint(dragOffset + G_point((int)e->position().x(), (int)e->position().y()) / zoom - G_point(offsetX, offsetY));
      
      objectsUpdating.update();
      lastMouseX = (int)e->position().x(); lastMouseY = (int)e->position().y();
      
      doc->emitDocumentChanged();
      doc->emitDocumentModified();
    }
    else {
      hash_map<G_ref *, G_matrix>::iterator it;
      for(it = dragPattern.begin(); it != dragPattern.end(); ++it) {
	(*it).first->getObject()->translate((*it).second *
					    G_point((int)e->position().x() - lastMouseX, (int)e->position().y() - lastMouseY) / zoom);
      }

      objectsUpdating.update();
      
      doc->emitDocumentChanged();
      doc->emitDocumentModified();
    }
  }

  if(drag == PAN_DRAG) {
    offsetX += ((double)((int)e->position().x() - lastMouseX)) / zoom;
    offsetY += ((double)((int)e->position().y() - lastMouseY)) / zoom;

    redrawBuffer();
  }

  if(drag == ZOOM_DRAG) {
    double diff = (int)e->position().y() - lastMouseY;
    double scale = pow(2., -diff / 100.);

    offsetX += (1. / scale - 1) * ((double)dragStartX) / zoom;
    offsetY += (1. / scale - 1) * ((double)dragStartY) / zoom;
    zoom *= scale;

    redrawBuffer();
    updateStatusBar(Qt::NoModifier);
  }

  lastMouseX = (int)e->position().x(); lastMouseY = (int)e->position().y();
}

//--------------------------MOUSE RELEASE EVENT-----------------------------
void HeyGeoView::mouseReleaseEvent(QMouseEvent *e)
{
  if(doc == NULL) return;

  HeyGeoConstructionList::enableRedraws();

  if(drag == NO_DRAG) return;

  if(e->buttons() & (Qt::LeftButton | Qt::RightButton | Qt::MiddleButton)) return;

  if(drag == MOVE_DRAG && doc->isConstruction()) doc->emitDocumentChanged();

  if(drag == RECTANGLE_DRAG) {
    doc->addSelect(QRect(dragStartX, dragStartY, dragCurX - dragStartX,
			 dragCurY - dragStartY).normalized(), ViewTransform(offsetX, offsetY, zoom));

    drag = NO_DRAG;
    doc->emitDocumentChanged();
    return;
  }

  if(drag == TEXT_DRAG) {
    QRect textRect = QRect(dragStartX, dragStartY,
                           dragCurX - dragStartX,
                           dragCurY - dragStartY).normalized();
    drag = NO_DRAG;
    showTextEditAt(textRect);
    return;
  }

  // TEXT_ANNOTATION_DRAG / RESIZE: commit
  if (drag == TEXT_ANNOTATION_DRAG || drag == TEXT_ANNOTATION_RESIZE) {
      if (drag == TEXT_ANNOTATION_RESIZE && textAnnotationSelected >= 0)
          rebuildAnnotationCache(textAnnotationSelected);
      drag = NO_DRAG;
      textAnnotationResizeCorner = -1;
      doc->emitDocumentModified();
      updateStatusBar(e->modifiers());
      repaint();
      return;
  }

  if(drag == RECONSTRAIN_DRAG) {
    if(objectsUpdating.count() == 0) {
      objectsUpdating.topologicalSort(objectsDragged);
    }

    G_point releasePt = zoom * (objectsDragged[0]->getObject()->getPoint() + G_point(offsetX, offsetY));

    G_refs tmp = doc->whatAmIOn(ROUND(releasePt.getX()), ROUND(releasePt.getY()),
				ViewTransform(offsetX, offsetY, zoom), false);

    int i;

    //remove objects to which it cannot be reconstrained
    //here do check for various scripting constraints.
    tmp.removeRef(objectsDragged[0]);

    for(i = 0; i < (int)tmp.count(); i++) {
      if(canReconstrain(objectsDragged[0], tmp[i]) == false) {
	tmp.remove(i);
	i--;
      }
    }

    if(tmp.count() != 0 && tmp[0]->getType() == G_POINT) {
      while(objectsDragged[0]->getChildren().count()) {
	G_refs oldpars;
	G_ref *curChild;

	curChild = objectsDragged[0]->getChildren()[0];
	oldpars = curChild->getParents();

	for(i = 0; i < (int)oldpars.count(); i++) {
	  if(oldpars[i] == objectsDragged[0]) {
	    oldpars.insert(i, tmp[0]);
	    oldpars.remove(i + 1);
	  }
	}

	doc->addUndo(new G_undoReconstrain(curChild));

	curChild->reconstrain(curChild->getDescendType(), oldpars, false); //defer topSort
      }

      if(reconstrainUndo->isChanged(objectsDragged[0])) doc->addUndo(reconstrainUndo);
      else {
	//the next two lines make sure that the undo from deletion
	//has the right position of the point if the original was free.
	((G_pointObject *)(objectsDragged[0]->getObject()))->
	  setPoint(reconstrainUndo->getOldPos());
      }
      reconstrainUndo = 0;
      
      objectsUpdating.update();
      objectsDragged[0]->remove();

      //do a topSort to take care of the reconstraints.
      doc->topSortAllRefs();
      doc->emitDocumentChanged();
    }

    if(tmp.count() == 2 && tmp[0]->getType() & G_CURVE && tmp[1]->getType() & G_CURVE) {
      //make it an intersection point
      G_point int1Pt = tmp[0]->getObject()->getCurveRef()->
	getIntersection(tmp[1]->getObject()->getCurveRef());
      G_point int2Pt = tmp[0]->getObject()->getCurveRef()->
	getIntersection(tmp[1]->getObject()->getCurveRef(), 1);

      int1Pt = zoom * (int1Pt + G_point(offsetX, offsetY));
      int2Pt = zoom * (int2Pt + G_point(offsetX, offsetY));

      if((releasePt - int1Pt).length() < 5) {
	objectsDragged[0]->reconstrain(G_INTERSECTION_POINT, tmp);
	objectsUpdating.update();
	doc->emitDocumentChanged();
      }
      else if((releasePt - int2Pt).length() < 5) {
	objectsDragged[0]->reconstrain(G_INTERSECTION2_POINT, tmp);
	objectsUpdating.update();
	doc->emitDocumentChanged();
      }
    }

    if(tmp.count() == 1 && tmp[0]->getType() & (G_CURVE | G_FUNCTIONPLOT | G_PARAMCURVE)) { //create constrained point

      objectsDragged[0]->reconstrain(G_CONSTRAINED_POINT, tmp);
      ((G_pointObject *)(objectsDragged[0]->getObject()))->setP(BIG);
      objectsUpdating.update();
      doc->emitDocumentChanged();
    }

    if(reconstrainUndo &&
       reconstrainUndo->isChanged(objectsDragged[0])) doc->addUndo(reconstrainUndo);

  }

  if(drag == ZOOM_DRAG) nextZoom = false;
  if(drag == PAN_DRAG) nextPan = false;

  // Pure click (no drag) on an already-selected object: toggle it off.
  if(drag == MOVE_DRAG && objectsDragged.count() == 0) {
    if(pressedRef && pressedRefWasSelected && pressedRef->getSelected()) {
      doc->delSel(pressedRef);
      doc->emitDocumentChanged();
    }
  }
  pressedRef = nullptr;

  drag = NO_DRAG;
  objectsDragged.clear();
  objectsUpdating.clear();
  updateStatusBar(e->modifiers());
  emit updateMenus();
}

//-------------------------MOUSE DOUBLE CLICK EVENT-----------------------------
void HeyGeoView::mouseDoubleClickEvent(QMouseEvent *e)
{
  if(doc == NULL) return;

  // ── SELECTION_TOOL: double-click on a text annotation → open editor ───────
  if(e->button() == Qt::LeftButton && currentTool == SELECTION_TOOL) {
      int annIdx = hitTestAnnotation((int)e->position().x(), (int)e->position().y());
      if (annIdx >= 0) {
          textAnnotationSelected = annIdx;
          showTextEditAt(QRect(), annIdx);  // rect is derived from annotation
          return;
      }
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── TEXT_TOOL: double-click on object → edit label ─────────────────────
  if(e->button() == Qt::LeftButton && currentTool == TEXT_TOOL) {
      G_refs near = doc->whatAmIOn((int)e->position().x(), (int)e->position().y(), ViewTransform(offsetX, offsetY, zoom));
      if(!near.empty()) {
          doc->clearSel();
          doc->addSel(near[0]);
          doc->emitDocumentChanged();
          if(doc->canEditChangeLabel())
              doc->editChangeLabel();
      } else {
          // Double-click on annotation text → let single-click handler manage it
      }
      return;
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ── Polygon tool: double-click completes the polygon ──────────────────────
  if(e->button() == Qt::LeftButton &&
     (currentTool == POLYGON_TOOL || currentTool == FILLED_POLYGON_TOOL ||
      currentTool == OPEN_POLYGON_TOOL)) {
    handleToolDoubleClick((int)e->position().x(), (int)e->position().y());
    return;
  }
  // ──────────────────────────────────────────────────────────────────────────

  if(e->button() == Qt::LeftButton) {
    G_refs tmp = doc->whatAmIOn((int)e->position().x(), (int)e->position().y(), ViewTransform(offsetX, offsetY, zoom));

    if(tmp.count() == 0 || ((e->modifiers() & Qt::ControlModifier) && (e->modifiers() & Qt::ShiftModifier))) {
      tmp = doc->whatLabelsAmIOn((int)e->position().x(), (int)e->position().y(), ViewTransform(offsetX, offsetY, zoom));

      if(tmp.count() == 0) return;

      doc->clearSel();
      doc->addSel(tmp[0]);

      doc->emitDocumentChanged();

      if(doc->canEditChangeLabel()) doc->editChangeLabel();
      return;
    }
    // G_FUNCTION: double-click opens Edit Function dialog
    if(tmp[0]->getType() == G_FUNCTION) {
      G_functionObject *fnObj = dynamic_cast<G_functionObject *>(tmp[0]->getObject());
      if(fnObj) {
        HeyGeoNewFunctionDialog dlg(this, &fnObj->getFuncDef());
        if(dlg.exec() == QDialog::Accepted && !dlg.formula().isEmpty()) {
          fnObj->getFuncDef().setFormula(dlg.formula());
          fnObj->getFuncDef().setDomain(dlg.xMin(), dlg.xMax());
          fnObj->getFuncDef().setNumSamples(dlg.numSamples());
          fnObj->update();
          G_refs deps; deps.topologicalSort(tmp[0]); deps.update();
          doc->emitDocumentChanged();
          doc->emitDocumentModified();
        }
      }
      return;
    }

    if(tmp[0]->getType() & G_VALUE) { //start or edit a calculation
      if(tmp[0]->getType() == G_CALCULATE) { //edit
	HeyGeoCalculateEditor *ed;
	G_calculateObject *formula = (G_calculateObject *)(tmp[0]->getObject());
	ed = new HeyGeoCalculateEditor(this, formula->getFormulaString(),
				     tmp[0]->getParents(), tmp[0]);
	ed->run();
	if(ed->result() == QDialog::Rejected) { delete ed; return; }
	formula->changeFormula(ed->getOutputParents(), ed->getOutputString());
	G_refs dependents; dependents.topologicalSort(tmp[0]); dependents.update();
	doc->emitDocumentChanged();
	delete ed;
	return;
      }
      else { //measure
	doc->clearSel();
	doc->addSel(tmp[0]);
	doc->measureCalculate();
      }
    }
    if(tmp[0]->getType() & G_LOCUS) { //change number of samples in locus
      if(tmp[0]->getDescendType() == G_OBJECT_LOCUS) {
	doc->clearSel();
	doc->addSel(tmp[0]);
	doc->editChangeNumberOfSamples();
      }
    }
  }
}

//-------------------------UPDATE STATUS BAR-----------------------------
void HeyGeoView::updateStatusBar(Qt::KeyboardModifiers state)
{
  QPoint e = mapFromGlobal(QCursor::pos());

  if(nextPan) {
    emit statusBarMessage(tr("Pan"));
    setCursor(Qt::SizeAllCursor);
    return;
  }

  if(nextZoom) {
    emit statusBarMessage(tr("Zoom"));
    QPixmap p((const char **)zoom_cursor_xpm);
    QBitmap b = QBitmap::fromPixmap(p);
    setCursor(QCursor(b, b, 9, 9));
    return;
  }

  // ── Tool-mode status hints ────────────────────────────────────────────────
  if(currentTool != SELECTION_TOOL && drag == NO_DRAG) {
    switch(currentTool) {
    case POINT_TOOL:
      setCursor(Qt::CrossCursor);
      emit statusBarMessage(tr("Click to place a point"));
      return;
    case COMPASS_TOOL:
      setCursor(Qt::CrossCursor);
      if(toolAccumPoints.count() == 0)
        emit statusBarMessage(tr("Click to place the centre of the circle"));
      else
        emit statusBarMessage(tr("Click to place a point on the circle"));
      return;
    case SEGMENT_TOOL:
      setCursor(Qt::CrossCursor);
      if(toolAccumPoints.count() == 0)
        emit statusBarMessage(tr("Click to place the first endpoint of the segment"));
      else
        emit statusBarMessage(tr("Click to place the second endpoint of the segment"));
      return;
    case RAY_TOOL:
      setCursor(Qt::CrossCursor);
      if(toolAccumPoints.count() == 0)
        emit statusBarMessage(tr("Click to place the origin of the ray"));
      else
        emit statusBarMessage(tr("Click to set the direction of the ray"));
      return;
    case LINE_TOOL:
      setCursor(Qt::CrossCursor);
      if(toolAccumPoints.count() == 0)
        emit statusBarMessage(tr("Click to place the first point on the line"));
      else
        emit statusBarMessage(tr("Click to place the second point on the line"));
      return;
    case POLYGON_TOOL:
    case FILLED_POLYGON_TOOL:
    case OPEN_POLYGON_TOOL:
      setCursor(Qt::CrossCursor);
      if(toolAccumPoints.count() == 0)
        emit statusBarMessage(tr("Click to place the first vertex of the polygon (double-click last vertex to finish)"));
      else
        emit statusBarMessage(tr("Click to add a vertex — double-click to finish  (%1 so far)").arg(toolAccumPoints.count()));
      return;
    case TEXT_TOOL: {
        // Priority: label hover > geometry object hover > empty canvas
        QPoint ep = mapFromGlobal(QCursor::pos());
        ViewTransform vt(offsetX, offsetY, zoom);
        G_refs labels = doc->whatLabelsAmIOn(ep.x(), ep.y(), vt);
        if (!labels.empty()) {
            textLabelHoveredRef = labels[0];
            textHoveredRef = nullptr;
            setCursor(Qt::PointingHandCursor);
            emit statusBarMessage(
                tr("Click to move label of %1 %2")
                    .arg(G_ref::getNameFromType(labels[0]->getType()))
                    .arg(KFormula::toUgly(labels[0]->getLabel().getText())));
        } else {
            textLabelHoveredRef = nullptr;
            G_refs near = doc->whatAmIOn(ep.x(), ep.y(), vt);
            if (!near.empty()) {
                textHoveredRef = near[0];
                setCursor(Qt::PointingHandCursor);
                emit statusBarMessage(
                    tr("Click to show/hide label of %1 %2  |  Double-click for properties")
                        .arg(G_ref::getNameFromType(near[0]->getType()))
                        .arg(KFormula::toUgly(near[0]->getLabel().getText())));
            } else {
                textHoveredRef = nullptr;
                setCursor(Qt::ArrowCursor);
                emit statusBarMessage(tr("Click an object to show/hide its label  |  Drag to create a LaTeX text box"));
            }
        }
        return;
    }
    case PEN_TOOL:
      setCursor(Qt::CrossCursor);
      emit statusBarMessage(tr("Click a segment or angle arc to mark it"));
      return;
    case INFO_TOOL:
      setCursor(Qt::WhatsThisCursor);
      emit statusBarMessage(tr("Click an object to see its information"));
      return;
    case CUSTOM_TOOL:
      setCursor(Qt::PointingHandCursor);
      emit statusBarMessage(tr("Click to apply custom tool"));
      return;
    default: break;
    }
  }
  // ──────────────────────────────────────────────────────────────────────────

  if(drag == NO_DRAG) {
    G_refs tmp = doc->whatAmIOn(e.x(), e.y(), ViewTransform(offsetX, offsetY, zoom));

    if(tmp.count() == 0 || ((state & Qt::ControlModifier) && (state & Qt::ShiftModifier))) {
      tmp = doc->whatLabelsAmIOn(e.x(), e.y(), ViewTransform(offsetX, offsetY, zoom));

      if(tmp.count() == 0) {
	unsetCursor();
	emit statusBarMessage(tr("Ready"));
	return;
      }

      setCursor(Qt::UpArrowCursor);

      QString message;

      message = tr("Move label of %1 %2", "E.g. \"Move label of Point P1\"");

      message = message.arg(G_ref::getNameFromType(tmp[0]->getType()));
      message = message.arg(KFormula::toUgly(tmp[0]->getLabel().getText()));

      emit statusBarMessage(message);
      return;
    }

    setCursor(Qt::UpArrowCursor);

    QString message;


    G_ref *r = doc->getNextSel(tmp, true);

    if(r) {
      if(r->getSelected()) {
	message = tr("Deselect %1 %2");
      }
      else {
	if(doc->selectedCount() > 0) message = tr("Also select %1 %2");
	else message = tr("Select %1 %2");
      }

      message = message.arg(G_ref::getNameFromType(r->getType()));
      message = message.arg(KFormula::toUgly(r->getLabel().getText()));
    }
    else message = tr("Move Selected Objects");

    emit statusBarMessage(message);

  }

  if(drag == RECONSTRAIN_DRAG) {
    QString message;
    QString messageZero = tr("Reconstrain %1 %2 to be free");
    QString messageOne = tr("Reconstrain %1 %2 to %3 %4",
			    "E.g., \"Reconstrain Point P1 to Line l1\"");
    QString messageTwo = tr("Reconstrain %1 %2 to the intersection of %3 %4 and %5 %6");

    messageZero = messageZero.arg(G_ref::getNameFromType(objectsDragged[0]->getType()));
    messageOne = messageOne.arg(G_ref::getNameFromType(objectsDragged[0]->getType()));
    messageTwo = messageTwo.arg(G_ref::getNameFromType(objectsDragged[0]->getType()));

    messageZero = messageZero.arg(KFormula::toUgly(objectsDragged[0]->getLabel().getText()));
    messageOne = messageOne.arg(KFormula::toUgly(objectsDragged[0]->getLabel().getText()));
    messageTwo = messageTwo.arg(KFormula::toUgly(objectsDragged[0]->getLabel().getText()));

    
    G_point releasePt = zoom * (objectsDragged[0]->getObject()->getPoint() + G_point(offsetX, offsetY));

    G_refs tmp = doc->whatAmIOn(ROUND(releasePt.getX()), ROUND(releasePt.getY()),
				ViewTransform(offsetX, offsetY, zoom), false);

    int i;

    //remove objects to which it cannot be reconstrained
    //here do check for various scripting constraints.
    tmp.removeRef(objectsDragged[0]);

    //objects after the third do not matter since
    //they cannot possibly play any part in the
    //reconstraint
    for(i = 0; i < 3 && i < (int)tmp.count(); i++) {
      if(canReconstrain(objectsDragged[0], tmp[i]) == false) {
	tmp.remove(i);
	i--;
      }
    }

    if((tmp.count() != 0 && tmp[0]->getType() == G_POINT) ||
       (tmp.count() == 1 && tmp[0]->getType() & (G_CURVE | G_FUNCTIONPLOT | G_PARAMCURVE))) {
      message = messageOne;
      message = message.arg(G_ref::getNameFromType(tmp[0]->getType()));
      message = message.arg(KFormula::toUgly(tmp[0]->getLabel().getText()));
    }
    else if(tmp.count() == 2 && tmp[0]->getType() & (G_CURVE | G_FUNCTIONPLOT | G_PARAMCURVE) && tmp[1]->getType() & (G_CURVE | G_FUNCTIONPLOT | G_PARAMCURVE)) {
      //check if it's really near the intersection or just near both curves
      G_point int1Pt = tmp[0]->getObject()->getCurveRef()->
	getIntersection(tmp[1]->getObject()->getCurveRef());
      G_point int2Pt = tmp[0]->getObject()->getCurveRef()->
	getIntersection(tmp[1]->getObject()->getCurveRef(), 1);

      int1Pt = zoom * (int1Pt + G_point(offsetX, offsetY));
      int2Pt = zoom * (int2Pt + G_point(offsetX, offsetY));

      if((releasePt - int1Pt).length() < 5 || (releasePt - int2Pt).length() < 5) {
	message = messageTwo;
	message = message.arg(G_ref::getNameFromType(tmp[0]->getType()));
	message = message.arg(KFormula::toUgly(tmp[0]->getLabel().getText()));
	message = message.arg(G_ref::getNameFromType(tmp[1]->getType()));
	message = message.arg(KFormula::toUgly(tmp[1]->getLabel().getText()));
      }
      else message = messageZero;
    }
    else {
      message = messageZero;
    }

    emit statusBarMessage(message);
  }
}


void HeyGeoView::playConstruction(int which)
{
  QPainter p;

  constructionPainter = &p;
  constructionTransform = ViewTransform(offsetX, offsetY, zoom);

  p.begin(this);
  p.setRenderHint(QPainter::Antialiasing, true);
  p.setRenderHint(QPainter::SmoothPixmapTransform, true);
  p.setClipRect(QRect(0, 0, width() - ScrollBarThickness, height() - ScrollBarThickness));
  
  doc->doPlay(which);

  p.end();
}

void HeyGeoView::updateAllViews()
{
  int i;

  if(HeyGeoProperties::getProperty("SelectType").toLower() == "borderselect")
    selectType = BORDER_SELECT;
  else if(HeyGeoProperties::getProperty("SelectType").toLower() == "blinkingselect")
    selectType = BLINKING_SELECT;
  
  for(i = 0; i < (int)allViews.count(); ++i) {
    allViews.at(i)->redrawBuffer();
  }
}

void HeyGeoView::viewPan()
{
  nextPan = !nextPan;
  if(nextZoom) nextZoom = false;

  updateStatusBar(Qt::NoModifier);
  emit updateMenus();
}

void HeyGeoView::viewZoom()
{
  nextZoom = !nextZoom;
  if(nextPan) nextPan = false;

  updateStatusBar(Qt::NoModifier);
  emit updateMenus();
}

void HeyGeoView::viewZoomFit()
{
  QRect tmp = doc->getSize(ViewTransform(0, 0, 1));

  double oldOffsetX = offsetX, oldOffsetY = offsetY, oldZoom = zoom;

  if(tmp.isEmpty() || tmp.isNull()) return;

  QRect r = rect();
  r.setWidth(r.width() - ScrollBarThickness);
  r.setHeight(r.height() - ScrollBarThickness);
  
  zoom = qMin(((double)r.width()) / (1.05 * (double)tmp.width()),
	      ((double)r.height()) / (1.05 * (double)tmp.height()));

  QPoint rc = r.center();
  QPoint tc = tmp.center();

  offsetX = ((double)rc.x()) / zoom - tc.x();
  offsetY = ((double)rc.y()) / zoom - tc.y();

  zoomAnimation(oldOffsetX, oldOffsetY, oldZoom);
  updateStatusBar(Qt::NoModifier);
}


void HeyGeoView::viewOrigZoom()
{
  double oldOffsetX = offsetX, oldOffsetY = offsetY, oldZoom = zoom;

  offsetX = 0;
  offsetY = 0;
  zoom = 1;

  zoomAnimation(oldOffsetX, oldOffsetY, oldZoom);
  updateStatusBar(Qt::NoModifier);
}

void HeyGeoView::zoomAnimation(double oldOffsetX, double oldOffsetY, double oldZoom)
{
  QElapsedTimer t;
  t.start();

  double newOffsetX = offsetX, newOffsetY = offsetY, newZoom = zoom;

  int zoomTime = 700;
  
  DragType oldDrag = drag;
  drag = ZOOM_DRAG; //to prevent menus from updating

  if(fabs(offsetX - oldOffsetX) + fabs(offsetY - oldOffsetY) + fabs(zoom - oldZoom) > 0.0001)
  while(t.elapsed() < zoomTime) {
    double p = ((double)t.elapsed()) / ((double)zoomTime);

    zoom = exp(p * log(newZoom) + (1 - p) * log(oldZoom));
    if(fabs(oldZoom - newZoom) > 0.000001) p = (zoom - oldZoom) / (newZoom - oldZoom);
    offsetX = ((1 - p) * oldOffsetX * oldZoom + p * (newOffsetX * newZoom)) / zoom;
    offsetY = ((1 - p) * oldOffsetY * oldZoom + p * (newOffsetY * newZoom)) / zoom;
    redrawBuffer();
    QApplication::processEvents();
  }

  offsetX = newOffsetX;
  offsetY = newOffsetY;
  zoom = newZoom;
  redrawBuffer();

  drag = oldDrag;
}

// ══════════════════════════════════════════════════════════════════════════════
//  GSP-style Tool Mode implementation
// ══════════════════════════════════════════════════════════════════════════════

// ── setToolMode / cancelCurrentTool ──────────────────────────────────────────

// ── Text Tool helpers ─────────────────────────────────────────────────────────

// buildTextCursors() removed — Qt::PointingHandCursor used directly everywhere.

// Returns the index of the topmost TextAnnotation whose screen rect contains
// (x, y), or -1 if none.
int HeyGeoView::hitTestAnnotation(int x, int y) const
{
    for (int i = textAnnotations.size() - 1; i >= 0; --i) {
        const TextAnnotation &ann = textAnnotations[i];
        int sx = qRound(zoom * (ann.worldX + offsetX));
        int sy = qRound(zoom * (ann.worldY + offsetY));
        int sw = qMax(1, qRound(zoom * ann.worldW));
        int sh = qMax(1, qRound(zoom * ann.worldH));
        if (QRect(sx, sy, sw, sh).contains(x, y))
            return i;
    }
    return -1;
}

// Hit-test the 8px corner handle squares of the selected annotation.
// Returns corner index 0=TL,1=TR,2=BL,3=BR, or -1 if none hit.
int HeyGeoView::hitTestAnnotationCorner(int x, int y) const
{
    if (textAnnotationSelected < 0 || textAnnotationSelected >= textAnnotations.size())
        return -1;
    const TextAnnotation &ann = textAnnotations[textAnnotationSelected];
    int sx = qRound(zoom * (ann.worldX + offsetX)) - 3;
    int sy = qRound(zoom * (ann.worldY + offsetY)) - 3;
    int sw = qMax(1, qRound(zoom * ann.worldW));
    int sh = qMax(1, qRound(zoom * ann.worldH));
    const int hs = 8;  // handle size
    QPoint corners[4] = {
        {sx,          sy},
        {sx + sw - hs + 6, sy},
        {sx,          sy + sh - hs + 6},
        {sx + sw - hs + 6, sy + sh - hs + 6}
    };
    for (int i = 0; i < 4; ++i)
        if (QRect(corners[i], QSize(hs, hs)).contains(x, y))
            return i;
    return -1;
}

// Render ann.content (mixed text + $inline$ + $$display$$ math) into ann.cachedPixmap.
// Uses MicroTeX for math segments and QPainter for plain text.
void HeyGeoView::rebuildAnnotationCache(int index)
{
    if (index < 0 || index >= textAnnotations.size()) return;
    TextAnnotation &ann = textAnnotations[index];

    if (ann.content.trimmed().isEmpty()) {
        ann.cachedPixmap = QPixmap();
        return;
    }

    qreal dpr  = devicePixelRatioF();
    const int PAD = 6;
    int logW = qMax(40, qRound(zoom * ann.worldW));
    int logH = qMax(20, qRound(zoom * ann.worldH));

    QPixmap pm(qRound(logW * dpr), qRound(logH * dpr));
    pm.setDevicePixelRatio(dpr);
    pm.fill(Qt::transparent);

    QPainter painter(&pm);
    painter.setRenderHint(QPainter::Antialiasing);
    painter.setRenderHint(QPainter::TextAntialiasing);

    QFont f;
    f.setFamily("Helvetica Neue");
    f.setPointSizeF(ann.fontSize);

    tex::color mathColor =
        ((tex::color)ann.fontColor.alpha() << 24) |
        ((tex::color)ann.fontColor.red()   << 16) |
        ((tex::color)ann.fontColor.green() <<  8) |
        ((tex::color)ann.fontColor.blue());

    // MicroTeX size: 1.3x so math glyphs visually match the surrounding text.
    const float textSize = (float)ann.fontSize * 1.3f;
    QFontMetrics fm(f);
    const int lineH = fm.height() + 2;

    // ── Segment: either a run of plain text or inline $...$ math ─────────────
    struct Seg { QString text; bool isMath; };

    auto parseSegs = [](const QString &line) -> QVector<Seg> {
        QVector<Seg> result;
        int start = 0, n = line.length();
        for (int i = 0; i < n; ) {
            if (line[i] == '$') {
                if (i > start) result.push_back({line.mid(start, i - start), false});
                int j = i + 1;
                while (j < n && line[j] != '$') ++j;
                if (j < n) {
                    result.push_back({line.mid(i + 1, j - i - 1), true});
                    start = j + 1; i = j + 1;
                } else {
                    result.push_back({line.mid(i), false});
                    start = n; i = n;
                }
            } else { ++i; }
        }
        if (start < n) result.push_back({line.mid(start), false});
        return result;
    };

    // ── Main render loop ──────────────────────────────────────────────────────
    int curY = PAD + fm.ascent() + 2;  // baseline of the current visual row

    const QStringList rawLines = ann.content.split('\n');
    for (const QString &rawLine : rawLines) {
        if (curY > logH - PAD) break;

        // ── Display math (entire line is $$...$$) ─────────────────────────
        QString trimmed = rawLine.trimmed();
        if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length() > 4) {
            QString latex = trimmed.mid(2, trimmed.length() - 4);
            try {
                tex::TeXRender* r = tex::LaTeX::parse(
                    latex.trimmed().toStdWString(), logW - 2*PAD,
                    textSize, textSize * 0.2f, mathColor);
                if (r) {
                    int rw = r->getWidth();
                    int rh = r->getHeight();
                    int drawX   = PAD + qMax(0, (logW - 2*PAD - rw) / 2);
                    int drawTop = curY - fm.ascent();
                    painter.save();
                    { tex::Graphics2D_qt g2(&painter); r->draw(g2, drawX, drawTop); }
                    painter.restore();
                    curY = drawTop + rh + fm.descent() + 4;
                    delete r;
                } else { curY += lineH; }
            } catch (...) { curY += lineH; }
            continue;
        }

        // ── Mixed inline line: text + $math$ with word-wrapping ───────────
        QVector<Seg> segs = parseSegs(rawLine);

        int cx   = PAD;
        int rowH = lineH;   // tallest thing on the current visual row

        // Flush current visual row and start a new one.
        auto newRow = [&]() {
            curY += rowH + 2;
            rowH = lineH;
            cx   = PAD;
        };

        for (const Seg &s : segs) {
            if (curY > logH - PAD) break;

            if (!s.isMath) {
                // ── Plain text: word-by-word wrapping ────────────────────
                const int n = s.text.length();
                int i = 0;
                bool firstInSeg = true;
                while (i <= n) {
                    bool hasLeadingSpace = false;
                    if (!firstInSeg && i < n && s.text[i] == ' ') {
                        hasLeadingSpace = true; ++i;
                    }
                    firstInSeg = false;

                    int wordStart = i;
                    while (i < n && s.text[i] != ' ') ++i;
                    QString word = s.text.mid(wordStart, i - wordStart);
                    if (word.isEmpty() && i >= n) break;

                    int spaceW = hasLeadingSpace ? fm.horizontalAdvance(' ') : 0;
                    int wordW  = fm.horizontalAdvance(word);

                    if (cx > PAD && cx + spaceW + wordW > logW - PAD) {
                        newRow();
                        if (curY > logH - PAD) break;
                        spaceW = 0;
                    }
                    // Always re-set font/color: MicroTeX may have changed them.
                    painter.setFont(f);
                    painter.setPen(ann.fontColor);
                    cx += spaceW;
                    painter.drawText(cx, curY, word);
                    cx += wordW;
                }
            } else {
                // ── Inline math: ONE parse to measure, ONE draw ───────────
                // Parse at available width first.
                int availW = qMax(10, logW - cx - PAD);
                tex::TeXRender* r = nullptr;
                try {
                    r = tex::LaTeX::parse(
                        s.text.trimmed().toStdWString(),
                        availW, textSize, textSize * 0.2f, mathColor);
                } catch (...) {}

                if (!r) {
                    // Fallback: draw as literal text
                    painter.setFont(f); painter.setPen(ann.fontColor);
                    QString fb = "$" + s.text + "$";
                    painter.drawText(cx, curY, fb);
                    cx += fm.horizontalAdvance(fb);
                    continue;
                }

                int rw = r->getWidth();
                int rh = r->getHeight();

                // If it doesn't fit and we're not at row start, wrap first.
                if (cx > PAD && cx + rw > logW - PAD) {
                    delete r; r = nullptr;
                    newRow();
                    if (curY > logH - PAD) continue;
                    // Re-parse at full row width after wrapping (2nd parse, only on wrap).
                    availW = qMax(10, logW - 2*PAD);
                    try {
                        r = tex::LaTeX::parse(
                            s.text.trimmed().toStdWString(),
                            availW, textSize, textSize * 0.2f, mathColor);
                    } catch (...) {}
                    if (!r) continue;
                    rw = r->getWidth();
                    rh = r->getHeight();
                }

                rowH = qMax(rowH, rh);
                int mathAscent = rh - r->getDepth();
                int topY = curY - mathAscent;
                // If math clips at the top of the pixmap, push the baseline
                // down enough to fit — this fixes tall formulas (dfrac, int…).
                if (topY < PAD) {
                    curY += (PAD - topY);
                    topY = PAD;
                }
                painter.save();
                { tex::Graphics2D_qt g2(&painter); r->draw(g2, cx, topY); }
                painter.restore();
                cx += rw + 2;
                delete r;
            }
        }
        // Flush the last visual row of this logical line.
        newRow();
    }

    painter.end();
    ann.cachedPixmap = pm;
}

// Show a plain-text QTextEdit overlay for creating or editing an annotation.
// editIndex < 0  : creating a new annotation at screenRect
// editIndex >= 0 : editing textAnnotations[editIndex] (uses its screen rect)
void HeyGeoView::showTextEditAt(QRect screenRect, int editIndex)
{
    cancelTextAnnotation();   // discard any previous uncommitted widget

    if (editIndex >= 0 && editIndex < textAnnotations.size()) {
        // Derive screen rect from the existing annotation
        const TextAnnotation &ann = textAnnotations[editIndex];
        int sx = qRound(zoom * (ann.worldX + offsetX));
        int sy = qRound(zoom * (ann.worldY + offsetY));
        int sw = qMax(80, qRound(zoom * ann.worldW));
        int sh = qMax(30, qRound(zoom * ann.worldH));
        screenRect = QRect(sx, sy, sw, sh);
    } else {
        if (screenRect.width()  < 80) screenRect.setWidth(160);
        if (screenRect.height() < 30) screenRect.setHeight(40);
        editIndex = -1;
    }

    textEditAnnotationIndex = editIndex;

    textEditWidget = new QTextEdit(this);
    textEditWidget->setAcceptRichText(false);
    textEditWidget->setLineWrapMode(QTextEdit::WidgetWidth);
    textEditWidget->setFrameShape(QFrame::NoFrame);       // no Qt frame
    textEditWidget->setAttribute(Qt::WA_MacShowFocusRect, false);
    {
        QFont mono("Courier");
        mono.setPointSize(10);
        textEditWidget->setFont(mono);
    }
    textEditWidget->setGeometry(screenRect);
    // Single border via stylesheet only (NoFrame above removes Qt's own border)
    textEditWidget->setStyleSheet(
        "QTextEdit { "
        "  background: rgba(255,253,231,220); "
        "  border: 2px solid #4477cc; "
        "  border-radius: 3px; "
        "  padding: 2px; "
        "  outline: none; "
        "}");

    // Pre-fill in 'ugly' (LaTeX-like) form when editing an existing annotation
    if (editIndex >= 0 && !textAnnotations[editIndex].content.isEmpty())
        textEditWidget->setPlainText(textAnnotations[editIndex].content);
    else
        textEditWidget->setPlaceholderText("LaTeX, e.g. \\frac{a}{b}");

    textEditWidget->installEventFilter(this);
    textEditWidget->show();
    textEditWidget->setFocus();
    // Place cursor at end so user can continue editing naturally
    {
        QTextCursor cur = textEditWidget->textCursor();
        cur.movePosition(QTextCursor::End);
        textEditWidget->setTextCursor(cur);
    }

    // ── Font toolbar (appears above the text edit widget) ──────────────────
    QWidget* toolbar = new QWidget(this);
    toolbar->setObjectName("annToolbar");
    toolbar->setStyleSheet(
        "QWidget#annToolbar { background: #f0f0f0; "
        "border: 1px solid #bbb; border-radius: 3px; }");
    QHBoxLayout* tl = new QHBoxLayout(toolbar);
    tl->setContentsMargins(6, 2, 6, 2);
    tl->setSpacing(4);

    QLabel* szLabel = new QLabel("Cỡ chữ:", toolbar);
    szLabel->setFont(QFont("Helvetica Neue", 10));

    QSpinBox* szBox = new QSpinBox(toolbar);
    int initFontSize = (editIndex >= 0 && editIndex < textAnnotations.size())
                       ? textAnnotations[editIndex].fontSize : 14;
    szBox->setRange(6, 72);
    szBox->setValue(initFontSize);
    szBox->setFixedWidth(52);
    szBox->setFont(QFont("Helvetica Neue", 10));
    szBox->setToolTip("Font size (pt)");

    QPushButton* colorBtn = new QPushButton("A", toolbar);
    QColor initColor = (editIndex >= 0 && editIndex < textAnnotations.size())
                       ? textAnnotations[editIndex].fontColor : QColor(Qt::black);
    colorBtn->setFixedSize(28, 22);
    colorBtn->setToolTip("Text color");
    colorBtn->setProperty("annColor", initColor);
    colorBtn->setStyleSheet(
        QString("QPushButton { color: %1; font-weight: bold; "
                "border: 1px solid #aaa; border-radius: 2px; }")
        .arg(initColor.name()));
    connect(colorBtn, &QPushButton::clicked, [colorBtn, this]() {
        QColor c = QColorDialog::getColor(
            colorBtn->property("annColor").value<QColor>(), this, "Text Color");
        if (c.isValid()) {
            colorBtn->setProperty("annColor", c);
            colorBtn->setStyleSheet(
                QString("QPushButton { color: %1; font-weight: bold; "
                        "border: 1px solid #aaa; border-radius: 2px; }")
                .arg(c.name()));
        }
        // Return focus to the text edit so FocusOut doesn't commit prematurely
        if (textEditWidget) textEditWidget->setFocus();
    });

    tl->addWidget(szLabel);
    tl->addWidget(szBox);
    tl->addSpacing(4);
    tl->addWidget(colorBtn);
    tl->addStretch();
    toolbar->adjustSize();

    // Position toolbar just above the text edit area
    int tbH = toolbar->sizeHint().height();
    int tbX = screenRect.left();
    int tbY = qMax(0, screenRect.top() - tbH - 2);
    toolbar->setGeometry(tbX, tbY, qMax(180, screenRect.width()), tbH);
    toolbar->show();
    toolbar->raise();
    annToolbar      = toolbar;
    annFontSizeSpin = szBox;
    annColorBtn     = colorBtn;
}

// Commit the current textEditWidget content.
void HeyGeoView::commitTextAnnotation()
{
    if (textEditCommitting) return;
    if (!textEditWidget) return;

    textEditCommitting = true;
    QString content = textEditWidget->toPlainText().trimmed();

    // Read font settings from the toolbar before it gets cleaned up.
    int    annFontSize = annFontSizeSpin ? annFontSizeSpin->value() : 14;
    QColor annFontClr  = annColorBtn
                         ? annColorBtn->property("annColor").value<QColor>()
                         : QColor(Qt::black);

    // Clean up the font toolbar now (before any potential recursive calls).
    if (annToolbar) {
        annToolbar->hide();
        annToolbar->deleteLater();
        annToolbar      = nullptr;
        annFontSizeSpin = nullptr;
        annColorBtn     = nullptr;
    }

    if (!content.isEmpty()) {
        QRect geom = textEditWidget->geometry();
        TextAnnotation ann;
        ann.worldX    = geom.left()   / zoom - offsetX;
        ann.worldY    = geom.top()    / zoom - offsetY;
        ann.worldW    = geom.width()  / zoom;
        ann.worldH    = geom.height() / zoom;
        ann.content   = content;
        ann.fontSize  = annFontSize;
        ann.fontColor = annFontClr;

        if (textEditAnnotationIndex >= 0 &&
            textEditAnnotationIndex < textAnnotations.size()) {
            // Editing an existing annotation: replace in-place
            textAnnotations[textEditAnnotationIndex] = ann;
            textAnnotationSelected = textEditAnnotationIndex;
        } else {
            // New annotation
            textAnnotations.append(ann);
            textAnnotationSelected = textAnnotations.size() - 1;
        }
        rebuildAnnotationCache(textAnnotationSelected); // render now, blit later
        doc->emitDocumentModified();
    } else if (textEditAnnotationIndex >= 0 &&
               textEditAnnotationIndex < textAnnotations.size()) {
        // User cleared content → delete the annotation
        textAnnotations.removeAt(textEditAnnotationIndex);
        textAnnotationSelected = -1;
        doc->emitDocumentModified();
    }

    textEditAnnotationIndex = -1;
    textEditWidget->removeEventFilter(this);
    textEditWidget->hide();
    textEditWidget->deleteLater();
    textEditWidget = nullptr;
    textEditCommitting = false;
    repaint();
}

// Discard the current text edit widget without creating an annotation.
void HeyGeoView::cancelTextAnnotation()
{
    if (!textEditWidget) return;
    // Clean up font toolbar
    if (annToolbar) {
        annToolbar->hide();
        annToolbar->deleteLater();
        annToolbar      = nullptr;
        annFontSizeSpin = nullptr;
        annColorBtn     = nullptr;
    }
    textEditWidget->removeEventFilter(this);
    textEditWidget->hide();
    textEditWidget->deleteLater();
    textEditWidget = nullptr;
    repaint();
}

// Event filter – handles QTextEdit focus-out, Escape and Enter.
bool HeyGeoView::eventFilter(QObject *obj, QEvent *event)
{
    if (obj == textEditWidget) {
        if (event->type() == QEvent::FocusOut) {
            // Don't commit if focus moved to our font toolbar (spinbox or color button).
            QWidget *fw = QApplication::focusWidget();
            if (annToolbar && fw && (fw == annToolbar || annToolbar->isAncestorOf(fw)))
                return false;
            // Use a queued call so the widget is still alive during processing
            QMetaObject::invokeMethod(this, [this]{ commitTextAnnotation(); },
                                      Qt::QueuedConnection);
            return false;
        }
        if (event->type() == QEvent::KeyPress) {
            QKeyEvent *ke = static_cast<QKeyEvent *>(event);
            if (ke->key() == Qt::Key_Escape) {
                cancelTextAnnotation();
                return true;   // consumed
            }
            if (ke->key() == Qt::Key_Return || ke->key() == Qt::Key_Enter) {
                if (!(ke->modifiers() & Qt::ShiftModifier)) {
                    // Enter → commit; Shift+Enter → insert newline in formula
                    commitTextAnnotation();
                    return true;
                }
            }
        }
    }
    return QWidget::eventFilter(obj, event);
}

void HeyGeoView::setToolMode(ToolMode mode)
{
    // Commit any open text-edit widget before switching tools
    if (currentTool == TEXT_TOOL && mode != TEXT_TOOL) {
        commitTextAnnotation();
        textHoveredRef     = nullptr;
        textLastClickedRef = nullptr;
    }

    cancelCurrentTool();
    toolHoveredRefs.clear();
    toolHoveredIsIntersection = false;
    currentTool = mode;
    unsetCursor();

    if (mode == TEXT_TOOL) {
        setCursor(Qt::ArrowCursor);
    }

    updateStatusBar(Qt::NoModifier);
    emit toolModeChanged(mode);
    repaint();
}

void HeyGeoView::cancelCurrentTool()
{
    toolAccumPoints.clear();
    toolRubberbandActive = false;
    toolHoveredRefs.clear();
    toolHoveredIsIntersection = false;
    if(currentTool != SELECTION_TOOL) {
        unsetCursor();
        emit statusBarMessage(tr("Ready"));
    }
    repaint();
}

// ── Escape key cancels any in-progress tool sequence ─────────────────────────

void HeyGeoView::keyPressEvent(QKeyEvent *e)
{
    if(e->key() == Qt::Key_Escape) {
        // Escape while text-edit is active → cancel annotation
        if(textEditWidget) {
            cancelTextAnnotation();
            return;
        }
        if(currentTool != SELECTION_TOOL) {
            cancelCurrentTool();
            setToolMode(SELECTION_TOOL);
            emit toolModeChanged(SELECTION_TOOL);
            return;
        }
    }
    // Delete or Backspace: delete selected text annotation first;
    // if none selected, fall through to geometry deletion.
    if(e->key() == Qt::Key_Delete || e->key() == Qt::Key_Backspace) {
        if(textAnnotationSelected >= 0 && textAnnotationSelected < textAnnotations.size()) {
            textAnnotations.removeAt(textAnnotationSelected);
            textAnnotationSelected = -1;
            doc->emitDocumentModified();
            repaint();
            return;
        }
        if(doc->canEditDelete()) {
            doc->editDelete();
            doc->emitDocumentChanged();
            return;
        }
    }
    // Cmd+A: chọn theo loại dựa trên công cụ đang active (giống GSP)
    if(e->key() == Qt::Key_A && (e->modifiers() & Qt::ControlModifier)) {
        selectAllForActiveTool();
        return;
    }
    QWidget::keyPressEvent(e);
}

void HeyGeoView::selectAllForActiveTool()
{
    int typeMask = 0; // 0 = chọn tất cả
    switch(currentTool) {
    case POINT_TOOL:                                  typeMask = G_POINT;   break;
    case SEGMENT_TOOL:                                typeMask = G_SEGMENT; break;
    case RAY_TOOL:                                    typeMask = G_RAY;     break;
    case LINE_TOOL:                                   typeMask = G_LINE;    break;
    case COMPASS_TOOL:                                typeMask = G_CIRCLE;  break;
    case POLYGON_TOOL: case FILLED_POLYGON_TOOL:      typeMask = G_POLYGON; break;
    default:                                          typeMask = 0;         break;
    }
    doc->editSelectAllOfType(typeMask);
    doc->emitDocumentChanged();
}

// ── Point creation / snap helper ─────────────────────────────────────────────
// Returns an existing point if there is one within snap range, otherwise
// creates a new free / constrained / intersection point at (x, y).

G_ref *HeyGeoView::getOrCreatePoint(int x, int y)
{
    ViewTransform vt(offsetX, offsetY, zoom);

    // whatAmIOn with pointsOnly=true: if there is a point within 6 px, get it;
    // otherwise get the curves at this position (see HeyGeoDocument::whatAmIOn).
    G_refs tmp = doc->whatAmIOn(x, y, vt); // pointsOnly=true (default)

    // Snap to existing POINT
    if(tmp.count() > 0 && tmp[0]->getType() == G_POINT)
        return tmp[0];

    // Collect curve objects
    G_refs curves;
    for(int i = 0; i < tmp.count(); i++)
        if(tmp[i]->getType() & (G_CURVE | G_FUNCTIONPLOT | G_PARAMCURVE))
            curves.append(tmp[i]);

    G_ref *p = new G_ref();

    if(curves.count() >= 2) {
        // Try intersection
        G_point int1 = curves[0]->getObject()->getCurveRef()
                            ->getIntersection(curves[1]->getObject()->getCurveRef());
        G_point int2 = curves[0]->getObject()->getCurveRef()
                            ->getIntersection(curves[1]->getObject()->getCurveRef(), 1);
        G_point screen1 = zoom * (int1 + G_point(offsetX, offsetY));
        G_point screen2 = zoom * (int2 + G_point(offsetX, offsetY));
        G_point click(x, y);

        if((click - screen1).length() < 10) {
            G_refs par; par.append(curves[0]); par.append(curves[1]);
            p->create(G_POINT, G_INTERSECTION_POINT, par, doc);
            p->update();
            return p;
        }
        if((click - screen2).length() < 10) {
            G_refs par; par.append(curves[0]); par.append(curves[1]);
            p->create(G_POINT, G_INTERSECTION2_POINT, par, doc);
            p->update();
            return p;
        }
    }

    if(curves.count() >= 1) {
        // Constrained point on curve
        G_refs par; par.append(curves[0]);
        p->create(G_POINT, G_CONSTRAINED_POINT, par, doc);
        ((G_pointObject *)(p->getObject()))
            ->setPoint(G_point(x, y) / zoom - G_point(offsetX, offsetY));
        p->update();
        return p;
    }

    // Free point
    p->create(G_POINT, G_FREE_POINT, G_refs(), doc);
    ((G_pointObject *)(p->getObject()))
        ->setPoint(G_point(x, y) / zoom - G_point(offsetX, offsetY));
    return p;
}

// ── Main tool click dispatcher ────────────────────────────────────────────────

void HeyGeoView::handleToolClick(int x, int y)
{
    switch(currentTool) {

    // ── POINT ─────────────────────────────────────────────────────────────────
    case POINT_TOOL: {
        doc->clearSel();
        G_ref *p = getOrCreatePoint(x, y);
        doc->addSel(p);
        doc->emitDocumentChanged();
        doc->emitDocumentModified();
        break;
    }

    // ── COMPASS / CIRCLE (2 clicks: centre → point on circle) ────────────────
    case COMPASS_TOOL: {
        if(toolAccumPoints.count() == 0) {
            doc->clearSel();
            G_ref *centre = getOrCreatePoint(x, y);
            doc->addSel(centre);
            toolAccumPoints.append(centre);
            toolRubberbandActive = true;
            toolMouseX = x;
            toolMouseY = y;
            doc->emitDocumentChanged();
        } else {
            G_ref *centre = toolAccumPoints[0];
            doc->clearSel();
            G_ref *onCircle = getOrCreatePoint(x, y);

            G_refs par;
            par.append(centre);
            par.append(onCircle);
            G_ref *circle = new G_ref();
            circle->create(G_CIRCLE, G_CENTERPOINT_CIRCLE, par, doc);

            toolAccumPoints.clear();
            toolRubberbandActive = false;
            doc->clearSel();
            doc->addSel(circle);
            doc->emitDocumentChanged();
            doc->emitDocumentModified();
        }
        break;
    }

    // ── SEGMENT (2 clicks) ────────────────────────────────────────────────────
    case SEGMENT_TOOL: {
        if(toolAccumPoints.count() == 0) {
            doc->clearSel();
            G_ref *pt = getOrCreatePoint(x, y);
            doc->addSel(pt);
            toolAccumPoints.append(pt);
            toolRubberbandActive = true;
            toolMouseX = x; toolMouseY = y;
            doc->emitDocumentChanged();
        } else {
            G_ref *pt1 = toolAccumPoints[0];
            doc->clearSel();
            G_ref *pt2 = getOrCreatePoint(x, y);
            G_refs par; par.append(pt1); par.append(pt2);
            G_ref *seg = new G_ref();
            seg->create(G_SEGMENT, G_ENDPOINTS_SEGMENT, par, doc);
            toolAccumPoints.clear();
            toolRubberbandActive = false;
            doc->clearSel();
            doc->addSel(seg);
            doc->emitDocumentChanged();
            doc->emitDocumentModified();
        }
        break;
    }

    // ── RAY (2 clicks: origin → direction) ───────────────────────────────────
    case RAY_TOOL: {
        if(toolAccumPoints.count() == 0) {
            doc->clearSel();
            G_ref *pt = getOrCreatePoint(x, y);
            doc->addSel(pt);
            toolAccumPoints.append(pt);
            toolRubberbandActive = true;
            toolMouseX = x; toolMouseY = y;
            doc->emitDocumentChanged();
        } else {
            G_ref *pt1 = toolAccumPoints[0];
            doc->clearSel();
            G_ref *pt2 = getOrCreatePoint(x, y);
            G_refs par; par.append(pt1); par.append(pt2);
            G_ref *ray = new G_ref();
            ray->create(G_RAY, G_TWOPOINTS_RAY, par, doc);
            toolAccumPoints.clear();
            toolRubberbandActive = false;
            doc->clearSel();
            doc->addSel(ray);
            doc->emitDocumentChanged();
            doc->emitDocumentModified();
        }
        break;
    }

    // ── LINE (2 clicks) ───────────────────────────────────────────────────────
    case LINE_TOOL: {
        if(toolAccumPoints.count() == 0) {
            doc->clearSel();
            G_ref *pt = getOrCreatePoint(x, y);
            doc->addSel(pt);
            toolAccumPoints.append(pt);
            toolRubberbandActive = true;
            toolMouseX = x; toolMouseY = y;
            doc->emitDocumentChanged();
        } else {
            G_ref *pt1 = toolAccumPoints[0];
            doc->clearSel();
            G_ref *pt2 = getOrCreatePoint(x, y);
            G_refs par; par.append(pt1); par.append(pt2);
            G_ref *line = new G_ref();
            line->create(G_LINE, G_TWOPOINTS_LINE, par, doc);
            toolAccumPoints.clear();
            toolRubberbandActive = false;
            doc->clearSel();
            doc->addSel(line);
            doc->emitDocumentChanged();
            doc->emitDocumentModified();
        }
        break;
    }

    // ── POLYGON (accumulate vertices; double-click to finish) ─────────────────
    case POLYGON_TOOL:
    case FILLED_POLYGON_TOOL:
    case OPEN_POLYGON_TOOL: {
        doc->clearSel();
        G_ref *pt = getOrCreatePoint(x, y);
        doc->addSel(pt);
        toolAccumPoints.append(pt);
        toolRubberbandActive = (toolAccumPoints.count() >= 2);
        toolMouseX = x; toolMouseY = y;
        doc->emitDocumentChanged();
        break;
    }

    // ── TEXT: toggle label of clicked object ──────────────────────────────────
    case TEXT_TOOL: {
        G_refs tmp = doc->whatAmIOn(x, y, ViewTransform(offsetX, offsetY, zoom));
        if(tmp.count() > 0) {
            doc->clearSel();
            doc->addSel(tmp[0]);
            if(doc->canEditToggleLabels())
                doc->editToggleLabels();
        }
        doc->emitDocumentChanged();
        break;
    }

    // ── INFO: show basic object information ────────────────────────────────────
    case INFO_TOOL: {
        G_refs tmp = doc->whatAmIOn(x, y, ViewTransform(offsetX, offsetY, zoom));
        if(tmp.count() > 0) {
            G_ref *r = tmp[0];
            QString info;
            info += tr("Label: %1\n").arg(r->getLabel().getText());
            info += tr("Type:  %1\n").arg(G_ref::getNameFromType(r->getType()));
            info += tr("Visible: %1").arg(r->isDrawn() ? tr("Yes") : tr("No"));
            QMessageBox::information(this, tr("Object Information"), info);
        }
        break;
    }

    // ── PEN: not yet fully implemented – placeholder ──────────────────────────
    case PEN_TOOL:
        emit statusBarMessage(tr("Pen tool: select a segment or angle to mark it"));
        break;

    // ── CUSTOM: delegate to play-construction ────────────────────────────────
    case CUSTOM_TOOL:
        emit statusBarMessage(tr("Custom tool: use Play menu to run constructions"));
        break;

    default:
        break;
    }
}

// ── Double-click handler for polygon completion ───────────────────────────────

void HeyGeoView::handleToolDoubleClick(int x, int y)
{
    if(toolAccumPoints.count() < 3) {
        // Not enough points yet – add a vertex instead
        handleToolClick(x, y);
        return;
    }

    // For open polyline: just finish (no closing edge)
    // For polygon/filled polygon: create a closed G_POLYGON
    if(currentTool == OPEN_POLYGON_TOOL) {
        // Create a series of segments (open polyline)
        for(int i = 0; i < toolAccumPoints.count() - 1; i++) {
            G_refs par;
            par.append(toolAccumPoints[i]);
            par.append(toolAccumPoints[i + 1]);
            G_ref *seg = new G_ref();
            seg->create(G_SEGMENT, G_ENDPOINTS_SEGMENT, par, doc);
        }
    } else {
        G_ref *poly = new G_ref();
        poly->create(G_POLYGON, G_DEFAULT_FILLED, toolAccumPoints, doc);
        doc->clearSel();
        doc->addSel(poly);
    }

    toolAccumPoints.clear();
    toolRubberbandActive = false;
    doc->emitDocumentChanged();
    doc->emitDocumentModified();
}

// ── Rubber-band preview drawing ───────────────────────────────────────────────

void HeyGeoView::drawToolRubberband(QPainter &p)
{
    if(!toolRubberbandActive || toolAccumPoints.count() == 0)
        return;

    p.setRenderHint(QPainter::Antialiasing, true);

    QPen rubberPen(QColor(60, 120, 220));
    rubberPen.setStyle(Qt::DashLine);
    rubberPen.setWidth(1);
    p.setPen(rubberPen);
    p.setBrush(Qt::NoBrush);

    // Helper lambda: world → screen
    auto toScreen = [&](const G_point &wp) -> QPointF {
        return QPointF(zoom * (wp.getX() + offsetX),
                       zoom * (wp.getY() + offsetY));
    };

    switch(currentTool) {

    case COMPASS_TOOL: {
        // Draw rubber-band circle
        G_point centre = toolAccumPoints[0]->getObject()->getPoint();
        QPointF cs = toScreen(centre);
        double radius = std::hypot(toolMouseX - cs.x(), toolMouseY - cs.y());
        p.drawEllipse(cs, radius, radius);
        break;
    }

    case SEGMENT_TOOL: {
        G_point pt1 = toolAccumPoints[0]->getObject()->getPoint();
        QPointF s1 = toScreen(pt1);
        p.drawLine(s1, QPointF(toolMouseX, toolMouseY));
        break;
    }

    case RAY_TOOL: {
        G_point pt1 = toolAccumPoints[0]->getObject()->getPoint();
        QPointF s1 = toScreen(pt1);
        double dx = toolMouseX - s1.x();
        double dy = toolMouseY - s1.y();
        double len = std::hypot(dx, dy);
        if(len > 0.001) {
            double ext = 3000.0; // extend well beyond screen
            p.drawLine(s1, QPointF(s1.x() + dx / len * ext,
                                    s1.y() + dy / len * ext));
        }
        break;
    }

    case LINE_TOOL: {
        G_point pt1 = toolAccumPoints[0]->getObject()->getPoint();
        QPointF s1 = toScreen(pt1);
        double dx = toolMouseX - s1.x();
        double dy = toolMouseY - s1.y();
        double len = std::hypot(dx, dy);
        if(len > 0.001) {
            double ext = 3000.0;
            p.drawLine(QPointF(s1.x() - dx / len * ext, s1.y() - dy / len * ext),
                       QPointF(s1.x() + dx / len * ext, s1.y() + dy / len * ext));
        }
        break;
    }

    case POLYGON_TOOL:
    case FILLED_POLYGON_TOOL:
    case OPEN_POLYGON_TOOL: {
        // Draw lines between accumulated points
        for(int i = 0; i < toolAccumPoints.count() - 1; i++) {
            QPointF a = toScreen(toolAccumPoints[i]->getObject()->getPoint());
            QPointF b = toScreen(toolAccumPoints[i + 1]->getObject()->getPoint());
            p.drawLine(a, b);
        }
        // Last point → mouse
        if(toolAccumPoints.count() >= 1) {
            QPointF lastPt = toScreen(toolAccumPoints[toolAccumPoints.count()-1]->getObject()->getPoint());
            p.drawLine(lastPt, QPointF(toolMouseX, toolMouseY));
        }
        break;
    }

    default:
        break;
    }
}

void HeyGeoView::saveAnnotations(QDataStream &stream) const
{
    stream << (qint32)textAnnotations.size();
    for (const TextAnnotation &ann : textAnnotations) {
        stream << ann.worldX << ann.worldY << ann.worldW << ann.worldH;
        stream << ann.content;
        stream << (qint32)ann.fontSize;
        stream << ann.fontColor;
    }
}

void HeyGeoView::loadAnnotations(QDataStream &stream)
{
    textAnnotations.clear();
    textAnnotationSelected = -1;

    // Sanity check: if the stream is already at EOF or in error (e.g. an old
    // file that has no annotation data), stop immediately.
    if (stream.status() != QDataStream::Ok) return;

    qint32 count = 0;
    stream >> count;

    // Guard against garbage count values (old files may have stray bytes at
    // the end, e.g. "HGAT\0\0\0\0", which decode to ~1.2 billion).
    // A document cannot legitimately have more than a few thousand annotations.
    if (stream.status() != QDataStream::Ok || count < 0 || count > 100000) {
        stream.resetStatus();
        return;
    }

    for (qint32 i = 0; i < count; ++i) {
        if (stream.status() != QDataStream::Ok) break;
        TextAnnotation ann;
        stream >> ann.worldX >> ann.worldY >> ann.worldW >> ann.worldH;
        stream >> ann.content;
        qint32 fs = 14;
        stream >> fs;
        ann.fontSize = (int)fs;
        stream >> ann.fontColor;
        textAnnotations.append(ann);
    }
    for (int i = 0; i < textAnnotations.size(); ++i)
        rebuildAnnotationCache(i);
    repaint();
}

// ── GSP-style hover highlight ─────────────────────────────────────────────────
// Draws a red glow/halo around any snap target under the cursor while
// a construction tool is active.  Called from paintEvent after drawToolRubberband.
void HeyGeoView::drawToolHoverHighlight(QPainter &p)
{
    // Draw a red selection border around the Values-menu or Calculate-editor
    // hovered G_VALUE object, regardless of which tool is active.
    if (calcHoverRef && calcHoverRef->isDrawn()) {
        ViewTransform vt(offsetX, offsetY, zoom);
        ViewTransform inv(-vt.offsetX * vt.zoom, -vt.offsetY * vt.zoom, 1.0 / vt.zoom);
        calcHoverRef->getObject()->tempTransform(vt);
        QRect ext = calcHoverRef->getObject()->getSelectExtents();
        ext.adjust(-3, -3, 3, 3);
        p.setPen(QPen(QColor(220, 30, 30), 2));
        p.setBrush(Qt::NoBrush);
        p.setRenderHint(QPainter::Antialiasing, false);
        p.drawRect(ext);
        calcHoverRef->getObject()->tempTransform(inv);
    }

    if(toolHoveredRefs.empty() || currentTool == SELECTION_TOOL) return;
    p.setRenderHint(QPainter::Antialiasing, true);
    ViewTransform vt(offsetX, offsetY, zoom);
    ViewTransform inv(-vt.offsetX * vt.zoom, -vt.offsetY * vt.zoom, 1.0 / vt.zoom);
    const QColor kRed(220, 30, 30);

    for(int i = 0; i < (int)toolHoveredRefs.count(); i++) {
        G_ref *ref = toolHoveredRefs[i];
        if(!ref || !ref->isDrawn()) continue;
        ref->getObject()->tempTransform(vt);
        bool isPoint = (ref->getType() == G_POINT);

        if(isPoint) {
            // Soft halo ring centered on the dot
            G_point sp = ref->getObject()->getPoint();
            QPointF c(sp.getX(), sp.getY());
            const qreal rDot = 5.0, rGlow = rDot + 5.5;
            qreal t = rDot / rGlow;
            QRadialGradient grad(c, rGlow);
            grad.setColorAt(0.0, QColor(0,0,0,0));
            grad.setColorAt(t * 0.70, QColor(0,0,0,0));
            grad.setColorAt(t, QColor(0,0,0,160));
            grad.setColorAt(qMin(t + 0.30, 1.0), QColor(0,0,0,0));
            p.setPen(Qt::NoPen);
            p.setBrush(QBrush(grad));
            p.drawEllipse(c, rGlow, rGlow);
            // Red filled dot
            p.setBrush(QBrush(kRed));
            p.drawEllipse(c, rDot, rDot);
        } else {
            // 3-pass gradient shadow then red highlight stroke
            int origW = qMax(ref->getDrawstyle()->getPen().width(), 1);
            G_geometry *geo = ref->getObject()->getGeoRef();
            // For function/parametric plots, getGeoRef() is null; use the
            // plot object's own draw(QPainter, drawstyle) instead.
            G_functionPlotObject *fpObj =
                geo ? nullptr : dynamic_cast<G_functionPlotObject*>(ref->getObject());
            G_paramCurveObject *pcObj =
                geo ? nullptr : dynamic_cast<G_paramCurveObject*>(ref->getObject());
            struct Pass { int extra; int alpha; };
            const Pass kPasses[] = {{7, 22}, {4, 55}, {2, 100}};
            for(const Pass &k : kPasses) {
                QPen sp(QColor(0,0,0,k.alpha), origW + k.extra);
                sp.setCapStyle(Qt::RoundCap); sp.setJoinStyle(Qt::RoundJoin);
                G_drawstyle *sd = G_drawstyle::match(ANY, nullptr, &sp);
                if(geo) geo->draw(p, *sd, false);
                else if(fpObj) fpObj->getFunctionPlot().draw(p, *sd, false);
                else if(pcObj) pcObj->getParamCurve().draw(p, *sd, false);
                else { p.setPen(sp); ref->getObject()->draw(p); }
                sd->deleteReference();
            }
            QPen hlPen(kRed, origW + 2);
            hlPen.setCapStyle(Qt::RoundCap); hlPen.setJoinStyle(Qt::RoundJoin);
            G_drawstyle *hl = G_drawstyle::match(ANY, nullptr, &hlPen);
            if(geo) geo->draw(p, *hl, false);
            else if(fpObj) fpObj->getFunctionPlot().draw(p, *hl, false);
            else if(pcObj) pcObj->getParamCurve().draw(p, *hl, false);
            else { p.setPen(hlPen); ref->getObject()->draw(p); }
            hl->deleteReference();
        }
        ref->getObject()->tempTransform(inv);
    }

    // Re-draw all visible points on top so highlights don't cover A, B, C etc.
    const G_refs &all = doc->getAllRefs();
    for(int i = 0; i < (int)all.count(); i++)
        if(all[i]->isDrawn()) all[i]->getObject()->tempTransform(vt);
    for(int i = 0; i < (int)all.count(); i++)
        if(all[i]->getType() == G_POINT && all[i]->isDrawn())
            all[i]->getObject()->draw(p);
    for(int i = 0; i < (int)all.count(); i++)
        if(all[i]->isDrawn()) all[i]->getObject()->tempTransform(inv);
}
