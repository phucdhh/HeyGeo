#include "kformula.H"
#include "box.H"
#include "matrixbox.H"
#include <cmath>
#include <QRegularExpression>
#include <QPainter>

using namespace Box;

// Initialize static members
QString KFormula::SPECIAL;
QString KFormula::DELIM;
QString KFormula::INTEXT;
QString KFormula::LOC;
QString KFormula::BIGOP;
QString KFormula::EVAL;

void KFormula::initStrings() {
    SPECIAL.clear();
    DELIM.clear();
    INTEXT.clear();
    LOC.clear();
    BIGOP.clear();
    EVAL.clear();

    SPECIAL += L_GROUP;
    SPECIAL += R_GROUP;
    SPECIAL += QChar(PLUS);
    SPECIAL += QChar(MINUS);
    SPECIAL += QChar(TIMES);
    SPECIAL += QChar(DIVIDE);
    SPECIAL += QChar(POWER);
    SPECIAL += QChar(SQRT);
    SPECIAL += QChar(ABS);
    SPECIAL += QChar(BRACKET);
    SPECIAL += QChar(SUB);
    SPECIAL += QChar(LSUB);
    SPECIAL += QChar(LSUP);
    SPECIAL += QChar(PAREN);
    SPECIAL += QChar(EQUAL);
    SPECIAL += QChar(MORE);
    SPECIAL += QChar(LESS);
    SPECIAL += QChar(CAT);
    SPECIAL += QChar(SLASH);
    SPECIAL += QChar(ABOVE);
    SPECIAL += QChar(BELOW);
    SPECIAL += QChar(MATRIX);
    SPECIAL += QChar(SEPARATOR);

    INTEXT += QChar(PLUS);
    INTEXT += QChar(MINUS);
    INTEXT += QChar(TIMES);
    INTEXT += QChar(EQUAL);
    INTEXT += QChar(MORE);
    INTEXT += QChar(LESS);
    INTEXT += QChar(SLASH);

    LOC += QChar(POWER);
    LOC += QChar(SUB);
    LOC += QChar(LSUB);
    LOC += QChar(LSUP);
    LOC += QChar(ABOVE);
    LOC += QChar(BELOW);

    DELIM += QChar(ABS);
    DELIM += QChar(PAREN);
    DELIM += QChar(BRACKET);

    BIGOP += QChar(INTEGRAL);
    BIGOP += QChar(SUM);
    BIGOP += QChar(PRODUCT);

    EVAL += QChar(PLUS);
    EVAL += QChar(MINUS);
    EVAL += QChar(TIMES);
    EVAL += QChar(DIVIDE);
    EVAL += QChar(SLASH);
    EVAL += QChar(POWER);
    EVAL += QChar(PAREN);
    EVAL += QChar(ABS);
    EVAL += QChar(SQRT);
}

QString KFormula::toUgly(const QString& s) {
    QString ugly = s;
    int i;

    if (ugly.isEmpty()) return QString("");

    i = ugly.indexOf(QChar(SQRT));
    while (i != -1) {
        if (i >= 2 && ugly[i - 2] == L_GROUP) {
            ugly.remove(i - 2, 3);
            ugly.insert(i - 2, "sqrt");
        } else {
            ugly.remove(i, 1);
        }
        i = ugly.indexOf(QChar(SQRT), i);
    }

    i = ugly.indexOf(QChar(BRACKET));
    while (i != -1) {
        i -= 2;
        ugly.remove(i, 3);
        ugly[findMatch(ugly, i)] = ']';
        ugly[i] = '[';
        i = ugly.indexOf(QChar(BRACKET), i + 1);
    }

    QRegularExpression r(QRegularExpression::escape(QString(L_GROUP) + R_GROUP + QChar(PAREN)));
    ugly.replace(r, "");

    r.setPattern(QRegularExpression::escape(QString(L_GROUP) + R_GROUP + QChar(ABS)));
    ugly.replace(r, "abs");

    for (i = 0; i < ugly.length(); i++) {
        if (ugly[i] == QChar(POWER)) ugly[i] = '^';
        else if (ugly[i] == QChar(SUB)) ugly[i] = '_';
        else if (ugly[i] == QChar(DIVIDE)) ugly[i] = '/';
        else if (ugly[i] == L_GROUP) ugly[i] = '(';
        else if (ugly[i] == R_GROUP) ugly[i] = ')';
    }

    return ugly;
}

