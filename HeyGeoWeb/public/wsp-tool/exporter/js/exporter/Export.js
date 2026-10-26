/* global SketchViewer */

/* exported Export */
var Export = (function() {
  "use strict";
  
  var module = {
    defaults: {},
    optionsCache: sessionStorage
  };
  
  module.clearCache = function() {
    for(var option in module.optionsCache) {
      if (option.indexOf("_documentOptions.") >= 0) {
        try {
          delete module.optionsCache[option];
        } catch(e) {
          module.optionsCache.option = undefined;
        }
      }
    }
  };

  module.setCache = function(option, value) {
    module.optionsCache["_documentOptions." + option] = value;
  };

  module.getCache = function(option) {
    if ("_documentOptions." + option in module.optionsCache) {
      return module.optionsCache["_documentOptions." + option];
    }
    return undefined;
  };
  
  module.setPref = function (name, value) {
    var prefs = SketchViewer.storedSketch.sketchObj.metadata.authorPreferences;
    prefs[name.toLowerCase()] = value;
  };

    // The var name is disabled if major webpage or minor json is checked
  module.enableVarName = function($view) {
    var disable = $view.find('.export-major-json[value=webpage]').prop("checked") ||
                  $view.find('.export-minor-json[value=json]').prop("checked");
    $view.find('#varName [type=text]').prop("disabled", disable);
  };

  /**
   * Only one column of export subtype can be enabled(webpage or json), so this function
   * will enable one column and disable the other.
   *
   * @param Object $view
   * @param String group
   */
  module.enableExportMinorColumn = function($view, group) {
    $view.find('div.export-minor.' + group + '').parent().parent().css({"color": "black"}).find("input").prop('disabled', false);
    $view.find('div.export-minor:not(.' + group + ')').parent().parent().css({"color": "gray"}).find("input").prop('disabled', true);
    module.enableVarName($view);
  };
  
  function eachWidget (f) { // move to WIDGETS
    var widgetNames = ["stylewidget", "tracewidget", "labelwidget", "visibilitywidget", "deletewidget", "resetbutton"];
    widgetNames.forEach (f);
  }
      
  module.setExportMenuView = function($view) {
    $view.find('input').each(function() {
      var grouping = $(this).attr('class'),
          value = $(this).val();
      // First we check if this is checked by default so we can remember the state to
      // set when the user clicks on reset button
      if ($(this).is(':checked') && $(this).attr('type') !== "checkbox") {
        module.defaults[$(this).attr('class')] = $(this).val();
      } else if ($(this).attr('type') === "checkbox") {
        if ($(this).is(":checked")) {
          module.defaults[$(this).attr('class')] = true;
        } else {
          module.defaults[$(this).attr('class')] = false;
        }
      }

      // Then we check if we have the settings stored from a previous session, and restore
      // them if we do.
      if (module.getCache(grouping) && module.getCache(grouping) !== value) {
        // for radio buttons
        $view.find('input.' + grouping + '[value="' + module.getCache(grouping) + '"]').prop("checked", true);
      } else if (module.getCache(grouping) === "true") {
        // for checkboxes
        $(this).prop("checked", true);
      }

      // Now we check if the input is checked, and set that in the cache if it is.
      if ($(this).is(':checked')) {
        module.setCache(grouping, value);
      }
      // Add handler to set the sessionStorage
      $(this).on("change", function() {
        if ($(this).attr('type') === "checkbox") {
          module.setCache(grouping, $(this).is(":checked"));
        } else {
          module.setCache(grouping, value);
        }
      });
    });

    // We set the initial state of the export minor columns on page load
    module.enableExportMinorColumn($view, $view.find('input.export-major:checked').attr('data-group'));
    
    // Now we add handlers to change the columns whenever the export major setting is changed
    $view.find('input.export-major').on('change', function() {
      var group = $(this).attr('data-group');
      module.enableExportMinorColumn($view, group);
    });
    
    // We also need a handler when the export-minor-json radio buttons are checked or unchecked
    $view.find('input.export-minor-json[type=radio]').on('change', function() {
      module.enableVarName($view);
    });
    
    $view.find('#reset-export').click(function() {
      var value;
      for (var setting in module.defaults) {
        value = module.defaults[setting];
        if (value === true) {
          $view.find('input.' + setting).prop("checked", true).trigger("change");
        } else if (value === false) {
            $view.find('input.' + setting).prop("checked", false).trigger("change");
        } else {
          $view.find('input.' + setting + '[value="' + value + '"]').prop("checked", true).trigger("change");
        }
      }
    });
    
    $view.find('[name=varName]').blur(function(e) {
      this.value = (GSP.normalizeSketchName(this.value, {path: true})); // make it a legal var name, allowing a possible prepended path
    });

    // We actually send off the data to be exported
    $view.find(".export-buttons #submit-export").click(function(e) {
      var removeDebugProperties = $('input[name=remove-debug]:checked', '#optionsViewer').val(),
        postProcess = removeDebugProperties ? "removeDebugProperties" : "",
        storedSketch = SketchViewer.storedSketch,
        docName,
        docNameBase,
        spec,
        singleOrCollectionFlag,
        html,
        pageNames,
        jsonFilterOptions = {},
        exportMajor,
        exportMinor,
        pageSetting,
        includeWidgets, includePageControl, includeWspLogo;
        
      function checkWidgetSetting (name) {  // return true if the widget is checked
        return $("input." + name).prop ("checked");
      }
      
      function setFromCheckbox (inputClass, prefName) { // set both cache and pref from checkbox
        var enabled = $("input." + inputClass).prop ("checked");
        module.setPref (prefName, enabled);
        module.setCache (prefName, enabled);
      }

   
      
      exportMajor = module.getCache ("export-major");
      if (!exportMajor) {
        // SS: There's a bug somewhere that causes the module cache to go missing.
        // The user work-around is to reset the Webpage/JSON radio button, but naive users won't know this.
        // Until the bug is fixed, reset the cache from the form, logging the incident to the console.
        console.log ('export-major setting missing from cache: ', module.optionsCache);
        exportMajor = $view.find ('input.export-major:checked').val();
        module.setCache ("export-major", exportMajor);
      }
      pageSetting = module.getCache ("page");
      if (!pageSetting) {
        // Use the same work-around for the page setting in the cache.
        console.log ('page setting missing from cache: ', module.optionsCache);
        pageSetting = $view.find ('input.page:checked').val();
        module.setCache ("page", pageSetting);
      }
      
      if (exportMajor === "json") {
        exportMinor = $view.find("div.export-minor input:checked[data-group='json-group']").val();
        if (exportMinor === 'js') {   // use the legal var name as the doc name for script output
          storedSketch.sketchObj.metadata["original-document-name"] = $("#varName input").val() + "-json";
        }
      } else if (exportMajor ===  "webpage") {
        exportMinor = $view.find("div.export-minor input:checked[data-group='webpage-group']").val();
      } else {
        throw "No valid Export Major setting found.";
      }
      if (!exportMinor) {
        throw "No value found for export minor in group: " + module.getCache("export-major");
      }
      $view.find('input[name="export-minor"]').val(exportMinor);
      
      includePageControl = $("input.includePageControls").prop ("checked");
      includeWspLogo = $("input.includeWspLogo").prop ("checked");
      includeWidgets = includePageControl || includeWspLogo;
      eachWidget (function (name) { // make this call WIDGETS.eachWidget
        var checked = checkWidgetSetting (name);
        includeWidgets = includeWidgets || checked;
      });
      if (includePageControl) {
        module.setPref ("pagecontrol", true);
      }
      if (includeWspLogo) {
        module.setPref ("wsplogo", true);
      }

      setFromCheckbox ("includeUtilUpload", "uploadutil");
      setFromCheckbox ("includeUtilDownload", "downloadutil");
      setFromCheckbox ("disableScrolling", "disablescrolling");
      setFromCheckbox ("removeInaccessibleObjects", "removeinaccessibleobjects");
      
      jsonFilterOptions.disableScrolling = module.getCache("disablescrolling") === "true";
      jsonFilterOptions.disableSelectableForNonGeometricObjects = module.getCache("nongeometric-not-selectable") === "true";
      
      if( module.getCache("removeinaccessibleobjects") === "true")
        postProcess = "removeInaccessibleObjects";
      
      if (pageSetting === "current") {
        singleOrCollectionFlag = "single";
        jsonFilterOptions.currentPageIndex = SketchViewer.currPageIndex;
          spec = storedSketch.getSketchAsSinglePage(jsonFilterOptions);
      } else if (pageSetting === "entire") {
        singleOrCollectionFlag = "single";
        spec = storedSketch.getSketchObj(jsonFilterOptions);
      } else if (pageSetting === "individual") {
        singleOrCollectionFlag = "collection";
        spec = storedSketch.getSketchAsSeparatePages(jsonFilterOptions);
      } else {
        throw "No valid setting found for page setting in Export menu.";
      }
      docName = storedSketch.getSketchDocName();
      docNameBase = docName.substr(0, docName.lastIndexOf('.')) || docName;

      $('#exportForm').find('input[name="postProcess"]').val(postProcess);
      $('#exportForm').find('input[name="file-name"]').val(docNameBase || 'sketch');

      if (singleOrCollectionFlag === "single") {
        $('#exportForm').find('input[name="sketch-doc"]').val(JSON.stringify(spec, null, 2));
      } else {
        for(var index=0;index<spec.length;index++) {
          html = "<input name='sketch-doc" + index + "' type='hidden' class='sketch-collection'>";
          $("#exportForm").append(html);
          $("#exportForm").find("input[name='sketch-doc" + index + "']").val(JSON.stringify(spec[index], null, 2));
        }
        pageNames = storedSketch.getPageNames();
        html = "<input name='page-names' type='hidden' value='" + pageNames.join() + "' class='page-names'>";
        $("#exportForm").append(html);
      }
      if (includeWidgets) {
        html = "<input name='widgets' type='hidden' value='true' checked='true' data-group='webpage-group' class='widgets'>";
        $("#exportForm").append(html);
      }
      $('#exportForm').submit();
      $('.sketch-collection').remove();
      $('.page-names').remove();
      $('.widgets').remove();

    });
  };

  module.setExportMenuButtonView = function($button) {
    module.button = $button;
    module.disableButton();
  };

    // Set the initial state and handlers for the widgets controls
  module.enableWidgetButtons = function () {
    var sketch, metadata, prefs, pref, pagesCtlDisable, varName,
        pagesCtl = $("input.includePageControls");
    
    function initWidget (name) {
      var textEl = $("input[name='" + name + "'][type='text']"), // selector gets both the checkbox and the text.
          checkEl = $("input[name='" + name + "'][type='checkbox']");
          
      function enableButton (target) {  // target is the input element for the checkbox or the text
        var el = $(target),
            val = checkEl[0].checked,
            st = textEl[0].value,
            enabled, needsFocus;
        if (el[0] === checkEl[0]) { // checkbox was changed
          enabled = val;
          if (val && st === "none") { // checkbox enabled; if pages is "none" change to "all"
            st = "all";
            textEl[0].value = st;
            needsFocus = true;
          } else if (!val && st === "all") {
            st = "none";
            textEl[0].value = st;
          }
        } else {  // text was changed
          enabled = (st && st !== "none") ? true : false;
        }
        checkEl.prop ("checked", enabled);
        checkEl.prop ("value", enabled);
        if (enabled) {
          textEl.prop ("disabled", false);
          textEl.parent().css ({opacity: "1"});
          if (needsFocus) {
            textEl[0].focus();
            textEl[0].setSelectionRange (0, 99);
          }
        } else {
          textEl.prop ("disabled", true);
          textEl.parent().css ({opacity: "0.5"});
        }
        module.setPref (name, enabled ? st : "none");
      }
      
      pref = prefs [name];
      checkEl.prop ("checked", pref && pref !== "none" ? true : false);
      textEl.prop ("value", pref ? pref : "none");            
      enableButton (checkEl[0]);
      $("input[name='" + name + "']").on ("change", function (e) {
        enableButton (e.target);
      });
    }
    
    function setCheckbox (selector, value) {
      var $el = $(selector),
          val = !value || value === "false" || value === "none" ? false : true;
      $el.prop ("checked", val);
      $el.prop ("value", val);
    }
    
    sketch = SketchViewer.storedSketch.sketchObj;
    metadata = sketch.metadata;
    // wsp_runner has lower-cased the authorPreferences keys. Copy the new lower-cased
    // authorPreferences into the storedSketch so they get exported properly
    metadata.authorPreferences = SketchViewer.document.metadata.authorPreferences;
    if (!metadata.authorPreferences)  // create author prefs if they don't already exist
      metadata.authorPreferences = {};
    prefs = sketch.metadata.authorPreferences;
      // pref settings are already lowercased, so test them as lowercase
    
    $("input.disableScrolling").prop ("checked", prefs.disablescrolling ? true : false);
    $("input.removeInaccessibleObjects").prop ("checked", prefs.removeinaccessibleobjects ? true : false);
    $("input.includeWspLogo").prop ("checked", prefs.wsplogo ? true : false);
    $("input.includeUtilDownload").prop ("checked", prefs.downloadutil ? true : false);
    $("input.includeUtilUpload").prop ("checked", prefs.uploadutil ? true : false);
    setCheckbox ("input.disableScrolling", prefs.disablescrolling);
    setCheckbox ("input.removeInaccessibleObjects", prefs.removeinaccessibleobjects);
    setCheckbox ("input.includeWspLogo", prefs.wsplogo);
    setCheckbox ("input.includeUtilDownload", prefs.downloadutil);
    setCheckbox ("input.includeUtilUpload", prefs.uploadutil);
    
    eachWidget (function (name) { // make this call WIDGETS.eachWidget
      initWidget (name);
    });
    pagesCtlDisable = sketch.pages.length < 2;
    pagesCtl.prop ("disabled", pagesCtlDisable);
    pagesCtl.prop ("checked", !pagesCtlDisable);
    pagesCtl.parent().css ("opacity", pagesCtlDisable ? 0.5 : 1);
    varName = metadata["original-document-name"]; // create a legal var name from the doc name
    varName = GSP.normalizeSketchName (varName, {path: true});
    $("#varName input").val(varName);
  };

  module.disableButton = function() {
    module.button.find("button").attr({disabled:"disabled"}).addClass('disabled').
      find("span.caret").css({'border-top':'4px solid #EAEAEA'}).
      parent().parent().parent().find(".export-label").css({color:'#EAEAEA'}).
      parent().parent().find(".export-label").css({color:'#EAEAEA'}).
      parent().parent().find("#export-page-only").css({color:'#EAEAEA'}).
      children("input").attr({disabled:"disable"}).css({opacity: "0.2"});
  };

  module.enableButtons = function() {
    module.button.find("button").removeAttr("disabled").removeClass('disabled').
      find("span.caret").css({'border-top':'4px solid #000'}).
      parent().parent().find(".export-label").css({color:'#2f4159'}).
      parent().parent().find("#export-page-only").css({color:'#2f4159'}).
      children("input").removeAttr("disabled").css({opacity: "1"});
    module.enableWidgetButtons ();
  };

  module.setWidgetWidth = function (v) {
      $('#widget-width-value').html(v);
      $('.widget').width(v);
  };

  module.setWidgetHeight = function (v) {
      $('#widget-height-value').html(v);
      $('.widget').height(v);
  };

  return module;
}());
