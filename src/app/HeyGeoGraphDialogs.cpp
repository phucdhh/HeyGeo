/*
 *  HeyGeo – Graph Menu Dialogs implementation
 */

#include "HeyGeoGraphDialogs.H"
#include "HeyGeoView.H"
#include "HeyGeoDocument.H"
#include "G_object.H"
#include "latex.h"
#include "platform/qt/graphic_qt.h"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QGridLayout>
#include <QGroupBox>
#include <QFormLayout>
#include <QFrame>
#include <QLineEdit>
#include <QAction>
#include <QApplication>
#include <QDialogButtonBox>
#include <QDoubleSpinBox>
#include <QSpinBox>
#include <QFont>
#include <QLabel>
#include <QPixmap>
#include <QPainter>
#include <QRegularExpression>

// ────────────────────────────────────────────────────────────────────────────
//  Helper – compact keypad button (same style as Calculator)
// ────────────────────────────────────────────────────────────────────────────
static QPushButton *makeFnKey(const QString &label, QWidget *parent)
{
    auto *btn = new QPushButton(label, parent);
    btn->setFixedSize(42, 34);
    QFont f = btn->font();
    f.setPointSize(11);
    btn->setFont(f);
    return btn;
}

// ────────────────────────────────────────────────────────────────────────────
//  HeyGeoNewFunctionDialog
// ────────────────────────────────────────────────────────────────────────────

