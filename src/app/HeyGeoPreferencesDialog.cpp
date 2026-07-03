#include <QButtonGroup>
#include <QIcon>
#include <QLabel>
#include <QPushButton>
#include <QRadioButton>
#include <QLayout>
#include <QToolTip>
#include <QColorDialog>
#include <QPixmap>
#include <QHBoxLayout>
#include <QVBoxLayout>
#include "HeyGeoPreferencesDialog.H"
#include "HeyGeoProperties.H"
#include "HeyGeoView.H"

HeyGeoPreferencesDialog::HeyGeoPreferencesDialog(QWidget* parent, const char* name, bool /*modal*/, Qt::WindowFlags fl)
    : QDialog(parent, fl)
{
    if (!name)
        setObjectName("HeyGeoPreferencesDialog");
    resize(298, 200);
    setWindowTitle(tr("HeyGeo Preferences"));
    setSizeGripEnabled(true);

    HeyGeoPreferencesDialogLayout = new QVBoxLayout(this);
    HeyGeoPreferencesDialogLayout->setSpacing(6);
    HeyGeoPreferencesDialogLayout->setContentsMargins(11, 11, 11, 11);

    Layout1 = new QHBoxLayout();
    BackgroundLabel = new QLabel(tr("Background Color"), this);
    Layout1->addWidget(BackgroundLabel);
    Layout1->addStretch();
    BackgroundColorButton = new QPushButton(this);
    Layout1->addWidget(BackgroundColorButton);
    HeyGeoPreferencesDialogLayout->addLayout(Layout1);

    Layout2 = new QHBoxLayout();
    ForegroundLabel = new QLabel(tr("Default Foreground Color"), this);
    Layout2->addWidget(ForegroundLabel);
    Layout2->addStretch();
    ForegroundColorButton = new QPushButton(this);
    Layout2->addWidget(ForegroundColorButton);
    HeyGeoPreferencesDialogLayout->addLayout(Layout2);

    Layout3 = new QHBoxLayout();
    SelectionButtonGroup = new QButtonGroup(this);
    BorderSelectButton = new QRadioButton(tr("Border Selection"), this);
    BlinkingSelectButton = new QRadioButton(tr("Blinking Selection"), this);
    SelectionButtonGroup->addButton(BorderSelectButton);
    SelectionButtonGroup->addButton(BlinkingSelectButton);
    Layout3->addWidget(BorderSelectButton);
    Layout3->addWidget(BlinkingSelectButton);
    HeyGeoPreferencesDialogLayout->addLayout(Layout3);
    HeyGeoPreferencesDialogLayout->addStretch();

    Layout4 = new QHBoxLayout();
    buttonOk = new QPushButton(tr("OK"), this);
    buttonCancel = new QPushButton(tr("Cancel"), this);
    Layout4->addWidget(buttonOk);
    Layout4->addWidget(buttonCancel);
    Layout4->addStretch();
    HeyGeoPreferencesDialogLayout->addLayout(Layout4);

    connect(buttonOk, &QPushButton::clicked, this, &HeyGeoPreferencesDialog::accept);
    connect(buttonCancel, &QPushButton::clicked, this, &HeyGeoPreferencesDialog::reject);
    connect(ForegroundColorButton, &QPushButton::clicked, this, &HeyGeoPreferencesDialog::foregroundButtonClicked);
    connect(BackgroundColorButton, &QPushButton::clicked, this, &HeyGeoPreferencesDialog::backgroundButtonClicked);
    connect(BorderSelectButton, &QRadioButton::clicked, this, &HeyGeoPreferencesDialog::selectButtonClicked);
    connect(BlinkingSelectButton, &QRadioButton::clicked, this, &HeyGeoPreferencesDialog::selectButtonClicked);

    init();
}

/*  
 *  Destroys the object and frees any allocated resources
 */
HeyGeoPreferencesDialog::~HeyGeoPreferencesDialog()
{
    destroy();
    // no need to delete child widgets, Qt does it all for us
}

void HeyGeoPreferencesDialog::init()
{
    buttonPM = QPixmap(ForegroundColorButton->size() - QSize(10, 10));
    foregroundColorChosen = QColor(HeyGeoProperties::getProperty("ForegroundColor"));
    backgroundColorChosen = QColor(HeyGeoProperties::getProperty("BackgroundColor"));
    blinkingSelectChosen = HeyGeoProperties::getProperty("SelectType") == "BlinkingSelect";
    updateButtons();
}

void HeyGeoPreferencesDialog::destroy()
{
}


void HeyGeoPreferencesDialog::accept()
{
  HeyGeoProperties::setProperty("ForegroundColor", foregroundColorChosen.name());
  HeyGeoProperties::setProperty("BackgroundColor", backgroundColorChosen.name());
  HeyGeoProperties::setProperty("SelectType", blinkingSelectChosen ? "BlinkingSelect" : "BorderSelect");

  HeyGeoView::updateAllViews();

  QDialog::accept();
}


void HeyGeoPreferencesDialog::updateButtons()
{

  buttonPM.fill(foregroundColorChosen);
  ForegroundColorButton->setIcon(QIcon(buttonPM));

  buttonPM.fill(backgroundColorChosen);
  BackgroundColorButton->setIcon(QIcon(buttonPM));

  if(blinkingSelectChosen) {
    BlinkingSelectButton->setChecked(true);
  }
  else {
    BorderSelectButton->setChecked(true);
  }
}


void HeyGeoPreferencesDialog::foregroundButtonClicked()
{
  QColor c = QColorDialog::getColor(foregroundColorChosen, this);
  if(c.isValid()) {
    foregroundColorChosen = c;
    updateButtons();
  }
}

void HeyGeoPreferencesDialog::backgroundButtonClicked()
{
  QColor c = QColorDialog::getColor(backgroundColorChosen, this);
  if(c.isValid()) {
    backgroundColorChosen = c;
    updateButtons();
  }
}

void HeyGeoPreferencesDialog::selectButtonClicked()
{
  blinkingSelectChosen = BlinkingSelectButton->isChecked();
}