QString KFormula::fromUgly(const QString& s) {
    QString ugly = s;
    int i;

    i = ugly.indexOf("abs(", 0, Qt::CaseInsensitive);
    while (i != -1) {
        if (i == 0 || !ugly[i - 1].isLetter()) {
            int tmp = findMatch(ugly, i + 3);
            ugly.replace(i, 4, QString(L_GROUP) + R_GROUP + QChar(ABS) + L_GROUP);
            ugly[tmp] = R_GROUP;
        }
        i = ugly.indexOf("abs(", i + 1, Qt::CaseInsensitive);
    }

    i = ugly.indexOf("sqrt(", 0, Qt::CaseInsensitive);
    while (i != -1) {
        if (i == 0 || !ugly[i - 1].isLetter()) {
            ugly[findMatch(ugly, i + 4)] = R_GROUP;
            ugly.replace(i, 5, QString(L_GROUP) + R_GROUP + QChar(SQRT) + L_GROUP);
            ugly.insert(i + 4, R_GROUP);
        }
        i = ugly.indexOf("sqrt(", i + 1, Qt::CaseInsensitive);
    }

    for (i = 0; i < ugly.length(); i++) {
        if (ugly[i] == '[') {
            ugly[findMatch(ugly, i)] = R_GROUP;
            ugly.remove(i, 1);
            ugly.insert(i, QString(L_GROUP) + R_GROUP + QChar(BRACKET) + L_GROUP);
            i += 4;
        }
    }

    i = ugly.indexOf(")/(", 0, Qt::CaseSensitive);
    while (i != -1) {
        ugly[findMatch(ugly, i)] = L_GROUP;
        ugly[i] = R_GROUP;
        ugly[i + 1] = QChar(DIVIDE);
        ugly[findMatch(ugly, i + 2)] = R_GROUP;
        ugly[i + 2] = L_GROUP;
        i = ugly.indexOf(")/(", i + 1);
    }

    i = ugly.indexOf("^(", 0, Qt::CaseSensitive);
    while (i != -1) {
        ugly[findMatch(ugly, i + 1)] = R_GROUP;
        ugly[i + 1] = L_GROUP;
        ugly[i] = QChar(POWER);
        i = ugly.indexOf("^(", i + 1);
    }

    // Handle bare ^x where x is a single digit or letter (e.g. x^2, y^n)
    for (i = 0; i < ugly.length() - 1; i++) {
        if (ugly[i] == '^' && (ugly[i+1].isLetterOrNumber() || ugly[i+1] == '-')) {
            ugly[i] = QChar(POWER);
            ugly.insert(i + 1, QChar(L_GROUP));
            ugly.insert(i + 3, QChar(R_GROUP));
            i += 3;
        }
    }

    i = ugly.indexOf("_(", 0, Qt::CaseSensitive);
    while (i != -1) {
        ugly[findMatch(ugly, i + 1)] = R_GROUP;
        ugly[i + 1] = L_GROUP;
        ugly[i] = QChar(SUB);
        i = ugly.indexOf("_(", i + 1);
    }

    for (i = 0; i < ugly.length(); i++) {
        if (ugly[i] == '(') {
            ugly[i] = L_GROUP;
            ugly.insert(i + 1, QString(R_GROUP) + QChar(PAREN) + L_GROUP);
            i += 3;
        }
        if (ugly[i] == ')') ugly[i] = R_GROUP;
    }

    return ugly;
}

