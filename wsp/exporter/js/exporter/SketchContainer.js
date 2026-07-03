/* exported SketchContainer */
/**
 * This is a class which will contain the sketch itself.  Anytime the exporter
 * needs to interact with the sketch, e.g. getting a page, getting sketch object,
 * or setting the sketch object, the exporter should be interacting with this
 * class.  This keeps all of the sketch/json handling code in one place, here.
 *
 * @constructor
 */
var SketchContainer = function() {
  "use strict";

  this.pages = [];


  /**
   * This makes all non geometric kinds in the sketch non-arrow selectable.
   *
   * @param sketchObj
   */
  var filterMakeNonGeometricObjectsNotSelectable = function(sketchObj) {
    var nonGeometricKinds = [
      "Button", "Measure", "Text", "CoordSys", "Expression"
    ];

    for (var page in sketchObj.pages) {
      for (var object in sketchObj.pages[page].objects) {
        if ($.inArray(sketchObj.pages[page].objects[object].kind, nonGeometricKinds) >= 0) {
          if (!sketchObj.pages[page].objects[object].hasOwnProperty("style")) {
            sketchObj.pages[page].objects[object].style = {};
          }
          sketchObj.pages[page].objects[object].style.selectable = false;
        }
      }
    }
  };

  /**
   * This disables scrolling in the sketch.
   *
   * @param sketchObj
   */
  var disableScrolling = function(sketchObj) {
    for (var page in sketchObj.pages) {
      sketchObj.pages[page].preferences.limitScrolling = true;
    }
  };

  this.setSketch = function(sketchObj) {
    try {
      this.sketchObj = jQuery.parseJSON(sketchObj);
    } catch(e) {
      this.sketchObj = sketchObj;
    }
  };

  this.getPageNames = function() {
    var pageNames = [];
    for(var page in this.sketchObj.pages) {
      pageNames.push(this.sketchObj.pages[page].metadata.title);
    }
    return pageNames;
  };

  /**
   * This will return the entire sketch object but with all pages except the specified
   * one removed.  The specified page to remain is passed as a 0 based index number in the
   * jsonFilterOptions.currentPageIndex property.
   *
   * @returns { Object }
   */
  this.getSketchAsSinglePage = function(jsonFilterOptions) {
    var sketch = jQuery.extend(true, {}, this.sketchObj);
    jsonFilterOptions = jsonFilterOptions || {};

    //remove all pages except the one that has been passed as argument to
    //this function
    sketch.pages.splice(Number(jsonFilterOptions.currentPageIndex) + 1, sketch.pages.length - jsonFilterOptions.currentPageIndex - 1);
    sketch.pages.splice(0, sketch.pages.length - 1);
    sketch.metadata['start-page'] = sketch.pages[0].metadata.id;
    if (jsonFilterOptions.disableScrolling) {
      disableScrolling(sketch);
    }
    if (jsonFilterOptions.disableSelectableForNonGeometricObjects) {
      filterMakeNonGeometricObjectsNotSelectable(sketch);
    }
    return sketch;
  };

  /**
   * Separates the sketch pages into their own individual sketches.  The document metadata
   * is duplicated across the sketches.
   *
   * @returns { Object }
   */
  this.getSketchAsSeparatePages = function(jsonFilterOptions) {
    var originalSketch = jQuery.extend(true, {}, this.sketchObj),
        sketchCollection = [],
        sketchPage;
    jsonFilterOptions = jsonFilterOptions || {};

    for (var page in originalSketch.pages) {
      sketchPage = {};
      sketchPage.metadata = jQuery.extend(true, {},originalSketch.metadata);
      sketchPage.metadata['start-page'] = originalSketch.pages[page].metadata.id;
      if (jsonFilterOptions.disableScrolling) {
        disableScrolling(originalSketch);
      }
      if (jsonFilterOptions.disableSelectableForNonGeometricObjects) {
        filterMakeNonGeometricObjectsNotSelectable(originalSketch);
      }
      sketchPage.pages = [];
      sketchPage.pages.push(originalSketch.pages[page]);
      sketchPage.resources = originalSketch.resources;
      sketchCollection.push(sketchPage);
    }

    return sketchCollection;
  };

  this.getSketchDocName = function() {
    return this.sketchObj.metadata['original-document-name'];
  };

  /**
   * The difference between this and getPages() is that this also returns the top
   * level metadata and other top-level properties alongside the pages.
   *
   * @returns { Object }
   */
  this.getSketchObj = function(jsonFilterOptions) {
    var sketch = $.extend(true, {}, this.sketchObj);
    jsonFilterOptions = jsonFilterOptions || {};

    if (jsonFilterOptions.disableScrolling) {
      disableScrolling(sketch);
    }
    if (jsonFilterOptions.disableSelectableForNonGeometricObjects) {
      filterMakeNonGeometricObjectsNotSelectable(sketch);
    }
    return sketch;
  };

  /**
   * Returns a specific page from the stored sketch object.
   *
   * @param Integer
   * @returns { Object }
   */
  this.getPage = function(pageIndex) {
    return this.sketchObj.pages[pageIndex];
  };

  /**
   * This returns the top-level pages property of the sketch object which is
   * an array of each sketch page.
   *
   * @returns { Array }
   */
  this.getPages = function() {
    return this.sketchObj.pages;
  };
};