HeyGeoNewFunctionDialog::HeyGeoNewFunctionDialog(HeyGeoView *view,
                                                  const G_functionDef *initial)
    : QDialog(view), m_view(view)
{
    setModal(true);
    setWindowTitle(tr("New Function"));
    setMinimumWidth(440);

    auto *vMain = new QVBoxLayout(this);
    vMain->setSpacing(6);
    vMain->setContentsMargins(8, 8, 8, 8);

    // ── Formula input row ─────────────────────────────────────────────────────
    auto *rowInput = new QHBoxLayout();
    rowInput->addWidget(new QLabel(tr("f(x) ="), this));
    m_editor = new QLineEdit(this);
    m_editor->setPlaceholderText(tr("Enter formula, e.g. x^2 + sin(x)"));
    QFont edFont = m_editor->font();
    edFont.setPointSize(13);
    m_editor->setFont(edFont);
    rowInput->addWidget(m_editor, 1);
    vMain->addLayout(rowInput);

    // ── MicroTeX preview ──────────────────────────────────────────────────────
    m_preview = new QLabel(this);
    m_preview->setAlignment(Qt::AlignLeft | Qt::AlignTop);
    m_preview->setMinimumHeight(140);   // ~4 lines at 14pt
    m_preview->setContentsMargins(6, 6, 6, 6);
    m_preview->setStyleSheet("background:#fff; border:1px solid #ccc; border-radius:4px;");
    vMain->addWidget(m_preview);

    // ── Separator ─────────────────────────────────────────────────────────────
    auto *sep1 = new QFrame(this);
    sep1->setFrameShape(QFrame::HLine);
    sep1->setFrameShadow(QFrame::Sunken);
    vMain->addWidget(sep1);

    // ── Middle: menu buttons (left) + keypad (right) ─────────────────────────
    auto *hMiddle = new QHBoxLayout();
    hMiddle->setSpacing(10);

    // Left column – Functions ▼ and Values ▼
    auto *vMenus = new QVBoxLayout();
    vMenus->setSpacing(6);
    vMenus->setAlignment(Qt::AlignTop);

    m_funcsBtn = new QToolButton(this);
    m_funcsBtn->setText(tr("Functions  ▼"));
    m_funcsBtn->setToolButtonStyle(Qt::ToolButtonTextOnly);
    m_funcsBtn->setPopupMode(QToolButton::InstantPopup);
    m_funcsBtn->setMinimumWidth(120);
    m_funcsBtn->setToolTip(tr("Insert a mathematical function"));
    connect(m_funcsBtn, &QToolButton::clicked,
            this, &HeyGeoNewFunctionDialog::showFunctionsMenu);
    vMenus->addWidget(m_funcsBtn);

    m_valsBtn = new QToolButton(this);
    m_valsBtn->setText(tr("Values  ▼"));
    m_valsBtn->setToolButtonStyle(Qt::ToolButtonTextOnly);
    m_valsBtn->setPopupMode(QToolButton::InstantPopup);
    m_valsBtn->setMinimumWidth(120);
    m_valsBtn->setToolTip(tr("Insert a sketch value or constant"));
    connect(m_valsBtn, &QToolButton::clicked,
            this, &HeyGeoNewFunctionDialog::showValuesMenu);
    vMenus->addWidget(m_valsBtn);

    vMenus->addStretch();
    hMiddle->addLayout(vMenus);

    // Right column – numeric keypad + variable/special buttons
    //   Row 0: 7  8  9  +
    //   Row 1: 4  5  6  −
    //   Row 2: 1  2  3  ×
    //   Row 3: 0  .  ⌫  /
    //   Row 4: (  )  ^  √
    //   Row 5: x  π  e  (blank)
    auto *grid = new QGridLayout();
    grid->setSpacing(3);

    auto mkKey = [&](const QString &lbl, int col, int row) -> QPushButton * {
        auto *b = makeFnKey(lbl, this);
        grid->addWidget(b, row, col);
        return b;
    };

    auto *btn7    = mkKey("7",  0, 0);
    auto *btn8    = mkKey("8",  1, 0);
    auto *btn9    = mkKey("9",  2, 0);
    auto *btnAdd  = mkKey("+",  3, 0);

    auto *btn4    = mkKey("4",  0, 1);
    auto *btn5    = mkKey("5",  1, 1);
    auto *btn6    = mkKey("6",  2, 1);
    auto *btnSub  = mkKey("−",  3, 1);

    auto *btn1    = mkKey("1",  0, 2);
    auto *btn2    = mkKey("2",  1, 2);
    auto *btn3    = mkKey("3",  2, 2);
    auto *btnMul  = mkKey("×",  3, 2);

    auto *btn0    = mkKey("0",  0, 3);
    auto *btnDot  = mkKey(".",  1, 3);
    auto *btnBS   = mkKey("⌫", 2, 3);
    auto *btnDiv  = mkKey("/",  3, 3);

    auto *btnLP   = mkKey("(",  0, 4);
    auto *btnRP   = mkKey(")",  1, 4);
    auto *btnPow  = mkKey("^",  2, 4);
    auto *btnX    = mkKey("x",  3, 4);   // replaces √; π and e moved to Values menu

    // Highlight 'x' as the primary variable
    {
        QFont xf = btnX->font();
        xf.setBold(true);
        btnX->setFont(xf);
    }

    hMiddle->addLayout(grid);
    vMain->addLayout(hMiddle);

    // ── Separator ─────────────────────────────────────────────────────────────
    auto *sep2 = new QFrame(this);
    sep2->setFrameShape(QFrame::HLine);
    sep2->setFrameShadow(QFrame::Sunken);
    vMain->addWidget(sep2);

    // ── Domain + samples (compact one-liner, no group box title) ─────────────
    auto *domH = new QHBoxLayout();
    domH->setContentsMargins(2, 2, 2, 2);

    domH->addWidget(new QLabel(tr("x min:"), this));
    m_xMinSpin = new QDoubleSpinBox(this);
    m_xMinSpin->setRange(-1e6, 1e6);
    m_xMinSpin->setValue(-5.0);
    m_xMinSpin->setDecimals(2);
    m_xMinSpin->setSingleStep(0.5);
    m_xMinSpin->setFixedWidth(80);
    domH->addWidget(m_xMinSpin);

    domH->addSpacing(8);
    domH->addWidget(new QLabel(tr("x max:"), this));
    m_xMaxSpin = new QDoubleSpinBox(this);
    m_xMaxSpin->setRange(-1e6, 1e6);
    m_xMaxSpin->setValue(5.0);
    m_xMaxSpin->setDecimals(2);
    m_xMaxSpin->setSingleStep(0.5);
    m_xMaxSpin->setFixedWidth(80);
    domH->addWidget(m_xMaxSpin);

    domH->addSpacing(8);
    domH->addWidget(new QLabel(tr("Samples:"), this));
    m_sampleSpin = new QSpinBox(this);
    m_sampleSpin->setRange(10, 5000);
    m_sampleSpin->setValue(300);
    m_sampleSpin->setSingleStep(50);
    m_sampleSpin->setFixedWidth(75);
    domH->addWidget(m_sampleSpin);
    domH->addStretch();

    vMain->addLayout(domH);

    // ── OK / Cancel ───────────────────────────────────────────────────────────
    auto *buttons = new QDialogButtonBox(
            QDialogButtonBox::Ok | QDialogButtonBox::Cancel, Qt::Horizontal, this);
    connect(buttons, &QDialogButtonBox::accepted, this, &QDialog::accept);
    connect(buttons, &QDialogButtonBox::rejected, this, &QDialog::reject);
    vMain->addWidget(buttons);

    // ── Load initial values ────────────────────────────────────────────────────
    if (initial) {
        if (!initial->formula().isEmpty())
            m_editor->setText(initial->formula());
        m_xMinSpin->setValue(initial->tMin());
        m_xMaxSpin->setValue(initial->tMax());
        m_sampleSpin->setValue(initial->numSamples());
    }

    // ── Live preview updates ───────────────────────────────────────────────────
    connect(m_editor, &QLineEdit::textChanged, this, &HeyGeoNewFunctionDialog::refreshPreview);
    refreshPreview();

    // ── Wire keypad ────────────────────────────────────────────────────────────
    // Digits
    connect(btn0, &QPushButton::clicked, this, [this]{ keypadClicked('0'); });
    connect(btn1, &QPushButton::clicked, this, [this]{ keypadClicked('1'); });
    connect(btn2, &QPushButton::clicked, this, [this]{ keypadClicked('2'); });
    connect(btn3, &QPushButton::clicked, this, [this]{ keypadClicked('3'); });
    connect(btn4, &QPushButton::clicked, this, [this]{ keypadClicked('4'); });
    connect(btn5, &QPushButton::clicked, this, [this]{ keypadClicked('5'); });
    connect(btn6, &QPushButton::clicked, this, [this]{ keypadClicked('6'); });
    connect(btn7, &QPushButton::clicked, this, [this]{ keypadClicked('7'); });
    connect(btn8, &QPushButton::clicked, this, [this]{ keypadClicked('8'); });
    connect(btn9, &QPushButton::clicked, this, [this]{ keypadClicked('9'); });
    connect(btnDot, &QPushButton::clicked, this, [this]{ keypadClicked('.'); });

    // Operators
    connect(btnAdd,  &QPushButton::clicked, this, [this]{ keypadClicked('+'); });
    connect(btnSub,  &QPushButton::clicked, this, [this]{ keypadClicked('-'); });
    connect(btnMul,  &QPushButton::clicked, this, [this]{ keypadClicked('*'); });
    connect(btnDiv,  &QPushButton::clicked, this, [this]{ insertString("/"); });

    // Special
    connect(btnLP,   &QPushButton::clicked, this, [this]{ keypadClicked('('); });
    connect(btnRP,   &QPushButton::clicked, this, [this]{ keypadClicked(')'); });
    connect(btnPow,  &QPushButton::clicked, this, [this]{ keypadClicked('^'); });
    connect(btnBS,   &QPushButton::clicked, this, [this]{
        m_editor->setFocus();
        QKeyEvent ev(QEvent::KeyPress, Qt::Key_Backspace, Qt::NoModifier, QString(), false);
        QApplication::sendEvent(m_editor, &ev);
    });

    // Variable
    connect(btnX,  &QPushButton::clicked, this, [this]{ keypadClicked('x'); });

    m_editor->setFocus();
}

