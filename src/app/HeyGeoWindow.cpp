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
#include <QGuiApplication>
#include <QFileDialog>
#include <QMessageBox>
#include <QColorDialog>
#include <QFontDialog>
#include <QPrintDialog>
#include <QSplitter>
#include <QTextBrowser>
#include <QImage>
#include <QCursor>
#include <QTranslator>
#include <QKeyEvent>
#include <QLabel>
#include <QPixmap>
#include <QVBoxLayout>
#include <QCloseEvent>
#include <QImageWriter>
#include <QListWidget>
#include <QRegularExpression>
#include <QSvgGenerator>
#include <QCheckBox>
#include <QGroupBox>
#include <QLineEdit>
#include <QPlainTextEdit>
#include <QPushButton>
#include <QDesktopServices>
#include "HeyGeoConstructionList.H"
#include "HeyGeoWebExporter.H"
#include "HeyGeoWindow.H"
#include "HeyGeoView.H"
#include "HeyGeoDocument.H"
#include "HeyGeoConstruction.H"
#include "HeyGeoToolBar.H"
#include "G_ref.H"
#include "G_object.H"
#include "defs.H"
#include "HeyGeoProperties.H"
#include "HeyGeoPreferencesDialog.H"
#include "HeyGeoMenuMaintainer.H"


QString HeyGeoWindow::quickPlayDirectory;

HeyGeoWindow::~HeyGeoWindow()
{
  delete maintainer;
}

HeyGeoWindow::HeyGeoWindow(HeyGeoDocument *doc)
  : QMainWindow(nullptr), openInNewWindow(true)
{
    setAttribute(Qt::WA_DeleteOnClose); // Thay thế Qt::WDestructiveClose
    quickPlayDirectory = HeyGeoProperties::getProperty("QuickPlayDirectory");

    if(doc == nullptr) {
        doc = new HeyGeoDocument();
    } else {
        if(doc->getFilename().isEmpty()) setWindowTitle(tr("HeyGeo: Untitled"));
        else setWindowTitle(QString("HeyGeo: ") + doc->getFilename());
    }

    if(!doc->isConstruction()) {
        view = new HeyGeoView(doc, this);
        setCentralWidget(view);
        resize(800, 600);
    } else {
        QSplitter *sp = new QSplitter(this);
        view = new HeyGeoView(doc, sp);
        HeyGeoConstructionList *lb = new HeyGeoConstructionList(doc, sp);
        sp->setOrientation(Qt::Horizontal);
        sp->setOpaqueResize(true);
        setCentralWidget(sp);
        resize(800, 600);
        lb->resize(60, 600);
    }

    connect(view, &HeyGeoView::statusBarMessage, this, &HeyGeoWindow::statusBarMessage);
    connect(view, &HeyGeoView::updateMenus, this, &HeyGeoWindow::updateMenus);

    maintainer = new HeyGeoMainMenuMaintainer(this);

    // ── GSP-style vertical tool bar ──────────────────────────────────────────
    gspToolBar = new HeyGeoToolBar(this);
    addToolBar(Qt::LeftToolBarArea, gspToolBar);

    // Connect toolbar → view (tool selection)
    connect(gspToolBar, &HeyGeoToolBar::toolModeChanged,
            view,       &HeyGeoView::setToolMode);
    // Connect view → toolbar (keep buttons in sync when tool changes via Escape etc.)
    connect(view,       &HeyGeoView::toolModeChanged,
            gspToolBar, &HeyGeoToolBar::syncToolMode);
    // ─────────────────────────────────────────────────────────────────────────

    QLabel *zoomLabel = new QLabel("", statusBar());
    zoomLabel->setObjectName("zoomLabel");
    statusBar()->addWidget(zoomLabel, 0);
    statusBar()->show();
    statusBarMessage("");
}

void HeyGeoWindow::changeDocument(HeyGeoDocument *doc)
{
  HeyGeoMenuMaintainer *oldM = maintainer;
  maintainer = NULL;

  menuBar()->clear();

  delete centralWidget();

  if(doc->getFilename().isEmpty()) setWindowTitle(tr("HeyGeo: Untitled"));
  else setWindowTitle(QString("HeyGeo: ") + doc->getFilename());

  if(doc->isConstruction() == false) {
    view = new HeyGeoView(doc, this);

    setCentralWidget(view);
    
    resize(800, 600);
  }
  else {
    QSplitter *sp = new QSplitter(this);

    view = new HeyGeoView(doc, sp);
    HeyGeoConstructionList *lb = new HeyGeoConstructionList(doc, sp);

    sp->setOrientation(Qt::Horizontal);
    sp->setOpaqueResize(true);

    setCentralWidget(sp);

    resize(800, 600);
    lb->resize(60, 600);
  }

  connect(view, SIGNAL(statusBarMessage(const QString &)), this, SLOT(statusBarMessage(const QString &)));
  connect(view, SIGNAL(updateMenus()), this, SLOT(updateMenus()));

  centralWidget()->show();
  maintainer = new HeyGeoMainMenuMaintainer(this);

  // Re-connect gspToolBar to the new view
  if(gspToolBar) {
    connect(gspToolBar, &HeyGeoToolBar::toolModeChanged,
            view,       &HeyGeoView::setToolMode);
    connect(view,       &HeyGeoView::toolModeChanged,
            gspToolBar, &HeyGeoToolBar::syncToolMode);
  }

  delete oldM; //TODO-- segfaults!
}


