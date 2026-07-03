#ifndef HEYGEONEWPARAMETERDIALOG_H
#define HEYGEONEWPARAMETERDIALOG_H

#include <QDialog>
#include <QDoubleSpinBox>
#include <QLineEdit>
#include <QLabel>
#include <QPushButton>
#include <QDialogButtonBox>

/*
 * HeyGeoNewParameterDialog
 *
 * Modal dialog for "Number > New Parameter…".  Asks the user for:
 *   • Name  (single word / identifier, e.g. "n", "k", "alpha")
 *   • Value (initial value)
 *   • Min / Max (range for web slider and desktop animation)
 *
 * The resulting values are read back via the getXxx() accessors after
 * the dialog has been accepted.
 */
class HeyGeoNewParameterDialog : public QDialog
{
    Q_OBJECT
public:
    explicit HeyGeoNewParameterDialog(QWidget *parent = nullptr,
                                      const QString &name  = QStringLiteral("n"),
                                      double value  = 1.0,
                                      double minVal = 0.0,
                                      double maxVal = 10.0);

    QString getName()  const;
    double  getValue() const;
    double  getMin()   const;
    double  getMax()   const;

private slots:
    void validate();

private:
    QLineEdit       *m_nameEdit;
    QDoubleSpinBox  *m_valueSpin;
    QDoubleSpinBox  *m_minSpin;
    QDoubleSpinBox  *m_maxSpin;
    QPushButton     *m_okButton;
};

#endif // HEYGEONEWPARAMETERDIALOG_H