int KFormula::findMatch(const QString& s, int pos) {
    int level = 0;
    QChar lchar, rchar;

    if (s[pos] == L_GROUP || s[pos] == R_GROUP) { lchar = L_GROUP; rchar = R_GROUP; }
    else if (s[pos] == '(' || s[pos] == ')') { lchar = '('; rchar = ')'; }
    else if (s[pos] == '[' || s[pos] == ']') { lchar = '['; rchar = ']'; }
    else if (s[pos] == '{' || s[pos] == '}') { lchar = '{'; rchar = '}'; }
    else return -1;

    if (pos < 0 || pos >= s.length()) return -1;

    if (s[pos] == lchar) {
        while (pos < s.length()) {
            if (s[pos] == lchar) level++;
            if (s[pos] == rchar) level--;
            if (level == 0) return pos;
            pos++;
        }
        return -1;
    }

    if (s[pos] == rchar) {
        while (pos >= 0) {
            if (s[pos] == lchar) level--;
            if (s[pos] == rchar) level++;
            if (level == 0) return pos;
            pos--;
        }
        return -1;
    }

    return -1;
}

KFormula::KFormula(bool r) : restricted(r) {}
KFormula::KFormula(int x, int y, bool r) : restricted(r), posx(x), posy(y) {}
KFormula::~KFormula() = default;

QRect KFormula::getCursorPos(const charinfo& i) const {
    if (boxes.empty()) return QRect();
    QRect tmp = boxes.back()->getRect();
    return boxes.back()->getCursorPos(i, posx - tmp.center().x(), posy - tmp.center().y());
}

QSize KFormula::size() const {
    if (boxes.empty()) return QSize(0, 0);
    return QSize(boxes.back()->getRect().width() + 8, boxes.back()->getRect().height() + 8);
}

void KFormula::makeDirty() {
    for (auto& box : boxes) {
        box->makeDirty();
    }
}

void KFormula::refetchReferencesAndCalculate(QPainter& p) {
    if (boxes.empty()) return;

    // deviceType()/Printer removed in Qt6; skip printer-based dirty check

    if (!boxes.back()->dirty) return;

    for (auto& b : boxes) {
        if (!IS_REFERENCE(b->getType())) continue;

        if (!referenceFetcher) continue;

        KFormula* k = referenceFetcher->getFormula(b->getType() - REFERENCE_ABOVE);
        if (!k) continue;

        if (k->boxes.back().get() != b->b1) {
            b->b1 = k->boxes.back().get();
            b->b1->refParents.push_back(b.get());
        }

        k->refetchReferencesAndCalculate(p);
    }

    boxes.back()->calculate(p, p.font().pointSize(), &font, &backColor, &foreColor);
}

void KFormula::redraw(QPainter& p) {
    if (boxes.empty()) return;

    refetchReferencesAndCalculate(p);

    QRect tmp = boxes.back()->getRect();
    boxes.back()->draw(p, posx - tmp.center().x(), posy - tmp.center().y(),
                       const_cast<QFont*>(&font), const_cast<QColor*>(&backColor), const_cast<QColor*>(&foreColor));
}

void KFormula::setBoxes(std::vector<std::unique_ptr<box>> newBoxes) {
    boxes = std::move(newBoxes);
}

void KFormula::setPos(int x, int y) {
    posx = x;
    posy = y;
}

