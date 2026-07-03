#ifndef HeyGeoVIEW_H
#define HeyGeoVIEW_H

#include <QPixmap>
#include <QTimer>
#include <QWidget>
#include <QList>
#include <QScrollBar>
#include <QResizeEvent>
#include <QMouseEvent>
#include <QPaintEvent>
#include <QKeyEvent>
#include <QPointer>
#include <QCursor>
#include <QColor>
#include "G_refs.H"
#include "G_point.H"
#include "G_matrix.H"
#include "G_object.H"
#include <unordered_map>

class HeyGeoDocument;
class G_ref;
class G_undoReconstrain;
class QTextEdit;
class QSpinBox;
class QPushButton;

class HeyGeoView : public QWidget
{
    Q_OBJECT
public:
    HeyGeoView(HeyGeoDocument *inDoc, QWidget *parent = nullptr);
    virtual ~HeyGeoView();

    enum SelectType {
        BORDER_SELECT,
        BLINKING_SELECT
    };

    enum DragType {
        NO_DRAG,
        MOVE_DRAG,
        RECTANGLE_DRAG,
        LABEL_DRAG,
        RECONSTRAIN_DRAG,
        PAN_DRAG,
        ZOOM_DRAG,
        TEXT_DRAG,            // user drags to define a text-annotation rectangle
        TEXT_ANNOTATION_DRAG, // dragging a committed text annotation
        TEXT_ANNOTATION_RESIZE// resizing a committed text annotation by corner handle
    };

    // GSP-style active tool mode
    enum ToolMode {
        SELECTION_TOOL = 0,  // select & move objects (default)
        POINT_TOOL,          // click to place a point
        COMPASS_TOOL,        // 2-click: centre → point on circle → creates circle
        SEGMENT_TOOL,        // 2-click: endpoint → endpoint → creates segment
        RAY_TOOL,            // 2-click: origin → direction point → creates ray
        LINE_TOOL,           // 2-click: point → point → creates line
        POLYGON_TOOL,        // multi-click vertices, double-click to finish
        FILLED_POLYGON_TOOL, // same, filled polygon
        OPEN_POLYGON_TOOL,   // open polyline
        TEXT_TOOL,           // show/hide/rename object labels
        PEN_TOOL,            // mark segments / angles
        INFO_TOOL,           // click object to show info
        CUSTOM_TOOL          // user-defined construction tools
    };

    DragType getDrag() { return drag; }
    ToolMode getToolMode() const { return currentTool; }

    static SelectType getSelectType() { return selectType; }

    HeyGeoDocument *getDocument() const { return doc; }
    void delDocumentRef(); // called when window is about to be closed

    void updateStatusBar(Qt::KeyboardModifiers state);

    static QList<HeyGeoView*> getAllViews() { return allViews; }

    bool getMenusEnabled() { return menusEnabled; }
    double getOffsetX() { return offsetX; }
    double getOffsetY() { return offsetY; }
    double getZoom() { return zoom; }

    // Calculator-mode hover: set by HeyGeoCalculateEditor when opening/closing
    void   setCalcHoverRef(G_ref *r) { calcHoverRef = r; update(); }
    G_ref *getCalcHoverRef() const   { return calcHoverRef; }

    bool getNextPan() { return nextPan; }
    bool getNextZoom() { return nextZoom; }

    // Text annotation: world-space position + LaTeX content
    struct TextAnnotation {
        double worldX, worldY;  // top-left in world coords
        double worldW, worldH;  // size in world units
        QString content;        // formula source as plain LaTeX ("ugly" form)
        QPixmap cachedPixmap;   // pre-rendered pixmap; rebuilt on commit
        int    fontSize  = 14;           // font size in pt (default 14)
        QColor fontColor{Qt::black};     // text and math color
    };
    const QList<TextAnnotation> &getTextAnnotations() const { return textAnnotations; }

    // Serialize/deserialize annotations (appended after HeyGeoDocument stream data)
    void saveAnnotations(QDataStream &stream) const;
    void loadAnnotations(QDataStream &stream);

signals:
    void statusBarMessage(const QString &);
    void updateMenus();
    void toolModeChanged(ToolMode mode); // emitted when tool changes

public slots:
    void redrawBuffer();
    void documentSaved(const QString &filename);
    void documentModified();
    void setMenusEnabled(bool b) { menusEnabled = b; emit updateMenus(); }

    void viewPan();
    void viewZoom();
    void viewZoomFit();
    void viewOrigZoom();

    void playConstruction(int which);

    // Tool-mode slots
    void setToolMode(ToolMode mode);
    void cancelCurrentTool(); // cancel mid-sequence, revert to SELECTION_TOOL
    void selectAllForActiveTool(); // GSP-style: filter by active tool type

protected:
    QPixmap buffer;

    QScrollBar *hBar, *vBar;

