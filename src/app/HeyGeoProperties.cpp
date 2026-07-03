#include "HeyGeoProperties.H"
#include <QSettings>
#include <QDir>

HeyGeoProperties* HeyGeoProperties::properties = nullptr;
const QString HeyGeoProperties::configFile = QDir::homePath() + "/.heygeo";

HeyGeoProperties::HeyGeoProperties()
{
    QSettings settings(configFile, QSettings::IniFormat);
    QStringList keys = settings.allKeys();
    for (const auto& key : keys) {
        myMap[key] = settings.value(key).toString();
    }
}

void HeyGeoProperties::save()
{
    QSettings settings(configFile, QSettings::IniFormat);
    for (auto it = myMap.begin(); it != myMap.end(); ++it) {
        settings.setValue(it.key(), it.value());
    }
}

QString HeyGeoProperties::getProp(QString name)
{
    auto it = myMap.find(name);
    if (it != myMap.end()) {
        return it.value();
    }
    return QString();
}

void HeyGeoProperties::setProp(QString name, QString value)
{
    myMap[name] = value;
    save();
}

QString HeyGeoProperties::getProperty(QString name)
{
    if (!properties) {
        properties = new HeyGeoProperties();
    }
    return properties->getProp(name);
}

void HeyGeoProperties::setProperty(QString name, QString value)
{
    if (!properties) {
        properties = new HeyGeoProperties();
    }
    properties->setProp(name, value);
}

void HeyGeoProperties::setPropertyDefault(QString name, QString value)
{
    if (!properties) {
        properties = new HeyGeoProperties();
    }
    if (!properties->myMap.contains(name)) {
        properties->setProp(name, value);
    }
}
