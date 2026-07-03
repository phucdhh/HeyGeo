#include "HeyGeoToolBar.H"
#include "HeyGeoWindow.H"
#include "HeyGeoView.H"

#include <QPainter>
#include <QPainterPath>
#include <QPixmap>
#include <QFont>
#include <QFontMetrics>
#include <QActionGroup>
#include <QAction>
#include <QMenu>

// ─── Icon helpers ─────────────────────────────────────────────────────────────

static const int ICON_SIZE = 28;
static const QColor C_MAIN(30, 60, 150);   // dark blue – primary icon colour
static const QColor C_ACC(200, 60, 60);    // red – accent (endpoints, dots on curves)
[[maybe_unused]] static const QColor C_LINE(50, 50, 50);    // very dark grey – guide lines

static QPixmap blankPixmap()
{
    QPixmap p(ICON_SIZE, ICON_SIZE);
    p.fill(Qt::transparent);
    return p;
}

// Selection/arrow cursor pointing to the upper-left corner
QIcon HeyGeoToolBar::makeSelectIcon()
{
    QPixmap pix = blankPixmap();
    QPainter p(&pix);
    p.setRenderHint(QPainter::Antialiasing);

    // Arrow body (convex polygon, upper-left tip)
    QPainterPath body;
    body.moveTo(3,  2);  // tip
    body.lineTo(3,  20); // left edge bottom
    body.lineTo(8,  15); // inner notch (left)
    body.lineTo(12, 26); // stalk bottom-left
    body.lineTo(15, 24); // stalk bottom-right
    body.lineTo(11, 13); // inner shoulder
    body.lineTo(19, 13); // outer shoulder
    body.closeSubpath(); // diagonal hypotenuse back to tip

    p.setPen(Qt::NoPen);
    p.setBrush(C_MAIN);
    p.drawPath(body);

    // Small ▶ hint at bottom-right corner (matches GSP visual)
    p.setBrush(C_MAIN);
    QPolygonF tri;
    tri << QPointF(20, 22) << QPointF(25, 26) << QPointF(20, 26);
    p.drawPolygon(tri);

    return QIcon(pix);
}

// Filled solid dot – Point tool
QIcon HeyGeoToolBar::makePointIcon()
{
    QPixmap pix = blankPixmap();
    QPainter p(&pix);
    p.setRenderHint(QPainter::Antialiasing);
    p.setPen(Qt::NoPen);
    p.setBrush(C_MAIN);
    p.drawEllipse(QPointF(14, 14), 6.5, 6.5);
    return QIcon(pix);
}

// Circle outline + centre dot + point on circumference – Compass / Circle tool
QIcon HeyGeoToolBar::makeCompassIcon()
{
    QPixmap pix = blankPixmap();
    QPainter p(&pix);
    p.setRenderHint(QPainter::Antialiasing);

    // Circle outline
    p.setPen(QPen(C_MAIN, 2));
    p.setBrush(Qt::NoBrush);
    p.drawEllipse(QPointF(12, 14), 9, 9);

    // Centre dot
    p.setPen(Qt::NoPen);
    p.setBrush(C_MAIN);
    p.drawEllipse(QPointF(12, 14), 2.5, 2.5);

    // Point on circumference (upper-right)
    p.setBrush(C_ACC);
    p.drawEllipse(QPointF(12 + 9 * 0.707, 14 - 9 * 0.707), 2.5, 2.5);

    return QIcon(pix);
}

// Segment: diagonal line with filled dots at both endpoints
QIcon HeyGeoToolBar::makeSegmentIcon()
{
    QPixmap pix = blankPixmap();
    QPainter p(&pix);
    p.setRenderHint(QPainter::Antialiasing);

    p.setPen(QPen(C_MAIN, 2));
    p.drawLine(QPointF(5, 23), QPointF(23, 5));

    p.setPen(Qt::NoPen);
    p.setBrush(C_MAIN);
    p.drawEllipse(QPointF(5, 23), 3, 3);
    p.drawEllipse(QPointF(23, 5), 3, 3);

    return QIcon(pix);
}

