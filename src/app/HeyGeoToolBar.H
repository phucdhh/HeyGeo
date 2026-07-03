#ifndef HeyGeoTOOLBAR_H
#define HeyGeoTOOLBAR_H

#include <QToolBar>
#include <QToolButton>
#include <QActionGroup>
#include <QMenu>
#include "HeyGeoView.H"

class HeyGeoWindow;

// GSP-style vertical tool bar with 9 tool groups:
//   Selection, Point, Compass, Straight Edge (3), Polygon (3),
//   Text, Pen, Info, Custom
class HeyGeoToolBar : public QToolBar
{
    Q_OBJECT
public:
    explicit HeyGeoToolBar(HeyGeoWindow *win);

    // Called externally to sync button checked state
    void syncToolMode(HeyGeoView::ToolMode mode);

signals:
    void toolModeChanged(HeyGeoView::ToolMode mode);

private slots:
    void onSelectClicked();
    void onPointClicked();
    void onCompassClicked();

    // Straight-edge sub-tools
    void onSegmentChosen();
    void onRayChosen();
    void onLineChosen();

    // Polygon sub-tools
    void onPolygonChosen();
    void onFilledPolygonChosen();
    void onOpenPolygonChosen();

    void onTextClicked();
    void onPenClicked();
    void onInfoClicked();
    void onCustomClicked();

private:
    HeyGeoWindow *window;
    QActionGroup *group;

    // Main buttons
    QToolButton *selectBtn;
    QToolButton *pointBtn;
    QToolButton *compassBtn;
    QToolButton *straightBtn;   // expands to segment/ray/line
    QToolButton *polygonBtn;    // expands to polygon variants
    QToolButton *textBtn;
    QToolButton *penBtn;
    QToolButton *infoBtn;
    QToolButton *customBtn;

    // Track which sub-tool is active for flyout groups
    HeyGeoView::ToolMode activeStraight;  // SEGMENT/RAY/LINE
    HeyGeoView::ToolMode activePolygon;   // POLYGON/FILLED/OPEN

    // Helpers
    QToolButton *makeToolButton(const QIcon &icon, const QString &tip,
                                QActionGroup *ag, const char *slot);
    static QIcon iconFor(HeyGeoView::ToolMode mode);

    // Programmatic icon generators
    static QIcon makeSelectIcon();
    static QIcon makePointIcon();
    static QIcon makeCompassIcon();
    static QIcon makeSegmentIcon();
    static QIcon makeRayIcon();
    static QIcon makeLineIcon();
    static QIcon makePolygonIcon(bool filled, bool open);
    static QIcon makeTextIcon();
    static QIcon makePenIcon();
    static QIcon makeInfoIcon();
    static QIcon makeCustomIcon();

    void activateTool(HeyGeoView::ToolMode mode);
    void updateStraightButton();
    void updatePolygonButton();
};

#endif // HeyGeoTOOLBAR_H
