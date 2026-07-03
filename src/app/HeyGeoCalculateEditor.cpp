// ─────────────────────────────────────────────────────────────────────────────
//  HeyGeoCalculateEditor – GSP-style Calculator Dialog
//
//  Inspiration: Geometer's Sketchpad Calculator window.
//  Key feature: while the dialog is open the user may click any measurement,
//  calculation or parameter visible in the sketch and it is immediately
//  inserted into the expression (click-to-insert).
// ─────────────────────────────────────────────────────────────────────────────

#include <QLayout>
#include <QPushButton>
#include <QToolButton>
#include <QIcon>
#include <QToolTip>
#include <QApplication>
#include <QBoxLayout>
#include <QPixmap>
#include <QLabel>
#include <QMouseEvent>
#include <QList>
#include <QEvent>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QGridLayout>
#include <QFrame>
#include <QMenu>
#include <QAction>
#include <QFont>
#include <QEventLoop>
#include <cmath>

#include "HeyGeoCalculateEditor.H"
#include "G_object.H"
#include "HeyGeoDocument.H"
#include "HeyGeoWindow.H"
#include "HeyGeoNewParameterDialog.H"
// G_parameterObject is declared in G_object.H (already included)

// box.H constants used for insertChar
#include "formula/box.H"
using namespace Box;

// ─────────────────────────────────────────────────────────────────────────────
//  ReferenceFetcher – connects the formula editor to sketch measurements
// ─────────────────────────────────────────────────────────────────────────────

class CalculationDialogReferenceFetcher : public ReferenceFetcher
{
public:
    explicit CalculationDialogReferenceFetcher(HeyGeoCalculateEditor *inRef)
        : ref(inRef) {}

    double getValue(int reference_number) override
    { return ref->getOutputParents()[reference_number]->getObject()->getDisplayNumValue(); }

    KFormula *getFormula(int reference_number) override
    { return ((G_valueObject *)(ref->getOutputParents()[reference_number]->getObject()))->getLhs(); }