// Ray: one dot endpoint, arrow on the other end
QIcon HeyGeoToolBar::makeRayIcon()
{
    QPixmap pix = blankPixmap();
    QPainter p(&pix);
    p.setRenderHint(QPainter::Antialiasing);

    p.setPen(QPen(C_MAIN, 2));
    p.drawLine(QPointF(5, 23), QPointF(21, 7));

    // Dot at start
    p.setPen(Qt::NoPen);
    p.setBrush(C_MAIN);
    p.drawEllipse(QPointF(5, 23), 3, 3);

    // Arrowhead at end (pointing upper-right)
    QPolygonF head;
    head << QPointF(21, 7) << QPointF(14, 9) << QPointF(19, 14);
    p.drawPolygon(head);

    return QIcon(pix);
}

// Line: arrows at both ends (infinite line)
QIcon HeyGeoToolBar::makeLineIcon()
{
    QPixmap pix = blankPixmap();
    QPainter p(&pix);
    p.setRenderHint(QPainter::Antialiasing);

    p.setPen(QPen(C_MAIN, 2));
    p.drawLine(QPointF(4, 24), QPointF(24, 4));

    p.setPen(Qt::NoPen);
    p.setBrush(C_MAIN);

    // Arrow at upper-right end
    QPolygonF head1;
    head1 << QPointF(24, 4) << QPointF(17, 6) << QPointF(22, 11);
    p.drawPolygon(head1);

    // Arrow at lower-left end
    QPolygonF head2;
    head2 << QPointF(4, 24) << QPointF(11, 22) << QPointF(6, 17);
    p.drawPolygon(head2);

    return QIcon(pix);
}

// Polygon icon: filled=true draws solid, open=true draws outline only
QIcon HeyGeoToolBar::makePolygonIcon(bool filled, bool open)
{
    QPixmap pix = blankPixmap();
    QPainter p(&pix);
    p.setRenderHint(QPainter::Antialiasing);

    // Pentagon vertices centred at (14, 15)
    const int N = 5;
    const double R = 10.0;
    const double cx = 14, cy = 15;
    QPolygonF poly;
    for (int i = 0; i < N; i++) {
        double a = -M_PI / 2 + 2 * M_PI * i / N;
        poly << QPointF(cx + R * qCos(a), cy + R * qSin(a));
    }

    if (!open) {
        p.setPen(QPen(C_MAIN, 2));
        p.setBrush(filled ? QColor(C_MAIN.red(), C_MAIN.green(), C_MAIN.blue(), 160) : Qt::NoBrush);
        p.drawPolygon(poly);
    } else {
        // open polygon – leave gap between last and first
        p.setPen(QPen(C_MAIN, 2));
        QPolygonF openPoly = poly.mid(0, N - 1); // skip last edge
        for (int i = 0; i < openPoly.size() - 1; i++)
            p.drawLine(openPoly[i], openPoly[i + 1]);
    }

    // Dots at vertices
    p.setPen(Qt::NoPen);
    p.setBrush(C_MAIN);
    for (const QPointF &pt : std::as_const(poly))
        p.drawEllipse(pt, 2.5, 2.5);

    return QIcon(pix);
}

// Text tool: bold capital 'A'
QIcon HeyGeoToolBar::makeTextIcon()
{
    QPixmap pix = blankPixmap();
    QPainter p(&pix);
    p.setRenderHint(QPainter::TextAntialiasing);

    QFont f("Arial", 18, QFont::Bold);
    p.setFont(f);
    p.setPen(C_MAIN);
    p.drawText(QRect(0, 0, ICON_SIZE, ICON_SIZE), Qt::AlignCenter, "A");

    return QIcon(pix);
}

