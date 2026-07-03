#ifndef HeyGeoPROPERTIES_H
#define HeyGeoPROPERTIES_H

#include "defs.H"
#include <QString>
#include <QHash>

#define HASH_NAMESPACE std

// Singleton class
class HeyGeoProperties
{
public:
    static QString getProperty(QString name);
    static void setProperty(QString name, QString value);
    static void setPropertyDefault(QString name, QString value);

private:
    HeyGeoProperties();

    void save();

    QString getProp(QString name);
    void setProp(QString name, QString value);

    QHash<QString, QString> myMap;

    static HeyGeoProperties *properties;
    static const QString configFile;
};

#endif // HeyGeoPROPERTIES_H