void HeyGeoWindow::statusBarMessage(const QString &s)
{
  statusBar()->showMessage(s);
  QLabel *l = statusBar()->findChild<QLabel*>("zoomLabel");
  if (!l) return;
  QString newText = tr("Zoom:") + " " + QString::number((int)(view->getZoom() * 100 + 0.5)) + QString("%");
  if(l->text() != newText) {
    l->setText(newText);
    l->repaint();
  }
}


void HeyGeoWindow::updateMenus()
{
  if(maintainer != NULL) maintainer->update();
}


void HeyGeoWindow::compressRecentList()
{
  int count = HeyGeoProperties::getProperty("RecentListSize").toInt();

  hash_set<QString> recentItems;
  int skip = 0;

  int i;
  for(i = 0; i < count; ++i) {
    if(i + skip >= count) {
      HeyGeoProperties::setProperty("RecentFile" + QString::number(i + 1), QString());
      continue;
    }

    QString cur = HeyGeoProperties::getProperty("RecentFile" + QString::number(i + skip + 1));
    if(cur.isNull() || recentItems.count(cur)) {
      skip++;
      i--;
      continue;
    }

    if(skip)
      HeyGeoProperties::setProperty("RecentFile" + QString::number(i + 1),
				 HeyGeoProperties::getProperty("RecentFile" +
							     QString::number(i + skip + 1)));

    recentItems.insert(HeyGeoProperties::getProperty("RecentFile" + QString::number(i + 1)));
  }
}


void HeyGeoWindow::quickPlay(int which)
{
  vector<QString> files = getValidConstructionFiles();

  //just in case:
  QFile fi(files[which]);
  ScanType s = HeyGeoConstruction::scanConstructionFile(fi, view->getDocument()->getSelected());

  if(s != MATCHED) {
    Q_ASSERT(s == MATCHED);
    return;
  }

  QFile f(files[which]);

  HeyGeoConstruction temp;

  if(f.open(QIODevice::ReadOnly)) {
    QDataStream stream(&f);
    stream.setVersion(3);
    
    stream >> temp;
    f.close();
  }

  vector<HeyGeoConstruction *> cs = HeyGeoConstruction::getAllConstructions();

  int c = (int)cs.size();

  while(c--) {
    if(cs[c] == &temp) break;
  }
  
  Q_ASSERT(c != -1);
  
  view->playConstruction(c);
}

void HeyGeoWindow::quickPlaySetDirectory()
{
  QString newDir = QFileDialog::getExistingDirectory(this, tr("Choose QuickPlay Directory"), quickPlayDirectory);
  if(newDir.isEmpty()) return;

  quickPlayDirectory = newDir;
  HeyGeoProperties::setProperty("QuickPlayDirectory", newDir);
}

//returns a vector of full paths for potential
//filenames in the current directory
vector<QString> HeyGeoWindow::getValidConstructionFiles()
{
  vector<QString> toBeReturned;

  QDir myDir = QDir(quickPlayDirectory);
  myDir.setNameFilters(QStringList() << "*.sec");
  myDir.setSorting(QDir::Name);
  myDir.setFilter(QDir::Files | QDir::Readable);

  QStringList entries = myDir.entryList();

  int i;
  for(i = 0; i < (int)entries.count(); ++i) {
    QString entry = entries[i];
    
    toBeReturned.push_back(myDir.absolutePath() + "/" + entry);
  }

  return toBeReturned;
}


void HeyGeoWindow::keyPressEvent(QKeyEvent *ev)
{
  QMainWindow::keyPressEvent(ev);

  view->updateStatusBar(QGuiApplication::queryKeyboardModifiers());
}

//this is a workaround for a seeming bug...
void HeyGeoWindow::keyReleaseEvent(QKeyEvent *ev)
{
  QMainWindow::keyReleaseEvent(ev);

  view->updateStatusBar(QGuiApplication::queryKeyboardModifiers());
}