// Pen / Mark tool: diagonal pen shape
QIcon HeyGeoToolBar::makePenIcon()
{
    QPixmap pix = blankPixmap();
    QPainter p(&pix);
    p.setRenderHint(QPainter::Antialiasing);

    // Pen body (parallelogram)
    QPainterPath body;
    body.moveTo(22, 3);   // handle top-right
    body.lineTo(26, 7);   // handle bottom-right
    body.lineTo(10, 23);  // nib bottom-right
    body.lineTo(6, 19);   // nib bottom-left
    body.closeSubpath();
    p.setPen(Qt::NoPen);
    p.setBrush(C_MAIN);
    p.drawPath(body);

    // Pen nib / tip (small triangle)
    QPainterPath nib;
    nib.moveTo(10, 23);
    nib.lineTo(6, 19);
    nib.lineTo(4, 27);
    nib.closeSubpath();
    p.setBrush(C_ACC);
    p.drawPath(nib);

    // Small ink stroke under tip
    p.setPen(QPen(C_ACC, 1.5));
    p.drawLine(QPointF(7, 25), QPointF(14, 25));

    return QIcon(pix);
}

// Information tool: lowercase 'i' inside a circle
QIcon HeyGeoToolBar::makeInfoIcon()
{
    QPixmap pix = blankPixmap();
    QPainter p(&pix);
    p.setRenderHint(QPainter::Antialiasing);

    // Circle
    p.setPen(QPen(C_MAIN, 2));
    p.setBrush(Qt::NoBrush);
    p.drawEllipse(QPointF(14, 14), 11, 11);

    // Letter 'i'
    QFont f("Arial", 13, QFont::Bold);
    p.setFont(f);
    p.setPen(C_MAIN);
    p.drawText(QRect(0, 0, ICON_SIZE, ICON_SIZE), Qt::AlignCenter, "i");

    return QIcon(pix);
}

// Custom / Script tool: play triangle + small dots
QIcon HeyGeoToolBar::makeCustomIcon()
{
    QPixmap pix = blankPixmap();
    QPainter p(&pix);
    p.setRenderHint(QPainter::Antialiasing);

    // Play triangle (right-pointing)
    QPolygonF tri;
    tri << QPointF(5, 5) << QPointF(5, 23) << QPointF(21, 14);
    p.setPen(Qt::NoPen);
    p.setBrush(C_MAIN);
    p.drawPolygon(tri);

    // Three small dots to the right (representing "more tools")
    for (int i = 0; i < 3; i++) {
        p.drawEllipse(QPointF(24, 8.0 + i * 6), 1.5, 1.5);
    }

    return QIcon(pix);
}

QIcon HeyGeoToolBar::iconFor(HeyGeoView::ToolMode mode)
{
    switch (mode) {
    case HeyGeoView::SELECTION_TOOL: return makeSelectIcon();
    case HeyGeoView::POINT_TOOL:     return makePointIcon();
    case HeyGeoView::COMPASS_TOOL:   return makeCompassIcon();
    case HeyGeoView::SEGMENT_TOOL:   return makeSegmentIcon();
    case HeyGeoView::RAY_TOOL:       return makeRayIcon();
    case HeyGeoView::LINE_TOOL:      return makeLineIcon();
    case HeyGeoView::POLYGON_TOOL:   return makePolygonIcon(false, false);
    case HeyGeoView::FILLED_POLYGON_TOOL: return makePolygonIcon(true, false);
    case HeyGeoView::OPEN_POLYGON_TOOL:   return makePolygonIcon(false, true);
    case HeyGeoView::TEXT_TOOL:      return makeTextIcon();
    case HeyGeoView::PEN_TOOL:       return makePenIcon();
    case HeyGeoView::INFO_TOOL:      return makeInfoIcon();
    case HeyGeoView::CUSTOM_TOOL:    return makeCustomIcon();
    default: return QIcon();
    }
}

// ─── Button factory ───────────────────────────────────────────────────────────

