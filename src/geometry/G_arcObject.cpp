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


#include <stdio.h>
#include <cmath>

#include "G_object.H"

void G_arcObject::update()
{

  if(IS_TRANSFORM(where->getDescendType())) {
    arc = parent(0)->getArc();
    updateTransform();
  }
  else switch(where->getDescendType()) {
  case G_THREEPOINTS_ARC:
    arc = G_arc(parent(0)->getPoint(), parent(1)->getPoint(), parent(2)->getPoint());
    break;

  case G_ONCIRCLE_ARC: {
    // parents: [0]=circle, [1]=startPoint, [2]=endPoint
    G_circle circ = parent(0)->getCircle();
    G_point  S    = parent(1)->getPoint();
    G_point  E    = parent(2)->getPoint();
    if (!circ.isValid() || !S.isValid() || !E.isValid()) {
        arc = G_arc::inValid();
        break;
    }
    G_point O = circ.getCenter();
    double  r = circ.getRadius();
    // Project S and E onto the circle (in case they are not exactly on it)
    G_point sDir = S - O;
    G_point eDir = E - O;
    double slsq = sDir.lengthsq(), elsq = eDir.lengthsq();
    if (slsq < SMALL * SMALL || elsq < SMALL * SMALL) { arc = G_arc::inValid(); break; }
    sDir = sDir / sqrt(slsq);
    eDir = eDir / sqrt(elsq);
    G_point Sp = O + sDir * r;   // start on circle
    G_point Ep = O + eDir * r;   // end on circle
    // Mid-angle going counterclockwise from S to E
    double thetaS = atan2(sDir.getY(), sDir.getX());
    double thetaE = atan2(eDir.getY(), eDir.getX());
    if (thetaE < thetaS) thetaE += 2.0 * M_PI;   // ensure CCW
    double thetaMid = (thetaS + thetaE) / 2.0;
    G_point M = O + G_point(cos(thetaMid), sin(thetaMid)) * r;
    arc = G_arc(Sp, M, Ep);
    break;
  }
  }

  if(!arc.isValid()) where->setExists(false);

  return;
}