bool HeyGeoWindow::closingDocument()
{
  if(view->getDocument()->isModified() == false || view->getDocument()->getNumViews() > 1) {
    view->delDocumentRef();
    return true;
  }

  int ans = QMessageBox::warning(this, tr("Save?"),
				 tr("Would you like to save your changes?"),
				 QMessageBox::Yes | QMessageBox::No | QMessageBox::Cancel);

  if(ans == QMessageBox::Cancel) {
    return false;
  }
  if(ans == QMessageBox::Yes) {
    fileSave();
    if(view->getDocument()->isModified() == true) { //check if the guy hit cancel
      return false;
    }
  }

  view->delDocumentRef();
  return true;
}


void HeyGeoWindow::closeEvent(QCloseEvent *ev)
{
  if(closingDocument())
    ev->accept();
  else
    ev->ignore();
}


void HeyGeoWindow::newSketch()
{
  (new HeyGeoWindow())->show();
}

void HeyGeoWindow::newConstruction()
{
  HeyGeoConstruction *c = new HeyGeoConstruction();

  (new HeyGeoWindow(c))->show();
}


void HeyGeoWindow::newView()
{
  (new HeyGeoWindow(view->getDocument()))->show();
}

void HeyGeoWindow::fileSaveAs()
{
  QString fileName;

  if(view->getDocument()->isConstruction()) {
    fileName = QFileDialog::getSaveFileName(this, tr("Save"),
      view->getDocument()->getFilename(), tr("Construction (*.sec)"));

    if(fileName.isNull()) return;
    
    if(!QFileInfo(fileName).fileName().contains('.'))
      fileName = fileName + ".sec";
  }
  else {
    fileName = QFileDialog::getSaveFileName(this, tr("Save"),
      view->getDocument()->getFilename(), tr("Sketch (*.seg)"));

    if(fileName.isNull()) return;

    if(!QFileInfo(fileName).fileName().contains('.'))
      fileName = fileName + ".seg";
  }

  QFile f(fileName);

  if(f.open(QIODevice::WriteOnly)) {
    QDataStream stream(&f);
    stream.setVersion(3);

    stream << *(view->getDocument());
    view->saveAnnotations(stream);
    f.close();
  }

  //add it to the Recent File list
  int count = HeyGeoProperties::getProperty("RecentListSize").toInt();
  int i;

  for(i = count - 1; i > 0; --i) {
    HeyGeoProperties::setProperty("RecentFile" + QString::number(i + 1),
				HeyGeoProperties::getProperty("RecentFile" + QString::number(i)));
  }
  
  HeyGeoProperties::setProperty("RecentFile1", fileName);

  view->getDocument()->emitDocumentSaved(fileName);
}

void HeyGeoWindow::fileSave()
{
  if(view->getDocument()->getFilename().isEmpty()) {
    fileSaveAs();
    return;
  }

  QString fileName = view->getDocument()->getFilename();

  QFile f(fileName);

  if(f.open(QIODevice::WriteOnly)) {
    QDataStream stream(&f);
    stream.setVersion(3);

    stream << *(view->getDocument());
    view->saveAnnotations(stream);
    f.close();
  }

  view->getDocument()->emitDocumentSaved(fileName);
}

void HeyGeoWindow::fileOpenRecent(int num)
{
  num = num - ID_FILE_RECENTLIST_START;

  QString fileName = HeyGeoProperties::getProperty(QString("RecentFile") + QString::number(num + 1));

  if(fileName.isNull()) return;

  if(openFile(fileName, openInNewWindow ? NULL : this)) {
    int i;

    for(i = num; i > 0; --i) {
      HeyGeoProperties::setProperty("RecentFile" + QString::number(i + 1),
				  HeyGeoProperties::getProperty("RecentFile" + QString::number(i)));
    }

    HeyGeoProperties::setProperty("RecentFile1", fileName);
  }
  else {
    HeyGeoProperties::setProperty("RecentFile" + QString::number(num + 1), QString());
    compressRecentList();
  }
}


void HeyGeoWindow::fileOpen()
{
  openInNewWindow = false;
  fileOpenInNewWindow();
  openInNewWindow = true;
}


void HeyGeoWindow::fileOpenInNewWindow()
{

  QString fileName = QFileDialog::getOpenFileName(this, tr("Open File"), QString(), "HeyGeo Files (*.seg *.sec)");

  if(fileName.isNull()) return;

  if(openInNewWindow == false && !closingDocument()) return;

  //if the file is one of the recent ones, call the function
  //because it knows what to do with the recent list
  compressRecentList();

  int count = HeyGeoProperties::getProperty("RecentListSize").toInt();

  int i;
  for(i = 0; i < count; ++i) {
    QString cur = HeyGeoProperties::getProperty("RecentFile" + QString::number(i + 1));
    if(cur == fileName) {
      fileOpenRecent(i + ID_FILE_RECENTLIST_START);
      return;
    }
  }

  if(openFile(fileName, openInNewWindow ? NULL : this)) {
    //add the file name to the recently used list:
    for(i = count - 1; i > 0; --i) {
      HeyGeoProperties::setProperty("RecentFile" + QString::number(i + 1),
				  HeyGeoProperties::getProperty("RecentFile" + QString::number(i)));
    }

    HeyGeoProperties::setProperty("RecentFile1", fileName);
  }
}


