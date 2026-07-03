/*
 *  HeyGeo/formula
 *  Copyright (C) 1999-2006 Ilya Baran
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
 *
 *  Send comments and/or bug reports to:
 *                 ibaran@mit.edu
 */


#ifndef BOX_H_INCLUDED
#define BOX_H_INCLUDED

#include <QPainter>
#include <QString>
#include <QList>
#include <QFont>

#define DEFAULT_FONT_SIZE 25
#define MIN_FONT_SIZE  10

#define SPACE          (4)

#define SYMBOL_ABOVE   20000

#define MAX_REFERENCES 1000
#define REFERENCE_ABOVE (SYMBOL_ABOVE - MAX_REFERENCES)
inline bool IS_REFERENCE(int r) { return (r >= REFERENCE_ABOVE && r < SYMBOL_ABOVE); }
inline int REFERENCE_NUM(int r) { return (r < MAX_REFERENCES ? r + REFERENCE_ABOVE : /*error*/ 0); }

#define UNUSED_OFFSET  10700
#define OLD_UNUSED_OFFSET 1000

class KFormula;
struct charinfo;

typedef int SymbolType;
typedef int BoxType;

namespace Box {
const BoxType PLUS = '+';
const BoxType MINUS = '-';
const BoxType TIMES = '*';
const BoxType DIVIDE = '\\' + UNUSED_OFFSET;
const BoxType POWER  = '^' + UNUSED_OFFSET;
const BoxType SQRT = '@' + UNUSED_OFFSET;
const BoxType TEXT = 't';
const BoxType CAT = '#' + UNUSED_OFFSET;
const BoxType SUB = '_' + UNUSED_OFFSET;
const BoxType LSUP = '6' + UNUSED_OFFSET;
const BoxType LSUB = '%' + UNUSED_OFFSET;
const BoxType PAREN = '(';
const BoxType EQUAL = '=';
const BoxType MORE = '>';
const BoxType LESS = '<';
const BoxType ABS = '|';
const BoxType BRACKET = '[';
const BoxType SLASH = '/';
const BoxType MATRIX = 'm' + UNUSED_OFFSET;
const BoxType SEPARATOR = '&' + UNUSED_OFFSET;
const BoxType ABOVE = ')' + UNUSED_OFFSET;
const BoxType BELOW = ']' + UNUSED_OFFSET;
const BoxType SYMBOL = 's' + UNUSED_OFFSET;
const BoxType CURSOR = 'c' + UNUSED_OFFSET;
}

namespace Box {
const SymbolType INTEGRAL = SYMBOL_ABOVE + 0;
const SymbolType SUM      = SYMBOL_ABOVE + 1;
const SymbolType PRODUCT  = SYMBOL_ABOVE + 2;
const SymbolType ARROW    = SYMBOL_ABOVE + 3;
}

class box {
    friend class KFormula;
    friend class matrixbox;

protected:
    BoxType type;
    QString text;
    QFont lastFont;
    QRect rect;
    int relx;
    int rely;
    int offsx;
    int offsy;
    int fontsize;
    box *b1;
    box *b2;
    box *parent;
    QList<box*> refParents;
    int b1x;
    int b1y;
    int b2x;
    int b2y;
    int dirty;

    void makeDirty();
    void offset(int xoffs, int yoffs);

    static QRect symbolRect(QPainter &p, SymbolType s, int size);
    static void drawSymbol(QPainter &p, SymbolType s, int size, int x, int y);

public:
    box();
    box(int setNum);
    box(QString setText);
    box(int setType, box * setB1 = nullptr, box * setB2 = nullptr);

    virtual ~box();

    void setText(QString newText);
    virtual void calculate(QPainter &p, int setFontsize = -1,
                           QFont *f = nullptr, QColor *bc = nullptr, QColor *fc = nullptr);
    QRect getRect() { return rect; }
    int getType() { return type; }
    box *getParent() { return parent; }
    QString getText() { return text; }
    virtual void draw(QPainter &p, int x, int y, QFont *f = nullptr, QColor *bc = nullptr, QColor *fc = nullptr);

    virtual QRect getCursorPos(charinfo i, int x, int y);
    QRect getLastRect();
};

#endif // BOX_H_INCLUDED