    void resizeEvent(QResizeEvent *) override;
    void paintEvent(QPaintEvent *) override;
    void keyPressEvent(QKeyEvent *) override;
    void mousePressEvent(QMouseEvent *) override;
    void mouseDoubleClickEvent(QMouseEvent *) override;
    void mouseReleaseEvent(QMouseEvent *) override;
    void mouseMoveEvent(QMouseEvent *) override;

protected slots:
    void moved(int);
    void selectTimeout() { if(selectType == BLINKING_SELECT) redrawBuffer(); }

private:
    QTimer selectTimer; // for doing the selection animation
    bool forcePaint;

    HeyGeoDocument *doc;
    bool docReferenceRemoved;

    // refresh stuff
    int lastMouseX, lastMouseY;
    DragType drag;
    G_refs objectsDragged;
    G_refs objectsUpdating;
    std::unordered_map<G_ref *, G_matrix> dragPattern;

    G_point dragOffset; // for stuff like labels and constrained points.
    int dragStartX, dragStartY;
    int dragCurX, dragCurY;

    // undo for during reconstraint
    G_undoReconstrain *reconstrainUndo;

    // tracks the object pressed this click cycle (for distinguishing click vs drag)
    G_ref *pressedRef;
    bool pressedRefWasSelected;

    // scrolling stuff
    double offsetX, offsetY, zoom;

    // for calculate dialog and moving, menu disabling
    bool menusEnabled;

    bool nextZoom, nextPan;

    // ── GSP Tool mode ──────────────────────────────────────────────────────────
    ToolMode currentTool;
    G_refs   toolAccumPoints;     // accumulated click-points for multi-step tools
    int      toolMouseX, toolMouseY; // current mouse position (screen coords)
    bool     toolRubberbandActive;

    // Create or snap to existing point at screen position (x, y)
    G_ref *getOrCreatePoint(int x, int y);

    // Handle a left-click in the active (non-selection) tool
    void handleToolClick(int x, int y);

    // Handle double-click to complete polygon tools
    void handleToolDoubleClick(int x, int y);

    // Paint rubber-band preview for multi-step tools
    void drawToolRubberband(QPainter &p);

    // GSP-style hover highlight: objects lit up under cursor during construction
    G_refs toolHoveredRefs;            // 1 or 2 objects highlighted under cursor
    bool   toolHoveredIsIntersection;  // true when hovering over two-curve intersection
    void   drawToolHoverHighlight(QPainter &p); // paint highlight overlay
    // ──────────────────────────────────────────────────────────────────────────

    // ── Text Tool extended state ───────────────────────────────────────────────
    // Objects currently hovered in TEXT_TOOL mode
    G_ref  *textHoveredRef;        // geometry object under cursor
    G_ref  *textLabelHoveredRef;   // label under cursor (detected via whatLabelsAmIOn)
    G_ref  *textLastClickedRef;    // last ref whose label was toggled

    // Inline QTextEdit overlay for plain-text LaTeX input
    QPointer<QTextEdit> textEditWidget;
    bool   textEditCommitting;      // guard against recursive commit
    int    textEditAnnotationIndex; // -1 = creating new, >= 0 = editing existing

    // ── Shift+Enter align state ────────────────────────────────────────────────
    bool   m_alignSpread = false;   // false = compact, true = spread on next Shift+Enter
    G_refs m_lastAlignedRefs;       // selection at last Shift+Enter press (detect change)

    QList<TextAnnotation> textAnnotations;
    int    textAnnotationSelected;    // index of selected annotation, -1 = none
    double textAnnotationDragWorldX;  // annotation worldX at drag start
    double textAnnotationDragWorldY;  // annotation worldY at drag start
    int    textAnnotationResizeCorner;  // corner being resized: 0=TL,1=TR,2=BL,3=BR
    double textAnnotationResizeAnchorX; // world X of the fixed opposite corner
    double textAnnotationResizeAnchorY; // world Y of the fixed opposite corner

    // Hit-test: returns annotation index whose screen rect contains (x,y), or -1
    int hitTestAnnotation(int x, int y) const;
    // Hit-test corner handles of the selected annotation; returns 0-3 or -1
    int hitTestAnnotationCorner(int x, int y) const;

    // Set by Calculator dialog while open: the measurement under the cursor
    G_ref *calcHoverRef;

    // Font toolbar for annotation editor (shown above the text edit widget)
    QWidget*     annToolbar      = nullptr;
    QSpinBox*    annFontSizeSpin = nullptr;
    QPushButton* annColorBtn     = nullptr;

    // Helpers for text edit lifecycle
    void rebuildAnnotationCache(int index);  // (re)build cachedPixmap at current zoom
    void showTextEditAt(QRect screenRect, int editIndex = -1);
    void commitTextAnnotation();
    void cancelTextAnnotation();
    // ──────────────────────────────────────────────────────────────────────────

    static SelectType selectType;

    static QList<HeyGeoView*> allViews;

    void zoomAnimation(double oldOffsetX, double oldOffsetY, double oldZoom);

    bool eventFilter(QObject *obj, QEvent *event) override;

public:
    static void updateAllViews();

    static QPainter *constructionPainter;
    static ViewTransform constructionTransform;

    static int ScrollBarThickness;
};

#endif // HeyGeoVIEW_H
