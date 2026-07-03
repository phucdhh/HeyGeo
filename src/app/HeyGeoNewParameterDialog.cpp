#include "HeyGeoNewParameterDialog.H"

#include <QFormLayout>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QDialogButtonBox>
#include <QMessageBox>

HeyGeoNewParameterDialog::HeyGeoNewParameterDialog(QWidget *parent,
                                                   const QString &name,
                                                   double value,
                                                   double minVal,
                                                   double maxVal)
    : QDialog(parent)
{
    setWindowTitle(tr("New Parameter"));
    setModal(true);

    auto *form = new QFormLayout();

    // Name
    m_nameEdit = new QLineEdit(name, this);
    m_nameEdit->setMaxLength(32);
    m_nameEdit->setPlaceholderText(tr("e.g. n, k, alpha"));
    form->addRow(tr("Name:"), m_nameEdit);

    // Value
    m_valueSpin = new QDoubleSpinBox(this);
    m_valueSpin->setRange(-1e9, 1e9);
    m_valueSpin->setDecimals(4);
    m_valueSpin->setSingleStep(0.1);
    m_valueSpin->setValue(value);
    form->addRow(tr("Value:"), m_valueSpin);

    // Min
    m_minSpin = new QDoubleSpinBox(this);
    m_minSpin->setRange(-1e9, 1e9);
    m_minSpin->setDecimals(4);
    m_minSpin->setSingleStep(0.1);
    m_minSpin->setValue(minVal);
    form->addRow(tr("Min:"), m_minSpin);

    // Max
    m_maxSpin = new QDoubleSpinBox(this);
    m_maxSpin->setRange(-1e9, 1e9);
    m_maxSpin->setDecimals(4);
    m_maxSpin->setSingleStep(0.1);
    m_maxSpin->setValue(maxVal);
    form->addRow(tr("Max:"), m_maxSpin);

    // Buttons
    auto *buttons = new QDialogButtonBox(QDialogButtonBox::Ok | QDialogButtonBox::Cancel, this);
    m_okButton = buttons->button(QDialogButtonBox::Ok);
    connect(buttons, &QDialogButtonBox::accepted, this, &HeyGeoNewParameterDialog::validate);
    connect(buttons, &QDialogButtonBox::rejected, this, &QDialog::reject);

    auto *vlay = new QVBoxLayout(this);
    vlay->addLayout(form);
    vlay->addWidget(buttons);
    setLayout(vlay);

    connect(m_nameEdit, &QLineEdit::textChanged, this, [this](const QString &t) {
        m_okButton->setEnabled(!t.trimmed().isEmpty());
    });
}

QString HeyGeoNewParameterDialog::getName()  const { return m_nameEdit->text().trimmed(); }
double  HeyGeoNewParameterDialog::getValue() const { return m_valueSpin->value(); }
double  HeyGeoNewParameterDialog::getMin()   const { return m_minSpin->value(); }
double  HeyGeoNewParameterDialog::getMax()   const { return m_maxSpin->value(); }

void HeyGeoNewParameterDialog::validate()
{
    if (getName().isEmpty()) {
        QMessageBox::warning(this, tr("New Parameter"), tr("Please enter a parameter name."));
        return;
    }
    if (getMin() >= getMax()) {
        QMessageBox::warning(this, tr("New Parameter"),
                             tr("Min value must be less than Max value."));
        return;
    }
    double v = getValue();
    if (v < getMin() || v > getMax()) {
        // Clamp silently
        m_valueSpin->setValue(qBound(getMin(), v, getMax()));
    }
    accept();
}
