/* global Export */
/* global SketchViewer */
/* global SketchContainer */
/* global InfoViewer */
/* global Logger */
/* global Server */

/* exported DragDrop */
var DragDrop = (function() {
  "use strict";

  var module = {
    view: null
  };

  module.loadSketchFromDropEvent = function(file) {

    //disable the sketch buttons until we are sure the sketch has loaded properly.  Enable buttons can be
    //found in SketchViewer.loadPage function
    module.moveFileUploadButtonBefore($("#tabs"));
    Export.disableButton();
    SketchViewer.disableControls();
    SketchViewer.resetSketchViewer();
    InfoViewer.clearAllPanels();

    if (/.*gsp$/.test(file.name)) {
      module.convertGSP(file);

    } else {
      // set handler for file contents.
        var reader = new FileReader();
        reader.onloadend = function(ev) {
          //if we are getting json directly from user view drag and drop a json file then convert it
          //into a multi-page sketch structure so we can use it
          var st = ev.target.result.replace(/^[^{]*/, ''),
              sketchContainer = new SketchContainer();
          try {
            jQuery.parseJSON(st);
            sketchContainer.setSketch(st);
            SketchViewer.loadSketch(sketchContainer);
          } catch(e) {
            module.setLoaderGif("An error occurred.  Contact us at wsp@kcptech.com for technical support.");
          }

        };
      reader.readAsText(file);
    }
  };

  module.setView = function($view) {
  //Drag over and Drag enter have to be disabled for Drop File event listener to properly work
    $view.on('dragover', false);
    $view.on('dragenter', false);

    $view.on(
      'drop',
      function(e){
        var files = e.originalEvent.dataTransfer && e.originalEvent.dataTransfer.files,
            count = files && files.length;
        //create necessary number of tabs
        for(var i=0; i < count; i++) {
          module.loadSketchFromDropEvent(files[i]);
        }
        return false;
      }
    );
    $view.find("#fileUploadButton").change(function() {
      //if you want to do multiple sketch loading, loop through all the files uploaded here
      //and load each one
      for(var i=0,length=this.files.length; i < length; i++) {
        module.loadSketchFromDropEvent(this.files[i]);
      }
      //this is done so that if the user wishes to load the same file again, e.g. in order
      //to refresh the sketch with changed debug options, it will still read the file input
      //as "changed".
      $(this).val(null);
    });
    $view.find("#fileUploadVisibleButton").click(function() {
      //value set to null is done so that if the user wishes to load the same file again, e.g. in order
      //to refresh the sketch with changed debug options, it will still read the file input
      //as "changed".
      $view.find("#fileUploadButton").trigger('click').val(null);
    });
    module.view = $view;
  };

  //Once we move this button away, we can no longer retrieve it using module.view.find()...
  module.moveFileUploadButtonBefore = function($element) {
    module.view.find("#fileUploadButtonWrapper").insertBefore($element)
      .find("#fileUploadVisibleButton").unbind().click(function() {$("#fileUploadButton").trigger('click');});
  };

  module.setLoaderGif = function(status) {
    var oldWidth = SketchViewer.canvas.width(),
        oldHeight = SketchViewer.canvas.height();
     if (status === "started") {
       SketchViewer.canvas.html("<img class='loader' src='images/ajax-loader.gif'>");
     } else if (status === "failed") {
      SketchViewer.canvas.html("<h1 class='subheader'>Failed to load any sketches.</h1>");
     } else {
      SketchViewer.canvas.html("<h1 class='subheader'>" + status + "</h1>");
     }
    var newWidth = SketchViewer.canvas.width(),
        newHeight = SketchViewer.canvas.height();

    // Avoid jarringly shrinking the canvas
    var child = $('<div/>').css('display', 'inline-block')
          .width(Math.max(oldWidth, newWidth))
          .height(oldHeight > newHeight ? (oldHeight - newHeight) : newHeight);
    SketchViewer.canvas.append(child);
   };

  module.convertGSP = function(file) {
    Server.convertGSP({
      file: file,
      initialize: function() {
        module.setLoaderGif("started");
        // to uniquely identify this generated sketch, reset whenever new sketch is loaded
        module.uid = Math.random().toString(36).slice(2);
      },
      onSuccess: function(response) {
        try {
          module.processResponseFromServer(response);
        } catch(e) {
          module.setLoaderGif("Failed to convert Sketch to JSON.");
          Logger.logEvent({
            message:"Failed to parse server response for convert.php request.",
            sketchName: file.name
          });
        }
      },
      onError: function(status) {
        module.setLoaderGif(
          "Server error occurred.  Contact us at wsp@kcptech.com for technical support."
        );
        Logger.logEvent({
          message:"Received " + status + " response for convert.php request",
          sketchName: file.name
        });
      },
      onUnknownError: function() {
        module.setLoaderGif(
          "An error occurred.  Contact us at wsp@kcptech.com for technical support."
        );
        Logger.logEvent({
          message:"A general error occurred during convert.php request.",
          sketchName: file.name
        });
      }
    });
  };

  module.getSketchFromServer = function (sketchName, loadDefaultTab) {
    loadDefaultTab = (!isNaN(parseInt(loadDefaultTab, 10))) ? loadDefaultTab : 0;
    $.ajax({
      url: "exporter/getSketch.php",
      data: 'sketchName='+sketchName,
      success: function (response) {
        if (typeof response === "object" && "sketches" in response) {
          module.processResponseFromServer(response, false);
          SketchViewer.document.switchPage( SketchViewer.document.getPageIdAtIndex( loadDefaultTab));
        }
      }
    });
  };

  module.processResponseFromServer = function(response, hideFailed) {
    var newSketch;
    hideFailed = hideFailed || false;
    module.moveFileUploadButtonBefore($("#tabs"));
    response = Server.parseServerResponse(response);
    if (response.sketchObj) {
      newSketch = new SketchContainer();
      module.setLoaderGif("Loading sketch...");
      newSketch.setSketch(response.sketchObj);
      //we need to add a setTimeout because this function causes the browser to busy enough to not be able to execute
      //the setLoaderGif function until after the sketch has already loaded.
      setTimeout(function() {
        SketchViewer.loadSketch(newSketch);
      }, 0);
    } else {
      if (hideFailed !== true) {
        module.setLoaderGif(response.message);
      }
    }
  };

  return module;
}());
