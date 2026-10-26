/* global Export */
/* global InfoViewer */
/* global Logger */
/* global WSPTest */

/* exported SketchViewer */
var SketchViewer = (function() {
  "use strict";

  // These are/should be all of the properties used in this file.  If any new module.properties are used,
  // they should be declared first here as a reference.
  var module = {
        canvas: null,
        storedSketch: null,
        document: null,
        totalNumberOfTabs: 0,
        currPage: null,
        currPageIndex: null,
        debugPanel: null,
        logIndex: 0,
        eventListeners: {},
        tabs: null,
        scrollTabs: {
          left:null,
          right:null
        },
        testResultsCached: [],
        storedInformation: sessionStorage
    },
    //Private methods...
    setScrollTab,
    getScrollAmount,
    recalculateTabHeights,
    setActiveTab,
    configureTabs;

  /**
   * This takes a jQuery "<button>" object as the element to use add the reset functionality to.
   * This will clear any changes made to the sketch so that it's essentially reset.  Initially
   * it starts off disabled because the Exporter page disables it until there's a sketch loaded.
   *
   * @param {jQuery Object} $view
   */
  module.setupResetControl = function($view) {
    module.resetControl = $view;
    module.resetControl.on("click", function() {
      var currPageIndex = module.currPageIndex;
      module.loadSketch(module.storedSketch, module.docSpec);
      module.currPageIndex = currPageIndex;
      module.document.switchPage( module.document.getPageIdAtIndex( currPageIndex));
      module.synchronizePage(currPageIndex);
    });
    module.disableControls();
  };

  /**
   * This takes a jQuery "<button>" object as the element to use add the clear traces functionality to.
   * This will clear any changes traces drawn to the sketch.  Initially it starts off disabled because
   * the Exporter page disables it until there's a sketch loaded.
   *
   * @param {jQuery Object} $view
   */
  module.setupClearTracesControl = function($view) {
    module.clearTracesControl = $view;
    module.clearTracesControl.on("click", function() {
      module.canvas.data("document").sQuery().eraseTraces();
    });
    module.disableControls();
  };

  /**
   * Makes the reset and clear traces buttons that have already been set, unusable until the
   * enableControls method is called.  Works by setting the "disabled" html attribute to disabled.
   */
  module.disableControls = function() {
    if (module.clearTracesControl) {
      module.clearTracesControl.attr({disabled:"disabled"}).addClass('disabled');
    }
    if (module.resetControl) {
      module.resetControl.attr({disabled:"disabled"}).addClass('disabled');
    }
  };

  /**
   * Removes the disabled attribute which is set by the disableControls method.
   */
  module.enableControls = function() {
    module.clearTracesControl.removeAttr("disabled").removeClass('disabled');
    module.resetControl.removeAttr("disabled").removeClass('disabled');
  };

  /**
   * Sets the <div> which will be used to load the Sketch into.  This <div> will have all of it's contents removed
   * so do not depend on the contents remaining after a sketch is loaded.
   *
   * @param {jQuery Object} $canvas
   */
  module.setupCanvas = function($canvas) {
    module.canvas = $canvas;
  };

  /**
   * This centers the canvas in the middle of it's containing element.
   */
  module.centerCanvas = function() {
    //we calculate how much we have to shift the canvas down and to the right
    //from the top-left corner(it's starting position);
    var canvas = module.canvas,
        canvasParent = module.canvas.parent(),
        shiftDown,
        shiftRight;
    //we remove the previous canvas' margins so they don't get included in our calculations
    canvas.css({'margin':'0'});
    shiftDown = canvasParent.height()/2 - canvas.height()/2;
    shiftRight = canvasParent.width()/2 - canvas.width()/2;
    canvas.css({
      'margin': shiftDown + 'px 0 0 ' + shiftRight + 'px'
    });
  };

  /**
   * Sets the jQuery <ul> element that will be used as the tabs element.  <ul> element passed should
   * be empty.
   *
   * @param {jQuery Object} $tabs
   */
  module.setupTabs = function($tabs) {
    module.tabs = $tabs;
  };

  /**
   * Sets up the tabs view to actually reflect the tabs passed.  Does not depend on having sketch
   * already set; all data, besides the tab view, set is passed in as arguments to this method.
   *
   * @param {number} numberOfTabs
   * @param {array} tabNames
   */
  configureTabs = function(numberOfTabs, tabNames) {
    if (numberOfTabs !== tabNames.length) {
      console.log("Invalid number of tabs in loaded sketch.");
    }

    module.totalNumberOfTabs = numberOfTabs;
    module.tabs.empty();

    module.canvas.empty();
    var html = '<li class="scroll-tab" id="scroll-left"><img src="images/arrow_left.png"></li>' +
               '<div id="tabs-wrapper"><ul id="tabs-list">';
    for (var x=0;x<numberOfTabs;++x) {
      html += '<li class="tab" data-tab="' + x + '" data-name="' + tabNames[x] + '">' + tabNames[x] + '</li>';
    }
    html += '</ul></div><li class="scroll-tab" id="scroll-right"><img src=" images/arrow_right.png"></li>';
    module.tabs.append(html);
    setScrollTab($("#scroll-left"), "left");
    setScrollTab($("#scroll-right"), "right");
    $(".scroll-tab").hover(function() {
      $(this).css({cursor:"pointer"});
    }, function() {
      $(this).css({cursor:"auto"});
    });

    $(".tab").on("click", function() {
      //check if clicked tab isn't already the active tab
      if ($(this).attr('class').indexOf("active") === -1) {
        var page = $(this).attr("data-tab");
        module.document.switchPage( module.document.getPageIdAtIndex( page));
        module.synchronizePage(page);
      }
    });
  };

  /**
   * This is called automatically during the configureTabs method to create the left and right arrows
   * to allow the user to scroll the tabs row in case there are too many tabs to display all
   * at once.
   *
   * @param {jQuery object} $view
   * @param {string} direction
   */
  setScrollTab = function($view, direction) {
    var tabs = module.scrollTabs;
    if (direction === "left") {
      tabs.left = $view;
      tabs.left.on("click", function() {
        var scrollAmount = getScrollAmount($view.parent().find("#tabs-list").first(), "right");
        $("#tabs-list").animate({left:"+=" + scrollAmount}, "fast");
      });
    } else if (direction === "right") {
      tabs.right = $view;
      tabs.right.on("click", function() {
        var scrollAmount = getScrollAmount($view.parent().find("#tabs-list").first(), "left");
        $("#tabs-list").animate({left:"-=" + scrollAmount}, "fast");
      });
    }
  };

  /**
   * This function will return the distance, in pixels, that tab scrolling should move the tabs by.
   * $tabList should be the view that is set in the setupTabs method.  direction argument should be
   * string "left" or "right"
   *
   * @param {jQuery object} $tabList
   * @param {string} direction
   * @returns {number}
   */
  getScrollAmount = function($tabList, direction) {
    var tab,
        tabOffset,
        tabParentOffset;
    if (direction === "left") {
      tabParentOffset = $tabList.parent().offset().left + 828;
      tab = $tabList.children().last();
      tabOffset = tab.offset().left + tab.outerWidth();
      if (tabOffset - tabParentOffset < 270) {
        return tabOffset - tabParentOffset;
      } else {
        return 270;
      }

    } else if (direction === "right") {
      tabParentOffset = $tabList.parent().offset().left;
      tabOffset = $tabList.children().first().offset().left;
      if (tabParentOffset - tabOffset < 270) {
        return tabParentOffset - tabOffset;
      } else {
        return 270;
      }
    }
    return 270;
  };

  /**
   * The height of the tabs may change depending on how much text is in each of the tabs.  This sets
   * the tabs height attribute to be the tallest needed for any of the tabs.
   */
  recalculateTabHeights = function() {
    var tallest = 0,
        tabs = $(".tab");
    tabs.each(function() {
      var tabHeight = $(this).height();
      if (tabHeight > tallest) {
        tallest = tabHeight;
      }
    });
    tabs.height(tallest);
  };

  /**
   * This sets the active tab by adding the "active" class to it and removing it from all other
   * tabs.  tabIndex parameter should be the tab requested in 0-based form.
   *
   * @param {number} tabIndex
   */
  setActiveTab = function(tabIndex) {
    var $activeTab,
        fullName;

    $activeTab = $(".tab:nth-child(" + (parseInt(module.currTab, 10) + 1) + ")");
    //set active tab to different color
    $(".tab").removeClass("active");
    $activeTab.addClass("active");

    fullName = $activeTab.attr("data-name");
    $activeTab.text(fullName);
  };

  /**
   * Loads the sketch from the SketchContainer passed into the canvas view set with the setupCanvas method.  This
   * method starts off a chain of functions that finishes by having the Exporter with a fully loaded sketch, tabs,
   * and panels loaded.
   *
   * @param {SketchContainer} sketchContainer
   */
  module.loadSketch = function(sketchContainer) {
    var tabNames = [],
      pages = sketchContainer.getPages(),
      docSpec = sketchContainer.getSketchObj();

    //initial sketch load setup
    module.storedSketch = sketchContainer;

    //get the names of each sketch
    for (var page in pages) {
      tabNames.push(pages[page].metadata.title);
    }
    configureTabs(pages.length, tabNames);
    recalculateTabHeights();

    InfoViewer.disableAllPanels();
    InfoViewer.savePanel("debug");
    InfoViewer.clearPanel("debug");
    InfoViewer.loadPanel("debug");

    $(module.canvas).off('DidChangeCurrentPage.WSP').off("StartCurrentPage.WSP").off("LoadDocument.WSP")
    .on("StartCurrentPage.WSP", function(evt, context, attributes) {
      module.sketch = context.document.focusPage;
      module.runWSPTestOnPage(attributes.pageId);
    }).on("LoadDocument.WSP", function(evt, context, attributes) {
      var sketch = context.document.focusPage,
          document = context.document,
          docName = docSpec.metadata['original-document-name'],
          pageId = docSpec.metadata['start-page'],
          pageIndex = document && document.getIndexForPageId(pageId),
          documentInfoString,
          docEvents;
      module.docSpec = docSpec; 
      module.document = document;
      module.currPageIndex = pageIndex;
      module.document.switchPage( module.document.getPageIdAtIndex( pageIndex));
      module.synchronizePage(pageIndex);
      module.centerCanvas();

      //cache the current viewed sketch
      module.storedInformation.lastViewedSketchName = docName;
      module.storedInformation.lastViewedSketchTab = pageIndex;

      module.enableControls();
      Export.enableButtons();
      InfoViewer.enableAllPanels();

      InfoViewer.setJSONPanelData(JSON.stringify(docSpec, null, '  '));
      InfoViewer.document = sketch.document;

      documentInfoString = "<strong>" + module.storedSketch.sketchObj.metadata['original-document-name'] + "</strong> Width: <strong>" + module.canvas.width() + "px</strong><br>Height: <strong>" + module.canvas.height() + "</strong>px";
      $(module.canvas).parent().parent().find("#canvasMeasurements").first().html(documentInfoString);
      docEvents = module.document.eventEmitter.getAvailableEvents();
      InfoViewer.setDebugPanelEvents(module.document, docEvents);
    }).on('DidChangeCurrentPage.WSP', function(evt, context, attributes) {
      module.synchronizePage(attributes.pageId-1);
    });
    module.canvas.WSP(
      'loadSketch', {
      'data-sourceDocument': docSpec
    });
  };

  /**
   * The page has been switched through link buttons in the sketch instead of SketchViewer tabs.  This
   * triggers an event which we listen for and now try to synchronize the rest of the Sketch Exporter
   * to the new page.
   *
   * @param {number} pageIndex
   */
  module.synchronizePage = function(pageIndex) {
    module.currPage = module.storedSketch.getPage(pageIndex);
    module.currTab = pageIndex;
    setActiveTab(module.currTab);
    module.currPageIndex = pageIndex;

  };

  /**
   * Runs two tests, the compare test, and supported objects test.  The compare test which checks if all
   * elements in the sketch are rendered as they are expected to be.  The supported objects test checks
   * wether any object in the sketch is unsupported by WebSketchpad.  These tests are run on the current
   * page of the currently loaded sketch.  Results are loaded to the InfoViewer test panel view, and
   * logs(containing test results) are also sent out using the Logger.logEvent method.
   */
  module.runWSPTestOnPage = function(pageIndex) {
    var testResults;
    if (module.testResultsCached[pageIndex]) {
      //if we've already run this test before on this page, then just redisplay the same results.
      InfoViewer.setTestPanelHeaderResult(module.testResultsCached[pageIndex].header);
      InfoViewer.setTestsPanelData(module.testResultsCached[pageIndex].details);
      testResults = WSPTest.buildTestSummary(module.sketch, module.storedInformation.lastViewedSketchName);
      if (!testResults.compare.success) {
        GSP.log("Sketch page failed compare test on reload.");
      }
    } else if (module.sketch.state === 'started' && module.docSpec.metadata.hasOwnProperty('exporter-debug')) {
      testResults = WSPTest.buildTestSummary(module.sketch, module.storedInformation.lastViewedSketchName);
      module.testResultsCached[pageIndex] = {};
      //The compare test results
      if (testResults.compare.success && !testResults.unsupportedObjects.unsupported) {
        module.testResultsCached[pageIndex].header = 'passed';
        InfoViewer.setTestPanelHeaderResult('passed');
      } else if (testResults.unsupportedObjects.unsupported) {
        module.testResultsCached[pageIndex].header = 'warning';
        InfoViewer.setTestPanelHeaderResult('warning');
        Logger.logEvent({message:"Sketch Test Run: Warning.", sketchName: module.storedInformation.lastViewedSketchName, page: module.sketch.metadata.title});
      } else {
        module.testResultsCached[pageIndex].header = 'failed';
        InfoViewer.setTestPanelHeaderResult('failed');
        Logger.logEvent({message:"Sketch Test Run: Failed.", sketchName: module.storedInformation.lastViewedSketchName, page: module.sketch.metadata.title});
      }
      module.testResultsCached[pageIndex].details = testResults;
      InfoViewer.setTestsPanelData(testResults);
      Logger.logEvent({message:"Sketch Loaded.", sketchName: module.storedInformation.lastViewedSketchName, page: module.sketch.metadata.title});
    }
  };

  /**
   * Clears out any sketch state.  Should be executed before a new sketch(NOT page) is to
   * be loaded into Exporter.
   */
  module.resetSketchViewer = function() {
    module.storedSketch = null;
    module.totalNumberOfTabs = 0;
    module.currPageIndex = null;
    module.currPage = null;
    module.tabs.empty();
    InfoViewer.debugLogIndex = 0;
    module.storedInformation.lastViewedSketchName = null;
    module.storedInformation.lastViewedSketchTab = null;
    module.testResultsCached = [];
  };

  return module;
}());