QToolButton *HeyGeoToolBar::makeToolButton(const QIcon &icon,
                                            const QString &tip,
                                            QActionGroup *ag,
                                            const char *slot)
{
    auto *btn = new QToolButton(this);
    btn->setIcon(icon);
    btn->setIconSize(QSize(ICON_SIZE, ICON_SIZE));
    btn->setToolTip(tip);
    btn->setCheckable(true);
    btn->setAutoRaise(true);
    btn->setFixedSize(38, 38);
    btn->setStyleSheet(
        "QToolButton { border: 1px solid transparent; border-radius: 4px; }"
        "QToolButton:hover { background: rgba(100,140,220,40); border-color: #aac; }"
        "QToolButton:checked { background: rgba(100,140,220,80); border-color: #88a; }");
    if (slot)
        connect(btn, SIGNAL(clicked()), this, slot);

    QAction *act = new QAction(icon, tip, ag);
    act->setCheckable(true);
    // Keep button and action in sync
    connect(btn, &QToolButton::toggled, act, &QAction::setChecked);
    connect(act, &QAction::toggled,     btn, &QToolButton::setChecked);
    btn->setDefaultAction(nullptr); // don't use QToolButton::setDefaultAction here
    return btn;
}

// ─── Constructor ──────────────────────────────────────────────────────────────

