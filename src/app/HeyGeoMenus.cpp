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

#include "defs.H"
#include <QApplication>
#include <QFileInfo>
#include <QPixmap>
#include <QMenu>

#include "HeyGeoMenuMaintainer.H"
#include "HeyGeoProperties.H"
#include "HeyGeoWindow.H"
#include "HeyGeoView.H"
#include "HeyGeoDocument.H"
#include "HeyGeoConstruction.H"

//View menu pics
#include "pics/pan.xpm"
#include "pics/zoom.xpm"
#include "pics/zoomOrig.xpm"
#include "pics/zoomFit.xpm"

//New menu pics
#include "pics/intersection.xpm"
#include "pics/line.xpm"
#include "pics/ray.xpm"
#include "pics/segment.xpm"
#include "pics/midpoint.xpm"
#include "pics/perpendicular.xpm"
#include "pics/parallel.xpm"
#include "pics/circle.xpm"
#include "pics/arc.xpm"
#include "pics/bisector.xpm"
#include "pics/locus.xpm"
#include "pics/polygon.xpm"
#include "pics/sector.xpm"
#include "pics/arcsegment.xpm"
#include "pics/circleinterior.xpm"

//Measure menu pics
#include "pics/distance.xpm"
#include "pics/length.xpm"
#include "pics/radius.xpm"
#include "pics/angle.xpm"
#include "pics/ratio.xpm"
#include "pics/slope.xpm"
#include "pics/area.xpm"
#include "pics/calculate.xpm"

//Transform menu pics
#include "pics/vector.xpm"
#include "pics/mirror.xpm"
#include "pics/center.xpm"
#include "pics/chooseangle.xpm"
#include "pics/chooseratio.xpm"
#include "pics/translate.xpm"
#include "pics/reflect.xpm"
#include "pics/scale.xpm"
#include "pics/rotate.xpm"

/*------------------------- some generic ones ---------------------*/

// "Under Development" menu item -- shows a notification dialog
class UDInfo : public HeyGeoCommandInfo
{
public:
  UDInfo(QString text) : HeyGeoCommandInfo(), txt(text) {}
  QString menuText(HeyGeoWindow *) { return txt; }
  QObject *receiver(HeyGeoWindow *win) { return win; }
  const char *member() { return SLOT(showUnderDevelopment()); }
protected:
  QString txt;
};

class PopupInfo : public HeyGeoCommandInfo
{
public:
  PopupInfo(QString text, bool (HeyGeoDocument::*function)() = NULL) : HeyGeoCommandInfo(), f(function), txt(text) {}
  
  QString menuText(HeyGeoWindow *) { return txt; }
  
protected:
  bool privateIsEnabled(HeyGeoWindow *win)
  {
    if(!f) return true;
    return ((win->getView()->getDocument())->*f)();
  }

  bool (HeyGeoDocument::*f)();
  QString txt;
};


class SCInfo : public HeyGeoCommandInfo //StaticCommandInfo
{
public:
  enum ReceiverType { Window, View, Document, App };

  SCInfo(QString text, ReceiverType receiver, const char *member, QKeySequence shortCutKey = {}, QIcon is = QIcon())
    : HeyGeoCommandInfo(), txt(text), rec(receiver), mem(member), key(shortCutKey), iconset(is) {}

  QString menuText(HeyGeoWindow *) { return txt; }
  QIcon iconSet(HeyGeoWindow *) { return iconset; }
  QObject *receiver(HeyGeoWindow *win)
  {
    if(rec == Window) return win;
    if(rec == View) return win->getView();
    if(rec == Document) return win->getView()->getDocument();
    if(rec == App) return qApp;
    return NULL; //should not be here
  }
  const char *member() { return mem; }
  QKeySequence shortCutKey() { return key; }

protected:
  QString txt;
  ReceiverType rec;
  const char *mem;
  QKeySequence key;
  QIcon iconset;
};


class PCInfo : public SCInfo //PossibleCommandInfo--sometimes disabled
{
public:
  PCInfo(QString text, ReceiverType receiver, const char *member,
	 bool (HeyGeoDocument::*function)(), QKeySequence shortCutKey = {}, QIcon is = QIcon())
    : SCInfo(text, receiver, member, shortCutKey, is), f(function) {}

protected:
  bool privateIsEnabled(HeyGeoWindow *win) { return ((win->getView()->getDocument())->*f)(); }
  bool (HeyGeoDocument::*f)();
};


class CPCInfo : public SCInfo //ConstructionPossibleCommandInfo--sometimes disabled
{
public:
  CPCInfo(QString text, ReceiverType receiver, const char *member,
	 bool (HeyGeoConstruction::*function)(), QKeySequence shortCutKey = {})
    : SCInfo(text, receiver, member, shortCutKey), f(function) {}

protected:
  bool privateIsEnabled(HeyGeoWindow *win) {
    //the following for some reason works around a bug in some gcc compiler...
    HeyGeoConstruction *c = (HeyGeoConstruction *)(win->getView()->getDocument());
    if(f == &HeyGeoConstruction::canConstructionRecurse) {
      return c->canConstructionRecurse();
    }
    return (c->*f)();
  }
  bool (HeyGeoConstruction::*f)();
};


class MCInfo : public PCInfo //MultipleCommandInfo--plural or singular text
{
public:
  MCInfo(QString text, QString plural, ReceiverType receiver, const char *member,
	 bool (HeyGeoDocument::*function)(), QKeySequence shortCutKey = {}, int pluralCount = 2, QIcon is = QIcon())
    : PCInfo(text, receiver, member, function, shortCutKey, is), plur(plural), plurCount(pluralCount) {}

  QString menuText(HeyGeoWindow *win)
  {
    if(privateIsEnabled(win) == false) return txt;
    return (win->getView()->getDocument()->selectedCount() < plurCount) ? txt : plur;
  }

protected:
  QString plur; //plural string for the menu
  int plurCount; //least number of selected objects for plural string to be displayed
};



/*------------------------File Menu-----------------------*/
class HeyGeoFileMenuMaintainer : public HeyGeoMenuMaintainer
{
public:
  HeyGeoFileMenuMaintainer(HeyGeoWindow *win) : HeyGeoMenuMaintainer(win)
  {
    menu = new QMenu();
    myInfo = new PopupInfo(qApp->translate("HeyGeoWindow", "&File"));
    
    add(new SCInfo(qApp->translate("HeyGeoWindow", "&New Sketch"),
                   SCInfo::Window, SLOT(newSketch()), Qt::CTRL|Qt::Key_N));
    add(new SCInfo(qApp->translate("HeyGeoWindow", "Ne&w Construction"),
                   SCInfo::Window, SLOT(newConstruction())));

    addSep();

    add(new SCInfo(qApp->translate("HeyGeoWindow", "&Open..."), SCInfo::Window,
                   SLOT(fileOpenInNewWindow()), Qt::CTRL|Qt::Key_O));
    add(new SCInfo(qApp->translate("HeyGeoWindow", "Open In Current &Window..."),
                   SCInfo::Window, SLOT(fileOpen())));

    addSep();

    add(new SCInfo(qApp->translate("HeyGeoWindow", "&Close"),
                   SCInfo::Window, SLOT(close()), Qt::CTRL|Qt::Key_W));
    add(new SCInfo(qApp->translate("HeyGeoWindow", "&Save"),
                   SCInfo::Window, SLOT(fileSave()), Qt::CTRL|Qt::Key_S));
    add(new SCInfo(qApp->translate("HeyGeoWindow", "Save &As..."),
                   SCInfo::Window, SLOT(fileSaveAs())));

    if(!win->getView()->getDocument()->isConstruction()) {
      addSep();
      add(new SCInfo(qApp->translate("HeyGeoWindow", "Copy As Construction"),
                     SCInfo::Window, SLOT(fileCopyAsConstruction())));
    }

    addSep();

    add(new UDInfo(qApp->translate("HeyGeoWindow", "Document &Options...")));

    addSep();

    add(new UDInfo(qApp->translate("HeyGeoWindow", "Print Pre&view...")));
    add(new SCInfo(qApp->translate("HeyGeoWindow", "&Print..."),
                   SCInfo::Window, SLOT(filePrint()), Qt::CTRL|Qt::Key_P));

    addSep();

    add(new SCInfo(qApp->translate("HeyGeoWindow", "E&xport To Image..."), SCInfo::Window,
                   SLOT(fileExportToImage())));
    add(new SCInfo(qApp->translate("HeyGeoWindow", "Export To S&VG..."), SCInfo::Window,
                   SLOT(fileToSVG())));
    add(new SCInfo(qApp->translate("HeyGeoWindow", "Export To &Web..."), SCInfo::Window,
                   SLOT(fileExportToWeb())));

    addSep();
    
    add(new SCInfo(qApp->translate("HeyGeoWindow", "Choose &Language..."),
                   SCInfo::Window, SLOT(fileChooseLanguage())));

    addSep();

    add(new SCInfo(qApp->translate("HeyGeoWindow", "&Quit"),
                   SCInfo::App, SLOT(closeAllWindows()), Qt::CTRL|Qt::Key_Q));

    addSep();

    itemCount = menu->actions().count();
  }

