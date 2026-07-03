/*
 *  HeyGeo – Graph Menu Dialogs
 *
 *  HeyGeoNewFunctionDialog  – "New Function" / "Plot Function": define f(x)
 *  HeyGeoPlotCurveDialog    – "Plot Parametric Curve": define (x(t), y(t))
 *  HeyGeoCoordSysDialog     – "Define Axes": configure the coordinate system
 */

#ifndef HEYGEO_GRAPHDIALOGS_H
#define HEYGEO_GRAPHDIALOGS_H

#include <QDialog>
#include <QDoubleSpinBox>
#include <QSpinBox>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QToolButton>
#include <QCheckBox>
#include <QMenu>
#include "G_function.H"
#include "G_coordsys.H"

class HeyGeoView;

// ── HeyGeoNewFunctionDialog ────────────────────────────────────────────────
/**
 * GSP-style "New Function" dialog.
 * Layout inspired by the Calculator:
 *   - KFormulaEdit for rich formula input / preview
 *   - Functions ▼ pop-up (sin, cos, …)
 *   - Values ▼ pop-up (sketch measurements & parameters)
 *   - Numeric keypad + variable key (x)
 *   - Domain / samples settings
 */
class HeyGeoNewFunctionDialog : public QDialog
{
    Q_OBJECT
public:
    explicit HeyGeoNewFunctionDialog(HeyGeoView *view = nullptr,
                                     const G_functionDef *initial = nullptr);

    // Result — plain-text expression, e.g. "x^2+sin(x)"
    QString  formula()    const;
    double   xMin()       const;
    double   xMax()       const;
    int      numSamples() const;

private slots:
    void showFunctionsMenu();
    void showValuesMenu();
    void keypadClicked(int charValue);
    void insertString(const QString &s);

private:
    void buildFunctionsMenu(QMenu *menu);
    void buildValuesMenu(QMenu *menu);
    void refreshPreview();

    HeyGeoView      *m_view;
    QLineEdit       *m_editor;
    QLabel          *m_preview;
    QDoubleSpinBox  *m_xMinSpin;
    QDoubleSpinBox  *m_xMaxSpin;
    QSpinBox        *m_sampleSpin;
    QToolButton     *m_funcsBtn;
    QToolButton     *m_valsBtn;
};


// ── HeyGeoPlotCurveDialog ──────────────────────────────────────────────────
/**
 * Dialog for defining a parametric curve x(t), y(t).
 */
class HeyGeoPlotCurveDialog : public QDialog
{
    Q_OBJECT
public:
    explicit HeyGeoPlotCurveDialog(QWidget *parent = nullptr,
                                   const G_paramCurve *initial = nullptr);

    // Results
    QString xFormula()    const;
    QString yFormula()    const;
    double  tMin()        const;
    double  tMax()        const;
    int     numSamples()  const;

private:
    QLineEdit       *m_xEdit;
    QLineEdit       *m_yEdit;
    QDoubleSpinBox  *m_tMinSpin;
    QDoubleSpinBox  *m_tMaxSpin;
    QSpinBox        *m_sampleSpin;
};


// ── HeyGeoCoordSysDialog ──────────────────────────────────────────────────
/**
 * Dialog to configure an existing coordinate system (scale, labels, grid).
 */
class HeyGeoCoordSysDialog : public QDialog
{
    Q_OBJECT
public:
    explicit HeyGeoCoordSysDialog(G_coordsys &cs, QWidget *parent = nullptr);

private slots:
    void apply();

private:
    G_coordsys       &m_cs;
    QDoubleSpinBox   *m_scaleSpin;
    QLineEdit        *m_xLabelEdit;
    QLineEdit        *m_yLabelEdit;
    QCheckBox        *m_gridCheck;
    QCheckBox        *m_snapCheck;
};

#endif // HEYGEO_GRAPHDIALOGS_H