// ── Menu builders ─────────────────────────────────────────────────────────────

void HeyGeoNewFunctionDialog::buildFunctionsMenu(QMenu *menu)
{
    // Trigonometric
    menu->addAction(tr("sin( )"));
    menu->addAction(tr("cos( )"));
    menu->addAction(tr("tan( )"));
    menu->addSeparator();
    menu->addAction(tr("arcsin( )"));
    menu->addAction(tr("arccos( )"));
    menu->addAction(tr("arctan( )"));
    menu->addSeparator();
    // Algebraic
    menu->addAction(tr("abs( )"));
    menu->addAction(tr("sqrt( )"));
    menu->addSeparator();
    // Logarithmic / exponential
    menu->addAction(tr("ln( )"));
    menu->addAction(tr("log10( )"));
    menu->addAction(tr("exp( )"));
    menu->addSeparator();
    // Rounding
    menu->addAction(tr("round( )"));
    menu->addAction(tr("floor( )"));
    menu->addAction(tr("ceil( )"));
    menu->addSeparator();
    menu->addAction(tr("sgn( )"));
}

void HeyGeoNewFunctionDialog::buildValuesMenu(QMenu *menu)
{
    HeyGeoDocument *doc = m_view ? m_view->getDocument() : nullptr;
    bool anySketchValues = false;

    if (doc) {
        const G_refs selected = doc->getSelected();
        for (int i = 0; i < selected.count(); ++i) {
            G_ref *r = selected[i];
            if (!(r->getType() & G_VALUE))         continue;
            if (!r->getExists() || r->getDeleted()) continue;

            auto *vobj = static_cast<G_valueObject *>(r->getObject());
            QString label = vobj->getDisplayText();
            if (label.isEmpty()) {
                label = KFormula::toUgly(r->getLabel().getText());
                if (label.isEmpty()) label = G_ref::getNameFromType(r->getType());
            }

            QAction *a = menu->addAction(label);
            a->setData(QVariant::fromValue(static_cast<void *>(r)));
            anySketchValues = true;
        }
    }

    if (anySketchValues) menu->addSeparator();

    QAction *aPi = menu->addAction(tr("π  =  3.14159…"));
    aPi->setData(QString("__PI__"));

    QAction *aE  = menu->addAction(tr("e  =  2.71828…"));
    aE->setData(QString("__E__"));

    menu->addSeparator();
    QAction *aNew = menu->addAction(tr("New Parameter…"));
    aNew->setData(QString("__NEW_PARAM__"));
}

