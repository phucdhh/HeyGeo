// This code enables modal states (widgets) for modifying the style, visibility, and label of a tapped object.
// A small draggable controller appears in the sketch, with a button for each widget.
// The style widget and label widget expand the controller into a larger pane to provide the appropriate UI.
// Widgets are targeted to a sketch when the user loads a sketch, taps in a sketch, or changes to a different page.

/* global JSONcanonical */
/* global TOOLS */

// The below polyfills are required for compatibility with Internet Explorer.  Remove them if we decide not to support IE.
if (!Array.prototype.includes) {
  // Polyfill from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes#Polyfill
  Object.defineProperty(Array.prototype, 'includes', {
    value: function(valueToFind, fromIndex) {
      if (this === null) {
        throw new TypeError('"this" is null or not defined');
      }
      var o = Object(this);
/* jshint -W016 */
      var len = o.length >>> 0;
      if (len === 0) {
        return false;
      }
      var n = fromIndex | 0;
/* jshint +W016 */
      var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
      function sameValueZero(x, y) {
        return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
      }
      while (k < len) {
        if (sameValueZero(o[k], valueToFind)) {
          return true;
        }
        k++;
      }
      return false;
    }
  });
}

if (!String.prototype.endsWith) {
  // Polyfill from https://www.techcartnow.com/javascript-string-endswith-method-fixing-error-object-does-not-support-property-or-method-endswith-for-not-supported-browsers-ie-10-ie-11/
  Object.defineProperty(String.prototype, 'endsWith', {
    value: function (searchValue, lengthToSearch) {
      if (lengthToSearch === undefined || lengthToSearch > this.length) {
          lengthToSearch = this.length;
      }
      return this.substring(lengthToSearch - searchValue.length, lengthToSearch) === searchValue;
    }
  });
}

if (!String.prototype.includes) { // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes#Polyfill
  String.prototype.includes = function(search, start) {
    if (typeof start !== 'number') {
      start = 0;
    }
    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search, start) !== -1;
    }
  };
}

var WSP = {}; // Is it better to use a new global, separating widget additions from GSP?

WSP.PREF = (function () {

/*
 * Here we allow the Tool Library and other utilities (such as the WebSketch Viewer) to override normal sketch preferences.
 * This allows a sketch author to use widgets to edit a sketch for which widgets are normally disabled.
 * These preference overrides are stored in the webPagePrefs array, created by calling setWebPagePrefs().

 * TO DO:
 * These are low-priority fixes, at least until the value of specifying prefs in the web page is clear.
 * (1) Regularize pref "categories" to a specific set (tool, widget, and util) that are designated
 * by having these category names as suffixes. Thus "stylewidget" and "logoutil" would be in the "widget"
 * or "util" categories.
 * (2) The webPagePrefs array for each sketch should apply only to that sketch, so it should presumably
 * be attached either to the document to which it applies or to that document's sketch_canvas node.
 * END OF TO DO LIST
 * 
 * For instance, the Tool Library uses setWebPagePrefs to enable all widgets and all util-menu commands
 * even though the resulting sketch, when downloaded, will be more limited for student use.
 * To make this work, the widget and util-menu code calls WSP.PREF.getPref() rather than doc.getAuthorPreference()
 * to determine whether to display a particular widget or to enable a particular util-menu command.
 * WSP.PREF.getPref() checks the webPagePrefs array and returns either the value from that array (if it exists)
 * or the value from doc.getAuthorPreference() (if webPagePrefs does not contain a value).
 * For instance, the Tool Library uses this mechanism to enable the util commands "upload" and "download,"
 * allowing a sketch author to upload, edit, and download sketches that normally forbid these actions.
 * Here's the Tool Library code that produces this result:
 * WSP.PREF.setWebPagePrefs([
 *   { name: 'uploadutil', value: true },
 *   { name: 'downloadutil', value: true }
 * ]);
 * There are three categories that refer to multiple prefs at the same time: 'tool', 'widget', and 'util',
 * indicated by names that end in the category name.
 * util preferences are boolean, so must be set to true or false.
 * A PageArrayPrefs can be set to "all" or "none", but actually return true or false.
 * [If the need arises, we can extend this option to allow an array of strings (the desired page id's).]
 * For util and widget categories, you can set the entire category at once:
 * WSP.PREF.setWebPagePrefs([
 *   { category: 'widget', value: 'all' }  // omit the name to set all prefs for the category
 * ]);
 * Each element passed to setWebPagePrefs can include a category or a name, but not both.
 * (If both are included, the category is appended to the name.)
 * Here's another example, forbidding drag merging on all pages and putting undo/redo in the buttonBar
 * WSP.PREF.setWebPagePrefs([
 *   { name: 'enabledragmerging', value: ['none'] },
 *   { name: 'undoredoinbuttonbar', value: ['all'] }
 * ]);
 * When you specify the value to be used for a pref, you must adhere to the allowed values
 * for the particular type of pref: some are boolean, and some are page arrays, which have
 * shortcuts for setting them to all or none, as shown above.
 * (Note: For a PageArrayPrefType the return value from WSP.PREF.getPref matches the behavior
 * of doc.getAuthorPreference(), returning true or false for the page specified in the call to getPref.)
 * For now, the webPagePrefs apply to all sketches on the web page; specifying prefs per-sketch
 * is not required at this time.
 *
*/
  
  var webPagePrefs = []; // Each array element is a triple containing the preferences's category ("widget", "tool", or "util"),
  // its name ("style", "visibility", "upload", etc.), and the value.
  // ss 6/17/25: Revised pref handling so that only name and value are required; categories are now appended to name
  //    To accommodate legacy web pages, if category is present, it's appended to name.
  // A category name sets all prefs of that category.
  // The value should be in a form that corresponds to the prefSpec for that name.
  
  var queryItems = {}; // Prefs (such as author mode, debug mode, and locale) that are set by the URL's query string
    // Call (e.g.) WSP.PREF.checkQueryItem ('author') to check whether 'author' mode is set in the query string.
  
  function getWebPagePref(doc, name, pageId) {  // returns T/F if found, otherwise undefined
    var val;
    
    function checkOnePref (ix) {  // returns the pref value if found, undefined otherwise
      var aPref = webPagePrefs[ix],
          prefCat = aPref.category || '',
          prefName = aPref.name || '';
      // If prefCat exists, append it to name
      prefName += prefCat;
      // Allow cat = 'widget' and name = 'style' to match 'stylewidget'
      if (prefName && (prefName === name)) {
        return aPref.value; 
      }
    }
    
    for (var i = 0; i < webPagePrefs.length; i++) {
      val = checkOnePref (i);
      if (val !== undefined) {  // This entry matches
        if (pageId && Array.isArray(val)) {
          return val[0] === 'all' || val.includes(pageId);
        } else {
          return val;
        }
      }
    }
    // return undefined
  }
  
  function getPref (doc, name, pageId) { // returns the pref for this sketch doc, name, and pageId.
    // ss 6/17/25: Revised pref handling so that only name and value are required; categories are now appended to name
    // This function calls both doc.getAuthorPreference and getWebPagePref, so don't call it from either of those.
    // doc, name, and pageId are required. For prefs other than widget and util, pass an empty string '' for category.
    var val, retVal;
    
    name = name.toLowerCase();
    if (!doc.getAuthorPreference) {
      console.log ('doc param is bad...');
    }
    retVal = doc.getAuthorPreference (name, pageId);
    // If TOOLS is available, check web-page prefs only in debugMode.
    // This allows users of the Tool Library and the Viewer (and any future client of TOOLS) to determine
    // at runtime whether or not to allow web-page prefs to override the document prefs.
    // For instance, a sketch author can use Tool Library in debug mode to enable all widgets for authoring,
    // and then use the Tool Library in normal mode to see the same view as the normal student sketch user.
    if (!window.TOOLS || TOOLS.checkDebugMode()) {
      val = getWebPagePref(doc, name, pageId);
      if (val !== undefined) {
        retVal = val; // webPagePrefs 
      }
    }
    return retVal;
  }
  
  function setPrefs (prefArr) {
    if (Array.isArray(prefArr)) {
      $.each(prefArr, function() {
        var cat = this.category,
            name = this.name,
            value = this.value;
        if (cat && name) {
          name = name + cat;
          cat = undefined;
        }
        webPagePrefs.push ({category: cat, name: name, value: value});
      });
    }
  }
  
  function setUnitPref ($sketchNode, unit, newValue) { // Set a new unit pref for unit 'length' or 'angle'
    var doc = $sketchNode.data('document'),
        sketch = doc.focusPage,
        prefs = sketch.sQuery().prefs(),
        oldValue = prefs.units[unit],
        oldPrecision = prefs.precision[unit],
        deltaP = 0,
        newPrecision, gobjSel, gobjs, gobj,
        lengthGenera = ["DistanceMeasure", "ScalarMeasure", "DistanceParameter", "AreaMeasure", "Function"],
        angleGenera = ["AngleMeasure", "ScalarMeasure", "AngleParameter", "AreaMeasure", "Function"],
        maxPrecision = 7; // 7 decimal digits at the most.

    function clampPrecision (value) {
      return (value < 0) ? 0 : value > maxPrecision ? maxPrecision : value;
    }
    
    function adjustUnitsObjAndPrecision (gobj, unitsObj, newUnit, deltaP) {
      // Sets both the unitsObj unit to newUnit and style.precision accordingly, for either angle or length units.
      // The unitObj has the unit and power for both length and angle units that apply (e.g., cm^2/degree)
      // When called, either length or angle unit has changed, but not both. Weird units may cause
      // unexpected results. For instance, if the example (cm^2/degree) has precision 2 and is changed to pix and rad units,
      // the change to pix reduces precision by 4, to -2, which is then clamped to 0. The subsequent change to rad
      // increases the precision by 2, leaving the result at 2 (the original value) rather than 0 (the desired value).
      // It would be better to let the precision flaot freely and only clamp at the end, when displaying the value.
      unitsObj.unit = newUnit;
      gobj.style.precision = clampPrecision (gobj.style.precision + unitsObj.power * deltaP);
      gobj.state.forceDomParse = true;
      gobj.labelHasChanged();
    }

    function genusString( genusArr ) { // turn the array into an sQuery selection string
      var ret = '';
      genusArr.forEach(function(item) {
        ret += '[genus="' + item + '"],';
      });
      return ret.substring(0, ret.length - 1);  // remove the trailing comma 
    }
    
    gobjSel = {length: genusString( lengthGenera ), angle: genusString( angleGenera )};

  //gobjSel = {length: '[genus="DistanceMeasure"], [genus="ScalarMeasure"], [genus="DistanceParameter"], [genus="AreaMeasure"], [genus="Function"]',
  //          angle: '[genus="AngleMeasure"], [genus="ScalarMeasure"], [genus="AngleParameter"], [genus="Function"]'};

    if (newValue === oldValue) return;  // nothing to do
    if (newValue === 'pix' || oldValue === 'rad') {
      deltaP = -2;
    } else if (oldValue === 'pix' || newValue === 'rad') {
      deltaP = 2;
    }
    prefs.units[unit] = newValue;
    sketch.spec.preferences.units[unit] = newValue;
    doc.pageData[sketch.metadata.id].spec.preferences.units[unit] = newValue;
    if (deltaP) { // update the sketch-wide default precision
      newPrecision = clampPrecision (oldPrecision + deltaP);
      prefs.precision[unit] = newPrecision;
      sketch.spec.preferences.precision[unit] = newPrecision;
      doc.pageData[sketch.metadata.id].spec.preferences.precision[unit] = newPrecision;
    }
    gobjs = doc.sQuery (gobjSel[unit]);
    for (var i = 0; i < gobjs.length; i++) {
      gobj =  gobjs[i];
      if (gobj.unitsObject[unit]) {
        adjustUnitsObjAndPrecision (gobj, gobj.unitsObject[unit], newValue, deltaP);
        if (GSP.isParameter(gobj) && gobj.unitsObject[unit]) {    // update the multiplier used to display correct values
          gobj.unitMultiplier = GSP.units.convertToBaseFromUnitObject(1, gobj.unitsObject); 
          gobj.isExpressionDirty = true;
          gobj.fnExpression = undefined;
          gobj.parsedInfix = undefined;
          gobj.uValue = gobj.value/gobj.unitMultiplier;
        }
        if (gobj.fnUnits) {
          gobj.fnUnits = gobj.sQuery().prefs().units;
        }
      }
      gobj.invalidateGeom ();
    }
    sketch.event(
      'PrefChanged',
      {},
      {category: 'units', pref: unit, oldValue: oldValue, newValue: newValue}
    );
  } // setUnitPref
  
  function parseQueryString () { // parses the page's query string, storing the items in queryItems
    // The query string contains &-separated items. Each item is either prop (such as 'author' or 'debug')
    // or a (prop, value) pair (such as 'locale=en-US").
    // A prop without a value is considered to have a value of true.
    var href = window.location.href,
        questPos = href.indexOf('?'),
        st, search, items, endIndex;
    queryItems = {};  // ignore any pre-existing items
    if (questPos >= 0) {
      st = href.slice(questPos + 1);
      endIndex = st.indexOf('#');
      if (endIndex >= 0) {
        st = st.slice(0, endIndex);
      }
      search = decodeURIComponent(st);
      items = search.split('&');
      items.forEach(function (item) {
        var parts = item.split('=', 2),
            name = parts[0],
            value = parts[1];
        if (value === undefined || value === 'true') {
          value = true;
        }
        queryItems[name] = value;
      });
    }
  }

    
  return {
    // Each array element should be of form {category: "widget", name: "style", sketches: "sketch2", pages: "1, 3, 5"}
    // For legacy reasons, we allow elements like {widget: "style", sketches: "all"}, which becomes {category: "widget", name: "style", sketches: "all"}
    // If any field is missing, it defaults to "all"
    setWebPagePrefs: function (prefArr) {
      setPrefs (prefArr);
    },
    
    shouldEnableForPage: function (prefName, prefCat, sketchOrDoc, optPageId) {
      // return boolean: should the named pref be enabled for the current page of the sketch or optPageId of the doc?
      var doc = sketchOrDoc.document || sketchOrDoc,  // allow either sketch or doc
          pageId = optPageId || doc.focusPage.metadata.id,
          pages;
      prefName += prefCat ? prefCat : '';
      pages = getPref (doc, prefName, pageId);
      return pages === true || pages === 'all' || Array.isArray (pages) && (pages[0] === "all" || pages.includes(pageId));
    },
    
    getPref: function (doc, name, cat, optPageId) {
      return getPref (doc, name, cat, optPageId);
    },
    
    getWebPagePref: function(doc, name, pageId) {  // Checks for a web-page pref set by a call to setWebPagePrefs.
      return getWebPagePref(doc, name, pageId);
    },
    
    // Set a new unit pref for unit 'length' or 'angle'
    // This should probably be a more general utility for changing any of the sketch prefs.
    setUnitPref: function(sketch, unit, newValue) {
      setUnitPref (sketch, unit, newValue);
    },
    
    parseQueryString: function () {
      parseQueryString();
    },
    
    checkQueryItem: function (prop) {
      // If prop is a string, returns its value, or undefined if it's missing.
      // If prop is empty, returns the queryItems object
      var ret = prop === undefined ? queryItems : queryItems[prop];
      console.log ('checkQueryItem for ' + prop + ': ' + ret );
      return ret;
    }

    
  };
})();  // WSP.PREF

$(WSP.PREF.parseQueryString() );