  void update()
  {
    HeyGeoMenuMaintainer::update(); //parent first

    // now the recent file list
   
    bool ok;
    int count = HeyGeoProperties::getProperty("RecentListSize").toInt(&ok);
    if(!ok) {
      count = 4;
      HeyGeoProperties::setProperty("RecentListSize", "4");
    }
    
    //clear it first:
    int i;

    while((int)menu->actions().count() > itemCount) {
      menu->removeAction(menu->actions().at(itemCount));
    }
    
    HeyGeoWindow::compressRecentList();
    
    //now recreate it
    for(i = 0; i < count; ++i) {
      QString name = HeyGeoProperties::getProperty(QString("RecentFile") + QString::number(i + 1));
      if(name.isNull()) continue;
      int idx = ID_FILE_RECENTLIST_START + i;
      HeyGeoWindow *win = window;
      menu->addAction(QString("&") + QString::number(i + 1) + ". " + name, [win, idx]() { win->fileOpenRecent(idx); });
    }
  }

private:
  int itemCount;
};


/*------------------------------EditMenu------------------------------------*/
/*------------------------------ColorMenu------------------------------------*/
class ColorInfo : public HeyGeoCommandInfo
{
public:
  ColorInfo(QColor color, const char *member, QString name = QString())
    : HeyGeoCommandInfo(), c(color), mem(member), colorName(name)
  {
  }

  QString menuText(HeyGeoWindow *)
  {
    if(!c.isValid()) return qApp->translate("HeyGeoWindow", "&Other...");
    return colorName;
  }
  QObject *receiver(HeyGeoWindow *win) { return win; }
  const char *member() { return mem; }

  int isChecked(HeyGeoWindow *win)
  {
    if(privateIsEnabled(win) == false) return 0;

    QColor tmp = win->getView()->getDocument()->getCurrentColor();

    if(!c.isValid()) return tmp.isValid() && tmp != Qt::black && tmp != Qt::gray &&
		     tmp != Qt::red && tmp != Qt::green && tmp != Qt::blue &&
		     tmp != Qt::yellow && tmp != Qt::magenta && tmp != Qt::cyan ? 1 : 0;

    else return tmp == c ? 1 : 0;
  }

  void addTo(HeyGeoWindow *win, QMenu *menu)
  {
    if(!c.isValid()) { HeyGeoCommandInfo::addTo(win, menu); return; }

    // Draw a 16x16 color swatch with border for use as icon alongside text
    QPixmap p(16, 16);
    p.fill(c);
    {
      QPainter painter(&p);
      painter.setPen(Qt::darkGray);
      painter.drawRect(0, 0, 15, 15);
    }
    
    action = menu->addAction(QIcon(p), colorName);
    if(action) {
      action->setCheckable(true);
      if(receiver(win) && member()) QObject::connect(action, SIGNAL(triggered()), receiver(win), member());
      if(!shortCutKey().isEmpty()) action->setShortcut(shortCutKey());
    }
  }

protected:
  bool privateIsEnabled(HeyGeoWindow *win) { return win->getView()->getDocument()->canEditChangeColor(); }

  QColor c;
  const char *mem;
  QString colorName;
};


class HeyGeoEditColorMenuMaintainer : public HeyGeoMenuMaintainer
{
 public:
  HeyGeoEditColorMenuMaintainer(HeyGeoWindow *win) : HeyGeoMenuMaintainer(win)
  {
    menu = new QMenu();
    myInfo = new PopupInfo(qApp->translate("HeyGeoWindow", "&Color"),
			   &HeyGeoDocument::canEditChangeColor);

    menu->setTearOffEnabled(true);
   
    add(new ColorInfo(Qt::black,   SLOT(editColorBlack()),   qApp->translate("HeyGeoWindow", "Black")));
    add(new ColorInfo(Qt::gray,    SLOT(editColorGray()),    qApp->translate("HeyGeoWindow", "Gray")));
    add(new ColorInfo(Qt::red,     SLOT(editColorRed()),     qApp->translate("HeyGeoWindow", "Red")));
    add(new ColorInfo(Qt::green,   SLOT(editColorGreen()),   qApp->translate("HeyGeoWindow", "Green")));
    add(new ColorInfo(Qt::blue,    SLOT(editColorBlue()),    qApp->translate("HeyGeoWindow", "Blue")));
    add(new ColorInfo(Qt::yellow,  SLOT(editColorYellow()),  qApp->translate("HeyGeoWindow", "Yellow")));
    add(new ColorInfo(Qt::magenta, SLOT(editColorMagenta()), qApp->translate("HeyGeoWindow", "Magenta")));
    add(new ColorInfo(Qt::cyan,    SLOT(editColorCyan()),    qApp->translate("HeyGeoWindow", "Cyan")));

    addSep();
    
    add(new ColorInfo(QColor(), SLOT(editColorOther())));
  }

};


/*------------------------------LinestyleMenu-------------------------------------*/
class LinestyleInfo : public HeyGeoCommandInfo
{
public:
  LinestyleInfo(bool isWidth, QPen style, const char *member)
    : HeyGeoCommandInfo(), isw(isWidth), p(style), mem(member)
  {
  }

  QObject *receiver(HeyGeoWindow *win) { return win; }
  const char *member() { return mem; }

  int isChecked(HeyGeoWindow *win)
  {
    if(privateIsEnabled(win) == false) return 0;
    if(isw) return win->getView()->getDocument()->getCurrentPenWidth() == (int)p.width() ? 1 : 0;
    return win->getView()->getDocument()->getCurrentPenstyle() == p.style() ? 1 : 0;
  }

  QString menuText(HeyGeoWindow *)
  {
    if(isw) {
      if(p.width() == 0)  return qApp->translate("HeyGeoWindow", "Thin");
      if(p.width() == 2)  return qApp->translate("HeyGeoWindow", "Normal");
      return qApp->translate("HeyGeoWindow", "Thick");
    }
    if(p.style() == Qt::DashLine) return qApp->translate("HeyGeoWindow", "Dashed");
    if(p.style() == Qt::DotLine)  return qApp->translate("HeyGeoWindow", "Dotted");
    return qApp->translate("HeyGeoWindow", "Solid");
  }

  void addTo(HeyGeoWindow *win, QMenu *menu)
  {
    QPixmap pm(60, 16);
    pm.fill(Qt::white);
    {
      QPainter pa(&pm);
      QPen drawPen = p;
      drawPen.setColor(Qt::black);
      if(isw) drawPen.setStyle(Qt::SolidLine);
      pa.setPen(drawPen);
      pa.drawLine(4, 8, 56, 8);
    }
    
    action = menu->addAction(QIcon(pm), menuText(win));
    if(action) {
      action->setCheckable(true);
      if(receiver(win) && member()) QObject::connect(action, SIGNAL(triggered()), receiver(win), member());
      if(!shortCutKey().isEmpty()) action->setShortcut(shortCutKey());
    }
  }

protected:
  bool privateIsEnabled(HeyGeoWindow *win) { return win->getView()->getDocument()->canEditChangeLinestyle(); }