void HeyGeoNewFunctionDialog::showFunctionsMenu()
{
    QMenu menu(this);
    buildFunctionsMenu(&menu);
    QAction *chosen = menu.exec(m_funcsBtn->mapToGlobal(QPoint(0, m_funcsBtn->height())));
    if (!chosen) return;

    // Extract function name (first token before '(')
    QString text = chosen->text();
    int idx = text.indexOf('(');
    QString fname = (idx >= 0) ? text.left(idx).trimmed() : text.trimmed();

    static const QHash<QString,QString> aliasMap = {
        { "arcsin", "asin" }, { "arccos", "acos" }, { "arctan", "atan" },
        { "ln",     "ln"   }, { "sqrt",   "sqrt" }, { "rund",   "round" },
    };
    fname = aliasMap.value(fname, fname);
    insertString(fname + "(");
}

void HeyGeoNewFunctionDialog::showValuesMenu()
{
    QMenu menu(this);
    buildValuesMenu(&menu);

    // Hover highlight: when user hovers a canvas-value action, highlight it on sketch.
    connect(&menu, &QMenu::hovered, this, [this](QAction *a) {
        if (!m_view) return;
        QVariant d = a->data();
        if (d.canConvert<void *>() && d.value<void *>() != nullptr)
            m_view->setCalcHoverRef(static_cast<G_ref *>(d.value<void *>()));
        else
            m_view->setCalcHoverRef(nullptr);
    });

    QAction *chosen = menu.exec(m_valsBtn->mapToGlobal(QPoint(0, m_valsBtn->height())));
    if (m_view) m_view->setCalcHoverRef(nullptr);  // clear highlight after menu closes
    if (!chosen) return;

    QVariant d = chosen->data();
    if (d.toString() == "__NEW_PARAM__") {
        if (m_view) m_view->getDocument()->numberNewParameter();
        return;
    }
    if (d.toString() == "__PI__") { insertString("pi"); return; }
    if (d.toString() == "__E__")  { keypadClicked('e'); return; }

    // Sketch value: insert its current numeric value as a decimal constant.
    G_ref *r = static_cast<G_ref *>(d.value<void *>());
    if (r) {
        auto *vobj = static_cast<G_valueObject *>(r->getObject());
        insertString(QString::number(vobj->getNumValue(), 'g', 10));
    }
}

