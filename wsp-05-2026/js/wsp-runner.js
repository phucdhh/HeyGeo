/*!
  Web Sketchpad Sketch Runner. Copyright &copy; 2016 KCP Technologies, a McGraw-Hill Education Company. All rights reserved.
  Version: Release: 2015Q4Update2, Semantic Version: 4.5.1-alpha, Build Number: 1020, Build Stamp: stek-macbook-pro.local/20190331013328
*/
/* global GSP, WIDGETS */

(function () {
  /* When a file is loaded by data-var, there are several requirements for the supplied variable name.
  * It must be a legal name for a javascript variable and not duplicate any name already in the global namespace.
  * It must be a legal URL and a legal filename for Mac, Win, and Unix.
  * The returned value
  * Filename code adapted from node-sanitize (https://github.com/parshap/node-sanitize-filename/blob/master/index.js)
  *
  * For now, we require that the alphabetic characters in JavaScript identifiers be from standard ASCII (Latin alphabet)
  * or from the Greek alphabet.
  * Replaces characters in strings that are illegal/unsafe for filenames.
  * Unsafe characters are either removed or replaced by a substitute set
  * in the optional `options` object.
  *
  * Illegal Characters on Various Operating Systems
  * / ? < > \ : * | "
  * https://kb.acronis.com/content/39790
  *
  * Unicode Control codes
  * C0 0x00-0x1f & C1 (0x80-0x9f)
  * http://en.wikipedia.org/wiki/C0_and_C1_control_codes
  *
  * Reserved filenames on Unix-based systems (".", "..")
  * Reserved filenames in Windows ("CON", "PRN", "AUX", "NUL", "COM1",
  * "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
  * "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", and
  * "LPT9") case-insesitively and with or without filename extensions.
  *
  */

  var jsReserved = /^(do|if|in|for|var|new|try|var|case|else|enum|eval|null|this|true|void|with|await|break|catch|class|var|false|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$/;

  var illegalRe = /[\/\?<>\\:\*\|":]/g; // Illegal chars for filenames
  var controlRe = /[\x00-\x1f\x80-\x9f]/g; // control codes are illegal
  var reservedRe = /^\.+$/;
  var windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
  var digits = /\d+$/; // identify trailing digits
  var jsIdentifierFilter = /^[^a-zA-Zα-ωΑ-Ω_$]|[^0-9a-zA-Zα-ωΑ-Ω_$]/g; // use to replace possibly invalid chars

  function normalize (name, allow) {
    // pass allow.suffix or allow.path to allow suffix or path to remain.
    var path; // we'll cache the path if it's allowed.

    function getPath (fName) {
      var i = fName.lastIndexOf('/');
      return (i < 0) ? '' : fName.substring(0, i + 1);
    }

    function removePathAndSuffix (fName) {
      var parts1, parts2, ix;
      parts1 = fName.split('/');
      if (!allow.suffix) {  // remove any suffix from the last part
        ix = parts1.length - 1;
        parts2 = parts1[ix].split('.');
        if (parts2.length > 1) {
          parts2.pop();  // remove the suffix
          parts1[ix] = parts2.join('.');  // allows other '.' chars before the suffix
        }
      }
      // with any suffix gone, remove the path...
      if (!allow.path) {
        return parts1[parts1.length - 1];
      } else {
        return parts1.join('/');
      }
    }

    function incrementIfNeeded (st) { // if st matches an identifier, a Windows reserved word,
      // or a name defined in the global namespace, increment its numeric suffix
      var n;
      while (st.match(jsReserved) || st.match(windowsReservedRe) || typeof window[st] !== 'undefined') {
        if (!st.match(digits)) { st += '0'; }
        n = st.match(digits)[0];
        st = st.replace(digits, +n + 1);
      }
      return st;
    }

    function sanitize (input, replacement) {
      var sanitized = input
        .replace(illegalRe, replacement)
        .replace(controlRe, replacement)
        .replace(reservedRe, replacement);
      var match = sanitized.match(windowsReservedRe);
      if (match) {
        sanitized += '1'; // if already used, will be incremented later
      }
      return sanitized;
    }

    function doSanitize (name, options) {
      var replacement = (options && options.replacement) || '';
      var newName = sanitize(name, replacement);
      if (replacement === '') {
        return newName;
      }
      return sanitize(newName, '');
    }

    function makeJsName (name) { // Turn name into a legal js identifier (currently allowing only ASCII and Greek characters)
      // Prepend underscore to leading digit
      if (name[0].match(/[0-9]/)) {
        name = '_' + name;
      }
      // Replace non-matching characters with underscores
      return name.replace(jsIdentifierFilter, '_');
    }

    allow = allow || {};
    path = allow.path ? getPath(name) : ''; // cache the path if it's allowed
    name = name.normalize('NFKC'); // Normalize the name for compatibility (eg, change the ﬀ ligature into 'ff')
    name = removePathAndSuffix(name);
    name = doSanitize(name, { replacement: '_' });
    name = makeJsName(name);
    name = name.replace(/[_]+/, '_'); // Remove repeated underscores
    name = incrementIfNeeded(name);

    // FOR VALID CHARS IN A VARIABLE, SEE https://gist.github.com/mathiasbynens/6334847
    return (path || '') + name;
  }

  /*  unitTest depended on forbidding duplicates, which is no longer supported

  function unitTest () {

    function check (st, expected) {
      var result = normalize (st);
      if (result !== expected)
        console.log ("WspNames.unitTest error: expected ", expected, " but result was ", result);
    }

    check ('that', 'that');
    check ('that', 'that1');
    check ('that', 'that2');
    check ('that', 'that3');
    check ('that', 'that4');
    check ('that', 'that5');
    check ('that', 'that6');
    check ('that', 'that7');
    check ('that', 'that8');
    check ('that', 'that9');
    check ('that', 'that10');
    check ('that', 'that11'); // that11
    check ('ligature ﬀ', 'ligature_ff'); // ligature_ff
    check ('con', 'con1');  // Illegal in Windows; should return con1
    check ('2', '_2');  // javascript variables cannot begin with a digit.
    check ('1', '_1');
    check ('1', '_3');  // _2 is already used, so increment the trailing numeric portion
    check ('com', 'com');  // Legal
    check ('com', 'com10');  // conversion to com1 makes it illegal; should turn into com10.
    check ('.test', '_test');  // period not allowed to start filenames
    check ('..testing', '_testing');  // no multiple periods
    check ('_test', '_test1');  // underscore is legal first char, but append 1 because already used
    check ('$this', '$this'); // $ is allowable first char
    check ('per.iod', 'per'); // remove suffix
    check ('1test', '_1test');  // variable cannot start with a digit; prepend an underscore: _1test
    check ('test12var', 'test12var'); // legal variable name
    check ('a+b', 'a_b');  // illegal in variables: a_b
    check ('a/b', 'b');  // The "a/" looks like a path name and is removed.
    check ('a____b', 'a_b1'); // no repeated underscores
    check ('this', 'this1'); // no javascript reserved words
    check ('this', 'this2'); // no javascript reserved words
    window.alert3 = "";                 // define alert3 in global namespace
    check ('alert', 'alert1'); // alert is already defined in global namespace
    check ('alert', 'alert2'); // alert1 is not defined in global namespace, so comes up twice
    check ('alert', 'alert4'); // alert3 is skipped because it's defined in global namespace
    check ('includes/scripts/some_var', 'some_var'); // any leading file-name path is removed.
  }
  */

  /*  @param {string} name is the string to be converted into a legal filename / variable name
   *  @param {object} allow permits certain forms: {path: true} doesn't strip leading path name.
   *
   *  returns the (possibly modified) string that's legal for names of both variables and files.
   */
  GSP.normalizeSketchName = function (name, allow) {
    return normalize(name, allow);
  };

  // unitTest();  // unitTest depended on forbidding duplicates, which is no longer supported
})(); // WspNames


// Put fixSketch and fixAuthorPrefs into the GSP namespace so external clients (e.g., the Tool Library) can use them.
(function () {
  // Here we clean up the various nameOrigin values, some of which are rather obscure and no longer in current use.
  // namedFromFixedString applies only to functions coming from the JSP-to-WSP converter. 
  // It may be that one of the other nameOrigin values would work for functions originating with JSP, but without
  // a test sketch to be certain, we rename it 'jspfixed' here, and we also use it as the nameOrigin for gobjs
  // with the _apply_ signal, to indicate that they can be duplicates instead of requiring a unique generated label.
  // namedFromCustom is used only in generateNameMFS() for measureKind objects. The code suggests that its function
  // is to generate a proper expression for a measurement derived from a composite text object, but I've not been able
  // to find or create an appropriate test sketch. The sketches where I've found it is sheep dog; I've also found it
  // in the measure hyperbolic angle tool. In neither context does it seem to behave as I would have expected, but
  // in neither context does it seem to produce erroneous results. Consequently I've renamed it to math the new simpler
  // nameOrigin values without changing the functionality in the code.
  var oldOrigins = ['namedFromLabel', 'namedByPrime', 'namedByShortFn', 'namedByFullFn', 'namedFromTemplate',
                    'namedFromCustom', 'nameApplied', 'namedFromFixedString', 'noVisibleName'],
      newOrigins = ['manual', 'prime', 'shortFn', 'fullFn', 'auto', 'auto', 'applied', 'jspFixed', 'none'],
      // use shortFn (not 'short') to avoid js reserved word 'short'
      // GSP authors can apply these signals in GSP sketches by labeling the object with the desired signal,
      // surrounded by underscores.
      newOriginSignals = ['_manual_', '_prime_', '_short_', '_full_', '_auto_', '_auto_', '_apply_', 'jspfixed', '_none_'],
      versionCSS = 'wsp-version-4-8-0';

  
  GSP.fixSketch = function (data, options) { // data is the JSON sketch data to be examined and massaged
    // Pass options.pages, options.tools, or options.all. (If undefined, defaults to all.)
    // The fix here corrects erroneous export of sketches with font-family = "\"Times New Roman\", sans-serif"
    var defaultList = ['"Times New Roman", serif', '"Arial", sans-serif'],
        i, fontList,
        pageId, pageSpec, pageIndex, pageArr = [],
        wspVersion = data.metadata['wsp-version'].split('.'),
        v49orEarlier = !(wspVersion[0] > 4 || wspVersion[0] === 4 && wspVersion[1] > 9);
        // constructibleGiven, other fixes weren't in exporter through v4.9

    function fixTimesFont (s) {
      if (typeof s === 'string' && !$.isNumeric(s) && s.includes('Times') && s.includes('sans-serif')) {
        s = s.replace('sans-serif', 'serif');
      }
      return s;
    }

    function fixGobjFont (gobj) {
      // Fix the gobj if its style lists "\"Times New Roman\", sans-serif"
      var fontStyle;
      if (gobj.style && gobj.style.label) { fontStyle = gobj.style.label; }
      if (!fontStyle) { fontStyle = gobj.style; }
      if (fontStyle && fontStyle['font-family']) { fontStyle['font-family'] = fixTimesFont(fontStyle['font-family']); }
    }

    function fixCaseButton (gobj) {
      // Fix any _Case: buttons
      if (gobj.kind === 'Button' && gobj.label && gobj.label.match(/_Case:/i) && (gobj.constraint.match(/Hide/) || gobj.constraint.match(/Show/))) {
        gobj.constraint = 'ActionButtonPresentCase';
        delete gobj.messages;
        gobj.label = gobj.label.replace(/_Case:/i, '').trim();
        if (!gobj.label) {
          gobj.label = 'auto'; // the "auto" label will be fixed in constrain().
        }
      }
    }
      
    function fixLegacyNameOrigin(gobj) {
      // Update old nameOrigin values to the newOrigins values
      // Depending on source, a legacy nameOrigin may be stored as gobj.style.nameOrigin,
      // or may be encoded in the label (for instance, as 'nameOrigin: namedByPrime').
      var label = gobj.label,
          origin, style, aMatch, source,
          ix, retVal;
      if (!gobj.style) {
        gobj.style = {};
      }
      style = gobj.style;
      origin = style.nameOrigin;
      if (label && !origin) { // check for legacy labels such as 'nameOrigin: namedByPrime'
        aMatch = label.match(/nameOrigin:(.*)/i);
        if (aMatch && aMatch[1]) { // check for a legacy match of form 'nameOrigin: namedByPrime'
          origin = aMatch[1].trim();
          ix = oldOrigins.indexOf(origin);
          if (ix >= 0) {
            gobj.style.nameOrigin = newOrigins[ix];
            gobj.label = '';
            return true;
          }
        }
        // A transformed image of "given: A" might be labeled "given: A'"; detect this here.
        // gobj is not yet instantiated, so we recognize an image by looking for a source parent.
        source = GSP._get(gobj, 'parents.source');
        if (source && label[label.length - 1] === "'") {  
          style.nameOrigin = 'prime';
          gobj.label = gobj.label.replace(/(given:?)/, '').trim();
        }
        
      }
      if (origin) { // check for an oldOrigin and replace it with the new
        ix = oldOrigins.indexOf(origin);
        if (ix >= 0) {
          style.nameOrigin = newOrigins[ix];
          return true;
        }
      }
      if (label) {  // A transformed image of "given: A" might be labeled "given: A'"; detect this here
        // gobj is not yet instantiated, so we recognize an image by looking for a source parent.
        source = GSP._get(gobj, 'parents.source');
        if (source && label[label.length - 1] === "'") {
          style.nameOrigin = 'prime';
          gobj.label = gobj.label.replace(/(given):?'?/, '').trim();
        }
      }
      if (label && !style.nameOrigin) {   // still haven't found it, so check for a legacy signal like namedByPrime
        label = label.replace(/^nameorigin:/i, ''); // origin signals work with or without this string
        if (label.search(/^(named|novisiblelabel)/i) === 0) { // the label contains a legacy signal
          oldOrigins.every(function(signal, ix) {
            retVal = label.replace(signal, newOrigins[ix]);
            if (retVal !== label) {
              style.nameOrigin = retVal;  // set the nameOrigin; we're done
              gobj.label = retVal;
              return false;
            }
            return true;
          });
        }
      }
    } // fixLegacyNameOrigin

    function makeGlideReflection(gobj) { // This gobj's constraint needs to be changed from Reflect
      // to GlideReflect. It's used in the primitive (now deprecated) solution designed to enable a
      // Glide Reflection tool (signaled by the tool name) and also in the more robust solution that
      // is signaled by the "_glidereflect_" signal in the glide reflection image's label.
      if (gobj.constraint === 'Reflect') {
        gobj.constraint = 'GlideReflect';
        gobj.parents.vector = gobj.parents.mirror;
        delete gobj.parents.mirror;
      }
    }

    function applyQuotes(label) {
      // Add the apply signal to any label surrounded by double quotes, removing the double quotes
      var pMatch = label && label.match(/^"(.*)"$/);
      if (pMatch && pMatch[1]) {
          label = pMatch[1] + '_apply_';
      }
      return label;
    }

    function fixSignals(gobj) { // Interpret label signals marked by underscores, such as
      // _fullFn_, _prime_, _showlabel_, _apply_, _hide_, and _glidereflect_
      // There's no _hidelabel_ signal because its semantics are confusing and its use risks
      // generateLabel() creating a label that duplicates the hidden one. Similarly, a _show_
      // code would be redundant: the user can just show the object.
      var label = applyQuotes(gobj.label),
          signalChars = /_[A-Za-z0-9]*_/g, // no need to require the leading space
          autoReg = /autostart:(\b)*/i,
          matches, signal, found, i, j;
      if (!label) return;
      matches = label.match(signalChars);
      if (matches) {
        // check for labels embedding the nameOrigin such as _fullFn_
        for (i = 0; i < matches.length; i++) {
          signal = matches[i];
          j = newOriginSignals.indexOf(signal.toLowerCase());
          if (j >= 0) {
            gobj.style.nameOrigin = newOrigins[j];
            label = label.replace(signal, '').trim();
            i = matches.length; // don't allow multiple nameOrigin signals
          }
        }
        // check for other signals that may occur along with a nameOrigin signal:
        // _showlabel_, _apply_, _hide_, and _glidereflect_
        for (i = 0; i < matches.length; i++) {
          found = true;
          signal = matches[i];
          switch (signal.toLowerCase()) {
            case '_showlabel_': GSP._put(gobj, 'style.label.showLabel', true); break;
            case '_apply_': GSP._put(gobj, 'style.nameOrigin', 'applied'); break;
            case '_hide_': GSP._put(gobj, 'style.hidden', true); break;
            case '_glidereflect_': makeGlideReflection(gobj); break;
            default: if (newOriginSignals.indexOf(signal) < 0) { // it's not a nameOrigin either
              found = false;
              console.log('Unrecognized labeling signal: ' + signal);
            }
          }
          if (found) { // leave any other signals in place
            label = label.replace(signal, '').trim();
          }
        }
      }
      if (gobj.kind === 'Button' && gobj.label.match(autoReg)) {
        gobj.style.autostart = true;
        label = gobj.label.replace(autoReg, '');
      }
      gobj.label = label;
    }
    
    function restoreLegacyNameOrigin(gobj) {
      // Call this function when a sketch is downloaded to preserve the current file format.
      var ix, origin = GSP._get(gobj, 'style.nameOrigin');
      if (!origin) return;
      ix = newOrigins.indexOf(origin);
      if (ix >= 0) {
        gobj.style.nameOrigin = oldOrigins[ix];
      }
    }
    
    function fixLabel (gobj) {  // fix properties of the label that apply to both sketch and tool objects
      fixLegacyNameOrigin(gobj);
      fixSignals(gobj); // Fix other signals that authors can insert into gobj labels.
      // Delete labels that won't be visible but will create holes in the sequence of generated labels:
      // labels with a single letter optionally followed by a digit or a digit in square brackets.
      // Delete labels only for objects with hasLabel === true (not buttons, measures, etc.)
      if (gobj.label && !gobj.style.nameOrigin &&
          GSP.gObjects[gobj.kind].hasLabel && // gobj may be a spec, so check hasLabel by kind
          !GSP._get(gobj, 'style.label.showLabel') &&
          /^[a-zA-Z](\d|\[\d\])?$/.test(gobj.label)) {
        delete gobj.label;
      }
      if (false) {  // avoid a syntax error for now, until restoreLegacyNameOrigin() is called for downloads
        restoreLegacyNameOrigin(gobj);
      }
    }

    function fixPage (page) {
      $.each(page.preferences.text.textTypes, function (key, value) {
        if (!value['font-family']) { value = value.label; }
        if (value['font-family']) { value['font-family'] = fixTimesFont(value['font-family']); }
      });
      if (page.objects) {
        $.each(page.objects, function (id, gobj) {
          fixGobjFont(gobj);
          fixCaseButton(gobj);
          fixLabel(gobj);
        });
      }
    }

    function assert (condition, msg) {
      if (!condition) console.log(msg);
    }

    function fixTool (tool) {
      /* Tasks needed to convert tool objects from a GSP source to the proper corresponding WSP objects.
      * Long-term: "constructibleGiven" is obsolete; replace with "constructible"
      * Temp: If label is "constructible" and its parents are free, set toolRole to "constructibleGiven"
      * "givenParent" is now "given", and the givenParent toolRole should be recognized automatically
      * based on the constructible child.
      * Label Format signals must be recognized: manual, prime, short, full, auto, applied, fixed, none
      * Visibility signals: hide, showlabel
      * Apply Label signal: apply
      * Constraint signal: glidereflect
      * Check all clients of GSP.labels.legalNameOrigins() to make sure they accept the new signals
      */
      
      
      // Fix any Calculator tools that use the expression "1+1" to be blank
      // Fix any GlideReflect tools to switch TranslateVector constraint to GlideReflect
      // Assign the constructibleGiven toolRole to objects whose label begins with
      // "constructible" or "constructibleGiven," whose constraint is listed in
      // constructibleConstraints below, and whose parents have no parents of their own.
      // (This allows any constructibleGiven to be matched by its parents instead.)
      // Assign the "givenParent" toolRole to such parents even if they're not labeled "given". 
      // If an object that would otherwise be "constructible" doesn't have a label starting with
      // "constructible" or "constructibleGiven", we do NOT set its toolRole to "constructibleGiven,"
      // in case the author has a reason for forcing the object to be matched via its parents,
      // even though we don't allow an author to require that a constructibleGiven be matched
      // directly rather then by its parents. (In such a case the tool author can hide the
      // givenParent objects to achieve the same effect.)
      //

      // (allow either constructible or constructibleGiven, and also allow a following sort-order and a colon-separated label)

      var constructibleRegEx = /^constructible(given)?(\d*):?/i,
          givenRegEx = /^given(parent)?(\d*):?/i,
          hideRegEx = /_hidelabel_|hide_label/,
          constructibleConstraints = 'Segment, Line, Ray, PolygonFromPoints, CircleFromTwoPoints, Arc3Points',
          glideReflect = tool.metadata.name.match(/glide\xA0reflect/i); // The tool-name approach to glide reflection is deprecated;
          // it turns every reflection in the tool into a glide reflection.
          // When can we remove this signal and rely on the new approach based on the image's label?

      /* When a tool's given object is instantiated in a sketch, there are five possible
       * use cases for the label of the new sketch object, listed below. Each example is preceded
       * by a quoted example of an actual label, shown or hidden, that results in the behavior.
       * Note that each case has two sub-cases: the source label is either showing or hidden.
       *   For productions, we have the following examples of user-defined labels for the
       *   five cases (using "A" to represent any label the sketch author might want to apply:
       *   1. _manual_ _showlabel_ :       Generate and show a new label
       *   2. _hidelabel_ :                Generate and hide a new label
       *   3. A _showlabel_ :              Apply and show a label
       *   4. A _hidelabel_:               Apply and hide a (possibly empty) label
       *   5. A legal nameOrigin:      Set the nameOrigin and empty the label
       *   For givens and constructibleGivens, the user-specified labels are always shown in the
       *   source sketch, helping the tool author to keep track of givens and constructibleGivens.
       *   The following examples apply to both givens and constructibleGivens:
       *   1. "given: _manual_"     Generate and show a unique label on every tool use.
       *   2. "given: _hidelabel_"             Generate and hide a unique label on every use; show when needed.
       *   3. "given: A _apply_"          Impose "A" on loadSketch and show "A" on every tool use.
       *   4. "given: A _hidelabel_ _apply_"   Apply "A" on loadSketch; on tool use, hide until needed.
       *   ("_hidelabel_" is a flag to tell Web Sketchpad that the label should be hidden until needed.)
       *
       * Note that the label of a tool production, like a sketch object, can contain a nameOrigin value
       * to indicate how its name will be formed (for instance, "namedFromLabel").
       * (Not all nameOrigin values are appropriate for all contraints; for instance, _manual_,
       * namedByShortFn, and namedByFullFn are reserved for transformed images.)
       * Note also: 5 forms are listed for completeness, but #2 and #4 will be seldom (if ever) used.
       * Because "given: " has already been removed from the labels of given objects,
       * the code below processes both given labels and production labels identically.
       **/
      
      function setConstructible(gobj) {  // 'constructibleGiven' is deprecated
        gobj.toolRole = 'constructible';
      }
      
      function fixToolLabel (gobj) {
        // The exporter has already removed "given:" or "assumed:" from the label, but not "constructible:"
        // caller has guaranteed gobj.label is defined
        var fromLabel, legalOrigins, match,
            label = gobj.label,  // Modify this copy and then replace the original label at the end...
            hideLabel = label && GSP._get(gobj, 'style.label.showLabel') === false || label.match(hideRegEx);  // check new code and legacy code
        // The hide signal doesn't affect anything else, so handle it first.
        if (hideLabel) { // remove the flag and hide the label
          label = label.replace(/_hidelabel_|hide_label/, '').trim();
          GSP._put(gobj, 'style.label.showLabel', false);
        }
        // Look for toolRole signals: constructibleGiven, given, givenParent. Set toolRole & sortOrder and remove the signal.
        if (constructibleConstraints.indexOf(gobj.constraint) >= 0) { // only some constraints are eligible
          match = label.match(constructibleRegEx);
          if (match) {
            setConstructible(gobj);
            label = label.replace(constructibleRegEx, '').trim();
            if (match[2]) {
              gobj.givenSortOrder = +match[2];
            }
          }
        }
        if (!match) { // Look for givens and givenParents
          match = label.match(givenRegEx);
          if (match) {
            gobj.toolRole = match[1] ? 'givenParent' : 'given';
            label = label.replace(givenRegEx, '').trim();
            if (match[2]) {
              gobj.givenSortOrder = +match[2];
            }
          }
        }
        // All toolRole & sortOrder signals have been handled and removed, including any trailing colon and/or spaces 
        // Now look for naming signals: If found, set style.nameOrigin and remove the signal
        fromLabel = label.indexOf('namedFromLabel');
        assert(fromLabel === 0 || fromLabel === -1, 'fixToolLabel: namedFromLabel is misplaced');
        fromLabel = fromLabel === 0;
        if (fromLabel) {
          label = label.substring(14).trim();
          assert(label.length === 0, 'fixToolLabel: namedFromLabel should be at end.');
        }
        if (fromLabel || !label && gobj.toolRole.match(/given/)) { // case 1 or 2
          // set nameOrigin & get actual label.
          gobj.style.nameOrigin = 'manual';
          label = ''; // the label is empty for cases 1 & 2
          if (!fromLabel) { // case 2 for a given
            gobj.style.label.showLabel = false; // showLabel is true for case 1, false for case 2
          }
        } else {
          legalOrigins =  GSP.labels.legalNameOrigins(); // cannot pass gobj: it's still in spec form
          if (legalOrigins.includes(label)) {  // case 5
            gobj.style.nameOrigin = label;
            label = '';
          }
        } // nothing to do for cases 3 and 4
        fixLabel(gobj);
        if (label) {
          gobj.label = label; // use the updated label
        } else { // If label is empty, delete and hide it.
          delete gobj.label;
          if (gobj.style && gobj.style.label) { gobj.style.label.showLabel = false; }
        }
      } // fixToolLabel

      function deleteWithDescendants (id) { // recursively delete my descendants and then myself
        var found = false;
        $.each(tool.objects, function (i, gobj) { // check all objects with index > id
          if (i - id > 0 && gobj.parents) {
            $.each(gobj.parents, function (j, par) {
              if (par === id) { // am I a parent of gobj?
                found = true; //
                deleteWithDescendants(i); // delete this child and its descendants
              }
            });
          }
        });
        delete tool.objects[id];
        if (found) {
          GSP.signalErrorWithMessage('Given marked for deletion has children!');
        }
      } // deleteWithDescendants

      /* PROPOSED NEW FEATURE: AUTO-DETECT GIVENS
      // The checkGivens function simplifies tool authoring: It detects given objects,
      // eliminating the need to give such objects special labels.
      // NEEDS TESTING BEFORE GOING LIVE
      
      function checkGivens() {  // check to make sure there are given objects; if not, make some.
        // The exporter now allows tools with no givens to be exported, rather than displaying an unreadable error message.
        // It's better to address a tool with missing givens here, where we can try to provide useful feedback.
        var givensExist,
            allGivenRoles = ['given', 'assumed', 'givenParent', 'constructible'];
            
        function setLabels() {
          // Prefix the original labels of all given/constructible gobjs with their toolRole
          // This can provide a signal to the tool author of the needed labeling for tools
          $.each(tool.objects, function () {
            var newLabel = this.toolRole;
            if (newLabel) { // relabel this tool gobj with its toolRole + original label
              if (this.label) {
                newLabel += ': ' + this.label;
              }
              this.label = newLabel;
              GSP._put( this, 'style.label.showLabel', true);
              this.style.label.color = 'red';
              this.style.nameOrigin = 'applied';
            }
          });
        }
        
        function checkConstructibleChild( gobj ) {
          // if gobj qualifies as a constructible, mark it and its parents
          var ret = true,
              maxSortOrder = gobj.sortOrder || Infinity;
          
          function getSortOrder(gobj) {
            var val = gobj.sortOrder;
            return Number.isInteger(val) ? val : Infinity;
          }
          
          $.each(gobj.parents, function() {
            // the parent must be free and have a single child
            var parent = typeof( this[0] ) === 'string' ? tool.objects[ this[0] ] : this;
            // The parent must be free and not already a givenParent of some other child
            ret = parent.constraint === 'Free' && parent.toolRole === 'given';
            if (parent.toolRole === 'givenParent') {
              parent.toolRole = 'given';  // parent already has another child, so reset its role to 'given'
              // We leave that other child 'constructible'; we can't get to it easily b/c gobj and parent are specs.
              // If this turns out to be a problem, we can find such invalid 'constructibles' with another pass
              // at the end of checkGivens. 
            }
            return ret;
          });
          if (ret) { // make child constructible, mark parents 'givenParent', and set the sortOrder less than its parents
            gobj.toolRole = 'constructible';
            $.each(gobj.parents, function() {
              var parent = typeof( this[0] ) === 'string' ? tool.objects[ this[0] ] : this;
              parent.toolRole = 'givenParent';
              maxSortOrder = Math.min( maxSortOrder, getSortOrder(parent) );
            });
            gobj.sortOrder = maxSortOrder - 1; // Sorts the constructible reliably ahead of its parents.
          }
        }
        
        // body of checkGivens
        if (tool.objects) {
          $.each(tool.objects, function (id, gobj) {
            if (allGivenRoles.indexOf (gobj.toolRole) >=  0) {
              givensExist = true;
              return false; // break
            }
          });
          if (!givensExist) { // it's not a valid tool as is. Turn all free points and params into givens.
            // By labeling givens and constructibles, we provide (hopefully helpful) feedback about what went wrong.
            $.each(tool.objects, function (id, gobj) {
              if (gobj.constraint === 'Free') {
                gobj.toolRole = 'given'; // This role will be changed to givenParent if appropriate
              } else {
                checkConstructibleChild( gobj );
              }
            });
            setLabels();  // Expose the roles in the labels to show the user what's missing
          }
        }
      } // checkGivens
      // END PROPOSED NEW FEATURE: AUTO-DETECT GIVENS */
      
      /* PROPOSED NEW FEATURE: SIMPLIFY SPECIFYING TOOL HELP
       * Allow tool author to specify tool help strings on the page defining the tool
       * To specify Help strings for a tool, add a caption in the source GSP page.
       * The caption's first line must be
       * 'textInfo:' or 'textHint:' (case insensitive), followed by one or two additional lines.
       * The textInfo is a single line shown when hovering or focusing on the tool icon.
       * The textHint is two lines, providing help to the user when the tool is actively in use.
       * In practice, we allow both help strings to be specified in a single caption.
       *
       * TO DO: Add the textinfo text as the title attribute of the relevant tool element
       * When the Bars & Info tool is activated, get the texthint to display in the help bar.

      function checkToolHelp (mfs) {  // mfs is the parsed MFS. 'type' should be vertical, and 'value' should be an array of strings
        var key, arr, info;
        
        function getKey() { // Return the key value in the first array item, consuming that item
          var retKey = arr.shift ().value.toLowerCase().trim();
          if (retKey.endsWith(':')) {
            retKey = retKey.slice (0, -1).trim();
          }
          if (retKey === 'textinfo') {
            return 'textInfo';
          } else if (retKey === 'texthint') {
            return 'textHint';
          } else {
            console.log ('checkToolHelp found an incorrect help key: ' + retKey);
          }
        }
        
        if (mfs.type === 'vertical') {
          arr = mfs.value;
          key = getKey ();
          while (key && arr && arr.length) { // get the text for the current key, consuming that text
            if (key === 'textInfo') {
              tool.metadata[key] = arr.shift ().value;
            } else if (key === 'textHint') {
              info = arr.shift ().value;
              if (arr.length > 0) {
                info += '<br>' + arr.shift ().value;
              }
              tool.metadata[key] = info;
            }
            if (arr.length) {
              key = getKey ();
            }
          }
        }
      } // checkToolHelp
      // END PROPOSED NEW FEATURE: SIMPLIFY SPECIFYING TOOL HELP */
      
      // Body  of FixTool
/* checkGivens(); Uncomment this line once checkGivens() is activated */
      if (tool.objects) {
        $.each(tool.objects, function (id, gobj) {
          if (gobj.expression && gobj.expression === '1+1') { gobj.expression = ''; }
          if (gobj.toolRole === 'given' && gobj.label === 'delete') {
            deleteWithDescendants(id);
            return;
          }
          fixCaseButton(gobj);
          fixGobjFont(gobj);
          fixLabel(gobj);
          // If gobj.toolRole is set, the exporter has also set sortOrder, etc, and we don't have to find these in the label
          if (gobj.label && !gobj.toolRole) {
            fixToolLabel(gobj);
          } else if (gobj.toolRole === 'constructibleGiven') { // but we may still need to update the constructible signal
            gobj.toolRole = 'constructible';
          }
          if (gobj.toolRole === 'constructible') {
            $.each(gobj.parents, function() { // a constructible's parents need to be givenParents even if not so specified
              tool.objects[this].toolRole = 'givenParent';
            });
          }
          // GSP doesn't support glide reflection, so WSP support originally depended on recognizing
          // the tool name matching the regex /glide\xA0reflect/i. The non-breaking space is used
          // to avoid accidental activation f the "feature". This is now deprecated in favor of
          // a more reliable and flexible system that uses 'GlideReflect:' at the beginning of
          // the label, and works for both tools and sketches. 
          if (glideReflect && gobj.constraint === 'Reflect') {
            makeGlideReflection(gobj);  // This was a stop-gap method based on the tool name, and is now deprecated.
          }
          if (gobj.toolRole === 'constructible' && gobj.constraint === 'PolygonFromPoints') {
            GSP.gConstraints.PolygonFromPoints.standardizeTool(tool, gobj);
          }
/* Uncomment these lines once checkToolHelp() is activated
          if (gobj.kind === 'Text' && gobj.genus === 'Caption' && gobj.constraint === 'Free') {
            checkToolHelp (GSP.mfsParser.parse(gobj.textMFS));
          }
*/
        });
      }
    }  // fixTool

    // body of fixSketch
    $('.button_area').each( function() { // The button_area class is deprecated; fix legacy sketches
      $(this).addClass('wsp-button-bar').removeClass('button_area');
      $(this).parent().addClass(versionCSS);  // Add the version class to the sketch_container 
    });
    if (!options) {
      options = {all: true};
    }
    if( data.pages ) {
      for (pageIndex = 0; pageIndex < data.pages.length; pageIndex++){
        pageSpec = data.pages[pageIndex];
        // Use a numeric pageId if it's not already specified
        pageId = GSP._get(pageSpec, 'metadata.id') ||
                 GSP._put(pageSpec, 'metadata.id', String(pageIndex+1));
        pageArr.push(pageId);
      }
    }
    if (!data.metadata.authorPreferences) {
      data.metadata.authorPreferences = {};
    }
    if (!GSP._get( data, 'resources.fontList' )) {
      GSP._put( data, 'resources.fontList', defaultList );
    } else {
      fontList = data.resources.fontList;
      for (i = 0; i < fontList.length; ++i) {
        fontList[i] = fixTimesFont(fontList[i]);
      }
    }
    if (v49orEarlier) { // In versions > 4.9, the exporter has already made these fixes
      if (data.pages && (options.all || options.pages)) { // fix the doc
        $.each(data.pages, function (key, value) {
          fixPage(value);
        });
      }
      if (data.tools && (options.all || options.tools)) { // fix the tools
        $.each(data.tools, function (key, value) {
          fixTool(value);
        });
      }
    }
  }; // GSP.fixSketch
  
  /* Though fixAuthorPrefs fits logically alongside GSP.fixSketch, it can't be called
   * until after the sketchDoc is instantiated. So it's called from document.initModel().
   * Might it be cleaner to make authorPreferenceSpecs available in the GSP namespace?
   * Then we could fix the sketch and the authorPrefs at the same time.
   */
  GSP.fixAuthorPrefs = function( sketchDoc ) {
    // Fix the names and values of the sketch's author prefs
    // Names are all lowercase with no spaces, and values
    // If sketchDoc isn't fully instantiated, use sketchDoc.docSpec to fix prefs and create the pageArr
    var widgetArr,
        pageNumById = {}, // key is a page id; value is 1-based page number (subtract 1 for index into docSpec.pages)
        docSpec = sketchDoc.docSpec, 
        metadata = docSpec.metadata,
        prefs = metadata.authorPreferences;

    function populatePageNumById() {     // pageNumById can't be populated until the doc is instantiated
      // For each page, check its id
      var pages = docSpec.pages,
          ix, iy, id, newId;
      pageNumById = {};
      for (ix = 0; ix < pages.length; ix++) {
        id = pages[ix].metadata.id;
        if (pageNumById[id]) { // Does this page's id duplicate an earlier id?
          console.log ('populatePageNumById() found a duplicated page id: ' + id);
          // Generate a unique id, appending underscore followed by an index.
          // If id = '1', try '1_1', '1_2', etc until a unique id is found.
          iy = 1;
          while (iy > 0) {
            newId = id + '_' + iy;
            if (pageNumById[newId]) {
              iy++;
            } else { 
              iy = 0; // newId is unique,so stop searching
              console.log ('Duplicate id changed from ' + id + ' to ' + newId + '. Tool and Widget prefs removed.');
              id = newId;
              pages[ix].metadata.id = id; // record the changed id
            }
          } // while iy
        }
        pageNumById[id] = String(ix + 1);
      } // for ix
    } // populatePageNumById
      
    // Fix a tool or widget pref (ie. prefs that apply to an array of page ids.
    function fixPageArrayPref (prefName) {
      var prefArr = prefs[prefName],
          prefSpec = sketchDoc.prefSpecFromName (prefName),
          valid = prefSpec.type.name === 'PageArray';
      if (!valid) {
        console.log('Invalid pref for ' + prefName);
      }
      saveOnePref (prefName, prefArr);
/*
      if (!prefArr) { // no array, so use the default
        prefArr = prefSpec.defaultValue;
      } else {
        console.log ('Need to check the existing value');
      }

      
      // widget prefs and tool prefs both use an array of pageId's to identify the pages for which they're enabled.
      var toolNames = [], toolPrefs = {},
          tools = docSpec.tools;
      if (tools) {
        tools.forEach( function(tool) {
          // pref names use lowercase, no spaces, and end with 'tool'
          toolNames.push (tool.metadata.name.toLowerCase().replace(/\s+/g, '') + 'tool');
        });
      }
      $.each (prefs, function (name, val) {
        if (name.match(/tool$/)) {
          toolPrefs[name] = val;
        }
      });
      toolNames.forEach( function(name) {
        if (!toolPrefs[name]) { // no pref for this tool name, so make it ['all']
          console.log ('Enabling ' + name + ' pref for all pages.');
          prefs[name] = ['all'];
        }
      });
      $.each( toolPrefs, function (name) {
        if (toolNames.indexOf (name) < 0) {
          console.log ('Removing existing pref for missing ' + name);
          delete prefs[name];
        }
      });
      */
      
    } // fixPageArrayPref

    function saveOnePref( oldKey, oldVal ) {
      // Here we check the key and value, making sure that all pages referred to in a PageArray actually exist,
      // and also standardizing pref keys to be lowercase w/o spaces. We also change a PaeArrayPref
      // to ['all'] or ['none'] when appropriate, before saving the new pref.
      var newKey = oldKey.toLowerCase().replace(/\s/g, ''),
          prefSpec, isToolPref, pages,
          newVal; // the new value (if changed, either boolean or a verified array of page id's)
      if (newKey !== oldKey) {
        prefs[newKey] = oldVal;
        delete prefs[oldKey];
      }
      isToolPref = newKey.match (/tool$/);
      // Even if not fully instantiated, use sketchDoc to access prefSpecFromName()
      prefSpec = sketchDoc.prefSpecFromName(isToolPref ? 'tool' : newKey);
      // Make sure prefSpec exists; for instance, 'widgets' might be an authorPref, but only individual widgets have prefSpecs
      if (!prefSpec) {
        if (newKey === 'disablescrolling') {
          newKey = 'enablescrolling';
          console.log('updating disablescrolling pref to enablescrolling');
          prefs[newKey] = oldVal ? ['none'] : ['all'];
          delete prefs[oldKey];
          return;
        }
        console.log('author pref does not exist: ' + newKey + ': ', oldVal);
        return;
      }
      newVal = (oldVal === undefined) ? prefSpec.defaultValue : oldVal; 
      if (!prefSpec.type.parse) {
        console.log('prefSpec parser is missing: ' + newKey + ': ', newVal);
      } else {
        pages = docSpec.pages;
        // Need to modify oldVal only for PageArray prefs. But there's some confusion about PageArray prefs,
        // which may arrive here as a single comma-delimited string of page id's or as an array of strings,
        // each containing a page id.
        // They should exit as arrays of strings each of which is a page id.
        if (prefSpec.type.name === 'PageArray' && newVal[0] !== 'all' && newVal[0] !== 'none') {
          if (typeof newVal === String) {
            newVal = newVal[0].split(',');
          }
          // newVal is now an array of page Id's; Use a reverse for loop to remove non-existent id's.
          for (var ix = newVal.length - 1; ix >= 0; ix--) {
            if (!pageNumById [newVal[ix]]) {
              newVal.slice(ix, 1);
            }
          }
          if (docSpec.pages.length === newVal.length) { //check for special cases
            newVal = ['all'];
          } else if (!newVal.length) {
            newVal = ['none'];
          }
        }
        prefs[newKey] = newVal;
      }
      return newVal;
    } // saveOnePref
        

    // body of fixAuthorPrefs
    if (Object.keys(pageNumById).length === 0) {
      populatePageNumById();
    }
    widgetArr = WIDGETS.getWidgets();
    if (docSpec.tools) {
      docSpec.tools.forEach (function (val) {
        var strippedName = val.metadata.name.replace(/ /g, '').toLowerCase() + 'tool';
        fixPageArrayPref (strippedName);
      });
    }
    widgetArr.forEach( function (widget) {
      fixPageArrayPref ((widget.name + 'widget').toLowerCase());
    });
    if (prefs) {
      $.each( prefs, function (key, value) {
        // if (!key.match(/tool$|widget$/)) {
        saveOnePref (key, value); // One more sanity check (removes non-existent pages)
        // }
      });
    }
    // fixToolPrefs(sketchDoc);
  }; // GSP.fixAuthorPrefs

})();

(function ($) {
  var GSPConfig = window.GSPConfig;
  var useIntObserver = typeof IntersectionObserver !== 'undefined';

  function getVersion (gspInstance, field) {
    return parseInt(gspInstance.version[field], 10);
  }

  // Returns the latest instance whose major version matches the given
  // sketch json data.
  function doGetGSPInstance (majorJSON) {
    var i,
      instances,
      instance;

    function sortInstances () {
      instances.sort(function (a, b) {
        function cmp (field) {
          return getVersion(b, field) - getVersion(a, field);
        }
        return cmp('major') || cmp('minor') || cmp('patch');
      });
    }

    if (typeof GSPConfig === 'object' &&
        GSPConfig.instances &&
        GSPConfig.instances.length > 0 &&
        majorJSON) {
      instances = GSPConfig.instances;
      sortInstances();
      for (i = 0; i < instances.length; i++) {
        instance = instances[i];
        if (instance.version.major === majorJSON) {
          return instance;
        }
      }
    }
    return null;
  }

  function getGSPInstance (data) {
    var majorJSON;
    GSP.fixSketch(data);  // Support legacy sketches and standardize tool handling
    majorJSON = data && data.metadata && data.metadata['wsp-version'] &&
      data.metadata['wsp-version'].split('.')[0];
    var deferred = $.Deferred();
    var gspInstance = doGetGSPInstance(majorJSON);
    var pathFunc, path;

    function lastTry () { deferred.resolve(doGetGSPInstance(majorJSON) || window.GSP); }

    // If we've got a GSP that works, we're done.
    
    // Once the doc is available, call GSP.fixAuthorPrefs!!
    
    if (gspInstance) {
      deferred.resolve(gspInstance);
    } else { // Otherwise, try and find one.
      pathFunc = GSP.getConfigValue('compatibilityVersionPath');
      path = pathFunc(majorJSON);
      $.ajax({
        url: path,
        dataType: 'script',
        cache: true
      }).always(lastTry);
    }

    return deferred.promise();
  }

  /*
   * Informs the user of a same origin policy violation from loading
   * a json file from a page loaded from the local filesystem.
   *
   * If a jquery or dom element is provided, its contents are replaced
   * with the error message. Otherwise, normal logging is used.
   */
  function sendSameOriginQuirkMsg (el) {
    var msg =
        'Your sketch cannot be loaded. This may be because you are using\n' +
        'the local file system and your browser\'s security policy\n' +
        'does not allow loading local files. To remedy this issue you can:\n' +
        '(a) export your sketch in script form rather than JSON form, or\n' +
        '(b) access your page through a web server.';
    if (el) {
      $(el).html('<pre class="wsp-error">' + msg + '</pre>');
    } else {
      GSP.signalErrorWithMessage(msg);
    }
  }

  function sendWrongFormatMsg (el, url) {
    var msg =
        'Your sketch (' + url + ') cannot be loaded.\n' +
        'If this sketch is in javascript form, it should be loaded\n' +
        'with data-var rather than data-url.\n' +
        'If it is actually in json form, its extension\n' +
        'should be ".json" rather than ".js".';
    if (el) {
      $(el).html('<pre class="wsp-error">' + msg + '</pre>');
    } else {
      GSP.signalErrorWithMessage(msg);
    }
  }
  
  // DELETE THIS FUNCTION AND THE CALL ONCE SAVE-TRACES JSON TEST FILES ARE REMOVED
  // early save-traces dev code stored traces as pageTraces.data in the spec; now they are simply page.traces.
  // Such test files are confined to the development machine and should not have escaped to the wild.
  function regularizeTraceStorage (data) {
    data.pages.forEach (function (page) {
      if (page.pageTraces) {
        page.traces = page.pageTraces.data;
        delete page.pageTraces;
      }
    });
    return data;
  } // regularizeTraceStorage
  //END OF BLOCK TO DELETE
  
  function createDocumentFromJSONData (gspInstance, data, $target, options) {
    var sketch,
      isVersion4_2_1;

    // HACK ALERT! SS: I'm having trouble building GSPUnix properly and need to fix the version number,
    // which comes through as "Local Developer Build Number"
    if (data.metadata['wsp-build-number'] === 'Local Developer Build Number') {
      data.metadata['wsp-build-number'] = '4';
      data.metadata['wsp-build-stamp'] = 'stek';
      data.metadata['wsp-version'] = '4.8.0';
    }

          
    // The now deprecated applyDocumentDiff was present in 3.0+,
    // and removed in the version AFTER 4.2.1.  (see
    // wsp-test/two-diffs.html). So 4.2.1 is the only modern
    // release with both GSP.applyDocumentDiff and
    // document.applydocumentDelta.
    if (options.delta) {
      if (gspInstance.applyDocumentDiff) {
        isVersion4_2_1 =
              getVersion(gspInstance, 'major') === 4 &&
              getVersion(gspInstance, 'minor') === 2 &&
              getVersion(gspInstance, 'patch') === 1;
        if (!isVersion4_2_1) {
          // We are somewhere between 3.0.0 and 4.2.0. Although the two-diffs
          // bug will trigger on the second diff, at least they get
          // one good diff!
          gspInstance.applyDocumentDiff(data, JSON.parse(options.delta));
        }
        // else see below -- we apply the delta AFTER
        // construction, as the Document constructor did not
        // accept the documentDelta option at that time.
      } else {
        // We are at a version after 4.2.1. Just pass the delta to the constructor.
        options.sketchOptions = options.sketchOptions || {};
        options.sketchOptions.documentDelta = options.delta;
      }
    }

    data = regularizeTraceStorage(data); // DELETE THIS CALL ONCE SAVE-TRACES JSON TEST FILES ARE REMOVED
    
    // Note: there was once a time when Document constructor would return a sketch
    // This is no longer the case, but since here we may be running an old version of WSP,
    // we must continue to handle that case.
    var Document = gspInstance.Document;
    var docOrSketch = new Document($target, data, options.sketchOptions);
    sketch = docOrSketch.focusPage || docOrSketch;

    //  The new document is now attached to the node in the new Document() call abvove,
    //  so that it's already there when before firing the LoadDocument, LoadPage, and DidChangeCurrentPage events.
    // $target.data(isSketch? "sketch" : "document", docOrSketch);

    if (docOrSketch.start) { docOrSketch.start(); } else if (docOrSketch.startCurrentFocusedSketch) {
      docOrSketch.startCurrentFocusedSketch();
    }

    // Special case for doc delta in version 4.2.1 -- see above
    if (options.delta && isVersion4_2_1) {
      docOrSketch.applyDocumentDelta(options.delta);
    }

    if (!options.autoStart) {
      sketch.pause();
    }

    if (options.onReady) {
      options.onReady.call($target, sketch, data.metadata);
    }
  }
  /*
   * Loads and runs a sketch.
   * @param {string | object} sketchSpec The sketch. If is a string,
   *        it is assumed to be a a json object, and it is parsed into an
   *        object. If it is an object, it is assumed to be a sketch object.
   * @param {string} sketchURL The name of the source of the sketch. Used for
   *        logging only.
   * @param {JQuery Object} $target Identifies the DOM location that will be
   *        replaced by the sketch.
   * @param {object} options The following properties are supported:
   *
   *        onLoad: a function to call after the sketch has been loaded, but
   *                before it has been started. Arguments: $target,
   *                sketch metadata
   *        autoStart: we always start the sketch. This boolean controls whether
   *                or not we immediately pause.
   *        onReady: a function to call after the sketch has been started. Same
   *                arguments as above.
   *        onError: a function to call in the event of error. Arguments:
   *                target element.
   *        sketchOptions: an object that is passed to the Sketch constructor.
   *        delta: a delta generated by SQuery.getSketchDelta() that is to be
   *                applied to the sketch immediately after loading.
   */
  function loadSketch (sketchSpec, $target, options) {
    var data;

    if (typeof sketchSpec === 'string') {
      try {
        data = $.parseJSON(sketchSpec);
      } catch (e) {
        if (options.onError) {
          options.onError.call($target, sketchSpec);
        }
        e.message = 'Load failed: malformed JSON text: ' + e.message;

        GSP.signalCaughtError(e);
        return;
      }
    } else if (typeof sketchSpec === 'object') {
      data = sketchSpec;
    } else {
      if (options.onError) {
        options.onError.call($target, sketchSpec);
      }
      GSP.signalErrorWithMessage('Load failed: unrecognized sketch datatype.');
      return;
    }
    if (options.onLoad) {
      options.onLoad.call($target, data.metadata);
    }

    try {
      getGSPInstance(data).then(function (gspInstance) {
        createDocumentFromJSONData(gspInstance, data, $target, options);
        if (options.varName) {
          $target.data('var', options.varName);
        }
        if (options.url) {
          $target.data('url', options.url);
        }
        GSP.log('Loaded Sketch: ' + options.url || options.varName);
      });
    } catch (e) {
      e.message = 'Load failed: Exception thrown in startup: ' + e.message;
      GSP.signalCaughtError(e);
    }
  }

  function loadFromScriptUrl ($target, options) {
    GSP.log('loadFromScriptUrl: ' + options.url);
    var script = document.createElement('script');
    script.src = options.url;
    options.target = $target;
    script.sketchOptions = options;
    script.onload = function () {
      // At this point, window[options.varName] is the variable containing the sketch.
      var options = this.sketchOptions;
      loadSketch(window[options.varName], options.target, options);
    };
    document.body.append(script);
  }
  
/* Possible replacement for isVisible(), per
 * https://stackoverflow.com/questions/487073/how-to-check-if-element-is-visible-after-scrolling
 * 
  function isInView($target) { // Check whether the target is within the visible area
    var viewTop = $(window).scrollTop();
    var viewBottom = viewTop + $(window).height();

    var elTop = $target.offset().top;
    var elBottom = elTop + $target.height();

    return ((elBottom <= viewBottom) && (elTop >= viewTop));
  }
*/

  function isVisible ($target) {
    var el = $target[0],
        parent = el.offsetParent,
        rect, vWidth, vHeight;
    // We were getting false returns here for sketches within the viewport that need to be loaded,
    // so now we check the offsetParent (if there is one) instead of the sketch_canvas itself.
    if (!parent || !(parent.offsetWidth > 0 || parent.offsetHeight > 0)) {
      return false;
    }
    rect = el.getBoundingClientRect();
    vWidth = window.innerWidth || document.documentElement.clientWidth;
    vHeight = window.innerHeight || document.documentElement.clientHeight;
    return rect.right >= 0 && rect.bottom >= 0 && rect.left <= vWidth && rect.top <= vHeight;
  }

  function loadFromJsonUrl ($target, options) {
    var url = options.url;
    GSP.log('Loading Sketch: ' + url);
    $.ajax({
      url: options.url,
      success: function (text) {
        if (text) {
          // Need to check visibility again, just in case the sketch_canvas has been hidden
          // With multiple threads, perhaps loadSketch should check this and return true or false.
          if (isVisible($target)) { // If sketch_canvas is still visible, load it.
            loadSketch(text, $target, options);
          } else { // if sketch_canvas has been hidden, delay it.
            GSP.log('Load delayed: visibility changed for ' + url + '.');
            delayLoadFromUrl($target, options);
          }
        } else {
          GSP.log("Load failed: '%@' is empty", url);
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        if (options.onError) {
          options.onError.call($target, url);
        }
        GSP.log('Load failed: ' + textStatus +
                ' Error: ' + errorThrown.toString());
        // Provide warning in case of local file access and same-origin
        // error. This is a bit ad hoc, since the jqXHR record does not
        // provide sufficient info to diagnose.
        if (url.endsWith('.js')) {
          sendWrongFormatMsg($target, url);
        } else {
          sendSameOriginQuirkMsg($target);
        }
      },
      dataType: 'text'
    });
  }

  function loadNowFromUrl ($target, options) {
    if (options.loadFromScript) {
      loadFromScriptUrl($target, options);
    } else {
      loadFromJsonUrl($target, options);
    }
  }

  function delayLoadFromUrl ($target, options) {
    var url = options.url;
    var optKey = $target.data('url') || $target.data('var');
    if ($target[0].innerHTML === '') { // If the sketch_canvas has no content, it will never be visible, so add some content.
      $target[0].innerHTML = 'Loading...';
    }
    GSP.log('Delaying load of hidden sketch: ' + url);
    /* jshint ignore:start */
    if (!fetchFromAttr.observer) {
      fetchFromAttr.observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var $target = $(entry.target);
          var key = $target.data('url') || $target.data('var');
          var options = fetchFromAttr.optionsList[key];
          if (entry.isIntersecting && isVisible($target)) {
            loadNowFromUrl($target, options);
            fetchFromAttr.observer.unobserve(entry.target);
            // If not for the chance that two sketches might use the same json,
            // we could delete fetchFromAttr.optionsList[key];
            // As it is, we ignore the possibility of two sketches, same json, but different options
          }
        });
      });
    }
    /* jshint ignore:end */
    fetchFromAttr.observer.observe($target[0]);
    fetchFromAttr.optionsList[optKey] = options;
  }

  function loadFromUrl ($target, options) {
    // If $target isn't visible, there are problems with sizing the sketch elements,
    // so use IntersectionObserver if it's available.
    // TO DO: figure out how to fix loading a sketch into a hidden element.
    // Even if those bugs are fixed, code should continue using IntersectionObserver,
    // because it allows big pages with hidden sketches to load faster.
    // We don't delay loading the hint_progress sketch because it causes some timing
    // issues if we delay loading until it's supposed to start.
    if (isVisible($target) || !useIntObserver || options.varName === 'hint_progress') {
      loadNowFromUrl($target, options);
    } else { // $target is hidden, so create an IntersectionObserver
      delayLoadFromUrl($target, options);
    }
  }

  var fetchFromAttr = {
    observer: null, // The observer tells us when it's safe to load an originally-hidden sketch.
    optionsList: {}, // store the options of each delayed-load sketch, keyed by url (for .json) or var (for .js)
    /*
   * Fetches a requested sketch object from a URL and loads it.
   * @param {string|Object} sketch The JSON of a sketch document, as a string or JSON object.
   * @param {JQuery Object} $target Identifies the DOM location that will be
   *        replaced by the sketch.
   */
    'sourceDocument': function (sourceDocument, $target, options) {
      GSP.log('sourceDocument Sketch from JSON document.');
      loadSketch(sourceDocument, $target, options);
    },
    /*
   * Fetches a requested sketch object from a URL and loads it.
   * @param {string} sketchURL The URL of a JSON sketch document.
   * @param {JQuery Object} $target Identifies the DOM location that will be
   *        replaced by the sketch.
   */
    'url': function (sketchUrl, $target, options) {
      // If $target isn't visible, there are problems with sizing the sketch elements,
      // so use IntersectionObserver if it's available.
      // TO DO: figure out how to fix loading a sketch into a hidden element.
      // Even if those bugs are fixed, code should continue using IntersectionObserver,
      // because it allows big pages with hidden sketches to load faster.
      options.url = sketchUrl;
      if (isVisible($target) || !useIntObserver) {
        loadFromUrl($target, options);
      } else { // $target is hidden, so create an IntersectionObserver
        delayLoadFromUrl($target, options);
      }
    },

    /*
     * Fetches a requested sketch object from a DOM element and loads it.
     * @param {string} id The DOM id of a DOM element. The text of the
     *        element should be a sketch document.
     * @param {JQuery Object} $target Identifies the DOM location that will be
     *        replaced by the sketch.
     */
    'id': function (id, $target, options) {
      loadSketch($('#' + id).html(), $target, options);
    },
    /*
     * Fetches a requested sketch object from a javascript variable and
     * loads it.
     * @param {string} myVar A variable in the global namespace of a sketch
     *        document. The text of the value should be a sketch document.
     * @param {JQuery Object} $target Identifies the DOM location that will be
     *        replaced by the sketch.
     */
    'var': function (myVar, $target, options) {
      var url;
      if (typeof window[myVar] !== 'undefined') {
        options.varName = myVar;
        loadSketch(window[myVar], $target, options);
        // We could delete window[myVar] now that it's been loaded
        // Instead we leave it in case the user wants to load it into two sketch_canvas elements
      } else { // myVar is undefined in global namespace, so try to load it from a js file...
        options = options || {};
        options.loadFromScript = true;
        // myVar should be the legal filename of the sketch, possibly preceded by a path.
        url = myVar;
        if (url.endsWith('.js')) { // If url has a suffix, remove it from the variable
          myVar = myVar.replace('-json', '').replace('.js', '');
        } else {
          url = myVar + '-json.js'; // otherwise append -json.js to the url.
        }
        // Strip from from myVar any leading pathname or illegal chars for a variable
        options.varName = GSP.normalizeSketchName(myVar);
        options.url = url;
        // Now data-var="some-sketch.js" has generated the variable name "some_sketch_js"
        loadFromUrl($target, options);
      }
    },
    /*
     * Fetches a requested sketch object from another sketch on the same page
     * and loads it.
     * @param {string} cloneId The DOM id of a DOM element containing a Sketchpad document.
     * @param {JQuery Object} $target Identifies the DOM location that will be
     *        replaced by the sketch.
     */
    'clone': function (cloneId, $target, options) {
      var docOrSketch = $('#' + cloneId).data('document') ||
              $('#' + cloneId).data('sketch');
      docOrSketch = docOrSketch.sQuery().toString();
      loadSketch(docOrSketch, 'clone', $target, options);
    },
    /*
     * Fetches a requested sketch object from a promise and loads it.
     * @param {Object} promise A jquery deferred or promise object.
     * @param {JQuery Object} $target Identifies the DOM location that will be
     *        replaced by the sketch.
     */
    'promise': function (promise, $target, options) {
      promise.done(function (resolved) {
        loadSketch(resolved, 'promise', $target, options);
      }).fail(function (failVal) {
        if (options.onError) {
          options.onError.call($target, failVal);
        }
      });
    }

  };

  function fetchSketchFromAttrs (attrElement, sketchElement, options) {
    $.each(fetchFromAttr, function (i, f) {
      var attr = options['data-' + i] || attrElement.data(i);
      if (attr) {
        f(attr, sketchElement, options);
        return false; // In case there are multiple matches, prefer the first. (It might be better to prefer the first one that succeeds, but these functions don't return a value to indicate success or failure.)
      }
    });
  }

  /**
   * WSP provides a jQuery plugin interface to the WSP library.
   * @param {String}  method - the method to call
   * @param {Object}  options - arguments passed to the specified method
   */
  $.fn.WSP = function (method, options) {
    var config = {
    };

    if (options) {
      $.extend(config, options);
    }

    var methods = {
      init: function (/*options*/) {
      },

      /**
       *  Load the sketch into the DOM element.
       *
       *  @param {object} options A set of (optional) configuration options:
       *    autostart {boolean}: Start the sketch after load (default true)
       *                          We might move this to sketchOptions, and have
       *                          the document start itself.
       *    sketchOptions {object}: Various document behavior options, passed
       *                            to the document constructor.
       *    onLoad {function}: called after successful load.
       *                        this is the element, metadata is the argument.
       *                        (default sets element width, height)
       *    onReady {function}: called when the loaded sketch is ready
       *    onError {function}: called if an error occurs during the load process
       *    data-url {string}: if set, an ajax call will be issued to load the sketch
       *                        from the specified URL.
       *    delta {string}: JSON delta object generated by getSketchDelta() method.
       */
      loadSketch: function (options) {
        return this.each(function () {
          var $this = $(this);
          var config = {
            autoStart: true
          };

          var docOrSketch = $this.data('document') || $this.data('sketch');
          if (docOrSketch) {
            if (docOrSketch.stop) docOrSketch.stop();
            else if (docOrSketch.stopCurrentFocusedSketch) {
              docOrSketch.stopCurrentFocusedSketch();
            }
            $this.removeData('document');
            $this.removeData('sketch');
          }
          if (options) {
            $.extend(config, options);
          }

          fetchSketchFromAttrs($this, $this, config);
        });
      }
    };

    // Method calling logic
    if (methods[method]) {
      return methods[method].apply(this,
        Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    } else {
      $.error('Method ' + method + ' does not exist on jQuery.WSP');
    }
  };
}(jQuery));

jQuery(document).ready(function ($) {
  // look for elements of the class "sketch_canvas", find an attribute that
  // specifies how to instantiate the element, and process accordingly.
  $('.sketch_canvas').WSP('loadSketch');
});
(function () {
  var method;
  var noop = function noop () {};
  var methods = [
    'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
    'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
    'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
    'timeStamp', 'trace', 'warn'
  ];
  var length = methods.length;
  var console = (window.console = window.console || {});

  while (length--) {
    method = methods[length];

    // Only stub undefined methods.
    if (!console[method]) {
      console[method] = noop;
    }
  }
}());
