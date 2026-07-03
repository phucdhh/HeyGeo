#ifndef KFORMULA_H_INCLUDED
#define KFORMULA_H_INCLUDED

#include <QPainter>
#include <QString>
#include <QChar>
#include <QRect>
#include <QHash>
#include <QFont>
#include <QColor>
#include <memory>
#include <optional>
#include <vector>
#include "box.H"

struct charinfo {
    box* where;
    int posinbox;
    int posinstr;
    bool left;
};

inline bool operator==(const charinfo& a, const charinfo& b) {
    return a.where == b.where &&
           a.posinbox == b.posinbox &&
           a.posinstr == b.posinstr &&
           a.left == b.left;
}

constexpr QChar L_GROUP = QChar('{');
constexpr QChar R_GROUP = QChar('}');
constexpr QChar L_BRACE_UNSEEN = QChar(129);
constexpr QChar R_BRACE_UNSEEN = QChar(130);

enum class ErrorType {
    NO_ERROR = 0,
    DIVISION_BY_ZERO,
    ROOT_OF_NEGATIVE,
    UNDEFINED_VARIABLE,
    EMPTY_BOX,
    PARSE_ERROR,
    UNDEFINED_REFERENCE
};

// Dimensional unit type for expression-level unit tracking.
// L = length exponent (cm), A = angle exponent (degrees).
// (0,0) with valid=true is dimensionless; valid=false means indeterminate.
struct UnitType {
    int L = 0;
    int A = 0;
    bool valid = true;
    bool isDimensionless() const { return valid && L == 0 && A == 0; }
    bool operator==(const UnitType& o) const { return L == o.L && A == o.A && valid == o.valid; }
    static UnitType dimensionless() { return {0, 0, true}; }
    static UnitType length()        { return {1, 0, true}; }
    static UnitType angle()         { return {0, 1, true}; }
    static UnitType area()          { return {2, 0, true}; }
    static UnitType unknown()       { return {0, 0, false}; }
};

class ReferenceFetcher {
public:
    virtual ~ReferenceFetcher() = default;
    virtual KFormula* getFormula(int reference_number) = 0;
    virtual double getValue(int reference_number) { return 0 * reference_number; }
    virtual UnitType getUnitType(int /*reference_number*/) const { return UnitType::dimensionless(); }
};

class KFormula {
private:
    static QString SPECIAL;
    static QString INTEXT;
    static QString LOC;
    static QString DELIM;
    static QString BIGOP;
    static QString EVAL;

    static void initStrings();

    bool restricted;

public:
    KFormula(bool restricted = false);
    KFormula(int x, int y, bool restricted = false);
    ~KFormula();

    void redraw(QPainter& p);
    void setBoxes(std::vector<std::unique_ptr<box>> newBoxes);
    const std::vector<std::unique_ptr<box>>& getBoxes() const { return boxes; }
    void setPos(int x, int y);
    void parse(const QString& text, std::vector<charinfo>* info = nullptr);
    QRect getCursorPos(const charinfo& i) const;

    void setReferenceFetcher(std::unique_ptr<ReferenceFetcher> r) { referenceFetcher = std::move(r); }

    double evaluate(const QHash<QString, double>& variables, std::optional<int>* error = nullptr, box* b = nullptr) const;
    UnitType evaluateUnit(box* b = nullptr) const;
    QSize size() const;
    void makeDirty();

    void setFont(const QFont& f) { font = f; }
    void setBackColor(const QColor& c) { backColor = c; }
    void setForeColor(const QColor& c) { foreColor = c; }
    const QFont& getFont() const { return font; }
    const QColor& getBackColor() const { return backColor; }
    const QColor& getForeColor() const { return foreColor; }

private:
    std::vector<std::unique_ptr<box>> boxes;
    int posx = 0;
    int posy = 0;
    QFont font;
    QColor backColor;
    QColor foreColor;
    std::unique_ptr<ReferenceFetcher> referenceFetcher;

    void parenthesize(QString& temp, int& i, std::vector<charinfo>* info);
    box* makeBoxes(const QString& str, int offset, int maxlen, std::vector<charinfo>* info);
    void refetchReferencesAndCalculate(QPainter& p);

public:
    static QString special() { initStrings(); return SPECIAL; }
    static QString intext() { initStrings(); return INTEXT; }
    static QString loc() { initStrings(); return LOC; }
    static QString delim() { initStrings(); return DELIM; }
    static QString bigop() { initStrings(); return BIGOP; }
    static QString eval() { initStrings(); return EVAL; }
    static int findMatch(const QString& s, int pos);
    static QString toUgly(const QString& s);
    static QString fromUgly(const QString& s);
};

#endif // KFORMULA_H_INCLUDED