double KFormula::evaluate(const QHash<QString, double>& variables, std::optional<int>* error, box* b) const {
    if (!restricted) return 0;

    if (error && !*error) *error = static_cast<int>(ErrorType::NO_ERROR);

    if (!b && !boxes.empty()) b = boxes.back().get();

    if (!b) {
        if (error) *error = static_cast<int>(ErrorType::EMPTY_BOX);
        return 0;
    }

    if (IS_REFERENCE(b->type)) {
        if (!referenceFetcher) {
            if (error) *error = static_cast<int>(ErrorType::UNDEFINED_REFERENCE);
            return 0;
        }
        return referenceFetcher->getValue(b->type - REFERENCE_ABOVE);
    }

    // SYMBOL boxes: Greek letters used as mathematical constants (via Ctrl+G shortcut)
    if (b->type == SYMBOL && !b->text.isEmpty()) {
        int symChar = b->text[0].unicode() - SYMBOL_ABOVE;
        if (symChar == 'p') return M_PI;  // Greek π (Ctrl+G then p)
        if (symChar == 'e') return M_E;   // Euler's number typed as Greek e
        return 0;
    }

    if (b->type == TEXT) {
        QString temptext = b->text.trimmed();
        if (temptext.isEmpty()) {
            if (!b->parent) {
                if (error) *error = static_cast<int>(ErrorType::EMPTY_BOX);
                return 0;
            }
            if (b->parent->type == SQRT && b->parent->b1 == b) return 2;
            if (b->parent->type == MINUS && b->parent->b1 == b) return 0;
            if (b->parent->type == PLUS && b->parent->b1 == b) return 0;
            if (delim().contains(QChar(b->parent->type)) && b->parent->b1 == b) return 0;
            if (b->parent->type == CAT) return 1;
            if (error) *error = static_cast<int>(ErrorType::EMPTY_BOX);
            return 0;
        }

        bool ok;
        double x = temptext.toDouble(&ok);
        if (ok) return x;

        // Named constants recognised directly
        if (temptext == "pi") return M_PI;
        if (temptext == "e")  return M_E;

        if (variables.contains(temptext)) return variables.value(temptext);
        if (error) *error = static_cast<int>(ErrorType::UNDEFINED_VARIABLE);
        return 0;
    }

    double b1 = 0, b2 = 0;
    bool undefined_in_b1 = false;

    if (b->b1) {
        b1 = evaluate(variables, error, b->b1);
        if (error && *error == static_cast<int>(ErrorType::UNDEFINED_VARIABLE) && b->type == CAT) {
            *error = static_cast<int>(ErrorType::NO_ERROR);
            undefined_in_b1 = true;
        }
        if (error && *error != 0) return 0;
    }

    if (b->b2) {
        b2 = evaluate(variables, error, b->b2);
        if (error && *error != 0) return 0;
    }

    switch (b->type) {
    case PLUS: return b1 + b2;
    case MINUS: return b1 - b2;
    case TIMES: return b1 * b2;
    case SLASH:
    case DIVIDE:
        if (b2 == 0) {
            if (error) *error = static_cast<int>(ErrorType::DIVISION_BY_ZERO);
            return 0;
        }
        return b1 / b2;
    case POWER: return std::pow(b1, b2);
    case SQRT:
        if (b1 == 0) {
            if (error) *error = static_cast<int>(ErrorType::DIVISION_BY_ZERO);
            return 0;
        }
        if (b2 < 0) {
            if (error) *error = static_cast<int>(ErrorType::ROOT_OF_NEGATIVE);
            return 0;
        }
        return std::pow(b2, 1 / b1);
    case PAREN: return b2;
    case ABS: return std::fabs(b2);
    case CAT: {
        if (!undefined_in_b1) return b1 * b2;
        if (b->b1->type != TEXT) {
            if (error) *error = static_cast<int>(ErrorType::PARSE_ERROR);
            return 0;
        }
        QString fun = b->b1->text.trimmed();
        if (fun == "sqrt") return std::sqrt(b2);
        if (fun == "log") return std::log(b2);
        if (fun == "exp") return std::exp(b2);
        if (fun == "floor") return std::floor(b2);
        if (fun == "ceil") return std::ceil(b2);
        if (fun == "abs") return std::fabs(b2);
        if (fun == "sin") return std::sin(b2);
        if (fun == "cos") return std::cos(b2);
        if (fun == "tan") return std::tan(b2);
        if (fun == "sinh") return std::sinh(b2);
        if (fun == "cosh") return std::cosh(b2);
        if (fun == "tanh") return std::tanh(b2);
        if (fun == "asin") return std::asin(b2);
        if (fun == "acos") return std::acos(b2);
        if (fun == "atan") return std::atan(b2);
        if (fun == "asinh") return std::asinh(b2);
        if (fun == "acosh") return std::acosh(b2);
        if (fun == "atanh") return std::atanh(b2);
        if (fun == "ln")    return std::log(b2);           // natural log (GSP alias)
        if (fun == "log10") return std::log10(b2);         // base-10 logarithm
        if (fun == "sgn")   return (b2 > 0) ? 1.0 : (b2 < 0) ? -1.0 : 0.0;
        if (fun == "round") return std::round(b2);
        if (fun == "trunc") return std::trunc(b2);
        if (error) *error = static_cast<int>(ErrorType::PARSE_ERROR);
        return 0;
    }
    default: return 0;
    }
}