  bool isw; //true if this is a width rather than a style option
  QPen p;
  const char *mem;
};


class HeyGeoEditLinestyleMenuMaintainer : public HeyGeoMenuMaintainer
{
 public:
  HeyGeoEditLinestyleMenuMaintainer(HeyGeoWindow *win) : HeyGeoMenuMaintainer(win)
  {
    menu = new QMenu();
    myInfo = new PopupInfo(qApp->translate("HeyGeoWindow", "Line &Style"),
			   &HeyGeoDocument::canEditChangeLinestyle);

    menu->setTearOffEnabled(true);
   
    add(new LinestyleInfo(false, QPen(Qt::SolidLine), SLOT(editLinestyleSolid())));
    add(new LinestyleInfo(false, QPen(Qt::DashLine), SLOT(editLinestyleDashed())));
    add(new LinestyleInfo(false, QPen(Qt::DotLine), SLOT(editLinestyleDotted())));

    addSep();

    add(new LinestyleInfo(true, QPen(Qt::black, 0), SLOT(editLinestyleThin())));
    add(new LinestyleInfo(true, QPen(Qt::black, 2), SLOT(editLinestyleNormal())));
    add(new LinestyleInfo(true, QPen(Qt::black, 3), SLOT(editLinestyleThick())));
  }
};



/*------------------------------PointstyleMenu------------------------------------*/
class PointstyleInfo : public HeyGeoCommandInfo
{
public:
  PointstyleInfo(PointStyle style, const char *member) : HeyGeoCommandInfo(), p(style), mem(member)
  {
  }

  QObject *receiver(HeyGeoWindow *win) { return win; }
  const char *member() { return mem; }

  int isChecked(HeyGeoWindow *win)
  {
    if(privateIsEnabled(win) == false) return 0;
    return win->getView()->getDocument()->getCurrentPointstyle() == p ? 1 : 0;
  }

  QString menuText(HeyGeoWindow *)
  {
    if(p == LARGE_CIRCLE)  return qApp->translate("HeyGeoWindow", "Large");
    if(p == MEDIUM_CIRCLE) return qApp->translate("HeyGeoWindow", "Medium");
    return qApp->translate("HeyGeoWindow", "Small");
  }

  void addTo(HeyGeoWindow *win, QMenu *menu)
  {
    QPixmap pm(32, 32);
    pm.fill(Qt::white);
    {
      QPainter pa(&pm);
      QBrush b(Qt::black);
      G_drawstyle *d = G_drawstyle::match(p, 0, 0, &b);
      G_point(16, 16).draw(pa, *d);
      d->deleteReference();
    }
    
    action = menu->addAction(QIcon(pm), menuText(win));
    if(action) {
      action->setCheckable(true);
      if(receiver(win) && member()) QObject::connect(action, SIGNAL(triggered()), receiver(win), member());
      if(!shortCutKey().isEmpty()) action->setShortcut(shortCutKey());
    }
  }

protected:
  bool privateIsEnabled(HeyGeoWindow *win) { return win->getView()->getDocument()->canEditChangePointstyle(); }

  PointStyle p;
  const char *mem;
};


class HeyGeoEditPointstyleMenuMaintainer : public HeyGeoMenuMaintainer
{
 public:
  HeyGeoEditPointstyleMenuMaintainer(HeyGeoWindow *win) : HeyGeoMenuMaintainer(win)
  {
    menu = new QMenu();
    myInfo = new PopupInfo(qApp->translate("HeyGeoWindow", "&Point Style"),
			   &HeyGeoDocument::canEditChangePointstyle);

    menu->setTearOffEnabled(true);
   
    add(new PointstyleInfo(LARGE_CIRCLE, SLOT(editPointstyleLargecircle())));
    add(new PointstyleInfo(MEDIUM_CIRCLE, SLOT(editPointstyleMediumcircle())));
    add(new PointstyleInfo(SMALL_CIRCLE, SLOT(editPointstyleSmallcircle())));
  }
};

/*-----------------------font menu--------------------------*/
class FontInfo : public PCInfo
{
public:
  FontInfo(QString text, int size, const char *member) 
    : PCInfo(text, Window, member, &HeyGeoDocument::canEditChangeFont), sz(size)
  { }

  int isChecked(HeyGeoWindow *win)
  {
    if(privateIsEnabled(win) == false) return 0;
    return sz == win->getView()->getDocument()->getCurrentFontsize() ? 1 : 0;
  }

  void addTo(HeyGeoWindow *win, QMenu *menu)
  {
    action = menu->addAction(menuText(win));
    if(action) {
      if(!shortCutKey().isEmpty()) action->setShortcut(shortCutKey());
      if (sz < 0) {
        // "Font..." dialog entry
        QObject::connect(action, SIGNAL(triggered()), win, SLOT(editFontFont()));
      } else {
        int capturedSz = sz;
        QObject::connect(action, &QAction::triggered, win, [win, capturedSz]() {
          win->editFont(capturedSz);
        });
        action->setCheckable(true);
      }
    }
  }

protected:
  int sz;
};


/*-----------------------font family info--------------------------*/
class FontFamilyInfo : public HeyGeoCommandInfo
{
public:
  FontFamilyInfo(const QString &family)
    : HeyGeoCommandInfo(), familyName(family) {}

  QString menuText(HeyGeoWindow *) { return familyName; }
  QObject *receiver(HeyGeoWindow *win) { return win; }
  const char *member() { return nullptr; }

  int isChecked(HeyGeoWindow *win)
  {
    if(!win->getView()->getDocument()->canEditChangeFont()) return 0;
    QFont cur = win->getView()->getDocument()->getCurrentFont();
    return (cur.family().compare(familyName, Qt::CaseInsensitive) == 0) ? 1 : 0;
  }

  void addTo(HeyGeoWindow *win, QMenu *menu)
  {
    action = menu->addAction(menuText(win));
    if(action) {
      // Render menu item in the font's own face for preview
      QFont f(familyName, 12);
      action->setFont(f);
      action->setCheckable(true);
      QString capturedFamily = familyName;
      QObject::connect(action, &QAction::triggered, win, [win, capturedFamily]() {
        if(!win->getView()->getDocument()->canEditChangeFont()) return;
        QFont f = win->getView()->getDocument()->getCurrentFont();
        f.setFamily(capturedFamily);
        win->getView()->getDocument()->setCurrentFont(f);
        win->updateMenus();
      });
    }
  }

protected:
  bool privateIsEnabled(HeyGeoWindow *win) {
    return win->getView()->getDocument()->canEditChangeFont();
  }
  QString familyName;
};


class HeyGeoEditFontMenuMaintainer : public HeyGeoMenuMaintainer
{
 public:
  HeyGeoEditFontMenuMaintainer(HeyGeoWindow *win) : HeyGeoMenuMaintainer(win)
  {
    menu = new QMenu();
    myInfo = new PopupInfo(qApp->translate("HeyGeoWindow", "&Font"),
			   &HeyGeoDocument::canEditChangeFont);

    menu->setTearOffEnabled(true);

    // Font families (LaTeX-style first, then common web/system fonts)
    add(new FontFamilyInfo("Latin Modern Roman"));
    add(new FontFamilyInfo("CMU Serif"));
    add(new FontFamilyInfo("Times New Roman"));
    add(new FontFamilyInfo("Arial"));
    add(new FontFamilyInfo("Courier New"));

    addSep();

    // Font sizes
    add(new FontInfo("10", 10, SLOT(editFont(int))));
    add(new FontInfo("12", 12, SLOT(editFont(int))));
    add(new FontInfo("14", 14, SLOT(editFont(int))));
    add(new FontInfo("20", 20, SLOT(editFont(int))));
    add(new FontInfo("30", 30, SLOT(editFont(int))));

    addSep();

    add(new FontInfo(qApp->translate("HeyGeoWindow", "&Font..."), -1, SLOT(editFontFont())));
  }
};