void HeyGeoNewFunctionDialog::keypadClicked(int charValue)
{
    m_editor->setFocus();
    m_editor->insert(QChar(charValue));
}

void HeyGeoNewFunctionDialog::insertString(const QString &s)
{
    m_editor->setFocus();
    m_editor->insert(s);
}

// ── Live MicroTeX preview ──────────────────────────────────────────────────────

// Re-use the same uglyToLatex() as G_graphObjects.cpp (duplicated for now).
static QString dialogUglyToLatex(const QString &src)
{
    QString s = src;
    s.replace("arcsin(", "\\arcsin(");
    s.replace("arccos(", "\\arccos(");
    s.replace("arctan(", "\\arctan(");
    s.replace("asin(",   "\\arcsin(");
    s.replace("acos(",   "\\arccos(");
    s.replace("atan(",   "\\arctan(");
    s.replace("log10(", "\\log_{10}(");
    s.replace("sin(",    "\\sin(");
    s.replace("cos(",    "\\cos(");
    s.replace("tan(",    "\\tan(");
    s.replace("cot(",    "\\cot(");
    s.replace("ln(",     "\\ln(");
    s.replace("exp(",    "\\exp(");
    s.replace("log(",    "\\log(");
    s.replace("sgn(",    "\\mathrm{sgn}(");
    s.replace("round(",  "\\mathrm{round}(");
    s.replace("floor(",  "\\lfloor ");
    s.replace("ceil(",   "\\lceil ");
    s.replace("pi",      "\\pi");
    // sqrt(expr) → \sqrt{expr}
    {
        int i = 0;
        while ((i = s.indexOf("sqrt(", i)) >= 0) {
            s.replace(i, 5, "\\sqrt{");
            int depth = 1, j = i + 6;
            for (; j < s.length() && depth > 0; ++j) {
                if (s[j] == '(') ++depth;
                else if (s[j] == ')') { if (--depth == 0) break; }
            }
            if (depth == 0) s[j] = '}';
            ++i;
        }
    }
    // ^ → ^{...}
    {
        QString out; int n = s.length();
        for (int i = 0; i < n; ++i) {
            if (s[i] != '^' || i + 1 >= n) { out += s[i]; continue; }
            out += '^';
            if (s[i+1] == '{') {
                // already braced
            } else if (s[i+1] == '(') {
                out += '{'; i += 2;
                int depth = 1;
                for (; i < n && depth > 0; ++i) {
                    if (s[i] == '(') { ++depth; out += s[i]; }
                    else if (s[i] == ')') { if (--depth == 0) out += '}'; else out += s[i]; }
                    else out += s[i];
                }
                --i;
            } else {
                out += '{'; ++i;
                if (i < n && s[i] == '-') out += s[i++];
                while (i < n && (s[i].isLetterOrNumber() || s[i] == '.')) out += s[i++];
                out += '}'; --i;
            }
        }
        s = out;
    }
    return s;
}