// Evaluate the dimensional unit of the formula expression tree.
// Returns UnitType with L=length exponent (cm) and A=angle exponent (degrees).
// Rules: DIVIDE subtracts exponents (so AD/AB → cm-cm = dimensionless),
//        TIMES adds them, POWER scales, transcendental functions strip units.
UnitType KFormula::evaluateUnit(box* b) const {
    if (!restricted) return UnitType::dimensionless();
    if (!b && !boxes.empty()) b = boxes.back().get();
    if (!b) return UnitType::dimensionless();

    if (IS_REFERENCE(b->type)) {
        if (!referenceFetcher) return UnitType::dimensionless();
        return referenceFetcher->getUnitType(b->type - REFERENCE_ABOVE);
    }

    // Constants and numbers are dimensionless — EXCEPT for unit keywords
    if (b->type == SYMBOL) return UnitType::dimensionless();
    if (b->type == TEXT) {
        QString t = b->text.trimmed();
        // Unit keywords inserted via the Units menu carry dimensional type.
        if (t == "cm" || t == "in" || t == "px") return UnitType::length();
        if (t == "deg" || t == "rad") return UnitType::angle();
        return UnitType::dimensionless();
    }

    UnitType u1 = UnitType::dimensionless(), u2 = UnitType::dimensionless();
    if (b->b1) u1 = evaluateUnit(b->b1);
    if (b->b2) u2 = evaluateUnit(b->b2);

    switch (b->type) {
    case PLUS:
    case MINUS:
        // Same unit + same unit = that unit; mismatch → dimensionless (conservative)
        return (u1 == u2) ? u1 : UnitType::dimensionless();

    case TIMES:
        return {u1.L + u2.L, u1.A + u2.A, true};

    case DIVIDE:
    case SLASH:
        return {u1.L - u2.L, u1.A - u2.A, true};

    case POWER: {
        // base^exp: exp must be a dimensionless integer constant
        std::optional<int> dummyErr;
        double exp = evaluate({}, &dummyErr, b->b2);
        if (dummyErr && *dummyErr != 0) return UnitType::dimensionless();
        int intExp = static_cast<int>(std::round(exp));
        if (std::fabs(exp - intExp) > 1e-9) return UnitType::dimensionless();
        return {u1.L * intExp, u1.A * intExp, true};
    }

    case SQRT: {
        // b1 = root index (empty → 2), b2 = radicand
        std::optional<int> dummyErr;
        double rootIdx = evaluate({}, &dummyErr, b->b1);
        if (!rootIdx || (dummyErr && *dummyErr != 0)) rootIdx = 2.0;
        double newL = (double)u2.L / rootIdx;
        double newA = (double)u2.A / rootIdx;
        int iL = static_cast<int>(std::round(newL));
        int iA = static_cast<int>(std::round(newA));
        if (std::fabs(newL - iL) > 1e-9 || std::fabs(newA - iA) > 1e-9)
            return UnitType::dimensionless();  // fractional exponent: can't represent
        return {iL, iA, true};
    }

    case PAREN:
    case ABS:
        return u2;

    case CAT: {
        // Check if left child is a known function name → function application
        if (b->b1 && b->b1->type == TEXT) {
            QString fun = b->b1->text.trimmed();
            // Transcendental/analytic functions always produce dimensionless output
            if (fun == "sin"  || fun == "cos"  || fun == "tan"  ||
                fun == "sinh" || fun == "cosh" || fun == "tanh" ||
                fun == "asin" || fun == "acos" || fun == "atan" ||
                fun == "asinh"|| fun == "acosh"|| fun == "atanh"||
                fun == "log"  || fun == "ln"   || fun == "log10"||
                fun == "exp"  || fun == "sqrt")
                return UnitType::dimensionless();
            // Unit-preserving functions
            if (fun == "abs" || fun == "sgn"   || fun == "round" ||
                fun == "trunc"|| fun == "floor" || fun == "ceil")
                return u2;
            // Not a recognised function name → implicit multiplication (e.g. "3cm")
        }
        // Implicit multiplication: combine units (e.g. 3·cm → length, cm·cm → cm²)
        // When b1 has no child (non-TEXT node in left), u1 is already dimensionless.
        return {u1.L + u2.L, u1.A + u2.A, true};
    }

    default:
        return UnitType::dimensionless();
    }
}

