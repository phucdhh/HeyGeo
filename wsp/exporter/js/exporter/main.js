/* global Export */
/* global SketchViewer */
/* global InfoViewer */
/* global Logger */
/* global DragDrop */

/*
 * Applies html escapes.
 */
/* exported escapeHTML */
var escapeHTML = function( s ) {
  return String(s).replace(/&/g,'&amp;')
    .replace(/</g,'&lt;').replace(/>/g,'&gt;');
};

var preloadResources = function() {
  var Image1 = new Image(0,0);

  Image1.src = "images/ajax-loader.gif";
};

var getBuildNumber = function() {
  var buildString = $('p.version').text(),
      buildStart = buildString.indexOf("Build Number: ") + 14,
      buildEnd = buildString.indexOf(", Build Stamp"),
      build = buildString.substring(buildStart, buildEnd);
  return build;
};

var getDebugOptionsForm = function() {
  var formElements = [
      [
        "debug-geom-bounds",
        ': <label>true <input type="radio" name="debug-geom-bounds" value="true" title=""></label>',
        '<label>false <input type="radio" name="debug-geom-bounds" value="false" title="" checked="checked"></label><br>'],
      [
        "graphics-engine",
        ': <input type="text" name="graphics-engine" title=""autocapitalize="none" autocorrect="off" value="standard"><br>'],
        [
        'instantiateUnsupportedObjects',
        ': <label>true <input type="radio" name="instantiateUnsupportedObjects" value="true"></label>',
        '<label>false <input type="radio" name="instantiateUnsupportedObjects" value="false" checked="checked"></label><br>'],
      [
        'perfTestMode',
        ': <label>true <input type="radio" name="perfTestMode" value="true"></label>',
        '<label>false <input type="radio" name="perfTestMode" value="false" checked="checked"></label><br>'],
      [
        'include debugging information',
        ': <label>Yes <input type="radio" name="remove-debug" value="false"></label>',
        '<label>No <input type="radio" name="remove-debug" value="true" checked="checked"></label>']
  ];

  return formElements;
};

//by default, Boolean() will convert any string to true, we want a conversion of "true" to true, and "false"
//to false.
var convertStringToBoolean = function(str) {
  switch (str) {
    case "true":
      return true;
    case "false":
      return false;
    default:
      return null;
  }
};

var getDebugOptionsSettings = function() {
  var formDefaultData = {
        'debug-geom-bounds': localStorage.getItem('debug-geom-bounds') ? convertStringToBoolean(localStorage.getItem('debug-geom-bounds')) : false,
        'graphics-engine': localStorage.getItem('graphics-engine') ? localStorage.getItem('graphics-engine') : "standard",
        'instantiateUnsupportedObjects': localStorage.getItem('instantiateUnsupportedObjects') ? convertStringToBoolean(localStorage.getItem('instantiateUnsupportedObjects')) : false,
        'perTestMode': localStorage.getItem('perfTestMode') ? convertStringToBoolean(localStorage.getItem('perfTestMode')) : false
  };

  return formDefaultData;
};

$(document).ready(function () {
  "use strict";
  var formDefaultData,
      formElements;

  //Load debug options if user has accessed a specific or local dev build(not the default release build
  //at root of domain, dn.kcptech.com/exporter),
//  if (window.location.href.indexOf("builds") > -1 || window.location.href.indexOf("kcptech.com") === -1) {
    formDefaultData = getDebugOptionsSettings();
    formElements = getDebugOptionsForm();
    for (var setting in formDefaultData) {
      GSP.gOptions[setting] = formDefaultData[setting];
    }
    InfoViewer.setOptionsPanel($('#optionsViewer').removeClass('hidden'), formElements, formDefaultData);
//  }

  //add application-wide logging handler
//  window.onerror = function(event) {
//    var log;
//    if (event.originalEvent) {
//      log = {
//        message: event.originalEvent.filename,
//        sketchName: event.originalEvent.message
//      };
//    } else {
//      log = {message: event.toString()};
//    }
//    Logger.logEvent(log);
//
//    return true;
//  };

  //Comment out the following line to disable error logging
  Logger.setup();
  Logger.setBuildNumber(getBuildNumber());

  //preload images
  preloadResources();


  //SETUP:
  DragDrop.setView($('#sketchWrapper'));
  SketchViewer.setupCanvas($("#sketchCanvas"));
  SketchViewer.setupTabs($("#tabs"));
  SketchViewer.setupResetControl($("#revertSketch"));
  SketchViewer.setupClearTracesControl($("#clearTraces"));

  InfoViewer.setDebugPanel($("#logViewer"), $("#sketchCanvas"));
  InfoViewer.setJSONPanel($("#jsonViewer"));
  InfoViewer.setTestsPanel($("#testViewer"));
  InfoViewer.setDivider($("#divider"));

  Export.setExportMenuButtonView($("#exportMenuButton"));

  Export.setExportMenuView($("#export-menu"));

  if (SketchViewer.storedInformation.lastViewedSketchName &&
      SketchViewer.storedInformation.lastViewedSketchName !== "null") {
    DragDrop.getSketchFromServer(SketchViewer.storedInformation.lastViewedSketchName,
                                 SketchViewer.storedInformation.lastViewedSketchTab);
  }
});