bool HeyGeoWindow::openFile(QString fileName, HeyGeoWindow *win)
{
  if(QFileInfo(fileName).exists() == false) {
      QMessageBox::warning(0, tr("File Not Found"),
			   tr("Sorry, I am afraid that file %1 does not exist.").arg(fileName),
			   QMessageBox::Ok);
      return false;
  }

  QFile f(fileName);

  bool isConstruction;

  //check to make sure the file won't crash us.
  if(f.open(QIODevice::ReadOnly)) {
    char block[4];
 
    f.read(block, 4);

    if(block[0] || block[1] || block[2] || block[3] + 5 > (int)f.size()) {
      QMessageBox::warning(0, tr("Invalid file"),
			   tr("The file %1 does not look like a valid HeyGeo file.").arg(fileName),
			   QMessageBox::Ok);
      f.close();
      return false;
    }

    
    f.seek(0);
    

    QDataStream stream(&f);
    stream.setVersion(3);

    QString tmp;
    
    stream >> tmp;

    if(!HeyGeoDocument::parseVersionString(tmp, &isConstruction)) {
      QMessageBox::warning(0, tr("Invalid file"),
			   tr("The file %1 does not look like a valid HeyGeo file.").arg(fileName),
			   QMessageBox::Ok);
      f.close();
      return false;
    }


    f.close();
  }

  if(f.open(QIODevice::ReadOnly)) {
    QDataStream stream(&f);
    stream.setVersion(3);
    
    if(isConstruction) {
      if(win == NULL) win = new HeyGeoWindow(new HeyGeoConstruction());
      else win->changeDocument(new HeyGeoConstruction());
    }
    else {
      if(win == NULL) win = new HeyGeoWindow();
      else win->changeDocument(new HeyGeoDocument());
    }

    stream >> *(win->view->getDocument());
    win->view->loadAnnotations(stream);
    f.close();
  }

  win->view->getDocument()->emitDocumentSaved(fileName);
  
  win->show();

  win->view->redrawBuffer();

  return true;
}

void HeyGeoWindow::fileCopyAsConstruction()
{
  HeyGeoConstruction *c = new HeyGeoConstruction();
  HeyGeoWindow *w = new HeyGeoWindow(c);

  QByteArray arr;
  QDataStream s(&arr, QIODevice::WriteOnly);
  s.setVersion(3);

  s << *(view->getDocument());

  QDataStream l(&arr, QIODevice::ReadOnly);
  l.setVersion(3);

  l >> (*c);

  w->show();
}

void HeyGeoWindow::fileToSVG()
{
    QString fileName = QFileDialog::getSaveFileName(this,
                                                    tr("Save SVG File"), view->getDocument()->getFilename().replace(QRegularExpression("\\.se[cg]$"), ".svg"), "*.svg");
    if(fileName.isEmpty()) return;
    if(!QFileInfo(fileName).fileName().contains('.'))
        fileName += ".svg";

    QSvgGenerator generator;
    generator.setFileName(fileName);
    generator.setSize(QSize(view->width() - HeyGeoView::ScrollBarThickness, view->height() - HeyGeoView::ScrollBarThickness));
    QPainter p(&generator);
    p.setRenderHint(QPainter::Antialiasing, true);
    p.setRenderHint(QPainter::SmoothPixmapTransform, true);
    view->getDocument()->print(p, ViewTransform(view->getOffsetX(), view->getOffsetY(), view->getZoom()));
}

