/**
 * @fileOverview Localization Utilities
 * @author <a href="mailto:kswenson@kcptech.com">Kirk Swenson</a>
 * @version 0.0
 * @preserve Copyright © 2014 KCP Technologies, Inc. All rights reserved.
 */
/**
 * This module contains the localized strings for a single locale,
 * in this case 'en' === "English".
 * The {key,value} map for the localizable strings is loaded into the
 * GSP.Locale.locales map and (optionally) set as the current locale.
 * Only one locale at a time can be the current locale.
 *
 */
GSP.Locale.locales.en = {

  'GSP.Error.incompatibleSketchVersion': "Web Sketchpad version '%@' cannot load a document created for version '%@'.",
  'GSP.Error.invalidSketchVersion': "Cannot compare WSP version '%@' with sketch version '%@'.",
  'GSP.Error.invalidSketch': "The specified sketch appears to be empty or invalid.",
  'GSP.Error.invalidSwitchPage': "The page requested doesn't exist.",
  'GSP.Error.loadSketchFailed': "An error occurred when loading the sketch.",
  'GSP.Error.invalidDocDelta': "The document delta could not be applied.",
  'GSP.Error.invalidSketchDelta': "The sketch delta could not be applied.",
  'GSP.Error.invalidGeomBounds': "Invalid geom bounds for object: %@ (%@)",
  'GSP.Error.constraintException': "Error constraining object: %@ (%@)",
  'GSP.Error.destroyObjectException': "Exception destroying object ('%@' (%@)): %@",
  'GSP.Error.touchStartException': "Exception in Sketch.handleTouchStart (touch.identifier='%@')",
  'GSP.Error.touchMoveException': "Exception in Sketch.handleTouchMove (touch.identifier='%@')",
  'GSP.Error.touchEndException': "Exception in Sketch.handleTouchEnd (touch.identifier='%@')",
  'GSP.Error.renderBoundsException': "Exception rendering object bounds ('%@' (%@))",
  'GSP.Error.renderObjectException': "Exception rendering object ('%@' (%@)): %@",
  'GSP.Error.renderLabelException': "Exception rendering object label ('%@' (%@)): %@",
  'GSP.Error.renderPrepareException': "Exception in renderPrepare ('%@' (%@)): %@",
  'GSP.Error.renderCleanupException': "Exception in renderCleanup ('%@' (%@)): %@",
  'GSP.Error.invalidSketchStart': "Sketch.start called for running sketch",
  'GSP.Error.invalidSketchResume': "Sketch.resume called for running sketch",
  'GSP.Error.invalidSketchStop': "Sketch.stop called for stopped sketch",
  'GSP.Measure.arcLength': "Length",
  'GSP.UI.undo': "Undo",
  'GSP.UI.redo': "Redo",
  'GSP.UI.ok': "OK",
  'GSP.UI.cancel': "Cancel",
  'GSP.Label.ShowButton': 'Show %@ %@',
  'GSP.Label.HideButton': 'Hide %@ %@',
  'GSP.Label.ShowButtonSwap': "Show",
  'GSP.Label.HideButtonSwap': "Hide",
  'GSP.Label.MoveButton': 'Move %@ → %@'
};

// Default to English
GSP.Locale.current = GSP.Locale.locales.en;
