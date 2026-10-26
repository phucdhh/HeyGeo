$(document).ready(function () {
    var tocEl = $("#toc");
    var id;

    /*
     * Capture log messages to the log element of the current page.
     */
    $(document).bind('gLog', function (evt, args) {
      if( window.console && window.console.log) {
        window.console.log('GSP: ' + args.logType + ': ' + args.message);
      }
        
    });

    // make table of contents
    var tocBuf = "<ul class='toc'>";
    var first = true;
    if (tocEl.length > 0 && tocEl.is(':visible')) {
       $("h2,h3").each(function (index, element) {
          id = element.getAttribute("id");
          $(element).before("<a name='" + id + "'/>");
          if (element.tagName === "H2") {
              if (!first) { tocBuf += "</ul>\n"; }
          } 
          tocBuf += "<li class='toc-"+element.tagName+"'>";
          if (element.id === "ObjectKind" || 
              element.id === "ObjectConstraint" ||
              element.id === "ObjectGenus") {
              tocBuf += "<a href='javascript:toggle(\"#toc-" 
                  + element.id + "\")'>"+ element.innerHTML + "</a>";
          }
          else {
              tocBuf += "<a href='#" + id + "'>" + element.innerHTML + "</a>";
          }
          tocBuf += "</li>\n";
          if (element.tagName === "H2") {
             tocBuf += "<ul id='toc-" + element.id 
                 + "' style='display:none'>\n";
          } 
          first = false;
       });
    }
    else {
       $("article").css("marginLeft", "5pc");
    }
    tocBuf += "</ul>";
    tocEl.append(tocBuf);

    // wrap references to kind, constraint, genus, and type in internal links.
    $("span.kind,span.constraint,span.genus,span.type").wrap(function(){
        return '<a href="#' + this.innerHTML + '">';
    });
    
    // Augment external links with icon
    $('a[href^="http"]:not(:has(img))').addClass('external');

});

/* exported toggle */
function toggle(el) {
  $(el).slideToggle();
}

$(function() {
  function getParameterByName(name) {
    var match = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
  }
  
  var sketch = getParameterByName('sketch');
  var json = "sketches/" + sketch;
  var gspSketch = json.replace(/_export.json$/, ".gsp");

  $('.sketch-urlparam').WSP("loadSketch", {'data-url': json});
  $('.sketch-jsonparam').each(function() {
     $(this).attr("href", json);
  });
  $('.sketch-gspparam').each(function() {
     $(this).attr("href", gspSketch);
  });
});

// Start logo animation
$(function() {
	$(".top-logo .sketch_canvas").
		WSP("loadSketch", {
			"data-url": "./sketches/Logo_export.json",
			"onReady": function(sketch, metadata) {
				sketch.sQuery('[label="Animate"]').press();
			},
      sketchOptions: {
        sizeParentToContent: false
      }
    });
});