void HeyGeoWindow::filePrint()
{
  QPrinter *pr = view->getDocument()->getPrinter();

  QPrintDialog printDialog(pr, this);
  if(printDialog.exec() == QDialog::Accepted) {
    pr->setFullPage(false);

    QPainter p(pr);
    p.setRenderHint(QPainter::Antialiasing, true);
    p.setRenderHint(QPainter::SmoothPixmapTransform, true);

#if 1 //to go back to original fitting algorithm, set this 1 to a 0
    QRect viewPort = p.viewport();

    QRect docSize(0, 0, view->width() - HeyGeoView::ScrollBarThickness,
		  view->height() - HeyGeoView::ScrollBarThickness);

    QRect vp = docSize;

    vp.setWidth((vp.width() * pr->resolution()) / 96); //96 DPI looks good in my tests
    vp.setHeight((vp.height() * pr->resolution()) / 96);

    QPoint offs = viewPort.center() - vp.center();

    vp.translate(offs.x(), offs.y());

    p.setViewport(vp);

    p.setWindow(docSize);

    p.setClipRect(docSize);//, QPainter::CoordPainter);

    view->getDocument()->print(p, ViewTransform(view->getOffsetX(), view->getOffsetY(), view->getZoom()));
#else
    QRect docSize = view->getDocument()->getSize(ViewTransform(0, 0, 1));

    //make sure the document is at least 400 by 400
    QPoint oldCenter = docSize.center();
    if(docSize.width() < 400) docSize.setWidth(400);
    if(docSize.height() < 400) docSize.setHeight(400);
    docSize.moveCenter(oldCenter);

    QRect viewPort = p.viewport();

    if(docSize.width() * viewPort.height() >
       docSize.height() * viewPort.width()) {
      //the docSize needs to be made taller
      int oldHeight = docSize.height();
      int h = (docSize.width() * viewPort.height()) / viewPort.width();
      docSize.setHeight(h);
      docSize.moveBy(0, -(h - oldHeight) / 2);
    }
    else {
      //the docSize needs to be made wider
      int oldWidth = docSize.width();
      int w = (docSize.height() * viewPort.width()) / viewPort.height();
      docSize.setWidth(w);
      docSize.moveBy(-(w - oldWidth) / 2, 0);

    }

    p.setWindow(docSize);
    view->getDocument()->print(p, ViewTransform(0, 0, 1));
#endif
  }
}


void HeyGeoWindow::fileExportToImage()
{
  QDialog dial(this);
  QVBoxLayout layout(&dial);

  dial.setWindowTitle(tr("E&xport To Image...").remove('&'));
  QLabel lab(tr("Choose the File Format:"), &dial);
  QListWidget format(&dial);
//  format.insertStringList(QImage::outputFormatList());
  QList<QByteArray> fmtbytes = QImageWriter::supportedImageFormats();
  QList<QString> fmtlist;
  for(int i=0;i<fmtbytes.size();++i){fmtlist.append(fmtbytes[i]);}
  format.insertItems(0,QStringList(fmtlist));
  QCheckBox hiq(tr("High Quality Image"), &dial);
  QPushButton okBut(tr("OK"), &dial);
  connect(&okBut, SIGNAL(clicked()), &dial, SLOT(accept()));
  okBut.setDefault(true);

  layout.setContentsMargins(10, 10, 10, 10);
  layout.setSpacing(5);
  layout.addWidget(&lab);
  layout.addWidget(&format);
  layout.addSpacing(15);
  layout.addWidget(&hiq);
  layout.addSpacing(15);
  layout.addWidget(&okBut, 0, Qt::AlignHCenter);
  //dial.setLayout(layout);
  QList<QListWidgetItem *> pngItem = format.findItems("png",Qt::MatchFixedString);
  if(!pngItem.empty()) {
    //format.setSelected(pngItem, true);
    format.setCurrentItem(pngItem[0]);
  }

  dial.exec();

  if(dial.result() == QDialog::Rejected) return;

  QString fmt = format.currentItem()->text();
  QString ext = fmt.toLower();
  if(ext == "jpeg") ext = "jpg";

  QString fileName = QFileDialog::
    getSaveFileName(this, tr("E&xport To Image...").remove('&'), QString(), "*." + ext);
  
  if(fileName.isNull()) return;

  QRect area = view->rect();
  area.setWidth(area.width() - HeyGeoView::ScrollBarThickness);
  area.setHeight(area.height() - HeyGeoView::ScrollBarThickness);

  if(hiq.isChecked()) {
    setCursor(QCursor(Qt::WaitCursor));
    repaint();
    statusBar()->showMessage(tr("Exporting, Please wait..."));

    int qX = (area.width() + 3) / 4, qY = (area.height() + 3) / 4;
    QPixmap pmap(4 * (qX + 3), 4 * (qY + 3));
    
    QImage outImg(QPixmap(4 * qX, 4 * qY).toImage());
    
    for(int x = 0; x < 4; ++x) for(int y = 0; y < 4; ++y) {
      pmap.fill(QColor(HeyGeoProperties::getProperty("BackgroundColor")));
      
      QPainter p(&pmap);
      p.setRenderHint(QPainter::Antialiasing, true);
      p.setRenderHint(QPainter::SmoothPixmapTransform, true);
      
      int offsX = x * qX;
      int offsY = y * qY;
      
      p.setWindow(QRect(offsX - 1, offsY - 1, qX + 3, qY + 3));
      
      view->getDocument()->print(p, ViewTransform(view->getOffsetX(), view->getOffsetY(), view->getZoom()));
      
      QImage img(pmap.toImage());
    
      img = img.scaled(qX + 3, qY + 3, Qt::IgnoreAspectRatio, Qt::SmoothTransformation);
      
      for(int x2 = 0; x2 < qX; ++x2) for(int y2 = 0; y2 < qY; ++y2) {
	outImg.setPixel(offsX + x2, offsY + y2, img.pixel(x2 + 1, y2 + 1));
      }
    }

    outImg.save(fileName, fmt.toLatin1().constData());
    setCursor(QCursor(Qt::ArrowCursor));
    view->updateStatusBar(Qt::NoModifier);
  }
  else {
    QPixmap pmap(area.width(), area.height());

    pmap.fill(QColor(HeyGeoProperties::getProperty("BackgroundColor")));
      
    QPainter p(&pmap);
    p.setRenderHint(QPainter::Antialiasing, true);
    p.setRenderHint(QPainter::SmoothPixmapTransform, true);
    
    view->getDocument()->print(p, ViewTransform(view->getOffsetX(), view->getOffsetY(), view->getZoom()));

    pmap.save(fileName, fmt.toLatin1().constData());
  }

}


