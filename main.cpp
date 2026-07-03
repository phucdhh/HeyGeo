#include <QApplication>
#include <QTranslator>
#include <ctime>
#include "HeyGeoWindow.H"
#include "G_ref.H"
#include "HeyGeoProperties.H"
#include "latex.h"

int main(int argc, char **argv)
{
    srand(static_cast<unsigned>(time(nullptr)));

    QApplication a(argc, argv);
    
    tex::LaTeX::init();
    
    a.setApplicationName("HeyGeo");
    QObject::connect(&a, &QApplication::lastWindowClosed, &a, &QApplication::quit);

    HeyGeoProperties::setPropertyDefault("Language", "");
    HeyGeoProperties::setPropertyDefault("LanguageDir", "languages");
    HeyGeoProperties::setPropertyDefault("SelectType", "BorderSelect");
    HeyGeoProperties::setPropertyDefault("QuickPlayDirectory", ".");
    HeyGeoProperties::setPropertyDefault("RecentListSize", "4");
    HeyGeoProperties::setPropertyDefault("BackgroundColor", QColor(Qt::white).name());
    HeyGeoProperties::setPropertyDefault("ForegroundColor", QColor(Qt::black).name());
    HeyGeoProperties::setPropertyDefault("ViewToolbarVisible", "true");
    HeyGeoProperties::setPropertyDefault("NewToolbarVisible", "true");
    HeyGeoProperties::setPropertyDefault("MeasureToolbarVisible", "true");
    HeyGeoProperties::setPropertyDefault("TransformToolbarVisible", "true");

    QTranslator translator;
    (void)translator.load(HeyGeoProperties::getProperty("Language"),
                    HeyGeoProperties::getProperty("LanguageDir"));
    a.installTranslator(&translator);

    bool anyOpenSuccessful = false;
    if(argc > 1) {
        for(int i = 1; i < argc; ++i) {
            anyOpenSuccessful |= HeyGeoWindow::openFile(QString(argv[i]));
        }
    }
    if(!anyOpenSuccessful) {
        HeyGeoWindow *w = new HeyGeoWindow();
        w->show();
    }

    int ret = a.exec();
    tex::LaTeX::release();
    return ret;
}