var WIDGETS = (function() { //define the WIDGETS namespace
  // private variables here

  var scriptPath, // The url of this script, from which to locate image files.
      $widget,  // The jQuery widget object
      $widgetParent, // The parent, for moving the $widget html and tracking it even if detached from the sketch
      targetNode, // The sketch_canvas DOM node currently targeted by the widget, tracked separately so a new sketch in the same node doesn't move the widget
      $targetNode,
      targetSketch, // the currently-targeted sketch
      widgetsLoaded, // changes from undefined to true once widgets.html is loaded into the DOM 
      initialWidgetTargetNode, // the node to target when widgets.html is loaded
      targetGobj, // the currently-targeted gobj, which exists only when a widgetPane (not a widgetPrompt) is visible.
      targetState = "traceInOut",  // renderState used for a gobj targeted by a widget
      activeWidget,
      fadeTimer,     // Track the setInterval timer for  widget fading
      fadeTime = 400,  // Use 2000 for testing, but switch to 500 for production
      firstDocLoaded, // the first doc loaded during init, which should be the first to get the widgets.
      preserveActiveWidget, // the widget to be activated, if possible, in startPage.
      lastPageActiveWidget; // the active widget as of the last page change, used to track the active widget across a page change.
      
  
  // The following vars belong to the style widget
  var currentPointStyle = -1, currentLineThickness = -1, currentLineStyle = -1, colorIndex = -1,  // zero-based, so -1 means unchosen
      numColorRows = 3, numColorColumns = 9,
      radiusValue = [1.5, 2, 4, 6],
      pathStyleValue = ["solid", "dashed", "dotted"],
      pathWidthValue = [0.5, 1, 3, 5];
  
// Private functions here, utility functions first

  function extend(destination, source) { // From Oliver Caldwell (https://oli.me.uk/2013/06/01/prototypical-inheritance-done-right/)
      destination.prototype = Object.create(source.prototype);
      destination.prototype.constructor = destination;
      return source.prototype;
  }

  function getSketch () { // returns the currently-targeted sketch object
    var $node = $targetNode,
        doc;
    if (!($node && $node.length)) {
      console.log ('getSketch called with no $targetNode.');
      $node = $('.sketch_canvas'); // return the first sketch we can find, if any
    }
    doc = $node.data("document");
    if (doc) {
      return doc.sQuery.sketch;
    } else {
      console.log ('getSketch failed to find a sketch.');
    }
  }
  
  function getSketchNode (nodeOrDoc) { // returns the sketch_canvas of the doc or ancestral to the node
    nodeOrDoc = nodeOrDoc.canvasNode || nodeOrDoc;
    return $(nodeOrDoc).closest ('.sketch_canvas')[0];
  }
  
  function getJQ(selector) { // returns the JQ object, or undefined if it doesn't exist
    var $ret = $(selector);
    if ($ret.length) {
      return $ret;
    } else {
      return undefined;
    }
  }
  
  // Widget constructor: first define properties
  function Widget (name) { // All widgets have a button that must be appropriately shown (when enabled) and highlighted (when active)
    this.name = name;
    this.eventName = name + 'Widget';
    this.enabled = true;  // Don't show any widgets until they are activated.
  }
  
  // Send Widget events via the sketch event() function.
  Widget.prototype.event = function(context, attr) {
    // Widget-specific messages use the widget's eventName.
    // Most events pass an empty object as the context; here we add the widget itself and the target gobj,
    // and we add the targetGobj.id to attr.
    // The sketch event will provide additional context values.
    // The attr param typically uses attr.action to distinguish the specific nature of the event.
    // For instance, each widget sends events with attr.action values of "activate" and "deactivate".
    attr = attr || {};
    context = context || {};
    context.widget = this;
    if (targetGobj) {
      context.target = targetGobj;
      if (!attr.gobjId) { // One known caller (invalidateLabel) is called externally for a gobj other than the current target.
        attr.gobjId = targetGobj.id;
      }
    }
    getSketch().event(
      this.eventName,
      context,
      attr
    );
  };
  
  // Define Widget methods on the prototype
  // The activate and deactivate methods are explicitly implemented for each of the standard widget instances,
  // and each such widget-level method passes the instance as its widget parameter when calling its prototype method.
  Widget.prototype.activate = function (widget, restoring) {
    // Do not call this directly: the widget activation will not be animated.
    // restoring is optional; if true it indicates that the widget was temporarily deactivated
    // (for example, during a page change or undo/redo).
    // If a different widget is active, deactivate it first.
    var attr = {action: 'activate'},  // event data for listening clients
        sketch = getSketch();
    if (restoring) {
      console.log('Restoring preserved widget: ', name);
    }
    if (widget === activeWidget) {
      return;
    }
    if (activeWidget) {
      activeWidget.deactivate();
    }
    if (sketch.document.isCurrentlyInToolplay()) {
      return false;
    }
    activeWidget = widget;
    widget.isActive = true;
    widget.$domButton.addClass ("widget_active");
    attr.restoring = restoring;
    attr.promptDisplay = 'block';
    $(".widgetElem").on ("keyup", function (e) {
      if (e.keyCode === 27) {
        activeWidget.deactivate ();
      }
    });
    widget.event({widget: widget}, attr);
    return true;
  };
  
  Widget.prototype.deactivate = function (widget) { // must be a no-op if not already active
    // Do not call this directly: the widget deactivation will not be animated.
    var context = {'widget': activeWidget},
        attr = {action: 'deactivate', promptDisplay: 'none'};
    if (widget === activeWidget) {
      widget.isActive = false;
      widget.$domButton.removeClass ("widget_active");
      $(".widgetElem").off ("keyup");
      if (widget.changes) {
        attr.changes = widget.changes;
        if (widget.cancelOnExit) {
          attr.canceled = true;
        }
      }
      widget.event(context, attr);
      activeWidget = null;
    }
  };

  Widget.prototype.checkEnablingForPage = function (sketchOrDoc, optPageId) {
    // return true if the widget should be enabled, false if not.
    // If sketchOrDoc is a sketch, check the passed sketch and ignore optPageId
    // If it's a doc, use the optPageId's docSpec if provided; otherwise use the focusPage
    var sketch = sketchOrDoc.document ? sketchOrDoc : sketchOrDoc.focusPage,
        doc = sketch.document,
        pageId = optPageId || sketch.metadata.id,
        retVal;
    retVal = WSP.PREF.shouldEnableForPage (this.name, "widget", doc, pageId);
    return retVal;
  };
  
  Widget.prototype.enableForCurrentPage = function (sketch) {  // return true if the widget's enabled, false if not.
    // Side effect: deactivates the active widget if it's newly disabled.
    var retVal = this.checkEnablingForPage (sketch);
    this.enabled = retVal;
    if (retVal)
      this.$domButton.show();
    else {
      if (this === activeWidget) {
        this.deactivate();
      }
      this.$domButton.hide();
    }
    return retVal;
  };

  /*  A TapWidget is a widget that responds to taps on objects in the sketch. Such widgets must make all sketch objects selectable.
   *  The TapWidget installs handlers for activation and deactivation, and for taps on sketch gobjects.
   *  Every TapWidget is installed in the html in its own div, with id of "w" + widgetName + "Widget".
   *  Inside that div is either a prompt (id "w" + widgetName + "Prompt"), a pane (i "w" + widgetName + "Pane"), or both.
   *  The prompt, if present, provides helpful info for the user about what the widget does when tapped on a gobj.
   *  The pane, if present, allows the user to control the effect of the widget on the tapped gobj.
   *  If only one exists, it is shown during activation.
   *  If both exist, the TapWidget prototype first shows the prompt, and then on the first tapped gobj (via handleTap())
   *  hides the prompt and displays the pane.
  */
  function TapWidget (name, changeEvent) {
    Widget.call(this, name, changeEvent);
  }

  extend(TapWidget, Widget);
  
  TapWidget.prototype.preProcessGobj = function (gobj) {};
  
  TapWidget.prototype.postProcessGobj = function (gobj) {}; //Returns true if the gobj has been changed

  TapWidget.prototype.deactivate = function () {
    var sketch = getSketch(),
        regime = sketch.hasTouchRegimes() && sketch.currentTouchRegime ();
    if (activeWidget && activeWidget.postProcessSketch) {
      activeWidget.postProcessSketch (); // Undo effects of preprocessing
    }
    if (regime && regime.name === "DisplayRegime") {
      regime.allowUnselectableTap (false);
    }
    if (targetGobj) {
      setTarget(null);
    }
    if (activeWidget === this) {
      Widget.prototype.deactivate(this);
    }
  };

  /* hideShow is the function that animates the activating/deactivating of TapWidgets.
   * TapWidgets should not call activate() or deactivate() directly, but instead call show(), hide(), or
   * hideShow() respectively to activate a widget, deactivate a widget, or switch from one widget to another.
   * Doing so produces the hide/show animation (which animates hiding the old and showing the new).
   * Widgets can define prepHide(), hidden(), prepShow(), and shown() methods to prepare before
   * or clean up after the widget's dom elements are hidden or shown. These methods are called with
   * a domEl parameter identifying the domElement that's being hidden or shown.
   * The hideShow() function handles eight cases, listed below by the user action that invokes each.
   * The parameters (newWidget, newGobj, newSketch, and newDoc) are used to distinguish between the cases,
   * based on the relationship between the new values of these parameters compared to existing values
   * of the current state of the widget code. (Note that newDoc is derived from newSketch, so is not
   * passed explicitly.)
   * For ease of comparison, the following notation is used for current state variables:
   * oldWidget for activeWidget, curGobj for targetGobj, curSketch for targetSketch, and
   * oldDoc for the current document (available in curSketch) .
   * For each case, the existence of oldWidget is listed as a Precondition (oldWidget if there is
   * an activeWidget, or !oldWidget if there's no activeWidget).
   * The Condition describes the relationship between the new and old values that identify a specific case,
   * using (for instance) newWidget to indicate that newWidget should be imposed, or !newWidget to
   * indicate that the oldWidget value does not change.
   * 1  ShowWidget
   *    User Action: With no widget active, tap a widget icon in controller.
   *    Identified by: Tap on widget icon && !oldWidget && !elHide && newSketch
   *    Outcome: The new widget is activated.
   * 2  HideWidget
   *    User Action: Tap the active widget icon in controller.
   *    Identified by: Tap on widget icon && newWidget === oldWidget && elHide != elShow
   *    Outcome: Active widget is deactivated and focused.
   * 3  SwitchWidget
   *    User Action: With a widget active, tap a different widget icon in controller.
   *    Identified by: Tap on widget icon && oldWidget && newWidget === oldWidget && elHide != elShow
   *    Outcome: The active widget is deactivated and the new widget is activated.
   * 4  Confirm/Cancel
   *    User Action: Tap the Confirm (√) or Cancel (X) button of the active widget. 
   *    Identified by: !newWidget && !newGobj && !newSketch
   *    Outcome: Changes to the currently targeted gobj are confirmed or canceled, and the widget is deactivated.
   * 5  PromptToPaneNoGobj
   *    User Action: With an active widget showing its prompt, tap the prompt.
   *    Identified by: Tap on .widgetPrompt && .widgetPane && !newGobj && !widget.paneNeedsGobj
   *    Outcome: Changes to the currently targeted gobj are confirmed or canceled, and the widget is deactivated and focused.
   * 6  PromptToPaneGobj
   *    User Action: With an active widget showing its prompt, tap a gobj in the sketch.
   *    Identified by: newGobj && !newWidget && oldWidget.widgetPrompt:visible && oldWidget.widgetPane
   *    Outcome: Hide the prompt and show the pane.
   * 7  SwitchSketchGobj
   *    User Action: Tap a gobj in a different sketch.
   *    Identified by: newGobj && newSketch !== oldSketch
   *    Outcome: Widget controller moves to new sketch, targeting the tapped gobj.
   * 8  SwitchSketchNoGobj
   *    User Action: Click Widgets button in new sketch, change the page in the current document, or perform Undo/Redo
   *    Identified by: !newGobj && newSketch !== oldSketch && elHide === elShow
   *    Outcome: Deactivate the widget, move the controller to new sketch, and activate the same widget. 
   *    Note: On reactivation, the Trace widget shows its pane; other widgets show their prompt.
   * */
  
  TapWidget.prototype.hideShow = function (args) {
    // fade out both the widget controller and the active widget.
    // Then fade in the controller and the new widget (this)
    // this (the new widget) may be the same as the activeWidget
    // args contains some combination of the following:
    // event: the event and target provoking the call: tap on a gobj, a Widget button click, or a click on a prompt
    // context: the event context, possibly including context.gobj (the tapped gobj)
    // newSketch: the targeted sketch (possibly the same as targetSketch)
    var event = args && args.event,
        eventType = event ? event.type : null,
        target = event && event.target,
        currentTarget = event && event.currentTarget,
        // targetParentID = GSP._get(target, 'parentNode.id'),
        targetClass = GSP._get(target, 'className'),
        iconTap = currentTarget && currentTarget.id.match(/widget_(.*)ButtonID/),
        dismissTap = targetClass && targetClass.match(/wDismissButton\s(.*)_button/),
        context = args && args.context,
        newGobj = context && context.gobj,
        oldWidget = activeWidget, // caches activeWidget in case activeWidget changes during hide/show
        newWidget = this,
        oldSketch = targetSketch,
        newSketch = context && context.sketch || args && args.newSketch,
        sameSketch = oldSketch === newSketch,
        oldDoc = oldSketch ? oldSketch.document : undefined,
        newDoc = newSketch && (newSketch.document !== oldDoc ? newSketch.document : undefined),  // newDoc is defined iff different from oldDoc
        $elHide, $elShow, // The prompt or pane of widgets to be hidden or shown.
        enabledWidgets,
        hs, // the hide/show case
        promptToPane = args.hidePrompt;  // true if switching the same widget from prompt to pane
    
    function getDisplay(widget, purpose) {  // returns the prompt or pane DOM element for the named widget
      if (!widget) return; // display is undefined

      var showPrompt,
          $prompt = widget.$prompt,
          $pane = widget.$pane,
          ret;
      if (purpose === 'hide') { // return whichever is visible
        if ($prompt && $prompt.is(':visible')) {
          ret = $prompt;
        } else if ($pane && $pane.is(':visible')) {
          ret = $pane;
        }
      } else { // purpose === 'show': 
        showPrompt = $prompt &&  // show the prompt if it exists and:
                      ( !$pane || // there's no pane, or
                        !$prompt.is(':visible') && !widget.skipPrompt || // it's not visible or not marked to skip, or
                        newWidget.paneNeedsGobj && !newGobj  // there's no gobj and the pane requires one
                      );
        ret = showPrompt ? $prompt : $pane;
      }
      return ret;
    }
        
    function prepShow () { // prepare to show the widget pane
      var canvasNodes = $('.sketch_canvas'),
          regime = oldSketch.hasTouchRegimes() && oldSketch.currentTouchRegime (),
          $btn = newWidget.$domButton,
          $tip = $btn.find("span.widgettiptext"),
          $newWidget = $('#w' + newWidget.name + 'Widget');
          // If this widget is replacing a different active widget, it will be auto-shown when
          // the previous active widget's hide/fade is finished. Showing it now would jump the gun.
      $tip.hide();
      $btn.blur();
      if (oldWidget) {  // deactivate old before showing new, in case hidden didn't do it
        oldWidget.deactivate ();
      }
      canvasNodes = $('.sketch_canvas');
      canvasNodes.off("Tap.WSP"); // remove existing tap handlers
      canvasNodes.on("Tap.WSP", handleTap); // Detect taps for all sketches
      // Possible improvement: Toolplay in a different sketch calls targetControllerToDoc() if the toolplay sketch has widgets enabled.
      if (regime && regime.name === "DisplayRegime") {  // prep the regime to report taps on unselectable objects
        regime.allowUnselectableTap (true);
      }
      newWidget.activate (newWidget);
      if (newWidget.preProcessSketch) {
        newWidget.preProcessSketch (newSketch);  // Get the new sketch ready for the newly active widget
      }
      if (newWidget.prepShow) {
        newWidget.prepShow(); // do any widget-specific activation prep before it's shown.
      }
      // Prepare $newWidget and its children to show either prompt or pane
      $newWidget.children().hide(); 
      $newWidget.css({display: 'block'});
    } // prepShow
    
    function hidden(domEl) { // clean up after hiding a widgetPane or prompt (domEl is the element that was hidden)
      var doc, hiddenClass,
          $domEl = $(domEl || this);  // if hidden() was a param to jQuery hide(), 'this' is the DOM element being hidden
      console.log('finished hiding: ' + Date.now());
      if (!$domEl.length || !$domEl.hasClass('widgetElem')) {
        return; // Nothing to do unless a widgetPane or prompt was hidden.
      }
      if ($domEl.hasClass('widgetPane')) {
        hiddenClass = 'widgetPane';
      } else if ($domEl.hasClass('widgetPrompt')) {
        hiddenClass = 'widgetPrompt';
        if (!iconTap && hs < 7) return; // Hiding a prompt deactivates only if it's an iconTap
      } else {
        console.log('hideShow mis-identified the hidden object');
      }
      if (oldWidget) {  // deactivate old before showing new
        if (oldWidget.hidden) { // does oldWidget have a hidden() handler?
          oldWidget.hidden(hiddenClass); // do any widget-specific cleanup before retargeting or deactivating (e.g., turn off taps on unselectable objects)
        }
        if (hs > 4) { // only cases 5-8 keep the active widget
          if (oldWidget.cacheSettings) {
            oldWidget.cacheSettings('save');
          }
          preserveActiveWidget = oldWidget;
        }
        oldWidget.deactivate (); 
        // don't set oldWidget to null yet
        $('#w' + oldWidget.name + 'Widget').css({display: 'none'}); // hide the container for both prompt and pane
        if (hs === 2 || hs === 4) {
          oldWidget.$domButton.trigger('focus');
        } else {
          oldWidget.$domButton.blur(); // remove focus
        }
      }
      if (hs > 6) { // case 7 or 8: show same widget in the new sketch (which might be a different page of oldDoc)
        doc = newDoc || oldDoc;
        if (newGobj && oldWidget && oldWidget.$pane) {
          oldWidget.skipPrompt = true;  // If no newGobj, widget should show pane or prompt after the sketch switch
        }
        // Under what circumstances should we pass noHideShow: true?
        targetControllerToDoc(doc.canvasNode[0], {noHideShow: false, tappedGobj: newGobj});
        // What happens if the new doc doesn't enable the widget?
        newWidget = oldWidget;  // for case 7, activeWidget is null, so handleTap will be called later
      }
      oldWidget = null;
    } // hidden
    
    function doHide() { // hide, finish, nothing to show
      if (oldWidget && oldWidget.prepHide) {
        oldWidget.prepHide();
      }
      if ($elHide) { // is the old showing a prompt or pane?
        console.log('starting to hide: ' + Date.now());
        $elHide.hide(fadeTime, hidden); // yes, animate the hide
      } else {
        hidden(); // no, skip the animation
      }
      if (oldWidget) {
        oldWidget.deactivate();
      }
    } // doHide
    
    function doShow() { // prep && show
      if (promptToPane) {
        newWidget.skipPrompt = true;
        oldWidget = undefined;  // promptToPane has no further need for oldWidget
        if ($elShow === newWidget.$prompt && newWidget.$pane) {
          $elShow = newWidget.$pane;
        }
      }
      if (newGobj || !promptToPane) {
        prepShow();
      }
      $elShow.show(fadeTime, function() {
        // If the widgettiptext was visible, it seems that the $elShow.show() inserts a display: none into
        // the widgettiptext element. We remove any such style property so that the tiptext continues to work.
        // console.log('starting to show: ' + Date.now());
        $('.widgettiptext', newWidget.$domButton).removeAttr('style');
        if (event && context && (newGobj && !sameSketch || !promptToPane)) {
          // previous code also called handleTap if !promptToPane. Why was this?
          // event && context indicates that a tap remains unhandled, presumably from a gobj tap in a different sketch 
          // context = context || {};
          console.log('sameSketch: ' + sameSketch);
          context.noHideShow = true;
          handleTap(event, context); // handle the tap, but don't call hideShow recursively.
        }
        if (newWidget.shown) {
          newWidget.shown($elShow); // perform any finishing actions (e.g., focus on the label widget's input)
        }
        if ($elShow.hasClass('widgetPrompt') && newWidget.$pane) { // If we've shown the prompt, skip it next time
          newWidget.skipPrompt = true;
        }
      });
    } // doShow
     
    function doHideShow() { // hide the old and show the new
      var hiddenEl = $elHide && $elHide.length && $elHide[0];
      
      function finishAndShow() {
        if ((!promptToPane || newSketch !== targetSketch) && hiddenEl) {
          hidden(hiddenEl);
        }
        if ($elShow) {
          doShow();
        }
      }
      
      if ($elHide) { // is the old showing a prompt or pane?
        $elHide.hide(fadeTime, finishAndShow);  // yes, animate the hide
      } else {
        finishAndShow(); // no, skip the animation
      }
    } // doHideShow
    
    // body of hideShow
    $elHide = getDisplay(oldWidget, 'hide');  // $elHide and $elShow are existing jQuery elements or undefined.
    $elShow = getDisplay(newWidget, 'show');
    if (iconTap) { // cases 1, 2, or 3 (with an iconTap, newWidget must exist)
      if (!oldWidget) { // case 1: ShowWidget
        hs = 1;
        doShow(); // show new widget
      } else if (newWidget === oldWidget) { // case 2: HideWidget
        hs = 2;
        doHide(); // hide old widget
      } else {  // case 3: SwitchWidget (newWidget !== oldWidget)
        hs = 3;
        doHideShow(); // hide old widget, show new prompt or pane
      }
    } else if (dismissTap) { // case 4: Confirm/Cancel
      hs = 4;
      doHide(); // hide widget
    } else if (sameSketch || promptToPane) { // cases 5 or 6
      promptToPane = true; // in case it wasn't true already
      if (targetClass && targetClass.match(/widgetPrompt/)) { // case 5: PromptToPaneNoGobj
        hs = 5;
        if (oldWidget.$pane && (newGobj || !oldWidget.needsGobj)) {
          doHideShow(); // hide prompt, show pane
        }
      } else if (newGobj && $(oldWidget.$prompt).is(':visible')) { // case 6: PromptToPaneGobj
        hs = 6;
        doHideShow(); // hide prompt, show pane
      } else {
        console.log("cases 5-6 in widget.hideShow() don't know what to do.");
      }
    } else { // !sameSketch, so case 7 or 8: SwitchSketchGobj or SwitchSketchNoGobj
      // hide widget in old sketch, show in new, targeted for case 7, untargeted for case 8
      if (eventType === 'WillChangeCurrentPage' || eventType === 'WillUndoRedo') {
        return; // Let the matching later message do what's needed.
      }
      hs = newGobj ? 7 : 8;
      // case 8 could be page change, undo/redo, or widget button click.
      if (!'DidChangeCurrentPage UndoRedo Tap click'.includes(eventType)) {
        console.log ('Unexpected event for hideShow case 7 or 8: ' + eventType);
      }
      enabledWidgets = getEnabledWidgets (newSketch);
      if (!enabledWidgets.length ||   // no widgets at all in newSketch
          !enabledWidgets[newSketch.metadata.id].length ||   // no widgets in current page
          !enabledWidgets[newSketch.metadata.id].includes(newWidget)) { // current widget disabled
        $elShow = null;
      }
      if (newGobj) {
        promptToPane = true;
      }
      traceWidget.setTracedGobjRenderState( false ); // Turn off glowing in the oldSketch
      doHideShow();
    }
    
  }; // hideShow

  TapWidget.prototype.show = function () {
    if (this === activeWidget) {
      throw GSP.createError ("TapWidget.prototype.show called for the activeWidget.");
    } else {
      this.hideShow();
    }
  };
  
  TapWidget.prototype.hide = function () {
    if (this !== activeWidget) {
      throw GSP.createError ("TapWidget.prototype.hide called for an inactive widget.");
    } else {
      this.hideShow();
    }
  };
  
  TapWidget.prototype.toggle = function (event) {
    // This event handler calls hideShow() to fade-out the old widget and fade-in the new widget.
    // Pass the event, so that hideShow has access to it.
    // hideShow() needs the event to prevent a widget-icon tap from hiding prompt & showing pane.
    // The widget-icon tap instead must deactivate the widget.
    // hideShow also needs to know that fading the widget in or out doesn't change the sketch
    this.hideShow({event: event, newSketch: targetSketch}); 
    event.target.blur();
  };

  TapWidget.prototype.handleTap = function (event, context) { // handle a tap on a gobj 
    // If the tapped gobj is in the current target sketch return the tapped gobj.
    // If the tapped gobj is in a different sketch with widgets, target that sketch and return the gobj.
    // If the tapped gobj is in a different sketch without widgets, targetControllerToDoc will fail, so return null.
    var node, tapped;
    if (!context || context.noHideShow) {   // if no context, can't be a tap on a gobj.
      return context ? context.gobj : null; // if noHideShow, just return the gobj.
    }
    node = getSketchNode (context.document.canvasNode[0]);
    tapped = context.gobj;
    if (node !== targetNode) {  // Case 1 for hideShow(): activeWidget has a tap in a different node
      activeWidget.hideShow({newSketch: context.document.focusPage, event: event, context: context}); // give hideShow the info it needs to call handleTap() for this event
      return tapped;
    }
    if (node === targetNode || targetControllerToDoc (node, {tappedGobj: tapped})) {
      if (activeWidget.$prompt && activeWidget.$prompt.is(':visible') &&
          activeWidget.$pane) { // switch from prompt to pane
        activeWidget.hideShow({event: event, context: context});
      }
      return tapped;
    }
    else return null;
  }; // handleTap
  
  var styleWidget = new TapWidget ("Style");
  styleWidget.cancelOnExit = false;
  styleWidget.defaultColor = {row:0, column:1}; // red
  styleWidget.defaultPointStyle = 2;
  styleWidget.defaultLineThickness = 2;
  styleWidget.defaultLineStyle = 0;
  
  var visibilityWidget = new TapWidget ("Visibility");

  var labelWidget = new TapWidget ("Label");
  labelWidget.labelPoolSaved = false;
  labelWidget.touchPos = GSP.GeometricPoint (0, 0);
  labelWidget.textRule = null;
  labelWidget.paneNeedsGobj = true; // show prompt, not pane, if there's no targeted gobj

  var traceWidget = new TapWidget ("Trace");
  
  var deleteWidget = new TapWidget ("Delete");

  // When adding a new widget, be sure to add the new widget to the authorPreferenceSpecs in document.js!
  var widgetArr = [styleWidget, traceWidget, labelWidget, visibilityWidget, deleteWidget];
  
  /* ***** WIDGET SUPPORT ***** */

  function getWidget(info) { // return the widget associated with el, which can be the widget's name or 
    // an associated DOM element (its button, prompt, or pane). If a DOM element, it must have
    // a .widget or .widgetTip ancestor; we'll find the widget from its widgetTip .widgettiptext span
    // Return undefined if there's no associated widget.
    var name, $el, $tip;
        
    function getWidgetByName( name ) {
      var ret;
      name = name.toLowerCase().replace(/(widget)/, '').trim();
      widgetArr.some (function (widget) {
        if (widget.name.toLowerCase() === name) {
          ret = widget;
          return true;
        }
      });
      return ret;
    }
    
    if (typeof info === 'string') {
      name = info;
    } else {
      $el = $(info);
      $tip = $el.closest('.widgettip');
      if (!$tip.length) {
        $tip = $el.closest('.widget').prev();
        if (!$tip.length) {
          return; // undefined
        }
      }
      name = $('.widgettiptext', $tip)[0].innerHTML.split(' ')[0];  // remove "Widget"
    }
    return getWidgetByName (name);
  } // getWidget
  
  function showWidget(doShow) {
    if (arguments.length && !doShow) {  // If there's a false value passed, hide rather than show.
      hideWidget();
    } else {
      $widget.tinyDraggable({exclude: ".dragExclude"}); // do this here, in case dom node has moved
      $widget.toggle(true);
      $(".wsp-widgets-button").removeClass ("wb_active");
      $targetNode.parent().find(".wsp-widgets-button").addClass ("wb_active");
    }
  }
  
  function hideWidget() {
    if ($widget) {
      $widget.toggle(false);
    }
  }

  function handleWidgetsClick() {
    // Widgets button was clicked in targeted sketch, so toggle widget visibility.
    // We earlier tried to reposition it smartly, but that was more trouble than it's worth.
    if ($widget.is(':visible')) {
      $widget.hide(fadeTime);
    } else {
      $widget.show(fadeTime);
    }
  }

  function fadeControl (out) { // fade the widget controller in or out
    // Allows for the possibility of mid-fade switching between in/out
    var $ctrl = $('#widget_control'),
        deltaT = 50,
        opDelta = out ? -0.05 : 0.05,  // change opacity by .05 every 50 ms
        startTime = Date.now(),
        opStart = +$ctrl.css('opacity'),  // initial opacity (might be mid-fade)
        opEnd = out ? 0.25 : 1.0,
        clamp = out ? Math.max : Math.min,
        finished;
        
      function curOp() { // Calculate current opacity based on elapsed time
        var opSteps = (Date.now() - startTime) / deltaT,
            ret = clamp (opStart + opDelta * opSteps, opEnd);
        finished = (ret === opEnd);
        // console.log('fade steps: ' + opSteps + '  opacity: ' + ret);
        return ret;
      }
      
    if (fadeTimer) {  // first stop any existing fade
      clearInterval(fadeTimer);
    }
    fadeTimer = setInterval (function () {
      var opacity = curOp();
      $ctrl.css('opacity', opacity);
      if (finished) {
        clearInterval(fadeTimer);
        fadeTimer = null;
      }
    }, deltaT);
  } // fadeControl

function initCanvasForDoc(doc) {
    // Initializes a new sketch_canvas, and returns the sketch document
    var $canvas = doc.canvasNode,
        $nameDisplay = $('.wsp-file-name', $canvas.parent()),
        fileName, parsedName;
    if ($canvas.data('fileName')) {
      fileName = $canvas.data('fileName').split('/').pop();
    } else if ($canvas.data('url')) {
      fileName = $canvas.data('url').split('/').pop();
    } else {
      parsedName = UTILMENU.parseFileName (fileName, $canvas);
      if (parsedName) {
        fileName = parsedName.name;
      } else {
        fileName = doc.metadata['original-document-name'];
      }
    }
    if (fileName) {
      $nameDisplay.html(fileName);
    }
    $canvas.on ("keyup", function (e) { // If esc key reaches the canvasNode and there's an activeWidget, deactivate it.
      if (e.keyCode === 27 && activeWidget) {
        activeWidget.deactivate ();
        return true;
      }
    });
    injectButtonContent($canvas);
    resizeSketchFrame(doc);
    return doc;
  } // initCanvasForDoc

  function setupWidgetHandlers() {
    // This function is called during init, and sets up handlers for sketch_canvas elements present at that time.
    // Any sketch_canvas elements subsequently added to the page need to be initialized similarly.
    // The best way to handle this is to initialize each sketch_canvas when its first LoadDocument.WSP event occurs.
    var canvasNodes = $('.sketch_canvas');
    styleWidget.objectColorBox = $widget.find('#objectColorCheckbox')[0];  // $widget is not yet injected, so find these relative to $widget.
    styleWidget.textColorBox = $widget.find('#textColorCheckbox')[0];  // They'll get "checked" fields to keep track of their state
    canvasNodes.on ("UnloadDocument.WSP", function (event, context) {
      if (activeWidget && getSketch() === context.document.focusPage) {
        activeWidget.deactivate ();
      }
    });
  } // setupWidgetHandlers
  
  /* We want to have DocLoaded.WSP event handlers in place for every sketch_canvas, whether or not
  ** the sketch_canvas exists in the original HTML. (For instance, the Viewer adds sketch_canvas elements
  ** when the user loads one or more sketches.) The Document creation 
  */

  function prepareNode (event, context) { 
    // Prepare a sketch_canvas with the event handlers it needs for a soon-to-arrive sketch.
    // A handler is already installed (below) for DocLoaded.WSP
    var $node = $(context.node);
    // Page changes and undo/redo change the sketch, so stop the widget before the sketch change, and restart it afterward.
    $node.once("WillUndoRedo.WSP WillChangeCurrentPage.WSP", stopPage);
    $node.once("UndoRedo.WSP DidChangeCurrentPage.WSP", startPage);
    // initCanvasForDoc(doc); // Not needed (doc isn't yet available): DidChangeCurrentPage will call this.
    // Is there any other prep to do here?
  }

  function docLoaded( event, context ) {
    // This is the WIDGETS handler for DocLoaded.WSP.
    // From here we'll call the UTILMENU, PAGENUM, and BUTTONBAR handlers
    // As soon as a sketch doc is loaded into a sketch_canvas, we need to set its widget button,
    // and we should target the widget to the first such sketch.
    var doc = context.document;
    if (firstDocLoaded === undefined) {
      firstDocLoaded = doc; // firstLoaded of multiple docs should get the widget controller
      // We use firstDocLoaded to delay targeting widgets until the last of the multiple docs is loaded 
    }
  } // docLoaded
  
  
  function $getWidgetsButton($sketch) { // return the Widgets button for this $sketch, or else null
    var $ret;
    if ($sketch.length && $sketch.parent()) {
      $ret = $sketch.parent().find('.wsp-widgets-button');
    }
    return $ret.length ? $ret : null;
  }

  //The active widget is hidden (and preserved) during dragging and toolplay, and is restored
  //when the drag or toolplay ends. This new behavior supports multi-touch dragging.
  //Even when hidden, the preserved widget remembers its state and its target gobj.
  //The widget also remembers its state when it's moved from one sketch to another
  //on the same web page. (Formerly the user had to reactivate it in the new sketch.)
  function preserveWidget(event) { // deactivate the active widget, fading the controller and hiding the pane
    var $pane = $('#widget').children(":visible").not('#widget_control'),
        curNode = event.target;
    $('#widget :input').prop('disabled', true);
    $('div.wsp-page-buttons').prop('disabled', true);
    fadeControl(true);
    if (activeWidget) {
      activeWidget.$preservedPane = $pane;
      $pane.hide(fadeTime);
      if (targetGobj) {
        targetGobj.setRenderState ("none");
      }
    }
    // If the user has moved to a different sketch, bring the widget along
    if (getSketchNode(curNode) !== targetNode) {
      targetControllerToDoc(curNode);
    }
  } // preserveWidget

  function restoreWidget() { // restore the active widget, unfading and showing
    $('#widget :input').prop('disabled', false);
    $('div.wsp-page-buttons').prop('disabled', false);
    fadeControl(false);
    if (activeWidget) {
      if (activeWidget.$preservedPane) {
        activeWidget.$preservedPane.show(fadeTime);
        delete activeWidget.$preservedPane;
      }
      if (targetGobj) {
        targetGobj.setRenderState (targetState);
      }
    }
  } // restoreWidget

  /* Connecting and disconecting the widgets requires some care, particularly because there are some
   * operations (such as undo, redo, and page changes) that regenerate the contents of the sketch_canvas.
   * The widgets are attached to the .wsp-sketch-container element within the sketch_canvas, keeping
   * the widgets in the same apparent location relative to the sketch's geometric objects even as
   * a tool column appears or disappears. We detach the $widgetParent from its .wsp-sketch-container
   * element before the sketch_canvas elements are regenerated, and then connect it once regeneration
   * is finished and targetControllerToDoc() is called.
   * sns 10/27/25: the code below is taken from Nick's build of 6/16/25, to guarantee that any accessibility
   * changes are included. This code ignores the question of what should happen as the user adjusts widget
   * location from page to page or sketch to sketch, and will need careful integration with 
   * I've written up a separate description of what should be a more reasonable UX to deal with such adjustments.
  */
 
  function disconnectWidget($node) { // disconnect the widgets from the old node and doc, setting preserveActiveWidget if appropriate
    if (!$widgetParent.parent().length) {
      return; // no-op if $widgetParent is already detached.
    }
    $node.off ("WillPlayTool.WSP StartDragConfirmed.WSP", preserveWidget); // turn off handlers for the previous node
    $node.off ("ToolPlayed.WSP ToolAborted.WSP EndDrag.WSP MergeGobjs.WSP", restoreWidget);
    if (activeWidget) {
      activeWidget.postProcessSketch();
      activeWidget.deactivate();
    }
    $widgetParent.detach();
    // $widgetParent.removeData('oldSketchCanvas'); // Leave data in place in case of reconnecting
  } // disconnectWidget

  function positionWidgets(sketch) {
    // put the widgetcontroller close to the sketch's bottom left, iff 0 <= leftEdge <= 6 
    var $ctrl = $('div#widget_control'),
        numEnabled = $('.widget_controlButton:visible', $ctrl).length,
        rect = sketch.metadata.sketchRect,
        doShowWidget = WSP.PREF.getPref ($targetNode.data('document'), 'showWidgetPanelOnPageStart'),
        top;
    showWidget(doShowWidget && numEnabled > 0);  // Do this first, to make following call meaningful
    top = rect.bottom - rect.top - $ctrl.height() - 5;
    $widget.css({top: top, left: 2});
  } // positionWidgets

  function connectWidget(sketch, enabledWidgetsOnPage) { // connect the widgets to the new sketch, or return false if no widgets are enabled
    // If widgets are enabled, show the "Widgets" button and brings the widget controller to the new sketch.
    // If no widgets are enabled, hide the "Widgets" button and the widget controller.
    // Would it be better to leave the controller connected to the previous target?
    var $newNode = $targetNode.find('.wsp-sketch-container'), // new parent element for the widgetParent
        oldCanvas = $widgetParent.data('oldSketchCanvas'),
        $button = $getWidgetsButton($targetNode),
        leftEdgeClose = Math.abs (parseInt ($widget.css('left'), 10) - 4) <= 4; // 0 <= left <= 8
    if (!$newNode[0]) {
      throw GSP.createError ('connectWidget called with an invalid target');
    }
    //  $button.disabled = enabledWidgetsOnPage ? false : true;  // Enable or disable $button based on content
    // Instead of enabling/disabling, we now show or hide the button
    if (enabledWidgetsOnPage && sketch.getAuthorPreference('widgetbutton')) {
      $button.show();
    } else {
      $button.hide(); 
    }
    if (enabledWidgetsOnPage) {  // set up handlers
      $newNode.prepend ($widgetParent);
      $targetNode.on ("WillPlayTool.WSP StartDragConfirmed.WSP", preserveWidget); // turn on handlers for the new node
      $targetNode.on ("ToolPlayed.WSP ToolAborted.WSP EndDrag.WSP MergeGobjs.WSP", restoreWidget);
      $('.widget_controlButton').off('click', WIDGETS.toggleWidgetModality);
      $('.widget_controlButton').on('click', WIDGETS.toggleWidgetModality);
      installWidgetEventHandlers();
      if (oldCanvas !== $targetNode[0] || leftEdgeClose) {
        positionWidgets(sketch);// Reposition the widgets iff sketch node changed or widgets close to left edge
      }
      $widgetParent.data('oldSketchCanvas', $targetNode[0]);  // track the current sketch_canvas' DOM element
    }
  } //connectWidget
 
  function getEnabledWidgets(sketch, optPageId) {
    // If optPageId is provided, return the array of enabled widgets for optPageId, 
    // empty if no widgets are enabled for optPageId.
    // If optPageId is omitted, return an object containing an array of enabled widgets for each page of the sketch,
    // keyed by page id. Thus a call to getEnabledWidgets(sketch), if sketch has three pages with ids '3', '1', '2',
    // would return an object containing three arrays keyed by the page ids in pageNum order: {'3': arr3, '1': arr1, '2': arr2}
    // If any page has has no enabled widgets its array is empty.
    var enabledWidgets = {};
        
    function checkPage(pageId) {
      var retArr = [];
      widgetArr.forEach (function (widget) {  // Enable widgets for new sketch
        if (widget.checkEnablingForPage(sketch, pageId)) {
          retArr.push (widget);
        }
      });
      enabledWidgets[pageId] = retArr;
    } // checkPage
    
    // body of getEnabledWidgets
    if (optPageId) {
      checkPage(optPageId);
      return enabledWidgets[optPageId];
    } else {
      sketch.document.docSpec.pages.forEach( function(data) {
        checkPage(data.metadata.id);
      });
    }
    return enabledWidgets; // object containing arrays by page id.
  } // getEnabledWidgets

  function setWidgetsButtonAppearance($canvas, widgetsThisPage, willTarget) {
    // $canvas is tentatively becoming the target for the widgets, so set the appearance of the "Widgets" button
    // Return true if the passed sketch enables widgets on any page, and false otherwise.
    // In case of a false return, hide the Widgets button for this sketch, to indicate no widgets are enabled.
    // In case of a true return, unhilight any other Widgets buttons, highlight this sketch's
    // Widgets button, and enable it if the current page enables widgets.
    /*  Here are the requirements for the various states of the widget_button:
     *  Widgets target this page and controller is visible: blue border and background (target, enabled, active)
     *  Widgets target this page and controller is hidden: blue border (target, enabled)
     *  Widgets target some other sketch, but could target this page: enabled with plain background and black border (no style)
     *  Widgets target some other sketch, but could target a different page in this sketch: (disabled)
     *  Widgets target some other sketch, and cannot target any page of this sketch: (hidden).
     *  wb_target: blue border (otherwise black)
     *  wb_active: blue background & white text (otherwise light gray background)
     *  wb_hidden: display: none
     *  widget_button :disabled:: opacity 50%)
     *  
     *  **Would it be more convenient to track the available widgets by page, rather than tracking pages by widget as prefs do?
     **/
    var $button = $getWidgetsButton($canvas),
        sketch = $canvas.data('document').focusPage,
        $widgetParent = $('#widgetParent'),
        showButton = widgetsThisPage && widgetsThisPage.length > 0,  // show the widgets and the "Widgets" button?
        disabled = false,
        btnClass = ''; // The class to use for the Widget button
    if (showButton || willTarget) {  // Enable widgets for new sketch
      widgetArr.forEach (function (widget) {
        var newState = widgetsThisPage && widgetsThisPage.includes(widget);
        widget.$domButton.toggle(newState);
      });
      $widget.show();
    } else {
      disabled = true; // this page has no widgets, so disable button and hide widgets
      $widget.hide();
    }
    if (showButton) {
      // If this is the target sketch for widgets, highlight it even if it's disabled, so the user can tell where the widgets are targeted.
      // This page enables widgets, so highlight if it's the target sketch.
      // but first, remove highlighting from all other Widget buttons
      if (willTarget) {
        btnClass = 'wb_active'; // normal highlighting for the sketch with widgets
      } else if (widgetsThisPage) {
        btnClass = 'wb_target'; // this page won't get the widgets, but another page of the same sketch has them
      }
      if (btnClass) {
        $('.widget_button').removeClass('wb_active wb_target'); // remove button highlighting in other sketches
        $button.addClass(btnClass); // and add the needed class to this sketch
      }
      $button.prop('disabled', disabled);
      $button.css('cursor', disabled ? 'default' : 'pointer');
      if (targetSketch === sketch) {
        $widget.toggle(!disabled);  // hide widgets if there are none 
      }
      // When targeted, the Widgets button in the buttonbar and the widgets themselves are visible or hidden together.
      // (Existing Widgets can later be hidden by pressing the Widgets button in the buttonbar.)
      $button.show();
      $widgetParent.show();
    } else {
      $button.hide();
      $widgetParent.hide();
    }
    return showButton;
  } // setWidgetsButtonAppearance

   
 
 // -------------------- End of code copied from Nick's 6/16/25 build ---------------------------
 
 // TODO: Integrate the above code with the two following functions: getEnabledWidgets and setWidgetsButtonAppearance.
 // Then integrate changes since 6/16/25 with the versions based on the 9/25 build

  function targetControllerToDoc (theNode, options) {  // theNode is any DOM element in the current target sketch
    // Set options.tappedGobj if the retargeting is caused by a tap on a gobj in a different sketch.
    // Set options.noHideShow to retarget without changing the active widget.
    options = options || {};
    var tappedGobj = options.tappedGobj,
        newSketchNode = getSketchNode (theNode),
        nodeChanged = newSketchNode !== targetNode,  // if true, both doc and sketch have changed
        $newNode = $(newSketchNode),
        oldDoc = targetSketch && targetSketch.document,
        newDoc = $newNode.data("document"),
        docChanged = newDoc !== oldDoc, // if true, the sketch has changed
        newSketch = newDoc.sQuery.sketch,
        sketchChanged = newSketch !== targetSketch,  // if false, there's nothing to do
        pageId = newSketch.metadata.id,
        enabledWidgets = getEnabledWidgets (newSketch), // enabled widgets, keyed by page id
        curPageWidgets = enabledWidgets[pageId];
    
    function reactivateWidget(sketch) { // Reactivate the widget in sketch, optionally targeted to tappedGobj
      // returns true if there are enabled widgets
      if (enabledWidgets[pageId].includes(visibilityWidget)) {
        visibilityWidget.setVisColor (sketch);
      }
      if (preserveActiveWidget && curPageWidgets.includes(preserveActiveWidget)) {
        if (preserveActiveWidget.cacheSettings) {
          preserveActiveWidget.cacheSettings('restore');
        }
        if (!options.noHideShow) {
          preserveActiveWidget.hideShow({newSketch: sketch});
        }
        // Point the widget to the new gobj, unless sketchChanged is true,
        // in which case handleTap() will be called later, in the context of the new sketch.
        if (!sketchChanged && tappedGobj && sketch.gobjList.gobjects[tappedGobj.id] === tappedGobj) {
          setTarget(tappedGobj);  // point the widget to the new gobj
        } else {
          setTarget(null);
        }
      } // preserveActiveWidget
      return curPageWidgets.length > 0;
    // should we set preserveActiveWidget = null; ?
    } // reactivateWidget

    // body of targetControllerToDoc
    if (!$newNode.is(':visible')) {
      return activeWidget;  // don't target to a hidden sketch, or retarget to the same page of the same sketch
    }
    console.log('Targeting widgets to ' + (sketchChanged ? 'new' : 'previous') + ' sketch and ' + (docChanged ? 'new' : 'previous') + ' doc.');
    if (!$newNode.hasClass('sketch_canvas')) {
      throw GSP.createError ("targetControllerToDoc called for an invalid node.");
    }
    initCanvasForDoc (newDoc);
    if (!curPageWidgets.length) {
      setWidgetsButtonAppearance($newNode, curPageWidgets, options);
      return false; // No widgets enabled for the new page, so bail after setting appearance
    }
    // At this point we know that the newSketch enables widgets, so go ahead and target it.
    if (nodeChanged || docChanged) {
      if ($targetNode) {
        disconnectWidget($targetNode);
      }
      targetNode = newSketchNode;
      $targetNode = $(targetNode);
    }
    if (sketchChanged) {
      targetSketch = newSketch;
    }
    // Set widget visibility before connecting
    setWidgetsButtonAppearance($newNode, curPageWidgets, nodeChanged);
    if (!(options && options.noHideShow)) {
      connectWidget(newSketch, curPageWidgets);
    }
    options.nodeChanged = nodeChanged;
    // There are active widgets, so handle them...
    // console.log('Switching target from', $targetNode, 'to', $newNode);
    if ($('#delete-confirm-modal').is(':visible')) {  // cancel any pending deletion
      $('#deleteCancel').click();
    }
    reactivateWidget(targetSketch);
    GSP.WspHelp.addHelpToWidgets();
    //widgetArr.forEach (function (widget) {  // Enable widgets for new sketch ALREADY DONE BY widgetArr
    //  widget.enableForCurrentPage (newSketch);
    //});
    return activeWidget; // if a widget is returned, it's the enabled active widget
  } // targetControllerToDoc

  TapWidget.prototype.preProcessSketch = function (optSketch) {
    // Prepare all sketch objects to enable widget use, making all selectable and (for visibility widget) showing hidden objects
    // Some sketch objects may already have been pre-processed, so it's a requirement that the preProcessGobj function can be used multiple times on the same gobj without making further changes.
    // If optSketch is passed, and differs from the current target sketch, the controller is retargeted.
    var sketch = targetSketch;
    if (optSketch && sketch.canvasNode[0] !== optSketch.canvasNode[0]) {
      targetControllerToDoc (optSketch.canvasNode[0]);
      //return; // targetController will call back after retargeting
    }
    if (activeWidget && activeWidget.preProcessGobj) {
      sketch.sQuery("*").each (function (ix, gobj) {
        activeWidget.preProcessGobj (gobj);
      });
      sketch.isDirty = true;  // Possible code improvement: some widgets dirty the sketch and some don't
      sketch.setNeedsDisplay();
    }
  };

  TapWidget.prototype.postProcessSketch = function () {
    // Return all sketch objects to their proper state, reversing the effects of pre-processing
    var sketch = getSketch(),
        changes = [];   // record any sketch objects that were modified,
        // but ONLY if they weren't individually sent as events
    if (activeWidget && activeWidget.postProcessGobj) {
      sketch.sQuery("*").each (function (ix, gobj) {
        var change = activeWidget.postProcessGobj (gobj);
        // returns a change object if the gobj was changed by this widget
        // postProcessGobj has access to cancelOnExit. If true,
        // change contains the original props; if false, it contains new props. 
        if (change) {
          change.id = gobj.id;
          changes.push (change);
        }
      });
      if (changes.length) {
        this.changes = changes;  // Deactivate will send changes along with the deactivate event
      }
      sketch.isDirty = true;  // Possible code improvement: some widgets dirty the sketch and some don't
    }
    return true;  // If this is a message handler, propagate the message
  };

  function check (element, state) {
    element.checked = state;
    element.src = (state) ? scriptPath + "checked.png" : scriptPath + "unchecked.png";
  }
  
  function toggleCheck (element) {
    element.checked = (element.checked) ? false : true;
    element.src = (element.checked) ? scriptPath + "checked.png" : scriptPath + "unchecked.png";
    return element.checked;
  }
  
  /* ***** GENERAL UTILITIES ***** */
  // The startPage and stopPage functions handle page changes, either in the same DOM node or between DOM nodes.
  // They handle WSP events, so arguments are (event, context, attributes).
  
/* When the undoredotraces pref is enabled, the session.history of each page stores its traceData (if any),
 * so that the trace history is preserved as the user moves through the undo history. When the sketch is saved,
 * only the currently-existing traces are stored. Just as the undo history is lost on download, so is the trace history.
 * Code below handles this, but needs to be checked again when we allow users to set the undoredotraces pref.
  */
  
  function startPage (event, context) {
    // Handles LoadDocument, DidChangeCurrentPage, and UndoRedo events
    var doc  = context.document,
        sketch = doc.focusPage,
        type = event.type,
        $newContainer = $('.wsp-sketch-container', doc.canvasNode),
        $curContainer = $widgetParent.parent(); // possibly empty
/* undoredotraces is not yet implemented
        history = doc.pageData[sketch.metadata.id].session.history,
        undoRedoTraces = doc.getAuthorPreference ('undoredotraces');
*/
    // First make sure widgets are attached to $newContainer
    if ($curContainer[0] !== $newContainer[0]) {
      // console.log('Moving $widgetParent to new container');
      $widgetParent.appendTo ($newContainer);
    }
    if (/*undoRedoTraces && (type === 'UndoRedo' ||*/ type === 'DidChangeCurrentPage') {
      sketch.restoreTraces (/*GSP._get( history, 'current.delta.traceObj.traces' )*/);
    }
    if (activeWidget && !(firstDocLoaded || firstDocLoaded === doc) ) {
      activeWidget.hideShow({event: event, newSketch: sketch}); // This will call targetControllerToDoc()
    } else { // no activeWidget, so call directly, provided widget.html is already loaded
      if (widgetsLoaded) {
        targetControllerToDoc (sketch.clipNode[0]); // restore the preserved widget
      } else { // 
        initialWidgetTargetNode = sketch.clipNode[0];
      }
    }
/*
    if (type === 'LoadDocument') { // only LoadDocument can change undoRedoTraces
      traceWidget.setUndoRedoTraces (undoRedoTraces); // can call only after targetControllerToDoc
    }
*/
    // Track the firstDoc only until its page starts
    if (doc === firstDocLoaded) {
      firstDocLoaded = null;
    }
  } // startPage

  function stopPage (event, context) {  // prepare the widget for a page change or undo/redo
    // Page change: Save full-res session traces to restore when the page is restored.
    // Undo/redo: Save compressed undo/redo delta traces
    // In either case, smoothly hideShow any active widget
    var doc  = context.document;
/* undoredotraces is unimplemented    
        sketch = doc.focusPage,
        session = doc.pageData[sketch.metadata.id].session,
        history = session && session.history;
    if (!history) { // If a page is deleted, its session is undefined.
      return;
    }
    if (event.type === 'WillUndoRedo' &&
        doc.getAuthorPreference ('undoredotraces')) {
      // Save the current traces with the current session history (even if traces are fading)
      // storeCompressedTraces() is asynchronous, so tell it where to put the data once it's compressed 
      // TO DO: Make sure multiple undo/redo cycles don't degrade the traces
      // POSSIBLE IMPROVEMENT: Don't bother compressing if already-compressed traces haven't changed
      sketch.storeCompressedTraces (history.current); 
    }
*/
    if (event.type === 'WillChangeCurrentPage' || event.type === 'WillUndoRedo') {
      if (activeWidget) {
        activeWidget.postProcessSketch();
        doc.recordActivePageDelta(); // over-write the delta recorded when WillChangeCurrentPage was sent
        if (event.type === 'WillChangeCurrentPage') {
          $widgetParent.detach(); // let $widgetParent survive call to attachToNode()
          activeWidget.hideShow({event: event, context: context});
        }
      }
    }
  } // stopPage

  function handleTap(event, context) {
    var enabledWidgets,
        sketch = context.sketch;
    if (activeWidget) {
      if (targetSketch === sketch) {
        activeWidget.handleTap(event, context);
      } else if (!context.noHideShow) { // tap is from a different sketch, so use hideShow to retarget the controller
        enabledWidgets = getEnabledWidgets (sketch, sketch.metadata.id);
        if (enabledWidgets && enabledWidgets.includes(activeWidget)) { // tap has no effect if activeWidget isn't enabled
          activeWidget.hideShow({event: event, context: context, newSketch: sketch});
        }
      }
    }
  }
  
  function injectButtonContent ($canvas) { // Initialize any uninitialized .wsp-widgets-button element ("Widgets") for this canvas.
    // In case of a web page with multiple sketches, we set all such elements to the same handler, which coordinates
    // moving the widgets between the different sketches.
    var $button = $getWidgetsButton($canvas);
    if ($button) { // The $canvas has a Widgets button
      if (!$button.text()) {
        $button.text('Widgets');
      }
      // TO-DO: Might this button have a click handler that doesn't handle multi-sketch web pages?
      // worse, might it have two so they toggle twice?
      // Make sure there's only one by removing and replacing the handler
      $button.off('click');
      $button.on('click', function(e) {
        WIDGETS.toggleWidgets(this, e);  // Use the multi-sketch-friendly handler.
      });
    }
  }

  function resizeSketchFrame (sketchDoc) {  // Resize the frame to fit a new sketch
    var $canvas, $container, $refNode, width, oldWidth;
    $canvas = sketchDoc.canvasNode;
    $container = $canvas.parent ();
    if ($container.hasClass ("sketch_container")) {
      oldWidth = $container.outerWidth ();
      $refNode = $canvas.find(".wsp-base-node");
      width = $container.find(".wsp-base-node").width();
      if (width) {
        width += parseInt ($container.css("border-left-width"),10) + 
            parseInt ($container.css("border-right-width"), 10);
      } else { // The container is hidden, so try to calculate what it will be when shown
        var toolHeight;
        width = sketchDoc.metadata.width + $container.find(".wsp-tool-column").width() + 6;
        toolHeight = sketchDoc.metadata.height - $canvas.find(".wsp-undo-button").outerHeight() - 2;
        $canvas.find(".wsp-user-tools").outerHeight(toolHeight);
        $canvas.find(".wsp-base-node").outerWidth(width - 4);
        // This is a complete hack to make the hidden sketch elements the proper size.
        // If styles change, this could be off by a few pixels, or worse if (for instance) undo and redo are at bottom.
        // The current work-around is to use data-delayed-url so that a sketch isn't loaded until it's actually visible.
        // A better work-around would be to factor attachToolsToNode into two different functions,
        // one to size the sketch elements and another to attach the tools. Then we could call the resize()
        // function when the sketch becomes visible. (Though detecting that event is also a can of worms.)
      }
      /* The container should fit its content, with no ned to explicitly set its width
      if (width !== oldWidth) {
        $container.outerWidth(width);
        console.log("widgets.resizeSketchFrame() changed width from " + oldWidth + " to " + width);
      } else {
        console.log("widgets.resizeSketchFrame() made no change.");
      }
      */
    }
  }

  function setTarget (newTarget) {
    // returns either the newly-targeted gobj or the previously-targeted gobj
    var retVal = newTarget || targetGobj;
    if (targetGobj) {
      if (targetGobj && targetGobj !== newTarget) {
        targetGobj.setRenderState ("none");
        targetGobj = null;
      }
    }
    if (newTarget) {
      targetGobj = newTarget;
      targetGobj.setRenderState (targetState);
    }
    return retVal;
  }
  
  /* ***** STYLE WIDGET ***** */
  
  styleWidget.prepShow = function () {
  };
  
  styleWidget.hidden = function (hiddenClass) {
    // We need to postProcess only when hiding the widgetPane, not the widgetPrompt
    if (hiddenClass === 'widgetPane') {
      this.postProcessSketch();
    }  
  };
  
  // postProcessSketch() is called when the widget is deactivated, and hidden() is called
  // whenever the widgetPrompt or widgetPane is hidden. 
  styleWidget.postProcessSketch = function () {
    if (targetGobj) {
      targetGobj.setRenderState ("none");
      setTarget(null);  // targetGobj can't hang around; it might not even exist any more
    }
    TapWidget.prototype.postProcessSketch();
    this.cancelOnExit = false;    
  };

  function setDomColor (color, gobj) {
    // Ideally we could use forceDomParse to regenerate the DOM node, but forceDomParse just tinkers a bit
    // with the existing node. Therefore we change the color of that existing DOM node.
    var domNode = $targetNode.find ("[wsp-id='" + gobj.id +"']").not(".wsp-sr-only"); // The domNode exists for text objects and buttons
    if (domNode[0]) { // Do we need to change the color cached in the renderRefCon?
      domNode.css({"color": color});
      domNode.find ("*").not('div.wsp-parameter-sr-only').css({"color": color}); // leave accessibility text transparent
    }
  }
  
  function notifyInvalidatedStyle(notify) {
    // Invalidates the appearance and optionalLy sends an event with the modified style.
    targetGobj.invalidateAppearance();
    if (notify) {
      styleWidget.event({}, {action: 'changed', changes: [{id: targetGobj.id, style: targetGobj.style}]});
    }
  }

  function setTextColor (gobj, color) {  
    // Changing text color requires changing gobj.style.color for text objects
    // and changing gobj.style.label.color for labeled non-text objects and buttons.
    var retVal = false;
    if (!gobj) return false;
    if (gobj.isOfKind("Text")) {
        retVal = gobj.style.color !== color;
        if (retVal)
          gobj.style.color = color;
      } else if (gobj.isOfKind("Button")) {
        retVal = gobj.style.label.color !== color;
        if (retVal)
          gobj.style.label.color = color;
      } else if (gobj.style.label && gobj.style.label.showLabel) {  // is this the same as gobj.hasLabel?
        retVal = gobj.style.label.color !== color;
        if (retVal) {
          gobj.style.label.color = color;
          gobj.sQuery.sketch.renderRefCon.label[gobj.id].color = color;
          return true;  // Label color is in the label refcon, not in the DOM
        }
      }
      if (retVal) {
        setDomColor (color, gobj);
      }
      invalidateLabel (gobj, 'Set color for');
    return retVal;
  }

  function restoreTextColor (gobj)  { // Restores the text and text color of gobj to the cached original values.
    var originalColor, currentColor;
    if (gobj.oldStyle) {
      if (gobj.isOfKind("Button") || gobj.isOfKind("Text")) {
        originalColor = (gobj.isOfKind("Text")) ? gobj.oldStyle.color : gobj.oldStyle.label.color;
        currentColor = (gobj.isOfKind("Text")) ? gobj.style.color : gobj.style.label.color;
        if (originalColor && originalColor !== currentColor) {
          setTextColor (gobj, originalColor);
        }
      }
      else if (gobj.style.label && gobj.style.label.showLabel) {  // Labels only need to restore the label renderRefCon color
        gobj.sQuery.sketch.renderRefCon.label[gobj.id].color = gobj.style.label.color;
        gobj.invalidateAppearance ();
      }
    }
  } // restoreTextColor
  
  function getColorFromIndex () {
    var row;
    var column = Math.floor(colorIndex / numColorRows);
    switch (colorIndex - numColorRows * column) {
      case 0: row="a"; break;
      case 1: row="b"; break;
      case 2: row="c"; break;
    }
    return $(".block"+column+row).css("background-color"); // Use .css to return the computed style
  }
  
  function setGobjColor (color, notify) {  // if optGobj is undefined, set the color of the targetGobj.
    var retVal = false, // returns true if color was changed
      gobj = targetGobj;
    if (gobj) {
      if (styleWidget.objectColorBox.checked) {
        if (gobj.isOfKind ("Text")) {
          retVal = setTextColor (targetGobj, color);
        } else {
          gobj.setRenderState ("none");
          retVal = gobj.style.color !== color;
          if (retVal) {
            gobj.style.color = color; // Set the color of a geometric object, a text object, or a button handle
            notifyInvalidatedStyle(notify);
          }
          gobj.setRenderState (targetState);
        }
      }
    }
    return retVal;
  }
  
  function setPointStyle (newStyle, notify) {
    var gobj = targetGobj;
    currentPointStyle = newStyle;
    if (gobj && gobj.style.radius && currentPointStyle >= 0) {
      gobj.setRenderState ("none");
      gobj.style.radius = radiusValue [currentPointStyle];
      gobj.setRenderState (targetState);
      notifyInvalidatedStyle(notify);
    }
  }

  function setLineStyle (newStyle, newThickness, notify) {
    var gobj = targetGobj;
    currentLineStyle = newStyle;
    currentLineThickness = newThickness;
    if (gobj) {
      gobj.setRenderState ("none");
      if (gobj.isOfGenus ('Path') && currentLineStyle >= 0)
        gobj.style['line-style'] = pathStyleValue [currentLineStyle];
      if (gobj.style.width && currentLineThickness >= 0)
        gobj.style.width = pathWidthValue [currentLineThickness];
      gobj.setRenderState (targetState);
      notifyInvalidatedStyle(notify);
    }
  }
  
  function setColor (colorIndex, notify) {
    // Desired enhancement: if both doGobj and doText are false, set the color
    // to the color of the tapped gobj and turn on the objectColorBox.
    // The purpose is to make it easy to copy an already-existing color to
    // multiple other objects. But shouldn't the same strategy work for point
    // size and for line style? How can we make this easy to do and intuitive?
    var newColor = getColorFromIndex (colorIndex),
        doGobj = styleWidget.objectColorBox.checked,
        doText = styleWidget.textColorBox.checked;
    if (doGobj) {
      setGobjColor (newColor, notify);
    }
    if (doText) {
      setTextColor (targetGobj, newColor, notify && !doGobj); // if doing both, notify only once
    }
  }

  styleWidget.postProcessGobj = function (gobj) { // if style is changed, return the change
    var cancel = styleWidget.cancelOnExit,
        change;  // If canceling, return gobj.oldStyle; if not, return gobj.style
        // 
    if (gobj.oldStyle) {  // exists if this gobj's style was changed
      if (cancel) {
        gobj.style = gobj.oldStyle;
        restoreTextColor (gobj);
        gobj.sQuery.sketch.invalidateAppearance(gobj);
      }
      change = {style: jQuery.extend (true, {}, gobj.style)}  ;
      delete (gobj.oldStyle);
    }
    Object.getPrototypeOf(styleWidget).postProcessGobj (gobj);  // undo any TapWidget pre-processing
    return change;  // defined only if the gobj was affected by the widget
  };
  
  styleWidget.handleTap = function (event, context) {
    var gobj,
        change = {};  // the change for this gobj
    gobj = Object.getPrototypeOf(styleWidget).handleTap (event, context);
    if (gobj) {
      setTarget (gobj);
      if (!gobj.oldStyle) { // This is the first toggle for this object in the current formatting mode
        gobj.oldStyle = jQuery.extend (true, {}, gobj.style);
      }
      // We assume that all objects with "radius" and "width" style attributes already have explicit values. But path objects are assumed to be solid if they have no line-style value, so we check whether they have "path" genus.
      // We don't bother deleting this attribute if we reset it to solid.
      setPointStyle (currentPointStyle);
      setLineStyle (currentLineStyle, currentLineThickness);
      if (colorIndex >= 0) {
        setColor (colorIndex);
      } // colorIndex >= 0
      // A change record includes the gobj's id along with any gobj properties that have changed
      change.id = gobj.id;
      change.style = gobj.style;
      this.event({}, {action: 'changed', changes: [change]});
    } // if (gobj)
  };

  function highlightLineGrid (thickness, style) {
    var box = $('#lineStyleCheckbox')[0];
    var selStyle = $('#widget_lineStyleSelector')[0].style;
    if (thickness < 0 && style < 0) {
      check (box, false);
      selStyle.display = "none";
    }
    else {
      styleWidget.defaultLineThickness = thickness;
      styleWidget.defaultLineStyle = style;
      check (box, true);
      var row = thickness * 1.25 + 1.31;
      var column = style*3.2 + 0.31;
      selStyle.top=row + 'rem';
      selStyle.left = column + 'rem';
      selStyle.display='block';
    }
    setLineStyle (style, thickness, 'notify');  
  }

  function highlightPointGrid (style) {
    var box = $('#pointStyleCheckbox')[0];
    var selStyle = $('#pointStyleSelector')[0].style;
    if (style < 0) {
      check (box, false);
      selStyle.display = "none";
    }
    else {
      styleWidget.defaultPointStyle = style;
      check (box, true);
      var row = style * 1.25 + 1.31;
      selStyle.top=row + 'rem';
      selStyle.display='block';
    }
    setPointStyle (style, 'notify');
  }

  function highlightColorGrid (column, row) {
    var selStyle = $('#widget_colorSelector')[0].style;
    if (column < 0 || column >= numColorColumns) {
      selStyle.display = "none";
      check (styleWidget.objectColorBox, false);
      check (styleWidget.textColorBox, false);
      colorIndex = -1;
    }
    else { // highlight the choice, and check the object-color box if the text-color box isn't checked
      colorIndex = numColorRows * column + row;
      selStyle.top = (1.56 * row + 0.13) + 'rem';
      selStyle.left = (1.69 * column + 0.1)+'rem';
      selStyle.display = "block";
      styleWidget.defaultColor = {row: row, column: column};
      if (!styleWidget.textColorBox.checked)
        check (styleWidget.objectColorBox, true);
      if (targetGobj) {
        setColor (colorIndex, 'notify');
      }
    }
  }

/* `*****` VISIBILITY WIDGET ***** */
  /*  When this widget is active, it shows hidden objects in a faded color (normally gray), and visible objects in full color.
   *  The original object color and label color are cached during preprocessing for objects that were originally hidden, and
   *  colors are cached for originally-visible objects only if and when they are tapped to change them to hidden.
   *  Hidden geometric objects and buttons have to track both the object color and label color (if the label is visible).
   *  When the visibility of a text object (OR LABEL?) is toggled, it must set forceDomParse to regenerate the dom element.
   *  We also cache the original visibility of hidden objects (as originalHidden = true) to support a future cancel operation.
   *  Each gobj's style.newHidden flag is true if it's currently faded, and undefined or false otherwise.
   */
  
  function cacheColors (gobj) {
    var style = gobj.style;
    style.originalColor = style.color;
    if (style.label && style.label.color) {
      style.label.originalColor = style.label.color;
    }
  }

  function deleteFadeCache (gobj) {
    var style = gobj.style;
    if (style.faded)
      throw GSP.createError ("visibilityWidget deleteFadeCache() called for a faded object.");
    else if (style.originalColor) {
      delete style.originalColor;
      if (style.label && style.label.color) {
        delete style.label.originalColor;
      }
      delete style.faded;
    }
  }
  
  /* Can we make hidden gobjs glow by modifying the fade and unfade functions here?
   The code below tries (but fails) to do this.

  function fade (gobj) {
    var style = gobj.style;
    if (style.faded)
      throw GSP.createError ("visibilityWidget fade() called for an already-faded object.");
    else {
      if (!gobj.style.originalColor) 
        cacheColors (gobj);
      if (!style.faded) {
        style.color = visibilityWidget.visColor;
        if (style.label && style.label.color) {
          style.label.color = visibilityWidget.visColor;
        }
        setDomColor (style.color, gobj);
        this.setRenderState ('traceInOut'); 
        // style.faded = true;
        gobj.invalidateAppearance ();
      }
    }
  }
  
  function unfade (gobj) {
    var style = gobj.style;
    if (!style.originalColor || !style.faded)
      throw GSP.createError ("visibilityWidget unfade() called for an object that isn't faded.");
    else {
      style.color = style.originalColor;
      if (style.label && style.label.color) {
        style.label.color = style.label.originalColor;
      }
      setDomColor (style.color, gobj);
        this.setRenderState ('none'); 
      // style.faded = false;
      gobj.invalidateAppearance ();
    }
  }
  End of trial code */

  function fade (gobj) {
    var style = gobj.style;
    if (style.faded)
      throw GSP.createError ("visibilityWidget fade() called for an already-faded object.");
    else {
      if (!gobj.style.originalColor) 
        cacheColors (gobj);
      if (!style.faded) {
        style.color = visibilityWidget.visColor;
        if (style.label && style.label.color) {
          style.label.color = visibilityWidget.visColor;
        }
        setDomColor (style.color, gobj);
        style.faded = true;
        gobj.invalidateAppearance ();
      }
    }
  }
  
  function unfade (gobj) {
    var style = gobj.style;
    if (!style.originalColor || !style.faded)
      throw GSP.createError ("visibilityWidget unfade() called for an object that isn't faded.");
    else {
      style.color = style.originalColor;
      if (style.label && style.label.color) {
        style.label.color = style.label.originalColor;
      }
      setDomColor (style.color, gobj);
      style.faded = false;
      gobj.invalidateAppearance ();
    }
  }

  visibilityWidget.preProcessSketch = function() {
    getSketch().sQuery("*").each (function () {
      if (this.style.hidden === "byUser" || this.style.hidden && TOOLS && TOOLS.checkDebugMode()) {
        this.wasHidden = this.style.hidden;
        this.show();  // Need to show first, so the node exists before we try to fade it.
        // this.sQuery.sketch.constrainAndRedraw (); // MOVE THIS OUTSIDE OF THE .each
        fade (this);
      }
    });
    getSketch().constrainAndRedraw();
  };
  
  visibilityWidget.postProcessSketch = function() {
    getSketch().sQuery("*").each (function () {
      var style = this.style;
      if (style.faded) {
        this.hide (this.wasHidden || "byUser");
        unfade (this);
      }
      deleteFadeCache (this);
      Object.getPrototypeOf(visibilityWidget).postProcessGobj (this);
      if (this.wasHidden) {
        delete this.wasHidden;
      }
    });
  };

/*
  visibilityWidget.preProcessGobj = function (gobj) {
    if (gobj.style.hidden === "byUser" || gobj.style.hidden && TOOLS && TOOLS.checkDebugMode()) {
      gobj.wasHidden = gobj.style.hidden;
      gobj.show();  // Need to show first, so the node exists before we try to fade it.
      gobj.sQuery.sketch.constrainAndRedraw ();
      fade (gobj);
    }
    Object.getPrototypeOf(visibilityWidget).preProcessGobj (gobj);
  };

  visibilityWidget.postProcessGobj = function (gobj) {  // if visibility is changed, return the change
    // return true if the gobj's visibility has changed
    var style = gobj.style,
        isHidden,
        retVal;
    if (style.faded) {
      gobj.hide(gobj.wasHidden || "byUser");
      unfade (gobj);
      isHidden = true;
    }
    deleteFadeCache (gobj);
    retVal = gobj.style.hidden && !gobj.wasHidden || !gobj.style.hidden && gobj.wasHidden;
    Object.getPrototypeOf(visibilityWidget).postProcessGobj (gobj);
    if (gobj.wasHidden) {
      delete gobj.wasHidden;
    }
    return retVal;
  };
*/

  visibilityWidget.handleTap = function (event, context) {
    // In debug mode, need to add some way for the user to hide an object in either mode (hidden byUser or hidden true)
    // and some way of distinguishing each type of hidden object from its appearance.
    var gobj = Object.getPrototypeOf(visibilityWidget).handleTap (event, context),
        change = {};
    if (gobj) {
      if (!gobj.style.faded) { // faded is false or undefined, so fade a visible object
        fade (gobj);
      } else {  // faded must be defined and true
        unfade (gobj);
      }
      //if (!context.noHideShow) {
      //  this.hideShow({event: event, context: context});
        // $("#wVisibilityPrompt").css("display", "none"); // replace with a call to hideShow().
      //}
      // Send a change record including the gobj's id and style
      change.id = gobj.id;
      change.style = gobj.style;
      this.event({}, {action: 'changed', changes: [change]});
    }
  };

  visibilityWidget.setVisColor = function (sketch) {
    // Set the visColor to contrast with the background by adjusting each background color value toward the furthest extreme.
    var hsColor = 'rgb(192,192,192)'; // default in case the color check fails
    var bkColor = sketch.preferences.colorableComponents.Background.color;  // bkColor may be a color name ("white"), various forms of rgb, or perhaps even "0xffc0d0".
    if (bkColor)  { // Use getComputedStyle on a browser element to convert the unknown form of the color to rgb.
      var d = document.createElement("div");
      d.style.color = bkColor;
      var rgbColor = window.getComputedStyle(d).color;
      if (rgbColor.substring(0,3) === 'rgb') {
        var a = rgbColor.split("(")[1].split(")")[0]; // grab the part in the parens
        a = a.split(","); // split it into separate numbers
        hsColor = 'rgb(';
        for (var i=0; i<3; i++) {
          if (a[i] < 0x80)
            hsColor += (a[i] +0x40);  // dark background colors must be lightened more to be distinguishable
          else
            hsColor += (a[i] - 0x20); // light backgrounds only need to be darkened half as much.
          if (i<2)
            hsColor += ',';
        }
        hsColor += ')';
      }
    }
    visibilityWidget.visColor = hsColor;
  };
 

/* ***** LABEL WIDGET ***** */

  labelWidget.init = function() {
    // define the label widget's controls
    this.inputElt = $('#wLabelEditText');
    this.showLabelElt = $('#wLabelShow');
    this.sizeElt = $('#wLabelFontSize');
    this.fontElt = $('#wLabelFont');
    this.sizeSel = $('select.labelFontSize');
    labelWidget.inputElt.on("click", function () {
      $(this).trigger('focus');  // On a mobile device, a click in the text box should bring up the keyboard.
    });
  };
  
  labelWidget.prepShow = function () {
    this.cancelOnExit = false;
    this.prevGobj = null;
    $('#wLabelWidget').css ("display", "none");
    // this.clear ();
    return true;
  };
  
  // postProcessSketch() is called when the widget is deactivated, and hidden() is called
  // whenever the widgetPrompt or widgetPane is hidden. 
  labelWidget.postProcessSketch = function () {
    if (targetGobj) {
      targetGobj.setRenderState ("none");
      if (this.cancelOnExit) {
        this.restoreLabel (targetGobj);
      } else {
        this.confirmLabel ();
      }
      setTarget(null);  // targetGobj can't hang around; it might not even exist any more
    }
    this.clear ();
    this.cancelOnExit = false;    
  };
  
  labelWidget.hidden = function (hiddenClass) {
    // We need to postProcess only when hiding the widgetPane, not the widgetPrompt
    if (hiddenClass === 'widgetPane') {
      this.postProcessSketch();
    }  
  };

  labelWidget.shown = function () {
    if (this.inputElt.is(':visible')) {
      this.inputElt.trigger('focus');
    }
  };

  function savePool () {
    getSketch().labelPool.saveState();
    labelWidget.labelPoolSaved = true;
  }
  
  function restoreSavedPool () {
    if (labelWidget.labelPoolSaved) {
      getSketch().labelPool.restoreSavedState();
      labelWidget.labelPoolSaved = false;
    }
  }
  
  function forgetSavedPool () {
    if (labelWidget.labelPoolSaved) {
      targetSketch.labelPool.forgetSavedState();
      labelWidget.labelPoolSaved = false;
    }
  }

  function setLabelInput (text) { // sets, focuses, and selects the label input field
    var inputElt = labelWidget.inputElt;
    if (typeof text === "string") {
      inputElt.val(text);      
      inputElt.html(text);      
    }
    inputElt.trigger('focus');
    // select() doesn't select text in ios, so we use setSelectionRange. See http://stackoverflow.com/a/7436574
    inputElt[0].setSelectionRange(0, inputElt.val().length);
  }

  function generateNewLabel (gobj) {  // handles measures and (transformed images using manual)
    var labelStyle = gobj.style.label,
        wasShowing = labelStyle.showLabel,
        gobjSketch = gobj.sQuery.sketch,
        newLabel;
    savePool ();
    if (gobj.hasLabel) {
      labelStyle.showLabel = true; // Some gobjs (e.g., paths) need this to generate a label.
    }
    newLabel = gobjSketch.labelPool.generateLabel(gobj.kind, gobj.genus);
    if (gobj.hasLabel) {
      gobj.setLabel(newLabel, { showLabel: wasShowing, wasUserInitiated: true });
      invalidateLabel(gobj);
    } else {
      gobj.label = newLabel;
    }
    setLabelInput (newLabel); // Make the input field match the label
  }
    
  function normalizeFontFamily (gobj) { // checks the font-family of prop, converting to string if it's numeric. Returns the full font-family
    var sketch = gobj.sQuery.sketch,
        prop = fontProperty (gobj),
        font = prop["font-family"];
    if (typeof font === "number") {
      if (font >= sketch.document.resources.fontList.length)
        font = 0;
      font = sketch.document.resources.fontList [font];
      prop["font-family"] = font;
    }
    return font;
  }
  
  // The label widget caches properties of the currently-targeted gobj to restore them if the user cancels.
  labelWidget.cacheProperties = function (gobj) {
    this.oldLabel = (gobj.genus === "Caption") ? gobj.textMFS : gobj.label;
    this.oldAutogenerate = gobj.shouldAutogenerateLabel;
    normalizeFontFamily (gobj);
    this.oldStyle = $.extend (true, {}, gobj.style);
  };

  labelWidget.emptyCache = function () {  // Empty the cache
    delete this.oldLabel;
    delete this.oldAutogenerate;
    delete this.oldStyle;
  };
  
  labelWidget.setAction = function (newAction) {   // Track specific actions to describe them in LabelWidget events.
    // We track only those worth communicating to a user or other watcher.
    // The current action is reset to '' whenever an event is posted
    this.prevAction = '';
    this.prevAction = this.action;
    this.action = newAction;
  };

  labelWidget.clear = function (clearStyles) {
    this.emptyCache ();
    forgetSavedPool ();
    setLabelInput ("");
    $("#measureButtons, #transImageButtons, #paramButtons").toggle (false);
    if (clearStyles !== false) {  // By default, clear the label's font, size, and visibility
      labelWidget.sizeElt.val ("");
      labelWidget.fontElt.val ("");
      labelWidget.showLabelElt.prop ("checked", false);
    }
  };
  
  labelWidget.finalizeLabel = function () {
    // Make sure the label and nameOrigin of the previous target are compatible,
    // and emit an event if appropriate. The event includes some or all of these
    // changed properties:
    // text (the label or text,
    // styleJson (stringified), and
    // autoGenerate (for shouldAutogenerateLabel).
    var properOrigin, text, attr,
        gobj = targetGobj;
    if (!gobj) {
      return;
    }
    attr = {action: 'Finalized'};
    text = (gobj.genus === "Caption") ? gobj.textMFS : gobj.label;
    if (text !== this.oldLabel) {
      attr.text = text;
    }
    if (this.oldAutogenerate !== gobj.shouldAutogenerateLabel) {
      attr.autoGenerate = gobj.shouldAutogenerateLabel;
    }
    if (!GSP.deepEquals (this.oldStyle.label, gobj.style.label)) {
      attr.labelStyleJson = JSON.stringify(gobj.style.label);
    }
    if (gobj.hasLabel && gobj.style.nameOrigin) {
      // The following check applies only to geometric objects with labels and nameOrigins
      properOrigin = LabelControls.originFromText (gobj.label); // User may have set origin to manual while label is still in the form corresponding to a particular origin.
      if (properOrigin && gobj.style.nameOrigin !== properOrigin) {
        gobj.style.nameOrigin = properOrigin;
        attr.nameOrigin = properOrigin;
      }
    }
    this.event({}, attr);
    this.emptyCache();
  };
  
  labelWidget.restoreLabel = function (gobj) {  // Restore the label and style of the dest, and empty the cache.
    if (gobj) {
      if (gobj.style) { // restore style first, before resetting the label
        gobj.style = $.extend (true, {}, labelWidget.oldStyle);
      }
      if (gobj.genus === "Caption") {
        gobj.textMFS = labelWidget.oldLabel;
        delete gobj.label;
      } else if (!labelWidget.oldLabel) {
        delete gobj.label;
        gobj.shouldAutogenerateLabel = labelWidget.oldAutogenerate;
      } else {
        // Call changeText() to restore the old label. But first, make sure gobj.label is different from oldLabel.
        // Otherwise changeText() will think there's nothing to do.
        gobj.label = labelWidget.oldLabel ? "" : " ";
        changeText (targetGobj, labelWidget.oldLabel, gobj.style.nameOrigin);
        gobj.shouldAutogenerateLabel = labelWidget.oldAutogenerate;
      }
      restoreSavedPool ();
      invalidateLabel (gobj, 'Restored ');
    }
    this.emptyCache ();
  };
  
  function getNameClass (gobj) { // Set labelWidget.nameClass to "measure", "param", "transImage", or "".
    // The nameClass determines which radio buttons appear and which state machine to use. 
    // measureStyle applies to measurements and calculations (both of which can use auto), but not parameters 
    // (which are only manual or none), 
    // Calculation: kind=Expression; genus===ScalarMeasure, genus===DistanceMeasure, or genus===AngleMeasure
    // Measurement: kind=Measure, genus===ScalarMeasure, genus===DistanceMeasure, or genus===AngleMeasure
    // Parameter: kind=Expression, genus===ScalarParameter, genus===DistanceParameter, or genus===AngleParameter
    var nameClass = "";
    if (gobj.genus.includes("Measure"))
      nameClass = "measure";
    else if (gobj.genus.includes("Parameter"))
      nameClass = "param";
    else if (gobj.useTransformLabel && gobj.useTransformLabel ())
      nameClass = "transImage";
    return nameClass;
  }

  function invalidateLabel (gobj, action) {
    // The content or appearance of the text or label has been changed. Update the screen by modifying the DOM node and/or the sketch's renderRefCon
    // The action parameter is a string to describe the action to a user; the string will be prepended to "label of point A" (e.g.)
    // Unlike most widget functionality, WIDGETS.invalidateLabel() may be called externally, so we explicitly pass attr.gobjId
    // when we call event().
    // Related, perhaps this function should be moved into core code.
    var gobjNode = $targetNode.find ("[wsp-id='" + gobj.id +"']"),
        font = fontProperty (gobj)["font-family"],
        size = fontProperty (gobj)["font-size"],
        color = fontProperty (gobj).color,
        sketch = gobj.sQuery.sketch,
        refCon = sketch.renderRefCon,
        gobjStyles = gobj.hasLabel ? refCon.label [gobj.id] : refCon.gobj [gobj.id],
        gobjCSS,
        refRect;
    gobj.parsedMFS = null;  // force reparsing of mfs
    if (gobj.hasLabel) { // This gobj is on the canvas, so set the refcon
      assert (gobjStyles, "invalidateLabel passed a labeled gobj with no renderRefCon.label");
      gobjStyles["font-family"] = font;
      gobjStyles["font-size"] = size;
      refRect = refCon.labelBounds [gobj.id];
      if (refRect)
        sketch.invalidateRect (refRect);
      gobj.state.labelPreRenderJITPrepareDone = false;
      gobj.labelPreRenderJITPrepare (sketch.dcForGObjLabel(gobj, "normal"), sketch.renderRefCon.label[gobj.id]);
    } else { // This gobj is in the DOM.
      gobjCSS = gobjStyles.css;
      gobjStyles = gobjStyles.baseStyles;
      assert (gobjNode.length === 1, "invalidateLabel should find a single matching node.");
      gobjCSS["font-family"] = font;
      gobjCSS["font-size"] = size;
      gobjCSS.color = color;
      gobjStyles["font-family"] = font;
      gobjStyles["font-size"] = size;
      gobjStyles.color = color;
      gobjNode.css ({"font-size": size, "font-family": font});
      // Descendants sometimes have their own font-family style, but likely not font-size. Because some descendants (e.g., subscripts and superscripts) may have "font-size: smaller;", we only set font-family (not font-size) in descendants
      $(gobjNode).find ('[style*="font-family"]').css ("font-family", font);
      gobj.state.forceDomParse = true;  // forceParse rebuilds the DOM element from the parsedMFS
      gobj.descendantLabelGraphHasChanged (); // Need to call this if we're not calling setLabel()
      labelWidget.showLabelElt.prop ("checked", gobj.style.nameOrigin !== "none");
    }
    gobj.invalidateAppearance();
    labelWidget.event({},
      {action: action, gobjId: gobj.id, label: gobj.label, labelStyle: gobj.style.label, labelSpec: gobj.labelSpec}
    );
  }
  
  function changeText (gobj, newText, newOrigin) {  // Respond to a user's change of the gobj's text or nameOrigin. Return the resulting text.
    // Most callers pass targetGobj, but making the gobj an explicit param allows external callers to access this logic.
    var newTextEmpty = !newText || newText === "",
        ignoreOrigin = gobj.style.nameOrigin === undefined || newOrigin === gobj.style.nameOrigin;
        // ignore newOrigin if the gobj doesn't have one, or if newOrigin matches the stored origin
        
    function changeButtonText () {
      // Ideally, we could show two radio buttons, labeled Auto and Manual, for Move and Animate buttons that auto-generate their labels.
      // This is overkill for a feature of little significance. Instead, just turn off the shouldAutogenerateLabel flag if it exists.
      assert (!newOrigin, "A button or function shouldn't have a nameOrigin.");
      if (gobj.shouldAutogenerateLabel) {
        gobj.shouldAutogenerateLabel = false;
      }
      if (newTextEmpty ) {  // The user has deleted the button's label, which is disallowed, so show a single selected space for the time being.
        newText = " ";    // their names cannot be hidden, so if the user deletes the label text it should be replaced by a single-space string, selected.
        setLabelInput (newText);
      }
      gobj.label = newText;
      if (gobj.messages)
        gobj.messages = []; // Eliminate a button's ability to respond to changes in parental labels.
    }

    function changeCaptionText () {
      gobj.label = newText;
      newText = newText.replace (/'/g, "\\'");
      gobj.textMFS = "<VL<T'" + newText + "'>>";
    }
    
    if (!newText)
      newText = "";
    if (gobj.label === newText && ignoreOrigin)
      return newText; // Text hasn't changed, so nothing to do.

    if (newTextEmpty)   // if newText is empty and it came from the label pool, restore the pool
      restoreSavedPool ();
    if (newOrigin)
      gobj.style.nameOrigin = newOrigin;
    if (gobj.hasLabel) {    // geometric objects live on the canvas layers
      gobj.shouldAutogenerateLabel = ["prime", "shortFn", "fullFn", "auto"].includes (newOrigin);
      if (newTextEmpty) // Cannot set label to empty string
        newText = gobj.label;
      gobj.setLabel(newText, {show: (newTextEmpty ? false : true), wasUserIntiated: true});
      labelWidget.showLabelElt[0].checked = newTextEmpty ? false : true;
      newText = gobj.label; // setLabel() constrains the label, which may change it.
    }
    else {  // !hasLabel, so this is a button, a measure, a calculation, or a caption.
      if (gobj.isOfKind("Button") || gobj.isOfGenus("Function")) {
        changeButtonText ();
      } else if (gobj.genus === "Caption") {
        changeCaptionText ();
      } else {  // A measure or calculation, so nameOrigin is one of [auto, manual, none]
        if (newOrigin === "manual") {
          if (newTextEmpty) { // Can't set a label to the empty string.
            generateNewLabel (gobj);
            newText = gobj.label;
          } else {
            gobj.label = newText;
          }
        }
      }
    } // !hasLabel
    invalidateLabel (gobj, 'Changed');
    return newText;
  }  // changeText

  /* handleTap() is the workhorse of the label widget, controlling the following behavior.
   * Showing and hiding labels:
   *    Tapping an object always shows or hides its label.
   *    Tapping a label copies the label settings (size, font & notation) into the dialog if they differ from current dialog choices
   *    Tapping a label hides the label only if the label settings match.
   *    The user can reformat multiple labels,by tapping them in turn. If she accidentally hides one (because its settings
   *    match the dialog box) she can show it again by tapping the object or pressing the Show label checkbox.
   * The notation radio buttons appear when the user taps a transformed image, and follow the same rules.
   * Tapping a caption allows the user to edit the caption.
   * Tapping hot text or pegged text disables the label-edit input field
   */
  labelWidget.handleTap = function (event, context) { // cache label info to enable restoring it if user cancels
    var $inputElt = labelWidget.inputElt,
        $showElt = labelWidget.showLabelElt,
        $sizeElt = labelWidget.sizeElt,
        $sizeSel = labelWidget.sizeSel, // font size select
        $fontElt = labelWidget.fontElt,
        position = GSP.GeometricPoint (context.position.x, context.position.y),
        newTarget = Object.getPrototypeOf(labelWidget).handleTap (event, context),
        canEdit = true,
        action;
    labelWidget.touchPos = position;
    labelWidget.isTap = true;

    function initForNewGobj () {      //  Handle the first tap on the current gobj or label
      var toGobj, fromGobj, copyStyle, editingDisabled, //source and dest for copying font, size, & nameOrigin
          needsLabel,
          ret = 'Tapped';  // Will be prepended to " label of Point A" in a user message.

      function handleTransformedImageLabel(destGobj, newOrigin) {
            
        function makeLabel(gobj) { // gobj is not yet labeled, so label its pre-image chain and then gobj
          var source = GSP._get(gobj, 'parents.source'),
              origin = GSP._get(gobj, 'style.nameOrigin'),
              sourceVisible = GSP._get(source, 'style.label.showLabel'),
              option;
          if (!source) { // gobj is the first pre-image: generate a label if needed; no need to set the nameOrigin
            if (!gobj.label) {
              gobj.setLabel(gobj.sQuery.sketch.labelPool.generateLabel(gobj.kind, gobj.genus), { showLabel: false });
              gobj.style.nameOrigin = origin || 'manual';
            }
            return;
          } else {  // the source doesn't yet have a label
            origin = origin || 'prime'; // missing origin defaults to prime
            if (!source.label && (origin.match(/prime|fullFn|shortFn/))) { // source is unlabeled and gobj's origin requires a label 
              makeLabel(source);  // recurse to generate source label
            }
          }
          if (gobj === targetGobj) {
            origin = newOrigin;
            option = {show: true};
          }  else {
            origin = GSP._get(gobj, 'style.nameOrigin') || 'prime';
            option = {create: true};
          }
          gobj.label = gobj.makeParentalLabel(origin, option);
          GSP._put(source, 'style.label.showLabel', sourceVisible);
          gobj.style.nameOrigin = origin;
        }
        
        if (!destGobj.label) {
          makeLabel(destGobj);
        }
      }
        
      function showRadios () {  // Show or hide the radios panel based on the target's nameClass, and (if showing) set them based on copyStyle
        //  While we're at it, check the targetGobj to see if we should modify its nameOrigin or label.
        //  If copyStyle is true and this.prevGobj's nameClass is the same as targetGobj's, we're setting the radios (and the nameOrigin of the targetGobj) from this.prevGobj.
        //  Otherwise we're setting the radios from targetGobj
        var sourceGobj, // the gobj that determines the nameOrigin settings: either toGobj or fromGobj
            nameClass = labelWidget.nameClass,
            textRule = {},  // determine default text from the origin
            originRule = {};  // determine origin from the text

        function makeTransRules () {  // create the rules connecting a transformed image's label to its nameOrigin
          var prime, shortFn, fullFn, preImage;
          
          function makeLabel (nameOrigin) {
            // Create labels only if this the current nameOrigin or (the parent is unlabeled and toGobj isn't manual
            var option = {init: true};
            if (toGobj.style.nameOrigin === nameOrigin || (!preImage.label && toGobj.style.nameOrigin !== "manual"))
              option.create = true;
            return toGobj.makeParentalLabel (nameOrigin, option);
          }
          
          if (toGobj.isTransformationConstraint || toGobj.state.labelParent) {
            preImage = toGobj.isTransformationConstraint ? toGobj.parents.source : toGobj.state.labelParent;
            // There's no need for transRules if preImage is unlabeled.
            if (!preImage.label) {
              return;
            }
            prime = makeLabel ("prime");
            shortFn = makeLabel ("shortFn");
            fullFn = makeLabel ("fullFn");
          }
          originRule[prime] = "prime";
          originRule[shortFn] = "shortFn";
          originRule[fullFn] = "fullFn";
          originRule["*"] = toGobj.label ? "manual" : "prime";
          textRule.prime = prime;
          textRule.shortFn = shortFn;
          textRule.fullFn = fullFn;
          textRule.manual = toGobj.label ? toGobj.label : prime;
          if (toGobj.label) { // Make toGobj's nameOrigin agree with its label
            toGobj.style.nameOrigin = originRule[toGobj.label] || "manual";
          } else {  // No label, no nameOrigin
            toGobj.label = prime;
            toGobj.style.nameOrigin ="";  // Set no default here, 
          }
        }
  
        function makeMeasureRules () {
          textRule = {auto: "", none: "", manual: "*"}; 
          originRule = {" ": "none", "*": "manual"};
        }
        
        // Copy the radio settings from prevGobj only if copyStyle is true and the nameClass matches
        sourceGobj = copyStyle && (getNameClass (fromGobj) === nameClass) ? fromGobj : toGobj;
        $(".wLabelRadios").toggle (false);
        if (nameClass) {
          $("#" + nameClass + "Buttons").toggle (true);
          switch (nameClass) {
            case "transImage":
              makeTransRules ();
              /*  the radio buttons are not sticky; they always show the nameOrigin of the new gobj.
              if (labelWidget.handleTap && sourceGobj &&
                  getNameClass (sourceGobj) === nameClass &&
                  sourceGobj.style.nameOrigin !== "manual") { // don't switch toGobj to manual label
                toGobj.style.nameOrigin = sourceGobj.style.nameOrigin;
              }
              */
              break;
            case "measure":
            case "param":
              makeMeasureRules ();
              break;
            default:
          }
          LabelControls.init (nameClass, targetGobj, WIDGETS.controlCallback, textRule, originRule, "#wLabelEditText", "#" + nameClass + "Buttons input[type='radio']", "#wLabelShow");
        }
        else {
          LabelControls.terminate (); // Make sure the state machine doesn't hang around
        }
      } // showRadios
  
      function copyStylesToGObj () {  // Copy the dialog box font and size choices to the tapped object
        var aValue = $sizeElt.val ();
        if (aValue) labelWidget.setFontSize (aValue);
        aValue = $fontElt.val ();
        if (aValue) labelWidget.setFont (aValue);
      }

      function checkFontList (shortName) {  // check the item in the font combo box, returning false if not found 
        var i, retVal = false;
        for (i = 0; i < $fontElt[0].length; i++) {
          if ($fontElt[0][i].innerText === shortName) {
            $fontElt[0].selectedIndex = i;
            retVal = true;
            break;
          }
        }
        return retVal;
      }

      function addFontToList (longName, shortName) {  // add a new font to the combo box. 
        var groups = $("#wLabelFont optgroup"),
            newItem = "<option value='" + longName + "'>" + shortName + "</option>",
            sans = groups.filter ('[label="Sans Serif"]'),
            serif = groups.filter ('[label="Serif"]'),
            mono = groups.filter ('[label="Mono-spaced"]'),
            other = groups.filter ('[label="Other"]'),
            finished = false,
            i, matchGroup, members;
        if (longName.search (/sans-serif/i)) {
          matchGroup = sans;
        } else if (longName.search (/serif/i)) {
          matchGroup = serif;
        } else if (longName.search (/monospace/i)) {
          matchGroup = mono;
        } else if (other.length) {
          matchGroup = other;
        } else {  // Need to add the Other group
          matchGroup = $fontElt.append ('<optgroup label="Other"></optgroup>');
        }
        members = $(matchGroup).find("option");
        for(i=0; i<members.length; i++) {
          if (shortName.localeCompare (members[i].innerText) === -1) {
            $(members[i]).before ($(newItem));
            finished = true;
            break;
          }
        }
        if (!finished) {
          matchGroup.append (newItem);
        }
      }
          
      function copyGObjToStyles () {  // Copy the tapped object's font and size to the dialog box styles
        var textStyle = fontProperty (targetGobj),
            fontSize = textStyle["font-size"],
            fontName = getShortFontName (targetGobj, false),
            $sizeOptions = $sizeSel.find('option');
            
        function addFontSizeIfMissing(size) {
          var $newOption = $("<option></option>").val(size).text(size.toString());
          $sizeOptions.each(function(ix) {
            if (+this.value === size) {
              return false;
            } else if (+this.value > size) {
              $(this).before($newOption); // insert this custom size
              return false;
            } else if (ix + 1 === $sizeOptions.length) {
              $(this).after($newOption); // add custom size at end.
            }
          });
        }
        
        $sizeElt.val (fontSize);
        addFontSizeIfMissing(+fontSize);
        $sizeSel.val(fontSize); // This also sets selectedIndex
        fontName = getShortFontName (targetGobj, false);
        $fontElt[0].selectedIndex = -1;
        if (!fontName) {
          throw GSP.createError ("WIDGETS.copyGObjToStyles() found a gobj without a font family.");
        }
        if (!checkFontList (fontName)) {
          addFontToList (textStyle["font-family"], fontName);
          checkFontList (fontName);
        }
      }
      
      function copyCompatible (src, dest) {
        var retVal;
        // "Compatible" means both must exist and have the same hasLabel value
        retVal = src && dest && (src.hasLabel === dest.hasLabel);
        // Further, they must be hasLabel objects or be of compatible kinds, which for now means either the same kind or both being measures (parameters, measures, expressions)
        retVal = retVal && (dest.hasLabel || src.kind === dest.kind || src.isOfKind ("Measure") && dest.isOfKind ("Measure"));
        // if both have the same labelStyle, they should not be copied
        retVal = retVal && !GSP.deepEquals(src.style.label, dest.style.label);
        // Finally, one of these conditions must hold: the tap is a labelTap, the toGobj doesn't have a label, or the toGobj's label is hidden.
        retVal = retVal && (labelWidget.isTap || (dest.hasLabel && !dest.label) || !dest.style.label.showLabel);
        return retVal;
      }
      
      function extractCaptionText () {
        var mfs = newTarget.textMFS,
            matches = mfs.match (/<T\'[^\'\r\n]+\'>/g),
            newText = "",
            i;
        for (i=0; i<matches.length; i++) {
          if (newText)
            newText += " ";
          newText += matches[i].replace (/<T\'([^\'\r\n]+)\'>/,"$1");
        }
        return newText;
      }
    
      //  initForNewGobj() body
      editingDisabled = false;
      if (newTarget.genus === "Caption" && !newTarget.label) {  // Use single-line caption's label field to store the new text
        newTarget.label = extractCaptionText ();
      } else if (newTarget.genus === "CompositeText") { // disable label edit and its label legend
        editingDisabled = true;
      }
      $("#wLabelEditText").prop ("disabled", editingDisabled);
      $("#wLabelEditLabel").prop ("disabled", editingDisabled);
      
      if (newTarget.hasLabel || newTarget.style.nameOrigin) { // all gobjs with nameOrigin can have "None" as an origin
        $("#wShowLabelButton label").show();
      } else {
        $("#wShowLabelButton label").hide();
      }
      toGobj = newTarget;
      fromGobj = targetGobj;  // the previous targetGobj  
      copyStyle = copyCompatible (fromGobj, toGobj);
      labelWidget.clear (false);  // initialize controls and clear cache
      if (targetGobj) {
        targetGobj.setRenderState ("none");
      }
      newTarget.setRenderState ("targetHighlit");
      labelWidget.prevGobj = targetGobj;
      setTarget (newTarget);
      labelWidget.nameClass = getNameClass (targetGobj);
      labelWidget.cacheProperties (targetGobj);
      /* Label size and offset will be initialized by labelPreRenderJITPrepare
      if (toGobj.hasLabel && !toGobj.style.label.showLabel) { // Need to prepare label position for a label being shown the first time.
        toGobj.labelRenderBounds = copyRect (toGobj.sQuery.sketch.renderRefCon.labelBounds[toGobj.id]);
        toGobj.setLabelPosition (labelWidget.touchPos, {x:-6, y:-6}); // Offset the label down and right from the tap.
      }
      */
      if (targetGobj.isTransformationConstraint) {
        handleTransformedImageLabel(targetGobj, 'prime');
      }
      needsLabel = (!toGobj.label && (!toGobj.style.nameOrigin || toGobj.style.nameOrigin === "manual")) ||
                    toGobj.label && toGobj.label.match(/_manual_/);
      if (needsLabel) {
        if (toGobj.isOfGenus('Path')) { // set labelParam to indicate where the label should appear.
          toGobj.style.label.labelParam = toGobj.mapPositionToPathValue(position);
          toGobj.labelSpec.location = GSP.GeometricPoint(position);
        }
        generateNewLabel (toGobj);
        // toGobj.setLabelPosition(position, GSP.GeometricPoint(0, 0));  // TODO: Figure out how to set labelCornerDelta.
        ret = 'Generated';
      }
      setLabelInput (targetGobj.label);
      if (copyStyle) {  // Apply font and size to the newly tapped gobj
        copyStylesToGObj ();
      } else {  // Fill the style elements from the new gobj
        copyGObjToStyles ();
      }
      showRadios ();  // show or hide nameOrigin controls
      return ret;
    }  // initForNewGobj

    function handleLabeledGObj (action) { // If this object has (or can have) a label, track its settings
      // show newTarget if no previous target exists or previous target label is hidden
      var doShow = !labelWidget.prevGobj || GSP._get(labelWidget.prevGobj, 'style.label.showLabel') !== false;
      $showElt.prop ("disabled", false);
      toggleLabel (doShow, action);
      $showElt.prop ("checked", doShow);
    }
        
    function handleTextGObj () { // targetGobj.hasLabel is undefined, so it's a button or text
      var nameOrigin = targetGobj.style.nameOrigin,
          isButton = targetGobj.isOfKind("Button"),
          isMeasure = labelWidget.nameClass === "measure" || labelWidget.nameClass === "param",
          showDisabled = (isButton || typeof nameOrigin === 'undefined'),
          showChecked = (showDisabled || nameOrigin === 'manual');
      if (isButton) {
        $showElt.prop ("checked", showChecked);
        $showElt.prop ("disabled", showDisabled);
      } else if (isMeasure) {
        $("#wLabelWidget .radio-inline input").prop("checked", false);
        $("#wLabelWidget .radio-inline input[value='" + nameOrigin + "']").prop("checked", true);
        $showElt.prop ("checked", nameOrigin !== "none");
        $showElt.prop ("disabled", false);
      }
    }
    
    function singleLineCaption (mfs) {
      var matches = mfs.match (/<VL<T\'.*\'>>/);
      if (!matches)
        matches = mfs.match (/<T\'.*\'>/);
      return matches ? true : false;
    }

    // Main body of labelWidget.handleTap ()
    if (!newTarget.canEditLabel()) {
      // The Label Widget can edit single-line captions, and can change the size and style of non-editable text
      // (including CompositeText objects and multi-line captions)
      if (newTarget.kind !== 'Text') {
        return;
      }
      // if newTarget isn't a single-line caption, disable (hide?) the edit control
      if (newTarget.genus !== "Caption" || !singleLineCaption (newTarget.textMFS)) {
        canEdit = false;
      }
    }
    $('.labelEdit').toggle(canEdit);
    if (newTarget === targetGobj) { //this is a repeat tap: toggle if hasLabel
      if (targetGobj.hasLabel) {
        toggleLabel ();
        setLabelInput (targetGobj.label);
      }
      labelWidget.isTap = false;
      return;
    }
    // Tap is on a new object.
    labelWidget.finalizeLabel(); // finalize the current target before switching to the new one
    action = initForNewGobj();
    if (targetGobj.hasLabel) {
      handleLabeledGObj (action);
    } else { 
      handleTextGObj ();
    }

    $inputElt.on("keyup", function (e) {
      e.stopPropagation();
      if (e.keyCode === 13) {
        WIDGETS.confirmModality();
      }
      else if (e.keyCode === 27) {
        WIDGETS.cancelModality();
      }
      else {
        var newLabel = $inputElt.val();
        if (newLabel.length > 0) {
          changeText (targetGobj, newLabel);
        } else if (targetGobj.isOfKind("Button")) {
          setLabelInput(" ");
        }
      }
    });
    labelWidget.isTap = false;
  };    // labelWidget.handleTap

  function assert (condition, text) {
    if (!condition) {
      if (!text) text = "Unidentified error";
      //alert (text);
      console.log( text );
    }
  }
  
  function toggleLabel (show, action) { // Toggle the visibility of this label and set checkbox
    // Possible actions (to be passed to invalidateLabel) are none, Generated, Showed, Hid, Changed, etc.
    var gobj = targetGobj,
        labelCornerDelta = {},
        touch = labelWidget.touchPos,
        labelStyle = gobj.style.label,
        prevState = labelStyle && labelStyle.showLabel;
    if (gobj.hasLabel && !gobj.label) { // If it's neither transformed nor labeled, just label it
      generateNewLabel (gobj);
      action = 'Generated';
    }
    if (show === undefined) {
      if (gobj.hasLabel) {
        show = !labelStyle.showLabel; // toggle the current setting
      } else if (labelWidget.nameClass && gobj.style.nameOrigin) {
        show = gobj.style.nameOrigin !== "none";
      }
      action = action || show ? 'Showed' : 'Hid';  // an already-defined action (e.g., 'Generated') may take precedence
    }
    if (gobj.hasLabel) {
      labelStyle.showLabel = show;
      if ((!action || action === 'Tapped') && prevState !== show) { // if state changed on a tap, prefer the specific action.
        action = show ? 'Showed' : 'Hid';
      }
      if (show && !prevState) {
        if (gobj.isAPath ())  { // If we've tapped a new location for the label, move it.
          if (!gobj.labelRenderBounds) {
            gobj.labelRenderBounds = copyRect (gobj.sQuery.sketch.renderRefCon.labelBounds[gobj.id]);
          }
          if (labelWidget.isTap) {
            labelCornerDelta.x = touch.x - gobj.labelRenderBounds.left;
            labelCornerDelta.y = touch.y - gobj.labelRenderBounds.top;
            action = action || 'Moved';
          }
        }
        if (labelWidget.isTap && gobj.state.labelPreRenderJITPrepareDone) {
          if (labelStyle.labelOffsetX) {
            labelCornerDelta = {x: -labelStyle.labelOffsetX + touch.x - gobj.labelSpec.location.x,
                    y: -labelStyle.labelOffsetY + touch.y - gobj.labelSpec.location.y};
          } else {
            labelCornerDelta = {x: labelStyle["font-size"], y: +labelStyle["font-size"]/2};
          }
          gobj.setLabelPosition (touch, labelCornerDelta);
          action = action || 'Modified';
        }
        if (labelWidget.inputElt[0].value === "") // if input is empty when we show a label, set the input to the label
          setLabelInput (gobj.label);
      }     
    } else if (labelWidget.nameClass && gobj.style.nameOrigin) {
      LabelControls.labelChanged (show ? gobj.label : "");
    }
    labelWidget.showLabelElt.prop ("checked", show);
    invalidateLabel (gobj, action);
  } // toggleLabel

  labelWidget.confirmLabel = function () {
    this.finalizeLabel ();
    this.clear ();
  };
  
  function copyRect (src, dest) {
    if (!dest) dest = {};
    dest.top = src.top;
    dest.bottom = src.bottom;
    dest.left = src.left;
    dest.right = src.right;
    return dest;
  }

  function fontProperty (gobj)  { // return the gobj property that contains its font-family and font-size
    var prop = gobj.style.label;
    if (!prop || $.isEmptyObject (prop))
      prop = gobj.style;
    return prop;
  }


  labelWidget.setFontSize = function (val) {  // Note val is a string.
    var textStyle = fontProperty (targetGobj);  
    val = +val;
    if (textStyle["font-size"] !== val) {
      textStyle["font-size"] = val;
      invalidateLabel (targetGobj, 'Set size for');
    }
  };

  function getShortFontName (gobj) {
    var aFont = normalizeFontFamily (gobj),
        startQuote;
    startQuote = aFont.substring (0, 1);  
    if (startQuote === "\"" || startQuote === "'") {  // if quoted, use only the first quoted portion
      aFont = aFont.split (startQuote)[1];
    } else if (aFont.indexOf (",")) {
      aFont = aFont.split (",")[0];
    }
    return aFont;
  }

  labelWidget.setFont = function (newFont) {  // newFont is a font name chosen from the label widget combobox.
    var textStyle = fontProperty (targetGobj),
        oldFont = textStyle ["font-family"];
    if (oldFont !== newFont) {
      textStyle["font-family"] = newFont;
      invalidateLabel (targetGobj, 'Set font for');
      //  Add this font to the fontList
    }
  };
  
  function getScriptPath () {
    var scripts, i, aScript, path;
    if (!scriptPath) {
      scripts = $.makeArray($("script[src]"));
      for (i=0; i<scripts.length; i++) {
        aScript = scripts[i];
        // is this the script element for "widgets.js" or "widgets-min.js"?
        if (aScript.src && (aScript.src.endsWith ('/widgets.js') || aScript.src.endsWith ('/widget-min.js'))) {
          path = aScript.src.split('?')[0].split('/').slice(0, -1).join('/')+'/'; // This is the full url. Is there any reason to optimize it if the first part of it matches the site url? Probably not.
          scriptPath = path;  // set the WIDGETS scriptPath var
          return scriptPath;  // terminate the search
        }
      }
    }
    if (scriptPath) {
      return scriptPath;
    } else {
      console.log('WIDGETS failed to find its script path.');
    }
  }
    
  function labelReplaceSelection (newText) {
    var pre = "", post = "",
        elt = labelWidget.inputElt[0],
        start = elt.selectionStart,
        finish = elt.selectionEnd,
        val = elt.value;
    if (start > 0) {
      pre = val.slice (0, start);
    }
    if (finish < val.length) {
      post = val.slice (finish);
    }
    val = pre + newText + post;
    WIDGETS.labelChanged (val);
    elt.value = val;
    finish = pre.length + newText.length;
    $(elt).focus ();
    elt.setSelectionRange (finish, finish);
  }

/* ***** TRACE WIDGET ***** */

   // The following vars belong to the trace widget
  var enableBox, fadeBox, pageBox, undoBox, // traceWidget checkboxes
      cachedSettings = {},
      tracedGobjs = {};  // a list (by gobj.id) of all traced objects in the sketch.
  
/* The Trace Widget provides the user with glowing feedback to show which objects are traced and which are not.
 * When a glowing object moves, traces are irregular, so glowing is turned off when any objects are moving.
 * (It might be a nice to enhancement to turn glowing off only for moving objects.)
 * A client may need to know whether glowing and fading are turned on or off.
 * Main code already sends an event when traces are cleared, so no need for that here.
 * In case a client needs to control tracing behavior, we expose
 * setTraceEnabling, setTraceGlowing and setTraceFading.
 *
 * Note that pagetraces and undoredotraces live in the doc's author preferences (docSpec.metadata.authorPreferences)
 * whereas tracesEnabled and fading live in sketch.preferences alongside color, text, and precsion prefs.
 * Because tracesEnabled is in sketch prefs, it's a per-page pref, not a global like pagetraces and undoredotraces.
 * Unlike the other settings, glowing is an attribute of the widget, and thus moves from page to page and doc to doc along with its widget. 
 */

  function canTraceGobj (gobj) {
    return !(gobj.isOfKind ("Text") || gobj.isOfKind ("AngleMarker") || gobj.isOfKind ("PathMarker") ||
        gobj.isOfKind ("Button") || gobj.isOfKind ("CoordSys") || gobj.isOfKind ("DOMKind") ||
        gobj.isOfKind ("IterateImage") || gobj.isOfKind ("Map") || gobj.isOfKind ("Picture"));
  }
  
  function noMotionActive () {
    var list = GSP._get (targetSketch, 'MotionManager.motionList'),
        ix, member;
    if (list && list.length) {
      for (ix = 0; ix < list.length; ix++) {
        member = targetSketch.MotionManager.motionSet[list[ix]];
        if (member && member.state === "active") {  // Check whether this member of the motionSet is active
          return false;
        }
      }
    }
    return true;
  }
  
  function startGlowing () {  // Makes all traced objects glow PROVIDED the glowBox is checked
    // AND EITHER there's no active motion OR tracing is disabled
    if (noMotionActive() || !enableBox.checked) {
      traceWidget.setTracedGobjRenderState (true);
      traceWidget.event({},
        {action: 'glowing', glowing: true}   
      );
    } else {
      stopGlowing ("force");
    }
  }
  
  function stopGlowing (arg) {  // Stops all traced objects from glowing, unless tracing is disabled
    // Pass arg = "force" to force the stop.
    var enabled = enableBox.checked,
        forceStop = arg === "force";
    // console.log('stopGlowing called for type ' + (arg ? arg.type : 'undefined'));
    if (enabled || forceStop) {
      traceWidget.setTracedGobjRenderState (false);
      // console.log('Glowing is stopped.');
      traceWidget.event({},
        {action: 'glowing', glowing: false}   
      );
    }
  }
  
  function movementMessagesOn () {
    $targetNode.on (
      "StartDragConfirmed.WSP " +
      "WillPlayTool.WSP " +
      "StartAnimate.WSP " +
      "StartMove.WSP",
      stopGlowing);
    $targetNode.on ("EndDrag.WSP " +
      "ToolPlayed.WSP " +
      "ToolAborted.WSP " +
      "EndAnimate.WSP " +
      "EndMove.WSP " +
      "MergeGobjs.WSP",
      startGlowing);
  }

  function movementMessagesOff () {
    $targetNode.off (
      "StartDragConfirmed.WSP " +
      "WillPlayTool.WSP " +
      "StartAnimate.WSP " +
      "StartMove.WSP",
      stopGlowing);
    $targetNode.off ("EndDrag.WSP " +
      "ToolPlayed.WSP " +
      "ToolAborted.WSP " +
      "EndAnimate.WSP " +
      "EndMove.WSP " +
      "MergeGobjs.WSP",
      startGlowing);
  }
  
/* Don't turn off the glowBox when deactivating the Trace widget, but DO
 * return all traced gobjs to untraced renderState.
 * 
*/

  traceWidget.setTracedGobjRenderState = function(state) {  // Sets the render state for every traced object
    // state is true to display glowing behavior, or false to turn it off
    // Use traceInOut to make them glow more slowly than unmatchedGiven, (Should they be timed so all traced gobjs are synchronized?)
    // console.log('Setting trace glowing to', state);
    var newState = state ? 'traceInOut' : 'none'; 
    if (tracedGobjs) {
      $.each(tracedGobjs, function () {
        this.setRenderState (newState); 
      });
    }
  };
  
  traceWidget.setState = function(cBox, pref, action, newState) {
    // Set the given checkbox element and pref to newState
    // If newState is defined, the designated state and its checkbox are both set
    // If newState is undefined, set the pref to the cBox checkbox value.
    // Send an event with action and the new value
    var prefs = getSketch().preferences,
        attrs = {action: action};
    if (newState === undefined) {
      newState = cBox.checked;
    } else {
      cBox.checked = newState;
    }
    if (pref) {
      prefs[pref] = newState;
    }
    if (action) {
      attrs[action] = newState;
      this.event({},
        attrs   //e.g., {action: fading, fading: newState}
      );
    }
    // Remove all mentions of wTracePrompt once accessibility renders the prompt obsolete.
    return newState;
  };
  
  traceWidget.setGlowing = function (activate) {  // In previous code the Trace Widget had a checkbox
    // allowing the user to turn glowing on/off. We've now removed that checkbox: all traced objects now
    // glow when the Trace Widget is open, and the widget calls startGlowing() when activated and
    // calls stopGlowing ("force") when deactivated.

    if (activate === undefined) {
      activate = true;
    }
    this.glowing = activate;
    if (activate) {
      movementMessagesOn ();
      startGlowing ();
    }
    else {
      movementMessagesOff ();
      stopGlowing ("force");
    }
  };
  
  traceWidget.showTimedHelp = function (doc, key, delay) {
    // Show the help for this key, and restore widget-pane help if it's still there when delay expires.
    GSP.WspHelp.showHelp (doc, key + 'widget', this, 'textHint');
    setTimeout (function () {
      if (key === GSP.WspHelp.currentHelpKey() ) {
        GSP.WspHelp.showHelp (doc, 'Trace Widget Pane', this, 'textHint');
      }
    }, delay);
  };
  
  
  traceWidget.setEnabling = function (ev) {  // set the enabled pref for traces
    // Don't change glowBox from the user setting (which defaults to off)
    this.setState(enableBox, 'tracesEnabled', 'enabled', ev.checked);
  };

  traceWidget.setFading = function (eventOrValue) {
    // If turning on fading based on a value or on a user's checkbox event.
    // If undoredotraces are on, cancel them.
    var target = eventOrValue.target,
        isEvent = !!target,
        checked = isEvent ? target.checked : eventOrValue,
        sketch = getSketch(),
        doc = sketch.document;
    if (checked && sketch.getAuthorPreference('undoredotraces')) {
      this.setUndoRedoTraces (false);
      this.showTimedHelp (doc, 'UndoRedoTraces Cancelled', 3000);
    } else {
      GSP.WspHelp.showHelp (doc, 'Trace Widget Pane', this, 'textHint');
    }
    this.setState(fadeBox, 'fadeTraces', 'fading', checked);
    if (checked) {
      sketch.startFadeJob(true); // force a restart
    } else {
      sketch.stopFadeJob();
    }
  };

  traceWidget.setPageTraces = function (ev) {
    this.setState(pageBox, 'pagetraces', 'enabled', ev.checked);
  };
  
  traceWidget.setUndoRedoTraces = function (eventOrValue) {
    // Set the undoRedo traces pref based on a value or on a user's checkbox event.
    // If it's a user event, further considerations apply.
    var target = eventOrValue.target,
        isEvent = !!target,
        checked = isEvent ? target.checked : eventOrValue,
        sketch = getSketch(),
        doc = sketch.document;
    doc.setAuthorPreference( 'undoredotraces', checked);
    $('#wUndoRedoTraces').prop('checked', checked);
    if (!isEvent) return; // nothing more to do
    if (checked && sketch.preferences.fadeTraces) {
      // undoRedo Traces checked while fading is on, so turn fading off and inform the user.
      sketch.stopFadeJob();
      this.setFading (false);
      this.showTimedHelp (doc, 'FadeTraces Cancelled', 3000);
    } else { // nothing to cancel, so return to normal trace-widget help
      GSP.WspHelp.showHelp (doc, 'Trace Widget Pane', this, 'textHint');
    }
  };

/* REMOVE OLD CODE
  traceWidget.setUndoRedoTraces = function (ev) {
    // If turning on undoredotraces and fading is on, cancel fading
    var checked = ev.checked,
        sketch = getSketch();
    sketch.document.setAuthorPreference( 'undoredotraces', checked);
    this.setState(undoBox, 'undoredotraces', 'enabled', checked);
    if (checked && sketch.getAuthorPreference('fadeTraces')) {
      sketch.stopFadeJob();
      this.setFading ({checked: false});
      GSP.WspHelp.showHelp (ev, {}, {helpKey: 'FadeTraces Cancelled'});
    } else {
      GSP.WspHelp.showHelp (sketch.document, 'Trace Widget Pane', 'widget', );
    }
  };
*/
  
  traceWidget.preProcessSketch = function() {
    console.log('preprocessing');
    tracedGobjs = {};
    getSketch().sQuery("*").each (function () {
      if (this.style.traced && !this.style.hidden) {
        tracedGobjs[this.id] = this;
      }
    });
    this.setGlowing(true); // Traced objects always glow when Trace Widget is active.
    console.log('preProcess results:', tracedGobjs);
  };
  
  traceWidget.postProcessSketch = function() {
    // stopGlowing("force");
    this.setGlowing (false);
    tracedGobjs = {};
    console.log('postprocess results: ', tracedGobjs);
  };

  traceWidget.init = function () {    
    enableBox = $("#wTraceEnabled")[0];
    fadeBox = $("#wTraceFading")[0];
    undoBox = $("#wUndoRedoTraces")[0];
    pageBox = $("#wPageTraces")[0];
  };
  
  traceWidget.prepShow = function () {    
    enableBox.checked = getSketch().preferences.tracesEnabled;
    fadeBox.checked = getSketch().preferences.fadeTraces;
    startGlowing();   // traced gobjs always glow unless they're in motion
    this.cancelOnExit = false;
    traceWidget.autoEnabled = false;  // first tap after activation will check the Enabled box
    return true;
  };

  traceWidget.hidden = function (/*hiddenClass*/) {
    // No harm is done by stopping glowing when the prompt is hidden
    this.cacheSettings('save');
    stopGlowing("force"); // glowing occurs only when the traceWidget is active
    this.cancelOnExit = false;
  };

  traceWidget.shown = function($el) {
    console.log ('Showing the trace widget');
    if ($el.hasClass('widgetPane')) { // When showing this pane, show pane help rather than prompt help
      GSP.WspHelp.showEventHelp ({target: $el[0]}, {}, {helpKey: 'Trace Widget Pane'});
    }
  };

  traceWidget.cacheSettings = function (direction) {
    if (direction === 'save') {
      cachedSettings.enable = enableBox.checked;
      cachedSettings.fade = fadeBox.checked;
    } else if (direction === 'restore') {
      this.setEnabling(cachedSettings.enable);
      this.setFading(cachedSettings.fade);
      this.setGlowing(cachedSettings.glow);
    }
  };
  
  traceWidget.signalChangedTraceState = function (gobj) {
    // If traced gobjs aren't glowing, signal the user that she's actually made a change
    var currentState = gobj.state.renderState,
        originalColor = gobj.style.color;
    
    function backColor () {
      var retVal = getSketch().clipNode.css("backgroundColor"),
          parsedVal = retVal.match(/rgba\(.*,.*,.*,\s*(.*)\)/);
      if (parsedVal && parsedVal[1] && parsedVal[1] === "0")  // Is it safe to assume computed color returns as "rgba(r, g, b, a)"?
        return "white"; // use white if background is transparent
      else return retVal;
    }
    
    if (gobj.style.traced) {
      gobj.setRenderState ("targetHighlit");
      setTimeout (function () {
        gobj.setRenderState (currentState);
      }, 500);
    } else {
      if (gobj.isOfKind ("Point")) {
        gobj.hide ();
        setTimeout (function () {
          gobj.show ();
        }, 500);
      } else {
        gobj.style.color = backColor ();
        if (gobj.style.width) gobj.style.width += 1;
        gobj.invalidateAppearance ();
        setTimeout (function () {
          gobj.style.color = originalColor;
          if (gobj.style.width) gobj.style.width -= 1;
          gobj.invalidateAppearance ();
        }, 500);
      }
    }
  };
  
  traceWidget.toggleGobjTracing = function(gobj, newState) {
    // if newState is defined, use it; otherwise toggle the style
    var style = gobj.style;
    style.traced = newState === undefined ? !style.traced : newState;
    if (style.traced) {
      tracedGobjs[gobj.id] = gobj;
      console.log('Added to tracedGobjs: ', gobj);
    } else {
      delete(tracedGobjs[gobj.id]);
      console.log('Removed from tracedGobjs: ', gobj);
    }
    this.event({},
      {action: 'changed', gobjId: gobj.id, traced: style.traced}
    );
    // console.trace('Set to newState: ' + newState);
    if (!style.traced) {
      gobj.setRenderState ("none");
    } else {
      if (!traceWidget.autoEnabled) {
        traceWidget.setEnabling (true);
        traceWidget.autoEnabled = true;
      }
      gobj.setRenderState ("traceInOut");   // traceInOut is slower than unmatchedGiven
    }
    $("#wTracePrompt").hide(fadeTime);
// console.log('toggled #' + gobj.id + ' to ' + style.traced + ' traces on for', tracedGobjs);
  };

  traceWidget.handleTap = function (event, context) {
    var gobj = Object.getPrototypeOf(traceWidget).handleTap (event, context);
    if (!canTraceGobj (gobj))
      return; // ignore taps on untraceable objects
    if (gobj) {
      gobj.state.traceConstraintFrame = gobj.state.constraintFrame; // avoid tracing if the gobj doesn't move
      this.toggleGobjTracing(gobj);
    }
  };
  
/*  Delete Widget
 *  The name of this widget will eventually change to "Object Widget". To implement that change, we'll need to
 *  rename the delete widget references in several files in addition to this one:
 *  document.js, exporter.php, Export.js, widgets.html and widgets.css,
 *  all of which currently refer to the pref as "delete".
 */
 
  function setRenderStates (list, newState) { // Set the renderState of every gobj in arr.
    $.each (list, function (id, gobj) {
      gobj.setRenderState (newState);
    });
  }
  
  deleteWidget.deleteWithProgeny = function (gobj, progeny) {
    // The Delete Widget posts an undo delta and emits an event with each deletion
    var sketch = getSketch(),
        delta,
        preDelta = sketch.document.getRecentChangesDelta(); // capture changes since last undo event
    sketch.gobjList.removeGObjects (progeny, sketch);
    delta = sketch.document.pushConfirmedSketchOpDelta (preDelta);
    sketch.document.changedUIMode();
    // Add a sketch event here, similar to the ToolPlayed event posted by the toolController.
    this.event({},
      { action: 'deleteConfirm',
        gobj: this.gobj.id,
        deletedIds: Object.keys(progeny),
        preDelta: preDelta, // needed?
        delta: delta // needed?
      }
    );
  };
  
  deleteWidget.show = function (restoring) {
    if (!Object.getPrototypeOf(this).show(this, restoring)) return false;
    this.cancelOnExit = false;
    return true;
  };

  deleteWidget.hide = function () {
    Object.getPrototypeOf(this).hide(this);  // Call multiple levels of post-processing
    $('#wDeletePrompt').css ("display", "none");
    this.cancelOnExit = false;
    delete deleteWidget.gobj;
    delete deleteWidget.progenyList;
  };

  deleteWidget.handleTap = function (event, context) {
    var gobj = Object.getPrototypeOf(deleteWidget).handleTap (event, context),
        $blur = $('#delete-confirm-modal'),
        $dialog = $blur.find('.util-popup-content');
    if (gobj) {
      deleteWidget.gobj = gobj;
      deleteWidget.progenyList = gobj.sQuery.sketch.gobjList.compileDescendants (gobj);
      setRenderStates (deleteWidget.progenyList, "fadeInOut");  // Ideally make this a new renderState somewhat slower than unmatchedGiven
      $blur.css ('display', 'block');
      $dialog.tinyDraggable({exclude: ".dragExclude"});
      $("#deleteCancel").focus ();
    }
  };
  
  deleteWidget.deleteConfirm = function () {
    $('#delete-confirm-modal').css ('display', 'none');
    deleteWidget.deleteWithProgeny (deleteWidget.gobj, deleteWidget.progenyList);
  };

  deleteWidget.deleteCancel = function () {
    $('#delete-confirm-modal').css ('display', 'none');
    setRenderStates (deleteWidget.progenyList, "none");
  };

/* The widget HTML lives inside the wsp-sketch-container so that it moves with the sketch itself (e.g., when a tool-column is added).
 * But the util menu and its appurtenances (upload/download dialogs and #file-name-input) belong with the util menu.
 * The widget html needs to move whenever the sketch itself changes: targeting a different sketch_canvas,
 * on loadSketch, and on page changes.
 * The util-menu html moves to a new sketch when the utility-menu button is clicked.
 **/
  

    // This function allows a user to hover over a button (the hoverButton) in order to show content (the hoverContent)
    // that that she can view and interact with. The hoverContent remains visible while she hovers over it, and
    // disappears when she moves the mouse outside the hoverContent. These two elements must have a common parent
    // (the hoverParent). The content is shown when the mouse enters the hoverButton and is hidden when
    // the mouse leaves the hoverParent. (In typical use, the hoverButton is under the hoverContent.)
    // 
    // The relevant elements are 
    // .hoverParent (the hidden parent div) and its child elements:
    // .hoverButton 🔽, a button, behind .hoverContent and visible only when content is hidden, and
    // .hoverContent (the dropdown content containing clickable buttons for the user).
    // The relevant hoverButton events for interacting with the drop-down are 
    // 'click' (which immediately hides the button and displays the hoverContent), 
    // 'mouseenter' (displays a content-description tip; starts a timer to display the hoverContent and hide the button), and
    // 'mouseleave' (cancels the timer if it's ongoing, and hides the hoverContent thus revealing the hoverButton).
    // 
    // .hoverContent has class .dragexclude, preventing it and its children from dragging the widget around.
    // 
    // timeout callbacks use the global 'this', so cannot 
    //  *


/* Below marked with '//FB+' is the code to use function binding to pass required params to the Timeout callback.
  Function binding is not supported in the current ES5 version of javascript, so we cannot pass params to callbacks,
  nor can callbacks make calls to widget code (as their local scope is the global scope).
  For now, we use standard jquery in the callback to identify the requisite elements that it needs to address,
  without making any calls to widget code in the callback.
  For now, this fallback code does not fade .hoverContent in or out, but shows or hides it without fading. 
  Further, this first version supports only a single .hoverContent, in the Label widget. To enable .hoverContent
  in other widgets (e.g., the Trace Widget) we'll need to add a test to find the visible widget.

  Re function binding: Here are my notes from the WSP Bugs Notes page shared with Daniel:
  Using a bound function initially fails. Is this a problem with the current version of jQuery? 
  or is it just that I ned to port the code from ES5 to ES6? (See https://jsontotable.org/es5-to-es6-converter) 
  Do I need to upgrade node.js from V17.4 to something newer? Do I need to switch from jQuery 2.1.0 to jQuery 3.0? 
  Might I also need to update my version (or a config file) for jshint?
  **/

  function setupHover($parent) {
    var $btn = $('.hoverButton', $parent),
        $content = $('.hoverContent', $parent);
    $btn.once ('click mouseleave', handleDropdownHover);
    $content.once ('mouseleave', handleDropdownHover);
  }

  var hoverTimer; // must be in WIDGETS scope to persist between calls to handleDropdownHover()

  function handleDropdownHover (e) { // e must be a click, mouseenter, or mouseleave event on the .hoverButton or hoverContent

    // This function allows a user to hover over a button (the hoverButton) in order to show content (the hoverContent)
    //  * that that she can view and interact with. The hoverContent remains visible while she hovers over it, and
    //  * disappears when she moves the mouse outside the hoverContent. These two elements must have a common parent
    //  * (the hoverParent). The content is shown when the mouse enters the hoverButton and is hidden when
    //  * the mouse leaves the hoverParent. (In typical use, the hoverButton is under the hoverContent.)
    //  * 
    //  * The relevant elements are 
    //  * .hoverParent (the hidden parent div) and its child elements:
    //  * .hoverButton: 🔽, a button, behind .hoverContent and visible only when content is hidden, and
    //  * .hoverContent (the dropdown content containing clickable buttons for the user).
    //  * The relevant hoverButton events for interacting with the drop-down are 
    //  * 'click' (which immediately hides the button and displays the hoverContent), 
    //  * 'mouseenter' (displays a content-description tip; starts a timer to display the hoverContent and hide the button), and
    //  * 'mouseleave' (cancels the timer if it's ongoing, and hides the hoverContent thus revealing the hoverButton).
    //  * 
    //  * .hoverContent has class .dragexclude, preventing it and its children from dragging the widget around.

    var $target = $(e.target),
        targetName = e.target.className,
        $parent = $('.hoverParent', '#wLabelPane'),
        // $button = $('.hoverButton', $parent), // not used
        $content = $('.hoverContent', $parent),
        eType = e.type,
        // lastHoverTime = 0, lastHoverType,
        pauseTime = 1000;

    //  * timeout callbacks use the global 'this', so can't directly access the local handleDropdownHover vars.
    //  * Instead we use getHoverInfo to create a param object with the needed key/value pairs.


 //FB+ function getHoverInfo () {
    //   return {$hButton: $hoverButton, $hContent: $content, timer: hoverTimer};
    // }
    //
    // function pauseExpired () { // timer has expired, so show the content and 
    //   // allow user to "browse": to hover and/or click until mouseout
    //   // hoverInfo is required b/c 'this' is the global this.
    //   var $parent = $('.hoverParent', '#wLabelPane'),
    //       $content = $('.hoverContent', $parent);
    //   console.log ('Pause expired');
    //   $content.once('mouseleave', mouseLeft);
    // }

    function clearTimer (e) {
      if (hoverTimer) {
        clearTimeout (hoverTimer);
        hoverTimer = null;
        console.log (e.type + ' cleared timer ' + hoverTimer + ' at ' + Date.now());
      }
    }

    function mouseLeftButton( e ) { // The mouse has left the hoverButton
      var $content = $('.hoverContent', '.widgetPane:visible');
      if ($content.is(':visible')) { // If content is already visible, do nothing
        return;
      }
      // mouse has left the button before content is shown
      clearTimer (e);
      console.log ('Mouse left button: event: ', e);
      eType = 'mouseLeftButton';
    }

    function mouseLeftContent( e ) { // The mouse has left the hoverContent
      console.log ('Mouse left content: event: ', e);
      clearTimer (e);
      $content.hide(); // makes the $button visible again
      eType = 'mouseLeftContent';
    }

 //FB+ function expired ($parent, $content, mouseLeft) {
    //   console.log ('Pause expired');
    //   console.log ($content);
    //   $content.once('mouseleave', mouseLeft);
    // }


    function expired() { // callback:user hovered over .hoverButton till Timeout expired
      // The hover drop-down must be in the visible widget pane
      var $content = $('.hoverContent', '.widgetPane:visible');
      console.log ('Button timer expired.');
      $content.show();
    }

    // body of handleDropdownHover test
    console.log ('Handling: ' + eType + '  hoverTimer: ' + hoverTimer);
    if (eType === 'click') { // A click here is a click on the button; special chars have their own click handlers.
      // $button = $target;
      console.log('Handling ' + eType + ' for ' + targetName);
      $content.show();
      $content.on ('mouseleave', mouseLeftContent);
      return;
    } else if (eType === 'mouseenter') {
      if (hoverTimer) { 
        // If a timer's already running, don't leave both running.
        // Is it better to let the first one finish, or to replace it with a new one?
        // Here we let the first one finish, rather than extending the timeout.
        // Use the three lines below to clear the first one if we prefer that behavior
        // console.log (e.type + ' clearing existing timer ' + hoverTimer + ' at ' + Date.now());
        // clearTimeout (hoverTimer);
        // hoverTimer = null;
        console.log('mouseenter ignored; timer ' + hoverTimer + 'is already running.');
      } else { // No timer is running, so we start a new timer
        hoverTimer = setTimeout( expired, pauseTime );
        console.log ('Set timer ' + hoverTimer + ' for mouseenter of ' + targetName + ' at ' + Date.now());
      }
    } else if (e.type === 'mouseover') { // The mouse has come over the hoverButton
        console.log ('Remove any mouseover listeners.');
    } else if (e.type === 'mouseleave') { // The mouse has left the hoverButton or hoverContent
      if ($target.hasClass ('hoverButton')) {
        console.log ('mouse left button, hoverTimer: ' + hoverTimer);
        mouseLeftButton(e);
      } else if ($target.hasClass ('hoverContent')){
        console.log ('mouse left content');
        mouseLeftContent(e);
      }
    } else if (e.type === 'mouseout') {
      console.log ('No need for mouseout listeners.');
      // mouseLeftContent (e);
    } else {
      console.log ('handleDropdownHover called incorrectly, with event.type = ' + e.type);
      return; // nothing to be done
    }
  } // handleDropdownHover


  /* End of function binding test
  */

/* Older code before function binding test
  var lastHoverTime = 0, lastHoverType;

  function handleDropdownHover (e) {
    var $this = $(this),
        $content = $this.children('.hoverContent'),
        //  elapsed = e.timeStamp - lastHoverTime,
        delay = 200, // hide/show animation delay
        mouseLeft;
    // if ( elapsed < delay && e.type !== lastHoverType) {
    //   console.log('canceled hover event (' + e.type + ') generated by animation.');
    //   return; // do nothing if this event is generated by the previous event's animation
    // }
    lastHoverTime = e.timeStamp;
    lastHoverType = e.type;
    console.log ('event: ' + e.type + '  target: ' + $target.classList[0] + '  content: ' + $content[0].classList[0]);
    if (e.type === 'mouseenter') {
      console.log ('Entered hover element');
      setTimeout(function () {
        if (!mouseLeft) {
          $content.show();
        }
      }, delay);
      $content.show (delay);
    } else if (e.type === 'mouseleave') {
      console.log ('Left hover element');
      mouseLeft = true;
      $content.hide (delay);
    }
  } // handleDropdownHover
*/   



  function installWidgetEventHandlers() {
    $('.widgetPane').on('focusout', function(e) {console.log(e);});
    $('.widget_controlButton').once('click', WIDGETS.toggleWidgetModality);
    $('#pointStyleCheckbox').once('click', WIDGETS.pointCheckClicked);
    $('.widget_pointImgWidth').once('click', WIDGETS.pointGridClicked);
    $('#lineStyleCheckbox').once('click', WIDGETS.lineCheckClicked);
    $('.widget_lineStyleWidth').once('click', WIDGETS.lineGridClicked);
    $('#objectColorCheckbox.style_paneCheckbox').once('click', WIDGETS.colorCheckClicked);
    $('#textColorCheckbox.style_paneCheckbox').once('click', WIDGETS.labelCheckClicked);
    $('#widget_colorGrid.style_paneBackground').once('click', WIDGETS.colorGridClicked);
    $('.wDismissButton.confirm_button').once('click', WIDGETS.confirmModality);
    $('.wDismissButton.cancel_button').once('click', WIDGETS.cancelModality);
    $('#wTracePrompt').once('click', WIDGETS.hidePrompt);
    $('#wTraceEnabled').once('click', WIDGETS.setTraceEnabling);
    $('#wTraceFading').once('click', WIDGETS.setTraceFading);
    $('#wEraseTraces').once('click', WIDGETS.clearTraces);
    $('#wTracesGlowing').once('click', WIDGETS.setTraceGlowing);
    $('#wPageTraces').once('click', WIDGETS.setPageTraces);
    $('#wUndoRedoTraces').once('click', WIDGETS.setUndoRedoTraces);
    $('#wLabelEditText').once('input', function(){WIDGETS.labelChanged(this.value);});
    $('#wLabelShow').once('click', function(){WIDGETS.labelToggled(this.checked);});
    $('select.labelFontSize').once('change', function(){
      this.nextElementSibling.value=this.value; WIDGETS.labelSetFontSize(this.value);});
/*    $('select.labelFontSize').once('change', function(){this.nextElementSibling.value=this.value; WIDGETS.labelSetFontSize(this.value);});*/
    $('input#wLabelFontSize').once('input', function(){WIDGETS.labelSetFontSize(this.value);});
    $('input#wLabelFontSize').once('change', function(){WIDGETS.labelSetFontSize(this.value);});
    $('#wLabelFont').once('change', function(){WIDGETS.labelSetFont(this.value);});
    $('#wVisibilityPrompt').once('click', WIDGETS.hidePrompt);
    $('#deleteConfirm').once('click', WIDGETS.deleteConfirm);
    $('#deleteCancel').once('click', WIDGETS.deleteCancel);
    // The following mouseenter mouseleave listener duplicates the one below...
    // $('.hoverParent').once('mouseenter mouseleave', handleDropdownHover);
    // Modal dialog box click handlers should be set once, and not changed
/*    //$('#util-fname').once('click', function(){UTILMENU.checkFName(this.validity);});*/
    //$('button.close.util-popup-button').once('click', function(){UTILMENU.closeModal ('download-modal', 'cancel');});
    //$('#downloadBeforeUpload').once('click', function(){UTILMENU.closeModal ('upload-modal', 'save');});
    //$('#button.close.util-popup-button[value|="Upload new sketch"]').once('click', function(){UTILMENU.closeModal ('upload-modal', 'dont-save');});
    //$('#button.close.util-popup-button[value|="Cancel"]').once('click', function(){UTILMENU.closeModal ('upload-modal', 'cancel');});
  }

  function setupDropdownHandlers() {
    var $hoverParents = $('.hoverParent');
    $.each ($hoverParents, function ($parent) {
      var $button = $('.hoverButton', $parent),
          $content = $('.hoverContent', $parent);
      setupHover ($parent);
      $button.once('click mouseenter mouseleave', handleDropdownHover);
      $content.once('mouseleave', handleDropdownHover);
    });
  }

  function setupSpecialCharHandlers () {
    var $chars = $widget.find(".wCharDropdownContent .column div");
    if (!$._data ($chars[0], "events")) { // don't add more handlers if they're already present
      $chars.click (function () {
        labelReplaceSelection (this.innerText);
      });
    } else {
      console.log ("setupDropdownHandlers() should not be called twice.");
    }
  }

  // CLEAN UP INIT CODE THAT ONLY NEEDS TO RUN ONCE, WHEN THE PAGE LOADS.

  function makeWidget() {
    // widgets.html has been loaded, but the widgets need to be set up before loading a sketch.
    // Any loaded sketch needs to be queued until makeWidgets is finished
    if ($widget) {
      console.log ("makeWidget() should not be called twice.");
      return;
    }
    console.log( 'Starting makeWidget');
    $widget = $("#widget", $widgetParent);
    $widget.css ("display", "none");
    // CHECK THESE HANDLERS FOR DUPLICATES...
    setupWidgetHandlers ();
    setupDropdownHandlers ();
    installWidgetEventHandlers();
    setupSpecialCharHandlers();
    $widget.find("img").attr('src', function (index, attr) { // Set the img src attributes to their correct url's
      var fName = attr.match (/[^\/]+$/); // get the portion of the filename following the last slash.
      return scriptPath + fName;
    });
    widgetArr.forEach(function(widget) {
      // Use getJQ so each of these is undefined if it's not an actual node
      widget.$prompt = getJQ('#w' + widget.name + 'Prompt');
      widget.$pane = getJQ('#w' + widget.name + 'Pane');
      widget.$domButton = getJQ('#widget_' + widget.name + 'ButtonID');
      if (widget.init) {
          widget.init();
      }
    });
    console.log( 'Finished makeWidget');
    widgetsLoaded = true;
    if (initialWidgetTargetNode) {
      targetControllerToDoc (initialWidgetTargetNode);
      initialWidgetTargetNode = null;
    }
  } // makeWidget

  function initWidget() {
    // Install the $.once handler before running init code.
    if (!$.once) {
      // from https://stackoverflow.com/questions/6361465/how-to-check-if-click-event-is-already-bound-jquery/50097988#50097988
      // modified to avoid turning off all handlers when a new handler is installed.
      $.fn.once = function(a, b) {
        return this.each(function() {
            $(this).off(a,b).on(a,b);
        });
      };
    }
    loadWidgetHTML(); // Calls makeWidget() when done
    if (window.TOOLS === undefined) {
      window.TOOLS = false;
    }
  } // initWidget

  function loadWidgetHTML () { // create $widgetParent and its contents
    var $sketches = $('.sketch_canvas');
    // Create #widgetParent and #widget so they're ready to have widgets.html loaded
    var $content = $('<div id = "widgetParent"></div>');
    $content.appendTo('body');
    $widgetParent = $('#widgetParent');
    // use jquery.load to load the widgets html into #widget
    console.log( 'Loading widgets.html');
    $widgetParent.load (getScriptPath() + 'widgets.html', makeWidget);
    // Install sketch_canvas event handlers even before load finishes,
    // so they're ready for the first doc loaded
    $sketches.once("WillUndoRedo.WSP WillChangeCurrentPage.WSP", stopPage);
    $sketches.once("UndoRedo.WSP DidChangeCurrentPage.WSP", startPage);
  }
 
  // END OF INIT CODE THAT ONLY NEEDS TO RUN ONCE

  function toggleWidgetModality(e) {
    // If the widget's off, turn it on after deactivating the activeWidget.
    // If it's on, turn it off, checking the event target 
    // To use this as an event handler: $el.on('click', {name: 'Style'}, toggleWidgetModality);
    var widget = getWidget(e.currentTarget.textContent.trim().split(' ')[0]);
    widget.toggle(e);
  }
  
  function resetSpecState( val ) {
    // Prepare for finding the spec of the current sketch if val is true:
    // Turn off trace and target glowing. What about active-given renderState?
    // If val is falsy, restore these renderStates.
    if (val) {
      stopGlowing();
    } else {
      startGlowing();
    }
    if (targetGobj) {
      targetGobj.setRenderState (val ? 'targetState' : '');
    }
    // Handle toolplay renderState 
  }

return {  // public functions and variables
  
  //loadWidgetHTML: loadWidgetHTML,
  initWidget: initWidget,
  
  $getWidgetSketch: function () {
    return getSketch().canvasNode;
  },
  
  getWidget: function (info) { // return the widget associated with el, which can be the widget's name or an associated DOM element (its button, prompt, or pane).
    return getWidget(info);
  },
    
  showWidgets: function(show, optionalTargetNode) {  // shows or hides the entire widget
    if (!$widget && show)
      throw GSP.createError ("showWidgets called before loading $widget.");
    if (!show) {
      hideWidget();
      return;
    }
    
    if (optionalTargetNode) { // if the caller specifies a DOM node, put the widgets in it.
      if (activeWidget) {
        activeWidget.hideShow({newSketch: $(optionalTargetNode).data('document').focusPage});
      } else {
        targetControllerToDoc (optionalTargetNode);
        if (targetNode !== optionalTargetNode) {
          return; // Failed to put widgets into optionalTargetNode, so bail
        }
      }
    }
    if (!targetNode && show)  // Do nothing if there's no targetNode or if this call is aimed at a different sketch
      return;
    if (show) {
      showWidget();
    }
    else {
      if (activeWidget) {
        activeWidget.hideShow();
      }
      hideWidget();
    }
  },
  
  $relatedSketchNode: function (node) {
    // node is an element associated with a sketch_canvas: a widget button, page control, util menu, etc.
    // returns the sketch_canvas DOM element associated with node
    var $node = $(node),
        $sketchNode = $node.filter (".sketch_canvas");
    while ($node.length && !$sketchNode.length) { // target isn't $sketchNode, so search prev sibs and then ancestors
      $sketchNode = $node.prevAll (".sketch_canvas");
      $node = $node.parent();
    }
    if ($sketchNode.length !== 1)
      throw GSP.createError ("$relatedSketchNode() couldn't find a unique sketch_canvas");
    return $sketchNode;
  },

  toggleWidgets: function (node, event) { // User pressed a Widgets button (the node). Desired behavior:
    // If node is associated with the current targetNode, toggle the widget controller visibility,
    // showing or hiding the current activeWidget.
    // If node is associated with a different sketchNode, display the controller in the new sketch,
    // maintaining the activeWidget if there is one.
    // If the user tapped a gobj in a new sketch and there's an activeWidget, target the tapped gobj.
    var sketchNode = WIDGETS.$relatedSketchNode (node)[0],
        newNode = sketchNode !== targetNode;
        
    if (!sketchNode) {
      throw GSP.createError ("toggleWidgets called for an element that's neither a sketch_canvas nor a wsp-widgets-button");
    }
    if (newNode && activeWidget) {  // new node, so show the activeWidget in the new sketch 
      activeWidget.hideShow({newSketch: $(sketchNode).data('document').focusPage, event: event}); 
    } else if (newNode) {
      targetControllerToDoc(sketchNode);
      $widget.show();
    } else { // not a new node, so it's the Widgets button in the current target sketch
      handleWidgetsClick();
    }
  },

  confirmModality: function (event) {
    if (activeWidget) {
      activeWidget.cancelOnExit = false;
      activeWidget.hideShow({event: event});
    }
  },

  cancelModality: function (event) {
    if (activeWidget) {
      activeWidget.cancelOnExit = true;
      activeWidget.hideShow({event: event});
    }
  },
  
  cachePageActiveWidget: function () {
    lastPageActiveWidget = activeWidget;
    if (activeWidget && activeWidget.cacheSettings) {
      activeWidget.cacheSettings('save');
    }
  },
  
  hidePrompt: function(e) {
    activeWidget.hideShow({event: e, hidePrompt: true});
  },

  toggleWidgetModality: function (e) {
    // e can be a click event or a widget, e.g. toggleWidgetModality('Style');
      toggleWidgetModality(e);
  },
  
  setTraceEnabling: function(ev) {
    traceWidget.setEnabling(ev.target.checked);
  },
  
  setTraceFading: function(ev) {
    traceWidget.setFading(ev.target.checked);
  },

  setTraceGlowing: function (ev) {
    traceWidget.setGlowing (ev.target.checked);
  },

  clearTraces: function () {
    getSketch().clearTraces ();
    $("#wTracePrompt").hide(fadeTime);
  },
  
  toggleGobjTracing: function (gobj, newState) {
    traceWidget.toggleGobjTracing(gobj, newState);
  },
  
  pointCheckClicked: function () {
    if (currentPointStyle < 0)
      highlightPointGrid (styleWidget.defaultPointStyle);
    else
      highlightPointGrid (-1);
  },

  pointGridClicked: function (e) {
    var rows = 4; // pointGrid has 4 rows, 1 column
    highlightPointGrid (Math.floor((rows * e.offsetY) / $(e.target).height()));
  },

  lineCheckClicked: function () {
    if (currentLineStyle < 0 && currentLineThickness < 0)
      highlightLineGrid (styleWidget.defaultLineThickness, styleWidget.defaultLineStyle);
    else
      highlightLineGrid (-1, -1);   // default to medium solid
  },

  lineGridClicked: function (e) {
    var rows = 4, // lineGrid has 4 rows, 3 columns
        columns = 3;
    highlightLineGrid (Math.floor((rows * e.offsetY) / $(e.target).height()), Math.floor((columns * e.offsetX) / $(e.target).width()));
  },

  colorCheckClicked: function () {
    var thisChecked = toggleCheck (styleWidget.objectColorBox);
    if (!thisChecked && !styleWidget.textColorBox.checked)
      highlightColorGrid (-1, 0);
    else if (colorIndex < 0) {
      highlightColorGrid (styleWidget.defaultColor.column, styleWidget.defaultColor.row);
    }
  },

  labelCheckClicked: function () {
    var thisChecked = toggleCheck (styleWidget.textColorBox);
    if (!thisChecked && !styleWidget.objectColorBox.checked)
      highlightColorGrid (-1, 0);
    else if (colorIndex < 0) {
      highlightColorGrid (styleWidget.defaultColor.column, styleWidget.defaultColor.row);
    }
  },
  
  labelSetFontSize: function (val) {
    if (targetGobj) labelWidget.setFontSize (+val);
  },
  
  labelSetFont: function (newFont) {
    if (targetGobj) labelWidget.setFont (newFont);
  },
  
  colorGridClicked: function (e) {
    var $grid = $(e.target).closest('#widget_colorGrid'),
        offset = $grid.offset(),
        x = e.pageX - offset.left,
        y = e.pageY - offset.top,
        column = Math.floor (numColorColumns * x / $grid.width()),
        row = Math.floor (numColorRows * y / $grid.height());
    highlightColorGrid (column, row);
  },
  
  labelChanged: function (newLabel, gobj) { // external callers can specify the gobj whose label should be changed
    if (!gobj) {
      gobj = targetGobj;
    }
    if (!LabelControls.labelChanged (newLabel)) { // Give LabelControls a chance to handle this event
      changeText (gobj, newLabel); // LabelControls didn't handle it, so call changeText()
    }
  },

  controlCallback: function (newLabel, newOrigin) { // Called when the user has pressed a button
    newLabel = changeText (targetGobj, newLabel, newOrigin);
    return newLabel;
  },
  
  labelToggled: function () {
    toggleLabel (labelWidget.showLabelElt.prop ("checked"));
  },
  
  invalidateLabel: function(gobj, action) {
    invalidateLabel(gobj, action);
  },
  
  deleteWithProgeny: function(gobjId, progenyIds) {
    var gobjects = getSketch().gobjList.gobjects,
        gobj = gobjects[gobjId],
        progeny = {};
    progenyIds.forEach(function(id) {
      progeny[id] = gobjects[id];
    });
    deleteWidget.deleteWithProgeny(gobj, progeny);
  },
  
  deleteConfirm: function () {
    deleteWidget.deleteConfirm (this);
  },

  deleteCancel: function () {
    deleteWidget.deleteCancel (this);
  },

  setWidgetsPrefs: function (prefArr) { // Available for legacy preference calls
    WSP.PREF.setWebPagePrefs (prefArr);
  },
  
  getScriptPath: function () {
    return scriptPath || getScriptPath();
  },
  
  resizeSketchFrame: function (sketchDoc) { // Call this if an already-loaded sketch has just been made visible.
    resizeSketchFrame (sketchDoc);
  },

  deactivateWidget: function ($theCanvas) { // Call this to force any active widget in $theCanvas to deactivate.
    if (activeWidget && $targetNode[0] === $theCanvas[0]) {   //FIGURE OUT HOW TO ENGAGE HIDESHOW HERE
      activeWidget.$pane.parent().hide();
      activeWidget.deactivate();
    }
  },
  
  prepareNode: function ( event, context ) {
    // This is the Widgets handler for the PrepareNode.WSP message
    prepareNode ( event, context);
  },

  docLoaded: function( event, context ) {
    // This is the Widgets handler for the LoadDocument.WSP message
    docLoaded( event, context);
  },
  
  resetSpecState: function (val) { // reset gobjs with renderState mods to their canonical state
    resetSpecState( val );
  },

  targetControllerToDoc: function (theNode) {
    targetControllerToDoc (theNode);
  },

  positionWidgets: function (sketch) {
    // Reposition the widgets in the bottom left of the sketch window
    positionWidgets (sketch);
  },
  
  connectWidget: function (sketch) {
    // Serves to reposition the widgets in the bottom eft of the sketch window
    connectWidget (sketch);
  },
  
  setVis: function ($el, doShow) {
    // Show or hide $el
    if (doShow) {
      $el.show ();
    } else {
      $el.hide ();
    }
  },
  
  getWidgets: function () {
    return widgetArr; // the array containing the widgets
  }

};  // return
})(); //WIDGETS

/* ***** LABEL CONTROLS STATE MACHINE ***** */
// This state machine handles the buttons that correspond to the object's nameOrigin.
// The labelWidget itself handles the label text input control.
// Thus LabelControls uses a callback to inform the widget of any programmatic text change resulting from a button click,
// and the widget must inform the LabelControls, via labelChanged(), of any user change in the text field (to facilitate a radio-button change if needed).
/* jshint -W003 */
var LabelControls = (function () {
/* jshint +W003 */
  var theMachine;
    
  function stateFromOrigin (mode, origin) {
    var measureState = {auto: AutoState, manual: ManualState, none: NoneState},
        transImageState = {prime: PrimeState, shortFn: ShortState, fullFn: FullState,
            manual: ManualState, none: NoneState};
    switch (mode) {
      case "measure":
      case "param":
        return measureState[origin];
      case "transImage":
        return transImageState[origin];
    }
  }
  
  function LabelMachine (mode, tappedGobj, callback, textRule, originRule, inputSelector, radioSelector, showSelector){
    this.mode = mode; // "measure," "param," or "transImage"
    this.oldText = tappedGobj.label;  // original values on creation
    this.oldOrigin = tappedGobj.style.nameOrigin;
    this.lastOrigin = "";
    this.labelText   = tappedGobj.label;  // the gobj.label holds the label for transformed images, for manual measurements, and for buttons. Auto measurements and auto-generated 
    $(inputSelector).prop ("value", tappedGobj.label);
    this.callback = callback;
    this.textRule = textRule;
    this.originRule = originRule;
    this.radioSelector = radioSelector;
    this.inputSelector = inputSelector;
    this.showSelector = showSelector;
    this.tappedGobj = tappedGobj;
    
    this.radioPressed = function (newOrigin) {
      var newText = this.textRule[newOrigin],
          gobj = this.tappedGobj,
          NewState, inputElt;
      
      if (newOrigin === "manual" && newText === "") {
        newText = gobj.label; 
      }
      if (newOrigin !== gobj.style.nameOrigin || newText !== gobj.label) {  // ignore a repeated tap on the same button if it's already been enforced.    
        NewState =  stateFromOrigin (this.mode, newOrigin);
        this.state = new NewState (this);
      }
      if (newOrigin === "manual") {
        inputElt = $(this.inputSelector)[0];
        inputElt.focus();
        inputElt.setSelectionRange(0, inputElt.value.length);
      }
    };
    
    this.originFromText = function (text) {
      var retVal;
      if (text==="") {
        retVal = "none";
      } else {
        retVal = this.originRule[text];
        if (!retVal) {
          if (this.mode === "transImage")
            retVal = "manual";  // it's an unrecognized, non-empty label
              else
            retVal = this.originRule["*"];
        }
      }
      return retVal;
    };
    
    this.labelChanged = function (newLabel, newOrigin) {  // caller has already determined the proper newOrigin
      var NewState = stateFromOrigin (this.mode, newOrigin);
      this.labelText = newLabel;
      if (!(this.state instanceof NewState))
        this.state = new NewState(this);    // the state transition will update the button.
      else  // No state change, so no need to update button, but we still need to update the sketch
        this.callback (newLabel, newOrigin);
    };

    this.state = null;
  }
  
  function LabelState (nameOrigin) { // Define properties for all descendants
    this.nameOrigin = nameOrigin;
    this.init = function (machine, text, showChecked) {
      var radio,
          newText = text,
          emptyTrans = nameOrigin === "none" && machine.mode === "transImage"; // transformed image with an empty label
      this.machine = machine;
      if (nameOrigin !== machine.lastOrigin) {
        newText = machine.callback (text, nameOrigin);  // Let the callback update the gobj (perhaps by generating a new label from the pool).
      }
      if (text !== "")
        $(machine.inputSelector).val (newText);
      radio = $(this.machine.radioSelector + "[value=" + nameOrigin +"]");
      if (!radio.prop ("checked")) {
        radio.prop ("checked", true);
      }
      if (emptyTrans) {
        $(machine.radioSelector).prop("checked", false);  // turn off all radios for no label
      } else if (newText !== text) {
        this.machine.labelText = newText;
        delete this.machine.originRule [text];
        this.machine.originRule[newText] = nameOrigin;
        this.machine.textRule[nameOrigin] = newText;  // update the rule to match the text if it's changed
      }
      $(machine.showSelector).prop ("checked", showChecked);
      machine.lastOrigin = nameOrigin;
    };
  }

  function AutoState (machine) {
    this.init (machine, "", true);
  }
  AutoState.prototype = new LabelState ("auto");
  AutoState.prototype.constructor = AutoState;
  
  function ManualState (machine) {
    this.init (machine, machine.labelText, true);
  }
  ManualState.prototype = new LabelState ("manual");
  ManualState.prototype.constructor = ManualState;
  
  function NoneState (machine) {
    this.init (machine, "", false);
    WIDGETS.labelToggled ();  //  Make sure the labelvisibility is in sync with the Labelcheckbox 
  }
  NoneState.prototype = new LabelState ("none");
  NoneState.prototype.constructor = NoneState;

  function PrimeState (machine) {
    this.init (machine, machine.textRule.prime, true);
  }
  PrimeState.prototype = new LabelState ("prime");
  PrimeState.prototype.constructor = PrimeState;
  
  function ShortState (machine) {
    this.init (machine, machine.textRule.shortFn, true);
  }
  ShortState.prototype = new LabelState ("shortFn");
  ShortState.prototype.constructor = ShortState;
  
  function FullState (machine) {
    this.init (machine, machine.textRule.fullFn, true);
  }
  FullState.prototype = new LabelState ("fullFn");
  FullState.prototype.constructor = FullState;

  
  return {

    init: function (mode, target, callback, textRule, originRule, inputSelector, radioSelector, showSelector) {
      var DefaultState = stateFromOrigin (mode, target.style.nameOrigin);
      theMachine = new LabelMachine (mode, target, callback, textRule, originRule, inputSelector, radioSelector, showSelector);
      theMachine.state = new DefaultState (theMachine);
      $(".wLabelRadios label").click(function (event) {
        LabelControls.transition (event);
      });
    },
    
    terminate: function () {
      if (theMachine)
        theMachine = null;
    },
    
    transition: function (event) {  // Called when a radio button is clicked. We have to use the callback if we change the text.
      // This handler gets called twice for each radio click on the label, but only once if on the button. Why? How to prevent this? 
      var value = event.target.value || event.target.children[0].value;
      if (value) {
        theMachine.radioPressed (value);
      }
      // return false;  // returning false prevents the second event, but then clicking a button (not the label) ends up with the previous button being restored. 
    },
    
    labelChanged: function (newLabel) { // Called from the widget; we get first chance at changing the text, but we don't have to call back about an origin change, because the caller has already set the origin.
      if (theMachine) {
        theMachine.labelChanged (newLabel, this.originFromText (newLabel));
        return true;
      }
      return false;
    },
    
    originFromText: function (theText) {
      if (theMachine) {
        return theMachine.originFromText (theText);
      }
        return null;
    }
  };
})(); // LabelControls

var PAGENUM = (function() { // define the PAGENUM namespace, for the code that creates and handles page number controls
  // private variables and functions  
  // The init() function replaces this flag: '<span class = "wsp-page-buttons"></span>' with the actual page button control elements for the sketch in the same container as the wsp-page-buttons span.
  // If the sketch has only a single page, no buttons appear.
  // If a new sketch is loaded into this sketch_canvas, the LoadDocument.WSP handler will reset the page buttons.
  // If the document switches to a new page, the DidChangeCurrentPage.WSP handler resets the page # and the enabled appearance of the arrows
  
  function $getBarCtl( sel, canvasNode ) { // Returns a buttton-bar control as a jQuery object 
    return $(sel, $(canvasNode).siblings('.wsp-button-bar'));
  }
  
  function getDoc (canvasNode) {
    return $(canvasNode).data("document");
  }
  
  function getCurPageIndex1 (sketchNode) {
    return +$getBarCtl ('.wsp-page-num', $(sketchNode)).text().trim();
  }

  function setToolEnabling (sketchDoc) {  // Only need to call this once to set css classes, UNLESS
    // tools are dynamically enabled or disabled on various pages (e.g., in the Tool Library).
    var tools = sketchDoc.tools;
    if (!tools) return;   
    tools.forEach (function (tool) {
      var $node = tool.$element,
          node = $node[0],
          prefName = tool.metadata.name.toLowerCase().replace(/\s+/g, "") + 'tool',
          thePref = sketchDoc.getExplicitPref (prefName),
          prefExists = thePref.exists,
          enabledPages = prefExists ? thePref.value : ['all'],
          classes = node.className,
          trueValues = ['all', true, 'true'],
          enableAll = trueValues.includes(enabledPages[0]);
      // Remove "page_toggle" and any "p_<num>" classes, enabling the tool on every page
      classes = classes.replace(/\bpage_toggle\b/, " ").replace(/\bp_\d+\b/g, " ").trim();
      if (prefExists && !trueValues.includes(enabledPages[0])) {
        // Some pages have this tool and some don't, so set classes that show the tool only for enabled pages
        classes += " page_toggle";
        if (enabledPages[0] !== "none") {
          enabledPages.forEach (function (val) {
            classes += " p_" + val;
          });
        }
      }
      node.className = classes.trim();
      $node.toggle(enableAll || enabledPages.includes(sketchDoc.focusPage.metadata.id));
    });
  } // setToolEnabling

  function checkToolEnabling( sketchDoc ) {
    // When a page changes, or when a tool-library user clicks a checkbox in the tool list, the sketch window
    // should show the tool container if any tools are present, or else hide the tool container.
    // TO DO: Figure out where in widgets to locate this functionality; it doesn't really belong
    // in WspHelp, and needs to be exposed for calling by tools.js when a tool-list checkbox is changed.
    // hide or show .wsp-tool-container depending on whether any tools are visible.
    // Call this when a page changes or when a tool-library checkbox changes. 
    var tools = sketchDoc.tools,
        $container = $('.wsp-tool-container', sketchDoc.canvasNode),
        $baseNode = $container.closest( '.wsp-base-node'),
        $toolElements = $('.wsp-tool', $container),
        containerWidth, someEnabled;
    if ($('.wsp-undo-redo-container', $container).length > 0) {
      return; // Don't hide or adjust the tool-column if it contains undo/redo
    }
    if (!tools || !$container.length || !$toolElements.length) {
      $container.hide();
      return;
    }
    someEnabled = tools.some (function (tool) {
      var $el = tool.$element;
      return $el && $el.css('display') === 'block';
    });
    WIDGETS.setVis ($container, someEnabled);
    containerWidth = someEnabled ? $container.outerWidth() : 0;
    $baseNode.width( sketchDoc.docSpec.metadata.width + containerWidth );
  } // checkToolEnabling
  
  function initPageButtons (sketchDoc) { // Init page buttons for this doc
    var sketchNode = sketchDoc.canvasNode[0],
        $btnBar = sketchDoc.canvasNode.siblings('.wsp-button-bar'),
        $control = $ (".wsp-page-buttons", $btnBar),
        pageCtlEnabled = WSP.PREF.getPref (sketchDoc, "pagecontrol"),
        resetEnabled = WSP.PREF.getPref (sketchDoc, "resetbutton"), // resetbutton should be a per-page option.
        $fname = $('.wsp-file-name', $btnBar),
        logo = WSP.PREF.getPref (sketchDoc, "wsplogo"),
        newContent, btnBarContent, $utilMenu;
    if (WSP.PREF.getPref (sketchDoc, "filenameinbuttonbar")) {
      $fname.show();
    } else {
      $fname.hide();
    }
    if ($control.length === 1 && pageCtlEnabled) {
      // Omit pageNum here; the pageNum will be set by the DidChangeCurrentPage handler.
      newContent = '<button class="wsp-page-btn wsp-page-prevBtn" aria-label="Previous Page">&nbsp;</button><div style="display:inline-block; position:relative;"><button class="wsp-page-num"></button></div><button class="wsp-page-btn wsp-page-nextBtn" aria-label="Next Page">&nbsp;</button></span>';
      $control.html (newContent);
      if (sketchDoc.docSpec.pages.length > 1) {
        $control.addClass ("wsp-page-buttonsActive");
        if (!$btnBar.length) { // An active page control must be inside the wsp-button-bar
          btnBarContent = '<div class="wsp-button-bar"></div>';
          var $buttons = $control.detach();
              $btnBar = $(btnBarContent);
              $btnBar = $btnBar.append ($buttons);
              $(sketchNode).after($btnBar);
//          $btnBar = $(sketchNode).after($control.detach().appendTo ($(btnBarContent)));
        }
      }
      $control.find(".wsp-page-num").on ("click", {node: $btnBar}, function (e) {
        showPageNumPopup (sketchNode);
        return false; // eat any clicks on the page number
      });
      $control.find(".wsp-page-prevBtn").on ("click", {node: $btnBar}, function (e) {
        goPageByIndex1 (sketchNode, getCurPageIndex1(sketchNode) - 1);
        return false; // eat clicks
      });
      $control.find(".wsp-page-nextBtn").on ("click", {node: $btnBar}, function (e) {
        goPageByIndex1 (sketchNode, getCurPageIndex1(sketchNode) + 1);
        return false; // eat clicks
      });
      goPageById (sketchNode, sketchDoc.metadata["start-page"]);
    }
    // Reset can appear only if there's a wsp-button-bar
    // TO DO: If the Reset button already exists and resetEnabled has per-page settings, add the appropriate classes
    // The code below assumes that Reset doesn't exist. The best course may involve removing the existing button.
    // TO DO: Figure out how to arrange $btnBar if the sketch is too narrow to fit all the buttons into its width.
    // The solution likely requires a multi-line $btnBar layout.
    if ($btnBar.length === 1) { // there is a wsp-button-bar.
      if (resetEnabled.length && resetEnabled[0] !== "none" &&
              $(".wsp-reset-button", $btnBar).length === 0) {
        newContent = '<button class="wsp-reset-button';
        if (resetEnabled[0] !== "all" && resetEnabled !== 'all') {
          newContent += ' page_toggle';
          resetEnabled.forEach (function (num) {
            newContent += ' p_' + num;
          });
        }
        newContent += '" onclick="PAGENUM.resetPage(this);">Reset</button>';
        $btnBar.append (newContent);
      }
      if (logo && $(".wsp_logo", sketchNode).length === 0) {  // Insert logo only if it's not there already
        newContent = '<div class="wsp_logo"></div>';
        // Float this left, but after util-menu-btn if it exists.
        $utilMenu = $btnBar.find(".util-menu-btn");
        if ($utilMenu.length > 0)
          $utilMenu.after (newContent);
        else
          $btnBar.prepend (newContent);
      }
    }
  } // initPageButtons

  function highlightPopup (doc) {
    var pageNum = getCurPageIndex1(doc.canvasNode),
        items = $getBarCtl( '.page-popupNum', doc.canvasNode );
    if (items.length > 0) {
      $(items).css ("background-color", "#fff");
      $(items[pageNum-1]).css ("background-color", "#ccc");
    }
  }
  
  function showHidePageInfo (doc) {
    //  Show or hide html elements based on the class.
    //  Use <div class="page_toggle p_2 p_3"> for elements
    //  to appear when the sketch displays page 2 or page 3.
    //  These element must be within the sketch_container.
    var $canvas = doc.canvasNode,
        $container = $canvas.closest(".sketch_container"),
        elements = $container.find (".page_toggle"),
        pageNum = doc.focusPage.metadata.id;
    if (elements.length) {
      elements.hide();
      elements.filter (".p_" + pageNum).show();
    }
    // IS THE FOLLOWING IRRELEVANT NOW THAT attachToNode() HANDLES THE UNDO/REDO BUTTONS?
    // Now that tools not intended for this page are hidden, are any left? If not,
    // hide undo/redo buttons in the wsp-tool-column. 
    var noToolsVisible = $canvas.find('.wsp-tools-inner').height() === 0;
    if (doc.getAuthorPreference('UndoRedoInButtonBar') && noToolsVisible) {
      // Hide the tool column, including undo/redo and ok/cancel
      //$canvas.find('.wsp-tool-column').hide();
      $container.find('.wsp-ok-cancel-container').hide();
      // And show undo/redo in the button bar.
      doc.attachUndoRedo();
    }
  }  // showHidePageInfo

  function enablePagePseudobutton(pseudoBtn, enabled)
  // page buttons are pseudo, currently implemented as <span>, so
  // we have to provide button semantics on our own
  {
  // #IF (true)
  	pseudoBtn.prop('disabled', !enabled);
  /* #ELSE
  
  	pseudoBtn.css("opacity", enabled ? "1" : "0.4");
  	if (enabled)
  		pseudoBtn.attr("tabindex", "0");
  	else
  		pseudoBtn.removeAttr("tabindex");
  		
  	#ENDIF
  */
  }
  
  function showPageNum (doc) {  // Set the page number in the control, and the opacity of the buttons
    var sketch = doc.focusPage,
        pageNum = doc.getIndexForPageId( sketch.metadata.id ) + 1,
        numPages = doc.docSpec.pages.length,
        pageCtl = $getBarCtl( '.wsp-page-buttons', doc.canvasNode );
    if (pageCtl) {
      if (numPages > 1) {
        pageCtl.show();
      } else {
        pageCtl.hide();
      }
      pageCtl.find (".wsp-page-num").html ("&nbsp;" + pageNum + "&nbsp;");
      enablePagePseudobutton(pageCtl.find(".wsp-page-nextBtn"), pageNum < numPages);
      enablePagePseudobutton(pageCtl.find(".wsp-page-prevBtn"), pageNum > 1);
      highlightPopup (doc);
    }
    showHidePageInfo (doc);
  }  // showPageNum

  function pageChanged( event, context) {
    showPageNum( context.document );
    checkToolEnabling( context.document );
  }

  function init () {  // The buttons cannot be created until the sketch is loaded and we know whether it contains more than a single page.
    var $canvasNodes = $('.sketch_canvas');
    $canvasNodes.off ("DidChangeCurrentPage.WSP", pageChanged).on ("DidChangeCurrentPage.WSP", pageChanged);
  }
  
  function initDoc (doc) {  // The buttons cannot be created until the sketch is loaded and we know whether it contains more than a single page.
    var pageId = doc.metadata['start-page'],
        page = doc.pageData[pageId];
    page.session.traces = page.spec.traces;    // possibly undefined
    doc.canvasNode.once ("DidChangeCurrentPage.WSP", pageChanged);
    initPageButtons (doc);
  }
  
  function docLoaded( event, context ) {
    // This is the PAGENUM handler for the LoadDocument.WSP message
    initDoc (context.document);
    // showPageNum (context.document); No need, didChangeCurrentPage event will make this call.
    setToolEnabling( context.document );
  }
    
  function goPageById( sketchNode, pageId ) {
    // Before switching pages, save traces on the current page. These traces will be used
    // when the page is shown again or when it's downloaded, 
    // As soon as those traces are saved, perform the actual switch.
    var doc = getDoc( sketchNode ),
        sketch = doc.focusPage;

    function traceCallback (data) { // don't switch pages until traces are saved.
      WIDGETS.cachePageActiveWidget();
      doc.switchPage (pageId); // the page control, and the popup (if active) will be updated by a DidChangeCurrentPage message
    }

    if (pageId !== sketch.metadata.id) {
      if (sketch.preferences.fadeTraces) {
        traceCallback(); // not saving traces, so switch immediately
      } else {
        sketch.saveTraces (traceCallback, 'pageswitch'); // switch once traces are ready
      }
    }
  } // goPageById

  function goPageByIndex1 (sketchNode, pageIndex1) {
    // go to the page at the given 1-based index into the array of pages
    // The 1-based index corresponds to the page numbering in the page control UI
    var doc = getDoc (sketchNode),
        pageArr = doc.docSpec.pages,
        index0 = pageIndex1 - 1;
    if (index0 < 0 || index0 > pageArr.length - 1) {
      console.log('goPageByIndex1() called with pageIndex0 out of range: ' + index0);
      return;
    }
    goPageById (sketchNode, pageArr[index0].metadata.id);
    // the page control, and the popup (if active) will be updated by a DidChangeCurrentPage message 
  }

  function showPageNumPopup (sketchNode) { // Put up a modal window above the page #
    var pageCtl = $getBarCtl( '.wsp-page-buttons', sketchNode ),
        doc = getDoc (sketchNode),
        numPages = doc.docSpec.pages.length,
        content = '';
    
    function hidePageNumPopup (sketchNode) {
      // Remove the handlers for this popup.
      var p = $getBarCtl( '.wsp-page-buttons', sketchNode );
      p.find(".page-popupNum").off ("mouseover");
      p.find(".page-popupNum").off ("click");
      p.find(".wsp-page-num").focus();
      p.find('.wsp-page-popup').remove();
      $(window).off ("keydown");
    }
    
    function windowKeydown(e) {
      var key = e.which,
          curIndex1 = getCurPageIndex1(sketchNode);
      if (key === 13 || key === 27) { // return or escape key
        hidePageNumPopup (sketchNode);
        return false;
      }
      if (key >= 37 && key <= 40) { // arrow keys
        if (key <= 38) goPageByIndex1 (sketchNode, curIndex1 - 1); // left and up arrows
        else goPageByIndex1 (sketchNode, curIndex1 + 1);  // right and down arrows
        return false;
      }
      if (key > 48 && key < 58) { // digits 1 thru 9
        goPageByIndex1 (sketchNode, key - 48);
        return false;
      }
    }

    function makeBtn (pageNum) {
      return '<button class="page-popupNum">' + pageNum + '</button>';
    }

    if (pageCtl.find(".wsp-page-popup").length > 0) {
      hidePageNumPopup(sketchNode);
      return;
    }
    content = makeBtn (1); // create the popup window, with each element a span of class page-popupNum containing a page #
    for (var i = 2; i <= numPages; i+=1) {
      content += (i === 1 ? '' : '<br>') + makeBtn(i);
    }
    var element = $.parseHTML ('<div class="wsp-page-popup" tabIndex="0">' + content + '</div>'),
        $element = $(element);
    pageCtl.find (".wsp-page-num").after ($element); // Show the popup.
    var ht = $element.outerHeight() + 1;  // fudge: how to get this right? Safari is erratic on zooming.
    $element.css ({top: -ht + "px", left: "3px"});
    highlightPopup (doc);
    $element.focus();
    GSP.WspHelp.showHelp (doc, 'wsp-page-popup', $element);
    
    pageCtl.find(".page-popupNum").on ("mouseover", {node: sketchNode}, function (e) {
      goPageByIndex1 (sketchNode, this.innerText.trim());
    });
    
    pageCtl.find(".wsp-page-popupNum").on ("click", {node: sketchNode}, function (e) {
      goPageByIndex1 (sketchNode, this.innerText.trim());
      hidePageNumPopup (sketchNode);
      return false; // eat any clicks on the numbers
    });
    $(window).one ("click", {node: sketchNode}, function (e) {
      if (!$(e.target).hasClass("wsp-page-num")) {
        hidePageNumPopup (sketchNode);
        return false;
      }
    });
    $element.once ('blur', function () {
        hidePageNumPopup (sketchNode);
      });
    $element.once ('focusout', function () {
        hidePageNumPopup (sketchNode);
      });
    $(window).off ("keydown");  // turn off any already-active keydown handler
    $(window).on ("keydown", windowKeydown);
  } // showPageNumPopup

  function activatePageCtl( $btnBar, sketchDoc ) {
    // Show or hide button-bar elements based on user prefs and the current page.
    var pageCtlEnabled = WSP.PREF.getPref (sketchDoc, "pagecontrol"),
        $sketchNode = sketchDoc.canvasNode,
        $button = $(".wsp-page-buttons", $btnBar),
        newContent;
    if (!$button.length) {
      return;
    }
    if (sketchDoc.docSpec.pages.length < 2 || !pageCtlEnabled) {
      $button.hide();
    } else {
      newContent =  // pageNum will be set by the DidChangeCurrentPage handler.
        '<div class="wsp-page-buttons">' +
          '<button class="wsp-page-btn wsp-page-prevBtn" aria-label="Previous Page" title="Go to previous page.">&nbsp;</button>' +
          '<div style="display:inline-block; position:relative;"><button class="wsp-page-num" title="Click to show list of pages."></button></div>' +
          '<button class="wsp-page-btn wsp-page-nextBtn" aria-label="Next Page" title="Go to next page.">&nbsp;</button>' +
        '</div>';
      $button.replaceWith( $( newContent ) );
      $button = $(".wsp-page-buttons", $btnBar);
      $(".wsp-page-num", $button).on ("click", {node: $sketchNode}, function () {
        showPageNumPopup ($sketchNode);
        return false; // eat any clicks on the page number
      });
      $(".wsp-page-prevBtn", $button).on ("click", {node: $sketchNode}, function () {
        goPageByIndex1 ($sketchNode, getCurPageIndex1($sketchNode) - 1);
        return false; // eat clicks
      });
      $(".wsp-page-nextBtn", $button).on ("click", {node: $sketchNode}, function () {
        goPageByIndex1 ($sketchNode, getCurPageIndex1($sketchNode) + 1);
        return false; // eat clicks
      });
      $button.show();
    }
  } // activatePageCtl
    
  return {  // PAGENUM public functions and variables

    initPageControls: function () {
      init ();
    },

    activatePageCtl: function( $btnBar, sketchDoc ) {
      activatePageCtl( $btnBar, sketchDoc );
    },
    
    resetPage: function (e) { // button handler for the Reset Sketch button
      var doc = getDoc (WIDGETS.$relatedSketchNode (e.target));
      //    history = doc.getCurrentPageSession().history;
      //if (history) {
      //  history.undo('all');
      //} else { // if no history, use the doc spec.
      //  doc.resetActivePage ();
      //}
      doc.undo('all');
      doc.focusPage.restoreTraces ();
      WIDGETS.targetControllerToDoc (doc);
    },
    
    gotoPage: function (btn, pageNum) {
      var $sketchNode = WIDGETS.$relatedSketchNode (btn);
      WIDGETS.cachePageActiveWidget();
      getDoc($sketchNode).switchPage(pageNum);
    },
    
    setToolEnabling: function (sketchDoc) {
      setToolEnabling (sketchDoc);
    },
    
    checkToolEnabling: function (sketchDoc) {
      checkToolEnabling (sketchDoc);
    },
    
    docLoaded: function( event, context ) {
      // This is the PageNum handler for the LoadDocument.WSP message
      docLoaded( event, context);
    }
    
  };
})(); // PAGENUM


var UTILMENU = (function() {  // define the UTILMENU namespace.
  // The Utility menu allows the user to:
  // set the angle and distance units for each page of a sketch, and
  // download the existing sketch and upload a new sketch to work on.
  // Angle and distance units are determined per-poge, so a sketch author can use different units on different pages.
  // Their check marks are set/cleared by the DidChangeCurrentPage.WSP event.
  // Downloading and uploading are per sketch, since they upload or download all pages of the current sketch.
  // Thus their values are set by the LoadDocument.WSP event.
  // To facilitate this, the button itself is of class util-menu-btn, and contains two elements:
  // The angle/distance units are in class util-unit-items, and the upload/download are in util-file-items.
  // Each command stores its unit's shortName, as these are the names stored in the sketch's unit prefs.
  // The menu button's location is determined by a .util-menu-btn div inside the parent element of the sketch_canvas.
  // (If there is no .util-men-btn div, the Utility menu does not appear.)
  

  var $utilButton, $utilMenu, $utilCanvas, $utilHtml, $fileNameInput, widgetWasVisible, showChooserAfterDownload;
  /* The currently active util button and util menu are set when creating a sketch's util menu.
   * $utilCanvas is set when the utility menu is moved to a new sketch_canvas and remains in effect until the utility menu is detached.
   * (To prevent multiple menus from appearing in a webpage with multiple sketches, a tap on a util menu button
   * should NOT show its menu if any other utility menu is already visible.)
   * widgetWasVisible tracks whether widgets were visible when the Util menu was shown.
   * showChooserAfterDownload, if true, shows the file-chooser for uploading as soon as the current download is finished.
   * */

  /* With Chrome and Firefox we can check the focusout event's relatedTarget to tell whether focus is leaving the util menu
   * (requiring us to hide the menu) or just changing to another util menu element (leaving the menu showing).
   * But Safari's focusout sets relatedTarget to null, so set a timer that will hide the menu unless
   * another menu item receives a focusin, in which case we clear the timer, leaving the menu visible.
   * */
  
  function unitToItem (unit) {
    // Convert the unit's shortName to the prefs menu command
    // (The sketch prefs stores each unit by its shortName)
    switch (unit) {
      case "signed deg" : return 'degrees(+/-)';
      case "deg": return 'degrees(+)';
      case "rad": return 'radians';
      case "cm" : return 'cm';
      case "in.": return 'inches';
      case "pix":
      case "px" :return 'pixels';
    }
  }

  function connectUtilHtml( $targetNode ) {
    // Create $utilHtml if needed. Then connect it to the new target, disconnecting first if necessary
    // Called when widgets are targeted to a new sketch_container.
    var $newContainer = $targetNode.parent(),
        $oldContainer;
    $oldContainer = $utilHtml.parent();
    if (!$newContainer.length && !$oldContainer.length) {
      return;
    }
    if ($oldContainer.length) {
      if ($oldContainer[0] === $newContainer[0]) {
        return; // utilHtml is already connected properly; nothing to do
      }
      $utilHtml.detach(); // otherwise, detach before appending (detach preserves data & handlers)
    }
    $utilHtml.appendTo( $newContainer );
    $fileNameInput = $('#file-name-input');
  } // connectUtilHtml
  
  function createUtilMenu ($sketchCanvas) {    // Create the utility menu and handlers for this sketch
    var scriptPath =  WIDGETS.getScriptPath(),
        $btnBar = BUTTONBAR.$getBar( $sketchCanvas ),
        $visiblePopup,  // the visible precision popup in this menu, if any
        newContent;
     
    function unitCmdHtml( unitFamily, units, key ) {
      var helpKey = (unitFamily === 'length' ? 'length-' + key : 'angle-' + key),
          helpAttr = ' helpKey = "' + helpKey + '" ';
      return  '<button class="util-menu-item util-menu util-' + unitFamily + '"' +
              ' data-unit="' + units + '"' + helpAttr + '> &nbsp; ' + unitToItem( units ) +
              '</button>';
    }
    
    function defaultPrecisionFor( unit ) {  // returns default number of places
      switch (unit) {
        case 'in.':
        case 'in':
        case 'cm': 
        case 'rad': return 2;
        case 'deg':
        case 'signed deg': return 1;
        case 'pix':
        case 'px':return 0;
        default:
          console.log('defaultPrecisionFor "' + unit + '" is undefined.' );
          return 2;
      }
    }
    
    function handleUnitChange( e ) {
      // The user has changed the unit setting for the current category ('length' or 'angle').
      var $btn = $(e.target),
          unitFamily = $btn.hasClass('util-length') ? 'length' : 'angle',
          newUnit = $btn.data("unit");
      WSP.PREF.setUnitPref ($utilCanvas, unitFamily, newUnit);
      updateUnitCheckmarks($utilMenu);
    } // handleUnitChange
    
/* BEHAVIOR AND SPECS FOR .precision-div
 * Desired behavior unifies keyboard-user and mouse-user experiences:
  * When the precision-popbutton is clicked to show the precision-div, the current precision setting
  * in the sketch is recorded in the precision-div data, making it possible for the user to cancel via Escape.
  * When a 'change' event signals that a different radio button is selected (by arrow key or by mouse),
  * we immediately change the sketch preference and modify the affected value gobjs in the sketch,
  * giving the user immediate feedback as to the result of her change. She is free to click on or arrow to other buttons
  * to see their effect.
  * A click event on the currently-selected radio confirms that setting and closes the Precision box.
  * An Escape-key event anywhere in the box closes the box and reverts to the previously-recorded choice.
  * Events (set on .precision-radio unless otherwise noted):
  * 'change': Modify the sketch precision setting and the precision of all affected gobjs.
  * 'keydown': Escape calls the cancel function and stops propagation. Other keys (include arrows) propagate.
  * 'click' on the selected radio calls confirm. 'click' is ignored on any other radio, in favor of 'change'.
  * 'mouseup' on any radio button: should we record its target and timestamp?
  * 'focusout' on .precisionPopup: if the selection differs from the current sketch setting, call confirm.  
 **/
    
    function handlePrecisionChange( e ) {
      // The user has changed the precision radio button for the current category ('length' or 'angle').
      var $radio = $(e.target),
          doc = $utilCanvas.data('document'),
          prefs = doc.focusPage.preferences.precision,
          unitFamily = $radio[0].name === 'precision-length' ? 'length' : 'angle',
          newPrecision = parseInt($radio.val(), 10);
          
      function checkGobj() {
        var kindOK = this.kind === 'Measure' || this.isParameter() || this.kind === 'Expression',
            familyOK = this.unitsObject[unitFamily];
        if (!(kindOK && familyOK)) {
          return; // bail unless kind and family are OK
        }
        // A precision change is easy to handle for now: it always affects the entire sketch,
        // so we can change every gobj's precision and invalidate their geom to realize it.
        // Once precision can be changed gobj by gobj or value by value, we'll have to handle it.
        this.style.precision = newPrecision;
        this.invalidateGeom(); // shouldn't it be enough to invalidateAppearance?
      }  // checkGobj
          
      if (newPrecision > 3) {
        console.log('precision-radio out of range.');
      }
      prefs[unitFamily] = newPrecision;
      console.log('handlePrecisionChange needs to update the button and measurements in the sketch');
      doc.sQuery('Measure').each( checkGobj );
      doc.sQuery('Expression').each( checkGobj );
    } // handlePrecisionChange
    
    function precisionDivHtml ( unitFamily ) { // unitFamily is 'length' or 'angle'
      // Generate html for the precision input div, using the default for the current unit
      // The resulting hidden dropdown is the next .precision-popup sibling of the button.
      // First iteration just shows the default. Final iteration is a popup to choose precision.
      var sketch = $utilCanvas.data('document').focusPage,
          prefs = sketch.preferences,
          unit = prefs.units[unitFamily],
          places = defaultPrecisionFor( unit ).toString(),
          ix, ret;
          
      function placeName(n) {
        switch (n) {
          case 0: return 'units';
          case 1: return 'tenths';
          case 2: return 'hundredths';
          case 3: return 'thousandths';
        }
      }
      
      function precisionChoice(p) {
        var pCat = 'precision-' + unitFamily,
            id = pCat + p,  // Need a unique id for the button's label
            st;
        st = '<label>' +
              '<input type="radio" id="' + id + '"class="precision-radio" name="' + pCat + '" value="' + p +'">';
        st += placeName(p) + '</label>';
        if (p < 3) {
          st += '<br>';
        }
        return st;
      }
      
      // right-pointing triangle: &#25B6; ▶
      ret = '<div class="precision-div">';
      ret += '<button class="precision-popbutton pop-' + unitFamily + '" helpkey = "pop-' + unitFamily + '"';
      ret += ' value="' + places + '">Precision  &nbsp; ▶︎</button>';
      ret += '<div class="precision-popup" helpkey="popup-precision">';
      for (ix = 0; ix < 4; ix++) {
        ret += precisionChoice(ix);
      }
      ret += '</div></div>';
      return ret;
    } // precisionDivHtml
    
    function addPrecisionListeners() {
      /* Installs listeners on both .precisionDiv elements. They'll only be called when their element is visible.
      /* It's tricky to hide the precision popup menu when the focus leaves it: navigating precisionDiv elements
       * propagates focusout events up to the menu. So listen for focusin anywhere else on the page EXCEPT the popup.
       * Adapted from from https://stackoverflow.com/questions/5337828/hide-a-div-when-it-loses-focus-blur
       **/
      var mouseupTimerID;
          
      $('.precision-radio').once('change', handlePrecisionChange);
    
      $(".precision-popbutton", $btnBar).once('click keydown', showPrecisionPopup);
      
      $(".precision-radio", $btnBar).once('mouseup', function() {
        // If this mouseup occurs just before a click, the user has mouse-clicked the radio button.
        // If not, the click must be from a keypress (space or return) on the focused button.
        // So we set mouseTimerID to a truthy value for 20ms. It probably could be shorter,
        // but it's more than long enough for an associated click event to arrive.
        mouseupTimerID = setTimeout( function() {
          console.log ('timer ' + mouseupTimerID + ' ended at ' + Date.now());
          mouseupTimerID = null;
        }, 20);
        console.log ('timer ' + mouseupTimerID + ' started at ' + Date.now());
      });

      $(".precision-radio", $btnBar).once('keydown click', function(e) {
        // Change the settings to match the new button
        // If it's from a mouse click, we hide the precision pane,
        // but if it's from an arrow key we leave the pane visible.
        // In either case we set the prefs to match the target button.
        var $popup = $(this).closest('.precision-popup'),
            $popButton = $popup.prev(),
            isClick = mouseupTimerID && e.type === 'click',
            isConfirmKey = (e.type === 'keydown') && [13, 27, 32].includes( e.which );
        // If it's a mouse click, or a non-arrow key, confirm current setting and hide the popup
        // (If it's an arrow key, ignore here and the resulting change event will register.)
        if (isClick || isConfirmKey) {
          // console.log('type: ' + e.type + ', which: ' + e.which + ', timer: ' + mouseupTimerID);
          $popup.hide();  // an actual mouse-click should hide the 
          $popButton.trigger('focus');  // focus on the button
          e.stopPropagation();
          e.preventDefault();
          if (e.which !== 27) { // record changes if it's not the escape key
            handlePrecisionChange( e );
          }
        } 
      });
    }  // addPrecisionListeners

    function hidePrecisionPopup() {
      // Hide the popup; no need for the listener
      doHidePopup($('.precision-popup'));
    }

    function showPrecisionPopup( e ) {  // e.target is a .precision-popbutton
      // Show the popup and install listeners
      var $popButton = $(e.target),
          $popup = $(e.target).nextAll('.precision-popup:first'), // get the right precision-popup (not both) 
          unitFamily = $popButton.hasClass('pop-length') ? 'length' : 'angle',
          doc = $utilCanvas.data('document'),
          prefs = doc.focusPage.preferences.precision,
          val = prefs[unitFamily],
          shift = '' + (-20*val) + 'px',
          topForVal = {top: shift},
          $radios = $('.precision-radio', $popup),
          $curBtn = $($radios[val]);
      if (e.type === 'keydown' && e.keyCode !== 39) {
        return;
      }
      $curBtn.prop('checked', true);
      // Put the current value next to the mouse...
      $popup.css(topForVal);
      doShowPopup( $popup);
      $curBtn.trigger('focus');
      // popup is now visible: Create listener for a focusin anywhere else on the page
      $('html').on( 'focusin', hidePrecisionPopup );
    } // showPrecisionPopup
      
/* Managing utility-menu visibility: We hide the utility menu, leaving its current settings in place,
 * when the user interacts with other parts of the web page. We do this by listening for focusin and
 * mousedown events elsewhere on the page: both in the html and within the sketch (because mousedowns
 * don't bubble up from the sketch into the html). At the same time, we need to prevent focusin and
 * mousedown events within the util-menu from propagating into the html and hiding the menu as
 * the user interacts with it. (The Upload and Download commands at the top of the menu do generate
 * events that bubble up to the html and hide the util-menu, which is in fact desired behavior.)
 * require any attention. Even if a focusin event comes through, it will hide the menu without
 * interfering with the dialog's operation.
 * The precision popups use the same strategy, so we need to coordinate with them.
 **/
    function doShowPopup( $popup ) {
      $visiblePopup = $popup;
      $popup.on( 'focusin mousedown', function( e ) {
        e.stopPropagation();  // don't let focusin or mousedown events within $popup reach $utilMenu
      });
      $popup.show();
    }
    
    function doHidePopup( $popup ) {
      $popup.off('focusin mousedown');
      $popup.hide();
      $visiblePopup = null;
    }
    
    function setUploadButton($btn) { // make a click on $btn open the file chooser and upload a file
      // Candidates are $uploadBtn ("Upload..." in the utility menu) and .util-popup-upload "Upload new sketch" in the popup dialog.
      // We remove the original click handler for $btn, so need to restore it when the util menu is hidden.

      function doLoad(ev) {
        // console.log('doLoad called with file info: ev = ', ev);
        if (this.files && this.files[0]) {
          doLoadSketch(this.files[0], ev.target);
        }
        hideUtilMenu(); // needed to remove focus from the upload command
        // After loading a new sketch, focus should return to the Utilmenu button. However, it currently
        // goes to the document.body, even though hideUtilMenu() tries to focus on the Utilmenu button.
        // TODO: figure out how to fix this...
      }
      
      function handleClick() {  // send the click on to $fileNameInput and listen for the resulting change
        // console.log( 'Initiating Chooser via e: ', e);
        $fileNameInput.click();
        $fileNameInput.on ('change', doLoad);
      }
      
      // console.log( 'Setting file chooser button to: ', $btn);
      $fileNameInput.off('change');
      $fileNameInput[0].value = '';
      $btn.off('click').on('click', handleClick);
    } // setUploadButton
    
    //function initializeUploadHandlers() {
    //  // Set the handlers for the buttons that may get set up as fileChooser handlers: $uploadButton or $uploadDlg .
    //  
    //}
    
    function showUtilMenu() {
      
      function prepareUtilMenu() {
        /* Before actually showing the menu, we have to prepare the handler for the upload button,
         * because the user's click on that button must immediately show the file-open dialog if the sketch is unchanged,
         * or show the dialog that allows the user to save the current sketch before uploading.
         * The file-open dialog must open directly from a user click, as security safeguards prevent us
         * from opening the dialog via a jQuery .click() call. We must make it into an input element of type 'file'.
         **/
        var $uploadDlg = $('#upload-modal'),
            $uploadBtn = $('.util-upload', $btnBar),
            warnUser;
            
        function showUploadDlg() {
          $uploadDlg.show();
          $('#downloadBeforeUpload').focus ();
          setUploadButton($('.util-popup-upload', $uploadDlg));
        }
     
        //$fileNameInput.attr ("onchange", doLoad);
        //$uploadBtn.off('click');
        warnUser = docHasChanged ($utilCanvas) && WSP.PREF.shouldEnableForPage ('download', 'util', $utilCanvas.data('document'));
        //  Warn user if the sketch has changed and downloads are enabled.
        if (warnUser) {
          $uploadDlg.find('.util-popup-content').tinyDraggable ({exclude: ".dragExclude"});
          // Clicking $uploadBtn should show $uploadDlg 
          $uploadBtn.off('click').on('click', showUploadDlg );
          prepareDownload (); // Give user a chance to save first
          $uploadDlg.off ("keyup");
          $uploadDlg.on ("keyup", function (e) {
            if (e.keyCode === 27) {
              UTILMENU.closeModal ('upload-modal', 'cancel');
            } 
          });
        } else {
          // console.log('Setting $uploadBtn handler to call getFileToOpen');
          setUploadButton( $uploadBtn );
          //$uploadBtn.on('click', getFileToOpen);
        }          
      } // prepareUtilMenu
      
      // body of showUtilMenu
      widgetWasVisible = $('#widget').is(':visible');
      WIDGETS.showWidgets(false); // Hide widgets while util menu is visible
      // focus or mousedown anywhere outside the menu hides the existing menu
      $('html').on( 'focusin mousedown', hideUtilMenu);
      $('.wsp-clip-node', '.sketch_canvas').on( 'focusin mousedown', hideUtilMenu);
      $utilMenu.on('focusin mousedown',  function(e) {
        // focusin or mousedown within the menu hides any precision popup,
        // but doesn't propagate to the html, which would hide the menu.
        if ($visiblePopup) {
          hidePrecisionPopup( $visiblePopup );
        }
        e.stopPropagation();
      });
      prepareUtilMenu();
      $utilMenu.show();
      $('.util-upload', $utilMenu).focus();
    } // showUtilMenu
    
    function hideUtilMenu() {
      if (widgetWasVisible) {
        WIDGETS.showWidgets(true);
        widgetWasVisible = null;
      }
      // turn off our listeners
      $('html').off( 'focusin mousedown', hideUtilMenu );
      $('.wsp-clip-node', '.sketch_canvas').off( 'focusin mousedown', hideUtilMenu);
      $utilMenu.off( 'focusin mousedown', hideUtilMenu );
      $utilMenu.hide();
      $utilMenu.prevObject.focus();
    }
  
    function handleUtilBtnClick(e) {
      var doHide, test;
      // Need to set $utilButton and $utilMenu to target the current sketch. $btnBar is in the createUtilMenu closure.
      $utilButton = $(e.currentTarget);
      $utilCanvas = $('.sketch_canvas', $utilButton.closest('.sketch_container'));
      connectUtilHtml ( $utilCanvas );
      $utilMenu = $utilButton.next();
      $utilMenu.data ('canvas', $utilCanvas);
      // Check for $btnBar
      doHide = $utilButton.data( 'menuVisible' );
      test = $utilMenu.is(':visible') === doHide;
      if (!test) {
        console.log('INVALID TEST FOR HIDDEN UTILITY MENU!!');
      }
      if (updateUnitCheckmarks ($utilMenu)) { // false return value ==> sketch is not yet instantiated
        if (doHide) {
          hideUtilMenu();
        } else {  // show the menu, putting its bottom just above canvas bottom
          $utilMenu.css({top: $utilCanvas.innerHeight() - $('.util-menu-container').innerHeight() - 2});
          showUtilMenu();
        }
      }
    } // handleUtilBtnClick
    
    function addUtilMenuListeners() {
      $('.util-length, .util-angle').once( 'click', handleUnitChange);
      $utilButton.once( 'mousedown', function() {
        // Cache the menu's visibility at the moment of mousedown, before the click occurs.
        $(this).data( 'menuVisible', $utilMenu.is( ':visible' ));
      });
      $utilButton.once( 'click', handleUtilBtnClick);
    }
          
    /* We want to hide the utility menu when it "loses focus," that is, when no menu item is focused
     * because focus is no longer within the menu. But when focus moves from old to new within the menu,
     * there's a sequence of blur(old, new), focusout(old, new), focus(new, old), and focusin(new, old) events,
     * where the parens indicate the values of e.target and e.relatedTarget respectively.
     * Strategy: listen for the focusout event, and hide the menu iff e.relatedTarget is not within the menu.
     **/
    //function clearFocusTimer () {
    //  clearTimeout( focusoutTimer );
    //  focusoutTimer = null;
    //}
    
    function hideOnEscape(e) {
      if (e.which === 27) {  // Escape hides the menu.
        hideUtilMenu(e);
        $utilButton.focus();
      }
    }

    function makeUtilHtml () {
      var downloadHTML, uploadHTML, fileNameHTML;
    // jshint multistr:true
    // jshint -W044
      downloadHTML = "\
        <div class=\"util-popup\" id=\"download-modal\">\
          <div class=\"util-popup-content\">\
            <div class=\"util-popup-title\">Download Sketch File</div>\
            <p class = \"util-popup-legend\">The file will be stored with your Downloads.</p>\
            <p class = \"util-popup-legend\">The filename must end with \".json\" or \"-json.js\".</p>\
            <p class = \"util-popup-legend\">(No spaces or parentheses allowed with \"-json.js\".)</p>\
            <div class=\"util-div-fname\">\
              <label for=\"util-fname\">Name: </label>\
              <input id = \"util-fname\" type=\"text\" placeholder=\"file name\" \
                title=\"Must end with '.json' or '-json.js'\" autocomplete=\"off\">\
              <span class=\"fname-validity\"></span>\
            </div>\
            <label class = \"save-traces\">\
              <input type=\"checkbox\" id=\"save-traces\">Save traces with sketch\
            </label>\
            <div class=\"util-popup-button\">\
              <button id=\"downloadOK\" class=\"close util-popup-button\" disabled=\"true\"\
                onclick=\"UTILMENU.closeModal ('download-modal', 'download');\"> OK </button>\
              <button id=\"downloadCancel\" class=\"close util-popup-button\"\
                onclick=\"UTILMENU.closeModal ('download-modal', 'cancel');\"> Cancel </button>\
            </div>\
          </div>\
        </div>";
      uploadHTML = "\
        <div class=\"util-popup\" id=\"upload-modal\">\
          <div class=\"util-popup-content\">\
            <div class=\"util-popup-title\">Upload New Sketch</div>\
            <p class = \"util-popup-legend\">Your sketch has unsaved changes. Do you want to download it first, before uploading a new sketch?</p><br>\
            <div class=\"util-popup-button\">\
              <input type=\"button\" id=\"downloadBeforeUpload\" class=\"close util-popup-button\" value=\"Download this sketch\" onclick=\"UTILMENU.closeModal ('upload-modal', 'download');\"/>\
              <input type=\"button\" class=\"close util-popup-button util-popup-upload\" value=\"Upload new sketch\" onclick=\"UTILMENU.closeModal ('upload-modal', 'upload');\" />\
              <input type=\"button\" class=\"close util-popup-button\" value=\"Cancel\" onclick=\"UTILMENU.closeModal ('upload-modal', 'cancel');\" />\
            </div>\
          </div>\
        </div>";
      fileNameHTML = "\
        <input type=\"file\" id=\"file-name-input\" accept=\".json,.js\" onchange=\"UTILMENU.loadSketch\">\
        <a id=\"downloadLink\" href=\"\" download=\"\">Download\
        </a>";
      $utilHtml = $('<div id="util-html">' + downloadHTML + uploadHTML + fileNameHTML + '</div>');
      $('#util-fname', $utilHtml).on('input', fileNameHandler);
      // Return focus to filename if user clicks save-traces checkbox.
      $('#save-traces', $utilHtml).on('click', selectFileName);
    } // makeUtilHtml
        
    // body of createUtilMenu
    $utilCanvas = $sketchCanvas;  // Set UTILMENU global ($utilButton and $utilMenu will be created)
    $utilButton = $( '.util-menu-btn', $btnBar );
    if (!$utilHtml) {
      makeUtilHtml();
    }
    if (!$utilButton.length) {
      return;  // no button element, so no util menu for this sketch
    }
    // Create the button (an existing element may be a placeholder)
    newContent =  '<button class="util-menu-btn" title="Utility menu for uploading, downloading, and preferences" helpKey="UtilMenuBtn">';
    newContent += '<img class = "util-menu" src="' + scriptPath + 'utility-icon.png" />';
    newContent += '</button>';
    $( '.util-menu-btn', $btnBar ).replaceWith (newContent);
    $utilButton = $( '.util-menu-btn', $btnBar ); // refresh $utilButton, as it's been destroyed.
    // Create the menu in its container
    if ($('.util-menu-container', $btnBar)) {
      $('.util-menu-container', $btnBar).remove(); // Create a new menu rather than worry about changes and listeners
    }
    newContent =  '<div class="util-menu-container">';
    newContent += '<button class="util-file-item util-menu-item util-menu util-upload" helpKey="Upload">Upload...</button>';
    newContent += '<button class="util-file-item util-menu-item util-menu util-download" helpKey="Download" ' +
        'onclick="UTILMENU.download(event);">Download...</button>';
    newContent += '<hr>';
    newContent += unitCmdHtml( 'length', 'cm', 'cm');
    newContent += unitCmdHtml( 'length', 'in.', 'in');
    newContent += unitCmdHtml( 'length', 'pix', 'pixels');
    newContent += precisionDivHtml( 'length'); // display the appropriate unit as part of a popup.
    // newContent += unitDropdown(); // part of precisionDivHtml
    newContent += '<hr>';
    newContent += unitCmdHtml( 'angle', 'signed deg', 'SignedDegrees');
    newContent += unitCmdHtml( 'angle', 'deg', 'Degrees');
    newContent += unitCmdHtml( 'angle', 'rad', 'Radians');
    newContent += precisionDivHtml( 'angle');
    newContent += '</div>';  // util-menu-container
    $(newContent).insertAfter($utilButton);
    $utilMenu = $('div.util-menu-container',$btnBar);
    addPrecisionListeners();
    addUtilMenuListeners();
    $utilMenu.on('keydown', hideOnEscape);
    $utilMenu.parent().on('keydown', hideOnEscape);
  } // createUtilMenu
  
  function enableFileCommands (doc) {  // hide/show the upload/download commands for this sketch doc
    // Create the menu if it doesn't exist.
    var $button = $(doc.canvasNode).parent().find(".util-menu-btn"),
        $fileContent, downEnabled, upEnabled, eitherEnabled;
    if (!$button.length) {
      return;  // no button, so no util menu for this sketch
    }
    $fileContent = $button.find('.util-file-item');
    if (!$fileContent.length) {
      createUtilMenu( doc.canvasNode );
      $fileContent = $button.find('.util-file-items');
    }
    upEnabled = WSP.PREF.getPref (doc, 'uploadutil');
    downEnabled = WSP.PREF.getPref (doc, 'downloadutil');
    eitherEnabled = upEnabled || downEnabled;
    $button.find('util-download').show (downEnabled);
    $button.find('util-upload').show (upEnabled);
    $button.find('util-file-items').show (eitherEnabled);
  }
  
  function updateUnitCheckmarks ($menu) {   // Move the util-menu check marks to match the sketch prefs
      
    var nbsp = " &nbsp; &thinsp;&hairsp; ", // prefix for non-checked items
        doc = $utilCanvas.data ("document"),
        prefs, target, $units;
    if (!doc || !doc.focusPage) {  // Bail if sketch isn't instantiated; we'll be called again on DidChangeCurrentPage
      return false; // signal caller: sketch isn't ready 
    }
    prefs = doc.focusPage.preferences.units;
  
    function setHtml () {
      var st, item = unitToItem( this.dataset.unit );
      if (item === target) {
        st = '&check; ' + item;
      } else {
        st = nbsp + item;
      }
      this.innerHTML = st;
    }
    
    $units = $('.util-length', $menu);
    target = unitToItem( prefs.length );
    $.each($units, setHtml);
    $units = $('.util-angle', $menu);
    target = unitToItem( prefs.angle );
    $units.each (setHtml);
    return true;
  }  // updateUnitCheckmarks


    function hideUtilMenu (e) {  // Hide the util menu in the targeted wsp-button-bar
      var $bar = $(e.target).closest( '.wsp-button-bar' );
      $( '.util-menu-container', $bar).hide();
    }

    function doLoad(e) {
      console.log('doLoad called: e = ', e);
      UTILMENU.loadSketch(this.files[0], e.target);
    }
    
/* Download Strategy: Repeated downloads of a given file are not possible, as all downloads
 * go to the user's designated Downloads folder. There's no way to save to the folder from which
 * the user uploaded the file, and no clean way to allow the user to choose (a) to overwrite
 * the existing file, or (b) to save under a new name. In neither case do we have any way to detect
 * what the user has done, and consequently we have no way to know what filename to use going forward.
 * So our best strategy is to assume the user is working from the Downloads folder and to assume
 * that the proposed download filename should be based on the user's original upload filename or
 * the the user-provided most recent download filename.
 * In either case, we add a version index to the base name and increment the index for each download,
 * thus working around the browser's automatic renaming system for duplicated filenames.
 * Every browser has a different renaming system for name conflicts; there's no accepted standard we can adopt.
 * So we roll our own: to the basename we add a hyphen and a version number preceding the filename extension.
 * At the same time, we try to detect a loaded file's existing version index based on one or another
 * of the conflicting systems, and put that version index into our format.
 * We tentatively increment the version index when the user chooses Download in the Utility menu,
 * displaying that name in the dialog box, and we confirm the incremented name when they confirm the dialog box.
 * (Thus the displayed name in the sketch container is updated in response to the dialog-box confirmation.)
 * */
    
    function downloadSketch (sketchDoc, title) {
      var pageData = sketchDoc.docSpec.pages,
          link = $('#downloadLink')[0],
          saveTracesChecked = $('#save-traces', $('#download-modal'))[0].checked,
          specObj = sketchDoc.getCurrentSpecObject(),
          $nameDisplay = $('.wsp-file-name', sketchDoc.canvasNode.parent()),
          scriptOutput, varName, json, dataBlob, objUrl, contentType, parsed;
      // The download should be in script form if the title ends in ".js" or "-json".
      // For script output, the variable name is the portion of the title up to ".js" or "-json".
      // We set the contentType of the html document to match either .js or .json, required for 
      // some browsers (e.g., safari on mobile devices) that use the browser document's default
      // contentType ('application/text') and add a '.txt' extension, instead of using the
      // contentType implied by the filename extension and leaving the .js or .json extension in place.
      /*
       * pattern=\"(^[a-zA-Z0-9]([a-zA-Z0-9_ \-])*\.json)|(^[a-zA-Z0-9]([a-zA-Z0-9_\-])*\-json\.js)$"
       **/
      
      function prepareTraces() {
        // Each page's traces may be in the form of a Blob or a base64 string.
        // To output to a file, Blob traces must be converted to base64
        var count = 0; // number of pending conversions
        
        function blobToBase64(blob, ix, callback) {
          var reader = new FileReader();
          reader.onload = function() {
              var dataUrl = reader.result;
              // var traces = dataUrl.split(',')[1]; // DON'T remove the header: "data:image/webp;base64,"
              // callback(base64);
              callback ({'ix': ix, 'traces': dataUrl});
              };
          reader.readAsDataURL(blob);
        } // blobToBase64
/*
        function blobToBase64 (callback, id) { // turn the trace webp blob for page id into a base64 dataURL
          var canvas = document.createElement('canvas'),
              spec = sketchDoc.pageData[id].spec,
              width = spec.metadata.width,
              height = spec.metadata.height,
              img = new Image(),
              isBlob = spec.traces instanceof Blob,
              url = URL.createObjectURL(spec.traces);
          if (!isBlob) console.log ('spec.traces is not as blob!!');
          
          img.onload = function() {
            var dataUrl, ctx;
            canvas.width = width;
            canvas.height = height;
            ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            dataUrl = canvas.toDataURL('image/webp');
            callback ({'id': id, 'data': dataUrl});
          };
          img.src = url; 
        } // blobToBase64
*/

        function traceReadyCallback (info) {
          // Put the string-friendly traces into specObj, which is used to create the download
          var spec = specObj.pages[info.ix];
          spec.traces = info.traces;
          count--;
          if (count === 0) {// Is this conversion the last?
            finalizeSave ();
          }
        } // traceReadyCallback
      
        function prepareOnePage (ix, item) {
          // ix is the 0-based index to pageData
          var traceNode;
          if (item.traces) {
            if (item.traces instanceof Blob) { // traces are in Blob form, so convert to base64
              blobToBase64 (item.traces, ix, traceReadyCallback);
            } else { // traces (if they exist) are in base64 form.
              // No conversion is needed, but traces may have changed since this page was focused, 
              // so traces need to be captured
              traceNode = $('canvas', sketchDoc.focusPage.baseNode)[0];
              item.traces = traceNode.toDataURL( 'image/png');
              traceReadyCallback ({'ix': ix, 'traces': item.traces});
            }
          }
        }
        
        // body of prepareTraces
        count = Object.keys(pageData).length;
        $.each (pageData, prepareOnePage);
      } // prepareTraces
      
      function reportTraceSizes () {
        var message = 'Trace sizes in base64 ready for download: ';
        if (TOOLS && TOOLS.checkDebugMode()) {
          $.each (specObj.pages, function (ix, pageSpec) {
            var id = pageSpec.metadata.id,
                traces = pageSpec.traces;
            if (traces && traces.length) {
              message += '  Page ' + id + ': ' + traces.length;
            }
          });
          console.log (message);
        }
      }

      // Traces in Blob form cannot be saved, so prepareTraces has converted Blob traces to base64
      function finalizeSave() { // if saving traces convert them to base64 first
        reportTraceSizes();
        json = JSONcanonical.stringify(specObj, null, 2);
        if (scriptOutput) {
          json = 'var ' + varName + ' = ' + json + ';';
        }
        dataBlob = new Blob([json],{type:"text/plain"});
        objUrl = URL.createObjectURL(dataBlob);
        link.href = objUrl;
        link.download = title;
        link.click();
        // There's no easy way to tell whether this click succeeded, so we assume it did
        // and we save the incremented file name so it can be incremented for the next download
        sketchDoc.event( 'DownloadDocument',
          { document: sketchDoc},
          { fileName: title}
        );
        parsed = parseFileName (title, sketchDoc.canvasNode); // update file name in data
        $nameDisplay.html (parsed.name);  // and in the button bar
        saveSketchChecksum (sketchDoc);
        UTILMENU.closeModal ("download-modal"); // close download modal if it's not already closed...
        URL.revokeObjectURL(objUrl);
        if (showChooserAfterDownload) {
          $fileNameInput.click();
          $fileNameInput.attr ("onchange", doLoad);
          showChooserAfterDownload = null;
        }
      } //finalizeSave
      
      // body of downloadSketch
      if (!checkFileName(title)) {
        return;
      }
      scriptOutput = title.slice(-3) === ".js" || title.slice (-5) === "-json";
      if (scriptOutput) {
        title = title.split(/.js$/)[0].split(/-json$/)[0];
        varName = GSP.normalizeSketchName (title);
        title = varName + "-json.js";
        contentType = "application/javascript";
      } else {
        contentType = 'application/json';
        if (title.slice(-5) !== ".json")
          title += ".json";
      }
      document.contentType = contentType;
      if (saveTracesChecked) {
        // The current page's traceData may not yet have been saved, so grab that data now,
        // and convert all traces to base64 to save them in a normal file.
        prepareTraces ();
        // and add the traces to the specObj
      } else {
        finalizeSave (); // download without traces
      }

    } // downloadSketch
    
    // Select the download dialog file name, without extension
    function selectFileName() {
      var $fName = $('#util-fname'),
          el = $fName[0],
          match;
      $fName.select();
      match = el.value.match(/(.*)(\.json|-json\.js)/);
      if (match && match[1]) {
        el.selectionEnd = match[1].length;
      }
      el.focus();
    }

    function doDownload () {  // Prepare a download of the sketch contents associated with the utilButton menu
      // Save traces only if traces exist
      var $dialog = $('#download-modal'),
          sketch = $utilCanvas.data ('document').focusPage,
          pageTracesExist = sketch.traces.saturation > 0, // does this page have traces?
          anyTracesExist = pageTracesExist || 
                sketch.document.docSpec.pages.some( function (spec) {return spec.traces;}), // do any pages have saved traces?
          // saveTracesPref = sketch.getAuthorPreference('pagetraces'),
          $saveTracesBox = $('#save-traces', $dialog);
      checkFileName();
      // Show checkbox iff anyTracesExist
      $saveTracesBox.parent().css('display', anyTracesExist ? 'block' : 'none');
      // Check the box only if current page has visible, non-fading traces
      $saveTracesBox.prop ('checked', pageTracesExist && !sketch._fadeTracesJob.isActive);
      // If fading is active, suspend it until the dowloadd is done.
      $dialog.show();
      $dialog.find('.util-popup-content').tinyDraggable({exclude: ".dragExclude"});
      selectFileName ();
    }
  
    function prepareDownload () {   // set up handlers for the download dialog box
      var defaultName = $utilCanvas.data('fileName') + $utilCanvas.data('fileExt'),
          $fName = $('#util-fname'), // file name field in the download dialog
          newName;
    
      function confirm () {
        var newName = $fName[0].value;
        downloadSketch ($utilCanvas.data ('document'), newName);
      }
      
      $("#download-modal").data ("sketchNode", $utilCanvas);  // Target the dialog to the sketch
      if (defaultName) {
        newName = incrementVersion (defaultName);
        $fName[0].value = newName;
      }
      var $outputNode = $('#downloadOK');
      $outputNode.focus ();
      // Find the sketch_canvas that's a previous sibling of the utility menu button
      $outputNode.on ("click", function () {
        console.log ('click OK handler closing modal');
        confirm ();
      });
      $fName.on ("keyup", function (e) {
        if (e.keyCode === 27) {
          UTILMENU.closeModal ('download-modal', 'cancel');
        } else if (e.keyCode === 13 && fileNameHandler(e)) {
          console.log ('keyup handler closing modal');
          UTILMENU.closeModal ('download-modal', 'download');
        }
      });
    } // prepareDownload
    
    function doUpload () {
      // Called from a click event on either the Upload... command or on the dialog's Upload New Sketch button
      // If there are multiple sketches, need to test ev.target and switch UTILMENU globals if $relatedSketchNode(target) isn't $utilCanvas
      
      function doClick(e) {
        console.log('doClick clicking fileNameInput: e = ', e);
        $fileNameInput.click();
      }
      
      console.log('doUpload was called: anything to do here?');
      if (true) return;
      $fileNameInput.attr ("onchange", doLoad);
      $('.util-menu.util-upload').off('click');
      $('.util-menu.util-upload').one('click', doClick);

    } // doUpload
    
/*globals b64_md5 */
    function saveSketchChecksum (doc) { // Save the checksum of the delta (not the whole sketch) on sketch load or save operations
      var sketchID = doc.canvasNode[0].id,
          checksum = b64_md5 (JSON.stringify(doc.getCurrentSpecObject ()));
      $("#" + sketchID).data("prevChecksum", checksum);
    }
    
    function docHasChanged ($sketch) {
      var doc = $sketch.data("document"),
          curSpec = doc.getCurrentSpecObject (),
          checksum = b64_md5 (JSON.stringify(curSpec)),
          prevChecksum = $sketch.data("prevChecksum");
      return checksum !== prevChecksum;
    }

    function initSketch (doc) {
      // Some sketches don't have a fontList resource, which can cause problems if they later acquire objects or tools that require a fontList.
      var defaultList = ["\"Times New Roman\", serif","\"Arial\", sans-serif"];
      
      // The fix here corrects erroneous export of sketches with font-family = "\"Times New Roman\", sans-serif"
      function fixString (s) {
        if (s && s.includes ('Times') && s.includes ('sans-serif'))
          s = s.replace ('sans-serif', 'serif');
        return s;
      }
      
      function fixFontList (list) {
        var i;
        for (i=0; i<list.length; ++i) {
          list[i] = fixString (list[i]);
        }
      }
      
      function fixPage (textDefaults) {
        $.each (textDefaults, function (key, value) {
          var v = value["font-family"];
          if (v)
            value["font-family"] = fixString (v);
          else if (value.label) {
            v = value.label["font-family"];
            if (v)
              value.label["font-family"] = fixString (v);
          }
        });
      }
      
      function fixFonts (doc) {
        fixFontList (doc.resources.fontList);
        if (doc.pageData) { // fix the doc
          $.each(doc.pageData, function (key, value) {
            fixPage (value.spec.preferences.text.textTypes);
          });
        } else {  // fix the docSpec
          $.each(doc.pages, function (key, value) {
            fixPage (value.preferences.text.textTypes);
          });
        }
      }
      
      $utilCanvas = doc.canvasNode;
      if (!doc.resources)
        doc.resources = {"fontList": defaultList};
      else if (!doc.resources.fontList)
        doc.resources.fontList =  defaultList;
      else fixFonts (doc);
      if (!doc.docSpec.resources)
        doc.docSpec.resources = {"fontList": defaultList};
      else if (!doc.docSpec.resources.fontList)
        doc.docSpec.resources.fontList = defaultList;
      else fixFonts (doc.docSpec);
      fixPage (doc.focusPage.preferences.text.textTypes); // Fix the focus page as well.
      // Store the checksum so we can tell later if the sketch has changed.
      saveSketchChecksum (doc);
    } // initSketch
    
    function removeNumericParens (iName) { // find parens that contain only digits and spaces, and remove the opening and closing parens
      var pattern = /(.*)\u0028 *([\d]*) *\u0029/,
          len = iName.length,
          done = false;
      //console.log ('Original name: ' + iName);
      while (!done) {
        iName = iName.replace(pattern, '$1$2');
        done = len === iName.length;
        len = iName.length;
      }
      //console.log ('Numeric parens removed: ' + iName);
      return iName;
    }
    
    function incrementVersion( iName ) { // Increment the version #, or add a version # if none exists
      // The version # is always at the end of the name, following the last hyphen and preceding the extension. Add "-1" if none exists
      var pattern = /-(\d+)(\.json|-json\.js)/,
          ext = iName.match (/(\.json|-json\.js|\.js)$/)[1],
          match = iName.match (pattern),
          oldVersion = match && match[1] || '0',
          newVersionNum = parseInt (oldVersion, 10) + 1,
          newVersion = '-' + newVersionNum.toString(),
          retVal;
      if (oldVersion === '0') {
        retVal = iName.replace (ext, newVersion + ext);
      } else {
        retVal = iName.replace (pattern, newVersion + ext);
      }
      return retVal;
    } // incrementVersion

    function fixFileName( iName ) {
      if (!iName) return '';
      // Remove numeric parens and remove non-digits from the non-alpha trailing chars.
      var name = removeNumericParens (iName),
          match = name.match(/([a-zA-Z0-9]+[a-zA-Z0-9\u0028\u0029 _-]*)([A-Za-z])([^A-Za-z]*)(\.json|-json\.js)$/),
          ext, alphaPart, digitPart, needsHyphen;
      if (!match) {
        return iName; // nothing to fix
      }
      ext = match[4];
      alphaPart = match[1] + match[2];
      digitPart = match[3].replaceAll(/ |_/g, ''); // remove spaces and underscores in digitPart
      needsHyphen = digitPart.match(/\d/) && !digitPart.match(/^-/) && !digitPart.match(/\u0029/); // don't hyphenate inside parens
      return alphaPart + (needsHyphen ? '-' : '') + digitPart + ext;
    }
    
    function parseFileName( fName, $optNode ) {
      // WHY IS THIS CALLED TWICE, ONCE BEFORE THE DOC IS LOADED AND THEN AGAIN FROM DOCLOADED - INITCANVASFORDOC???  
      
      // Parse the filename into name and ext (either .json or -json.js).
      // If $optNode is not passed, $utilCanvas is used (the sketch_canvas associated with the util menu)
      // If $optNode is passed, it receives the parsed result, in $optNode.data
      // This is a no-op if fName has no extension and already matches $optNode.data('fileName').
      // Otherwise parse the name to convert known (mutually-incompatible) browser-renaming conventions
      // to simple numeric values preceded by a hyphen. 
      // Thus 'mysketch (2) (1) (2).json' becomes 'mysketch-212.json'.
      // A filename like mysketch2.json or mysketch23.json should not be renamed.
      var fileName, fileExt, parsed;
      $optNode = $optNode || $utilCanvas;
      fileName = $optNode && $optNode.data ('fileName');
      fileExt = $optNode && $optNode.data ('fileExt');
      parsed = {name: fileName, ext: fileExt}; // default to existing values or undefined
      
      function check (ext) {
        var bareName;
        if (fName && fName.endsWith (ext)) {
          bareName = fName.replace (ext, '');
          return {name: bareName, ext: ext};
        }
      }
      
      if (fileName && fileExt && fileName === fName) {
        console.log( 'Parsing an already-parsed fileName');
      } else if (!fName) {
        // return existing name and extension, if they're defined
        console.log('Cannot parse an empty filename.'); 
      } else {
        fileName = fixFileName (fileName);
        parsed = check('.js') || check('.json'); // undefined if not a legal sketch filename
        if (!parsed) {
          console.log ('parseFileName failed for ' + fName);
        } else {
          // update $optNode.data() to the new values
          $optNode.data ('fileName', parsed.name);
          $optNode.data ('fileExt', parsed.ext);
          // $optNode.removeData ('url');  // Is there any reason to preserve a url if we have a file name?
        }
      }
      return parsed;
    } // parseFileName

    function doRenamingTest() {
      var unchangedCases =
      [ 'sketch (a).json',
        'sketch(2)( 1)(1 ).json',
        'sketch1.json',
        'sketch(1).json',
        'sketch-1a.json',
        'sketch(1a).json',
        'sketch(a1).json',
        'sketch_1_2_3.json',
        'sketch 1 2_3_.json',
        'sketch123.json',
        'sketch123-json.js',
        'sketch1.json',
        'sketch-1a.json',
        'sketch (a).json',
        'sketch(1a).json',
        'sketch_1_2_3.json',
        'sketch 1 2_3_.json',
        'sketch123.json',
        'sketch123-json.js'
      ];
    
      function test(iName) {
        var name = fixFileName (iName),
            incremented = incrementVersion (name);
        console.log ('Original name: ' + iName + '    Fixed name: ' + name + '    Incremented: ' + incremented + '    Next: ' + incrementVersion (incremented));
      }
      unchangedCases.forEach (test);
    } // doRenamingTest
  
    function doLoadSketch( file, target ) {
      // If provided, callback is called (passing the .sketch_canvas element) once the sketch is loaded
      var $node = WIDGETS.$relatedSketchNode (target),
          $fNameDest = $node.parent().find('.wsp-file-name');
      // $fNameDest exists for Tool Library, not viewer or normal sketches.
      // Consider generalizing this for both Viewer and normal sketches.
      if (!file || !file.name) return;
      var reader= new FileReader(), 
          parsedName = parseFileName (file.name, $node);
      // The filename is legal, so try to read it.
      reader.onload = function(e) {
        var sketchData = e.target.result,
            initMatch, termMatch, varName, fileNamePrefix,
            regInit, regTerm, dataOK;

        if (parsedName.ext.endsWith('.js')) {
          // The sketch file is in script form, which should begin 'var <varName> = {'
          // But there's still a risk in loading it, so we read the file, discard the prefix,
          // discard the closing '};$', and use the value of the variable as our sketchData
          // and 
          // A sketch in script form should start with 'var <varName> = {' and end with  '};'
          // We use regex to find the varName while removing the surrounding 'var ... {'
          // Similarly, we remove the ending '}', leaving us with a json-parsable string.
          // match = sketchData.match (/^\s*var\s+([\$A-Za-z_][A-Za-z0-9_]*)\s*\=\s*\{(.*)\}\s*;$/);
          regInit = /^\s*var\s+([A-Za-z_][A-Za-z0-9_]*)\s*\=\s*\{\s*/;
          regTerm = /(\}\s*;\s*)$/;          
          initMatch = sketchData.match(regInit);
          if (initMatch[1]) {
            varName = initMatch[1];
            sketchData = sketchData.replace(regInit,'{');
            termMatch = sketchData.match(regTerm);
            if (termMatch[1]) {
              sketchData = sketchData.replace(regTerm,'}');
              dataOK = true;
            }
            
          }
          //match = sketchData.match (/^\s*var\s+([A-Za-z_][A-Za-z0-9_]*)\s*\=\s*(\{.*\});$/);
          //varName = match[1];
          //sketchData = match[2];
          if (!dataOK) {
            console.log ('Malformed .js data file might be a security risk.');
            throw GSP.createError ('widgets doLoadSketch refused to load a malformed -json.js file');
          }
          // The varName should match the first part of the file name
          fileNamePrefix = file.name.replace('.js', '').replace('-json', '');
          if (varName !== fileNamePrefix) {
            // Matching names are preferred, but some legacy uses don't match them. Worth a console msg, but no error.
            console.log ('widgets doLoadSketch found mismatch: var name ' + varName + ' differs from file name ' + file.name);
          }
        }
        $node.data ('sourceDocument', sketchData); // store the sketch data in the sketch_canvas
        if ($fNameDest.length) { // and show the file name to the user
          $fNameDest[0].innerText = parsedName.name;
        }
        // console.log ('Loaded ' + file.name + ' data into sketch_canvas node.');
        $node.WSP("loadSketch");
        $node.removeData ('sourceDocument');  // Once the data's loaded, it's no longer needed here
        // A sketch with no content doesn't have a fontlist, which will cause problems if content is added later.
        // A fix, if needed, might be called like this:
        // checkDocForFontlist ($node.data ("document"));
      };
      reader.readAsText(file);
    } // doLoadSketch

    function testValidity( parsedName, show ) { // pass show to display result in download dialog
      var pattern = /^[a-zA-Z0-9][a-zA-Z0-9\u0028\u0029 _-]*(\.json|-json\.js)$/,
          fName = parsedName && (parsedName.name + parsedName.ext) || '',
          match = fName && fName.match( pattern ),
          $el = $('#util-fname'),
          retVal = match ? true : false;
      if (show) {
        $('#downloadOK').attr('disabled', !retVal);
        $('.fname-validity', $el.parent()).toggleClass ('isValid', retVal);
        $('.fname-validity').html(retVal ? "\u2714" : "\u2715");
      }
      return retVal;
    }
  
    function checkFileName(optFileName) { // check the filename and return its validity
      /* Test the optFileName or the contents of #util-fname against the validity pattern.
       * If using contents of #util-fname, show checkmark or X, and enable/disable the OK button.
       * The pattern has been adjusted to allow spaces, hyphens, underscores, and parens to allow
       * auto-renaming a duplicate file (e.g. on Mac: 'my-sketch.json' to 'my-sketch (1).json' ).
       * But renaming 'my-sketch (1).json' produces 'my-sketch (1) (2).json' which defeats the purpose.
       * Ideally we could ask the user saving 'my-sketch.json' if she wants to replace the existing file.
       * If she's saving  'my-sketch (1).json' and doesn't want to replace the existing file,
       * we should change its name to 'my-sketch (2).json'.
       * As a stop-gap, consider auto-renaming 'my-sketch (1).json' to 'my-sketch (2).json', etc.
       * We track, in the sketch_canvas url data, the most recent filename used for upload or
       * download, and increment that name's index after a successful download. (Can we check the
       * success of a download?)
      */
      var $el = $('#util-fname'),
          fName = optFileName || $el.val() || '',
          parsed = parseFileName (fName);
      if (false) {
        doRenamingTest();
      }
      return testValidity (parsed, true);
      /* CODE BELOW WAS TO INCREMENT NAMES LIKE sketch(1).json TO sketch(2).json.IT'S NOT CLEAR WE WANT TO DO THIS.
      fName = parsed.name;
      if (fName) {
        var parenMatch = fName.match(/^[a-zA-Z0-9][a-zA-Z0-9 _-]*(\u0028(\d*)\u0029)\.json$/);
        if (parenMatch && parenMatch.length === 3) { // There is an integer in parens, so increment it...
          fName = fName.replace (parenMatch[1], '(' + (1 + parseInt(parenMatch[2], 10)).toString() + ')');
          $el.val(fName); // NO GO: Changing the (1) to (2) re-displays the Download File dialog, incrementing the (2) to (3)
          // Need to detect this re-display of the dialog and accept the user's input only on <OK-click> or <return>, not on
          // changing the name. Turn off the file-name change-handler before setting the text.
        }
        return testValidity (fName, true);
      }
      */
    } // checkFileName
    
    function fileNameHandler( ev ) { // handles an event that changed the file name & returns validity
      // Presumably the event comes from the element, so check its value and update validity
      // If there's no period separating file name and extension, no need to do anything.
      var value = ev.target.value;
      if (value && value.includes('.')) {
        return checkFileName (value);
      } // else return undefined
    }

/*

    function validateFileName(optFileName) {
      // A legal filename starts with an alphanumeric char,
      // followed by zero or more alphanumerics, parens, spaces, and hyphens,
      // and ending in '-json.js' or '.json'
      // If optFileName is passed, test it.
      // Otherwise, test the filename in the download-chooser dialog box and set the dialog's validity chars.
      var pattern = /^[a-zA-Z0-9][a-zA-Z0-9\u0028\u0029 _-]*(\.json|-json\.js)$/,
          $el = $('#util-fname'),
          text = optFileName || $el.val() || '',
          match = text && text.match( pattern ),
          parenMatch = match && text.match(/^[a-zA-Z0-9][a-zA-Z0-9 _-]*(\u0028(\d*)\u0029)\.json$/),
          retVal = match ? true : false;
      if (optFileName) {
        return retVal;
      }
      if (parenMatch && parenMatch.length === 3) { // There is an integer in parens, so increment it...
        text = text.replace (parenMatch[1], '(' + (1 + parseInt(parenMatch[2], 10)).toString() + ')');
        $el.val(text); // NO GO: Changing the (1) to (2) re-displays the Download File dialog, incrementing the (2) to (3)
        // Need to detect this re-display of the dialog and accept the user's input only on <OK-click> or <return>, not on
        // changing the name. Turn off the file-name change-handler before setting the text.
      }
      $('#downloadOK').attr('disabled', !retVal);
      $('.fname-validity', $el.parent()).toggleClass ('isValid', retVal);
      $('.fname-validity').html(retVal ? "\u2714" : "\u2715");
      return retVal;
    }
    
    function regularizeFileName( fName ) {
      // If fName contains only digits, parens, spaces, underscores and hyphens after the last alpha char, eliminate the non-digits
      // and put them after the last alpha char
      var lastAlphaChar = /[a-zA-Z0-9]+[a-zA-Z0-9\u0028\u0029 _-]*[A-Za-z][^A-Za-z]*(\.json|-json\.js)$/;
          pattern =  /[a-zA-Z0-9]+[a-zA-Z0-9\u0028\u0029 _-]*(\.json|-json\.js)$//
    }
    
    function incrementFileName( fName ) {
      // If fName has an integer in parens,  
      
    }
*/
  return {  // public functions and variables for UTILMENU
    
    parseFileName: function ( fName, $optNode ) { // parse the name into {name: <name>, ext: <ext>}
      // $optNode is the sketch_canvas in which the name and extension are to be stored,
      // If omitted, the sketch_canas associated with the visible util menu is used.
      // Side effect: store in $optNode.data as fileName and fileExt.
      return parseFileName ( fName, $optNode );
    },

    closeModal: function (modalID, action) {
      $('#' + modalID).css ('display', 'none');
      if (modalID === "download-modal") {
        $('#util-fname').off ("keyup");
        $('#downloadOK').off ("click");
        if (action === 'download') {
          downloadSketch ($utilCanvas.data ('document'), $('#util-fname')[0].value);
        }
      }
      else if (modalID === "upload-modal") {
        switch (action) {
          case "download":  // save first, and then do the upload
            showChooserAfterDownload = true; // start an upload after this download is done.
            doDownload (); 
            break;
          /* The upload-new-sketch button already has a click handler to do the upload
          case "dont-save":   // go ahead with the upload
            console.log('Clicking $fileNameInput.'); 
            $fileNameInput.click();
            */
        }
      }
    },
    
    download: function (ev) {
      hideUtilMenu( ev );
      $utilCanvas = WIDGETS.$relatedSketchNode (ev.target);
      if ($("#download-modal").data ("callSave")) {
        $("#download-modal").removeData ("callSave");
      }
      prepareDownload ($utilCanvas);
      doDownload ();
    },

    loadSketch: function (file, $node) {
      // Loads a "proper" file, which must contain a json object or a script defining a json object
      // Puts the sketch json object into the node's sourceDocument data attribute.
      // Also set's the node's fileName attribute to (e.g.) abc if the file's actual name is abc.json or abc-json.js.
      doLoadSketch( file, $node );
    },
     
    upload: function (ev) {
      hideUtilMenu( ev );
      doUpload (ev);
    },
    
    docLoaded: function( event, context) {
      // This is the UTILMENU handler for the LoadDocument.WSP message
      initSketch (context.document);
      enableFileCommands (context.document);
    }
    
  };
  
})(); // UTILMENU


/* The button-bar beneath a sketch_canvas provides useful buttons and other items for the user
 * Note that a webpage with multiple sketches may have multiple button bars.
 * Button-bar elements include:
 * Undo/Redo buttons (as an alternative to the top of the ToolColumn, important for sketches with no tools)
 * Many button-bar elements can be turned on or off by way of the author prefs of the sketch
 * Here are the pref names corresponding to each element class.
 * Util Menu (util-menu -> utilmenu)
 * Upload command (upload-util -> uploadutil)
 * Download command (download-util -> downloadutil)
 * WSP Logo and link (wsp-logo -> wsplogo)
 * Accessibility icon and link (wsp-access -> wspaccess)
 * Reset button (wsp-reset-button -> resetbutton)
 * Widgets button (wsp-widgets-button -> widgetsbutton)
 * Page control (wsp-page-buttons -> pagebuttons)
 **/
var BUTTONBAR = (function() {  // define the BUTTONBAR namespace.
  /* This namespace is added to distinguish functionality that applies to the entire button-bar.
   * The page-number control and the utility menu are complex enough to merit their own namespaces.
   * CURRENT STATUS: The refactoring of code among BUTTONBAR, UTILMENU, and PAGENUM is not yet complete.
   * 
   */
  
  /*  Consider a generic function that uses data to create and update button-bar elements?
   *  If not, delete the below...
      btnElementsArr = [
        // class, prefType, prefType,
        ['wsp-undo-redo-container'. 'PageArray'],
        ['util-menu-btn', 'PageArray'],
        ['class="wsp-link-icon wsp-logo'. 'Bool'],
        ['class="wsp-link-icon wsp-access', 'Bool'],
        
      };
  */
  
  function getDoc( $bar ) { // returns the doc for the button-bar
    var $canvas = $('.sketch_canvas', $bar.parent());
    return $canvas.data('document');
  }
  
  function $getBar( doc ) { // returns the button-bar for the doc, or null if no bar
    // If missing, the bar is created UNLESS the bar pref is explicitly false
    // Here we add a button bar to all legacy sketches unless they explicitly exclude it. 
    var pref = doc.getExplicitPref('buttonbar'),
        $sketch = doc.canvasNode,
        $ret = $sketch.siblings('.wsp-button-bar, button_area'),
        needsBar = !$ret.length && (!pref.exists || pref.value),
        $bar, $parent;
    if (needsBar) { // Bar is missing and prefs doesn't forbid it
      $bar = $('<div class = "wsp-button-bar"></div>');
      $parent = $sketch.parent();
      if (!$parent.hasClass('sketch_container')) { // No container, so create one
        $parent = $('<div class = "sketch_container"></div>');
        $parent.insertBefore ($sketch);
        $sketch.appendTo ($parent); // , put sketch & bar inside it
        $bar.appendTo ($parent);
      }
      $ret = $sketch.siblings('.wsp-button-bar');
    } else if ($ret.length && pref.exists && !pref.value) {
      $ret.remove();
    }
    return $ret.length ? $ret : null;
  } // $getBar

  function updateClass( $el, oldClass, newClass ) {
    if ($el.length && $el.hasClass( oldClass )) {
      $el.addClass( newClass ).removeClass( oldClass );
    }
  }

  function updateButtonBarClassNames( $btnBar ) {
    // Legacy html pages may use deprecated class names; update them here 
    var names = [
          {former: 'page_buttons', current: 'wsp-page-buttons'},
          {former: 'widget_button', current: 'wsp-widgets-button'},
          {former: 'reset_button', current: 'wsp-reset-button'},
          {former: 'wsp_logo', current: 'wsp-logo'},
          {former: 'page_btn', current: 'wsp-page-btn'},
          {former: 'page_prevBtn', current: 'wsp-page-prevBtn'},
          {former: 'page_nextBtn', current: 'wsp-page-nextBtn'},
          {former: 'page_num', current: 'wsp-page-num'}
        ];
    if ($btnBar.length !== 1) {
      console.log('updateButtonBarClassNames called with no $btnBar');
      return;
    }
    updateClass( $btnBar, 'button_area', 'wsp-button-bar' );
    names.forEach( function (name) {
      updateClass( $( '.' + name.former, $btnBar), name.former, name.current );
    });
  } // updateButtonBarClassNames
    
  function injectButtonElements (sketchDoc) {
    // Find any uninitialized .wsp-page-buttons element
    // with html matching this doc id, and initialize the buttons.
    // For tabbing order, we want the wsp-reset-button, wsp-widget, and wsp-page-buttons ordered
    // left to right at the right end of the wsp-button-bar.
    // For this purpose, we create all the buttons now, in the desired tab order,
    // hidden until enabled, and we put them (unfloated)
    // into a single div (.wsp-float-right) that's floated right. They are initially
    // empty and hidden, so their contents can be added and shown later as appropriate.
    var $resetButton, classList, versionCSS,
        $sketchNode = sketchDoc.canvasNode,
        $btnBar = $getBar (sketchDoc),
        resetEnabled = WSP.PREF.getPref (sketchDoc, "resetbutton"); // resetbutton is a per-page option.
    
    function createFloatRight() { // Replace the button bar's right-floated div with our canonical version,
      // which will include both already-existing elements (Reset button, Widet button, Page control) and
      // elements specified in the sketch's author prefs.
      var $oldFloat = $('.wsp-float-right', $btnBar),  // The div at the right end of the button-bar,
          pageNum = sketchDoc.focusPage.metadata.id,
          contentBody = '',
          $newFloat;
      
      function appendEl( className, prefName, elContent) { // append elContent to the $newContent div.
        var pref = sketchDoc.getExplicitPref (prefName, pageNum),
            $existing = $btnBar.find ('.' + className),
            exists = $existing.length > 0;
        elContent = elContent.replace ('@', className);
        if (pref || exists) {
          contentBody += elContent;
          if (exists) {
            $existing.remove();
          }
        }
      } // appendEl
      
      // If a float-right div already exists, put its contents into our canonical order.
      // (Note: deprecated class names have already been updated.)
      // Visibility of the wsp-page-buttons div is controlled by switchPage
      appendEl ('wsp-reset-button', 'resetbutton',
                '<button class=@ tabindex="0" title=' + GSP.Locale.current['GSP.UI.ResetButton'] + '>Reset</button>');
                //'<button class=@ tabindex="0" title="Reset this sketch to its original state.">Reset</button>');
      appendEl ('wsp-widgets-button', 'widgetbutton',
                '<button class=@ title="Show or hide the widgets.">Widgets</button>');
      appendEl ('wsp-page-buttons', 'pagecontrol',
                '<div class=@>Pages</div>');
      $newFloat = $('<div class="wsp-float-right wsp-bar-right">' + contentBody + '</div>');

      // Remove any existing float-right
      if ($oldFloat.length) {
        $oldFloat.replaceWith ($newFloat);
      } else {
        $btnBar.append($newFloat);
      }
    } // createFloatRight

    function insertLinkIcons() {
      // The accessibility and logo buttons function as links and have tips that appears on hover and focus
      // to clarify their use (e.g., "Link to Web Sketchpad info: webSketchpad.org").
      // When the button is focused, the link (its <a href> child) steals the focus, so the showLink() function
      // uses the link-showing class to make the button simulate the appropriate focused appearance.
      
    /* The only link icons are WSP logo and WSP-access, awaiting migration to websketchpad.org...
      function insertLinkIcon( className, prefName, imgLoc, linkUrl, linkText) {
        // Insert the specified icon as a button in the buttonBar
        var $existingIcon = $('.' + className, $btnBar),
            addIcon = WSP.PREF.getPref (sketchDoc, prefName),
            linkTitle = ' title = "Link to ' + linkText + linkUrl + '" ',
            $content;
        if (!addIcon) {
          if ($existingIcon.length) {
            $existingIcon.remove();
          }
        } else { // addIcon is true
          $content = $('<a class="wsp-link-icon ' + className + '" ' + linkTitle +
            'href = "https://' + linkUrl + '" target = "_blank" rel="noopener noreferrer">' +
            '<img class = "wsp-link-icon" src = "' + WIDGETS.getScriptPath() + imgLoc + '"/></a>');
          if ($existingIcon.length) {
            $existingIcon.replaceWith( $content );
          } else {
            $('.wsp-float-right.wsp-bar-right', $btnBar).before( $content );
          }
          //$existingIcon.on('keypress', function(e) {
          //  if (e.value === 13) {
          //    console.log('return was pressed.');
          //  }
          //});
          //return $content;
        }
      } // insertLinkIcon
    */

      function showLink( parentEl, doShow ) {
        // The link-showing class maintains the focused appearance of $parent 
        var $parent = $(parentEl),
            $tip = $('.wsp-link-tip', $parent),
            parentPos = $parent.position();
        if (!doShow) {
          $tip.hide();
          $parent.removeClass('link-showing');
        } else {
          $tip.show();
          $parent.addClass('link-showing');
          $tip.css({top: parentPos.top + $parent.outerHeight(true), left: parentPos.left});
        }
      } // showLink

      /* The WSP logo and WSP-access buttons await migration to websketchpad.org...
        insertLinkIcon( 'wsp-logo', 'wsplogo', 'wsp-logo-solo.png', 'websketchpad.org', 'Web Sketchpad info: ');
        insertLinkIcon( 'wsp-access', 'wspaccess', 'accessibility.png', 'sineofthetimes.org', 'accessibility info: ');
      */
      $('.wsp-link-tip').parent().on( 'mouseenter mouseleave focusin focusout', function( e ) {
        if (e.type === 'mouseenter' || e.type === 'focusin') {
          showLink(e.currentTarget, true);
        } else {
          showLink(e.currentTarget, false );
        }
      });
    } // insertLinkIcons
     
    function insertFileName() {  // add a div to show the filename
      var $content,
          $el = $('.wsp-file-name', $btnBar);
      if ($el.length) { // remove a legacy file-name element
        $el.remove();
      }
      if (WSP.PREF.getPref (sketchDoc, 'filenameinbuttonbar')) {
        $content = $('<p class="wsp-file-name"></p>');
        $('.wsp-float-right.wsp-bar-right', $btnBar).before ($content);
      }
    } // insertFileName
     
    // body of injectButtonElements
    if (!$btnBar.length) {
      return; // Bail if there's no button bar
    }
    classList = $('.wsp-base-node', $sketchNode)[0].classList;
    classList.forEach( function ( value ) {
      if (value.match(/wsp-version/)) {
        versionCSS = value;
      }
    });
    $btnBar.addClass(versionCSS);
    createFloatRight();
    $resetButton = $('.wsp-reset-button', $btnBar);
    $resetButton.on( 'click', PAGENUM.resetPage);
    PAGENUM.activatePageCtl( $btnBar, sketchDoc);
    WIDGETS.setVis ($resetButton, resetEnabled);  // resetEnabled is a boolean (it used to be a pageArray)
    /* TO DO: Are any $btnBar child elements enabled per-page? Use the page_toggle and p_ classes
     * to control the visibility of all per-page elements. There is no pref for the Widgets button,
     * but it should be hidden on a page that has no widgets.
     */
    PAGENUM.gotoPage( $sketchNode, sketchDoc.metadata["start-page"] );
    //checkWspLogo();
    insertLinkIcons ();
    insertFileName();
/*    adjustWidth();*/
  } // injectButtonElements

/* Singleton & adjustWidth features not yet ready...  
  function adjustWidth() { // If there are no children other than .bBarText and either undo/redo or page control, but not both,
    // reduce the width to contain only that element. 
    var nChildren, nBarText;
    $btnBar.show(); // make the :visible test work
    nBarText = $('.bBarText:visible', $btnBar).length;
    nChildren = $btnBar.children().filter(':visible').length - nBarText;
    if (nChildren === 1) {
      $btnBar.addClass('singleton');
    } else {
      $btnBar.removeClass('singleton');
    }
    if (!nChildren) {
      $btnBar.hide (); // Hide if no children
    }
  }
*/  

  function setButtonBarText( node, newText ) {
    // node can be any node within the target sketch_container
    // newText cannot include HTML markup; what API should we use to allow markup
    // Consider making $barText a div and using $barText.html to set the inner HTML of the div
    var $container = $(node).closest ('.sketch_container'),
        $barText = $('.bBarText', $container);
    if (!$barText.length) {
      console.log ('BUTTONBAR.setButtonBarText needs to create the $barText node');
    } else if ($barText.length > 1) {
      console.log ('BUTTONBAR.setButtonBarText found multiple $barText nodes');
    } else {
      $barText.text (newText);
      if (!newText) {
        $barText.hide ();
      } else {
        $barText.show ();
      }
    }
  }
  
  function getButtonBarText( node ) {
    var $container = $(node).closest ('.sketch_container'),
        $barText = $('.bBarText', $container);
    return $barText.text();
  }
  
  function initButtonBar( $canvas ) {
    // If this doc is new, add the bar if it's missing, or update it if it exists
    // How should we handle a newly-loaded doc in an existing sketch_canvas?
    // The new doc may have different settings for its button-bar elements!
    var doc = $canvas.data ('document'),
        $bar = $getBar (doc);
    if ($canvas.data ('bar-init-done')) {
      return;
    }
    doc = $canvas.data ('document');
    $canvas.data ('bar-init-done', true);
    updateButtonBarClassNames ($bar);
    injectButtonElements (doc);
  } // initButtonBar
  
  /* HERE'S THE ORIGINAL; CHECK AGAINST THE NEW VERSION
   *
  
  function docLoaded( event, context) {
    // This is the BUTTONBAR handler for the LoadDocument.WSP message
    // Do this check for every LoadDocument event, even though some are generated
    // by undo/redo and toolplay.
    // Is there a way to distinguish the ones to which we really need to attend?
    // Which steps can we perform only on page-change or tool-play events?
    var doc = context.document,
        $sketchNode = doc.canvasNode,
        barPref = GSP._get( doc, 'metadata.authorPrefs.buttonbar' ), // Get barPref directly, avoiding the default value.
        multiPage = doc.pageData.length > 1,
        $bar = barPref ? initBar (doc) : null;
    if ($bar) {
      
        
    }
    if ($bar.length) { // Legacy bars may be identified by the 'button_area' class; fix this
      $bar.addClass( 'wsp-button-bar' ).removeClass( 'button_area' );
    } else {
      $bar = $sketchNode.siblings( '.wsp-button-bar' );
    }
    // The default buttonbar pref is true (thus including the button bar).
    // How can we accommodate the sketch author who doesn't want a button bar?
    // Tentative criteria if no existing button bar: omit the button bar in these two cases:
    // Single-page sketch with barPref undefined
    // Multi-page sketch with barPref explicitly false (we assume author uses in-sketch link buttons to change pages)
    if (!$bar.length && (multiPage ? barPref === false : typeof barPref === 'undefined')) {
      return; // Bail in either case
    }
    if (!$bar.length) {
      createButtonBar( doc ); // creates the bar and injects its elements
    }
    // If .bBarText is empty, hide it
    if (!getButtonBarText ()) {
      setButtonBarText ($bar, '');
    }
  } // docLoaded

*/
  
  function docLoaded (e, context) {
    // This is the BUTTONBAR handler for docLoaded, and from here we call
    // docLoaded for PAGENUM and UTILMENU
    /*
     * This handler first needs to check the buttonbar doc pref’s explicit value (default value is true). If false,
     * it should delete any wsp-button-bar element, and put undo/redo elsewhere. If true, it should create the wsp-button-bar
     * if it’s missing, and then update the visibility and handlers for various children based on prefs.
     **/
    var doc = context.document,
        $canvas = doc.canvasNode,
        $bar = $getBar (doc);  // null if the buttonbar is explicitly turned off
    if (!$canvas.data ('bar-init-done')) {
      initButtonBar ($canvas);
    }
    WIDGETS.docLoaded (e, context); // Initialize widgets (TO DO: make sure widgets work w/o $bar) 
    if (!$bar) {
      console.log ('No button-bar for this sketch.');
      return;
    }
    // Does the order below matter?
    PAGENUM.docLoaded (e, context);
    UTILMENU.docLoaded (e, context);
  } // docLoaded
  
  function setLoadHandlers ($canvas) {
    // Install the LoadDocument.WSP handler for $canvas
    $($canvas).once ('LoadDocument.WSP', function( event, context ) {
      // BUTTONBAR.docLoaded() will call other handlers
      // TO DO: Make sure docLoaded() functions work for sketches with no button bar
      docLoaded (event, context);
    });
  } //  
  
  return {  // BUTTONBAR public functions and variables.
    
    init: function ($theCanvas) {
      //$('html').on ('LoadDocument.WSP', docLoaded);
      //console.log ('Added LoadDocument.WSP listener');
      if ($theCanvas && $theCanvas.length) {
        setLoadHandlers( $theCanvas );
      } else {
        $('.sketch_canvas').each( function ( ix, $canvas) {
          setLoadHandlers( $canvas );
        });
      }
    },
    
    $getBar: function( canvasNode ) {  // canvasNode can be an element or a jQuery object
      return $getBar ($(canvasNode).data ('document'));
    },
/*
    adjustWidth: function() {
      adjustWidth();
    },
*/  
    configure: function ( $bar ) {
      // Configure the bar based on the sketch prefs. Call this fn if per-page prefs change.
      var doc = getDoc( $bar );
      PAGENUM.setToolEnabling( doc );
      // Need to handle per-page changes in which widgets & buttons appear
    },
    
    setButtonBarText: function( canvasNode, newText ) {
      setButtonBarText (canvasNode, newText);
    },
    
    getButtonBarText: function( canvasNode ) {
      getButtonBarText (canvasNode);
    },
    
    

  };
  
})(); // BUTTONBAR

/* Consider moving the following to a new file, perhaps wspHelp.js
 * Here we use a help-bar, below the button-bar that appears when the user action displaays help info.
 * The tool implementation provides a short bit of text about the tool and two buttons that display videos
 * in a dialog box: a short silent video and a longer more informative one with narration.
 * Unlike modal dialogs, the video can be closed either with its close box or by clicking outside the modal.
 */

GSP.WspHelp = (function () {
  /* Rather than storing WspHelp globals as variables, we use the dialog's data, and access them as follows:
   * $getHelpDialog() returns the toolhelp dialog box in jQuery form.
   * setButton() and $getButton() set and fetch the button (img) that generated the active help request.
   * Crucially, the help modal doesn't need access to the tool: the tool's metadata is sufficient.
   */
  var helpVideoID, helpLoaded, toolHelpTimeout, timeoutKey, curHelpKey, curTextKey,
        // Timeout delays hiding the toolhelp bar on focusout, enabling user actions to cancel the pending hide
        // in case (1) User has clicked a wsp-help video button, or (2) User has focused on another tool.
        // When the Timeout expires, we'll hide the help UNLESS it's already showing a different curHelpKey/curTextKey
      remoteHelpDir = "https://geometricfunctions.org/includes/v4.6/wsp-help/",  // standard location of the remote database
        // This standard location will become "https://websketchpad.org/includes/v4.7/wsp-help" when v4.7 becomes current
        // wsp-help is alongside rather than inside the widgets folder, as it's not part of a normal build
        // wsp-help contents include wspHelpData.js and two sub-directories: tipVideos and fullVideos
      videoDir = remoteHelpDir;  // Assume remote; if not, switch to local
      
    /* DATABASE STRUCTURE: The Help Database (DB) is an object containing key/value pairs. It's recommended, when
     * using the DB, to use 'helpKey' as the variable name to identify a key that identifies a DB record.
     * Many DOM elements have a 'helpKey' attribute whose value is a key into the DB, identifying the record
     * to be used when that DOM element is focused or identified in some other way. A DB record may contain
     * several distinct parts (which are themselves sub-key/sub-value pairs).
     * textHint: This sub-key's value is the text that should appear in the text bar beneath the sketch
     * (e.g., when the related element is focused or when the related tool is activated). This text is
     * designed to be useful, for instance, in explaining how to use a specific tool
     * tipVideo: This sub-key identifies a short silent video in the tipVideo directory.
     * fullVideo: This sub-key identifies a slightly longer narrated video, often showing (for instance)
     * (When the help bar is displaying a DB record, it shows icon(s) linking to one or both of these videos.)
     * textInfo: This text is shorter than the textHint's text. For tools, it provides a short description
     * of what the tool does, in contrast to the textHint that provides hints about using the tool.
     */
 
  function loadHelpDatabase() {
    // To avoid CORS issues triggered by trying to load the database as a remote .json file,
    // the database is loaded by a local script (for debugging) or by a script at toolHelpURL (for production).
    // The wsp-help script defines the database as the variable window.wspHelpData
    // We use a two-part strategy:
    // DEBUGGING:  The local database script is loaded (and run) by the web page before the widgets.js script.
    //   Tool help is already available as each sketch document is subsequently loaded.
    // PRODUCTION: The remote database script is loaded (and run) by the code below.
    //   Once tool help is loaded, the code adds tool help to every already-existing sketch document.
    // In either case, any subsequent LoadDocument.WSP message must result in adding tool help to the new document.
    // 
    var emitter = GSP.EventEmitter($('.sketch_canvas')[0]);  // Use any sketch for this one-shot message
    
    function disseminateHelp() {
      if (!window.wspHelpData) {
        console.log( 'Could not load help DB locally or remotely.');
      }
      helpLoaded = true;
      emitter.trigger("WspHelpReady", window.wspHelpData, {});
      console.log('Local WspHelp database loaded and announced to sketches.');
      // Add help to any already-loaded sketches... OR did this already happen when they got the WspHelpReady event?
      $.each($('.sketch_canvas'), function() {
        var doc = $(this).data('document');
        if (doc) {
          addHelpToDoc(doc);
        }
      });
    }
    
    if (helpLoaded) return;  // already loaded: nothing to do
    if (window.wspHelpData) {
      console.log('Loaded help DB locally.');
      videoDir = WIDGETS.getScriptPath() + '../wsp-help/';
      disseminateHelp();
    } else {  // Load the remote database script, which sets window.wspHelpData
      $.getScript( remoteHelpDir + 'wspHelpData.js', function (data, status) {
        if (status === "success") {
          videoDir = remoteHelpDir;
          console.log('Loaded help DB remotely.');
          disseminateHelp();
        }
      });
    }
  } // loadHelpDatabase

  function init() {
    
    function addHelpOnPageChange(e, context) {
      // var gobjs = context.document.focusPage.gobjList.gobjects;
      addHelpToDoc(context.document);
      // KLOOGE: Code below should activate help for tool objects in the sketch,
      // both on page change and when a tool adds a gobj to the sketch.
      // A focused gobj, when it's the document.activeElement, has classes div.wsp-accessible.wsp-Circle.wsp-sr-only
      // The gobj id is document.activeElement.attributes['wsp-id']
      // I don't yet know what event signals aria focus on a gobj. The below doesn't work.
      // (The aria div doesn't seem to be focused as part of tabbing.)
      //$('div.wsp-accessible').on( 'focusin', function(e) {
      //  showHelp(e, context, {doShow: true});
      //});
    }
    
    loadHelpDatabase();
    $('.sketch_canvas').once("DidChangeCurrentPage.WSP", addHelpOnPageChange);
  } // init

  function playVideo(e) {
    var videoURL = videoDir + $(e.target).attr('src');
    // hideModal();
    e.stopPropagation();
    console.log('playWspHelpVideo:', e.target, helpVideoID);
    GSP.ModalVideo.playWspHelpVideo(e, videoURL, e.data);
  } // playVideo
    
/*
 * showModal() and hideModal() show and hide the modal dialog showing info contained in a tool's metadata.
 * The functions are agnostic as to source, whether a user press-and-hold or a call from an outside client.
 * Use startModal(e) and stopModal(e) to show or hide the modal based on a user-generated event e.
 **/

  function addHelpToToolButton($btn, /* optional */ helpData) {
    // Adds to $btn the needed helpData and listeners for mouse and focus events.
    // $btn is the button that's clicked either in the sketch or in the library.
    // If helpData is not passed, the database record for this tool is used.
    // (This makes it possible for the Tool Library to change the text hint.)
    // It must already have a 'tool' data property referencing the tool 
    // Need to turn these handlers off when the timeout ends or is cleared.
    // Also, if it ends, need to turn on (and later, off) a handler that intercepts
    // a mouseup. This will prevent a later mouseup from firing the tool.
    // To check pref, we use either an ancestor sketch_canvas or the first sketch_canvas in the DOM.
    // (If the Tool Library is adding WspHelp to its tool repository, the sketch_canvas
    // in the DOM may not yet be loaded with its sketch doc, in which case we bail.)
    var $canvas, doc, tool, helpID;
    
    if ($btn.data('helpData')) {
      return; // no-op if data already exists
    }    
    $canvas = $btn.closest('.sketch_canvas') || $('.sketch_canvas')[0]; // If $btn isn't in a sketch, this must be the library
    doc = $canvas.data('document');
    tool = $btn.data('tool');
    if (!doc) return false; // either no sketch or sketch hasn't yet been loaded.
    helpID = doc.getAuthorPreference('toolhelp') && tool && (tool.metadata.toolHelpID || tool.metadata.name);
    helpData = helpData || (helpID && helpLoaded && window.wspHelpData[helpID]);
    helpVideoID = helpID;
    if (!helpData) { // is help missing or turned off?
      console.log ('addHelpToToolButton has no data.');
      return false;
    }
    if (!tool) { // the tool is missing from the button's data. The cause is unclear,
      // but this stop-gap prevents a crash-and-burn
      console.log ('tool is undefined; cannot add Tool Help for this tool.');
      return false;
    }
    helpData.name = tool.metadata.name;
    if (!$btn.is('div.wsp-tool, div.toolItem')) {
      $btn = $btn.closest('div.wsp-tool, div.toolItem');
    }
    $btn.data('helpData', helpData); // store pointer to helpData
    // Add the focus listeners
    $btn.on('focusin focusout', function(e){
      var context = {document: doc, tool: $(e.target).data('tool')},
          attr = {doShow: e.type === 'focusin', textKey: 'textInfo'};
      showEventHelp( e, context, attr );
    });
    return true;
  } // addHelpToToolButton
  
  function addHelpToBarButton($btn) { // The $btn object includes both <button> and <a> elements
    $btn.once('focus blur', function (e){  // Add 'click' b/c Safari clicks don't send focusin
      var $this = $(this),
          $parent = $this.parent(),
          isUndoRedo = $parent.hasClass('wsp-undo-redo'),
          isFocus = e.type === 'focus',
          $canvas = $this.closest('.sketch_container').find('.sketch_canvas'),
          context = {document: $canvas.data('document'), $barButton: $this},
          attr = {doShow: isFocus, textKey: 'textHint'},
          siblingSel, $sibling;
      if (!isFocus && isUndoRedo && this.disabled) {
        // undo or redo has just lost focus, so move focus to the other
        siblingSel = $this.hasClass('wsp-undo-button') ? '.wsp-redo-button' : '.wsp-undo-button';
        $sibling = $(siblingSel, $parent);
        $sibling.prop( 'disabled', false );
        $sibling.trigger('focus');
        context.$barButton = $sibling;
        attr.doShow = true;
      }
      if (context.document) { // PREVENT A CRASH IF DOCUMENT IS MISSING
        showEventHelp( e, context, attr );
      } else {
        console.log ('context.document is unavailable for showEventHelp.');
      }
    });
    //$('.util-menu-item').once('focus blur', function (e) {
    //  console.log(e.type + ' received for ' + $(e.target)[0].innerText);
    //});
  } // addHelpToBarButton

  function addHelpToUtilButtons( doc ) {
    var $btns = $('.util-menu-item', doc.canvasNode.parent());
    $btns.off('focusin focusout');
    $btns.once('focus blur', function (e){  // No need to stop propagation; focus and blur don't propagate.
      var context = {document: doc, $barButton: $(e.target)};
      showEventHelp( e, context, {doShow: (e.type === 'focus' ? 'true' : 'false')});
      // console.log(e.type + ' received for ' + $(e.target)[0].innerText);
    });
  } // addHelpToUtilButtons
  
  function addHelpToWidgetButton($btn) { // There's only one #widget which may not be targeted to the current canvas
    /* TO DO: Should tabbing to a doc that's not the current widget target call targetControllerToDoc()? */
    // Add help to the widget's prompt and pane by putting the $btn into the context
    var $children = $('.widgetPrompt, .widgetPane', $btn.next());
    $btn.on('focusin focusout click', function (e){  // Add 'click' b/c Safari clicks don't send focusin
      var $canvas = $(this).closest('.sketch_container').find('.sketch_canvas'),
          context = {document: $canvas.data('document'), widgetButton: $(e.target)},
          attr = {doShow: e.type === 'focusin', textKey: 'textInfo'};
      showEventHelp( e, context, attr );
    });
    $children.on('focusin focusout', function (e){
      var $this = $(this),
          $canvas = $this.closest('.sketch_container').find('.sketch_canvas'),
          context = {document: $canvas.data('document'), widgetButton: $btn},
          attr = {doShow: e.type === 'focusin', textKey: 'textInfo'};
      if ($this.hasClass('widgetPane')) {
        attr.isPane = true;
      }
      showEventHelp( e, context, attr );
    });
  } // addHelpToWidgetButton
  
  function showEventHelp( ev, context, attr) {
    // Wrapper for showHelp, simplifying access for event handlers
    // ev is a standard jquery event object
    // context contains the doc and either a tool or one of the four possible targets: a toolButton, a widgetButton, a barbutton.
    // The $barButton target includes utility menu items (utilMenuItem)
    var doc = context.document,
        helpKey = attr.helpKey,
        doShow = attr.doShow,
        tool = context.tool,
        $barButton = context.$barButton || context.utilMenuItem,
        $widgetButton = context.widgetButton,
        textKey = attr && attr.textKey || 'textHint',
        cat = 'button',  // the default
        // target = ev.target,  // Is this needed for some cases?
        name,
        $obj;
    if (tool) {
      cat = 'tool';
      helpKey = doc.getAuthorPreference('toolhelp') && tool && tool.metadata && (tool.metadata.toolhelpKey || tool.metadata.name);
      $obj = tool.$element;
      name = tool.metadata.name;
    } else if ($barButton) {
      cat = 'button';
      $obj = $barButton;
      name = $barButton[0].innerText;
      helpKey = $barButton.attr('helpKey');
      if (!helpKey) {
        if ($barButton.hasClass('precision-radio')) {
          helpKey = $barButton.closest('.precision-popup').attr('helpkey');
        }
      }
    } else if ($widgetButton) {
      helpKey = $('.widgettiptext', $widgetButton).text();
      $obj = $widgetButton;
      name = $widgetButton[0].innerText;
    } else {
      //console.log( 'showHelp() has nothing to show.');
      return;
    }
    //console.log('Showing ' + ev.type + ' event help for ' + helpKey);
    if (!doShow) {
      textKey = 'hide'; // signal to hide instead of show
    }
    // console.log(((textKey === 'hide') ? 'Hiding ' : 'Showing ') + helpKey + ' help for ' + ev.type + ' on ' + $obj[0].tagName + ' ' + $obj[0].innerText);
    showHelp (doc, helpKey, $obj, textKey);
  } // showEventHelp
  
  function showHelp( doc, helpKey, toolOr$obj, textKey ) {
    /*
     *   doc: the sketch document (possibly null, if call is from the Tool Library)
     *   helpKey: the key into the help DB. If undefined, showHelp will use obj[0].title for the help text.
     *     The help DB is a collection of helpData objects, each of which provides help bar text and video links
     *     for an element that can receive focus (such as a tool, widget, or button. Each helpData object
     *     contains key/value pairs, using these keys for text:
     *        'textHint' (a short general description) and
     *        'textInfo' (longer how-to guidance),
     *     and using these keys for video links:
     *        'tipVideo' (short, with subtitles) and
     *        'fullVideo' (longer, with optional sound).
     *   cat: one of 'tool', 'widget', 'button', or 'event'
     *   toolOr$obj: the associated dom element (representing a tool, a widget, or a button)
     *   textKey: indicates which text from the help DB to show in the help bar.
     *   Possible values are 'textHint', 'textInfo', 'title' (to use the DOM title attribute),
     *   and 'hide' (to hide the help bar).
     *   Localization note: We could eliminate the need to translate title attributes of DOM elements by scanning
     *   the help DB, replacing the title attribute of each DOM element with the translated title from the DB.
     *  
    */
    var $helpDiv, $sketch, helpData, textData,
        doHide = textKey === 'hide';
    
    function findHelpDiv() {
      // Set doc if it's missing (e.g., event is from Tool Library) and find (or create) the $helpDiv
      if (!doc){
        $sketch = $('.sketch_container').find('.sketch_canvas');
        doc = $sketch.data('document');
      } else {
        $sketch = doc.canvasNode;
      }
      $helpDiv = $('.helpDiv', $sketch.parent());
      if (!$helpDiv.length) {
        addHelpToDoc (doc);
        $helpDiv = $('.helpDiv', $sketch);
        if (!$helpDiv.length) {
          console.log ('widgets showHelp() cannot find find or create the helpDiv for ' + $sketch);
        }
      }
    }

    function setVidBtn(id, dir, src) {
      var $btn = $helpDiv.find(id);
      if (src) {
        $btn.attr('src', dir + '/' + src);
        $btn.show();
      } else {
        $btn.hide();
      }
    }
    
    function hideHelp() {
      // Delay hiding so that a click on a video button doesn't hide the toolHelp div (due to a focusout event) before the click fires
      // Similarly, focusout on a widget button followed by focusin on the widget's prompt or pane should not hide toolHelp.
      if (toolHelpTimeout) {
        // console.log(event.target.id + ' ' + event.type + ' delayed hiding tool help for ' + timeoutKey);
        console.log('Hiding help during toolHelpTimeout, so ignoring hideHelp call...');
        return;
      } else {
        timeoutKey = curHelpKey;
        toolHelpTimeout = setTimeout( function() {
          // hide help only if help hasn't changed and the new activeElement doesn't have the same HelpKey/TextKey
          if (!timeoutKey || timeoutKey !== curHelpKey && textKey !== curTextKey) {
            // console.log(event.target.id + ' ' + event.type + ' hiding tool help for ' + timeoutKey);
            doc.canvasNode.parent().find('.helpDiv').hide();
            toolHelpTimeout = null;
            timeoutKey = '';
          }
        }, 1000);
      }
    } // hideHelp
    
    function getTitle( toolOr$obj ) { // find the title property of the dom element
      if (toolOr$obj.length) {
        return toolOr$obj[0].title;
      } else if (toolOr$obj.$element) {
        return toolOr$obj.$element[0].title;
      } else {
        console.log ('Cannot find title of toolOr$obj');
        return '';
      }
    }
    
    function findToolData (aTool) {
      // See if the tool has textHint and/or textInfo
      // If not, return undefined.
      var metadata = aTool.metadata,
          helpData = {},
          ret;
      if (metadata) {
        if (metadata.textHint) {
          helpData.textHint = metadata.textHint;
          ret = helpData;
        }
        if (metadata.textInfo) {
          helpData.textInfo = metadata.textInfo;
          ret = helpData;
        }
      }
      return ret;
    }
    
    function getAriaLabel( toolOr$obj) {
      return GSP._get (toolOr$obj[0], 'ariaLabel');
    }

    // body of showHelp
    textKey = textKey || 'textInfo';
    if (helpKey && helpKey === curHelpKey && textKey && textKey === curTextKey && !doHide) { // don't reshow current help
      return;
    }
    findHelpDiv ();
    if (!WSP.PREF.getPref(doc, 'toolhelp')) {
      return;
    }
    if (!helpLoaded) {
      console.log ('showHelp called without helpLoaded');
      return;
    }
    if (toolHelpTimeout) {
      clearTimeout (toolHelpTimeout);
      // console.log( 'Cleared Timeout for ' + timeoutKey);
      toolHelpTimeout = null;
      timeoutKey = '';
    }
    helpData = (helpLoaded && window.wspHelpData[helpKey]);
    if (!helpData) {  // check the tool's metadata
      helpData = findToolData (toolOr$obj);
    }
    if (!helpData) { // no entry, so use tool title or ariaLabel if possible
      textData = getTitle (toolOr$obj) || getAriaLabel(toolOr$obj) || 'No help is available for ' + helpKey;
      helpData = {textInfo: textData};
      textKey = 'textInfo';
      // console.log (helpData.textInfo);
    }
    $('.msg', $helpDiv).remove(); // Remove any appended message and <br.msg> before showing new help
    if (doHide) {
      hideHelp ();
      return;
    }
    $helpDiv.show();
    curHelpKey = helpKey;
    curTextKey = textKey;
    if (helpData) {
      $helpDiv.find('span.help').html(helpData[textKey]);
      setVidBtn( '#tip-video', 'tipVideos', helpData.tipVideo);
      setVidBtn( '#full-video', 'fullVideos', helpData.fullVideo);
    }
  } // showHelp

  function hideHelp(ev, context, delta) {
    // Delay hiding so that a click on a video button doesn't hide the toolHelp div (due to a focusout event) before the click fires
    // Similarly, focusout on a widget button followed by focusin on the widget's prompt or pane should not hide toolHelp.

/* Another two cases result when the user mousedowns on a tool in the tool library.
 * Case 1: toolHelp is visible and the mousedown is near the bottom of the tool button; the toolHelp is hidden, the library moves up taking the button with it, and the mouse is no longer over the button causing the click to fail. THIS SEEMS FIXED, AS TOOL HELP FOR THE MOUSEDOWN IS CALLED IMMEDIATELY ON MOUSEDOWN. WATCH FOR RECURRENCES OF THIS UNDER VARIOUS CONDITIONS.
 * Case 2: toolHelp is hidden, the mousedown is near the top of the tool button.and the focus on the button shows the toolHelp, causing the library to move down taking the tool button with it; the mouse is no longer over the button, so the click fails. AN EASY TEST: LAUNCH TOOL LIBRARY AND IMMEDIATELY TAP NEAR THE TOP OF A TOOL BUTTON.
 * Proposed solution: mousedown on a library tool button puts a hold on showing or hiding tool help; the hide or show should happen only when the hold is released. The hold is released by either a mouseup or mouseout event for the tool button. The showHelp function can set listeners for these two events, so we need a toolHelp function call that sets the hold and the listeners.
 * Better solution for both cases: if help is enabled, we provide a fixed-height .helpContainer for the .helpDiv,
 * so that when help visibility changes, the page layout remains unchanged.
*/
    var $sketch, doc;
    doc = context && context.document;
    if (!doc) {
      doc = WIDGETS.$getWidgetSketch().data('document');
    }
    $sketch = doc.canvasNode;
    if (toolHelpTimeout) {
      // console.log(event.target.id + ' ' + event.type + ' delayed hiding tool help for ' + timeoutKey);
      console.log('Hiding help during toolHelpTimeout, so ignoring hideHelp call...');
      return;
    } else {
      if (!$sketch.data) {
        console.log ('$sketch.data undefined');
      }
      doc = $sketch.data('document'); // If doc isn't passed try to get it from the widget target
      if (!doc) {
        console.log('widgets.hideHelp() could not find the sketch doc.');
      }
      timeoutKey = curHelpKey;
      toolHelpTimeout = setTimeout( function() {
        // hide help only if help hasn't changed and the new activeElement doesn't have the same help key
        if (timeoutKey === curHelpKey) {
          // console.log(event.target.id + ' ' + event.type + ' hiding tool help for ' + timeoutKey);
          doc.canvasNode.parent().find('.helpDiv').hide();
          toolHelpTimeout = null;
          timeoutKey = '';
          curHelpKey = '';
        }
      }, 1000);
    }
  } // hideHelp

  function toolWasAdded(e, context) { // Handle the ToolAdded.WSP event
    // This event results from reloading all the tools, so process every tool
    addHelpToDoc( context.document );
  }
  
  function addHelpToWidgets() { // Call this from targetControllerToDoc
    var $widget = $('#widget'),
        $widgetButtons = $('button.widget_controlButton.widgettip', $widget);
    if ($widget.data('helpAdded')) return;
    $widgetButtons.each( function() {
      addHelpToWidgetButton( $(this) );
    });
    $widget.data('helpAdded', true);
  }    
  
  function addHelpToDoc(doc) { // add help to tools in this doc
    // Here we add help to all the tools in the doc. If it's ever possible to add new tools to a doc,
    // doc.toolHelpLoaded will need to be set false, and
    // any new tools will need to be help-enabled. (The Tool Library already does this.)
    var $helpContainer,
        $canvas = doc.canvasNode,
        $buttonBar = $canvas.siblings('.wsp-button-bar');
      
    function addToTools() {
      var $tools = $('.wsp-tool', $canvas); 
      if ($tools) {
        $tools.each( function( ) {
          addHelpToToolButton( $(this) );
        });
        //$tools.on('focusin focusout', function(e){
        //  showHelp( e, {document: doc, tool: $(e.target).data('tool')}, {show: e.type === 'focusin', key: 'textInfo'} );
        //});
      }
    }
    
    function addToBtnBar() {
      var $buttons = $('button, a', $buttonBar); // get both buttons and links
      if ($buttons) {
        $buttons.each( function( ) {
          addHelpToBarButton( $(this) );
        });
        //$buttons.on('focusin focusout', function(e){
        //  showHelp( e, {document: doc, button: $(e.target) }, {show: e.type === 'focusin',  );
        //});
      }
      if ($buttonBar.hasClass ('wsp-buttons-in-bar')) {
        addHelpToBarButton( $('.wsp-undo-button', $buttonBar) );
        addHelpToBarButton( $('.wsp-redo-button', $buttonBar) );
      }
      // Add to util menu buttons and to the precision-popbuttons
      $buttons = $('button.util-menu-item,button.precision-popbutton', $buttonBar);
      if ($buttons) {
        $buttons.each( function( ) {
          addHelpToBarButton( $(this) );
        });        
      }
      addHelpToUtilButtons(doc); // Util items should use only focus and blur 
      // Add to util menu's precision-radios
      $buttons = $('input.precision-radio', $buttonBar);
      if ($buttons) {
        $buttons.each( function( ) {
          addHelpToBarButton( $(this) );
        });        
      }
    }
    
    function showWspHelp( ev, context ) {
      // Handles willPlayTool event
      var doc = context.document,
          tool = context.tool,
          helpKey = doc.getAuthorPreference('toolhelp') && tool && tool.metadata && (tool.metadata.toolhelpKey || tool.metadata.name);
      showHelp( doc, helpKey, tool, 'textHint');
    }

    // Body of addHelpToDoc
    if (!helpLoaded) {
      return false;
    }
/* Put the .helpDiv inside a fixed-height helpContainer keep the page layout from changing whenever help is shown or hidden.
   Do this for esthetics in the general case. For the Tool Library, it eliminates two problems with the tool collection:
   1: toolHelp is visible and a collection mousedown is near the bottom of the tool button. If the mousedown hides toolHelp
      the collection moves up, the mouse is no longer over the button, and the click fails.
   2: toolHelp is hidden and a collection mousedown is near the top of the tool button. If the mousedown shows toolHelp
      the collection moves down, the mouse is no longer over the button, and the click fails.
*/
    if ($canvas.parent().find('div.helpDiv').length === 0) {
      $helpContainer = $(
        '<div class="helpContainer">' +
          '<div class="helpDiv">' +
            '<div class="help-buttons">' +
            '<button class="help-video tooltip" id="tip-video" title="Tip Video" tabindex="-1">💡</button>' +
            '<button class="help-video tooltip" id="full-video" title="Full Video" tabindex="-1">🎥</button>' +
            '</div>' +
            '<span class="help"></span>' +
          '</div>' +
        '</div>');
      $helpContainer.insertAfter($buttonBar);
      $('.help-video', $helpContainer).on('click', playVideo);
      $canvas.on('WillPlayTool.WSP', showWspHelp)
          .on('ToolPlayed.WSP ToolAborted.WSP', hideHelp)
          .on('ToolAdded.WSP', toolWasAdded);
    }
        
    addToTools();
    addToBtnBar();
    
    return true;
  } // addHelpToDoc
  
  return {  // GSP.WspHelp Functions
    
// unimplemented wspHelpFunctions

    
// Existing functions

    init: function() {
      init();
    },


    // BOTH showHelp AND showEventHelp MUST BE ENABLED TO USE GSP.Strings & Locale...

    getWspHelpData: function () { // return the wspHelpData if it's available
      if (helpLoaded) {
        return window.wspHelpData;
      }
    },
    
    // BOTH showHelp AND showEventHelp MUST BE ENABLED TO USE GSP.Strings & Locale...

    showHelp: function( doc, helpKey, toolOr$obj, textKey ) {
        showHelp (doc, helpKey, toolOr$obj, textKey);
    },

    showEventHelp: function (ev, context, attr) {
      // Wrapper for showHelp, simplifying access for event handlers
      // ev is a standard jquery event object
      // context contains the doc and either a tool or one of these possible targets: a $toolButton, a $widgetButton, a $barbutton.
      // The $barButton target includes utility menu items (utilMenuItem)
      // attr has two possible name/value pairs: helpKey (the key into the DB) and doShow (false to hide help)
      showEventHelp ( ev, context, attr);
    },
    
    hideHelp: function (ev, context, delta) {
      // Hides the help div of the widget target sketch after a 1-second delay
      hideHelp (ev, context, delta);
    },
    
    addHelpToDoc: function(doc) { // Add help to each of the tools in the doc.
      // Can be used by clients such as the Tool Library, which makes changes
      // in the order and presence of tools, requiring a refresh of their help data
      addHelpToDoc(doc);
    },
    
    addHelpToWidgets: function () { // Call this from targetControllerToDoc
      addHelpToWidgets ();
    },
    
    append: function( doc, msg ) { // append msg to doc's .helpDiv
      // A helpDiv message appears on a single line below the normal helpDiv content.
      // If msg is missing or is an empty string, removes any existing message.
      var $helpDiv = $('.helpDiv', doc.canvasNode.parent()),
          newSpan = '<br class="msg"><span class="msg">' + msg + '<span>';
      $('.msg', $helpDiv).remove(); // Remove any existing message before adding thee new.
      if (msg) {
        $(newSpan).appendTo( $helpDiv );
      }
    },
    
    currentHelpKey: function() {
      return curHelpKey;
    }

  };
  
})();  // GSP.WspHelp

/*
 *  This script supports short videos to support various steps in an activity, activated by a button like this:
    <button class="play-tool-video" data-src="path">Play Video</button> 
    The value of "path" must contain the path to the video file, with the extension removed.
    (Files with both .mp4 and .webm extensions should be available at the location specified by the path.)
 */
  /* Info for mute button:
    * 🔈  speaker       Unicode: U+1F508 &#x1F508;
    * 🔇  muted speaker Unicode: U+1F507 &#x1F507;
  */
    
GSP.ModalVideo = (function () {  // define the ModalVideo namespace, for the code that allows buttons to show videos in a modal dialog box
  /* There are two types of videos supported at this time: Tool-help videos that are associated with standard WSP tools,
   * and activity videos that support specific activities.
   * A button that plays a tool video is an <a> element with the wsp-help-video class and the button's data has a tool attribute
   * that points to th es are specified in the wsp-help database, and are hosted
   * alongside that database.
   * A button that plays an activity video is a <button> element with the play-tool-video class. The button's data has a src attribute
   * that specifies the video's url. These buttons are supported by a separate HINTVIDEO namespace in toggle-section.js and toggle-section.css.
   * These older videos should be integrated into the new video code located in widgets.js. We may want to use the same
   * icon for wsp-help videos that's currently used by activity videos.
   *
   * There's a fair amount of work to make this happen.
   * 
   * The init() function installs click handlers on all buttons with class .play-tool-video.
   * If you inject a new video button into the existing HTML, call init() again.
   *
   */

  function playWspHelpVideo(e, videoURL, data) {  // create the player and play the video; events are handled by the caller.
    var player = $("#v-video")[0],
        $modal = $('#v-modal');
    // console.trace('starting video ' + videoURL + ' ' + Date.now());
    $("#v-srcMp4")[0].src = videoURL +".mp4";
    $("#v-srcWebm")[0].src = videoURL + ".webm";
    player.addEventListener('ended', stopWspHelpVideo, false);
    $modal.addClass("visible");
    player.load();
    if (data.muted) {
      player.muted = true;
    }
    player.play();
    $(window).on("click", stopWspHelpVideo);  // 
  }
  
  function stopWspHelpVideo(event) {
    var player = $("#v-video")[0],
        targetID = event.target.id,
        endDelay = 2000; // pause 2 seconds after the video ends
    if (targetID === "v-video" && event.type !== 'ended') {  // the video window can handle its own events (except 'ended')
      return;
    }
    // We should get here only on a window click or from the end of the video.
    $(window).off ("click", stopWspHelpVideo);   // turn off the window event listener and wait 2 seconds before hiding the modal
    if (event.type !== "ended") {
      player.pause();
      player.currentTime = 0;
      endDelay = 0;  // no delay if the user has explicitly stopped the video
    }
    setTimeout (hideModal, endDelay);
    event.stopPropagation ();
    player.removeEventListener('ended', stopWspHelpVideo, false);
  }
  
  function showModal (event) {
    var srcLoc = $(event.delegateTarget).data ("src");  // delegateTarget is the element with the click handler
    event.stopPropagation();
    playWspHelpVideo(event, srcLoc);
  }
  
  function hideModal() {
    var player = $("#v-video")[0];
    player.pause(); // there is no stop function, so pause and reset.
    player.currentTime = 0;
    $('#v-modal').removeClass ("visible");
  }
  
  function injectModal () {
    if ($('#v-modal')[0]) {
      return;
    }
    $("body").append ('<div id="v-modal">' +
      '<div class="v-modal-content">' +
        '<span class="v-modal-close">&times;</span>' +
        '<video id="v-video" controls>' +
          '<source id="v-srcWebm" src="" type="video/webm">' +
          '<source id="v-srcMp4" src="" type="video/mp4">' +
          'Your browser does not support the video tag.' +
        '</video>' +
      '</div>' +
    '</div>');  
  }
  
  return {
    init: function () {
      if ($('#v-modal')[0]) {  // already called?
        // Yes: remove existing click handlers before installing new ones
        $(".play-tool-video").off ("click", showModal);
        $('.v-modal-close').off ("click", stopWspHelpVideo);
      } else {
        // No, this is the first call, so inject the modal
        injectModal();
      }
      $(".play-tool-video").on ("click", showModal); // clicking any .play-tool-video button should start the video in the button's src data property
      $('.v-modal-close').on ("click", stopWspHelpVideo);
    },
    
    playWspHelpVideo: function(e, videoURL, data) {  /// videoURL is the relative or absolute path to the video (omitting the mp4/webm extension)
      playWspHelpVideo(e, videoURL, data);
    }
    
  };
})(); // ModalVideo

GSP.HintVideo = (function () {  // define the HintVideo namespace for compatibility with legacy activities
  // Once the legacy activities have been updated to use GSP.ModalVideo, GSP.HintVideo can go away,
  // as can GSP.ModalVideo.stopHintVideo() and the call to GSP.HintVideo.init();

  function startVideo(e, hintName) {  // Use ModalVideo to show a legacy hint video
    e.target.data( 'src', './basic/' + hintName );
    GSP.ModalVideo.playHintVideo( e );
  }
    
  return {
    init: function () {
      console.log( 'HintVideo is deprecated and needs no initialization.');
    },
    
    playVideo: function(e, hintName) {  // hintName is the relative or absolute path to the video, omitting the mp4/webm extension
      startVideo(e, hintName);
    }
  };
})();  // GSP.HintVideo

$(function() {
  WIDGETS.initWidget();
  BUTTONBAR.init();
  // PAGENUM.initPageButtons ();// Init whenever a new doc is loaded
  // UTILMENU.initUtils (); OBSOLETE
  GSP.WspHelp.init();
  GSP.ModalVideo.init();
  GSP.HintVideo.init();
});