void HeyGeoNewFunctionDialog::refreshPreview()
{
    const QString expr = m_editor->text().trimmed();
    const QString latex = "f(x) = " + dialogUglyToLatex(expr.isEmpty() ? "?" : expr);

    // Always 14 pt logical, HiDPI-aware.
    const qreal dpr = m_preview->devicePixelRatioF();
    const float sz  = 14.f;
    const float szP = sz * (float)dpr;
    const int   renderW = (int)(1200 * dpr);   // wide enough to never wrap
    tex::color black = 0xFF000000u;

    QPixmap pm;
    try {
        tex::TeXRender *r = tex::LaTeX::parse(
            latex.toStdWString(), renderW, szP, szP * 0.2f, black);
        if (r) {
            const int rw = r->getWidth(), rh = r->getHeight();
            pm = QPixmap(qMax(rw, 10), qMax(rh, 10));
            pm.fill(Qt::white);
            QPainter painter(&pm);
            painter.setRenderHint(QPainter::Antialiasing);
            { tex::Graphics2D_qt g2(&painter); r->draw(g2, 0, 0); }
            delete r;
            pm.setDevicePixelRatio(dpr);
        }
    } catch (...) {}

    if (pm.isNull()) {
        m_preview->setText(tr("(preview unavailable)"));
    } else {
        m_preview->setPixmap(pm);
        m_preview->setFixedHeight(qRound(pm.height() / dpr) + 16);
    }
}

// ── Result accessors ──────────────────────────────────────────────────────────

QString HeyGeoNewFunctionDialog::formula() const
{
    return m_editor->text().trimmed();
}

double HeyGeoNewFunctionDialog::xMin()       const { return m_xMinSpin->value(); }
double HeyGeoNewFunctionDialog::xMax()       const { return m_xMaxSpin->value(); }
int    HeyGeoNewFunctionDialog::numSamples() const { return m_sampleSpin->value(); }


// ────────────────────────────────────────────────────────────────────────────
//  HeyGeoPlotCurveDialog
// ────────────────────────────────────────────────────────────────────────────

HeyGeoPlotCurveDialog::HeyGeoPlotCurveDialog(QWidget *parent,
                                              const G_paramCurve *initial)
    : QDialog(parent)
{
    setModal(true);
    setWindowTitle(tr("Plot Parametric Curve"));
    setMinimumWidth(380);

    auto *vl = new QVBoxLayout(this);

    // ── Formula group ──────────────────────────────────────────────────────
    auto *fmGroup  = new QGroupBox(tr("Parametric equations (variable: t)"), this);
    auto *fmLayout = new QFormLayout(fmGroup);

    QFont mono;
    mono.setFamily(QStringLiteral("Courier"));
    mono.setPointSize(11);

    m_xEdit = new QLineEdit(this);
    m_xEdit->setPlaceholderText(tr("x(t)  e.g. cos(t)"));
    m_xEdit->setFont(mono);
    fmLayout->addRow(tr("x(t) ="), m_xEdit);

    m_yEdit = new QLineEdit(this);
    m_yEdit->setPlaceholderText(tr("y(t)  e.g. sin(t)"));
    m_yEdit->setFont(mono);
    fmLayout->addRow(tr("y(t) ="), m_yEdit);

    vl->addWidget(fmGroup);

    // ── Parameter range ────────────────────────────────────────────────────
    auto *rngGroup = new QGroupBox(tr("Parameter range"), this);
    auto *rngForm  = new QFormLayout(rngGroup);

    m_tMinSpin = new QDoubleSpinBox(this);
    m_tMinSpin->setRange(-1e6, 1e6);
    m_tMinSpin->setValue(0.0);
    m_tMinSpin->setDecimals(4);
    rngForm->addRow(tr("t min:"), m_tMinSpin);

    m_tMaxSpin = new QDoubleSpinBox(this);
    m_tMaxSpin->setRange(-1e6, 1e6);
    m_tMaxSpin->setValue(6.2832);  // 2π
    m_tMaxSpin->setDecimals(4);
    rngForm->addRow(tr("t max:"), m_tMaxSpin);

    m_sampleSpin = new QSpinBox(this);
    m_sampleSpin->setRange(10, 5000);
    m_sampleSpin->setValue(300);
    rngForm->addRow(tr("Samples:"), m_sampleSpin);

    vl->addWidget(rngGroup);

    // ── Buttons ─────────────────────────────────────────────────────────────
    auto *buttons = new QDialogButtonBox(
            QDialogButtonBox::Ok | QDialogButtonBox::Cancel, Qt::Horizontal, this);
    connect(buttons, &QDialogButtonBox::accepted, this, &QDialog::accept);
    connect(buttons, &QDialogButtonBox::rejected, this, &QDialog::reject);
    vl->addWidget(buttons);

    if (initial) {
        m_xEdit->setText(initial->xFunc().formula());
        m_yEdit->setText(initial->yFunc().formula());
        m_tMinSpin->setValue(initial->xFunc().tMin());
        m_tMaxSpin->setValue(initial->xFunc().tMax());
        m_sampleSpin->setValue(initial->xFunc().numSamples());
    }
}

