#ifndef HeyGeoCALCULATEEDITOR_H
#define HeyGeoCALCULATEEDITOR_H

#include <QString>
#include <QDialog>
#include <QLabel>
#include <QApplication>
#include <QLayout>
#include <QToolButton>
#include <QPixmap>
#include <QEvent>
#include <QHBoxLayout>
#include <QPushButton>
#include <QMenu>
#include <QFrame>
#include "formula/kformulaedit.H"
#include "G_refs.H"
#include "HeyGeoView.H"
#include "G_refSearcher.H"

// ─────────────────────────────────────────────────────────────────────────────
//  GSP-style Calculator Dialog
//
//  Layout (inspired by Geometer's Sketchpad):
//
//   ┌────────────────────────────────────────────────────┐
//   │  ┌──────────────── expression area ─────────────┐  │
//   │  │      KFormulaEdit (rich formula editor)      │  │
//   │  └──────────────────────────────────────────────┘  │
//   │  = 3.1416   (live value preview)                   │
//   ├────────────────────┬───────────────────────────────┤
//   │ [Values  ▼]        │   7  8  9  +                  │
//   │ [Functions ▼]      │   4  5  6  −                  │
//   │                    │   1  2  3  ×                  │
//   │                    │   0  .  ⌫  ÷                  │
//   │                    │   ( )  ^  √                   │
//   │                    │   π  e                        │
//   ├────────────────────┴───────────────────────────────┤
//   │ ← Click a sketch value to insert it  [OK][Cancel]  │
//   └────────────────────────────────────────────────────┘
//
//  Key GSP feature: while the dialog is open the user can click any
//  measurement / calculation / parameter visible in the sketch and it
//  is immediately inserted into the expression.
// ─────────────────────────────────────────────────────────────────────────────

class HeyGeoCalculateEditor : public QDialog
{
    Q_OBJECT
public:
    HeyGeoCalculateEditor(HeyGeoView *view, QString initialString = QString(),
                          G_refs initialParents = G_refs(), G_ref *inCurRef = nullptr);
    virtual ~HeyGeoCalculateEditor();

    QString getOutputString() const { return outputString; }
    const G_refs &getOutputParents() const { return outputParents; }

    void run();

    // Called by the Values menu "New Parameter…" action
    void insertNewParameter();

protected slots:
    void OKClicked();
    void reject() override { finished = true; QDialog::reject(); }
    void accept() override { finished = true; QDialog::accept(); }
    void formulaChanged(const QString &newText);

    // Keypad buttons
    void keypadClicked(int charValue);

    // Pop-up menus
    void showValuesMenu();
    void showFunctionsMenu();
    void valuesMenuTriggered(QAction *a);
    void functionsMenuTriggered(QAction *a);

protected:
    void removeParent(int i);
    void updateValue();
    void insertReference(G_ref *r);
    void insertString(const QString &s);   // insert char-by-char into editor
    bool eventFilter(QObject *, QEvent *e) override;

    // Helpers
    void buildValuesMenu(QMenu *menu);
    void buildFunctionsMenu(QMenu *menu);

    G_refs outputParents;
    QString outputString;
    KFormulaEdit *editor;
    QPushButton  *ok;
    QLabel       *valueDisplay;
    G_ref        *curRef;
    DescendantSearcher descendantSearcher;
    bool finished;

    QToolButton *valuesBtn;
    QToolButton *functionsBtn;
    QToolButton *unitsBtn;

    void showUnitsMenu();
    void buildUnitsMenu(QMenu *menu);
};

#endif // HeyGeoCALCULATEEDITOR_H