// ---------------------------------------------------------------------------
// Export to Web
//   Converts the current document to HeyGeoData JSON (JSXGraph format) and
//   either saves a .heyjson file locally or uploads to heygeo.pedu.vn.
// ---------------------------------------------------------------------------
void HeyGeoWindow::fileExportToWeb()
{
    // ── Dialog ────────────────────────────────────────────────────────────
    QDialog dial(this);
    dial.setWindowTitle(tr("Export to Web"));
    dial.setMinimumWidth(520);

    QVBoxLayout *mainLayout = new QVBoxLayout(&dial);
    mainLayout->setContentsMargins(12, 12, 12, 12);
    mainLayout->setSpacing(8);

    // Title
    mainLayout->addWidget(new QLabel(tr("Sketch title:"), &dial));
    QString defaultTitle = QFileInfo(view->getDocument()->getFilename()).baseName();
    if (defaultTitle.isEmpty()) defaultTitle = tr("Untitled");
    QLineEdit *titleEdit = new QLineEdit(defaultTitle, &dial);
    mainLayout->addWidget(titleEdit);

    // Description (optional)
    mainLayout->addWidget(new QLabel(tr("Description (optional, markdown):"), &dial));
    QPlainTextEdit *descEdit = new QPlainTextEdit(&dial);
    descEdit->setMaximumHeight(60);
    mainLayout->addWidget(descEdit);

    // Guide (optional)
    mainLayout->addWidget(new QLabel(tr("Guide / exploration instructions (optional):"), &dial));
    QPlainTextEdit *guideEdit = new QPlainTextEdit(&dial);
    guideEdit->setMaximumHeight(60);
    mainLayout->addWidget(guideEdit);

    // ── Save locally ──────────────────────────────────────────────────────
    QGroupBox *fileGroup = new QGroupBox(tr("Save locally"), &dial);
    QVBoxLayout *fileLayout = new QVBoxLayout(fileGroup);
    QPushButton *saveBtn = new QPushButton(tr("Save as .heyjson file..."), fileGroup);
    fileLayout->addWidget(saveBtn);
    mainLayout->addWidget(fileGroup);

    // ── Upload to heygeo.pedu.vn ──────────────────────────────────────────
    QGroupBox *uploadGroup = new QGroupBox(tr("Upload to heygeo.pedu.vn"), &dial);
    QVBoxLayout *uploadLayout = new QVBoxLayout(uploadGroup);

    uploadLayout->addWidget(new QLabel(
        tr("API token — get yours at <b>heygeo.pedu.vn → Settings → API Tokens</b>:"),
        uploadGroup));
    QLineEdit *tokenEdit = new QLineEdit(uploadGroup);
    tokenEdit->setEchoMode(QLineEdit::Password);
    tokenEdit->setPlaceholderText(tr("Paste your API token here"));
    tokenEdit->setText(HeyGeoProperties::getProperty("WebApiToken"));

    QPushButton *uploadBtn = new QPushButton(tr("Upload Sketch"), uploadGroup);
    QLabel *statusLabel = new QLabel("", uploadGroup);
    statusLabel->setWordWrap(true);
    statusLabel->setOpenExternalLinks(true);

    uploadLayout->addWidget(tokenEdit);
    uploadLayout->addWidget(uploadBtn);
    uploadLayout->addWidget(statusLabel);
    mainLayout->addWidget(uploadGroup);

    // Close
    QPushButton *closeBtn = new QPushButton(tr("Close"), &dial);
    connect(closeBtn, &QPushButton::clicked, &dial, &QDialog::accept);
    mainLayout->addWidget(closeBtn, 0, Qt::AlignRight);

    // ── Save locally ──────────────────────────────────────────────────────
    connect(saveBtn, &QPushButton::clicked, &dial,
            [this, &dial, &titleEdit, &statusLabel]() {
        QString base = QFileInfo(view->getDocument()->getFilename()).baseName();
        if (base.isEmpty()) base = "untitled";

        QString filePath = QFileDialog::getSaveFileName(
            &dial, tr("Save HeyGeo Web Sketch"),
            base + ".heyjson",
            tr("HeyGeo Web Sketch (*.heyjson);;JSON (*.json)"));
        if (filePath.isEmpty()) return;

        HeyGeoWebExporter exporter;
        QByteArray bytes = exporter.toFileBytes(
            view->getDocument(), view, titleEdit->text().trimmed());

        QFile f(filePath);
        if (f.open(QIODevice::WriteOnly | QIODevice::Text)) {
            f.write(bytes);
            f.close();
            statusLabel->setText(tr("<b>Saved:</b> %1").arg(filePath));
        } else {
            statusLabel->setText(
                tr("<span style='color:red'>Failed to write file.</span>"));
        }
    });

    // ── Upload ────────────────────────────────────────────────────────────
    connect(uploadBtn, &QPushButton::clicked, &dial,
            [this, &tokenEdit, &uploadBtn, &statusLabel,
             &titleEdit, &descEdit, &guideEdit]() {

        QString apiToken = tokenEdit->text().trimmed();
        if (apiToken.isEmpty()) {
            statusLabel->setText(
                tr("<span style='color:red'>Please enter your API token.</span>"));
            return;
        }
        // Persist token for next session
        HeyGeoProperties::setProperty("WebApiToken", apiToken);

        HeyGeoWebExporter *exporter = new HeyGeoWebExporter(this);
        QJsonObject jsonData = exporter->buildJsonData(
            view->getDocument(), view, titleEdit->text().trimmed());
        QString thumbnailSvg = exporter->generateSvgThumbnail(
            view->getDocument(), view);

        uploadBtn->setEnabled(false);
        statusLabel->setText(tr("Uploading…"));

        connect(exporter, &HeyGeoWebExporter::uploadFinished,
                this, [exporter, &uploadBtn, &statusLabel]
                (bool success, const QString &message, const QString &shareUrl) {
            uploadBtn->setEnabled(true);
            if (success) {
                if (!shareUrl.isEmpty()) {
                    statusLabel->setText(
                        tr("<span style='color:green'>Upload successful! "
                           "<a href='%1'>View online</a></span>").arg(shareUrl));
                    QDesktopServices::openUrl(QUrl(shareUrl));
                } else {
                    statusLabel->setText(
                        tr("<span style='color:green'>%1</span>").arg(message));
                }
            } else {
                statusLabel->setText(
                    tr("<span style='color:red'>Upload failed: %1</span>").arg(message));
            }
            exporter->deleteLater();
        });

        exporter->uploadToServer(
            jsonData, apiToken,
            titleEdit->text().trimmed(),
            descEdit->toPlainText().trimmed(),
            guideEdit->toPlainText().trimmed(),
            thumbnailSvg);
    });

    dial.exec();
}


