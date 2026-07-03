/*
 *  HeyGeo
 *  Copyright (C) 2026 HeyGeo Contributors
 *
 *  Implementation of GSP-style Transform Dialogs.
 */

#include "HeyGeoTransformDialog.H"
#include <cmath>

// ─── helpers ────────────────────────────────────────────────────────────────

static QDoubleSpinBox *makeDistSpin(double minVal, double maxVal, double step,
                                    double initVal, QWidget *parent = nullptr)
{
    auto *sb = new QDoubleSpinBox(parent);
    sb->setRange(minVal, maxVal);
    sb->setSingleStep(step);
    sb->setDecimals(2);
    sb->setValue(initVal);
    return sb;
}

static QLabel *makeInfoLabel(const QString &html, QWidget *parent = nullptr)
{
    auto *lbl = new QLabel(html, parent);
    lbl->setWordWrap(true);
    lbl->setAlignment(Qt::AlignLeft | Qt::AlignTop);
    return lbl;
}

// ============================================================
//  HeyGeoTranslateDialog
// ============================================================

HeyGeoTranslateDialog::HeyGeoTranslateDialog(bool hasVector,
                                             const QString &vectorLabel,
                                             QWidget *parent)
    : QDialog(parent)
{
    setWindowTitle(tr("Translate"));
    setModal(true);

    tabs = new QTabWidget(this);

    // ── Tab 0: By Marked Vector ──────────────────────────────────────────────
    {
        QWidget *w = new QWidget(tabs);
        QVBoxLayout *lay = new QVBoxLayout(w);
        lay->setSpacing(8);
        lay->setContentsMargins(12, 12, 12, 12);

        if (hasVector) {
            QString desc = vectorLabel.isEmpty()
                           ? tr("The marked vector will be used as the translation direction and distance.")
                           : tr("Translate by the marked vector <b>%1</b>.").arg(vectorLabel);
            lay->addWidget(makeInfoLabel(desc, w));
        } else {
            lblVector = makeInfoLabel(
                tr("<i>No vector is currently marked.</i><br>"
                   "Select two points and choose <b>Transform → Mark Vector</b> first,<br>"
                   "or use the Rectangular / Polar tabs to specify a fixed distance."),
                w);
            lay->addWidget(lblVector);
        }
        lay->addStretch();
        tabs->addTab(w, tr("By Marked Vector"));
        tabs->setTabEnabled(0, hasVector);
    }

    // ── Tab 1: Rectangular ───────────────────────────────────────────────────
    {
        QWidget *w = new QWidget(tabs);
        QFormLayout *form = new QFormLayout(w);
        form->setSpacing(8);
        form->setContentsMargins(12, 12, 12, 12);

        sbDx = makeDistSpin(-9999.0, 9999.0, 10.0, 0.0, w);
        sbDy = makeDistSpin(-9999.0, 9999.0, 10.0, 0.0, w);

        form->addRow(tr("Horizontal (→):"), sbDx);
        form->addRow(tr("Vertical (↓):"),   sbDy);
        form->addRow(new QLabel(tr("<small>Units: document pixels (y increases downward)</small>"), w));

        tabs->addTab(w, tr("Rectangular"));
    }

    // ── Tab 2: Polar ─────────────────────────────────────────────────────────
    {
        QWidget *w = new QWidget(tabs);
        QFormLayout *form = new QFormLayout(w);
        form->setSpacing(8);
        form->setContentsMargins(12, 12, 12, 12);

        sbDist  = makeDistSpin(0.0, 9999.0, 10.0, 100.0, w);
        sbAngle = makeDistSpin(-360.0, 360.0, 5.0, 0.0, w);

        form->addRow(tr("Distance:"),         sbDist);
        form->addRow(tr("Angle (°, →=0°):"), sbAngle);
        form->addRow(new QLabel(tr("<small>Positive angle = counter-clockwise (screen)</small>"), w));

        tabs->addTab(w, tr("Polar"));
    }

    // If no vector is marked, default to Rectangular tab
    if (!hasVector) tabs->setCurrentIndex(1);

    // Button box
    auto *bb = new QDialogButtonBox(QDialogButtonBox::Ok | QDialogButtonBox::Cancel, this);
    bb->button(QDialogButtonBox::Ok)->setText(tr("Translate"));
    connect(bb, &QDialogButtonBox::accepted, this, &QDialog::accept);
    connect(bb, &QDialogButtonBox::rejected, this, &QDialog::reject);

    auto *mainLay = new QVBoxLayout(this);
    mainLay->addWidget(tabs);
    mainLay->addWidget(bb);
    setLayout(mainLay);
    setMinimumWidth(340);
}