HeyGeoToolBar::HeyGeoToolBar(HeyGeoWindow *win)
    : QToolBar(tr("Tools"), win)
    , window(win)
    , activeStraight(HeyGeoView::SEGMENT_TOOL)
    , activePolygon(HeyGeoView::POLYGON_TOOL)
{
    setOrientation(Qt::Vertical);
    setMovable(false);
    setFloatable(false);
    setObjectName("GSPToolBar");

    setStyleSheet(
        "QToolBar { background: #e8edf5; border-right: 1px solid #aab; spacing: 2px; padding: 2px; }");

    group = new QActionGroup(this);
    group->setExclusive(true);

    // ── 1. Selection ──────────────────────────────────────────────────────────
    selectBtn = makeToolButton(makeSelectIcon(), tr("Selection - Select and move objects"),
                               group, SLOT(onSelectClicked()));
    addWidget(selectBtn);

    // ── 2. Point ──────────────────────────────────────────────────────────────
    pointBtn = makeToolButton(makePointIcon(), tr("Point - Place a point"),
                              group, SLOT(onPointClicked()));
    addWidget(pointBtn);

    addSeparator();

    // ── 3. Compass (Circle) ───────────────────────────────────────────────────
    compassBtn = makeToolButton(makeCompassIcon(),
                                tr("Compass - Draw a circle by centre and point on circle"),
                                group, SLOT(onCompassClicked()));
    addWidget(compassBtn);

    // ── 4. Straight Edge (Segment / Ray / Line) ────────────────────────────
    straightBtn = new QToolButton(this);
    straightBtn->setIcon(makeSegmentIcon());
    straightBtn->setIconSize(QSize(ICON_SIZE, ICON_SIZE));
    straightBtn->setToolTip(tr("Straight Edge - Click ▶ to choose Segment / Ray / Line"));
    straightBtn->setCheckable(true);
    straightBtn->setAutoRaise(true);
    straightBtn->setFixedSize(38, 38);
    straightBtn->setPopupMode(QToolButton::MenuButtonPopup);
    straightBtn->setStyleSheet(
        "QToolButton { border: 1px solid transparent; border-radius: 4px; }"
        "QToolButton:hover { background: rgba(100,140,220,40); border-color: #aac; }"
        "QToolButton:checked { background: rgba(100,140,220,80); border-color: #88a; }");
    connect(straightBtn, SIGNAL(clicked()), this, SLOT(onSegmentChosen()));

    QMenu *straightMenu = new QMenu(straightBtn);
    QAction *segAct = straightMenu->addAction(makeSegmentIcon(), tr("Segment"));
    QAction *rayAct = straightMenu->addAction(makeRayIcon(),     tr("Ray"));
    QAction *lineAct= straightMenu->addAction(makeLineIcon(),    tr("Line"));
    straightBtn->setMenu(straightMenu);

    // When user clicks main button, activate the currently-remembered sub-tool
    connect(straightBtn, &QToolButton::clicked, this, [this]() {
        activateTool(activeStraight);
    });
    connect(segAct,  &QAction::triggered, this, &HeyGeoToolBar::onSegmentChosen);
    connect(rayAct,  &QAction::triggered, this, &HeyGeoToolBar::onRayChosen);
    connect(lineAct, &QAction::triggered, this, &HeyGeoToolBar::onLineChosen);

    QAction *straightGroupAct = new QAction(group);
    straightGroupAct->setCheckable(true);
    connect(straightBtn, &QToolButton::toggled, straightGroupAct, &QAction::setChecked);
    connect(straightGroupAct, &QAction::toggled, straightBtn, &QToolButton::setChecked);

    addWidget(straightBtn);

    // ── 5. Polygon ────────────────────────────────────────────────────────────
    polygonBtn = new QToolButton(this);
    polygonBtn->setIcon(makePolygonIcon(false, false));
    polygonBtn->setIconSize(QSize(ICON_SIZE, ICON_SIZE));
    polygonBtn->setToolTip(tr("Polygon - Click ▶ to choose polygon type"));
    polygonBtn->setCheckable(true);
    polygonBtn->setAutoRaise(true);
    polygonBtn->setFixedSize(38, 38);
    polygonBtn->setPopupMode(QToolButton::MenuButtonPopup);
    polygonBtn->setStyleSheet(
        "QToolButton { border: 1px solid transparent; border-radius: 4px; }"
        "QToolButton:hover { background: rgba(100,140,220,40); border-color: #aac; }"
        "QToolButton:checked { background: rgba(100,140,220,80); border-color: #88a; }");

    QMenu *polyMenu = new QMenu(polygonBtn);
    QAction *polyAct  = polyMenu->addAction(makePolygonIcon(false, false), tr("Polygon (outline)"));
    QAction *fpAct    = polyMenu->addAction(makePolygonIcon(true,  false), tr("Filled Polygon"));
    QAction *opAct    = polyMenu->addAction(makePolygonIcon(false, true),  tr("Open Polygon (polyline)"));
    polygonBtn->setMenu(polyMenu);

    connect(polygonBtn, &QToolButton::clicked, this, [this]() {
        activateTool(activePolygon);
    });
    connect(polyAct, &QAction::triggered, this, &HeyGeoToolBar::onPolygonChosen);
    connect(fpAct,   &QAction::triggered, this, &HeyGeoToolBar::onFilledPolygonChosen);
    connect(opAct,   &QAction::triggered, this, &HeyGeoToolBar::onOpenPolygonChosen);

    QAction *polyGroupAct = new QAction(group);
    polyGroupAct->setCheckable(true);
    connect(polygonBtn, &QToolButton::toggled, polyGroupAct, &QAction::setChecked);
    connect(polyGroupAct, &QAction::toggled, polygonBtn, &QToolButton::setChecked);

    addWidget(polygonBtn);

    addSeparator();

    // ── 6. Text ───────────────────────────────────────────────────────────────
    textBtn = makeToolButton(makeTextIcon(),
                             tr("Text - Show / hide / rename object labels"),
                             group, SLOT(onTextClicked()));
    addWidget(textBtn);

    // ── 7. Pen ────────────────────────────────────────────────────────────────
    penBtn = makeToolButton(makePenIcon(),
                            tr("Pen - Mark segments and angles"),
                            group, SLOT(onPenClicked()));
    addWidget(penBtn);

    addSeparator();

    // ── 8. Information ────────────────────────────────────────────────────────
    infoBtn = makeToolButton(makeInfoIcon(),
                             tr("Information - Click object to show details"),
                             group, SLOT(onInfoClicked()));
    addWidget(infoBtn);

    // ── 9. Custom ─────────────────────────────────────────────────────────────
    customBtn = makeToolButton(makeCustomIcon(),
                               tr("Custom Tool - Run user-defined constructions"),
                               group, SLOT(onCustomClicked()));
    addWidget(customBtn);

    // Start with Selection active
    selectBtn->setChecked(true);
}

