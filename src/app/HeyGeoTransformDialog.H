/*
 *  HeyGeo
 *  Copyright (C) 2026 HeyGeo Contributors
 *
 *  GSP-style Transform Dialogs:
 *    HeyGeoTranslateDialog  – Translate (By Marked Vector / Rectangular / Polar)
 *    HeyGeoRotateDialog     – Rotate    (By Marked Angle  / Fixed Angle)
 *    HeyGeoDilateDialog     – Dilate    (By Marked Ratio  / Fixed Ratio)
 *
 *  Each dialog returns a mode enum and the chosen numeric parameters.
 */

#ifndef HEYGEOTRANSFORMDIALOG_H
#define HEYGEOTRANSFORMDIALOG_H

#include <QDialog>
#include <QTabWidget>
#include <QDoubleSpinBox>
#include <QLabel>
#include <QRadioButton>
#include <QDialogButtonBox>
#include <QGroupBox>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFormLayout>
#include <QPushButton>


// ============================================================
//  HeyGeoTranslateDialog
// ============================================================
class HeyGeoTranslateDialog : public QDialog
{
    Q_OBJECT
public:
    enum Mode { ByVector, Rectangular, Polar };

    // hasVector – true when a vector has already been marked.
    // vectorLabel – description of the marked vector (e.g. "A → B").
    explicit HeyGeoTranslateDialog(bool hasVector,
                                   const QString &vectorLabel = QString(),
                                   QWidget *parent = nullptr);

    Mode   mode()     const;
    double dx()       const;   // Rectangular or Polar-decomposed x
    double dy()       const;   // Rectangular or Polar-decomposed y

private:
    QTabWidget     *tabs;
    // Tab 0 – By Marked Vector
    QLabel         *lblVector;
    // Tab 1 – Rectangular
    QDoubleSpinBox *sbDx, *sbDy;
    // Tab 2 – Polar
    QDoubleSpinBox *sbDist, *sbAngle;
};


// ============================================================
//  HeyGeoRotateDialog
// ============================================================
class HeyGeoRotateDialog : public QDialog
{
    Q_OBJECT
public:
    enum Mode { ByMarkedAngle, FixedAngle };

    // hasAngle – true when an angle has already been marked.
    // centerLabel – description of the marked center (e.g. "O").
    // angleLabel  – description of the marked angle (e.g. "∠ABC").
    explicit HeyGeoRotateDialog(bool hasAngle,
                                const QString &centerLabel = QString(),
                                const QString &angleLabel  = QString(),
                                QWidget *parent = nullptr);

    Mode   mode()        const;
    // Fixed Angle result: positive = CCW (as expected by updateTransform).
    double fixedAngleDeg() const;

private:
    QTabWidget     *tabs;
    QLabel         *lblCenter, *lblAngle;
    QDoubleSpinBox *sbAngleDeg;
    QRadioButton   *rbCCW, *rbCW;
};


// ============================================================
//  HeyGeoDilateDialog
// ============================================================
class HeyGeoDilateDialog : public QDialog
{
    Q_OBJECT
public:
    enum Mode { ByMarkedRatio, FixedRatio };

    // hasRatio – true when a ratio has already been marked.
    // centerLabel – description of the marked center.
    // ratioLabel  – description of marked ratio (e.g. "m/n = 0.667").
    explicit HeyGeoDilateDialog(bool hasRatio,
                                const QString &centerLabel = QString(),
                                const QString &ratioLabel  = QString(),
                                QWidget *parent = nullptr);

    Mode   mode()       const;
    double fixedRatio() const;

private:
    QTabWidget     *tabs;
    QLabel         *lblCenter, *lblRatio;
    QDoubleSpinBox *sbRatio;
};

#endif // HEYGEOTRANSFORMDIALOG_H