/*-----------------edit, finally----------------*/

class HeyGeoEditMenuMaintainer : public HeyGeoMenuMaintainer
{
public:
  HeyGeoEditMenuMaintainer(HeyGeoWindow *win) : HeyGeoMenuMaintainer(win)
  {
    menu = new QMenu();
    myInfo = new PopupInfo(qApp->translate("HeyGeoWindow", "&Edit"));

    // Undo / Redo
    add(new PCInfo(qApp->translate("HeyGeoWindow", "&Undo"), SCInfo::Document, SLOT(editUndo()),
                   &HeyGeoDocument::canEditUndo, Qt::CTRL|Qt::Key_Z));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "&Redo"), SCInfo::Document, SLOT(editRedo()),
                   &HeyGeoDocument::canEditRedo, Qt::CTRL|Qt::Key_R));

    addSep();

    // Cut / Copy / Paste / Clear
    add(new UDInfo(qApp->translate("HeyGeoWindow", "Cu&t")));
    add(new UDInfo(qApp->translate("HeyGeoWindow", "&Copy")));
    add(new UDInfo(qApp->translate("HeyGeoWindow", "&Paste")));
    add(new MCInfo(qApp->translate("HeyGeoWindow", "C&lear"),
                   qApp->translate("HeyGeoWindow", "C&lear"), SCInfo::Document, SLOT(editDelete()),
                   &HeyGeoDocument::canEditDelete, Qt::Key_Backspace));

    addSep();

    // Select
    add(new SCInfo(qApp->translate("HeyGeoWindow", "Select &All"),
                   SCInfo::View, SLOT(selectAllForActiveTool()), Qt::CTRL|Qt::Key_A));
    add(new UDInfo(qApp->translate("HeyGeoWindow", "Select &Parents")));
    add(new UDInfo(qApp->translate("HeyGeoWindow", "Select &Children")));

    addSep();

    // Split / Merge / Edit Definition
    add(new UDInfo(qApp->translate("HeyGeoWindow", "S&plit/Merge")));
    add(new UDInfo(qApp->translate("HeyGeoWindow", "Edit D&efinition")));

    addSep();

    // Properties / Preferences
    add(new UDInfo(qApp->translate("HeyGeoWindow", "P&roperties")));
    add(new SCInfo(qApp->translate("HeyGeoWindow", "Pre&ferences..."),
                   SCInfo::Window, SLOT(editPreferences())));

    addSep();

    // Action Buttons & Selection Groups
    add(new UDInfo(qApp->translate("HeyGeoWindow", "&Action Buttons")));
    add(new SCInfo(qApp->translate("HeyGeoWindow", "Selection &Groups..."),
                   SCInfo::Document, SLOT(editShowSelectionGroupDialog())));
  }
};


/*--------------------------------Display menu-------------------------------*/

class HeyGeoDisplayMenuMaintainer : public HeyGeoMenuMaintainer
{
public:
  HeyGeoDisplayMenuMaintainer(HeyGeoWindow *win) : HeyGeoMenuMaintainer(win)
  {
    menu = new QMenu();
    myInfo = new PopupInfo(qApp->translate("HeyGeoWindow", "&Display"));

    // Appearance submenus (moved from Edit)
    add(new HeyGeoEditColorMenuMaintainer(window));
    add(new HeyGeoEditLinestyleMenuMaintainer(window));
    add(new HeyGeoEditPointstyleMenuMaintainer(window));
    add(new HeyGeoEditFontMenuMaintainer(window));
    add(new UDInfo(qApp->translate("HeyGeoWindow", "Text St&yle")));

    addSep();

    // Labels
    add(new MCInfo(qApp->translate("HeyGeoWindow", "Show/Hide &Label"),
                   qApp->translate("HeyGeoWindow", "Show/Hide &Labels"), SCInfo::Document, SLOT(editToggleLabels()),
                   &HeyGeoDocument::canEditToggleLabels, Qt::CTRL|Qt::Key_K));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Label Objects..."), SCInfo::Document, SLOT(editChangeLabel()),
                   &HeyGeoDocument::canEditChangeLabel));

    addSep();

    // Hide / Show
    add(new MCInfo(qApp->translate("HeyGeoWindow", "&Hide Objects"),
                   qApp->translate("HeyGeoWindow", "&Hide Objects"), SCInfo::Document, SLOT(editHide()),
                   &HeyGeoDocument::canEditHide, Qt::CTRL|Qt::Key_H));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Show &All Hidden"), SCInfo::Document, SLOT(editShowHidden()),
                   &HeyGeoDocument::canEditShowHidden));

    addSep();

    // Animation (stubs)
    add(new UDInfo(qApp->translate("HeyGeoWindow", "&Animate Objects...")));
    add(new UDInfo(qApp->translate("HeyGeoWindow", "Increase Speed")));
    add(new UDInfo(qApp->translate("HeyGeoWindow", "Decrease Speed")));
    add(new UDInfo(qApp->translate("HeyGeoWindow", "Stop Animation")));
    add(new UDInfo(qApp->translate("HeyGeoWindow", "Motion Controller...")));

    addSep();

    // Trace (stubs)
    add(new UDInfo(qApp->translate("HeyGeoWindow", "&Trace Objects")));
    add(new UDInfo(qApp->translate("HeyGeoWindow", "&Erase Traces")));

    addSep();

    // Toolbox / Number of samples
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Change &Number of Samples..."),
                   SCInfo::Document, SLOT(editChangeNumberOfSamples()),
                   &HeyGeoDocument::canEditChangeNumberOfSamples));
  }
};


/*--------------------------------View toolbar (internal)-------------------------------*/

class ZoomInfo : public SCInfo
{
public:
  ZoomInfo() :
    SCInfo(qApp->translate("HeyGeoWindow", "&Zoom In"), SCInfo::View, SLOT(viewZoom()), Qt::ALT | Qt::Key_Z) {
    iconset = QIcon(QPixmap((const char **)zoom_xpm));
  }

  int isChecked(HeyGeoWindow *win)
  {
    if(privateIsEnabled(win) == false) return 0;
    return win->getView()->getNextZoom() ? 1 : 0;
  }
};

class PanInfo : public SCInfo
{
public:
  PanInfo() :
    SCInfo(qApp->translate("HeyGeoWindow", "&Pan"), SCInfo::View, SLOT(viewPan())) {
    iconset = QIcon(QPixmap((const char **)pan_xpm));
  }

  int isChecked(HeyGeoWindow *win)
  {
    if(privateIsEnabled(win) == false) return 0;
    return win->getView()->getNextPan() ? 1 : 0;
  }
};

/*--------------------------------Windows menu (GSP-style)-------------------------------*/

class HeyGeoWindowsMenuMaintainer : public HeyGeoMenuMaintainer
{
public:
  HeyGeoWindowsMenuMaintainer(HeyGeoWindow *win) : HeyGeoMenuMaintainer(win)
  {
    // Keep the view/navigation toolbar
    toolBar = new QToolBar(win);
    win->addToolBar(toolBar);
    toolBar->setWindowTitle(qApp->translate("HeyGeoWindow", "View").remove('&'));
    if(HeyGeoProperties::getProperty("ViewToolbarVisible").toLower() == "false")
      toolBar->hide();
    else toolBar->show();
    connect(toolBar, SIGNAL(visibilityChanged(bool)), this, SLOT(toolbarVisibilityChanged(bool)));

    menu = new QMenu();
    myInfo = new PopupInfo(qApp->translate("HeyGeoWindow", "&Windows"));

    // GSP Window menu: New Window at top
    add(new SCInfo(qApp->translate("HeyGeoWindow", "New &View"), SCInfo::Window, SLOT(newView())));

    addNonToolbarSep();

    // View navigation (toolbar items)
    add(new PanInfo());
    add(new ZoomInfo());

    QIcon isZoomFit(QPixmap((const char **)zoomFit_xpm));
    add(new SCInfo(qApp->translate("HeyGeoWindow", "Zoom To &Fit"), SCInfo::View,
                   SLOT(viewZoomFit()), 0, isZoomFit));

    QIcon isZoomOrig(QPixmap((const char **)zoomOrig_xpm));
    add(new SCInfo(qApp->translate("HeyGeoWindow", "&Original Zoom (100%)"),
                   SCInfo::View, SLOT(viewOrigZoom()), 0, isZoomOrig));

    addNonToolbarSep();

    // GSP Window menu items (stubs for platform window management)
    add(new UDInfo(qApp->translate("HeyGeoWindow", "&Minimize")));
    add(new UDInfo(qApp->translate("HeyGeoWindow", "&Zoom")));

    addNonToolbarSep();

    add(new UDInfo(qApp->translate("HeyGeoWindow", "Bring All to &Front")));
  }

protected:
  virtual void privateToolbarVisibilityChanged(bool visible)
  {
    if(visible) HeyGeoProperties::setProperty("ViewToolbarVisible", "true");
    else  HeyGeoProperties::setProperty("ViewToolbarVisible", "false");
  }

};


