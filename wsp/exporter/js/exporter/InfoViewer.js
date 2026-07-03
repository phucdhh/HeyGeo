/* global SketchViewer */
/* global escapeHTML*/

/* exported InfoViewer */
var InfoViewer = (function() {
  "use strict";

  var module = {
    views:{
      debug: {
        header: null,
        reportView: null,
        reportData: []
      },
      tests:  {
        header: null,
        reportView: null,
        reportData: []
      },
      json:  {
        header: null,
        reportView: null,
        reportData: []
      },
      options:  {
        header: null,
        reportView: null,
        reportData: []
      }
    },
    divider:{
      view: null
    },
    document: null
  };

  var jqueryAnimationFix = function() {
      // hack to fix a bug where overflow:hidden is added during animation but because
      // $.support.shrinkWrapBlocks = true, if Bootstrap is included(which normalizes a lot of
      // box sizing behavior, the promise function to remove the overflow:hidden doesn't get called.
      // I'm adding in a manual call to remove the overflow:hidden after the animation is finished.
      // demo of the issue can be seen here:http://jsfiddle.net/mpetrovich/cpw9J/
      var currentStyle = $(this).attr("style");
      $(this).attr({style:currentStyle.replace("overflow: hidden", "")});
  };

  module.setDivider = function($divider) {
    var dividerView,
        sketchViewWrapper,
        infoViewPanel = module.views.debug.reportView.parent().parent();

    module.divider.view = $divider;
    sketchViewWrapper = SketchViewer.canvas.parent();
    dividerView = module.divider.view;

    /**
     * This entire event handler performs poorly on firefox because it probably needs optimization.  Moving the
     * accordion lags the browser.
     */
    dividerView.mousedown(function(event) {
      var currentMouseLocation = false,
          lastMouseLocation = false,
          amountMoved = false;
      event.preventDefault();
      $(document).mousemove(function(e) {
        var currentWidth;

        currentMouseLocation = e.clientX;
          if (lastMouseLocation !== false) {
            amountMoved = currentMouseLocation - lastMouseLocation;
            currentWidth = infoViewPanel.width();
            if ((amountMoved > 0 &&
                sketchViewWrapper.offset().left + sketchViewWrapper.width() + amountMoved + 40 < $(document).width()) ||
              (amountMoved < 0 && currentWidth > 0)) {
              infoViewPanel.width(currentWidth + amountMoved);
              SketchViewer.tabs.css({'margin-left':(currentWidth + 24 + amountMoved) + 'px'});
            }
          }
          lastMouseLocation = currentMouseLocation;
      });
    });
    $(document).mouseup(function() {
      $(this).unbind("mousemove");
    });
    $(document).mouseleave(function() {
      $(this).unbind("mousemove");
    });
  };

  module.setTestPanelHeaderResult = function(result) {
    var html;
    if (result === 'passed') {
      html = '<img class="test-icon" src="images/passed.png">Passed';
    } else if (result === 'warning') {
      html = '<img class="test-icon" src="images/warning.png">Failed';
    } else {
      html = '<img class="test-icon" src="images/failed.png"> Failed';
    }
    module.views.tests.header.html(html);

  };

  module.disablePanel = function(panel) {
    if (module.views[panel].reportView) {
      module.views[panel].reportView.parent().addClass('disabled');
      module.views[panel].header.off("click.expand");
      module.views[panel].header.parent().find(".close-bar").off("click.expand");
    }
  };

  module.enablePanel = function(panel) {
    if (module.views[panel].reportView) {
      module.views[panel].reportView.parent().removeClass('disabled');
      module.views[panel].header.on("click.expand", function() {
        module.toggleTab(panel);
      });
      module.views[panel].header.parent().find(".close-bar").on("click.expand", function() {
        module.toggleTab(panel);
      });
    }
  };

  module.enableAllPanels = function() {
    for (var panel in module.views) {
      module.enablePanel(panel);
    }
  };

  module.disableAllPanels = function() {
    for (var panel in module.views) {
      module.disablePanel(panel);
    }
  };

  // Add msg to the debug log. msgKey (defaults to msg)
  // is used to track whether this message is a dupe of
  // the previous, and so we can consolidate rather than
  // add a message.
  module.addDebugMessage = function(msg, msgKey){
    var msgText;
    if( msgKey === undefined) {
      msgKey = msg;
    }

    if( module.lastDebugMessage === msgKey) {
      $("pre", module.views.debug.reportView).first().remove();
    }
    module.lastDebugMessage = msgKey;

    module.debugLogIndex += 1;
    msgText = module.debugLogIndex + ": " + msg;
    msgText = escapeHTML(msgText);
    module.views.debug.reportView.prepend($("<pre>" + msgText + "</pre>"));

    if( $("pre", module.views.debug.reportView).length > 512) {
      $("pre", module.views.debug.reportView).last().remove();
    }
  };

  module.setDebugPanel = function($view) {
    module.setView("debug", $view);
    //catch all wsp log events and send them to the debug panel
    $(document).on('gLog', function (evt, args) {
      if (args.logType !== 'perf') {
        var msg = args.logType;
        msg += ': ';
        msg += args.message;
        if (args.stack) {
          msg += '\n error: ';
          msg += args.stack;
        }
        module.addDebugMessage(msg);
      }
    });
    module.disablePanel('debug');
  };

  /**
   * This creates a connection between the debug panel and the new document, so
   * that when a new "event" happens in the document, it is logged in the
   * debug panel.  This method is usually called after a Sketch is loaded because
   * the "sketch.document" object isn't available until then.
   *
   * @param document
   * @param events
   */
  module.setDebugPanelEvents = function(document, events) {
     // Takes all the new API event and passes them to an event listener that outputs them to
     // the debug panel as text.
    document.canvasNode.on(events.join(' '), function(event, context, attributes) {
      var msg = 'Event: ', msgKey;

      msg += event.type + ": " + JSON.stringify(attributes);
      if( event.type === 'MoveDrag' || event.type === "MoveScroll") {
        msgKey = event.type + ":" + attributes.touchIdentifier;
      }
  
      module.addDebugMessage(msg, msgKey);
    });
  };

  module.setTestsPanel = function($view) {
    module.setView('tests', $view);
    module.disablePanel('tests');
  };

  module.setJSONPanel = function($view) {
    module.setView('json', $view);
    module.disablePanel('json');
  };

  module.setOptionsPanel = function($view, formElements, formDefaultData) {
    module.setView('options', $view);
    module.disablePanel('options');
    module.views.options.defaultOptions = formDefaultData;
    //we loop through all passed elements and add them to the form
    for (var input in formElements) {
      for (var element in formElements[input]) {
        module.views.options.reportView.append(formElements[input][element]);
      }
      //During this loop after we've added the element to the form, we set the value
      //in the form to whatever the passed default value is.
      if (module.views.options.defaultOptions[formElements[input][0]] === false ||
          module.views.options.defaultOptions[formElements[input][0]] === true) {
        $("input[value='"+module.views.options.defaultOptions[formElements[input][0]] +
              "'][name='" + formElements[input][0] + 
              "']").prop("checked", true);
        $("input[value!='"+module.views.options.defaultOptions[formElements[input][0]] +
              "'][name='" + formElements[input][0] +
              "']").prop("checked", false);
      } else {
        $("input[name='" + formElements[input][0] + "']").val(formDefaultData[formElements[input][0]]);
      }
    }
    //this is the event listener which is fired off when a form input is changed, and sets
    //the appropriate setting in GSP.gOptions and in localStorage for retrieval later
    var updateDebugOption = function() {
      var key = $(this).attr('name'),
          value = $(this).val();
      if (value === "true" || value === "false") {
        //convert string to boolean value
        value = (value === "true");
      }
      localStorage.setItem(key, value);
      GSP.gOptions[key] = value;
    };
    $view.find('input[type=radio]').click(updateDebugOption);
    $view.find('input[type=text]').on('input', updateDebugOption);

  };

  module.setView = function(tab, $view) {
    var tabView = module.views[tab];
    tabView.header = $view.find('header').first();
    tabView.reportView = $view.find('.report').first();
    tabView.reportView.slideUp(400, jqueryAnimationFix);
  };

  module.toggleTab = function(clickedTab) {
    for (var tab in module.views) {
      if (module.views[tab].reportView) {
        if (clickedTab === tab) {
          module.views[tab].reportView.slideToggle(400, jqueryAnimationFix).parent().toggleClass("opened");

        } else {
          module.views[tab].reportView.slideUp(400, jqueryAnimationFix).parent().removeClass("opened");
        }
      }
    }
  };

  module.clearPanel = function(tab) {
    //if the panel is not visible to the user, ther is nothing to collapse. options panel is not visible
    //to users not viewing a build specific exporter.
    if (module.views[tab].reportView) {
      module.views[tab].reportView.slideUp(400, jqueryAnimationFix).parent().removeClass("opened");
    }
    //clearing a panel means different things with each panel...
    if (tab !== "options") {
      //For all panels besides the options panel, we just empty out everything in it, in the
      //options panel, we don't do anything on "panel clear" because that panel is maintained
      //even when switching sketches or refreshing the page.
      module.views[tab].reportView.empty();
      if (tab === "tests") {
        module.views[tab].reportView.empty();
        //test tab has it's title changed, so we have to change the title to default
        module.views[tab].header.text("");
      }
    }
  };

  module.clearAllPanels = function() {
    for (var view in module.views) {
      module.clearPanel(view);
    }
  };

  //All functions dealing with debug panel
  module.savePanel = function(tab) {
    module.views[tab].reportData[SketchViewer.currPageIndex] = module.views[tab].reportData[SketchViewer.currPageIndex] || {};

    module.views[tab].reportData[SketchViewer.currPageIndex].text = module.views[tab].reportView.html();
    if (tab === 'debug') {
      module.views[tab].reportData[SketchViewer.currPageIndex].logIndex = module.logIndex;
      module.debugLogIndex = 0;
    }
  };

  module.loadPanel = function(tab) {
    module.views[tab].reportData[SketchViewer.currPageIndex] = module.views[tab].reportData[SketchViewer.currPageIndex]
                                                               || {logIndex: null, text: null};
    module.debugLogIndex = module.views[tab].reportData[SketchViewer.currPageIndex].logIndex || 0;
    module.views[tab].reportView.html(module.views[tab].reportData[SketchViewer.currPageIndex].text);
  };

  module.setJSONPanelData = function(jsonText) {
    module.views.json.reportView.text(jsonText);
  };

  module.setTestsPanelData = function(testResults) {
    var text = "";

    //compare report
    text += testResults.compare.success ?
        "<strong>Compare: </strong><span class='success'>Passed</span><br>" :
        "<strong>Compare: </strong><span class='error'>Failed</span><br>";
    text += "<strong>Compare Failures:</strong> <br>";
    for (var object in testResults.compare.failures) {
      text += object + ": " + testResults.compare.failures[object] + "<br>";
    }

    //unsupported report
    if (testResults.unsupportedObjects.unsupported) {
      //The supported objects test results
      text += testResults.unsupportedObjects.message;
      for (var unsupportedObject in testResults.unsupportedObjects.unsupported) {
        for (var key in testResults.unsupportedObjects.unsupported[unsupportedObject]) {
          //objects = the object id, key = type of object that isn't unsupported
          text += "<br>" + object + ": " + testResults.unsupportedObjects.unsupported[unsupportedObject][key];
        }
      }
    }
    module.views.tests.reportView.html(text);
  };

  return module;
}());