#define INSERTED(xxi) { \
if (info) { \
        for (size_t tmpx = 0; tmpx < info->size(); ++tmpx) { \
            if ((*info)[tmpx].posinstr >= (xxi)) (*info)[tmpx].posinstr++; \
    } \
} \
}

void KFormula::parse(const QString& textIn, std::vector<charinfo>* info) {
    QString text = textIn;
    if (info) {
        info->resize(text.length() + 1);
        for (qsizetype i = 0; i <= (qsizetype)text.length(); ++i) {
            charinfo inf;
            inf.where = nullptr;
            inf.posinbox = 0;
            inf.posinstr = i;
            inf.left = false;
            (*info)[i] = inf;
        }

        for (int i = 0; i < text.length(); ++i) {
            if (!special().contains(text[i]) || text[i] == L_GROUP ||
                text[i] == R_GROUP || intext().contains(text[i])) continue;

            if (i == 0 || (text[i - 1] != R_GROUP && special().contains(text[i - 1]))) {
                text.insert(i, L_GROUP);
                INSERTED(i);
                text.insert(i + 1, R_GROUP);
                INSERTED(i + 2);
                continue;
            }

            if (i == text.length() - 1 || (text[i + 1] != L_GROUP && special().contains(text[i + 1]))) {
                text.insert(i + 1, L_GROUP);
                INSERTED(i + 1);
                text.insert(i + 2, R_GROUP);
                INSERTED(i + 3);
                continue;
            }
        }

        for (size_t i = 0; i < info->size(); ++i) {
            if ((*info)[i].posinstr &&
                (!special().contains(text[(*info)[i].posinstr - 1]) ||
                 intext().contains(text[(*info)[i].posinstr - 1])))
                (*info)[i].posinstr--;
            else if ((*info)[i].posinstr < text.length() &&
                     (!special().contains(text[(*info)[i].posinstr]) ||
                      intext().contains(text[(*info)[i].posinstr])))
                (*info)[i].left = true;
            else if ((*info)[i].posinstr && text[(*info)[i].posinstr - 1] == R_GROUP)
                (*info)[i].posinstr--;
            else
                (*info)[i].left = true;
        }
    }

    boxes.clear();

    for (int i = 0; i < text.length(); ++i) {
        if (text[i] == QChar(L_BRACE_UNSEEN)) text[i] = L_GROUP;
        if (text[i] == QChar(R_BRACE_UNSEEN)) text[i] = R_GROUP;
    }

    if (restricted) {
        for (int i = 0; i < text.length() - 1; ++i) {
            if (text[i].isDigit() && !special().contains(text[i + 1]) && text[i + 1].isLetter()) {
                text.insert(i + 1, QChar(CAT));
                INSERTED(i + 1);
                ++i;
            } else if (text[i] == ' ' && text[i + 1] != ' ') {
                text.insert(i + 1, QChar(CAT));
                INSERTED(i + 1);
                ++i;
            }
        }
    }

    for (int i = 0; i < text.length(); ++i) {
        if (text[i].unicode() >= SYMBOL_ABOVE || IS_REFERENCE(text[i].unicode())) {
            if (i > 0 && !special().contains(text[i - 1])) {
                text.insert(i, QChar(CAT));
                INSERTED(i);
                ++i;
            }
            if (i < text.length() - 1 && !special().contains(text[i + 1])) {
                ++i;
                text.insert(i, QChar(CAT));
                INSERTED(i);
            }
        }
    }

    for (int i = 0; i < text.length() - 1; ++i) {
        int j = i + 1;
        if (j > text.length() - 1) continue;
        if (text[j] != L_GROUP && text[i] != R_GROUP) continue;
        if (text[i] == R_GROUP && text[j] == L_GROUP) {
            text.insert(j, QChar(CAT));
            INSERTED(j);
        }
        if (text[i].unicode() && text[j].unicode() &&
            special().contains(text[i]) && special().contains(text[j])) continue;
        text.insert(j, QChar(CAT));
        INSERTED(j);
    }

    auto addParen = [&](const QString& s) {
        for (int i = text.length() - 1; i >= 0; --i) {
            if (!s.contains(text[i])) continue;
            parenthesize(text, i, info);
        }
    };

    auto addParenReverse = [&](const QString& s) {
        for (int i = 0; i < text.length(); ++i) {
            if (!s.contains(text[i])) continue;
            parenthesize(text, i, info);
        }
    };

    addParen(QString(QChar(LESS)) + QChar(MORE) + QChar(EQUAL));
    addParen(QString(QChar(PLUS)) + QChar(MINUS));
    addParen(QString(QChar(SLASH)) + QChar(TIMES));
    addParenReverse(QString(QChar(CAT)));
    addParen(QString(QChar(POWER)) + QChar(SUB));
    addParenReverse(QString(QChar(LSUB)) + QChar(LSUP));
    addParen(delim() + QChar(SQRT) + QChar(DIVIDE) + QChar(ABOVE) + QChar(BELOW));

    if (info) {
        for (size_t i = 0; i < info->size(); ++i) {
            if (!(*info)[i].left) (*info)[i].posinstr++;
        }
    }

    makeBoxes(text, 0, text.length(), info);
}