void HeyGeoWindow::fileChooseLanguage()
{
QString fileName = QFileDialog::getOpenFileName(this, tr("Choose Language File"),
					  HeyGeoProperties::getProperty("LanguageDir") +
						  "/" + HeyGeoProperties::getProperty("Language"),
						  "*.qm");

  if(fileName.isNull()) return;

  QString dir = QFileInfo(fileName).absolutePath();
  QString file = QFileInfo(fileName).fileName();

  QTranslator *t = new QTranslator(0);
  if(t->load(file, dir)) {
    HeyGeoProperties::setProperty("LanguageDir", dir);
    HeyGeoProperties::setProperty("Language", file);
    
    qApp->installTranslator(t);

    QMessageBox::information(0, tr("Language Change"),
			     tr("You will need to restart HeyGeo for the language "
				"change to fully take effect."),
			     QMessageBox::Ok);

    return;
  }

  delete t;
}


void HeyGeoWindow::editPreferences()
{
  HeyGeoPreferencesDialog p(this, 0, true);

  p.exec();
}


void HeyGeoWindow::editColorBlack()
{
  view->getDocument()->setCurrentColor(Qt::black);
  updateMenus();
}

void HeyGeoWindow::editColorGray()
{
  view->getDocument()->setCurrentColor(Qt::gray);
  updateMenus();
}

void HeyGeoWindow::editColorRed()
{
  view->getDocument()->setCurrentColor(Qt::red);
  updateMenus();
}

void HeyGeoWindow::editColorGreen()
{
  view->getDocument()->setCurrentColor(Qt::green);
  updateMenus();
}

