#ifndef HeyGeoPREFERENCESDIALOG_H
#define HeyGeoPREFERENCESDIALOG_H

#include <QDialog>
#include <QPixmap>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QButtonGroup>
#include <QLabel>
#include <QPushButton>
#include <QRadioButton>

class HeyGeoPreferencesDialog : public QDialog
{
    Q_OBJECT
public:
    HeyGeoPreferencesDialog(QWidget* parent = nullptr, const char* name = nullptr, bool modal = false, Qt::WindowFlags fl = {});
    ~HeyGeoPreferencesDialog();

    QLabel* BackgroundLabel;
    QPushButton* BackgroundColorButton;
    QLabel* ForegroundLabel;
    QPushButton* ForegroundColorButton;
    QButtonGroup* SelectionButtonGroup;
    QRadioButton* BorderSelectButton;
    QRadioButton* BlinkingSelectButton;
    QPushButton* buttonOk;
    QPushButton* buttonCancel;

protected slots:
    virtual void init();
    virtual void destroy();
    virtual void accept();
    virtual void foregroundButtonClicked();
    virtual void backgroundButtonClicked();
    virtual void selectButtonClicked();

protected:
    QVBoxLayout* HeyGeoPreferencesDialogLayout;
    QHBoxLayout* Layout1;
    QHBoxLayout* Layout2;
    QHBoxLayout* Layout3;
    QHBoxLayout* SelectionButtonGroupLayout;
    QHBoxLayout* Layout4;

    QPixmap buttonPM;
    QColor foregroundColorChosen;
    QColor backgroundColorChosen;
    bool blinkingSelectChosen;

    void updateButtons();
};

#endif // HeyGeoPREFERENCESDIALOG_H