void KFormula::parenthesize(QString& temp, int& i, std::vector<charinfo>* info) {
    int j;
    int level = 0;
    bool need_paren = (i == 0 || temp[i - 1] != R_GROUP);

    for (j = i; j >= 0; --j) {
        if (temp[j] == R_GROUP) level++;
        if (temp[j] == L_GROUP) level--;
        if (level < 0) {
            ++j;
            break;
        }
        if (j == 0) break;
        if (j < i && level == 0 && temp[j - 1] != L_GROUP) need_paren = true;
    }

    if (need_paren) {
        temp.insert(j, L_GROUP);
        INSERTED(j);
        i++;
        temp.insert(i, R_GROUP);
        INSERTED(i);
        i++;
    }

    level = 0;
    need_paren = (i + 1 < temp.length() && temp[i + 1] == L_GROUP) ? false : true;

    for (j = i + 1; j <= temp.length(); ++j) {
        if (j < temp.length() && temp[j] == L_GROUP) level++;
        if (j < temp.length() && temp[j] == R_GROUP) level--;
        if (level < 0 || j == temp.length()) break;
        if (level == 0 && j > i + 1 && (j < temp.length() - 1 && temp[j + 1] != R_GROUP)) need_paren = true;
    }

    if (need_paren) {
        temp.insert(j, R_GROUP);
        INSERTED(j);
        temp.insert(i + 1, L_GROUP);
        INSERTED(i + 1);
    }
}