/*--------------------------------New menu-------------------------------*/
class NewCInfo : public PCInfo
{
public:
  NewCInfo(QString usual, QString (*textFunction)(HeyGeoDocument *), const char *member,
           bool (HeyGeoDocument::*function)(), QKeySequence shortCutKey = {}, QIcon is = QIcon())
    : PCInfo(usual, Document, member, function, shortCutKey, is),
      textFunc(textFunction), iconFunc(NULL) {}

  NewCInfo(QString usual, QString (*textFunction)(HeyGeoDocument *), const char *member,
           bool (HeyGeoDocument::*function)(), QKeySequence shortCutKey, QIcon defaultIs,
           QIcon (*iconFunction)(HeyGeoDocument *))
    : PCInfo(usual, Document, member, function, shortCutKey, defaultIs),
      textFunc(textFunction), iconFunc(iconFunction) {}
  

  QString menuText(HeyGeoWindow *win)
  {
    if(!privateIsEnabled(win)) return txt;
    return (*textFunc)(win->getView()->getDocument());
  }

  QIcon iconSet(HeyGeoWindow *win) {
    if(iconFunc == NULL || !privateIsEnabled(win)) return PCInfo::iconSet(win);
    return (*iconFunc)(win->getView()->getDocument());
  }

protected:
  QString (*textFunc)(HeyGeoDocument *);
  QIcon (*iconFunc)(HeyGeoDocument *);
};


class HeyGeoNewMenuMaintainer : public HeyGeoMenuMaintainer
{
public:
  HeyGeoNewMenuMaintainer(HeyGeoWindow *win) : HeyGeoMenuMaintainer(win)
  {
    toolBar = new QToolBar(win);
    win->addToolBar(toolBar);
    toolBar->setWindowTitle(qApp->translate("HeyGeoWindow", "&Construct").remove('&'));
    if(HeyGeoProperties::getProperty("NewToolbarVisible").toLower() == "false")
      toolBar->hide();
    else toolBar->show();
    connect(toolBar, SIGNAL(visibilityChanged(bool)), this, SLOT(toolbarVisibilityChanged(bool)));

    menu = new QMenu();
    myInfo = new PopupInfo(qApp->translate("HeyGeoWindow", "&Construct"));

    // Points
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Point on &Object"),
                   SCInfo::Document, SLOT(newPointOnObject()),
                   &HeyGeoDocument::canNewPointOnObject));

    QIcon isMidpoint(QPixmap((const char **)midpoint_xpm));
    add(new MCInfo(qApp->translate("HeyGeoWindow", "&Midpoint"),
                   qApp->translate("HeyGeoWindow", "&Midpoints"), SCInfo::Document, SLOT(newMidpoint()),
                   &HeyGeoDocument::canNewMidpoint, Qt::CTRL|Qt::Key_M, 2, isMidpoint));

    QIcon isIntersect(QPixmap((const char **)intersection_xpm));
    add(new NewCInfo(qApp->translate("HeyGeoWindow", "&Intersection"), intersectionFunc,
                     SLOT(newIntersection()), &HeyGeoDocument::canNewIntersection, Qt::CTRL|Qt::Key_I, isIntersect));

    add(new NewCInfo(qApp->translate("HeyGeoWindow", "Endpoint&s"), endPtFunc,
                     SLOT(newEndpoints()), &HeyGeoDocument::canNewEndpoints));

    add(new PCInfo(qApp->translate("HeyGeoWindow", "Center &Point"), SCInfo::Document,
                   SLOT(newCenterpoint()), &HeyGeoDocument::canNewCenterpoint));

    addSep();

    // Straight objects
    QIcon isSegment(QPixmap((const char **)segment_xpm));
    add(new MCInfo(qApp->translate("HeyGeoWindow", "&Segment"),
                   qApp->translate("HeyGeoWindow", "&Segments"), SCInfo::Document, SLOT(newSegment()),
                   &HeyGeoDocument::canNewSegment, Qt::CTRL|Qt::Key_L, 3, isSegment));

    QIcon isRay(QPixmap((const char **)ray_xpm));
    add(new MCInfo(qApp->translate("HeyGeoWindow", "&Ray"),
                   qApp->translate("HeyGeoWindow", "&Rays"), SCInfo::Document, SLOT(newRay()),
                   &HeyGeoDocument::canNewRay, Qt::ALT|Qt::Key_R, 3, isRay));

    QIcon isLine(QPixmap((const char **)line_xpm));
    add(new NewCInfo(qApp->translate("HeyGeoWindow", "&Line"), lineFunc,
                     SLOT(newLine()), &HeyGeoDocument::canNewLine, Qt::ALT|Qt::Key_L, isLine, lineIconFunc));

    QIcon isPerpendicular(QPixmap((const char **)perpendicular_xpm));
    add(new MCInfo(qApp->translate("HeyGeoWindow", "Perpendicular &Line"),
                   qApp->translate("HeyGeoWindow", "Perpendicular &Lines"), SCInfo::Document,
                   SLOT(newPerpendicular()), &HeyGeoDocument::canNewPerpendicular, Qt::ALT|Qt::Key_P, 3,
                   isPerpendicular));

    QIcon isBisector(QPixmap((const char **)bisector_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Angle &Bisector"), SCInfo::Document,
                   SLOT(newBisector()), &HeyGeoDocument::canNewBisector, Qt::ALT|Qt::Key_B, isBisector));

    addSep();

    // Circles and Arcs
    QIcon isCircle(QPixmap((const char **)circle_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Circle by Center+&Point"), SCInfo::Document,
                   SLOT(newCircle()), &HeyGeoDocument::canNewCircleCenterPoint, Qt::ALT|Qt::Key_C, isCircle));

    add(new PCInfo(qApp->translate("HeyGeoWindow", "Circle by Center+&Radius"), SCInfo::Document,
                   SLOT(newCircle()), &HeyGeoDocument::canNewCircleCenterRadius));

    add(new PCInfo(qApp->translate("HeyGeoWindow", "Arc on &Circle"), SCInfo::Document,
                   SLOT(newArcOnCircle()), &HeyGeoDocument::canNewArcOnCircle));

    QIcon isArc(QPixmap((const char **)arc_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "&Arc through 3 Points"), SCInfo::Document,
                   SLOT(newArc()), &HeyGeoDocument::canNewArc, Qt::ALT|Qt::Key_A, isArc));

    addSep();

    // Interiors / Filled regions
    QIcon isPolygon(QPixmap((const char **)polygon_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Poly&gon Interior"), SCInfo::Document,
                   SLOT(newPolygon()), &HeyGeoDocument::canNewPolygon, Qt::ALT|Qt::Key_G, isPolygon));

    QIcon isCircleInterior(QPixmap((const char **)circleinterior_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Circle I&nterior"), SCInfo::Document,
                   SLOT(newCircleInterior()), &HeyGeoDocument::canNewCircleInterior, 0, isCircleInterior));

    QIcon isArcSector(QPixmap((const char **)sector_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Arc &Sector Interior"), SCInfo::Document,
                   SLOT(newArcSector()), &HeyGeoDocument::canNewArcSector, 0, isArcSector));

    QIcon isArcSegment(QPixmap((const char **)arcsegment_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Arc Se&gment Interior"), SCInfo::Document,
                   SLOT(newArcSegment()), &HeyGeoDocument::canNewArcSector, 0, isArcSegment));

    addSep();

    QIcon isLocus(QPixmap((const char **)locus_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "L&ocus"), SCInfo::Document,
                   SLOT(newLocus()), &HeyGeoDocument::canNewLocus, Qt::ALT|Qt::Key_O, isLocus));
  }

  static QString endPtFunc(HeyGeoDocument *d)
  {
    return (d->getSelected()[0]->getType() == G_RAY) ?
      qApp->translate("HeyGeoWindow", "Endpoint") :
      qApp->translate("HeyGeoWindow", "Endpoints");
  }

  static QString intersectionFunc(HeyGeoDocument *d)
  {
    return !((d->getSelected()[0]->getType() | d->getSelected()[1]->getType()) & (G_CURVE - G_STRAIGHT)) ?
      qApp->translate("HeyGeoWindow", "&Intersection") :
      qApp->translate("HeyGeoWindow", "&Intersections");
  }

  static QString lineFunc(HeyGeoDocument *d)
  {
    int i;

    const G_refs &x = d->getSelected();

    for(i = 0; i < (int)x.count(); i++) if(x[i]->getType() & G_STRAIGHT) break;

    if(i == (int)x.count()) {
      if(x.count() > 2) return qApp->translate("HeyGeoWindow", "&Lines");
      else return qApp->translate("HeyGeoWindow", "&Line");
    }
    else {
      if(x.count() > 2) return qApp->translate("HeyGeoWindow", "Parallel &Lines");
      else return qApp->translate("HeyGeoWindow", "Parallel &Line");
    }
  }

  static QIcon lineIconFunc(HeyGeoDocument *d)
  {
    int i;

    const G_refs &x = d->getSelected();

    for(i = 0; i < (int)x.count(); i++) if(x[i]->getType() & G_STRAIGHT) break;

    if(i == (int)x.count()) return QIcon(QPixmap((const char **)line_xpm));

    return QIcon(QPixmap((const char **)parallel_xpm));
  }