    UnitType getUnitType(int reference_number) const override
    {
        G_ref *p = ref->getOutputParents()[reference_number];
        if (p->getType() & G_MEASURE) {
            int dt = p->getDescendType();
            if (dt == G_DISTANCE_MEASURE || dt == G_LENGTH_MEASURE || dt == G_RADIUS_MEASURE)
                return UnitType::length();
            if (dt == G_ANGLE_MEASURE)
                return UnitType::angle();
            if (dt == G_AREA_MEASURE)
                return UnitType::area();
            return UnitType::dimensionless();
        }
        // Calculation result: derive unit from that formula's dimensional analysis.
        if (p->getType() & G_CALCULATE)
            return static_cast<G_valueObject *>(p->getObject())->getLhs()->evaluateUnit();
        return UnitType::dimensionless();
    }

private:
    HeyGeoCalculateEditor *ref;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: build a compact flat keypad button
// ─────────────────────────────────────────────────────────────────────────────
static QPushButton *makeKey(const QString &label, QWidget *parent)
{
    auto *btn = new QPushButton(label, parent);
    btn->setFixedSize(44, 36);
    QFont f = btn->font();
    f.setPointSize(11);
    btn->setFont(f);
    return btn;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Constructor
// ─────────────────────────────────────────────────────────────────────────────

HeyGeoCalculateEditor::HeyGeoCalculateEditor(HeyGeoView *view,
                                             QString     initialString,
                                             G_refs      initialParents,
                                             G_ref      *inCurRef)
    : QDialog(view)
    , outputParents(initialParents)
    , curRef(inCurRef)
    , descendantSearcher(inCurRef)
    , finished(false)
{
    setWindowTitle(tr("Calculator"));
    setModal(false);   // modeless so the user can click objects in the sketch
    // Qt::Tool: floating panel that stays above its parent on macOS without
    // stealing focus, preventing the flicker when the user clicks in the sketch.
    setWindowFlag(Qt::Tool);

    view->installEventFilter(this);
    view->setMenusEnabled(false);

    // Disable other windows so only this dialog and the owning view are active
    QList<HeyGeoView*> allViews = HeyGeoView::getAllViews();
    for (auto *v : allViews) {
        if (v == view) continue;
        v->topLevelWidget()->setEnabled(false);
    }

    // ── Main vertical layout ──────────────────────────────────────────────────
    auto *vMain = new QVBoxLayout(this);
    vMain->setSpacing(6);
    vMain->setContentsMargins(8, 8, 8, 8);

    // ── Expression area (KFormulaEdit) ────────────────────────────────────────
    auto *exprFrame = new QFrame(this);
    exprFrame->setFrameShape(QFrame::StyledPanel);
    exprFrame->setFrameShadow(QFrame::Sunken);
    exprFrame->setMinimumHeight(60);
    auto *exprLayout = new QVBoxLayout(exprFrame);
    exprLayout->setContentsMargins(4, 4, 4, 4);

    editor = new KFormulaEdit(exprFrame, Qt::WindowFlags{}, true);
    editor->getFormula()->setReferenceFetcher(
        std::make_unique<CalculationDialogReferenceFetcher>(this));
    editor->enableSizeHintSignal(true);
    connect(editor, &KFormulaEdit::formulaChanged,
            this,   &HeyGeoCalculateEditor::formulaChanged);
    editor->setText(initialString);
    exprLayout->addWidget(editor);
    vMain->addWidget(exprFrame);

    // ── Value preview label ───────────────────────────────────────────────────
    valueDisplay = new QLabel(tr("Value is undefined"), this);
    QFont lf = valueDisplay->font();
    lf.setItalic(true);
    valueDisplay->setFont(lf);
    vMain->addWidget(valueDisplay);

    // ── Separator line ────────────────────────────────────────────────────────
    auto *sep = new QFrame(this);
    sep->setFrameShape(QFrame::HLine);
    sep->setFrameShadow(QFrame::Sunken);
    vMain->addWidget(sep);

    // ── Middle area: menus (left) + keypad (right) ────────────────────────────
    auto *hMiddle = new QHBoxLayout();
    hMiddle->setSpacing(10);

    // ── Left: pop-up menu buttons ─────────────────────────────────────────────
    auto *vMenus = new QVBoxLayout();
    vMenus->setSpacing(6);
    vMenus->setAlignment(Qt::AlignTop);

    // "Values ▼" button
    valuesBtn = new QToolButton(this);
    valuesBtn->setText(tr("Values  ▼"));
    valuesBtn->setToolButtonStyle(Qt::ToolButtonTextOnly);
    valuesBtn->setPopupMode(QToolButton::InstantPopup);
    valuesBtn->setMinimumWidth(110);
    valuesBtn->setToolTip(tr(
        "Insert a measurement, parameter or constant from the sketch"));
    connect(valuesBtn, &QToolButton::clicked,
            this, &HeyGeoCalculateEditor::showValuesMenu);
    vMenus->addWidget(valuesBtn);

    // "Functions ▼" button
    functionsBtn = new QToolButton(this);
    functionsBtn->setText(tr("Functions  ▼"));
    functionsBtn->setToolButtonStyle(Qt::ToolButtonTextOnly);
    functionsBtn->setPopupMode(QToolButton::InstantPopup);
    functionsBtn->setMinimumWidth(110);
    functionsBtn->setToolTip(tr("Insert a mathematical function"));
    connect(functionsBtn, &QToolButton::clicked,
            this, &HeyGeoCalculateEditor::showFunctionsMenu);
    vMenus->addWidget(functionsBtn);

    // "Units ▼" button
    unitsBtn = new QToolButton(this);
    unitsBtn->setText(tr("Units  ▼"));
    unitsBtn->setToolButtonStyle(Qt::ToolButtonTextOnly);
    unitsBtn->setPopupMode(QToolButton::InstantPopup);
    unitsBtn->setMinimumWidth(110);
    unitsBtn->setToolTip(tr("Insert a unit of measurement (cm, in, px, deg, rad)"));
    connect(unitsBtn, &QToolButton::clicked,
            this, &HeyGeoCalculateEditor::showUnitsMenu);
    vMenus->addWidget(unitsBtn);

    vMenus->addStretch();
    hMiddle->addLayout(vMenus);

    // ── Right: GSP-style numeric keypad ──────────────────────────────────────
    //
    //   7   8   9   +
    //   4   5   6   −
    //   1   2   3   ×
    //   0   .   ⌫   /
    //   (   )   ^   √
    //
    auto *grid = new QGridLayout();
    grid->setSpacing(3);

    // Row 0: 7 8 9 +
    auto *btn7 = makeKey("7", this); grid->addWidget(btn7, 0, 0);
    auto *btn8 = makeKey("8", this); grid->addWidget(btn8, 0, 1);
    auto *btn9 = makeKey("9", this); grid->addWidget(btn9, 0, 2);
    auto *btnAdd = makeKey("+", this); grid->addWidget(btnAdd, 0, 3);

    // Row 1: 4 5 6 −
    auto *btn4 = makeKey("4", this); grid->addWidget(btn4, 1, 0);
    auto *btn5 = makeKey("5", this); grid->addWidget(btn5, 1, 1);
    auto *btn6 = makeKey("6", this); grid->addWidget(btn6, 1, 2);
    auto *btnSub = makeKey("−", this); grid->addWidget(btnSub, 1, 3);

    // Row 2: 1 2 3 ×
    auto *btn1 = makeKey("1", this); grid->addWidget(btn1, 2, 0);
    auto *btn2 = makeKey("2", this); grid->addWidget(btn2, 2, 1);
    auto *btn3 = makeKey("3", this); grid->addWidget(btn3, 2, 2);
    auto *btnMul = makeKey("×", this); grid->addWidget(btnMul, 2, 3);

    // Row 3: 0 . ⌫ /
    auto *btn0 = makeKey("0", this); grid->addWidget(btn0, 3, 0);
    auto *btnDot = makeKey(".", this); grid->addWidget(btnDot, 3, 1);
    auto *btnBS  = makeKey("⌫", this); grid->addWidget(btnBS,  3, 2);
    auto *btnDiv = makeKey("/", this); grid->addWidget(btnDiv, 3, 3);

    // Row 4: ( ) ^ √
    auto *btnLP  = makeKey("(", this); grid->addWidget(btnLP,  4, 0);
    auto *btnRP  = makeKey(")", this); grid->addWidget(btnRP,  4, 1);
    auto *btnPow = makeKey("^", this); grid->addWidget(btnPow, 4, 2);
    auto *btnSqrt = makeKey("√", this); grid->addWidget(btnSqrt, 4, 3);

    hMiddle->addLayout(grid);
    vMain->addLayout(hMiddle);

    // ── Separator ─────────────────────────────────────────────────────────────
    auto *sep2 = new QFrame(this);
    sep2->setFrameShape(QFrame::HLine);
    sep2->setFrameShadow(QFrame::Sunken);
    vMain->addWidget(sep2);

    // ── Bottom: hint label + OK / Cancel ────────────────────────────────────
    auto *hBottom = new QHBoxLayout();

    auto *hintLabel = new QLabel(
        tr("← Click a sketch value to insert it"), this);
    QFont hf = hintLabel->font();
    hf.setPointSize(hf.pointSize() - 1);
    hintLabel->setFont(hf);
    hintLabel->setStyleSheet("color: #555;");
    hBottom->addWidget(hintLabel, 1);

    ok = new QPushButton(tr("OK"), this);
    ok->setDefault(true);
    connect(ok, &QPushButton::clicked, this, &HeyGeoCalculateEditor::OKClicked);
    hBottom->addWidget(ok);

    auto *cancel = new QPushButton(tr("Cancel"), this);
    connect(cancel, &QPushButton::clicked, this, &HeyGeoCalculateEditor::reject);
    hBottom->addWidget(cancel);

    vMain->addLayout(hBottom);

    // ── Wire keypad buttons ───────────────────────────────────────────────────
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
    connect(btnDiv,  &QPushButton::clicked, this, [this]{ keypadClicked(DIVIDE); });

    // Special
    connect(btnLP,   &QPushButton::clicked, this, [this]{ keypadClicked(PAREN); });
    connect(btnRP,   &QPushButton::clicked, this, [this]{
        // Navigate right to exit the current parenthesis group
        editor->setFocus();
        QKeyEvent ev(QEvent::KeyPress, Qt::Key_Right, Qt::NoModifier);
        QApplication::sendEvent(editor, &ev);
    });
    connect(btnPow,  &QPushButton::clicked, this, [this]{ keypadClicked(POWER); });
    connect(btnSqrt, &QPushButton::clicked, this, [this]{ keypadClicked(SQRT); });
    connect(btnBS,   &QPushButton::clicked, this, [this]{
        editor->setFocus();
        QKeyEvent ev(QEvent::KeyPress, Qt::Key_Backspace, Qt::NoModifier,
                     QString(), false);
        QApplication::sendEvent(editor, &ev);
    });

    // ── Initial value display ─────────────────────────────────────────────────
    setFocusProxy(editor);
    formulaChanged(initialString);
}

// ─────────────────────────────────────────────────────────────────────────────

void HeyGeoCalculateEditor::run()
{
    // Use a non-modal show() + local event loop so the sketch view remains
    // interactive (click-to-insert only works when the dialog is non-modal).
    setWindowModality(Qt::NonModal);
    QEventLoop loop;
    connect(this, &QDialog::finished, &loop, &QEventLoop::quit);
    show();
    raise();
    activateWindow();
    loop.exec();
}

HeyGeoCalculateEditor::~HeyGeoCalculateEditor()
{
    HeyGeoView *view = qobject_cast<HeyGeoView *>(parent());
    if (view) {
        view->setCalcHoverRef(nullptr);  // clear any lingering hover highlight
        view->setMenusEnabled(true);
    }

    QList<HeyGeoView*> allViews = HeyGeoView::getAllViews();
    for (auto *v : allViews)
        v->topLevelWidget()->setEnabled(true);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Values pop-up menu
// ─────────────────────────────────────────────────────────────────────────────

void HeyGeoCalculateEditor::buildValuesMenu(QMenu *menu)
{
    HeyGeoView   *view = qobject_cast<HeyGeoView *>(parent());
    HeyGeoDocument *doc = view ? view->getDocument() : nullptr;

    bool anySketchValues = false;

    if (doc) {
        const G_refs &all = doc->getAllRefs();
        for (int i = 0; i < all.count(); ++i) {
            G_ref *r = all[i];
            if (!(r->getType() & G_VALUE))          continue;
            if (r == curRef)                         continue;
            if (!r->getExists() || r->getDeleted())  continue;
            if (curRef && descendantSearcher.search(r)) continue;

            // Use the human-readable display text (e.g. "AD = 4.17 cm").
            // G_valueObject::getDisplayText() is built during update() and
            // matches exactly what is rendered on the sketch.
            QString label = static_cast<G_valueObject *>(r->getObject())->getDisplayText();
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

    // Mathematical constants
    QAction *aPi = menu->addAction(tr("π  =  3.14159…"));
    aPi->setData(QString("__PI__"));

    QAction *aE  = menu->addAction(tr("e  =  2.71828…"));
    aE->setData(QString("__E__"));

    menu->addSeparator();
    QAction *aNew = menu->addAction(tr("New Parameter…"));
    aNew->setData(QString("__NEW_PARAM__"));
}

void HeyGeoCalculateEditor::showValuesMenu()
{
    QMenu menu(this);
    buildValuesMenu(&menu);
    connect(&menu, &QMenu::triggered,
            this,  &HeyGeoCalculateEditor::valuesMenuTriggered);
    menu.exec(valuesBtn->mapToGlobal(
        QPoint(0, valuesBtn->height())));
}

void HeyGeoCalculateEditor::valuesMenuTriggered(QAction *a)
{
    QVariant d = a->data();

    if (d.toString() == "__PI__") {
        // Insert Greek π via Ctrl+G, p shortcut
        editor->setFocus();
        QKeyEvent ctrlG(QEvent::KeyPress, Qt::Key_G, Qt::ControlModifier,
                        "", false);
        QApplication::sendEvent(editor, &ctrlG);
        QKeyEvent pKey(QEvent::KeyPress, Qt::Key_P, Qt::NoModifier, "p", false);
        QApplication::sendEvent(editor, &pKey);
        return;
    }

    if (d.toString() == "__E__") {
        keypadClicked('e');
        return;
    }

    if (d.toString() == "__NEW_PARAM__") {
        insertNewParameter();
        return;
    }

    // Sketch value
    G_ref *r = static_cast<G_ref *>(d.value<void *>());
    if (r) insertReference(r);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Functions pop-up menu
// ─────────────────────────────────────────────────────────────────────────────

void HeyGeoCalculateEditor::buildFunctionsMenu(QMenu *menu)
{
    // Trigonometric
    menu->addAction(tr("sin( )"));
    menu->addAction(tr("cos( )"));
    menu->addAction(tr("tan( )"));
    menu->addSeparator();
    menu->addAction(tr("arcsin( )  [asin]"));
    menu->addAction(tr("arccos( )  [acos]"));
    menu->addAction(tr("arctan( )  [atan]"));
    menu->addSeparator();
    // Algebraic
    menu->addAction(tr("abs( )"));
    menu->addAction(tr("sqrt( )  [√]"));
    menu->addSeparator();
    // Logarithmic / exponential
    menu->addAction(tr("ln( )   [natural log]"));
    menu->addAction(tr("log( )  [natural log, HeyGeo]"));
    menu->addAction(tr("log10( )"));
    menu->addAction(tr("exp( )"));
    menu->addSeparator();
    // Rounding
    menu->addAction(tr("round( )"));
    menu->addAction(tr("trunc( )"));
    menu->addAction(tr("floor( )"));
    menu->addAction(tr("ceil( )"));
    menu->addSeparator();
    // Sign
    menu->addAction(tr("sgn( )  [signum: +1, 0, −1]"));
}

// ─────────────────────────────────────────────────────────────────────────────
//  Units pop-up menu
// ─────────────────────────────────────────────────────────────────────────────

void HeyGeoCalculateEditor::buildUnitsMenu(QMenu *menu)
{
    // Length units
    auto *cmAct  = menu->addAction(tr("cm  (centimetres)"));
    auto *inAct  = menu->addAction(tr("in  (inches)"));
    auto *pxAct  = menu->addAction(tr("px  (pixels)"));
    menu->addSeparator();
    // Angle units
    auto *degAct = menu->addAction(tr("\u00b0   (degrees)"));
    auto *radAct = menu->addAction(tr("rad  (radians)"));

    connect(cmAct,  &QAction::triggered, this, [this]{ insertString("cm");  });
    connect(inAct,  &QAction::triggered, this, [this]{ insertString("in");  });
    connect(pxAct,  &QAction::triggered, this, [this]{ insertString("px");  });
    connect(degAct, &QAction::triggered, this, [this]{ insertString("deg"); });
    connect(radAct, &QAction::triggered, this, [this]{ insertString("rad"); });
}

void HeyGeoCalculateEditor::showUnitsMenu()
{
    QMenu menu(this);
    buildUnitsMenu(&menu);
    menu.exec(unitsBtn->mapToGlobal(
        QPoint(0, unitsBtn->height())));
}

void HeyGeoCalculateEditor::showFunctionsMenu()
{
    QMenu menu(this);
    buildFunctionsMenu(&menu);
    connect(&menu, &QMenu::triggered,
            this,  &HeyGeoCalculateEditor::functionsMenuTriggered);
    menu.exec(functionsBtn->mapToGlobal(
        QPoint(0, functionsBtn->height())));
}

void HeyGeoCalculateEditor::functionsMenuTriggered(QAction *a)
{
    // Extract function name (the word before first '(')
    QString text = a->text();
    int idx = text.indexOf('(');
    if (idx < 0) { insertString(text); return; }

    // The function name is the first token (strip surrounding whitespace)
    QString fname = text.left(idx).trimmed();

    // Strip trailing whitespace / bracket notation like "  [asin]"
    // Only keep the actual function name (no spaces)
    // (e.g., "arcsin( )  [asin]" → fname = "arcsin")
    // but we want to insert the evaluator-recognised name, not the display alias.
    // Map display names to evaluator names:
    static const QHash<QString, QString> aliasMap = {
        { "arcsin",  "asin"   },
        { "arccos",  "acos"   },
        { "arctan",  "atan"   },
        { "ln",      "ln"     },
        { "log",     "log"    },
        { "log10",   "log10"  },
    };

    QString evalName = aliasMap.value(fname, fname);
    insertString(evalName);
    // Insert opening paren (creates matched pair, cursor inside)
    editor->setFocus();
    editor->insertChar(PAREN);   // inserts "( )" pair, cursor inside
}

// ─────────────────────────────────────────────────────────────────────────────
//  New Parameter from inside the Calculator (GSP feature)
// ─────────────────────────────────────────────────────────────────────────────

void HeyGeoCalculateEditor::insertNewParameter()
{
    HeyGeoView   *view = qobject_cast<HeyGeoView *>(parent());
    HeyGeoDocument *doc = view ? view->getDocument() : nullptr;
    if (!doc) return;

    HeyGeoNewParameterDialog dlg(this);
    if (dlg.exec() != QDialog::Accepted) return;

    // Create the parameter object in the document
    G_refs noParents;
    G_ref *paramRef = new G_ref();
    paramRef->create(G_PARAMETER, G_SCALAR_PARAMETER, noParents, doc);
    auto *po = static_cast<G_parameterObject *>(paramRef->getObject());
    po->setParamName(dlg.getName());
    po->setRange(dlg.getMin(), dlg.getMax());
    po->setValue(dlg.getValue());
    paramRef->update();
    paramRef->getObject()->translate(
        G_point(INTRAND(100, 400), INTRAND(50, 200)));

    doc->emitDocumentChanged();

    // Insert a reference to it into the formula
    insertReference(paramRef);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Keypad click handler
// ─────────────────────────────────────────────────────────────────────────────

void HeyGeoCalculateEditor::keypadClicked(int charValue)
{
    editor->setFocus();
    editor->insertChar(charValue);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Insert a plain text string letter-by-letter into the formula editor
// ─────────────────────────────────────────────────────────────────────────────

void HeyGeoCalculateEditor::insertString(const QString &s)
{
    editor->setFocus();
    for (QChar c : s)
        editor->insertChar(int(c.unicode()));
}

// ─────────────────────────────────────────────────────────────────────────────
//  OK button
// ─────────────────────────────────────────────────────────────────────────────

void HeyGeoCalculateEditor::OKClicked()
{
    // Remove parents that are no longer referenced in the formula string
    for (unsigned int i = 0; i < outputParents.size(); ++i) {
        if (!outputString.contains(QChar(int(REFERENCE_NUM(i))))) {
            removeParent(i);
            --i;
        }
    }
    outputString = editor->text();
    accept();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Formula changed – recompute value display
// ─────────────────────────────────────────────────────────────────────────────

void HeyGeoCalculateEditor::formulaChanged(const QString & /*newTextDummy*/)
{
    outputString = editor->text();
    updateValue();
}

void HeyGeoCalculateEditor::updateValue()
{
    std::optional<int> error;
    double value = 0;

    for (int i = 0; i < (int)outputParents.count(); ++i) {
        if (std::fabs(outputParents[i]->getObject()->getNumValue()) >= BIG)
            value = BIG;
    }

    if (value != BIG) {
        QHash<QString, double> unitVars;
        unitVars["cm"]  = 1.0;
        unitVars["in"]  = 2.54;
        unitVars["px"]  = G_cmPerPixel();
        unitVars["deg"] = 1.0;
        unitVars["rad"] = 180.0 / M_PI;
        value = editor->getFormula()->evaluate(unitVars, &error);
    }

    if (error.value_or(0) != 0) {
        value = BIG;
        ok->setEnabled(false);
    } else {
        ok->setEnabled(true);
    }

    if (value != BIG) {
        UnitType ut = editor->getFormula()->evaluateUnit();
        QString unitSuffix;
        if (ut.L == 1 && ut.A == 0) unitSuffix = QStringLiteral(" cm");
        else if (ut.L == 2 && ut.A == 0) unitSuffix = QStringLiteral(" cm\u00B2");
        else if (ut.L == 0 && ut.A == 1) unitSuffix = QStringLiteral("\u00B0");
        valueDisplay->setText(tr("= %1%2").arg(QString::number(value, 'f', 6), unitSuffix));
    } else
        valueDisplay->setText(tr("Value is undefined"));
}

// ─────────────────────────────────────────────────────────────────────────────
//  Remove a parent reference (renumber remaining references in the formula)
// ─────────────────────────────────────────────────────────────────────────────

void HeyGeoCalculateEditor::removeParent(int i)
{
    outputParents.remove(i);

    for (unsigned int j = 0; j < outputString.length(); j++) {
        if (!IS_REFERENCE(outputString[j].unicode())) continue;
        if (outputString[j].unicode() > REFERENCE_NUM(i))
            outputString[j] = QChar(outputString[j].unicode() - 1);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Insert a reference to a sketch object into the expression
// ─────────────────────────────────────────────────────────────────────────────

void HeyGeoCalculateEditor::insertReference(G_ref *r)
{
    // Re-use an existing parent slot if possible
    int i = outputParents.find(r);
    if (i != -1) {
        editor->insertChar(REFERENCE_NUM(i));
        return;
    }

    if (outputParents.size() + 1 >= MAX_REFERENCES) return;

    outputParents.append(r);
    editor->insertChar(REFERENCE_NUM(int(outputParents.size()) - 1));
}

// ─────────────────────────────────────────────────────────────────────────────
//  Event filter – intercepts mouse events on the sketch view so the user can
//  click measurements to insert them into the formula (GSP key feature).
// ─────────────────────────────────────────────────────────────────────────────

bool HeyGeoCalculateEditor::eventFilter(QObject *o, QEvent *e)
{
    if (o != parent()) return false;

    HeyGeoView *v = qobject_cast<HeyGeoView *>(parent());

    if (e->type() == QEvent::MouseMove) {
        auto *m = static_cast<QMouseEvent *>(e);
        G_refs tmp = v->getDocument()->whatAmIOn(
            (int)m->position().x(), (int)m->position().y(),
            ViewTransform(v->getOffsetX(), v->getOffsetY(), v->getZoom()), false);

        G_ref *newHover = nullptr;
        for (int i = 0; i < (int)tmp.size(); ++i) {
            if (tmp[i] == curRef) continue;
            if (tmp[i]->getType() & G_VALUE &&
                (curRef == nullptr || !descendantSearcher.search(tmp[i])))
            {
                newHover = tmp[i];
                break;
            }
        }

        // Update hover highlight (pink border around hovered measurement)
        if (newHover != v->getCalcHoverRef())
            v->setCalcHoverRef(newHover);  // triggers view repaint

        if (newHover) {
            v->setCursor(Qt::UpArrowCursor);
            // Show display text (e.g. "AD = 4.17 cm") in status bar
            QString disp = static_cast<G_valueObject *>(newHover->getObject())->getDisplayText();
            if (disp.isEmpty()) disp = G_ref::getNameFromType(newHover->getType());
            QString msg = tr("Insert %1").arg(disp);
            ((HeyGeoWindow *)(v->topLevelWidget()))
                ->statusBarMessage(msg);
        } else {
            v->unsetCursor();
            ((HeyGeoWindow *)(v->topLevelWidget()))
                ->statusBarMessage(tr("Ready"));
        }
        return true;
    }

    if (e->type() == QEvent::MouseButtonRelease ||
        e->type() == QEvent::MouseButtonDblClick) {
        return true;
    }

    if (e->type() == QEvent::MouseButtonPress) {
        auto *m = static_cast<QMouseEvent *>(e);
        G_refs tmp = v->getDocument()->whatAmIOn(
            (int)m->position().x(), (int)m->position().y(),
            ViewTransform(v->getOffsetX(), v->getOffsetY(), v->getZoom()), false);

        for (int i = 0; i < (int)tmp.size(); ++i) {
            if (tmp[i] == curRef) continue;
            if (tmp[i]->getType() & G_VALUE &&
                (curRef == nullptr || !descendantSearcher.search(tmp[i])))
            {
                insertReference(tmp[i]);
                break;
            }
        }

        // Qt::Tool keeps this panel above parent; raise() ensures it's front.
        raise();
        activateWindow();
        return true;
    }

    return false;
}

