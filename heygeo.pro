TEMPLATE = app
TARGET   = heygeo
QT += core gui widgets printsupport xml svg network
CONFIG += c++17 object_parallel_to_source

# Minimum macOS version: 12.0 (Monterey) — compatible with Qt 6 on both Intel and Apple Silicon.
# SDK 14.2 (Xcode 15, Intel) cannot build with deployment target > SDK version.
QMAKE_MACOSX_DEPLOYMENT_TARGET = 12.0

OBJECTS_DIR = build/objects
MOC_DIR     = build/moc

LIBS += -lz

QMAKE_INFO_PLIST = Info.plist
ICON = pics/HeyGeo.icns

INCLUDEPATH += src \
               src/geometry \
               src/app \
               3rdparty/MicroTeX/latex

include(3rdparty/MicroTeX/QtLatex.pri)

HEADERS += src/defs.H \
          src/my_hash_map.H \
          src/my_hash_set.H \
          formula/box.H \
          formula/kformulaedit.H \
          formula/kformula.H \
          formula/matrixbox.H \
          formula/MatrixDialog.H \
          src/geometry/G_arc.H \
          src/geometry/G_arcSector.H \
          src/geometry/G_arcSegment.H \
          src/geometry/G_circle.H \
          src/geometry/G_circleInterior.H \
          src/geometry/G_drawstyle.H \
          src/geometry/G_geometry.H \
          src/geometry/G_label.H \
          src/geometry/G_line.H \
          src/geometry/G_locus.H \
          src/geometry/G_coordsys.H \
          src/geometry/G_function.H \
          src/geometry/G_matrix.H \
          src/geometry/G_object.H \
          src/geometry/G_point.H \
          src/geometry/G_polygon.H \
          src/geometry/G_ray.H \
          src/geometry/G_ref.H \
          src/geometry/G_refSearcher.H \
          src/geometry/G_refs.H \
          src/geometry/G_segment.H \
          src/geometry/G_undo.H \
          src/geometry/G_undoStack.H \
          src/app/HeyGeoCalculateEditor.H \
          src/app/HeyGeoConstruction.H \
          src/app/HeyGeoConstructionList.H \
          src/app/HeyGeoDocument.H \
          src/app/HeyGeoMenuMaintainer.H \
          src/app/HeyGeoPreferencesDialog.H \
          src/app/HeyGeoProperties.H \
          src/app/HeyGeoRecursionDialog.H \
          src/app/HeyGeoSelectionGroupDialog.H \
          src/app/HeyGeoSelectionGroup.H \
          src/app/HeyGeoToolBar.H \
          src/app/HeyGeoTransformDialog.H \
          src/app/HeyGeoView.H \
          src/app/HeyGeoWebExporter.H \
          src/app/HeyGeoGraphDialogs.H \
          src/app/HeyGeoWindow.H \
          src/app/HeyGeoNewParameterDialog.H

SOURCES += main.cpp \
          src/app/BuildReverse.cpp \
          src/app/cans.cpp \
          src/app/menu.cpp \
          formula/box.cpp \
          formula/kformula.cpp \
          formula/kformulaedit.cpp \
          formula/matrixbox.cpp \
          formula/MatrixDialog.cpp \
          src/geometry/G_arc.cpp \
          src/geometry/G_arcObject.cpp \
          src/geometry/G_arcSector.cpp \
          src/geometry/G_arcSectorObject.cpp \
          src/geometry/G_arcSegment.cpp \
          src/geometry/G_arcSegmentObject.cpp \
          src/geometry/G_calculateObject.cpp \
          src/geometry/G_parameterObject.cpp \
          src/geometry/G_circle.cpp \
          src/geometry/G_circleInterior.cpp \
          src/geometry/G_circleInteriorObject.cpp \
          src/geometry/G_circleObject.cpp \
          src/geometry/G_drawstyle.cpp \
          src/geometry/G_label.cpp \
          src/geometry/G_line.cpp \
          src/geometry/G_lineObject.cpp \
          src/geometry/G_locus.cpp \
          src/geometry/G_locusObject.cpp \
          src/geometry/G_coordsys.cpp \
          src/geometry/G_function.cpp \
          src/geometry/G_graphObjects.cpp \
          src/geometry/G_measureObject.cpp \
          src/geometry/G_object.cpp \
          src/geometry/G_point.cpp \
          src/geometry/G_pointLocus.cpp \
          src/geometry/G_pointObject.cpp \
          src/geometry/G_polygon.cpp \
          src/geometry/G_polygonObject.cpp \
          src/geometry/G_ray.cpp \
          src/geometry/G_rayObject.cpp \
          src/geometry/G_ref.cpp \
          src/geometry/G_refs.cpp \
          src/geometry/G_refSearcher.cpp \
          src/geometry/G_segment.cpp \
          src/geometry/G_segmentObject.cpp \
          src/geometry/G_undo.cpp \
          src/geometry/G_undoStack.cpp \
          src/app/HeyGeoCalculateEditor.cpp \
          src/app/HeyGeoConstruction.cpp \
          src/app/HeyGeoConstructionList.cpp \
          src/app/HeyGeoConstructionListNamer.cpp \
          src/app/HeyGeoDocument.cpp \
          src/app/HeyGeoMenuMaintainer.cpp \
          src/app/HeyGeoMenus.cpp \
          src/app/HeyGeoPreferencesDialog.cpp \
          src/app/HeyGeoProperties.cpp \
          src/app/HeyGeoRecursionDialog.cpp \
          src/app/HeyGeoSelectionGroupDialog.cpp \
          src/app/HeyGeoToolBar.cpp \
          src/app/HeyGeoTransformDialog.cpp \
          src/app/HeyGeoView.cpp \
          src/app/HeyGeoWebExporter.cpp \
          src/app/HeyGeoNewParameterDialog.cpp \
          src/app/HeyGeoGraphDialogs.cpp \
          src/app/HeyGeoWindow.cpp

TRANSLATIONS = languages/heygeo_en.ts \
               languages/heygeo_xx.ts \
	       languages/heygeo_pt.ts \
	       languages/heygeo_fr.ts \
	       languages/heygeo_de.ts \
	       languages/heygeo_nb.ts \
	       languages/heygeo_hu.ts \
	       languages/heygeo_es.ts \
	       languages/heygeo_nl.ts \
	       languages/heygeo_it.ts \
	       languages/heygeo_ja.ts \
	       languages/heygeo_cy.ts \
	       languages/heygeo_tr.ts \
	       languages/heygeo_ru.ts \
	       languages/heygeo_tc.ts \
	       languages/heygeo_zh.ts

DISTFILES += README.md AUTHORS COPYING \
             README.translators INSTALL \
             languages/*.ts languages/*.qm \
             help/*.html pics/*.xpm examples/*.seg examples/*.sec

translations.commands = lupdate $$PWD/heygeo.pro; lrelease $$PWD/heygeo.pro
QMAKE_EXTRA_TARGETS += translations