protected:
  virtual void privateToolbarVisibilityChanged(bool visible)
  {
    if(visible) HeyGeoProperties::setProperty("NewToolbarVisible", "true");
    else  HeyGeoProperties::setProperty("NewToolbarVisible", "false");
  }

};


/*--------------------------------Measure Menu-----------------------------*/
class HeyGeoMeasureMenuMaintainer : public HeyGeoMenuMaintainer
{
public:
  HeyGeoMeasureMenuMaintainer(HeyGeoWindow *win) : HeyGeoMenuMaintainer(win)
  {
    toolBar = new QToolBar(win);
    win->addToolBar(toolBar);
    toolBar->setWindowTitle(qApp->translate("HeyGeoWindow", "Meas&ure").remove('&'));
    if(HeyGeoProperties::getProperty("MeasureToolbarVisible").toLower() == "false")
      toolBar->hide();
    else toolBar->show();
    connect(toolBar, SIGNAL(visibilityChanged(bool)), this, SLOT(toolbarVisibilityChanged(bool)));

    menu = new QMenu();
    myInfo = new PopupInfo(qApp->translate("HeyGeoWindow", "Meas&ure"));

    QIcon isLength(QPixmap((const char **)length_xpm));
    add(new NewCInfo(qApp->translate("HeyGeoWindow", "&Length"), lengthFunc,
                     SLOT(measureLength()), &HeyGeoDocument::canMeasureLength, 0, isLength));

    QIcon isDistance(QPixmap((const char **)distance_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "&Distance"), SCInfo::Document,
                   SLOT(measureDistance()), &HeyGeoDocument::canMeasureDistance, 0, isDistance));

    add(new UDInfo(qApp->translate("HeyGeoWindow", "&Perimeter")));
    add(new UDInfo(qApp->translate("HeyGeoWindow", "&Circumference")));

    QIcon isAngle(QPixmap((const char **)angle_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "&Angle"), SCInfo::Document,
                   SLOT(measureAngle()), &HeyGeoDocument::canMeasureAngle, 0, isAngle));

    QIcon isArea(QPixmap((const char **)area_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Ar&ea"), SCInfo::Document,
                   SLOT(measureArea()), &HeyGeoDocument::canMeasureArea, 0, isArea));

    add(new UDInfo(qApp->translate("HeyGeoWindow", "Arc An&gle")));
    add(new UDInfo(qApp->translate("HeyGeoWindow", "Arc &Length")));

    QIcon isRadius(QPixmap((const char **)radius_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "&Radius"), SCInfo::Document,
                   SLOT(measureRadius()), &HeyGeoDocument::canMeasureRadius, 0, isRadius));

    QIcon isRatio(QPixmap((const char **)ratio_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Ra&tio"), SCInfo::Document,
                   SLOT(measureRatio()), &HeyGeoDocument::canMeasureRatio, 0, isRatio));

    add(new UDInfo(qApp->translate("HeyGeoWindow", "&Value of Point")));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "C&oordinates"), SCInfo::Document,
                   SLOT(measureCoordinates()), &HeyGeoDocument::canMeasureCoordinates));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Abscissa (x)"), SCInfo::Document,
                   SLOT(measureAbscissa()), &HeyGeoDocument::canMeasureAbscissa));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Ordinate (y)"), SCInfo::Document,
                   SLOT(measureOrdinate()), &HeyGeoDocument::canMeasureOrdinate));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Coordinate Distance"), SCInfo::Document,
                   SLOT(measureCoordinateDistance()), &HeyGeoDocument::canMeasureCoordinateDistance));

    QIcon isSlope(QPixmap((const char **)slope_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "&Slope"), SCInfo::Document,
                   SLOT(measureSlope()), &HeyGeoDocument::canMeasureSlope, 0, isSlope));

    add(new UDInfo(qApp->translate("HeyGeoWindow", "&Equation")));
  }

  static QString lengthFunc(HeyGeoDocument *d)
  {
    if(d->getSelected()[0]->getType() == G_SEGMENT) {
      return qApp->translate("HeyGeoWindow", "&Length");
    }
    else if(d->getSelected()[0]->getType() == G_CIRCLE) {
      return qApp->translate("HeyGeoWindow", "&Circumference");
    }
    else {
      return qApp->translate("HeyGeoWindow", "Arc &Length");
    }
  }

protected:
  virtual void privateToolbarVisibilityChanged(bool visible)
  {
    if(visible) HeyGeoProperties::setProperty("MeasureToolbarVisible", "true");
    else  HeyGeoProperties::setProperty("MeasureToolbarVisible", "false");
  }

};


/*--------------------------------Number Menu-----------------------------*/
class HeyGeoNumberMenuMaintainer : public HeyGeoMenuMaintainer
{
public:
  HeyGeoNumberMenuMaintainer(HeyGeoWindow *win) : HeyGeoMenuMaintainer(win)
  {
    menu = new QMenu();
    myInfo = new PopupInfo(qApp->translate("HeyGeoWindow", "&Number"));

    add(new PCInfo(qApp->translate("HeyGeoWindow", "New &Parameter..."), SCInfo::Document,
                   SLOT(numberNewParameter()), &HeyGeoDocument::canNumberNewParameter));

    QIcon isCalculate(QPixmap((const char **)calculate_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "&Calculate..."), SCInfo::Document,
                   SLOT(measureCalculate()), &HeyGeoDocument::canMeasureCalculate, 0, isCalculate));

    addSep();

    add(new UDInfo(qApp->translate("HeyGeoWindow", "&Tabulate")));
    add(new UDInfo(qApp->translate("HeyGeoWindow", "&Add Table Data")));
    add(new UDInfo(qApp->translate("HeyGeoWindow", "&Remove Table Data")));