HeyGeoTranslateDialog::Mode HeyGeoTranslateDialog::mode() const
{
    switch (tabs->currentIndex()) {
    case 0:  return ByVector;
    case 1:  return Rectangular;
    default: return Polar;
    }
}

double HeyGeoTranslateDialog::dx() const
{
    if (tabs->currentIndex() == 1) return sbDx->value();
    // Polar
    double r  = sbDist->value();
    double th = sbAngle->value() * M_PI / 180.0;
    return r * std::cos(th);
}

double HeyGeoTranslateDialog::dy() const
{
    if (tabs->currentIndex() == 1) return sbDy->value();
    // Polar – note: HeyGeo y increases downward, so angle 0 = right, 90 = up-screen
    double r  = sbDist->value();
    double th = sbAngle->value() * M_PI / 180.0;
    return -r * std::sin(th);   // negate because screen y is inverted
}


// ============================================================
//  HeyGeoRotateDialog
// ============================================================

HeyGeoRotateDialog::HeyGeoRotateDialog(bool hasAngle,
                                       const QString &centerLabel,
                                       const QString &angleLabel,
                                       QWidget *parent)
    : QDialog(parent)
{
    setWindowTitle(tr("Rotate"));
    setModal(true);

    tabs = new QTabWidget(this);

    // ── Tab 0: By Marked Angle ───────────────────────────────────────────────
    {
        QWidget *w = new QWidget(tabs);
        QVBoxLayout *lay = new QVBoxLayout(w);
        lay->setSpacing(8);
        lay->setContentsMargins(12, 12, 12, 12);

        QString cDesc = centerLabel.isEmpty()
                        ? tr("the marked center")
                        : tr("<b>%1</b>").arg(centerLabel);
        if (hasAngle) {
            QString aDesc = angleLabel.isEmpty()
                            ? tr("the marked angle")
                            : tr("<b>%1</b>").arg(angleLabel);
            lay->addWidget(makeInfoLabel(
                tr("Rotate the selected objects around %1 by %2.").arg(cDesc, aDesc), w));
        } else {
            lay->addWidget(makeInfoLabel(
                tr("<i>No angle is currently marked.</i><br>"
                   "Select an angle measure / three points and choose "
                   "<b>Transform → Mark Angle</b> first,<br>"
                   "or use the Fixed Angle tab to enter a numeric value."), w));
        }
        lay->addStretch();
        tabs->addTab(w, tr("By Marked Angle"));
        tabs->setTabEnabled(0, hasAngle);
    }

    // ── Tab 1: Fixed Angle ───────────────────────────────────────────────────
    {
        QWidget *w = new QWidget(tabs);
        QVBoxLayout *lay = new QVBoxLayout(w);
        lay->setSpacing(8);
        lay->setContentsMargins(12, 12, 12, 12);

        if (!centerLabel.isEmpty())
            lay->addWidget(makeInfoLabel(tr("Rotate around %1.").arg(
                tr("<b>%1</b>").arg(centerLabel)), w));

        QFormLayout *form = new QFormLayout;
        sbAngleDeg = makeDistSpin(0.0, 360.0, 5.0, 90.0, w);
        form->addRow(tr("Angle (degrees):"), sbAngleDeg);
        lay->addLayout(form);

        auto *grp = new QGroupBox(tr("Direction"), w);
        auto *gLay = new QHBoxLayout(grp);
        rbCCW = new QRadioButton(tr("Counter-clockwise"), grp);
        rbCW  = new QRadioButton(tr("Clockwise"), grp);
        rbCCW->setChecked(true);
        gLay->addWidget(rbCCW);
        gLay->addWidget(rbCW);
        lay->addWidget(grp);
        lay->addStretch();

        tabs->addTab(w, tr("Fixed Angle"));
    }

    if (!hasAngle) tabs->setCurrentIndex(1);

    auto *bb = new QDialogButtonBox(QDialogButtonBox::Ok | QDialogButtonBox::Cancel, this);
    bb->button(QDialogButtonBox::Ok)->setText(tr("Rotate"));
    connect(bb, &QDialogButtonBox::accepted, this, &QDialog::accept);
    connect(bb, &QDialogButtonBox::rejected, this, &QDialog::reject);

    auto *mainLay = new QVBoxLayout(this);
    mainLay->addWidget(tabs);
    mainLay->addWidget(bb);
    setLayout(mainLay);
    setMinimumWidth(340);
}