QString HeyGeoPlotCurveDialog::xFormula()   const { return m_xEdit->text().trimmed(); }
QString HeyGeoPlotCurveDialog::yFormula()   const { return m_yEdit->text().trimmed(); }
double  HeyGeoPlotCurveDialog::tMin()       const { return m_tMinSpin->value(); }
double  HeyGeoPlotCurveDialog::tMax()       const { return m_tMaxSpin->value(); }
int     HeyGeoPlotCurveDialog::numSamples() const { return m_sampleSpin->value(); }


// ────────────────────────────────────────────────────────────────────────────
//  HeyGeoCoordSysDialog
// ────────────────────────────────────────────────────────────────────────────

HeyGeoCoordSysDialog::HeyGeoCoordSysDialog(G_coordsys &cs, QWidget *parent)
    : QDialog(parent), m_cs(cs)
{
    setModal(true);
    setWindowTitle(tr("Define Coordinate System"));

    auto *vl   = new QVBoxLayout(this);
    auto *form = new QFormLayout;

    m_scaleSpin = new QDoubleSpinBox(this);
    m_scaleSpin->setRange(5.0, 2000.0);
    m_scaleSpin->setValue(cs.scale());
    m_scaleSpin->setSuffix(tr(" px/unit"));
    m_scaleSpin->setDecimals(1);
    form->addRow(tr("Scale:"), m_scaleSpin);

    m_xLabelEdit = new QLineEdit(cs.xLabel(), this);
    form->addRow(tr("x-axis label:"), m_xLabelEdit);

    m_yLabelEdit = new QLineEdit(cs.yLabel(), this);
    form->addRow(tr("y-axis label:"), m_yLabelEdit);

    m_gridCheck = new QCheckBox(tr("Show grid"), this);
    m_gridCheck->setChecked(cs.showGrid());
    form->addRow(m_gridCheck);

    m_snapCheck = new QCheckBox(tr("Snap points to grid"), this);
    m_snapCheck->setChecked(cs.snapGrid());
    form->addRow(m_snapCheck);

    vl->addLayout(form);

    auto *buttons = new QDialogButtonBox(
            QDialogButtonBox::Ok | QDialogButtonBox::Cancel, Qt::Horizontal, this);
    connect(buttons, &QDialogButtonBox::accepted, this, [this]{ apply(); accept(); });
    connect(buttons, &QDialogButtonBox::rejected, this, &QDialog::reject);
    vl->addWidget(buttons);
}

void HeyGeoCoordSysDialog::apply()
{
    m_cs.setScale(m_scaleSpin->value());
    m_cs.setXLabel(m_xLabelEdit->text());
    m_cs.setYLabel(m_yLabelEdit->text());
    m_cs.setShowGrid(m_gridCheck->isChecked());
    m_cs.setSnapGrid(m_snapCheck->isChecked());
}