box* KFormula::makeBoxes(const QString& str, int offset, int maxlen, std::vector<charinfo>* info) {
    int toplevel = -1;
    int level = 0;

    if (maxlen <= 0) {
        boxes.emplace_back(std::make_unique<box>(""));
        if (info) {
            for (size_t i = 0; i < info->size(); ++i) {
                if ((*info)[i].posinstr >= offset && (*info)[i].posinstr - offset <= maxlen) {
                    (*info)[i].where = boxes.back().get();
                    (*info)[i].posinbox = 0;
                }
            }
        }
        return boxes.back().get();
    }

    if (str[0] != L_GROUP) {
        boxes.emplace_back();
        if (IS_REFERENCE(str[0].unicode())) {
            if (referenceFetcher) {
                KFormula* f = referenceFetcher->getFormula(str[0].unicode() - REFERENCE_ABOVE);
                if (f && !f->boxes.empty()) {
                    boxes.back() = std::make_unique<box>(str[0].unicode(), f->boxes.back().get());
                }
            }
        } else if (str[0].unicode() < SYMBOL_ABOVE) {
            boxes.back() = std::make_unique<box>(str.left(maxlen));
        } else {
            boxes.back() = std::make_unique<box>(SYMBOL, nullptr, nullptr);
            boxes.back()->text[0] = str[0];
        }

        if (info) {
            for (size_t i = 0; i < info->size(); ++i) {
                if ((*info)[i].posinstr >= offset && (*info)[i].posinstr - offset <= maxlen) {
                    (*info)[i].where = boxes.back().get();
                    (*info)[i].posinbox = (*info)[i].posinstr - offset;
                }
            }
        }
        return boxes.back().get();
    }

    for (int i = 0; i < maxlen; ++i) {
        if (str[i] == L_GROUP) level++;
        if (str[i] == R_GROUP) level--;
        if (level == 0 && i < maxlen - 1) {
            toplevel = i + 1;
            break;
        }
    }

    if (toplevel == -1) return makeBoxes(str.mid(1), offset + 1, maxlen - 2, info);

    if (str[toplevel] == QChar(MATRIX)) {
        int w = str[toplevel - 4].unicode();
        int h = str[toplevel - 2].unicode();
        auto tmpbox = std::make_unique<matrixbox>(w, h);
        int level = 0;
        int startpos = 0;

        for (int i = toplevel + 2; i < maxlen - 1; ++i) {
            if (str[i] == L_GROUP) {
                if (level == 0) startpos = i;
                level++;
                continue;
            }
            if (str[i] == R_GROUP) level--;
            if (level == 0 && str[i] == QChar(SEPARATOR)) {
                tmpbox->addElem(makeBoxes(str.mid(startpos + 1), offset + startpos + 1, i - startpos - 2, info));
            }
        }

        boxes.push_back(std::move(tmpbox));
    } else {
        auto tmpbox = std::make_unique<box>(
            str[toplevel].unicode(),
            makeBoxes(str, offset, toplevel, info),
            makeBoxes(str.mid(toplevel + 1), offset + toplevel + 1, maxlen - toplevel - 1, info)
            );
        boxes.push_back(std::move(tmpbox));
    }

    if (info) {
        for (size_t i = 0; i < info->size(); ++i) {
            if ((*info)[i].where == nullptr && (*info)[i].posinstr >= offset && (*info)[i].posinstr - offset <= maxlen) {
                (*info)[i].where = boxes.back().get();
                (*info)[i].posinbox = ((*info)[i].posinstr - offset > toplevel) ? 1 : 0;
            }
        }
    }

    return boxes.back().get();
}