    addSep();

    add(new UDInfo(qApp->translate("HeyGeoWindow", "Define Function from &Drawing...")));
  }
};


/*--------------------------------Transform Menu-----------------------------*/
class HeyGeoTransformMenuMaintainer : public HeyGeoMenuMaintainer
{
public:
  HeyGeoTransformMenuMaintainer(HeyGeoWindow *win) : HeyGeoMenuMaintainer(win)
  {
    toolBar = new QToolBar(win);
    win->addToolBar(toolBar);
    toolBar->setWindowTitle(qApp->translate("HeyGeoWindow", "&Transform").remove('&'));
    if(HeyGeoProperties::getProperty("TransformToolbarVisible").toLower() == "false")
      toolBar->hide();
    else toolBar->show();
    connect(toolBar, SIGNAL(visibilityChanged(bool)), this, SLOT(toolbarVisibilityChanged(bool)));

    menu = new QMenu();
    myInfo = new PopupInfo(qApp->translate("HeyGeoWindow", "&Transform"));

    // Mark operations (GSP naming)
    QIcon isVector(QPixmap((const char **)vector_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Mark &Vector"), SCInfo::Document,
                   SLOT(transformChooseVector()), &HeyGeoDocument::canTransformChooseVector,
                   0, isVector));

    QIcon isCenter(QPixmap((const char **)center_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Mark &Center"), SCInfo::Document,
                   SLOT(transformChooseCenter()), &HeyGeoDocument::canTransformChooseCenter,
                   0, isCenter));

    QIcon isMirror(QPixmap((const char **)mirror_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Mark &Mirror"), SCInfo::Document,
                   SLOT(transformChooseMirror()), &HeyGeoDocument::canTransformChooseMirror,
                   0, isMirror));

    QIcon isChooseAngle(QPixmap((const char **)chooseangle_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Mark &Angle"), SCInfo::Document,
                   SLOT(transformChooseAngle()), &HeyGeoDocument::canTransformChooseAngle,
                   0, isChooseAngle));

    QIcon isChooseRatio(QPixmap((const char **)chooseratio_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Mark Rati&o"), SCInfo::Document,
                   SLOT(transformChooseRatio()), &HeyGeoDocument::canTransformChooseRatio,
                   0, isChooseRatio));

    add(new PCInfo(qApp->translate("HeyGeoWindow", "Mark &Distance"), SCInfo::Document,
                   SLOT(transformChooseDistance()), &HeyGeoDocument::canTransformChooseDistance));

    add(new PCInfo(qApp->translate("HeyGeoWindow", "C&lear Marked"), SCInfo::Document,
                   SLOT(transformClearChosen()), &HeyGeoDocument::canTransformClearChosen));

    addSep();

    // Transform operations
    QIcon isTranslate(QPixmap((const char **)translate_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "&Translate..."), SCInfo::Document,
                   SLOT(transformTranslate()), &HeyGeoDocument::canTransformTranslate,
                   0, isTranslate));

    QIcon isRotate(QPixmap((const char **)rotate_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "&Rotate..."), SCInfo::Document,
                   SLOT(transformRotate()), &HeyGeoDocument::canTransformRotate,
                   0, isRotate));

    QIcon isScale(QPixmap((const char **)scale_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "&Dilate..."), SCInfo::Document,
                   SLOT(transformScale()), &HeyGeoDocument::canTransformScale, 0,
                   isScale));

    QIcon isReflect(QPixmap((const char **)reflect_xpm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "R&eflect"), SCInfo::Document,
                   SLOT(transformReflect()), &HeyGeoDocument::canTransformReflect,
                   0, isReflect));

    addSep();

    add(new UDInfo(qApp->translate("HeyGeoWindow", "&Iterate...")));

    addSep();

    add(new UDInfo(qApp->translate("HeyGeoWindow", "Define Custom Trans&form...")));
    add(new UDInfo(qApp->translate("HeyGeoWindow", "Edit Custom Trans&forms...")));
  }

protected:
  virtual void privateToolbarVisibilityChanged(bool visible)
  {
    if(visible) HeyGeoProperties::setProperty("TransformToolbarVisible", "true");
    else  HeyGeoProperties::setProperty("TransformToolbarVisible", "false");
  }

};

// ── Grid Form submenu ─────────────────────────────────────────────────────
#include "G_coordsys.H"

// One checkable item for a specific GridForm value.
class GridFormInfo : public HeyGeoCommandInfo
{
public:
    GridFormInfo(G_coordsys::GridForm form, const char *member, const QString &text)
        : HeyGeoCommandInfo(), m_form(form), m_member(member), m_text(text) {}

    QString  menuText(HeyGeoWindow *) { return m_text; }
    QObject *receiver(HeyGeoWindow *win) { return win->getView()->getDocument(); }
    const char *member() { return m_member; }

    int isChecked(HeyGeoWindow *win) {
        if (!privateIsEnabled(win)) return -1;
        int f = win->getView()->getDocument()->getCurrentGridForm();
        return (f == static_cast<int>(m_form)) ? 1 : 0;
    }

    void addTo(HeyGeoWindow *win, QMenu *menu) {
        action = menu->addAction(m_text);
        if (action) {
            action->setCheckable(true);
            if (receiver(win) && m_member)
                QObject::connect(action, SIGNAL(triggered()), receiver(win), m_member);
        }
    }

protected:
    bool privateIsEnabled(HeyGeoWindow *win) {
        return win->getView()->getDocument()->canGraphGridForm();
    }

private:
    G_coordsys::GridForm m_form;
    const char *m_member;
    QString m_text;
};

class HeyGeoGridFormMenuMaintainer : public HeyGeoMenuMaintainer
{
public:
    HeyGeoGridFormMenuMaintainer(HeyGeoWindow *win) : HeyGeoMenuMaintainer(win)
    {
        menu = new QMenu();
        myInfo = new PopupInfo(qApp->translate("HeyGeoWindow", "Grid &Form"),
                               &HeyGeoDocument::canGraphGridForm);

        add(new GridFormInfo(G_coordsys::POLAR_GRID,
                             SLOT(graphGridFormPolar()),
                             qApp->translate("HeyGeoWindow", "&Polar Grid")));
        add(new GridFormInfo(G_coordsys::SQUARE_GRID,
                             SLOT(graphGridFormSquare()),
                             qApp->translate("HeyGeoWindow", "&Square Grid")));
        add(new GridFormInfo(G_coordsys::RECTANGULAR_GRID,
                             SLOT(graphGridFormRectangular()),
                             qApp->translate("HeyGeoWindow", "&Rectangular Grid")));
        add(new GridFormInfo(G_coordsys::TRIG_AXIS,
                             SLOT(graphGridFormTrig()),
                             qApp->translate("HeyGeoWindow", "&Trigonometric Axis")));
    }
};

/*--------------------------------Graph Menu-----------------------------*/
class HeyGeoGraphMenuMaintainer : public HeyGeoMenuMaintainer
{
public:
  HeyGeoGraphMenuMaintainer(HeyGeoWindow *win) : HeyGeoMenuMaintainer(win)
  {
    menu = new QMenu();
    myInfo = new PopupInfo(qApp->translate("HeyGeoWindow", "&Graph"));

    add(new SCInfo(qApp->translate("HeyGeoWindow", "&New Coordinate System"),
                   SCInfo::Document, SLOT(graphNewCoordSys())));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "&Define Axes..."),
                   SCInfo::Document, SLOT(graphDefineAxes()),
                   &HeyGeoDocument::canGraphDefineAxes));

    addSep();

    add(new PCInfo(qApp->translate("HeyGeoWindow", "Plot as (&x,y)..."),
                   SCInfo::Document, SLOT(graphPlotAsXY()),
                   &HeyGeoDocument::canGraphPlotAsXY));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Plot &Value on Axis..."),
                   SCInfo::Document, SLOT(graphPlotValueOnAxis()),
                   &HeyGeoDocument::canGraphPlotValueOnAxis));
    add(new SCInfo(qApp->translate("HeyGeoWindow", "New &Function..."),
                   SCInfo::Document, SLOT(graphNewFunction())));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "Plot &Function..."),
                   SCInfo::Document, SLOT(graphPlotFunction()),
                   &HeyGeoDocument::canGraphPlotFunction));
    add(new SCInfo(qApp->translate("HeyGeoWindow", "Plot &Curve..."),
                   SCInfo::Document, SLOT(graphPlotCurve())));
    add(new UDInfo(qApp->translate("HeyGeoWindow", "Plot Table &Data...")));

    addSep();

    add(new HeyGeoGridFormMenuMaintainer(win));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "&Hide/Show Grid"),
                   SCInfo::Document, SLOT(graphGridForm()),
                   &HeyGeoDocument::canGraphGridForm));
    add(new PCInfo(qApp->translate("HeyGeoWindow", "&Snap Points"),
                   SCInfo::Document, SLOT(graphSnapPoints()),
                   &HeyGeoDocument::canGraphSnapPoints));

    addSep();

    add(new UDInfo(qApp->translate("HeyGeoWindow", "&Derivative...")));
  }
};