// ─── Activation helper ────────────────────────────────────────────────────────

void HeyGeoToolBar::activateTool(HeyGeoView::ToolMode mode)
{
    emit toolModeChanged(mode);

    // Un-check all, then check the relevant button
    for (QToolButton *btn : {selectBtn, pointBtn, compassBtn, straightBtn,
                              polygonBtn, textBtn, penBtn, infoBtn, customBtn}) {
        btn->setChecked(false);
    }
    switch (mode) {
    case HeyGeoView::SELECTION_TOOL:     selectBtn->setChecked(true);   break;
    case HeyGeoView::POINT_TOOL:         pointBtn->setChecked(true);    break;
    case HeyGeoView::COMPASS_TOOL:       compassBtn->setChecked(true);  break;
    case HeyGeoView::SEGMENT_TOOL:
    case HeyGeoView::RAY_TOOL:
    case HeyGeoView::LINE_TOOL:          straightBtn->setChecked(true); break;
    case HeyGeoView::POLYGON_TOOL:
    case HeyGeoView::FILLED_POLYGON_TOOL:
    case HeyGeoView::OPEN_POLYGON_TOOL:  polygonBtn->setChecked(true);  break;
    case HeyGeoView::TEXT_TOOL:          textBtn->setChecked(true);     break;
    case HeyGeoView::PEN_TOOL:           penBtn->setChecked(true);      break;
    case HeyGeoView::INFO_TOOL:          infoBtn->setChecked(true);     break;
    case HeyGeoView::CUSTOM_TOOL:        customBtn->setChecked(true);   break;
    }
}

void HeyGeoToolBar::syncToolMode(HeyGeoView::ToolMode mode)
{
    // Only update button check-states. Do NOT call activateTool() here —
    // that would re-emit toolModeChanged and create an infinite signal-slot loop.
    for (QToolButton *btn : {selectBtn, pointBtn, compassBtn, straightBtn,
                              polygonBtn, textBtn, penBtn, infoBtn, customBtn})
        btn->setChecked(false);

    switch (mode) {
    case HeyGeoView::SELECTION_TOOL:     selectBtn->setChecked(true);   break;
    case HeyGeoView::POINT_TOOL:         pointBtn->setChecked(true);    break;
    case HeyGeoView::COMPASS_TOOL:       compassBtn->setChecked(true);  break;
    case HeyGeoView::SEGMENT_TOOL:
    case HeyGeoView::RAY_TOOL:
    case HeyGeoView::LINE_TOOL:          straightBtn->setChecked(true); break;
    case HeyGeoView::POLYGON_TOOL:
    case HeyGeoView::FILLED_POLYGON_TOOL:
    case HeyGeoView::OPEN_POLYGON_TOOL:  polygonBtn->setChecked(true);  break;
    case HeyGeoView::TEXT_TOOL:          textBtn->setChecked(true);     break;
    case HeyGeoView::PEN_TOOL:           penBtn->setChecked(true);      break;
    case HeyGeoView::INFO_TOOL:          infoBtn->setChecked(true);     break;
    case HeyGeoView::CUSTOM_TOOL:        customBtn->setChecked(true);   break;
    }
}

// ─── Straight-edge update ─────────────────────────────────────────────────────

