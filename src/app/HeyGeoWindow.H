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


#ifndef HeyGeo_WINDOW_H
#define HeyGeo_WINDOW_H

#include "defs.H"
#include <QMainWindow>
#include <QMenuBar>
#include <QStatusBar>
#include <QFile>
#include <QKeyEvent>
#include <QCloseEvent>
#include <vector>

class HeyGeoView;
class HeyGeoDocument;
class HeyGeoMainMenuMaintainer;
class HeyGeoToolBar;

class HeyGeoWindow : public QMainWindow
{
    Q_OBJECT
public:
    HeyGeoWindow(HeyGeoDocument *doc = nullptr);
    virtual ~HeyGeoWindow();

    HeyGeoView *getView() const { return view; }
    HeyGeoToolBar *getToolBar() const { return gspToolBar; }

    static bool openFile(QString fileName, HeyGeoWindow *win = nullptr);
    static void compressRecentList();
    static std::vector<QString> getValidConstructionFiles();

public slots:
    void newSketch();
    void newConstruction();
    void newView();
    void statusBarMessage(const QString &);
    void updateMenus();
    void fileOpenRecent(int);
    void quickPlay(int);
    void quickPlaySetDirectory();
    void editFont(int size);
    void showUnderDevelopment();

protected slots:
    void fileSaveAs();
    void fileSave();
    void fileOpen();
    void fileOpenInNewWindow();
    void fileCopyAsConstruction();
    void fileToSVG();
    void fileExportToWeb();
    void filePrint();
    void fileExportToImage();
    void fileChooseLanguage();
    void editPreferences();
    void editColorBlack();
    void editColorGray();
    void editColorRed();
    void editColorGreen();
    void editColorBlue();
    void editColorYellow();
    void editColorMagenta();
    void editColorCyan();
    void editColorOther();
    void editPointstyleLargecircle();
    void editPointstyleMediumcircle();
    void editPointstyleSmallcircle();
    void editLinestyleSolid();
    void editLinestyleDashed();
    void editLinestyleDotted();
    void editLinestyleThin();
    void editLinestyleNormal();
    void editLinestyleThick();
    void editFontFont();
    void help();
    void helpAbout();

protected:
    void keyPressEvent(QKeyEvent *ev) override;
    void keyReleaseEvent(QKeyEvent *ev) override;
    void closeEvent(QCloseEvent *ev) override;
    bool closingDocument();
private:
    void changeDocument(HeyGeoDocument *doc);
    static QString quickPlayDirectory;
    bool openInNewWindow;
    HeyGeoView *view;
    HeyGeoMainMenuMaintainer *maintainer;
    HeyGeoToolBar *gspToolBar;
};

#endif // HeyGeo_WINDOW_H