void HeyGeoWindow::editColorBlue()
{
  view->getDocument()->setCurrentColor(Qt::blue);
  updateMenus();
}

void HeyGeoWindow::editColorYellow()
{
  view->getDocument()->setCurrentColor(Qt::yellow);
  updateMenus();
}

void HeyGeoWindow::editColorMagenta()
{
  view->getDocument()->setCurrentColor(Qt::magenta);
  updateMenus();
}

void HeyGeoWindow::editColorCyan()
{
  view->getDocument()->setCurrentColor(Qt::cyan);
  updateMenus();
}

void HeyGeoWindow::editColorOther()
{
  QColor newColor;
  
  newColor = QColorDialog::getColor(view->getDocument()->getCurrentColor());

  if(newColor.isValid()) {
    view->getDocument()->setCurrentColor(newColor);
  }

  updateMenus();
}

//----------

void HeyGeoWindow::editPointstyleLargecircle()
{
  view->getDocument()->setCurrentPointstyle(LARGE_CIRCLE);
  updateMenus();
}


void HeyGeoWindow::editPointstyleMediumcircle()
{
  view->getDocument()->setCurrentPointstyle(MEDIUM_CIRCLE);
  updateMenus();
}


void HeyGeoWindow::editPointstyleSmallcircle()
{
  view->getDocument()->setCurrentPointstyle(SMALL_CIRCLE);
  updateMenus();
}

//---------

void HeyGeoWindow::editLinestyleSolid()
{
  view->getDocument()->setCurrentPenstyle(Qt::SolidLine);
  updateMenus();
}


void HeyGeoWindow::editLinestyleDashed()
{
  view->getDocument()->setCurrentPenstyle(Qt::DashLine);
  updateMenus();
}


void HeyGeoWindow::editLinestyleDotted()
{
  view->getDocument()->setCurrentPenstyle(Qt::DotLine);
  updateMenus();
}


void HeyGeoWindow::editLinestyleThin()
{
  view->getDocument()->setCurrentPenWidth(0);
  updateMenus();
}


void HeyGeoWindow::editLinestyleNormal()
{
  view->getDocument()->setCurrentPenWidth(2);
  updateMenus();
}


void HeyGeoWindow::editLinestyleThick()
{
  view->getDocument()->setCurrentPenWidth(3);
  updateMenus();
}

//---------

void HeyGeoWindow::editFont(int size)
{
  view->getDocument()->setCurrentFontsize(size);
  updateMenus();
}

void HeyGeoWindow::editFontFont()
{
  bool ok;
  QFont f = QFontDialog::getFont(&ok, view->getDocument()->getCurrentFont());
  if(ok) {
    view->getDocument()->setCurrentFont(f);
  }
  updateMenus();
}

void HeyGeoWindow::help()
{
  QString langChars = HeyGeoProperties::getProperty("Language").mid(5, 2);
  QString helpSource = HeyGeoProperties::getProperty("LanguageDir") + "/heygeo_help_";
  helpSource = helpSource + langChars + ".html";
  //the above assumes the language is heygeo_??.qm and the helpfile is in the language directory
  
  if(QFileInfo(helpSource).exists() == false)
    helpSource = HeyGeoProperties::getProperty("LanguageDir") + "/heygeo_help_en.html";

  if(QFileInfo(helpSource).exists() == false) {
    QMessageBox::warning(0, tr("File Not Found"),
			 tr("Sorry, I am afraid that file %1 does not exist.").arg(helpSource),
			 QMessageBox::Ok);    

    return;
  }

  QString charset = "text/html;charset=iso-8859-1";
  //ugly special case hacks for different encodings.  Not sure what to do correctly here
  if(langChars == "ru")
    charset = "text/html;charset=UTF-8";
  if(langChars == "tr")
    charset = "text/html;charset=Windows-1254";

  QTextBrowser *b = new QTextBrowser();
  b->setSource(QUrl::fromLocalFile(helpSource));
  b->setWindowTitle(b->documentTitle());
  b->resize(640, 480);
  b->show();
}

void HeyGeoWindow::helpAbout()
{
  QMessageBox::about(this, tr("About HeyGeo"),
		     tr("HeyGeo 2026-03-12-22-40\n\n"
			"Copyright (C) 2026 Nguy\u1ec5n \u0110\u0103ng Minh Ph\u00fac\n"
			"https://ganjingworld.com/@ndmphuc\n\n"
			"Copyright (C) 2014 Yury P. Fedorchenko\n"
			"http://fedorchenko.net\n\n"
			"Copyright (C) 1999-2006 Ilya Baran\n"
			"http://www.mit.edu/~ibaran"));
}

void HeyGeoWindow::showUnderDevelopment()
{
  QMessageBox::information(this, tr("Under Development"),
                           tr("This feature is currently under development."));
}




