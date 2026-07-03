/*
 *  HeyGeo
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


#ifndef G_LOCUS_H
#define G_LOCUS_H

#include "G_point.H"
#include <QList>

class G_locus : public G_geometry
{
  friend class G_locusObject;
public:
  G_locus();
  G_locus(const G_locus &l);
  G_locus(const QList<G_geometry*> &l);
  ~G_locus();

  G_locus & operator=(const G_locus &l);

  virtual G_geometry *copy() const { return new G_locus(*this); }
  
  virtual G_Type getType() const { return G_LOCUS; }

  //drawing:
  virtual void draw(QPainter &p, const G_drawstyle &d, bool selected);

  //calculations:
  virtual QRect getExtents(void) const;
  virtual G_point getNearestPoint(const G_point &) const;
  virtual bool inRect(const QRect &) const;

  //transformations:
  virtual void translate(const G_point &p);
  virtual void rotate(const G_point &p, double d);
  virtual void reflect(const G_straight &s);
  virtual void scale(const G_point &p, double d);

  bool isValid() const { return objects.count() > 0; }

  // Read-only access to the pre-computed geometry objects (e.g. segments).
  const QList<G_geometry*> &getObjects() const { return objects; }

private:
  QList<G_geometry*> objects;
};

#endif //G_LOCUS_H
