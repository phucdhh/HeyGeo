#ifndef KFORMULAEDIT_H_INCLUDED
#define KFORMULAEDIT_H_INCLUDED

#include "kformula.H"
#include <QWidget>
#include <QString>
#include <QPixmap>
#include <QStack>
#include <QTimer>
#include <QSize>
#include <memory>
#include <vector>
#include <deque>

class box;
struct charinfo;

// Fake chars for control
constexpr int CUT_CHAR = 0;
constexpr int COPY_CHAR = 1;
constexpr int PASTE_CHAR = 2;
constexpr int UNDO_CHAR = 3;
constexpr int REDO_CHAR = 4;

struct _cursorInfo {
    bool dirty;
    QRect pos;
};

class KFormulaEdit : public QWidget {
    Q_OBJECT
public:
    KFormulaEdit(QWidget* parent = nullptr, Qt::WindowFlags flags = Qt::WindowFlags{}, bool r = false);
    ~KFormulaEdit() override = default;

    void setText(QString text);
    void setExtraChars(QString c) { extraChars = c; }
    QString text() const { return formText; }
    void redraw(int all = 1) {
        redraw_all_ = all;
        update();
    }
    KFormula* getFormula() const { return form.get(); }
    QString uglyForm() const;
    void setUglyForm(QString ugly);

    QSize sizeHint() const override;
    QSizePolicy sizePolicy() const;

    void enableSizeHintSignal(bool b) { sendSizeHint = b; }

signals:
    void sizeHint(QSize);
    void formulaChanged(const QString&);

private:
    int redraw_all_ = 1;
    std::vector<_cursorInfo> cursorCache;
    bool restricted;
    QRect oldBound;
    QString extraChars;
    int cacheState;
    QPixmap pm;
    std::unique_ptr<KFormula> form;
    QString formText;
    static QString clipText;
    int cursorPos = 0;
    std::vector<charinfo> info;
    std::deque<QString> undo_stack_unused; // replaced by QStack below
    QStack<QString*> undo_stack;
    QStack<QString*> redo_stack;
    QTimer t;
    QTimer fast;
    bool cursorDrawn = false;
    bool textSelected = false;
    int selectStart = 0;
    int selectStartOrig = 0;
    bool nextGreek = false;
    bool sendSizeHint = false;

    void keyPressEvent(QKeyEvent* e) override;
    void mousePressEvent(QMouseEvent* e) override;
    void mouseReleaseEvent(QMouseEvent* e) override;
    void mouseMoveEvent(QMouseEvent* e) override;
    void paintEvent(QPaintEvent* e) override;
    void resizeEvent(QResizeEvent* e) override;
    void focusInEvent(QFocusEvent* e) override;
    void focusOutEvent(QFocusEvent* e) override;

    void expandSelection();
    int isValidCursorPos(int pos);
    int isInMatrix(int immed = 0);
    int deleteAtCursor();
    int posAtPoint(QPoint p);
    int isInString(int pos, const QString& str) const;
    QRect getCursorPos(int pos);

    void do_undo(QString oldText, int oldc);
    void do_redo(QString oldText, int oldc);
    void do_cut(QString oldText, int oldc);
    void do_copy(QString oldText, int oldc);
    void do_paste(QString oldText, int oldc);
    void insertChar(QChar c);

public slots:
    void insertChar(int c);

private slots:
    void toggleCursor();
    void computeCache();

private:
    void redraw_all(int all, QPainter&);
};

#endif // KFORMULAEDIT_H_INCLUDED
