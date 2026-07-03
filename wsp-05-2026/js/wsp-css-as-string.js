GSP.css = 
"/* For now, these are not in less. Just import them raw. */\n"+
"/*!\n"+
"  Web Sketchpad. Copyright &copy; 2019 KCP Technologies, a McGraw-Hill Education Company. All rights reserved.\n"+
"  Version: Release: 2020Q3, semantic Version: 4.8.0, Build Number: 1077, Build Stamp: stek-MBP-2/20230622220250\n"+
"*/\n"+
"\n"+
"/*\n"+
" * Styles governing drawing contexts. Within the node we are given we\n"+
" * construct a relatively positioned base node. It contains an absolutely\n"+
" * positioned node that is used for clipping. All drawing context nodes\n"+
" * (canvas layers, html layers) are created within the\n"+
" * clipping node and are absolutely positioned. They must correspond exactly\n"+
" * to the height and width of the clipping node.\n"+
" */\n"+
".wsp-version-4-8-0.wsp-base-node {\n"+
"    position: relative;\n"+
"    display: inline-block;\n"+
"    cursor: default;\n"+
"    vertical-align: top;\n"+
"    font-size: 0px; /* inline-block adds grot heights for whitespace without this */\n"+
"    overflow: visible; /* prevents inheritance of overflow: scroll, which can\n"+
"                          cause layout issues */\n"+
"\n"+
"    /* Reset to default in case our containing elt has modified. */\n"+
"    white-space: normal;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-transform-node {\n"+
"  transform-origin: top left;\n"+
"  -webkit-transform-origin: top left;\n"+
"  -ms-transform-origin: top left;\n"+
"  position:absolute;\n"+
"  display: inline;\n"+
"  border-collapse: collapse;\n"+
"  border-spacing: 0px;\n"+
"  top: 0px; left: 0px;\n"+
"  padding: 0px; margin: 0px;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-main-row {\n"+
"  display: flex;  /* Need this so tool-container and sketch-container are full height */\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-sketch-container {\n"+
"  display: table-cell;\n"+
"  position: relative;\n"+
"  vertical-align: top;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-text-layer .wsp-responsive-borderwidth {\n"+
"  border-width: 1px;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-transform-large {\n"+
"  display: inline-block;\n"+
"}\n"+
".wsp-version-4-8-0  .wsp-transform-medium {\n"+
"  display: none;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-transform-small {\n"+
"  display: none;\n"+
"}\n"+
"\n"+
"\n"+
".wsp-version-4-8-0 .wsp-clip-node {\n"+
"    position: relative;\n"+
"    width: 100%;\n"+
"    height: 100%;\n"+
"    overflow: hidden;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-clip-node canvas, .wsp-version-4-8-0 .wsp-text-layer, .wsp-version-4-8-0 .wsp-effects {\n"+
"    position: absolute;\n"+
"    left: 0; top: 0;\n"+
"    z-index: 0;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .sketch_canvas {\n"+
"    -webkit-user-select: none;\n"+
"    -moz-user-select: -moz-none;\n"+
"}\n"+
"\n"+
"/*\n"+
" * Styles governing html-layer sketch objects.\n"+
" */\n"+
".wsp-version-4-8-0 .wsp-Measure, .wsp-version-4-8-0 .wsp-Point,\n"+
".wsp-version-4-8-0 .wsp-Text, .wsp-version-4-8-0 .wsp-Param,\n"+
".wsp-version-4-8-0 .wsp-Button, .wsp-version-4-8-0 .wsp-Expression,\n"+
".wsp-version-4-8-0 .wsp-Label, .wsp-version-4-8-0 .wsp-Table {\n"+
"    /*-webkit-touch-callout: none*/\n"+
"    /*-moz-touch-callout: none;*/\n"+
"    position:absolute;\n"+
"}\n"+
"\n"+
"\n"+
"/*\n"+
"  Buttons - see comment in wsp-skin.css for details\n"+
"*/\n"+
"\n"+
".wsp-version-4-8-0 .wsp-Button {\n"+
"    display: table;\n"+
"    border-collapse: separate;\n"+
"    border-spacing: 0px;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-Button-row {\n"+
"  display: table-row;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-Button-drag-handle {\n"+
"  display: table-cell;\n"+
"  content: \"\";\n"+
"  height:100%;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-Button-label-frame {\n"+
"  display: table-cell;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-Measure, .wsp-version-4-8-0 .wsp-Text, .wsp-version-4-8-0 .wsp-Param, .wsp-version-4-8-0 .wsp-Expression, .wsp-version-4-8-0 .wsp-Label {\n"+
"    font-size: 12px;\n"+
"    border: none;\n"+
"    margin: 0;\n"+
"    padding: 0;\n"+
"    background-color:transparent;\n"+
"    overflow-x: visible;\n"+
"    white-space: pre;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-Measure, .wsp-version-4-8-0 .wsp-Text {\n"+
"    cursor: default;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-Measure {\n"+
"    line-height: 1;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-Point {\n"+
"    cursor: pointer;\n"+
"    font-size: 8px;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-Expression .mfs-input {\n"+
"    cursor: text;\n"+
"}\n"+
"\n"+
"/* styles for MFS to HTML conversion */\n"+
".wsp-version-4-8-0 .mfs {\n"+
"    /*\n"+
"      border: solid thin red;\n"+
"    */\n"+
"    display: run-in;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-bracket:before {\n"+
"    content: '[';\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-bracket:after {\n"+
"    content: ']';\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-curly:before {\n"+
"    content: '{';\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-curly:after {\n"+
"    content: '}';\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-tightness-normal {\n"+
"    letter-spacing: normal;\n"+
"}\n"+
".wsp-version-4-8-0 .mfs-tightness-condensed {\n"+
"    letter-spacing: -0.1em;\n"+
"}\n"+
".wsp-version-4-8-0 .mfs-tightness-expanded {\n"+
"    letter-spacing: .2em;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-frac {\n"+
"    display: inline-block;\n"+
"    font-size: 90%;\n"+
"    vertical-align: middle;\n"+
"    text-align: center;\n"+
"}\n"+
"\n"+
"\n"+
".wsp-version-4-8-0 .mfs-paren + .mfs-exponent,\n"+
".wsp-version-4-8-0 .mfs-abs + .mfs-exponent,\n"+
".wsp-version-4-8-0 .mfs-root + .mfs-exponent {\n"+
"    vertical-align: .9em;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-exponent{\n"+
"    vertical-align: super;\n"+
"    font-size: 70%;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-frac .mfs-numr, .wsp-version-4-8-0 .mfs-frac .mfs-denm{\n"+
"    display: block;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-super-group, .wsp-version-4-8-0 .mfs-sub-group, .wsp-version-4-8-0 .mfs-horizontal, .wsp-version-4-8-0 .mfs-root, .wsp-version-4-8-0 .mfs-paren,\n"+
".wsp-version-4-8-0 .mfs-bracket, .wsp-version-4-8-0 .mfs-curly, .wsp-version-4-8-0 .mfs-abs {\n"+
"    display: inline-block;\n"+
"    text-decoration: inherit;\n"+
"}\n"+
".wsp-version-4-8-0 .mfs-horizontal {\n"+
"  white-space: pre;\n"+
"}\n"+
".wsp-version-4-8-0 .mfs-param {\n"+
"    /*\n"+
"     * background-color: lightgray;\n"+
"     */\n"+
"    display: inline-block;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 tbody { vertical-align: baseline; }\n"+
"\n"+
".wsp-version-4-8-0 .mfs-paren, .wsp-version-4-8-0 .mfs-root,\n"+
".wsp-version-4-8-0 .mfs-abs {\n"+
"    display: inline-table;\n"+
"    border-collapse: collapse;\n"+
"    border-spacing: 0px;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-paren td, .wsp-version-4-8-0 .mfs-root td,\n"+
".wsp-version-4-8-0 .mfs-abs td {\n"+
"    padding: 0px;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-paren td.mfs-left-paren,\n"+
".wsp-version-4-8-0 .mfs-paren td.mfs-right-paren,\n"+
".wsp-version-4-8-0 .mfs-abs td.mfs-abs-bar\n"+
" {\n"+
"    background-size: 100% 100%;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-root td.mfs-left-root {\n"+
"    background-size: 105% 100%;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-root td.mfs-right-root {\n"+
"    background-size: 100% 100%;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 td.mfs-right-root {\n"+
"    padding-top: .15em;\n"+
"}\n"+
"\n"+
"/* Paren TD's have a dummy span under them, which fixes a rendering\n"+
"issue with chrome. If you set the width of the TD itself, chrome adds\n"+
"an extra two pixels to the adjoing td containing the parenthesized\n"+
"expression! */\n"+
".wsp-version-4-8-0 .mfs-paren td.mfs-left-paren >span,\n"+
".wsp-version-4-8-0 .mfs-paren td.mfs-right-paren >span\n"+
"{\n"+
"    display: inline-block;\n"+
"    width: .35em;\n"+
"}\n"+
"\n"+
"/* See above comment on paren TD's */\n"+
".wsp-version-4-8-0 .mfs-root td.mfs-left-root >span\n"+
"{\n"+
"    display: inline-block;\n"+
"    width: .7em;\n"+
"}\n"+
"\n"+
"/* See above comment on paren TD's */\n"+
".wsp-version-4-8-0 .mfs-abs td.mfs-abs-bar >span\n"+
"{\n"+
"    display: inline-block;\n"+
"    width: .2em;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-subscript {\n"+
"    font-size: smaller;\n"+
"    vertical-align: sub;\n"+
"}\n"+
".wsp-version-4-8-0 .mfs-style {\n"+
"    display: inline;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-overbar-arc, .wsp-version-4-8-0 .mfs-overbar-ray, .wsp-version-4-8-0 .mfs-overbar-line,\n"+
".wsp-version-4-8-0 .mfs-overbar-seg {\n"+
"    display: inline-block;\n"+
"    line-height: 1.4;\n"+
"    background-repeat: no-repeat;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-overbar-ray, .wsp-version-4-8-0 .mfs-overbar-line {\n"+
"    background-size: 100% .3em;\n"+
"    padding-top: .02em;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-overbar-arc {\n"+
"    background-size: 100% .7em;\n"+
"    padding-top: .55em;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-overbar-seg {\n"+
"    background-size: 100% 100%;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-overbar-line > .mfs-horizontal .mfs-text:last-child:after,\n"+
".wsp-version-4-8-0 .mfs-overbar-ray > .mfs-horizontal .mfs-text:last-child:after {\n"+
"    content: \"\\200A\\200A\"; /* two hair spaces */\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-overbar-seg > .mfs-horizontal .mfs-text:last-child:after {\n"+
"    content: \"\\200A\"; /* one hair space */\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-underbar-seg {\n"+
"    border-bottom-width: thin;\n"+
"    border-bottom-color: black;\n"+
"    border-bottom-style: solid;\n"+
"    line-height: 0.9;\n"+
"    display: inline-block;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-text {\n"+
"    display: inline;\n"+
"}\n"+
"\n"+
"/* Add some padding to the left of italic text, to workaround\n"+
"  WSP-1751 \"In Safari, screen garbage left behind when you drag a parameter\"\n"+
"*/\n"+
".wsp-version-4-8-0 .wsp-Expression > .mfs-horizontal:first-child > .mfs-text.mfs-text-italic:first-child,\n"+
".wsp-version-4-8-0 .wsp-Expression > .mfs-horizontal:first-child > .mfs-horizontal:first-child > .mfs-text.mfs-text-italic:first-child,\n"+
".wsp-version-4-8-0 .wsp-Expression > .mfs-horizontal:first-child > .mfs-sub-group:first-child > .mfs-text.mfs-text-italic:first-child,\n"+
".wsp-version-4-8-0 .wsp-Expression > .mfs-horizontal:first-child > .mfs-horizontal:first-child > .mfs-sub-group:first-child > .mfs-text.mfs-text-italic:first-child,\n"+
".wsp-version-4-8-0 .wsp-Measure > .mfs-horizontal:first-child > .mfs-horizontal:first-child > .mfs-text.mfs-text-italic:first-child\n"+
" {\n"+
"    padding-left: 0.2em;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-vertical-group {\n"+
"    display: inline-block;\n"+
"}\n"+
"\n"+
"/* This allows us to use a negative margin to shrink the size,\n"+
"accomodating borders. If we're a child of an mfs-vertical-group, this property\n"+
"is overridden by that child selector. */\n"+
".wsp-version-4-8-0  .wsp-mfs-reference {\n"+
"    display: inline-block;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-vertical-group > * {\n"+
"    display: block;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-text-layer * {\n"+
"    -ms-user-select: none;\n"+
"    -webkit-user-select: none;\n"+
"    -moz-user-select: none;\n"+
"    -o-user-select: none;\n"+
"    user-select: none;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-text-layer {\n"+
"    line-height: normal;\n"+
"    pointer-events: none;\n"+
"    border: none;\n"+
"}\n"+
"\n"+
"/* Add border:none to make sure mfs nodes based on html tables (such as mfs-paren) don't inherit disfiguring borders */\n"+
".wsp-version-4-8-0 .wsp-text-layer table,\n"+
".wsp-version-4-8-0 .wsp-text-layer td,\n"+
".wsp-version-4-8-0 .wsp-text-layer tr {\n"+
"    border: none;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .mfs-input {\n"+
"    font-size: inherit;\n"+
"    display: inline-block;\n"+
"    white-space: nowrap;\n"+
"    overflow: visible;\n"+
"    color: inherit;\n"+
"    font-family: inherit;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-numeric {\n"+
"     position: absolute;\n"+
"   }\n"+
"\n"+
".wsp-version-4-8-0 .wsp-numfield-text {\n"+
"    white-space: nowrap;\n"+
"}\n"+
"\n"+
"@-webkit-keyframes blinker { from {opacity:1.0;} to {opacity:0.0;} }\n"+
"          @keyframes blinker { from {opacity:1.0;} to {opacity:0.0;} }\n"+
".wsp-version-4-8-0 .wsp-blink {\n"+
"    font-size: larger;\n"+
"    color: black;\n"+
"    font-stretch: ultra-condensed;\n"+
"    /*text-decoration:blink;*/\n"+
"\n"+
"    -webkit-animation-name:blinker;\n"+
"            animation-name:blinker;\n"+
"    -webkit-animation-iteration-count:infinite;\n"+
"            animation-iteration-count:infinite;\n"+
"    -webkit-animation-timing-function:cubic-bezier(1.0,0,0,1.0);\n"+
"            animation-timing-function:cubic-bezier(1.0,0,0,1.0);\n"+
"    -webkit-animation-duration:1s;\n"+
"            animation-duration:1s;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-selected {\n"+
"    background-color: yellow;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Numberpad {\n"+
"    position: absolute;\n"+
"    pointer-events: auto;\n"+
"    -webkit-user-drag: element;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-Numberpad:focus {\n"+
"    outline: 0;\n"+
"    border: 1px solid black;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-Numberpad, .wsp-version-4-8-0 .wsp-Numberpad *,\n"+
".wsp-version-4-8-0 .wsp-Numberpad *:before, .wsp-version-4-8-0 .wsp-Numberpad *:after {\n"+
"    /** needs to be set to default in case it has been changed by any plugins/frameworks **/\n"+
"    /* Bootstrap changes the setting of box-sizing, which is a setting\n"+
"       that tells browser whether to take margin, padding into account when imposing the\n"+
"       height/width property. */\n"+
"    -webkit-box-sizing: content-box;\n"+
"    -moz-box-sizing: content-box;\n"+
"    box-sizing: content-box;\n"+
"}\n"+
"\n"+
"/* The body of the Numberpad */\n"+
".wsp-version-4-8-0 .wsp-Numberpad-body {\n"+
"    display: -webkit-flex;\n"+
"    display: flex;\n"+
"    -webkit-flex-direction: column;\n"+
"    flex-direction: column;\n"+
"    -webkit-justify-content: space-around;\n"+
"    justify-content: space-around;\n"+
"}\n"+
"\n"+
"/* A row of Buttons */\n"+
".wsp-version-4-8-0 .wsp-Numberpad-row {\n"+
"    display: -webkit-flex;\n"+
"    display: flex;\n"+
"    -webkit-flex-direction: row;\n"+
"    flex-direction: row;\n"+
"    -webkit-justify-content: space-around;\n"+
"    justify-content: space-around;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-error-message {\n"+
"  text-align: center;\n"+
"  margin-top: 25px;\n"+
"  margin-bottom: 25px;\n"+
"  color: red;\n"+
"  font-size: 125%;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-tool-container {\n"+
"  display: table-cell;\n"+
"  position: relative;\n"+
"  vertical-align: top;\n"+
"}\n"+
"\n"+
".wsp-version-4-8-0 .wsp-tool-container .wsp-tool-column .wsp-tool.wsp-draggable-toolButton {\n"+
"  position: absolute;\n"+
"  /* Set the z-index. The stacking context is the wsp-transform-node. We\n"+
"  need our z-index to place us above the wsp-sketch-container, over\n"+
"  which we will be dragged. Otherwise, a sketch with a non-transparent\n"+
"  background will occlude us. */\n"+
"  z-index: 1;\n"+
"}\n"+
"\n"+
"\n"+
".wsp-version-4-8-0 .wsp-tool > img {\n"+
"  display: block;\n"+
"}\n"+
"\n"+
"\n"+
".wsp-version-4-8-0 .wsp-text-target-highlight {\n"+
"  background-color: rgba(255,0,0,0.5) !important;\n"+
"}\n"+
"\n"+
"/* We could, if desired, move the wsp-Transform section into\n"+
" * wsp-skin.css and make the transform skinnable.\n"+
" * For that to be worthwhile, we would need to make the scale factors\n"+
" * used customizable. The css transform isn't a problem - customizers\n"+
" * just change it. But wsp.js needs to know that at init time, and it's\n"+
" * a bit tricky to encode something in css readable by js (e.g. hiding some info\n"+
" * in a hidden node is stymied by browsers that don't set properties until the node\n"+
" * is displayed. You could stash something in content::after but querying that isn't\n"+
" * supported on IE). Best I can think of here is to have a wsp-responsize-size-small-factor\n"+
" * class (and medium, etc.), with some property like opacity set to [0,1]. Code would then sniff that\n"+
" * by inserting a node into the DOM. This would have to match the value used in transform: scale();\n"+
" */\n"+
"/* Section Start: wsp-Transform */\n"+
"\n"+
"/* The transform node is the target for css transforms that\n"+
"  scale down the content to fit in smaller form factor devices.\n"+
"\n"+
"  CSS transforms are used for the scaling - but since those\n"+
"  do not change the content size of their targets, we need\n"+
"  to fix our content size too. The technique used is to take\n"+
"  the actual content containing wsp-transform-node out of the flow,\n"+
"  and create sibling DOM elements (wsp-transform-large, wsp-transform-medium,\n"+
"  wsp-transform-small) of appropriate size, and make sure the right one is displayed\n"+
"  while the rest are not.\n"+
"*/\n"+
"\n"+
"/* .wsp-transform-node will be position: absolute, with transform-origin: top left\n"+
"  wsp-transform-large by default is display: inline-block,\n"+
"  wsp-transform-medium, wsp-transform-small are display: none\n"+
"  Turn on large, medium, small using media queries - you'll need to override the\n"+
"  default ones.\n"+
"*/\n"+
"\n"+
"/*\n"+
" *  For our default sizing, some assumptions and numbers.\n"+
" *  For a normal desktop sketch, we'll take a usual width as 800px (Mac window is 780x540 by default)\n"+
" *\n"+
" *  For a mobile friendly document, we'll take as a baseline iPad landscape width (1024), where our ideal sketch width is 600px.\n"+
" *  On iPad portrate width (768px = 75% of 1024px), our ideal sketch width is 400px (75% of 600px)\n"+
" *  On Smartphone portrate (480px = 46.875% of 1024px), our ideal sketch width is 300px (50% of 600px)\n"+
" *\n"+
" *  The media queries are conditionalized by several classes on the root node.\n"+
" *  wsp-responsiveSizing: must be present for responsive sizing to be in effect\n"+
" *  wsp-responsiveSizing-small-size: support the 50% size;\n"+
" *  wsp-responsiveSizing-medium-size: support the 75% size;\n"+
" *  wsp-responsiveSizing-medium-break: if present, a break at the medium device width\n"+
" *    chooses medium size if available, otherwise small size\n"+
" *  wsp-responsiveSizing-small-break: if present, a break at the small device width\n"+
" *    chooses small size if available, otherwise medium size\n"+
" *\n"+
" */\n"+
"\n"+
"/*\n"+
" * First break half way between iPad landscape and iPad Portrate\n"+
" * ideal sketch width: 400px;\n"+
" * max-width: 892px\n"+
" * scale factor: 0.75;\n"+
"*/\n"+
"@media only screen and (max-width: 892px) {\n"+
"\n"+
"\n"+
"  /* Small size default if .wsp-responsiveSizing-medium-size*/\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-medium-break.wsp-responsiveSizing-small-size .wsp-transform-large {\n"+
"    display: none;\n"+
"  }\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-medium-break.wsp-responsiveSizing-small-size .mfs-responsive-borderwidth {\n"+
"    border-width: 2px;\n"+
"  }\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-medium-break.wsp-responsiveSizing-small-size .wsp-transform-medium {\n"+
"    display: none;\n"+
"  }\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-medium-break.wsp-responsiveSizing-small-size .wsp-transform-small {\n"+
"    display: inline-block;\n"+
"  }\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-medium-break.wsp-responsiveSizing-small-size .wsp-transform-node {\n"+
"    transform: scale(0.5);\n"+
"    -webkit-transform: scale(0.5);\n"+
"    -ms-transform: scale(0.5);\n"+
"  }\n"+
"\n"+
"  /* Override with medium size if wsp-responsiveSizing-medium-size */\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-medium-break.wsp-responsiveSizing-medium-size .wsp-transform-large {\n"+
"    display: none;\n"+
"  }\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-medium-break.wsp-responsiveSizing-medium-size .mfs-responsive-borderwidth {\n"+
"    border-width: 2px;\n"+
"  }\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-medium-break.wsp-responsiveSizing-medium-size .wsp-transform-medium {\n"+
"    display: inline-block;\n"+
"  }\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-medium-break.wsp-responsiveSizing-medium-size .wsp-transform-small {\n"+
"    display: none;\n"+
"  }\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-medium-break.wsp-responsiveSizing-medium-size .wsp-transform-node {\n"+
"    transform: scale(0.75);\n"+
"    -webkit-transform: scale(0.75);\n"+
"    -ms-transform: scale(0.75);\n"+
"  }\n"+
"}\n"+
"\n"+
"/*\n"+
" * Second break half way between iPad portrate and Smartphone portrate\n"+
" * ideal sketch width: 300px;\n"+
" * max-width: 624px\n"+
" * scale factor: 0.5;\n"+
"*/\n"+
"@media only screen and (max-width: 624px) {\n"+
"\n"+
"  /* Default to medium size if .wsp-responsiveSizing-medium-size */\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-small-break.wsp-responsiveSizing-medium-size .wsp-transform-large {\n"+
"    display: none;\n"+
"  }\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-small-break.wsp-responsiveSizing-medium-size .mfs-responsive-borderwidth {\n"+
"    border-width: 2px;\n"+
"  }\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-small-break.wsp-responsiveSizing-medium-size .wsp-transform-medium {\n"+
"    display: inline-block;\n"+
"  }\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-small-break.wsp-responsiveSizing-medium-size .wsp-transform-small {\n"+
"    display: none;\n"+
"  }\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-small-break.wsp-responsiveSizing-medium-size .wsp-transform-node {\n"+
"    transform: scale(0.75);\n"+
"    -webkit-transform: scale(0.75);\n"+
"    -ms-transform: scale(0.75);\n"+
"  }\n"+
"\n"+
"  /* Override to small size if .wsp-responsiveSizing-small-size */\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-small-break.wsp-responsiveSizing-small-size .wsp-transform-large {\n"+
"    display: none;\n"+
"  }\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-small-break.wsp-responsiveSizing-small-size .mfs-responsive-borderwidth {\n"+
"    border-width: 2px;\n"+
"  }\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-small-break.wsp-responsiveSizing-small-size .wsp-transform-medium {\n"+
"    display: none;\n"+
"  }\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-small-break.wsp-responsiveSizing-small-size .wsp-transform-small {\n"+
"    display: inline-block;\n"+
"  }\n"+
"  .wsp-version-4-8-0.wsp-responsiveSizing.wsp-responsiveSizing-small-break.wsp-responsiveSizing-small-size .wsp-transform-node {\n"+
"    transform: scale(0.5);\n"+
"    -webkit-transform: scale(0.5);\n"+
"    -ms-transform: scale(0.5);\n"+
"  }\n"+
"}\n"+
"/* Section End: wsp-Transform */\n"+
"\n"+
"/* Section Start: wsp-Calculator */\n"+
"/* On mobile safari, there's an annoying dark background tap effect\n"+
"   in our mathquill edit area. Turn if off */\n"+
".wsp-version-4-8-0 .wsp-Calculator-display {\n"+
"  -webkit-tap-highlight-color: rgba(0,0,0,0);\n"+
"}\n"+
"/* Section End: wsp-Calculator */\n"+
"\n"+
"/* CSS Utilities */\n"+
"\n"+
"/* A version of the clearfix a la https://css-tricks.com/snippets/css/clear-fix/ */\n"+
".wsp-version-4-8-0 .wsp-clearfix-group:after {\n"+
"  content: \"\";\n"+
"  display: table;\n"+
"  clear: both;\n"+
"}\n"+
"\n"+
".wsp-sr-only {\n"+
"  border: 0;\n"+
"  height: 100%;\n"+
"  overflow: hidden;\n"+
"  top: 0;\n"+
"  position: absolute;\n"+
"  width: 100%;\n"+
"  color: transparent;\n"+
"  background-color: transparent;\n"+
"  pointer-events: none;\n"+
"}\n"+
".wsp-sr-only:focus {\n"+
"  outline: none !important;\n"+
"}\n"+
".wsp-live-node {\n"+
"  width: 0;\n"+
"  height: 0;\n"+
"  margin: -1px;\n"+
"  overflow: hidden;\n"+
"  clip: rect(0, 0, 0, 0);\n"+
"  border: 0;\n"+
"}\n"+
".wsp-version-4-8-0 {\n"+
"  /*\n"+
"  Web Sketchpad. Copyright &copy; 2019 KCP Technologies, a McGraw-Hill Education Company. All rights reserved.\n"+
"  Version: Release: 2020Q3, semantic Version: 4.8.0, Build Number: 1077, Build Stamp: stek-MBP-2/20230622220250\n"+
"*/\n"+
"  /* Section Start: wsp-Button */\n"+
"  /*\n"+
"\n"+
"  The outer element of a button will have class .wsp-Button\n"+
"  Additional modifiers will be added as classes\n"+
"  .wsp-appearance-drag: The button is being dragged / moved;\n"+
"  .wsp-appearance-unselect: The button is not arrow selectable\n"+
"    and thus not draggable;\n"+
"  .wsp-appearance-short: The button is < 28 pixels high;\n"+
"  .wsp-appearance-pressed: The button is depressed by user action;\n"+
"  .wsp-appearance-active: The button is performing its action, which may\n"+
"    continue after it's been clicked;\n"+
"\n"+
"\n"+
"  Within the button we have some substructure to allow\n"+
"  for a drag handle, a row of mfs text, and allow for the text\n"+
"  top to move down one pixel during a click as part of it's depressed\n"+
"  appearance.\n"+
"\n"+
"  wsp-Button contains a wsp-Button-row\n"+
"  wsp-Button-row contains a wsp-Button-drag-handle and a wsp-Button-label-frame\n"+
"  wsp-Button-label-frame contains a wsp-Button-label\n"+
"\n"+
"+-------------------wsp-Button--------------------------+\n"+
"o--wsp-Button-row-x------wsp-Button-label-frame--------o|\n"+
"||                |                                    ||\n"+
"||                +------------------------------------||\n"+
"|| wsp-Button-    |                                    ||\n"+
"|| drag-handle    |                                    ||\n"+
"||                |    wsp-Button-label                ||\n"+
"||                |                                    ||\n"+
"||                |                                    ||\n"+
"o-----------------x------------------------------------o|\n"+
"+-------------------------------------------------------+\n"+
"\n"+
"*/\n"+
"  /* base style for the whole button */\n"+
"  /* When it's dragging about, lighten it up */\n"+
"  /* Styles for the handle - the dragable bit on the left of the button */\n"+
"  /* When the button is short (< 28 px high) */\n"+
"  /* Non-arrow selectable buttons don't have a full sided drag handle.\n"+
" It just becomes a narrow vertical strip */\n"+
"  /* frame the button label (where the text is).\n"+
" The frame is the part that's stable when the button is pressed down,\n"+
" so it's just responsible for the top border */\n"+
"  /* Some padding and border for the interior portion of the label */\n"+
"  /* When pressed the frame lets the the label handle the\n"+
" border so it can move down a pixel */\n"+
"  /* Add the border on the top now that the frame has punted it to us */\n"+
"  /* When the button is working, a background */\n"+
"  /* When the button is working, it looks pressed */\n"+
"  /*\n"+
"If you want to remove the drag handle completely, here is one approach:\n"+
"\n"+
".wsp-Button-drag-handle {\n"+
"  display: none !important;\n"+
"}\n"+
"\n"+
".wsp-Button-label-frame {\n"+
"  border-left: 2px solid #c2b892 !important;\n"+
"  border-bottom-left-radius: 5px !important;\n"+
"  border-top-left-radius: 5px !important;\n"+
"}\n"+
"\n"+
".wsp-Button-label {\n"+
"  padding: 0px 3px 0px 3px !important;\n"+
"}\n"+
"*/\n"+
"  /* Section End: wsp-Button */\n"+
"  /* Section Start: wsp-HotText */\n"+
"  /*\n"+
"  Tweak the \"hot\" part of the appearance of a hot-text caption.\n"+
"*/\n"+
"  /* Section End: wsp-HotText */\n"+
"  /* Section Start: wsp-Tool */\n"+
"  /*\n"+
"\n"+
".wsp-tool-container contains a .wsp-tool-column\n"+
".wsp-tool-column contains a number of individual .wsp-tool's\n"+
"\n"+
"A .wsp-tool is an instance of a tool.\n"+
"\n"+
"Note that Numpad and Tools share a png of a \"X\"\n"+
"\n"+
"\n"+
"To move the tool palette to the right, you will need change the float\n"+
"of the .wsp-sketch-container and .wsp-tool-container, and change some padding and\n"+
"margins.\n"+
"\n"+
".wsp-sketch-container {\n"+
"  float: left!important;\n"+
"}\n"+
".wsp-tool-container {\n"+
"  float: right!important;\n"+
"  padding-right: 0px!important;\n"+
"  margin-right: 0px!important;\n"+
"  padding-left: 10px!important;\n"+
"  margin-left: 5px!important;\n"+
"}\n"+
"\n"+
"*/\n"+
"  /* colors */\n"+
"  /* default background */\n"+
"  /* active tool text color */\n"+
"  /* new look tools: border color */\n"+
"  /* undo/redo background color */\n"+
"  /* Toolplay classic Look: Background to blend in with box-shadow -\n"+
"  you see this outside the rounded border */\n"+
"  /* Toolplay New Look: Tool text color */\n"+
"  /* a common background color */\n"+
"  /* Toolplay new look: Background color for undo/redo hover */\n"+
"  /* These tool styles are shared between new and classic looks. */\n"+
"  /* Section End: wsp-Tool */\n"+
"  /* Section Start: wsp-Parameter */\n"+
"  /*\n"+
"  Styles for the box around editable values in the sketch\n"+
"*/\n"+
"  /* Section End: wsp-Parameter */\n"+
"  /* Section Start: wsp-Numberpad */\n"+
"  /*\n"+
"  A numeric entry keypad or \"Numberpad\" has a header and a body. The\n"+
"  body contains rows of entries, which are either keys or blank\n"+
"  spaces.\n"+
"\n"+
" *\n"+
" *  +-wsp-Numberpad------------------------------------------------------------------+\n"+
" *  | +-wsp-Numberpad-header-------------------------------------------------------+ |\n"+
" *  | |                                                                            | |\n"+
" *  | |                                                       wsp-Numberpad-cancel | |\n"+
" *  | |                                                           +--------------+ | |\n"+
" *  | |                                                           |              | | |\n"+
" *  | |                                                           |       X      | | |\n"+
" *  | |                                                           +--------------+ | |\n"+
" *  | +----------------------------------------------------------------------------+ |\n"+
" *  | +-wsp-Numberpad-Body---------------------------------------------------------+ |\n"+
" *  | | +wsp-Numberpad-Row-------------------------------------------------------+ | |\n"+
" *  | | | +wsp-Numberpad-key/element/key-1-----+           +-----------+         | | |\n"+
" *  | | | |          |             |           |           |           |         | | |\n"+
" *  | | | |    1     |             |      2    |           |     3     |         | | |\n"+
" *  | | | +----------+             +-----------+           +-----------+         | | |\n"+
" *  | | +------------------------------------------------------------------------+ | |\n"+
" *  | | +------------------------------------------------------------------------+ | |\n"+
" *  | | |  +----------+             +----------+           +-----------+         | | |\n"+
" *  | | |  |          |             |          |           |           |         | | |\n"+
" *  | | |  |    4     |             |     5    |           |     6     |         | | |\n"+
" *  | | |  +----------+             +----------+           +-----------+         | | |\n"+
" *  | | +------------------------------------------------------------------------+ | |\n"+
" *  | | +-----------------------------------------------------------------------+  | |\n"+
" *  | | +  +----------+             +----------+           +-----------+        |  | |\n"+
" *  | | |  |          |             |          |           |           |        |  | |\n"+
" *  | | |  |    7     |             |     8    |           |     9     |        |  | |\n"+
" *  | | |  +----------+             +----------+           +-----------+        |  | |\n"+
" *  | | +-----------------------------------------------------------------------+  | |\n"+
" *  | | +-----------------------------------------------------------------------+  | |\n"+
" *  | | |  +----------+             +-----------+          +-----------+        |  | |\n"+
" *  | | |  |          |             |           |          |           |        |  | |\n"+
" *  | | |  |    .     |             |     0     |          |    +/-    |        |  | |\n"+
" *  | | |  +----------+             +-----------+          +-----------+        |  | |\n"+
" *  | | +-----------------------------------------------------------------------+  | |\n"+
" *  | |                                                                            | |\n"+
" *  | | +-----------------------------------------------------------------------+  | |\n"+
" *  | | |  +---------+                                     +-----------+        |  | |\n"+
" *  | | |  |         |                                     |           |        |  | |\n"+
" *  | | |  | clear   |                                     |delete-left|        |  | |\n"+
" *  | | |  +---------+                                     +-----------+        |  | |\n"+
" *  | | +-----------------------------------------------------------------------+  | |\n"+
" *  | |                                                                            | |\n"+
" *  | |                                                                            | |\n"+
" *  | +----------------------------------------------------------------------------+ |\n"+
" *  +--------------------------------------------------------------------------------+\n"+
" *\n"+
" *\n"+
" *\n"+
" */\n"+
"  /* The Numberpad as a whole */\n"+
"  /* The Numberpad header bar. Contains the cancel button. */\n"+
"  /* The \"cancel\" button in the header, contains an \"x\" */\n"+
"  /* The \"erase to left\" button */\n"+
"  /* The clear button */\n"+
"  /* A pressable key, like a number or a control key */\n"+
"  /* A pressable key or empty space between keys */\n"+
"  /* Each key contains its button text as an attribute. Remove or\n"+
"   override this to change how keys look. */\n"+
"  /* You can override the key text for any key. */\n"+
"  /* These keys are not present by default, but can be enabled with\n"+
"javascript (see section on Javascript customization). */\n"+
"  /* Style for a pressed key */\n"+
"  /* One of the special control keys: delete left, clear, or \"+-\". These\n"+
"   control key elements also have the wsp-Numberpad-key class, but the\n"+
"   style rule below will override styles applied only to that class. */\n"+
"  /* Section End: wsp-Numberpad */\n"+
"  /* Section Start: misc */\n"+
"  /*\n"+
"  Various misc. styles\n"+
"*/\n"+
"  /* In sketch text for error messages e.g. when the document has an unsupported version. */\n"+
"  /* Section End: misc */\n"+
"  /* Tables */\n"+
"  /* Calculators */\n"+
"  /* override  bootstrap within a calculator */\n"+
"  /* Render styles */\n"+
"  /* Insert new styles ABOVE this line to keep version scoping */\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Button {\n"+
"  cursor: pointer;\n"+
"  padding: 0;\n"+
"  background-color: transparent;\n"+
"  border: none;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Button.wsp-appearance-drag {\n"+
"  opacity: .8;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Button-drag-handle {\n"+
"  width: 10px;\n"+
"  min-width: 10px;\n"+
"  padding: 0px;\n"+
"  margin: 0px;\n"+
"  border: 1px solid;\n"+
"  border-bottom: 3px solid;\n"+
"  border-color: rgba(0, 0, 0, 0.2);\n"+
"  border-bottom-left-radius: 5px;\n"+
"  border-top-left-radius: 5px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-appearance-unselectable .wsp-Button-drag-handle {\n"+
"  background-image: none;\n"+
"  width: 5px;\n"+
"  min-width: 5px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Button-label-frame {\n"+
"  border-top: 1px solid #c2b892;\n"+
"  border-bottom-right-radius: 5px;\n"+
"  border-top-right-radius: 5px;\n"+
"  background-color: #f5f5ed;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Button-label {\n"+
"  padding-left: 2px;\n"+
"  padding-right: 2px;\n"+
"  border-style: solid;\n"+
"  border-color: #c2b892;\n"+
"  border-left-width: 0px;\n"+
"  border-right-width: 1px;\n"+
"  border-top-width: 0px;\n"+
"  border-bottom-width: 3px;\n"+
"  border-bottom-right-radius: 5px;\n"+
"  border-top-right-radius: 5px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-appearance-pressed .wsp-Button-label-frame {\n"+
"  border-top-color: transparent;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-appearance-pressed .wsp-Button-label {\n"+
"  padding-top: 1px;\n"+
"  border-top-width: 1px;\n"+
"  border-bottom-width: 1px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-appearance-active .wsp-Button-label-frame {\n"+
"  border-top-color: transparent;\n"+
"  opacity: 1;\n"+
"  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAoCAIAAACw1AcgAAAKmWlDQ1BpY2MAAHjalZZ3UJPpFsbP933phZaAgJTQO1KkCyT0AArSwUZIAgRCjCFBBGzI4gqsBRURrOiiiIKrUmQtiAXbItiwb5BFRV1FXWyo3D+4xHvv3Dt39sy8M78588zzvue8/zwAtL08qVSMagDkSOSymNAAVlJyCov4AChAAxKogQ2PnyvlREdHwv+s97cBAQC44cCTSsXw90pTIMzlAyDRAJAmyOXnACDHAJAyvlQmB8DYAGC+WC6VA2ACAGDKkpJTALB8AGBmTHAFADDTJngXADBlcTGBANgxABKNx5NlAFA7AYCVx8+QA1CVAOAkEYgkADQNAPDjZ/IEALRoALDPyVkoAKAVAYB12r/4ZPybZ5rKk8fLUPHELAAAQAoS5UrFvCV/cx3/v3LEisk7jACAlpsdGwEAWgBIPp8XHDvJmUJu5CRL5QExkyySc+NUGkVY/CQrsuM5k5y9MEKll6TNilL55wamTHJBZlziJAuEQcGTLFsYo9Ln5sUGf9cHzprkLF549CTzZACTLBSHxnx/c7TqnRLxLNUs6bIQlUaY+31eeWZcmIplcSpNuiiEq5pXFvbdXxyt8pQpYlR7EEriVZ4CXpBqtxAIIpCAEHKABywIgyAAuTBfDgAQuFC6RCbKyJSzOFKpWGjP4kr4jvYsFydnF0hKTmFNfNe7O4AAAKJD+t4rPAnAKQRAI773EmwBGnoBmAu+98xfAzBbAE4U8xWyvIkeDgAADxRQBybogRGYgTU4gAu4gw+wIRjCIQriIBnmAx8yIQdksBiKYCWUQjmsh81QAzthD+yHQ3AE2uAEnIELcAV64RbcByUMwQsYgfcwhiAIEaEjDEQPMUYsEDvEBfFE/JBgJBKJQZKRVCQDkSAKpAhZhZQjlUgNshtpQH5BjiNnkEtIH3IXGUCGkbfIZxRDaSgTNUQt0WmoJ8pBI9A4dB6agS5CC9ASdC1ajdahB9FW9Ax6Bb2FKtEX6CgGGBXTwUwwB8wTC8SisBQsHZNhy7AyrAqrw5qwDqwbu4EpsZfYJxwBx8CxcA44H1wYLh7Hxy3CLcNV4Gpw+3GtuHO4G7gB3AjuG56ON8Db4b3xXHwSPgO/GF+Kr8LX41vw5/G38EP49wQCQYdgRfAghBGSCVmEQkIFYTuhmdBJ6CMMEkaJRKIe0Y7oS4wi8ohyYilxK/Eg8TTxOnGI+JFEJRmTXEghpBSShFRMqiIdIJ0iXSc9JY2RNcgWZG9yFFlAXkJeR95L7iBfIw+RxyiaFCuKLyWOkkVZSammNFHOUx5Q3lGpVFOqF3U2VURdQa2mHqZepA5QP9G0aLa0QNpcmoK2lraP1km7S3tHp9Mt6Wx6Cl1OX0tvoJ+lP6J/VGOoOapx1QRqy9Vq1VrVrqu9UierW6hz1OerF6hXqR9Vv6b+UoOsYakRqMHTWKZRq3Fco19jVJOh6awZpZmjWaF5QPOS5jMtopalVrCWQKtEa4/WWa1BBsYwYwQy+IxVjL2M84whJoFpxeQys5jlzEPMHuaItpb2dO0E7XztWu2T2kodTMdSh6sj1lmnc0Tnts7nKYZTOFOEU9ZMaZpyfcoH3am6bF2hbplus+4t3c96LL1gvWy9DXpteg/1cfq2+rP1F+vv0D+v/3Iqc6rPVP7UsqlHpt4zQA1sDWIMCg32GFw1GDU0Mgw1lBpuNTxr+NJIx4htlGW0yeiU0bAxw9jPWGS8yfi08XOWNovDErOqWedYIyYGJmEmCpPdJj0mY6ZWpvGmxabNpg/NKGaeZulmm8y6zEbMjc1nmheZN5rfsyBbeFpkWmyx6Lb4YGllmWi52rLN8pmVrhXXqsCq0eqBNd3a33qRdZ31TRuCjadNts12m15b1NbNNtO21vaaHWrnbiey227XZ4+397KX2NfZ9zvQHDgOeQ6NDgOOOo6RjsWObY6vpplPS5m2YVr3tG9Obk5ip71O9521nMOdi507nN+62LrwXWpdbrrSXUNcl7u2u76ZbjddOH3H9DtuDLeZbqvduty+unu4y9yb3Ic9zD1SPbZ59HsyPaM9KzwveuG9AryWe53w+uTt7i33PuL92sfBJ9vngM+zGVYzhDP2zhj0NfXl+e72Vfqx/FL9dvkp/U38ef51/o/ZZmwBu579lGPDyeIc5LwKcAqQBbQEfAj0Dlwa2BmEBYUGlQX1BGsFxwfXBD8KMQ3JCGkMGQl1Cy0M7QzDh0WEbQjr5xpy+dwG7ki4R/jS8HMRtIjYiJqIx5G2kbLIjpnozPCZG2c+mGUxSzKrLQqiuFEbox5GW0Uviv51NmF29Oza2U9inGOKYrpjGbELYg/Evo8LiFsXdz/eOl4R35WgnjA3oSHhQ2JQYmWiMmla0tKkK8n6yaLk9hRiSkJKfcronOA5m+cMzXWbWzr39jyrefnzLs3Xny+ef3KB+gLegqOp+NTE1AOpX3hRvDreaBo3bVvaCD+Qv4X/QsAWbBIMC32FlcKn6b7plenPMnwzNmYMZ/pnVmW+FAWKakRvssKydmZ9yI7K3pc9Lk4UN+eQclJzjku0JNmScwuNFuYv7JPaSUulykXeizYvGpFFyOpzkdx5ue1yplwqv6qwVvygGMjzy6vN+7g4YfHRfM18Sf7VJbZL1ix5WhBS8HMhrpBf2FVkUrSyaGApZ+nuZciytGVdy82WlywfWhG6Yv9Kysrslb8VOxVXFv+1KnFVR4lhyYqSwR9Cf2gsVSuVlfav9lm980fcj6Ife9a4rtm65luZoOxyuVN5VfmXCn7F5Z+cf6r+aXxt+tqede7rdqwnrJesv73Bf8P+Ss3KgsrBjTM3tm5ibSrb9NfmBZsvVU2v2rmFskWxRVkdWd2+1Xzr+q1fajJrbtUG1DZvM9i2ZtuH7YLt13ewdzTtNNxZvvPzLtGuO7tDd7fWWdZV7SHsydvzZG/C3u6fPX9uqNevL6//uk+yT7k/Zv+5Bo+GhgMGB9Y1oo2KxuGDcw/2Hgo61N7k0LS7Wae5/DAcVhx+/kvqL7ePRBzpOup5tOmYxbFtLYyWslakdUnrSFtmm7I9ub3vePjxrg6fjpZfHX/dd8LkRO1J7ZPrTlFOlZwaP11werRT2vnyTMaZwa4FXffPJp29eW72uZ7zEecvXgi5cLab0336ou/FE5e8Lx2/7Hm57Yr7ldarbldbfnP7raXHvaf1mse19l6v3o6+GX2nrvtfP3Mj6MaFm9ybV27NutV3O/72nf65/co7gjvP7orvvrmXd2/s/ooH+AdlDzUeVj0yeFT3u83vzUp35cmBoIGrj2Mf3x/kD774I/ePL0MlT+hPqp4aP2145vLsxHDIcO/zOc+HXkhfjL0s/VPzz22vrF8de81+fXUkaWTojezN+NuKd3rv9v01/a+u0ejRR+9z3o99KPuo93H/J89P3Z8TPz8dW/yF+KX6q83Xjm8R3x6M54yPS3kyHgAAYACApqcDvN0HQE8GYPQCUNQm8i4AACATGR1gIoP8d57IxAAA4A6wpxMgsRMgvBNgBxvAgg3AAIBoNkAcG1BXV9X5Z+Wmu7pMeFHbAPBV4+PvEgGINgBf+8fHx9rGx7/WA2D3ADrfT+RsAACCBkClGbrCpep06/oV/5l3/wHNmfXlY/st0gAAAAlwSFlzAAAASAAAAEgARslrPgAAAAl2cEFnAAAAAQAAACgAg9PABgAAADBJREFUCNdjWPjgPxMjAwMTEyMDEzOUZmJkYGJGphmIE4OJMzMhyRNhJgwzMmCYBQDI9ANK1RWWcgAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAxMi0xMi0xOFQxNjoxNDowOS0wODowMMK1MMQAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMTItMTItMThUMTY6MTQ6MDktMDg6MDCz6Ih4AAAAAElFTkSuQmCC');\n"+
"  background-repeat: no;\n"+
"  background-size: 100% 100%;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-appearance-active .wsp-Button-label {\n"+
"  padding-top: 1px;\n"+
"  border-top-width: 1px;\n"+
"  border-bottom-width: 1px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-mfs-reference-tracking {\n"+
"  outline: 1px solid rgba(255, 0, 0, 0.1);\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-mfs-reference {\n"+
"  background-color: rgba(255, 0, 0, 0.01);\n"+
"  border: 1px solid rgba(255, 0, 0, 0.1);\n"+
"  border-radius: 5px;\n"+
"  -moz-border-radius: 5px;\n"+
"  -webkit-border-radius: 5px;\n"+
"  /* Cancel the bottom border-radii for numerators */\n"+
"  /* No top border or radius for denominators */\n"+
"  margin: -1px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-mfs-reference.mfs-numr {\n"+
"  border-bottom-right-radius: 0px;\n"+
"  border-bottom-left-radius: 0px;\n"+
"  -moz-border-bottom-right-radius: 0px;\n"+
"  -moz-border-bottom-left-radius: 0px;\n"+
"  -webkit-border-bottom-right-radius: 0px;\n"+
"  -webkit-border-bottom-left-radius: 0px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-mfs-reference.mfs-denm {\n"+
"  border-top-style: none;\n"+
"  border-top-right-radius: 0px;\n"+
"  border-top-left-radius: 0px;\n"+
"  -moz-border-top-right-radius: 0px;\n"+
"  -moz-border-top-left-radius: 0px;\n"+
"  -webkit-border-top-right-radius: 0px;\n"+
"  -webkit-border-top-left-radius: 0px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-mfs-reference:hover {\n"+
"  background-color: rgba(255, 0, 0, 0.1);\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-mfs-reference.wsp-mfs-reference-hot {\n"+
"  background-color: rgba(255, 0, 0, 0.5);\n"+
"  border-color: #ff0000;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-sketch-container {\n"+
"  /* It's ok to float this left; it will still be right of the wsp-tool-container. */\n"+
"  /* With \"float: right;\", at least in FireFox, there's an unavoidable gap between tools and sketch */\n"+
"  float: left;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tool-container {\n"+
"  float: left;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tool-container .wsp-tool-column .wsp-undo-redo {\n"+
"  background-color: #FFFFFF;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tool-container .wsp-tool-column .wsp-tool-overflow-y.wsp-user-tools {\n"+
"  overflow-y: auto;\n"+
"  overflow-x: hidden;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tool-container .wsp-tool-column .wsp-tool-logo {\n"+
"  display: none;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tool-container .wsp-tool-column .wsp-undo-button:hover,\n"+
".wsp-version-4-8-0 .wsp-tool-container .wsp-tool-column .wsp-redo-button:hover {\n"+
"  background-color: #FFFFFF;\n"+
"  cursor: pointer;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tool-container .wsp-tool-column .wsp-undo-button:focus,\n"+
".wsp-version-4-8-0 .wsp-tool-container .wsp-tool-column .wsp-redo-button:focus {\n"+
"  outline: 0;\n"+
"  /* gets rid of blue box around focusables in chrome */\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tool-container .wsp-tool-column .wsp-undo-disabled .wsp-undo-button,\n"+
".wsp-version-4-8-0 .wsp-tool-container .wsp-tool-column .wsp-redo-disabled .wsp-redo-button {\n"+
"  opacity: .3;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tool-container .wsp-tool-column .wsp-undo-disabled .wsp-undo-button:hover,\n"+
".wsp-version-4-8-0 .wsp-tool-container .wsp-tool-column .wsp-redo-disabled .wsp-redo-button:hover {\n"+
"  cursor: default;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tool-container .wsp-tool-column .wsp-tool {\n"+
"  background-color: white;\n"+
"  word-wrap: break-word;\n"+
"  white-space: normal;\n"+
"  height: fit-content;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tool-container .wsp-tool-column .wsp-tool.wsp-draggable-toolButton {\n"+
"  box-sizing: content-box;\n"+
"  /* This simplifies dynamic sizing of the draggable */\n"+
"  border: 2px solid #0087FF;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tool-container .wsp-tool-column .wsp-tool.wsp-tool-active {\n"+
"  background-color: #ffffc8;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook,\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook {\n"+
"  /* The following styles are common to these two looks */\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-undo-redo-bottom,\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook .wsp-undo-redo-bottom {\n"+
"  display: none;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-tool-image,\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook .wsp-tool-image {\n"+
"  margin: auto;\n"+
"  max-width: 100%;\n"+
"  /* Use the full width of the container */\n"+
"  height: 100%;\n"+
"  object-fit: contain;\n"+
"  /*  Maintain the image's aspect ratio */\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-tool,\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook .wsp-tool {\n"+
"  width: 100%;\n"+
"  text-align: center;\n"+
"  font-weight: 200;\n"+
"  border: 2px solid black;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-undo-redo button,\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook .wsp-undo-redo button {\n"+
"  width: 50%;\n"+
"  height: 44px;\n"+
"  background-repeat: no-repeat;\n"+
"  background-size: contain;\n"+
"  background-position: center;\n"+
"  background-origin: content-box;\n"+
"  padding-top: 2px;\n"+
"  padding-bottom: 2px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-undo-redo button .wsp-inner-icon,\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook .wsp-undo-redo button .wsp-inner-icon,\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-undo-redo button .wsp-inner-text,\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook .wsp-undo-redo button .wsp-inner-text {\n"+
"  display: none;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-undo-redo.wsp-undo-disabled .wsp-undo-button,\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook .wsp-undo-redo.wsp-undo-disabled .wsp-undo-button,\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-undo-redo.wsp-redo-disabled .wsp-redo-button,\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook .wsp-undo-redo.wsp-redo-disabled .wsp-redo-button {\n"+
"  background-color: #F5F5F5;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook {\n"+
"  background-color: #F5F5F5;\n"+
"  padding-right: 10px;\n"+
"  margin-right: 5px;\n"+
"  min-width: 100px;\n"+
"  /* Box shadow for classicLook. Some oddities here: when we set overflow\n"+
"    to auto/scroll on an element, that seems to kill the box shadow. So\n"+
"    when there's overflow, we put the box shadow on the enclosing element\n"+
"    which in this case will be the same size as the visible portion of\n"+
"    .wsp-tools-inner */\n"+
"  /* Leave 1px space to align right edge with right edge of user tools */\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-tool-column {\n"+
"  border-radius: 5px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-tool-column.wsp-no-tool-icons {\n"+
"  width: 125px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-fixed-tool,\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-tools-inner,\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-tool-overflow-y.wsp-user-tools {\n"+
"  box-shadow: 2px 2px black;\n"+
"  /* Reduced the shadow and removed the blur to avoid intruding into elements below the sketch_canvas */\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-fixed-tool {\n"+
"  margin-right: 1px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-tools-inner {\n"+
"  background-color: #393838;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-tool {\n"+
"  font-size: 24px;\n"+
"  border-radius: 5px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook {\n"+
"  /*  The compact look is designed for tools that use icons and no text */\n"+
"  /*  If a tool is displayed as text, its name needs to be short enough to fit using 20-pt type. */\n"+
"  background-color: #DDD;\n"+
"  padding-right: 0px;\n"+
"  border-right: 2px solid black;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook,\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook *,\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook *:before,\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook *:after {\n"+
"  box-sizing: border-box;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook .wsp-tool-column {\n"+
"  width: 105px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook .wsp-tool-column .wsp-undo-redo {\n"+
"  background-color: inherit;\n"+
"  /* use the same background color for the entire column */\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook .wsp-tool-column .wsp-undo-redo button {\n"+
"  border: 2px solid black;\n"+
"  border-radius: 9px;\n"+
"  vertical-align: top;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook .wsp-tool {\n"+
"  font-size: 20px;\n"+
"  /* If you must have a tool with no icon, its name needs to be short enough for 20-pt type */\n"+
"  padding: 5px 0;\n"+
"  border-radius: 9px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook {\n"+
"  padding-right: 0px;\n"+
"  margin-right: 0px;\n"+
"  border-left: 2px solid #cdcdcd;\n"+
"  border-bottom: 2px solid #cdcdcd;\n"+
"  border-right: 2px solid #cdcdcd;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook,\n"+
".wsp-version-4-8-0 .wsp-tools-newLook *,\n"+
".wsp-version-4-8-0 .wsp-tools-newLook *:before,\n"+
".wsp-version-4-8-0 .wsp-tools-newLook *:after {\n"+
"  box-sizing: border-box;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-user-tools {\n"+
"  background-color: white;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-tools-inner > :last-child {\n"+
"  border-bottom: 2px solid #cdcdcd;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-tools-inner .wsp-tool {\n"+
"  display: table;\n"+
"  width: 220px;\n"+
"  border-top: 2px solid #cdcdcd;\n"+
"  padding-right: 20px;\n"+
"  min-height: 58px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-tools-inner .wsp-tool .wsp-tool-media {\n"+
"  width: 40px;\n"+
"  height: 40px;\n"+
"  display: table-cell;\n"+
"  vertical-align: middle;\n"+
"  padding: 5px 0px 0px 7px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-tools-inner .wsp-tool .wsp-tool-text {\n"+
"  display: table-cell;\n"+
"  max-width: 109px;\n"+
"  word-wrap: break-word;\n"+
"  padding: 7px 10px 7px 10px;\n"+
"  vertical-align: middle;\n"+
"  font-family: 'Proxima Nova', arial, sans-serif;\n"+
"  color: #2d2d2d;\n"+
"  font-size: 18px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-undo-redo-top {\n"+
"  display: none;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-undo-redo .wsp-undo-button {\n"+
"  margin-right: 2px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-undo-redo .wsp-undo-button,\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-undo-redo .wsp-redo-button {\n"+
"  width: 109px;\n"+
"  background-color: white;\n"+
"  position: relative;\n"+
"  border: none;\n"+
"  height: 58px;\n"+
"  padding: 0px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-undo-redo .wsp-undo-button:hover,\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-undo-redo .wsp-redo-button:hover {\n"+
"  background-color: #f0f0f0;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-undo-redo .wsp-undo-button .wsp-inner-icon,\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-undo-redo .wsp-redo-button .wsp-inner-icon,\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-undo-redo .wsp-undo-button .wsp-inner-text,\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-undo-redo .wsp-redo-button .wsp-inner-text {\n"+
"  position: absolute;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-undo-redo .wsp-undo-button .wsp-inner-icon,\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-undo-redo .wsp-redo-button .wsp-inner-icon {\n"+
"  width: 20px;\n"+
"  height: 20px;\n"+
"  left: 40px;\n"+
"  background-repeat: no-repeat;\n"+
"  background-size: contain;\n"+
"  position: absolute;\n"+
"  top: 12px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-undo-redo .wsp-undo-button .wsp-inner-text,\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-undo-redo .wsp-redo-button .wsp-inner-text {\n"+
"  top: 33px;\n"+
"  font-size: 14px;\n"+
"  left: 33px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-undo-redo.wsp-undo-disabled .wsp-undo-button,\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-undo-redo.wsp-redo-disabled .wsp-redo-button {\n"+
"  background-color: white;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-undo-button,\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook .wsp-undo-button {\n"+
"  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFgAAABYCAQAAADbnPi/AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQffBBYQOhiFrU+GAAAEnklEQVRo3u2Z3WsdRRiHn53dU2zqR61gtBQsKi1t1Ua8EUEQ03/AOylU8aONEiGxYi9V8E4Q0ys1qUIEb0Sai1xFChEvFKRKY0UvilA/oB8cJBITmuzMvl7s7DknJ7vJfirC/JYDh2V35jm/eeedd+aAk5OTk5OTk5OTk5OTU0fqvwYoJg9QRDW36K27I/ZTkx7D7+ugHKZPQJA5XoqAoI6ePL5hjrcI0CVbUCiinjFqcRu3MMA2PIQ1VljiL8LM5wsqYIU3WWSiBLJCYWznOxniMAc5wB52soOW9VIIWWaRP/iZn1jgAotEdkRKYs8jCCeBoMBbPr6FfoBTnKONbLiilHttznGKQzZ0klYK6UuE1ULIvo3F3bzGeYxFMYSEaOt51IGOiDBoQsKeZ89zkt3W6YLQ8wgajfBqDmRlmx9imiWLFKJT3ZRU1zWhfXqJaYasBQWS6zyCIcqFHDd8mBlMBzUfaP+VYBtmeKjHiNzAsiVy3OQgU4Q2APK6mu12HCSaKQbz+5wAJ8jjqchx1D5PuxNAdV0ag9DmOeKILgCcjRwAg8zW5GyW07MMkmPi9wInyGM9L3oEwDBXkJ55XgUv7QcbQoQrDAPB5uvheuB+5HiQxojs/XKI2qa8brKLk2CI6cHXRESMdwIwJ3AvcgsfmCjtrUl5z2xwuJvoYp/fA1QWclrEeCgME8BpfD7hGOFWw7RBgkGhUMAiC1zkF37lKsus4XETO9nDXvYzxD5aAGgUCo+Qce7gGRQZNd5Gh7sujzKJsFZiEsWOXeJdhtm1yQ9T3McxzrJovda2v0+zXU4HjuMsXlbLpKlVPueI9a5bXPrWdWWLUb9TPd/JKBetUYY1hClIT3JZwDFyMdx4XEKm2Q94eDlqYEVgwQKeYgHBoFlDeDs9ZLOBi08xjfAVD5MUNfnj3rPFv88IbYSQEOHZNOS6gDXCMqNAwWKmBzqu3O7irM1LKzzChl1nPcAhwo8cgs4Al5Nn89ErtrC6wAB9e8Q6gEOEWW5my1UqlxQB8ARtDMJp+iZfdeAQ4WNyli451QIO8htCxJPrkasCh50UVO8JRwDcz2WEb22RUAtwiPAZmyylFZEf5BrCaK/HVYA1wtdsp6nzowA4gvA7t3c9Lg8cIVznXqgxdvvVAsYQXqeTkcsDG4SnKXY8UFw+MEebHYnHZYE1cYnSnLuxFHAPmpGkr3LAEUKbvfwbp58B8AY/xA6X7S4C5rhMq9aTz3QZ4B0CHkfwywL7CEd5mbDhCAYQfG4wxVHAq5olXqLpSUeMyS5m2F41Ag3vM4JuHFnw+ZPveLQacLz3+4ARdGdv0RwyfMG+qg4nyCcaj+UIWEBVT0ox8oecaNxlxSpXubu6LwkyTFb44yGfLnFrHWk/QT7eqMsCXKNVzzoVI09yvMFYFmCpvoW1i9xkkltlqb5KIEF+scHAEP5W9ks9yB6GKV5oMDBuJA0XQ87aDikEwxngo5r/EE6kA3u6VdeOzMNHOIPPZCPI2zwOMEBUCFgwmyJH+Ci+rx0Wmt8uFFDOUfZQeDVNuvVqvrB3cnJycnJycnJycnJy+p/pHzDs9DpRnhI/AAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDE1LTA0LTIyVDE2OjU4OjI0LTA0OjAwOz+VcAAAACV0RVh0ZGF0ZTptb2RpZnkAMjAxNS0wNC0yMlQxNjo1ODoyNC0wNDowMEpiLcwAAAAASUVORK5CYII=);\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-redo-button,\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook .wsp-redo-button {\n"+
"  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFgAAABYCAQAAADbnPi/AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQffBBYQOCnmRS0+AAAElElEQVRo3u3YT6gd5R3G8c+8M0fQaBuzMFYESy0t/k20i3ZTECN03Z0IUqw1USLcaKnLIrgrFHVl6y2FFLopYhZZKVKlCxfFQtKWFnUTWsEqF0m5NSR3/rxdzNyTc5Nz7p1zZkYQ5hkOHM6Z8853nnne3/s7L6NGjRo1atSoUaNGjRo16kuqkPQ4WNK8Lis2r95wVd2BE0GCSrXgIgFR1Rk9EXy3C3AQdmBOfNUNrnONRLTlgk3/lS88fzllCs/7wWrAQVA2ju132CF3usOt9ttn0sQiyn3uvI/80z+cdcb5xqd0BexM4YQX/XF52FTaQN/lOW/ZEK86qjmfbXjLc+4WdozSFpdnRdHby8MmuMWz3lM2KKVcrlCqVFPY+n2pkMtnzn3PT93SON0Oehv3kuid9rChGf6wkzYbpFwx18041/VC3py96aTDjQWhBe4zokKxjMP1wPc6pZyitgO98tjGLp1yaMaIvXArZVvgesiD1hVNANq6utjtOiS5dQd38XkWN7YFrlP7mA1RubKv870uRBt+rE70PNwTU9yWwBkOOt2Ts4ucPu1gc63FuC2AExmO+Ficmec7L9j9Fkq56GNHkE2X9gxrO3D3BK4f0gmVaiYIVVPEcuVMASuawrYqfqFSWZsGcB7uHsCJgBdnvJ1XGaqrfC8XPIt2Pr+E1GQubgOcLcBNVH7nUblMolLJZMh94Iz3nfOR8y6KrrHPzW5zu3scsl9QN0KpZZb9IJFbc8BjcmteUjZNVQvV7v5etDWdy9F5r3vU7bsW+gOO+KUPp09k2YhsiV51fI67u0YixbpoS9n88G+Ou8l2x5vKZFKhOdLmk+1bmXjIay5ZpQyWzYJezf1uLnCGF0RbCqXorB82BSedgVo8UTOJBN92Ur7Aq92RywW/mAuc4UeiXC7acEyKMFNw2kRqu0m6z5/E5sa7H3OAA77jQjNnX3ezyx3astruEY77XOxlhbwKOMF1zqgblKfVS0eX/ySpDHf5uyjvHzjFy6LShgfYM7Ht4pHheqd7QL4COMWDKtG/3IlJZ9jLIyf4bWfkHcD1gvhn0TnfdGUj0lVhWiq7IO8ATnFc9Il7esetDQn4QyfkGeAEN/q36KFBcGuXuda7HSrGDHCGn4nW9JndK5XiGz4VV+zqpsAJ9tnwRjPocMrwcHPpDsApjinc1jy4IZWq26pVYrHD4b/6uaHSO6uAr9tYKRal6O0gFX1f5hcoBweuTJzzBqvusdVN8iPWXZTqc2t0vjK5pzwidpkt1zrlAJ26hra4PNmtSgR8z1989gX4mykc80q34AV8y5v63Smfp4nCMb9a5r/aIuDgrJUnQUtlcke74xJ8zX9cGrj+ThSO+nV3XIKv+HBQ2G13e8ElmPjEkAmeKDzRF26d4c0BgTO5J7zaFy7BpksDwdaFrFdcgv8N5u5E4Sf94hJcHAg3k3vcurLZWOmuWA9bDIIbFB73mz3cXenZ3jAILkdX7hl26yXeSaQDNZX3q5TCri4ut6cUBRfandpXCnvQcCBDLPbJF9Cxjxo1atSoUaNGjRo1atSowfR/LRgeDFizcN0AAAAldEVYdGRhdGU6Y3JlYXRlADIwMTUtMDQtMjJUMTY6NTY6NDEtMDQ6MDCxoYPjAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDE1LTA0LTIyVDE2OjU2OjQxLTA0OjAwwPw7XwAAAABJRU5ErkJggg==);\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-undo-button .wsp-inner-icon {\n"+
"  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAWCAQAAACBf8+OAAAAtUlEQVR4AbXTVwHEIBBF0SthJEQCEpCABKTEARIiYSUgAQmRMBLSt6XXM588OtCxCD3BE4hdBTzCjEhCEHKUiorUxauuimmXPlJSEXF8ua6TYvnhqOjLM2XR/5bAO54QpoQSxUAvUf10mGNQ4rvvOxhwCPNyKlzfs8CTsU5QXhxQUHGAp8Kwm6XCPhZ/L+aJrR46yPc17fN+BP/9DfOy3yf2pihuzwPumZ3f423/5/vt4ta+dg3LzGOPpQRi5AAAAABJRU5ErkJggg==);\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-redo-button .wsp-inner-icon {\n"+
"  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABcAAAAWCAQAAACBf8+OAAAAu0lEQVR4AbXTBxmFIBQF4BPhRjDCjUAEIhDFBkQwwotABCIYgQi+87n39ncxDrgxI3DwCPXiWZa+3SyjBap6CVxiXUrIIVwiWyYMUh206LEc2Fa2Q0dcPZPBEnvapZ9IGS0hWBLEPu7RCowrVvRhLizXLIs51gl7fT9IQD8kFvZlcCigoIqF05Rxh9MM4+az+MWLuXir5x5kr39N5/UfwQn9J5Zt9uagcx+wReJC538PBZ3/+Xr7v7adR/85A2OP4hj58QAAAABJRU5ErkJggg==);\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Numberpad-cancel {\n"+
"  cursor: pointer ;\n"+
"  display: block ;\n"+
"  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAB4ElEQVQ4y61UvWsUQRx9s1mEIyF6FpYKFxvB2ORSBgu54giYIoWg/0Caa201nVUqMWksgohY2KlXuFttkBR3CSQHFprAFRZinHXvbm/d25t5FnGP2w8ICz4YmHnDvPl9zBsBSyKNzr3LtVsw1oMx6rMzuAoAvoIsmWh+gX532/Y+ZQ7BkpNRpaoEig4vQKDoVKkq02cnkza5wiLQWrbJlYRQlapCrSWLQmsZR2YAgKONXQhRRlEIUXa0sXteWKpa5iZ3KNsejxJcNCLP9KsgJ7AOVQ2K3EmwfT+K8377m12SpBqRn+UTWBLrX/k6LaTIHSMYo54I95JpEmgAwIMW7kDzJVqDZ2KITQC4P4/FdIbBGHVBzT4E5hI7oxGw7zdEhOfT9PZiubtxDdcztSIG+UIA4A8h9kMRLxdulN9/u4nV3KITfcNXyD5tHQFH4dNp6qSLR28kvDwdX8E1SiaaCXYcAc5gM64J785vcRaPAdd7eOhe+djDcVqoZKKZbX9vEMRd2z7717UwJC3ZgCWBDl/kth+WRMZfP/3vH36l3lEYkj/0Vi/Hd1mLFLVJ2iIt2zs9EGKtkE1I90CItZbtnQI4FwKAJdt1lqEXIo29izT+aOwtC1aXbNeZ2O5/fWx/AXUQdBRBFjTDAAAAAElFTkSuQmCC);\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-tool-cancel > .wsp-inner-icon,\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-tool-cancel,\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook .wsp-tool-cancel,\n"+
".wsp-version-4-8-0 .wsp-sketch-container .wsp-tool-cancel {\n"+
"  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wwcFx4ZWcAjlgAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAADyUlEQVRo3t1aT0gUURj/xi7TFkoLKxiMePLPShAiUogFgoKIeOjQRSoPnrzEijcPHRW6JEQX9eDFi4c8dJEIF4KNkBTEDrUHdTUwMWHezu46O29+Hd7kmm26M/Mmt/1gYRnevPn93nzv+37f90YhCQZAI6L7RNRBRFEiaiCiWiIKOUMyRPSdiLaI6DMRfSSiuKIoKbosAxAGEAOQgHdLOHOE/yVwDcA0AAvyzHLm1IIGPyEZeDEiE0EAb/PpKl5cq00W+KGAV/28tzHkF3wMl2+x/xm8NxKO25SbFXUnpdiGdRLNFSov40TUoSjKp9MXq4oMfFmG4MnB9PLsxaqzcZ6I7lD52p2/5gknw14YLq2vX2H09oLv7UlxbL63B6OnB1Yy6Sa8asUITJdyt9HdDaaqSLe2+ibBd3eRbm0FU1UYvb1ubp0uJsxKSlZWMgnW0FAgsbvrHXw0Kua5fRv82ze3SS7sOeZbm5tgN2+Kh0ejrknwVKoAvqMD/ODAX27wonOstTWw2loBoqUFPJUqHXxLi3Cbe/fAj44866XTm9eT5RMJsHC4QGJn53zwOztINzef+DxnzG8M0Hxn3fy7d9BragSJ5ua/kuDb2wXwg4Ows1k52bnU6HOemW/eQL9+vUBie/tP8E1NYKqKzMOHsE1TlryYJgBvZcxkLi5CD4UEiaamExJ8a6sAfngYtiVVmb8lAElZs5nz89BVVZBobEQ+Hke6sRFMVZEdHYVt27IFXpIA6DJnPH71Cswh8euXHR8PSqHqFES1lXv+/AR87tmzQKu2qkAkVy5X+G+agbdJ5LrQixdi9TUN+eVlME1D9unTIPz/xIWkbeLjmRkBPhKBtb4u3vH6OlgkguzICGzOA9nEcsLowgL0q1eh19QgH4//nuxWVqBXVyMzNAQ7n5ceRv0nsqUl6NeuQQ+FYC4tFR/z+jX0UAiZBw9g53JSE5k/KbG8DL26GkxVcTw3d76Lzc4KKdHfD9swpEkJ72Lu/XvoN26IcDk1VVqInZwUJLq7wXXf8UPzLqdXV8EiEZGoxsZc3ZuNxQSJzk7wHz/8yWlPBc3GBlhdndA3jx+7DpG2bSPz6JGQHO3t4Pv7vgua0kvKL1/A6uvFCg4MeFaWtmnCGBgQJG7dclvVWX+cKbgt6o2uLt8bkafTMLq6xHw9Pd6LeldtlWQSRl8f+OGhnLbK4SGMvj7/bZVTBxjlbhMX9UYTZdyd+6Aoyt3Kbu46A56U4eo/OQu+cg84KuKIqSIO+SrimLUiDror5lODcvzYQ/nfP7f5Cce8asR3hlrBAAAAAElFTkSuQmCC);\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tools-newLook .wsp-tool-ok > .wsp-inner-icon,\n"+
".wsp-version-4-8-0 .wsp-tools-classicLook .wsp-tool-ok,\n"+
".wsp-version-4-8-0 .wsp-tools-compactLook .wsp-tool-ok,\n"+
".wsp-version-4-8-0 .wsp-sketch-container .wsp-tool-ok {\n"+
"  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wwcFwczGXtDWAAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAADqklEQVRo3t2aXYgbVRTHfzuzIKNZkIFkRmTFUKSgMShIwz4HpeC8VCHgILoQYfXNKQgDAYtQykJx8QNcCj4UBH0QhUVRH7b65toHcbEpYgsbZF9mMrgg2ZKH7vT2JZHpNbXJzNxssxcuzD1zz+F/zj3n3Dv3zBw5NN/3a1EULYdhuBQEwWK3213Y29ub7/f7cwCGYQjTNA9KpVLPtu1dy7K2isXixdXV1cscVmu1Wsdc192oVqs9QKTp1Wq157ruRqvVOjY14L7v1xzH2dZ1XaQFLndd14XjONu+79eUgm80Gpt5Ah+lSKPR2MwduOd5bhZXSeNanue5uYBvNpvrKq3+f6vRbDbXM4F3XXdj2sDlPsAwm+BTKzFYOnE/9bHdyfM89zB8fpyYGCuwp5lt0mSne+b5qQE6gWAdwc8I/kDww3h8d90nfN+vTc11XkBwHcFOovvju1Jyx9aGD+12+0Icx+rPIiZwDtATtOvA2njscRzTbrcv/OdgNjXrfyxZ/hqCpycP6OEBUAPodDprU7H+88CLEm0duDKZmDiO6XQ6a9PNPAUEW5L1v0GgZ8xIg4BQ7zr+CNc5nk2m7/s1LYqiZeWu8yjwukT7DPgzm9goipa1MAyXlCvwDvBAYvw38EF2sWEYLmlBECwqBV8FHIl2HuhlFx0EwaLW7XYXlCrgJXcb4Hfgy3xEd7vdBQqFwi1lgfukFLg7CJ7JT36hULilDa8+lLQ3pfEmsJ2f+H6/Pzc/MdfDwGvAc8CNgT/vjJj3GHBSon2Yv43mDcMQ+/v746/C18DjUpC+BITSvDeApHkuAVfzBW8YhtBM0zyYiOsnafwI8ClgJGgPAqekeR8pOBea5oFWKpUmS2hnge8l2lPA+4nxKeAhSekr+StQKpV6mm3buxNxCeBt4BeJfhJ4ZfD8qvTuEzU5wrbtXc2yrK2JOW8CbwF/yRemQAM4nqBdA35Vo4BlWVtasVi8mIr7n0Gg3pB8f1Wa97m6PfJf7JmO0y+P2KyG/SqCBbUf+BpApVL5MbUZvgK+u8u7b/M584xqQ8waQLlcPq3renpp7wJ7I+hfqAGv6zrlcvn0HUTHcbYzLWsdweXBbcNvCN5T93E0wHrnrUSlUlnJtAqXgBrwBPAscEad9SuVysrhX2yl7PcsgMza1aImE+r1ejZXQp3r1Ov1laN/vX4kChxHosSUdKeZLfIlqzYzW2aV94mZLHTLhZCZ/dVArincDz97zOW1Kof1u81tdvvvyyQ7/+AAAAAASUVORK5CYII=);\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-ok-cancel-mode > .wsp-undo-button,\n"+
".wsp-version-4-8-0 .wsp-ok-cancel-mode > .wsp-redo-button {\n"+
"  display: none;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-sketch-container .wsp-tool-cancel {\n"+
"  cursor: pointer;\n"+
"  display: block;\n"+
"  top: 0px;\n"+
"  right: 0px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-sketch-container .wsp-tool-cancel .wsp-inner-text {\n"+
"  display: none;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-sketch-container .wsp-tool-ok {\n"+
"  cursor: pointer;\n"+
"  display: block;\n"+
"  top: 0px;\n"+
"  right: 38px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-sketch-container .wsp-tool-ok .wsp-inner-text {\n"+
"  display: none;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-sketch-container .wsp-ok-cancel-button {\n"+
"  position: absolute;\n"+
"  margin-right: 10px;\n"+
"  margin-top: 10px;\n"+
"  height: 28px;\n"+
"  width: 28px;\n"+
"  background-size: 28px, 28px;\n"+
"  background-color: #888888;\n"+
"  border-radius: 14px;\n"+
"  border-color: #888888;\n"+
"  border-style: solid;\n"+
"  border-width: thin;\n"+
"  box-shadow: 3px 3px 7px #888888;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-sketch-container .wsp-accessible:focus {\n"+
"  outline: none;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-sketch-container .wsp-Measure:focus,\n"+
".wsp-version-4-8-0 .wsp-sketch-container .wsp-Text:focus,\n"+
".wsp-version-4-8-0 .wsp-sketch-container .wsp-Button:focus,\n"+
".wsp-version-4-8-0 .wsp-sketch-container .wsp-Expression:focus,\n"+
".wsp-version-4-8-0 .wsp-sketch-container .wsp-Table:focus,\n"+
".wsp-version-4-8-0 .wsp-sketch-container .wsp-Table > div:focus,\n"+
".wsp-version-4-8-0 .wsp-sketch-container table:focus,\n"+
".wsp-version-4-8-0 .wsp-sketch-container .mfs-input:focus,\n"+
".wsp-version-4-8-0 .wsp-sketch-container .mfs-param:focus,\n"+
".wsp-version-4-8-0 .wsp-sketch-container .wsp-parameter-sr-only:focus {\n"+
"  outline: none;\n"+
"  outline-offset: 2px;\n"+
"  z-index: 100000 !important;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-tool-background {\n"+
"  background-color: rgba(0, 0, 0, 0.1);\n"+
"}\n"+
".wsp-version-4-8-0 .input-element {\n"+
"  position: relative;\n"+
"  display: inline-block;\n"+
"  width: auto;\n"+
"}\n"+
".wsp-version-4-8-0 .input-element input {\n"+
"  width: 100%;\n"+
"  position: absolute;\n"+
"  color: transparent;\n"+
"  background-color: transparent;\n"+
"  margin: 2px 0px;\n"+
"}\n"+
".wsp-version-4-8-0 .mfs-input,\n"+
".wsp-version-4-8-0 .mfs-html-input {\n"+
"  background-color: white;\n"+
"  border: thin solid;\n"+
"  padding: 2px;\n"+
"  margin: 2px;\n"+
"  vertical-align: middle;\n"+
"  min-width: .6em;\n"+
"  min-height: 1.2em;\n"+
"  text-align: start;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Numberpad {\n"+
"  width: 172px;\n"+
"  height: 298px;\n"+
"  background-color: #00bdec;\n"+
"  border-radius: 9px;\n"+
"  border: thin gray solid;\n"+
"  padding: 0px 8px 8px 8px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Numberpad button:focus {\n"+
"  outline: none;\n"+
"  outline-offset: 2px;\n"+
"  z-index: 100000 !important;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Numberpad-header {\n"+
"  background-image: url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMDAlJyBoZWlnaHQ9JzI1Jz48cmVjdCBmaWxsPSd3aGl0ZScgeD0nNicgeT0nNicgd2lkdGg9JzkwJScgaGVpZ2h0PScyJy8+PHJlY3QgZmlsbD0nd2hpdGUnIHg9JzYnIHk9JzEyJyB3aWR0aD0nOTAlJyBoZWlnaHQ9JzInLz48cmVjdCBmaWxsPSd3aGl0ZScgeD0nNicgeT0nMTknIHdpZHRoPSc5MCUnIGhlaWdodD0nMicvPjwvc3ZnPgo=\");\n"+
"  background-repeat: no-repeat;\n"+
"  background-color: #00bdec;\n"+
"  height: 25px;\n"+
"  margin-bottom: 8px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Numberpad-cancel {\n"+
"  margin-left: auto ;\n"+
"  text-align: center ;\n"+
"  vertical-align: middle ;\n"+
"  font-weight: bold ;\n"+
"  font-size: larger ;\n"+
"  background-repeat: no-repeat;\n"+
"  background-position: center;\n"+
"  background-color: #00bdec;\n"+
"  border-color: #00bdec;\n"+
"  height: 28px;\n"+
"  width: 28px;\n"+
"  border-style: solid;\n"+
"  border-width: thick;\n"+
"  border-radius: 16px;\n"+
"  padding: 0px;\n"+
"  outline-offset: 0px !important;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Numberpad-erase-to-left {\n"+
"  /* the following is an svg image of the 'erase to left' unicode character,\n"+
"       \\u232b, base64 encoded. To see original, cut out the quoted part after\n"+
"       base64, then un-base64 encode.  */\n"+
"  background-image: url(\"data:image/svg+xml;base64,PHN2ZyB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgCnhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgZmlsbC1vcGFjaXR5PSIxIiBjb2xvci1yZW5kZXJpbmc9ImF1dG8iCmNvbG9yLWludGVycG9sYXRpb249ImF1dG8iIHN0cm9rZT0iYmxhY2siIHRleHQtcmVuZGVyaW5nPSJhdXRvIgpzdHJva2UtbGluZWNhcD0ic3F1YXJlIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiIHN0cm9rZS1vcGFjaXR5PSIxIgpzaGFwZS1yZW5kZXJpbmc9ImF1dG8iIGZpbGw9ImJsYWNrIiBzdHJva2UtZGFzaGFycmF5PSJub25lIiBzdHJva2Utd2lkdGg9IjEiCnN0cm9rZS1saW5lam9pbj0ibWl0ZXIiIHN0cm9rZS1kYXNob2Zmc2V0PSIwIiBpbWFnZS1yZW5kZXJpbmc9ImF1dG8iCndpZHRoPSIxMDBweCIgaGVpZ2h0PSIxMDBweCIgdmlld0JveD0iMCAwIDI3NyAyMDAiID4KPHBhdGggZD0iTTI2MiAxODYKTDEwMSAxODYKTDE1ICAxMDAKTDEwMSAgMTMKTDI2MiAgMTMKTDI2MiAxODYKWk0yNDggMTcyIApMMjQ4ICAyNwpMMTA3ICAyNwpMMzUgIDEwMApMMTA3IDE3MgpMMjQ4IDE3MgpaTTIxNyAxMzMKTDIwNyAxNDMKTDE3NCAxMDkKTDE0MCAxNDMKTDEzMSAxMzMKTDE2NCAxMDAKTDEzMSAgNjYKTDE0MCAgNTYgCkwxNzQgIDkwCkwyMDcgIDU2CkwyMTcgIDY2CkwxODMgMTAwCkwyMTcgMTMzIFoiIHN0cm9rZT0ibm9uZSIvPgo8L3N2Zz4K\");\n"+
"  background-repeat: no-repeat;\n"+
"  background-position: center;\n"+
"  background-size: 30px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Numberpad-clear {\n"+
"  /* the following is an svg image of the 'circled latin capital letter c'\n"+
"       unicode character, \\u2428, base64 encoded. To see original, cut out\n"+
"       the quoted part after base64, then un-base64 encode.  */\n"+
"  background-image: url(\"data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+Cgo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAnLS8vVzNDLy9EVEQgU1ZHIDEuMC8vRU4nICdodHRwOi8vd3d3LnczLm9yZy9UUi8yMDAxL1JFQy1TVkctMjAwMTA5MDQvRFREL3N2ZzEwLmR0ZCc+CjxzdmcgZmlsbC1vcGFjaXR5PSIxIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIKY29sb3ItcmVuZGVyaW5nPSJhdXRvIiBjb2xvci1pbnRlcnBvbGF0aW9uPSJhdXRvIiBzdHJva2U9ImJsYWNrIgp0ZXh0LXJlbmRlcmluZz0iYXV0byIgc3Ryb2tlLWxpbmVjYXA9InNxdWFyZSIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIgpzdHJva2Utb3BhY2l0eT0iMSIgc2hhcGUtcmVuZGVyaW5nPSJhdXRvIiBmaWxsPSJibGFjayIgc3Ryb2tlLWRhc2hhcnJheT0ibm9uZSIKc3Ryb2tlLXdpZHRoPSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiCnN0cm9rZS1kYXNob2Zmc2V0PSIwIiBpbWFnZS1yZW5kZXJpbmc9ImF1dG8iIHdpZHRoPSIxMDBweCIgaGVpZ2h0PSIxMDBweCIKdmlld0JveD0iMCAxNTMgMjg3IDI4NyI+CjxwYXRoIGQ9Ik0xNDQgMTc2IApRMTc2IDE3NiAyMDQgMTkyIApRMjMyLjMxMjUgMjA4LjY4NzUgMjQ4IDIzNyAKUTI2NC42NTYyIDI2NC42NTYyIDI2NSAyOTcgClEyNjQuNjU2MiAzMjguOTIxOSAyNDggMzU3IApRMjMyLjE3MTkgMzg0Ljg5MDYgMjA0IDQwMSAKUTE3Ni4wNjI1IDQxNy4yMzQ0IDE0NCA0MTcgClExMTEuOTM3NSA0MTcuMjM0NCA4NCA0MDEgClE1NS44MjgxIDM4NC44OTA2IDQwIDM1NyAKUTIzLjM0MzggMzI4LjkyMTkgMjMgMjk3IApRMjMuMzQzOCAyNjQuNjU2MiA0MCAyMzcgClE1NS42ODc1IDIwOC41NDY5IDg0IDE5MiAKUTExMS43OTY5IDE3NiAxNDQgMTc2IApaTTE0NCAzOTkgClExODUuOTA2MiAzOTkgMjE2IDM2OSAKUTI0Ni41MTU2IDMzOC43NjU2IDI0NyAyOTcgClEyNDYuNTE1NiAyNjkuNTc4MSAyMzMgMjQ2IApRMjE4Ljk1MzEgMjIxLjkwNjIgMTk1IDIwOCAKUTE3MS4yODEyIDE5NC4zNDM4IDE0NCAxOTQgClExMDEuODEyNSAxOTQuMzQzOCA3MiAyMjUgClE0MS40ODQ0IDI1NC44MTI1IDQxIDI5NyAKUTQxLjQ4NDQgMzM4Ljc2NTYgNzEgMzY5IApRMTAyIDM5OSAxNDQgMzk5IApaTTIwMyAzMjAKUTE5Ni41OTM4IDM0Mi44NDM4IDE4MiAzNTQgClExNjcuMzQzOCAzNjUuMjAzMSAxNDcgMzY1IApRMTE0LjA0NjkgMzY1LjIwMzEgOTkgMzQ0IApRODQuMDkzOCAzMjMuNTc4MSA4NCAyOTUgClE4NC4wOTM4IDI2Mi44MjgxIDEwMiAyNDUgClExMTkuMzkwNiAyMjYuNTQ2OSAxNDcgMjI3IApRMTY2Ljc4MTIgMjI2LjU0NjkgMTgxIDIzNyAKUTE5NC42MjUgMjQ2LjUxNTYgMjAwIDI2NiAKTDE4MyAyNzAgClExNzguMzEyNSAyNTUuNzk2OSAxNjkgMjQ5IApRMTYwLjQ1MzEgMjQxLjU5MzggMTQ3IDI0MiAKUTEyNS4xNTYyIDI0MS41OTM4IDExNCAyNTYgClExMDIuNTE1NiAyNzAuMjgxMiAxMDMgMjk1IApRMTAyLjUxNTYgMzIzLjE1NjIgMTE0IDMzNyAKUTEyNi40MjE5IDM0OS44NzUgMTQ1IDM0OS44NzUgClExNjEuMDE1NiAzNDkuODc1IDE3MSAzNDEgClExODAuODQzOCAzMzIuODU5NCAxODUgMzE2IApMMjAzIDMyMCBaCiIgc3Ryb2tlPSJub25lIiAvPgo8L3N2Zz4K\");\n"+
"  background-repeat: no-repeat;\n"+
"  background-position: center;\n"+
"  background-size: 30px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Numberpad-key {\n"+
"  cursor: pointer;\n"+
"  background-color: #eee;\n"+
"  border: thin black solid;\n"+
"  border-radius: 8px;\n"+
"  font-family: Lucida Grande, sans-serif;\n"+
"  font-size: 20px;\n"+
"  color: black;\n"+
"  text-align: center;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Numberpad-element {\n"+
"  margin: 1px;\n"+
"  width: 44px;\n"+
"  height: 44px;\n"+
"  display: inline-block;\n"+
"  vertical-align: middle;\n"+
"  line-height: 48px;\n"+
"  padding: 0px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Numberpad-key:after {\n"+
"  content: attr(data-keyText);\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Numberpad-key:active,\n"+
".wsp-version-4-8-0 .wsp-Numberpad-key-down {\n"+
"  background-color: #636568;\n"+
"  border-color: transparent;\n"+
"  color: white;\n"+
"}\n"+
".wsp-version-4-8-0 button.wsp-Numberpad-control-key {\n"+
"  background-color: #c5dee5;\n"+
"  border-radius: 5px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-error-message {\n"+
"  text-align: center;\n"+
"  margin-top: 25px;\n"+
"  margin-bottom: 25px;\n"+
"  color: red;\n"+
"  font-size: 125%;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Table > div > table {\n"+
"  border-collapse: collapse;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Table {\n"+
"  border-right: 1px solid;\n"+
"  border-bottom: 1px solid;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Table > div > table,\n"+
".wsp-version-4-8-0 .wsp-Table > div > table > tbody > tr > th,\n"+
".wsp-version-4-8-0 .wsp-Table > div > table > tbody > tr > td {\n"+
"  border: 1px solid;\n"+
"  text-align: center;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Table > div > table > tbody > tr > td.wsp-final-row-cell {\n"+
"  opacity: 0.5;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Table > div > table > tbody > tr > td {\n"+
"  padding: .1em .4em .1em .4em;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Table > div > table > tbody > tr > th {\n"+
"  font-weight: normal;\n"+
"  font-style: italic;\n"+
"  padding: .2em .3em;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator {\n"+
"  width: 389px;\n"+
"  height: 356px;\n"+
"  background-color: #00bdec;\n"+
"  border-radius: 9px;\n"+
"  border: thin gray solid;\n"+
"  padding: 0px 6px 10px 8px;\n"+
"  cursor: default;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator-title {\n"+
"  background-color: #ecf8ff;\n"+
"  text-align: center;\n"+
"  border-radius: 5px;\n"+
"  margin-top: 4px;\n"+
"  padding: 2px 0;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator-display {\n"+
"  border-radius: 4px;\n"+
"  height: 80px;\n"+
"  background-color: white;\n"+
"  margin: 7px 0;\n"+
"  overflow: auto;\n"+
"  font-size: 18px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator-display-wrapper {\n"+
"  position: relative;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator-body-wrapper {\n"+
"  display: inline-block;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator-body-wrapper > .wsp-Calculator-body {\n"+
"  display: inline-block;\n"+
"  margin-left: 7px;\n"+
"  /* The default vertical-align for display:inline-block is\n"+
"     baseline. This leaves room at the bottom for letters like \"j.\"\n"+
"     Setting vertical-align to \"top\" eliminates the spacing. */\n"+
"  vertical-align: top;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator-left {\n"+
"  display: inline-block;\n"+
"  border-radius: 4px;\n"+
"  vertical-align: top;\n"+
"  width: 140px;\n"+
"  height: 186px;\n"+
"  background-color: #ecf8ff;\n"+
"  margin-top: 3px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator-label-insert {\n"+
"  width: 50%;\n"+
"  text-align: center;\n"+
"  margin: 35px auto 10px auto;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator-textual {\n"+
"  font-family: Lucida Grande, sans-serif;\n"+
"  font-size: 16px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator button.dropdown-toggle {\n"+
"  background-color: #f0f0f0;\n"+
"  border: 2px outset #f0f0f0;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .dropdown-toggle {\n"+
"  width: 110px;\n"+
"  white-space: nowrap;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator-left .dropdown-toggle {\n"+
"  height: 24px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .dropdown {\n"+
"  display: inline-block;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .wsp-select-function ul {\n"+
"  top: -220px;\n"+
"  left: 110px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .wsp-select-units ul {\n"+
"  top: -70px;\n"+
"  left: 110px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator-select-equation ul {\n"+
"  top: -170px;\n"+
"  left: 135px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator-topmost-select-for-insert,\n"+
".wsp-version-4-8-0 .wsp-Calculator-select-for-insert {\n"+
"  margin-top: 10px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .wsp-Calculator-left .dropdown {\n"+
"  margin-left: 15px;\n"+
"  margin-right: 15px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .wsp-Calculator-select-for-insert > button,\n"+
".wsp-version-4-8-0 .wsp-Calculator .wsp-Calculator-topmost-select-for-insert > button {\n"+
"  box-sizing: border-box;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator-bottom {\n"+
"  margin-top: 15px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator-select-equation {\n"+
"  margin-left: 30px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator-bottom-button {\n"+
"  margin-left: 30px;\n"+
"  border-radius: 5px;\n"+
"  padding: 2px 10px 3px;\n"+
"  background-color: #C0C0C0;\n"+
"  border: 2px outset #C0C0C0;\n"+
"  height: 19px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator-ok-button-inner {\n"+
"  padding: 0 10px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .dropdown a {\n"+
"  cursor: pointer;\n"+
"  margin-left: 3px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .selected a {\n"+
"  background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+Cjxzdmcgd2lkdGg9IjE5LjIxMzE1IiBoZWlnaHQ9IjE4LjI5NDk5NCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczpzdmc9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KIDxtZXRhZGF0YSBpZD0ibWV0YWRhdGE3Ij5pbWFnZS9zdmcreG1sPC9tZXRhZGF0YT4KCiA8Zz4KICA8dGl0bGU+TGF5ZXIgMTwvdGl0bGU+CiAgPGcgaWQ9ImxheWVyMSI+CiAgIDxwYXRoIGQ9Im00Ljc3NDY5LDE4LjI5NDk3OWMtMC4yNzUwMSwtMC4wMDM1NCAtMS40NjE4MSwtMS43Nzg0MzkgLTIuNjM3MzQsLTMuOTQ0MTQ5bC0yLjEzNzM0LC0zLjkzNzgxbDAuNTU0MDIsLTAuNTUzOTZjMC4zMDQ2OSwtMC4zMDQ3NSAxLjEyMzY3LC0wLjU1NDAyIDEuODE5OTUsLTAuNTU0MDJsMS4yNjU5NSwwbDAuNjM2MzgsMi4wMDUwN2wwLjYzNjM4LDIuMDA1MDdsNS4wNjQ0OCwtNS41NDEzMmMyLjc4NTQ1LC0zLjA0NzczIDYuMDAzMDcsLTYuMDQzNjQgNy4xNTAyNDEsLTYuNjU3NTlsMi4wODU3NDksLTEuMTE2MjdsLTQuMjA5NDM5LDQuNzgyMTdjLTIuMzE1MiwyLjYzMDI1IC01LjQ1MTM1LDYuNzQ4MDUgLTYuOTY5MjQsOS4xNTA3NmMtMS41MTc4OCwyLjQwMjcxIC0yLjk4NDc5LDQuMzY1NjYgLTMuMjU5NzgsNC4zNjIwNjFsLTAuMDAwMDEsLTAuMDAwMDExeiIgaWQ9InBhdGgyMjIzIiBmaWxsPSIjMDAwMDAwIi8+CiAgPC9nPgogPC9nPgo8L3N2Zz4=);\n"+
"  background-repeat: no-repeat;\n"+
"  background-position: left;\n"+
"  background-size: 16px 16px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .mathquill-rendered-math sup {\n"+
"  margin-top: 0.5em;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .mathquill-rendered-math sup {\n"+
"  margin-top: 0.5em;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .mathquill-editable.hasCursor {\n"+
"  box-shadow: none;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .wsp-calculator-edited {\n"+
"  padding: 5px;\n"+
"  min-width: 364px;\n"+
"  min-height: 69px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .wsp-calculator-edited .mq-blob > .wsp-ref {\n"+
"  background-color: rgba(238, 238, 238, 0.8);\n"+
"  display: inline-block;\n"+
"  margin: 0px 2px;\n"+
"  min-width: 0.7em;\n"+
"  text-align: center;\n"+
"  padding: 0 1px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .mathquill-rendered-math .numerator {\n"+
"  padding: 0.1em 0.1em;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator,\n"+
".wsp-version-4-8-0 .wsp-Calculator *,\n"+
".wsp-version-4-8-0 .wsp-Calculator *:before,\n"+
".wsp-version-4-8-0 .wsp-Calculator *:after {\n"+
"  -webkit-box-sizing: content-box;\n"+
"  -moz-box-sizing: content-box;\n"+
"  box-sizing: content-box;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .wsp-independent-variable {\n"+
"  font-style: italic;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .wsp-syntax-error-notice {\n"+
"  display: none;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .wsp-syntax-error-notice:after {\n"+
"  content: '!';\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator.wsp-syntax-error .wsp-syntax-error-notice {\n"+
"  color: red;\n"+
"  background-color: #f8f8f8;\n"+
"  font-size: 24px;\n"+
"  display: inline;\n"+
"  padding: 4px;\n"+
"  position: absolute;\n"+
"  right: 20px;\n"+
"  border: 2px solid red;\n"+
"  top: 10px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .mq-root-block .mq-hasCursor {\n"+
"  -webkit-box-shadow: inset #68b4df 0 0 2px 1px;\n"+
"  -moz-box-shadow: inset #68b4df 0 0 2px 1px;\n"+
"  box-shadow: inset #68b4df 0 0 2px 1px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .mq-math-mode .mq-editable-field.mq-focused,\n"+
".wsp-version-4-8-0 .wsp-Calculator .mq-editable-field.mq-focused {\n"+
"  box-shadow: none;\n"+
"  border: none;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .mq-math-mode .mq-sqrt-prefix {\n"+
"  top: .18em;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .dropdown-menu > li > a {\n"+
"  padding: 3px 19px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .wsp-missing {\n"+
"  color: red;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .mq-editable-field .mq-textarea {\n"+
"  /* Mathquill sets position to relative, but we were seeing premature\n"+
"   * scrollbars from IE (WSP-1578) as the selection area grew. This\n"+
"   * fixes the issue, perhaps because 1) the textarea is filled with\n"+
"   * increasingly more text as the selection is expanded, and 2)\n"+
"   * relative positioning inserts the element into the flow for a\n"+
"   * time, and thus impacts sizing enough to trigger scrolling. */\n"+
"  position: absolute;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .mq-editable-field .mq-textarea > * {\n"+
"  z-index: -999;\n"+
"  /* Mathquill uses a tiny (1px x 1px) textarea for cut/paste event handling, and\n"+
"  this triggered a bug. Chrome got confused when selecting, then blurring, then\n"+
"  focusing this textarea whenever it contained any text. Empirically, setting the\n"+
"  textarea to overflow: hidden fixes the bug; so that is what we do. */\n"+
"  overflow: hidden;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-Calculator .mq-non-leaf + .mq-sup-only {\n"+
"  vertical-align: .9em;\n"+
"  font-size: 85%;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-label-edit {\n"+
"  border: 1px solid black;\n"+
"  padding: 3px;\n"+
"  width: 415px;\n"+
"  background-color: #fafafa;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-label-edit button {\n"+
"  float: right;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-label-edit * {\n"+
"  font-size: 15px;\n"+
"  margin: 5px;\n"+
"  padding: 5px;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-text-target-highlight,\n"+
".wsp-version-4-8-0 .wsp-text-unmatched-given,\n"+
".wsp-version-4-8-0 .wsp-text-fancy-pulse {\n"+
"  border-style: solid !important;\n"+
"  border-width: 2px !important;\n"+
"  border-radius: 5px !important;\n"+
"  box-shadow: 3px 3px 7px black !important;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-text-target-highlight,\n"+
".wsp-version-4-8-0 .wsp-text-unmatched-given {\n"+
"  border-color: rgba(255, 0, 0, 0.5) !important;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-text-fancy-pulse {\n"+
"  border-color: rgba(255, 215, 0, 0.5) !important;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-text-unmatched-given {\n"+
"  -webkit-animation: wsp-version-4-8-0FlickerAnimation 0.5s infinite;\n"+
"  -moz-animation: wsp-version-4-8-0FlickerAnimation 0.5s infinite;\n"+
"  -o-animation: wsp-version-4-8-0FlickerAnimation 0.5s infinite;\n"+
"  animation: wsp-version-4-8-0FlickerAnimation 0.5s infinite;\n"+
"}\n"+
"@keyframes wsp-version-4-8-0FlickerAnimation {\n"+
"  0% {\n"+
"    background-color: rgba(255, 0, 0, 0);\n"+
"  }\n"+
"  40% {\n"+
"    background-color: rgba(255, 0, 0, 0.5);\n"+
"  }\n"+
"  80% {\n"+
"    background-color: rgba(255, 0, 0, 0);\n"+
"  }\n"+
"}\n"+
"@-o-keyframes wsp-version-4-8-0FlickerAnimation {\n"+
"  0% {\n"+
"    background-color: rgba(255, 0, 0, 0);\n"+
"  }\n"+
"  40% {\n"+
"    background-color: rgba(255, 0, 0, 0.5);\n"+
"  }\n"+
"  80% {\n"+
"    background-color: rgba(255, 0, 0, 0);\n"+
"  }\n"+
"}\n"+
"@-moz-keyframes wsp-version-4-8-0FlickerAnimation {\n"+
"  0% {\n"+
"    background-color: rgba(255, 0, 0, 0);\n"+
"  }\n"+
"  40% {\n"+
"    background-color: rgba(255, 0, 0, 0.5);\n"+
"  }\n"+
"  80% {\n"+
"    background-color: rgba(255, 0, 0, 0);\n"+
"  }\n"+
"}\n"+
"@-webkit-keyframes wsp-version-4-8-0FlickerAnimation {\n"+
"  0% {\n"+
"    background-color: rgba(255, 0, 0, 0);\n"+
"  }\n"+
"  40% {\n"+
"    background-color: rgba(255, 0, 0, 0.5);\n"+
"  }\n"+
"  80% {\n"+
"    background-color: rgba(255, 0, 0, 0);\n"+
"  }\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-text-fancy-pulse {\n"+
"  -webkit-animation: wsp-version-4-8-0FlickerAnimationGold 2s infinite;\n"+
"  -moz-animation: wsp-version-4-8-0FlickerAnimationGold 2s infinite;\n"+
"  -o-animation: wsp-version-4-8-0FlickerAnimationGold 2s infinite;\n"+
"  animation: wsp-version-4-8-0FlickerAnimationGold 2s infinite;\n"+
"}\n"+
"@keyframes wsp-version-4-8-0FlickerAnimationGold {\n"+
"  0% {\n"+
"    background-color: rgba(255, 215, 0, 0);\n"+
"  }\n"+
"  40% {\n"+
"    background-color: rgba(255, 215, 0, 0.5);\n"+
"  }\n"+
"  80% {\n"+
"    background-color: rgba(255, 215, 0, 0);\n"+
"  }\n"+
"}\n"+
"@-o-keyframes wsp-version-4-8-0FlickerAnimationGold {\n"+
"  0% {\n"+
"    background-color: rgba(255, 215, 0, 0);\n"+
"  }\n"+
"  40% {\n"+
"    background-color: rgba(255, 215, 0, 0.5);\n"+
"  }\n"+
"  80% {\n"+
"    background-color: rgba(255, 215, 0, 0);\n"+
"  }\n"+
"}\n"+
"@-moz-keyframes wsp-version-4-8-0FlickerAnimationGold {\n"+
"  0% {\n"+
"    background-color: rgba(255, 215, 0, 0);\n"+
"  }\n"+
"  40% {\n"+
"    background-color: rgba(255, 215, 0, 0.5);\n"+
"  }\n"+
"  80% {\n"+
"    background-color: rgba(255, 215, 0, 0);\n"+
"  }\n"+
"}\n"+
"@-webkit-keyframes wsp-version-4-8-0FlickerAnimationGold {\n"+
"  0% {\n"+
"    background-color: rgba(255, 215, 0, 0);\n"+
"  }\n"+
"  40% {\n"+
"    background-color: rgba(255, 215, 0, 0.5);\n"+
"  }\n"+
"  80% {\n"+
"    background-color: rgba(255, 215, 0, 0);\n"+
"  }\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-effects {\n"+
"  border: 4px dashed transparent;\n"+
"  box-sizing: border-box;\n"+
"  width: 100%;\n"+
"  height: 100%;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-drop-target .wsp-effects {\n"+
"  border-color: blue;\n"+
"}\n"+
".wsp-version-4-8-0 .wsp-parameter-sr-only {\n"+
"  border: 0;\n"+
"  width: 100%;\n"+
"  height: 100%;\n"+
"  overflow: hidden;\n"+
"  position: absolute;\n"+
"  color: transparent;\n"+
"  background-color: transparent;\n"+
"}\n"+
".wsp-version-4-8-0.keypressed .wsp-Numberpad button:focus {\n"+
"  outline: 3px solid red !important;\n"+
"}\n"+
".wsp-version-4-8-0.keypressed .wsp-sketch-container .wsp-Measure:focus,\n"+
".wsp-version-4-8-0.keypressed .wsp-sketch-container .wsp-Text:focus,\n"+
".wsp-version-4-8-0.keypressed .wsp-sketch-container .wsp-Button:focus,\n"+
".wsp-version-4-8-0.keypressed .wsp-sketch-container .wsp-Expression:focus,\n"+
".wsp-version-4-8-0.keypressed .wsp-sketch-container .wsp-Table:focus,\n"+
".wsp-version-4-8-0.keypressed .wsp-sketch-container .wsp-Table > div:focus,\n"+
".wsp-version-4-8-0.keypressed .wsp-sketch-container table:focus,\n"+
".wsp-version-4-8-0.keypressed .wsp-sketch-container .mfs-input:focus,\n"+
".wsp-version-4-8-0.keypressed .wsp-sketch-container .mfs-param:focus,\n"+
".wsp-version-4-8-0.keypressed .wsp-sketch-container .wsp-parameter-sr-only:focus {\n"+
"  outline: 3px solid red;\n"+
"}\n"+
"/*\n"+
" * MathQuill: http://mathquill.com\n"+
" * by Jay and Han (laughinghan@gmail.com)\n"+
" *\n"+
" * This Source Code Form is subject to the terms of the\n"+
" * Mozilla Public License, v. 2.0. If a copy of the MPL\n"+
" * was not distributed with this file, You can obtain\n"+
" * one at http://mozilla.org/MPL/2.0/.\n"+
" */\n"+
"@font-face {\n"+
"  font-family: Symbola;\n"+
"  src: local(\"Symbola Regular\"), local(\"Symbola\");\n"+
"}\n"+
".mq-editable-field {\n"+
"  display: -moz-inline-box;\n"+
"  display: inline-block;\n"+
"}\n"+
".mq-editable-field .mq-root-block {\n"+
"  display: -moz-inline-box;\n"+
"  display: inline-block;\n"+
"  width: 100%;\n"+
"  padding: 2px;\n"+
"  -webkit-box-sizing: border-box;\n"+
"  -moz-box-sizing: border-box;\n"+
"  box-sizing: border-box;\n"+
"  white-space: pre;\n"+
"  overflow: hidden;\n"+
"  vertical-align: middle;\n"+
"}\n"+
".mq-editable-field .mq-root-block:after {\n"+
"  content: '';\n"+
"}\n"+
".mq-editable-field .mq-cursor {\n"+
"  border-left: 1px solid black;\n"+
"  margin-left: -1px;\n"+
"  position: relative;\n"+
"  z-index: 1;\n"+
"  padding: 0;\n"+
"  display: -moz-inline-box;\n"+
"  display: inline-block;\n"+
"}\n"+
".mq-editable-field .mq-cursor.mq-blink {\n"+
"  visibility: hidden;\n"+
"}\n"+
".mq-editable-field,\n"+
".mq-math-mode .mq-editable-field {\n"+
"  border: 1px solid gray;\n"+
"}\n"+
".mq-editable-field.mq-focused,\n"+
".mq-math-mode .mq-editable-field.mq-focused {\n"+
"  -webkit-box-shadow: #8bd 0 0 1px 2px, inset #6ae 0 0 2px 0;\n"+
"  -moz-box-shadow: #8bd 0 0 1px 2px, inset #6ae 0 0 2px 0;\n"+
"  box-shadow: #8bd 0 0 1px 2px, inset #6ae 0 0 2px 0;\n"+
"  border-color: #709AC0;\n"+
"  border-radius: 1px;\n"+
"}\n"+
".mq-math-mode .mq-editable-field {\n"+
"  margin: 1px;\n"+
"}\n"+
".mq-editable-field .mq-latex-command-input {\n"+
"  color: inherit;\n"+
"  font-family: \"Courier New\", monospace;\n"+
"  border: 1px solid gray;\n"+
"  padding-right: 1px;\n"+
"  margin-right: 1px;\n"+
"  margin-left: 2px;\n"+
"}\n"+
".mq-editable-field .mq-latex-command-input.mq-empty {\n"+
"  background: transparent;\n"+
"}\n"+
".mq-editable-field .mq-latex-command-input.mq-hasCursor {\n"+
"  border-color: ActiveBorder;\n"+
"}\n"+
".mq-editable-field.mq-empty:after,\n"+
".mq-editable-field.mq-text-mode:after,\n"+
".mq-math-mode .mq-empty:after {\n"+
"  visibility: hidden;\n"+
"  content: 'c';\n"+
"}\n"+
".mq-editable-field .mq-cursor:only-child:after,\n"+
".mq-editable-field .mq-textarea + .mq-cursor:last-child:after {\n"+
"  visibility: hidden;\n"+
"  content: 'c';\n"+
"}\n"+
".mq-editable-field .mq-text-mode .mq-cursor:only-child:after {\n"+
"  content: '';\n"+
"}\n"+
".mq-editable-field.mq-text-mode {\n"+
"  overflow-x: auto;\n"+
"  overflow-y: hidden;\n"+
"}\n"+
".mq-math-mode {\n"+
"  font-variant: normal;\n"+
"  font-weight: normal;\n"+
"  font-style: normal;\n"+
"  font-size: 115%;\n"+
"  line-height: 1;\n"+
"  display: -moz-inline-box;\n"+
"  display: inline-block;\n"+
"}\n"+
".mq-math-mode .mq-non-leaf,\n"+
".mq-math-mode .mq-scaled {\n"+
"  display: -moz-inline-box;\n"+
"  display: inline-block;\n"+
"}\n"+
".mq-math-mode var,\n"+
".mq-math-mode .mq-text-mode,\n"+
".mq-math-mode .mq-nonSymbola {\n"+
"  font-family: \"Times New Roman\", Symbola, serif;\n"+
"  line-height: .9;\n"+
"}\n"+
".mq-math-mode * {\n"+
"  font-size: inherit;\n"+
"  line-height: inherit;\n"+
"  margin: 0;\n"+
"  padding: 0;\n"+
"  border-color: black;\n"+
"  -webkit-user-select: none;\n"+
"  -moz-user-select: none;\n"+
"  user-select: none;\n"+
"}\n"+
".mq-math-mode .mq-empty {\n"+
"  background: #ccc;\n"+
"}\n"+
".mq-math-mode .mq-empty.mq-root-block {\n"+
"  background: transparent;\n"+
"}\n"+
".mq-math-mode.mq-empty {\n"+
"  background: transparent;\n"+
"}\n"+
".mq-math-mode .mq-text-mode {\n"+
"  font-size: 87%;\n"+
"}\n"+
".mq-math-mode .mq-font {\n"+
"  font: 1em \"Times New Roman\", Symbola, serif;\n"+
"}\n"+
".mq-math-mode .mq-font * {\n"+
"  font-family: inherit;\n"+
"  font-style: inherit;\n"+
"}\n"+
".mq-math-mode b,\n"+
".mq-math-mode b.mq-font {\n"+
"  font-weight: bolder;\n"+
"}\n"+
".mq-math-mode var,\n"+
".mq-math-mode i,\n"+
".mq-math-mode i.mq-font {\n"+
"  font-style: italic;\n"+
"}\n"+
".mq-math-mode var.mq-florin {\n"+
"  display: -moz-inline-box;\n"+
"  display: inline-block;\n"+
"  width: .3em;\n"+
"  position: relative;\n"+
"  left: -0.1em;\n"+
"}\n"+
".mq-math-mode big {\n"+
"  font-size: 125%;\n"+
"}\n"+
".mq-math-mode .mq-roman {\n"+
"  font-style: normal;\n"+
"}\n"+
".mq-math-mode .mq-sans-serif {\n"+
"  font-family: sans-serif, Symbola, serif;\n"+
"}\n"+
".mq-math-mode .mq-monospace {\n"+
"  font-family: monospace, Symbola, serif;\n"+
"}\n"+
".mq-math-mode .mq-overline {\n"+
"  border-top: 1px solid black;\n"+
"  margin-top: 1px;\n"+
"}\n"+
".mq-math-mode .mq-underline {\n"+
"  border-bottom: 1px solid black;\n"+
"  margin-bottom: 1px;\n"+
"}\n"+
".mq-math-mode .mq-binary-operator {\n"+
"  padding: 0 0.2em;\n"+
"  display: -moz-inline-box;\n"+
"  display: inline-block;\n"+
"}\n"+
".mq-math-mode .mq-supsub {\n"+
"  font-size: 90%;\n"+
"  vertical-align: -0.5em;\n"+
"}\n"+
".mq-math-mode .mq-supsub.mq-limit {\n"+
"  font-size: 80%;\n"+
"  vertical-align: -0.4em;\n"+
"}\n"+
".mq-math-mode .mq-supsub.mq-sup-only {\n"+
"  vertical-align: .5em;\n"+
"}\n"+
".mq-math-mode .mq-supsub.mq-sup-only .mq-sup {\n"+
"  display: inline-block;\n"+
"  vertical-align: text-bottom;\n"+
"}\n"+
".mq-math-mode .mq-supsub .mq-sup {\n"+
"  display: block;\n"+
"}\n"+
".mq-math-mode .mq-supsub .mq-sub {\n"+
"  display: block;\n"+
"  float: left;\n"+
"}\n"+
".mq-math-mode .mq-supsub.mq-limit .mq-sub {\n"+
"  margin-left: -0.25em;\n"+
"}\n"+
".mq-math-mode .mq-supsub .mq-binary-operator {\n"+
"  padding: 0 .1em;\n"+
"}\n"+
".mq-math-mode .mq-supsub .mq-fraction {\n"+
"  font-size: 70%;\n"+
"}\n"+
".mq-math-mode sup.mq-nthroot {\n"+
"  font-size: 80%;\n"+
"  vertical-align: 0.8em;\n"+
"  margin-right: -0.6em;\n"+
"  margin-left: .2em;\n"+
"  min-width: .5em;\n"+
"}\n"+
".mq-math-mode .mq-paren {\n"+
"  padding: 0 .1em;\n"+
"  vertical-align: top;\n"+
"  -webkit-transform-origin: center .06em;\n"+
"  -moz-transform-origin: center .06em;\n"+
"  -ms-transform-origin: center .06em;\n"+
"  -o-transform-origin: center .06em;\n"+
"  transform-origin: center .06em;\n"+
"}\n"+
".mq-math-mode .mq-paren.mq-ghost {\n"+
"  color: silver;\n"+
"}\n"+
".mq-math-mode .mq-paren + span {\n"+
"  margin-top: .1em;\n"+
"  margin-bottom: .1em;\n"+
"}\n"+
".mq-math-mode .mq-array {\n"+
"  vertical-align: middle;\n"+
"  text-align: center;\n"+
"}\n"+
".mq-math-mode .mq-array > span {\n"+
"  display: block;\n"+
"}\n"+
".mq-math-mode .mq-operator-name {\n"+
"  font-family: Symbola, \"Times New Roman\", serif;\n"+
"  line-height: .9;\n"+
"  font-style: normal;\n"+
"}\n"+
".mq-math-mode var.mq-operator-name.mq-first {\n"+
"  padding-left: .2em;\n"+
"}\n"+
".mq-math-mode var.mq-operator-name.mq-last {\n"+
"  padding-right: .2em;\n"+
"}\n"+
".mq-math-mode .mq-fraction {\n"+
"  font-size: 90%;\n"+
"  text-align: center;\n"+
"  vertical-align: -0.4em;\n"+
"  padding: 0 .2em;\n"+
"}\n"+
".mq-math-mode .mq-fraction,\n"+
".mq-math-mode .mq-large-operator,\n"+
".mq-math-mode x:-moz-any-link {\n"+
"  display: -moz-groupbox;\n"+
"}\n"+
".mq-math-mode .mq-fraction,\n"+
".mq-math-mode .mq-large-operator,\n"+
".mq-math-mode x:-moz-any-link,\n"+
".mq-math-mode x:default {\n"+
"  display: inline-block;\n"+
"}\n"+
".mq-math-mode .mq-numerator,\n"+
".mq-math-mode .mq-denominator {\n"+
"  display: block;\n"+
"}\n"+
".mq-math-mode .mq-numerator {\n"+
"  padding: 0 0.1em;\n"+
"}\n"+
".mq-math-mode .mq-denominator {\n"+
"  border-top: 1px solid;\n"+
"  float: right;\n"+
"  width: 100%;\n"+
"  padding: .15em .1em 0 .1em;\n"+
"  margin-right: -0.1em;\n"+
"  margin-left: -0.1em;\n"+
"}\n"+
".mq-math-mode .mq-sqrt-prefix {\n"+
"  padding-top: 0;\n"+
"  position: relative;\n"+
"  top: .05em;\n"+
"  vertical-align: top;\n"+
"  -webkit-transform-origin: top;\n"+
"  -moz-transform-origin: top;\n"+
"  -ms-transform-origin: top;\n"+
"  -o-transform-origin: top;\n"+
"  transform-origin: top;\n"+
"}\n"+
".mq-math-mode .mq-sqrt-stem {\n"+
"  border-top: 1px solid;\n"+
"  margin-top: 1px;\n"+
"  padding-left: .15em;\n"+
"  padding-right: .2em;\n"+
"  margin-right: .1em;\n"+
"  padding-top: 1px;\n"+
"}\n"+
".mq-math-mode .mq-vector-prefix {\n"+
"  display: block;\n"+
"  text-align: center;\n"+
"  line-height: .25em;\n"+
"  margin-bottom: -0.1em;\n"+
"  font-size: 0.75em;\n"+
"}\n"+
".mq-math-mode .mq-vector-stem {\n"+
"  display: block;\n"+
"}\n"+
".mq-math-mode .mq-large-operator {\n"+
"  text-align: center;\n"+
"}\n"+
".mq-math-mode .mq-large-operator .mq-from,\n"+
".mq-math-mode .mq-large-operator big,\n"+
".mq-math-mode .mq-large-operator .mq-to {\n"+
"  display: block;\n"+
"}\n"+
".mq-math-mode .mq-large-operator .mq-from,\n"+
".mq-math-mode .mq-large-operator .mq-to {\n"+
"  font-size: 80%;\n"+
"}\n"+
".mq-math-mode .mq-large-operator .mq-from {\n"+
"  float: right;\n"+
"  /* take out of normal flow to manipulate baseline */\n"+
"  width: 100%;\n"+
"}\n"+
".mq-math-mode,\n"+
".mq-math-mode .mq-editable-field {\n"+
"  cursor: text;\n"+
"  font-family: Symbola, \"Times New Roman\", serif;\n"+
"}\n"+
".mq-math-mode .mq-selection,\n"+
".mq-editable-field .mq-selection,\n"+
".mq-math-mode .mq-selection .mq-non-leaf,\n"+
".mq-editable-field .mq-selection .mq-non-leaf,\n"+
".mq-math-mode .mq-selection .mq-scaled,\n"+
".mq-editable-field .mq-selection .mq-scaled {\n"+
"  background: #B4D5FE !important;\n"+
"  background: Highlight !important;\n"+
"  color: HighlightText;\n"+
"  border-color: HighlightText;\n"+
"}\n"+
".mq-math-mode .mq-selection .mq-matrixed,\n"+
".mq-editable-field .mq-selection .mq-matrixed {\n"+
"  background: #39F !important;\n"+
"}\n"+
".mq-math-mode .mq-selection .mq-matrixed-container,\n"+
".mq-editable-field .mq-selection .mq-matrixed-container {\n"+
"  filter: progid:DXImageTransform.Microsoft.Chroma(color='#3399FF') !important;\n"+
"}\n"+
".mq-math-mode .mq-selection.mq-blur,\n"+
".mq-editable-field .mq-selection.mq-blur,\n"+
".mq-math-mode .mq-selection.mq-blur .mq-non-leaf,\n"+
".mq-editable-field .mq-selection.mq-blur .mq-non-leaf,\n"+
".mq-math-mode .mq-selection.mq-blur .mq-scaled,\n"+
".mq-editable-field .mq-selection.mq-blur .mq-scaled,\n"+
".mq-math-mode .mq-selection.mq-blur .mq-matrixed,\n"+
".mq-editable-field .mq-selection.mq-blur .mq-matrixed {\n"+
"  background: #D4D4D4 !important;\n"+
"  color: black;\n"+
"  border-color: black;\n"+
"}\n"+
".mq-math-mode .mq-selection.mq-blur .mq-matrixed-container,\n"+
".mq-editable-field .mq-selection.mq-blur .mq-matrixed-container {\n"+
"  filter: progid:DXImageTransform.Microsoft.Chroma(color='#D4D4D4') !important;\n"+
"}\n"+
".mq-editable-field .mq-textarea,\n"+
".mq-math-mode .mq-textarea {\n"+
"  position: relative;\n"+
"  -webkit-user-select: text;\n"+
"  -moz-user-select: text;\n"+
"  user-select: text;\n"+
"}\n"+
".mq-editable-field .mq-textarea *,\n"+
".mq-math-mode .mq-textarea *,\n"+
".mq-editable-field .mq-selectable,\n"+
".mq-math-mode .mq-selectable {\n"+
"  -webkit-user-select: text;\n"+
"  -moz-user-select: text;\n"+
"  user-select: text;\n"+
"  position: absolute;\n"+
"  clip: rect(1em 1em 1em 1em);\n"+
"  resize: none;\n"+
"  width: 1px;\n"+
"  height: 1px;\n"+
"}\n"+
".mq-math-mode .mq-matrixed {\n"+
"  background: white;\n"+
"  display: -moz-inline-box;\n"+
"  display: inline-block;\n"+
"}\n"+
".mq-math-mode .mq-matrixed-container {\n"+
"  filter: progid:DXImageTransform.Microsoft.Chroma(color='white');\n"+
"  margin-top: -0.1em;\n"+
"}\n"+
"\n"+
"/* Import only the bits of bootstrap needed for our components. Code\n"+
"is not generated as css output unless actually referenced. */\n"+
"/* Components we adopt from bootstrap. */\n"+
".caret {\n"+
"  display: inline-block;\n"+
"  width: 0;\n"+
"  height: 0;\n"+
"  margin-left: 2px;\n"+
"  vertical-align: middle;\n"+
"  border-top: 4px solid;\n"+
"  border-right: 4px solid transparent;\n"+
"  border-left: 4px solid transparent;\n"+
"}\n"+
".dropdown {\n"+
"  position: relative;\n"+
"}\n"+
".dropdown-toggle:focus {\n"+
"  outline: 0;\n"+
"}\n"+
".dropdown-menu {\n"+
"  position: absolute;\n"+
"  top: 100%;\n"+
"  left: 0;\n"+
"  z-index: 1000;\n"+
"  display: none;\n"+
"  float: left;\n"+
"  min-width: 160px;\n"+
"  padding: 5px 0;\n"+
"  margin: 2px 0 0;\n"+
"  list-style: none;\n"+
"  font-size: 14px;\n"+
"  text-align: left;\n"+
"  background-color: #fff;\n"+
"  border: 1px solid #ccc;\n"+
"  border: 1px solid rgba(0, 0, 0, 0.15);\n"+
"  border-radius: 4px;\n"+
"  -webkit-box-shadow: 0 6px 12px rgba(0, 0, 0, 0.175);\n"+
"  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.175);\n"+
"  background-clip: padding-box;\n"+
"}\n"+
".dropdown-menu.pull-right {\n"+
"  right: 0;\n"+
"  left: auto;\n"+
"}\n"+
".dropdown-menu .divider {\n"+
"  height: 1px;\n"+
"  margin: 9px 0;\n"+
"  overflow: hidden;\n"+
"  background-color: #e5e5e5;\n"+
"}\n"+
".dropdown-menu > li > a {\n"+
"  display: block;\n"+
"  padding: 3px 20px;\n"+
"  clear: both;\n"+
"  font-weight: normal;\n"+
"  line-height: 1.42857143;\n"+
"  color: #333333;\n"+
"  white-space: nowrap;\n"+
"}\n"+
".dropdown-menu > li > a:hover,\n"+
".dropdown-menu > li > a:focus {\n"+
"  text-decoration: none;\n"+
"  color: #262626;\n"+
"  background-color: #f5f5f5;\n"+
"}\n"+
".dropdown-menu > .active > a,\n"+
".dropdown-menu > .active > a:hover,\n"+
".dropdown-menu > .active > a:focus {\n"+
"  color: #fff;\n"+
"  text-decoration: none;\n"+
"  outline: 0;\n"+
"  background-color: #337ab7;\n"+
"}\n"+
".dropdown-menu > .disabled > a,\n"+
".dropdown-menu > .disabled > a:hover,\n"+
".dropdown-menu > .disabled > a:focus {\n"+
"  color: #777777;\n"+
"}\n"+
".dropdown-menu > .disabled > a:hover,\n"+
".dropdown-menu > .disabled > a:focus {\n"+
"  text-decoration: none;\n"+
"  background-color: transparent;\n"+
"  background-image: none;\n"+
"  filter: progid:DXImageTransform.Microsoft.gradient(enabled = false);\n"+
"  cursor: not-allowed;\n"+
"}\n"+
".open > .dropdown-menu {\n"+
"  display: block;\n"+
"}\n"+
".open > a {\n"+
"  outline: 0;\n"+
"}\n"+
".dropdown-menu-right {\n"+
"  left: auto;\n"+
"  right: 0;\n"+
"}\n"+
".dropdown-menu-left {\n"+
"  left: 0;\n"+
"  right: auto;\n"+
"}\n"+
".dropdown-header {\n"+
"  display: block;\n"+
"  padding: 3px 20px;\n"+
"  font-size: 12px;\n"+
"  line-height: 1.42857143;\n"+
"  color: #777777;\n"+
"  white-space: nowrap;\n"+
"}\n"+
".dropdown-backdrop {\n"+
"  position: fixed;\n"+
"  left: 0;\n"+
"  right: 0;\n"+
"  bottom: 0;\n"+
"  top: 0;\n"+
"  z-index: 990;\n"+
"}\n"+
".pull-right > .dropdown-menu {\n"+
"  right: 0;\n"+
"  left: auto;\n"+
"}\n"+
".dropup .caret,\n"+
".navbar-fixed-bottom .dropdown .caret {\n"+
"  border-top: 0;\n"+
"  border-bottom: 4px solid;\n"+
"  content: \"\";\n"+
"}\n"+
".dropup .dropdown-menu,\n"+
".navbar-fixed-bottom .dropdown .dropdown-menu {\n"+
"  top: auto;\n"+
"  bottom: 100%;\n"+
"  margin-bottom: 2px;\n"+
"}\n"+
"@media (min-width: 768px) {\n"+
"  .navbar-right .dropdown-menu {\n"+
"    left: auto;\n"+
"    right: 0;\n"+
"  }\n"+
"  .navbar-right .dropdown-menu-left {\n"+
"    left: 0;\n"+
"    right: auto;\n"+
"  }\n"+
"}\n"+
"";