HeyGeoRotateDialog::Mode HeyGeoRotateDialog::mode() const
{
    return tabs->currentIndex() == 0 ? ByMarkedAngle : FixedAngle;
}

double HeyGeoRotateDialog::fixedAngleDeg() const
{
    double deg = sbAngleDeg->value();
    // updateTransform() uses: angle_rad = (360 - value) / 180 * PI
    // For CCW (screen): need angle_rad = 3π/2 for 90° → value = 90 = deg
    // For CW  (screen): need angle_rad = π/2  for 90° → value = 270 = 360 - deg
    if (rbCCW->isChecked())
        return deg;          // CCW on screen: value = θ
    return 360.0 - deg;      // CW  on screen: value = 360 - θ
}


// ============================================================
//  HeyGeoDilateDialog
// ============================================================

HeyGeoDilateDialog::HeyGeoDilateDialog(bool hasRatio,
                                       const QString &centerLabel,
                                       const QString &ratioLabel,
                                       QWidget *parent)
    : QDialog(parent)
{
    setWindowTitle(tr("Dilate"));
    setModal(true);

    tabs = new QTabWidget(this);

    // ── Tab 0: By Marked Ratio ───────────────────────────────────────────────
    {
        QWidget *w = new QWidget(tabs);
        QVBoxLayout *lay = new QVBoxLayout(w);
        lay->setSpacing(8);
        lay->setContentsMargins(12, 12, 12, 12);

        QString cDesc = centerLabel.isEmpty()
                        ? tr("the marked center")
                        : tr("<b>%1</b>").arg(centerLabel);
        if (hasRatio) {
            QString rDesc = ratioLabel.isEmpty()
                            ? tr("the marked ratio")
                            : tr("<b>%1</b>").arg(ratioLabel);
            lay->addWidget(makeInfoLabel(
                tr("Dilate the selected objects from %1 by %2.").arg(cDesc, rDesc), w));
        } else {
            lay->addWidget(makeInfoLabel(
                tr("<i>No ratio is currently marked.</i><br>"
                   "Select a value measure / two segments and choose "
                   "<b>Transform → Mark Ratio</b> first,<br>"
                   "or use the Fixed Ratio tab to enter a numeric value."), w));
        }
        lay->addStretch();
        tabs->addTab(w, tr("By Marked Ratio"));
        tabs->setTabEnabled(0, hasRatio);
    }

    // ── Tab 1: Fixed Ratio ───────────────────────────────────────────────────
    {
        QWidget *w = new QWidget(tabs);
        QVBoxLayout *lay = new QVBoxLayout(w);
        lay->setSpacing(8);
        lay->setContentsMargins(12, 12, 12, 12);

        if (!centerLabel.isEmpty())
            lay->addWidget(makeInfoLabel(tr("Dilate from %1.").arg(
                tr("<b>%1</b>").arg(centerLabel)), w));

        QFormLayout *form = new QFormLayout;
        sbRatio = makeDistSpin(-100.0, 100.0, 0.1, 2.0, w);
        sbRatio->setSingleStep(0.25);
        sbRatio->setDecimals(4);
        form->addRow(tr("Scale factor:"), sbRatio);
        lay->addLayout(form);
        lay->addWidget(new QLabel(
            tr("<small>Factor &gt; 1 enlarges; 0 &lt; factor &lt; 1 shrinks;<br>"
               "negative factor also reflects through center.</small>"), w));
        lay->addStretch();

        tabs->addTab(w, tr("Fixed Ratio"));
    }

    if (!hasRatio) tabs->setCurrentIndex(1);

    auto *bb = new QDialogButtonBox(QDialogButtonBox::Ok | QDialogButtonBox::Cancel, this);
    bb->button(QDialogButtonBox::Ok)->setText(tr("Dilate"));
    connect(bb, &QDialogButtonBox::accepted, this, &QDialog::accept);
    connect(bb, &QDialogButtonBox::rejected, this, &QDialog::reject);

    auto *mainLay = new QVBoxLayout(this);
    mainLay->addWidget(tabs);
    mainLay->addWidget(bb);
    setLayout(mainLay);
    setMinimumWidth(340);
}

HeyGeoDilateDialog::Mode HeyGeoDilateDialog::mode() const
{
    return tabs->currentIndex() == 0 ? ByMarkedRatio : FixedRatio;
}

double HeyGeoDilateDialog::fixedRatio() const
{
    return sbRatio->value();
}