void HeyGeoToolBar::updateStraightButton()
{
    straightBtn->setIcon(iconFor(activeStraight));
    switch (activeStraight) {
    case HeyGeoView::SEGMENT_TOOL:
        straightBtn->setToolTip(tr("Segment - Click two points"));
        break;
    case HeyGeoView::RAY_TOOL:
        straightBtn->setToolTip(tr("Ray - Click two points"));
        break;
    case HeyGeoView::LINE_TOOL:
        straightBtn->setToolTip(tr("Line - Click two points"));
        break;
    default: break;
    }
    // Re-wire main click to re-activate the current sub-tool
    disconnect(straightBtn, SIGNAL(clicked()), this, SLOT(onSegmentChosen()));
    disconnect(straightBtn, SIGNAL(clicked()), this, SLOT(onRayChosen()));
    disconnect(straightBtn, SIGNAL(clicked()), this, SLOT(onLineChosen()));
    connect(straightBtn, &QToolButton::clicked, this, [this]() {
        activateTool(activeStraight);
    });
}

void HeyGeoToolBar::updatePolygonButton()
{
    polygonBtn->setIcon(iconFor(activePolygon));
    switch (activePolygon) {
    case HeyGeoView::POLYGON_TOOL:
        polygonBtn->setToolTip(tr("Polygon - Click vertices, double-click to finish"));
        break;
    case HeyGeoView::FILLED_POLYGON_TOOL:
        polygonBtn->setToolTip(tr("Filled Polygon - Click vertices, double-click to finish"));
        break;
    case HeyGeoView::OPEN_POLYGON_TOOL:
        polygonBtn->setToolTip(tr("Open Polygon (polyline) - Click vertices, double-click to finish"));
        break;
    default: break;
    }
}

// ─── Slots ────────────────────────────────────────────────────────────────────

void HeyGeoToolBar::onSelectClicked()   { activateTool(HeyGeoView::SELECTION_TOOL); }
void HeyGeoToolBar::onPointClicked()    { activateTool(HeyGeoView::POINT_TOOL); }
void HeyGeoToolBar::onCompassClicked()  { activateTool(HeyGeoView::COMPASS_TOOL); }
void HeyGeoToolBar::onTextClicked()     { activateTool(HeyGeoView::TEXT_TOOL); }
void HeyGeoToolBar::onPenClicked()      { activateTool(HeyGeoView::PEN_TOOL); }
void HeyGeoToolBar::onInfoClicked()     { activateTool(HeyGeoView::INFO_TOOL); }
void HeyGeoToolBar::onCustomClicked()   { activateTool(HeyGeoView::CUSTOM_TOOL); }

void HeyGeoToolBar::onSegmentChosen()
{
    activeStraight = HeyGeoView::SEGMENT_TOOL;
    updateStraightButton();
    activateTool(HeyGeoView::SEGMENT_TOOL);
}
void HeyGeoToolBar::onRayChosen()
{
    activeStraight = HeyGeoView::RAY_TOOL;
    updateStraightButton();
    activateTool(HeyGeoView::RAY_TOOL);
}
void HeyGeoToolBar::onLineChosen()
{
    activeStraight = HeyGeoView::LINE_TOOL;
    updateStraightButton();
    activateTool(HeyGeoView::LINE_TOOL);
}

void HeyGeoToolBar::onPolygonChosen()
{
    activePolygon = HeyGeoView::POLYGON_TOOL;
    updatePolygonButton();
    activateTool(HeyGeoView::POLYGON_TOOL);
}
void HeyGeoToolBar::onFilledPolygonChosen()
{
    activePolygon = HeyGeoView::FILLED_POLYGON_TOOL;
    updatePolygonButton();
    activateTool(HeyGeoView::FILLED_POLYGON_TOOL);
}
void HeyGeoToolBar::onOpenPolygonChosen()
{
    activePolygon = HeyGeoView::OPEN_POLYGON_TOOL;
    updatePolygonButton();
    activateTool(HeyGeoView::OPEN_POLYGON_TOOL);
}