/*--------------------------------Play Menu----------------------------------*/

class HeyGeoQuickPlayMenuMaintainer : public HeyGeoMenuMaintainer
{
public:
  HeyGeoQuickPlayMenuMaintainer(HeyGeoWindow *win) : HeyGeoMenuMaintainer(win)
  {
    menu = new QMenu();
    myInfo = new PopupInfo(qApp->translate("HeyGeoWindow", "&Quick Play"));
    
    add(new SCInfo(qApp->translate("HeyGeoWindow", "&Change Directory..."),
		   SCInfo::Window, SLOT(quickPlaySetDirectory())));
  }
  
  void update()
  {
    HeyGeoMenuMaintainer::update();

    while(menu->actions().count() > 1) {
      menu->removeAction(menu->actions().last());
    }

    addSep();

    vector<QString> files = window->getValidConstructionFiles();
    
    int i;
    for(i = 0; i < (int)files.size(); ++i) {
      QFile f(files[i]);
      ScanType s = HeyGeoConstruction::scanConstructionFile(f, window->getView()->getDocument()->getSelected());
      if(s == INVALID) continue;

      int idx = i;
      HeyGeoWindow *win = window;
      QAction *a = menu->addAction(QFileInfo(files[i]).fileName(), [win, idx]() { win->quickPlay(idx); });
      a->setEnabled(s == MATCHED);
    }
    
    if(menu->actions().count() == 2) { //add dummy item
      QAction *a = menu->addAction(qApp->translate("HeyGeoWindow", "No Constructions"));
      a->setEnabled(false);
    }
  }

protected:
  virtual bool updateOften() { return false; }
};
  

class HeyGeoPlayMenuMaintainer : public HeyGeoMenuMaintainer
{
public:
  HeyGeoPlayMenuMaintainer(HeyGeoWindow *win) : HeyGeoMenuMaintainer(win)
  {
    menu = new QMenu();
    myInfo = new PopupInfo(qApp->translate("HeyGeoWindow", "Pla&y"));
    
    add(new HeyGeoQuickPlayMenuMaintainer(win));
  }

  void update()
  {
    HeyGeoMenuMaintainer::update();

    while(menu->actions().count() > 1) {
      menu->removeAction(menu->actions().first());
    }
    
    std::vector<HeyGeoConstruction *> c = HeyGeoConstruction::getAllConstructions();
    
    int i;
    QAction *quickPlayAction = menu->actions().isEmpty() ? nullptr : menu->actions().last();
    HeyGeoView *view = window->getView();
    for(i = 0; i < (int)c.size(); ++i) {
      if(c[i] == window->getView()->getDocument()) continue;
      
      QString f = c[i]->getFilename();
      if(f.isEmpty()) f = QString(qApp->translate("HeyGeoWindow", "Untitled"));
      else {
	f = QFileInfo(f).fileName();
      }
      
      int idx = i;
      QAction *a = new QAction(f, menu);
      QObject::connect(a, &QAction::triggered, [view, idx]() { view->playConstruction(idx); });
      a->setEnabled(window->getView()->getDocument()->canPlay(i));
      if(quickPlayAction) menu->insertAction(quickPlayAction, a);
      else menu->addAction(a);
    }
    
    if(menu->actions().count() > 1) {
      menu->insertSeparator(menu->actions().last());
    }
  }  

protected:
  virtual bool updateOften() { return false; }
};



/*--------------------------------Construction Menu-----------------------------*/
class HeyGeoConstructionMenuMaintainer : public HeyGeoMenuMaintainer
{
public:
  HeyGeoConstructionMenuMaintainer(HeyGeoWindow *win) : HeyGeoMenuMaintainer(win)
  {
    menu = new QMenu();
    myInfo = new PopupInfo(qApp->translate("HeyGeoWindow", "Const&ruction"));
    
    add(new CPCInfo(qApp->translate("HeyGeoWindow", "Make &Normal"), SCInfo::Document,
		   SLOT(constructionMakeNormal()), &HeyGeoConstruction::canConstructionMakeNormal));
    
    add(new CPCInfo(qApp->translate("HeyGeoWindow", "Make &Given"), SCInfo::Document,
		   SLOT(constructionMakeGiven()), &HeyGeoConstruction::canConstructionMakeGiven));
    
    add(new CPCInfo(qApp->translate("HeyGeoWindow", "Make &Final"), SCInfo::Document,
		   SLOT(constructionMakeFinal()), &HeyGeoConstruction::canConstructionMakeFinal));
    
    add(new CPCInfo(qApp->translate("HeyGeoWindow", "Make &Initial"), SCInfo::Document,
		   SLOT(constructionMakeInitial()), &HeyGeoConstruction::canConstructionMakeInitial));

    addSep();

    add(new CPCInfo(qApp->translate("HeyGeoWindow", "&Recurse"), SCInfo::Document,
		   SLOT(constructionRecurse()), &HeyGeoConstruction::canConstructionRecurse));
  }
};


/*--------------------------------Help Menu----------------------------------*/
class HeyGeoHelpMenuMaintainer : public HeyGeoMenuMaintainer
{
public:
  HeyGeoHelpMenuMaintainer(HeyGeoWindow *win) : HeyGeoMenuMaintainer(win)
  {
    menu = new QMenu();
    myInfo = new PopupInfo(qApp->translate("HeyGeoWindow", "&Help"));

    add(new SCInfo(qApp->translate("HeyGeoWindow", "&Help"), SCInfo::Window, SLOT(help()), Qt::Key_F1));

    add(new SCInfo(qApp->translate("HeyGeoWindow", "&About..."), SCInfo::Window, SLOT(helpAbout())));
  }
};

/*--------------------------------Main Menu----------------------------------*/

HeyGeoMainMenuMaintainer::HeyGeoMainMenuMaintainer(HeyGeoWindow *win)
  : HeyGeoMenuMaintainer(win)
{
  HeyGeoCommandInfo::resetID();

  myInfo = NULL;
  
  menuBar = win->menuBar();
  menuBar->clear(); //just in case

  // GSP-like menu order: File, Edit, Display, Construct, Measure, Number, Transform, Graph, Windows
  add(new HeyGeoFileMenuMaintainer(window));
  add(new HeyGeoEditMenuMaintainer(window));
  add(new HeyGeoDisplayMenuMaintainer(window));
  add(new HeyGeoNewMenuMaintainer(window));
  add(new HeyGeoMeasureMenuMaintainer(window));
  add(new HeyGeoNumberMenuMaintainer(window));
  add(new HeyGeoTransformMenuMaintainer(window));
  add(new HeyGeoGraphMenuMaintainer(window));
  add(new HeyGeoWindowsMenuMaintainer(window));

  if(win->getView()->getDocument()->isConstruction())
    add(new HeyGeoConstructionMenuMaintainer(window));

  addSep();

  add(new HeyGeoHelpMenuMaintainer(window));
}
