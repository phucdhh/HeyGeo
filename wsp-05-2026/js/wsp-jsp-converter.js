/*!
  JavaSketchpad to Web Sketchpad converter. Copyright &copy; 2019 KCP Technologies, a McGraw-Hill Education Company. All rights reserved. 
  Version: Release: 2020Q3, semantic Version: 4.8.0, Build Number: 1085, Build Stamp: stek-MBP-2.fios-router.home/20240911151448
*/

/**
 * This is a javascript funtion to convert Java sketchpad
 * documents to Web Sketchpad documents.
 *
 * Java sketchpad is an applet. Desktop sketchpad can export to java sketchpad,
 * but wraps the sketch document in an HTML page. This program assumes the
 * html page has been stripped away leaving only the document.
 */
// This function may be already defined, so we don't redefine. You
// see, this entire file is inserted into wsp-jsp-converter to reduce
// the number of scripts shim users have to include. However, existing
// shim installs already include this file explicitly.
GSP.parseJavaSP = GSP.parseJavaSP || function parseJavaSP(jskDoc, params, debugging) {
    /**
     * Translates optionalFormat keywords to wsk JSON style clauses.
     */
    var attributeSubstitutions = {
        // named color formats
        red: {color: "red"},
        green: {color: "green"},
        blue: {color: "blue"},
        black: {color: "black"},
        magenta: {color: "magenta"},
        cyan: {color: "cyan"},
        yellow: {color: "yellow"},
        white: {color: "white"},
        // line style formats
        hairline: {width: 1},
        thin: {width: 1},
        mediumLine: {width: 2},
        thick: {width: 3},
        dotted: {"line-style": "dotted"},
        dashed: {"line-style": "dashed"},
        solid: {"line-style": "solid"},
        // point style formats
        dot: {radius: 1},
        small: {radius: 2},
        mediumPoint: {radius: 3.5},
        large: {radius: 5},
        // visibility formats
        hidden: {hidden: true},
        // auto-start formats
        auto: {autostart: true},
        // traced formats
        traced: {traced: true},
        // text formats
        bold: {"font-weight": "bold"},
        italic: {"font-style": "italic"},
        plain: {},
        justifyLeft: {"text-align": "left"},
        justifyRight: {"text-align": "right"},
        justifyCenter: {"text-align": "center"}
    };

    function unescapeText(s) {
        return s.replace(/&apos;/g, "'");
    }

    /*
     * Reads rpn notation and emits an infix algebraic expression.
     *
     * Works as follows:
     *   (a) read tokens left to right, as x.
     *   (b1) number: push(x)
     *   (b2) binary operator: pop(b), pop(a), push ('(' + a + x + b + ')')
     *   (b3) unary operator: pop(a), push('(' + x + a + ')')
     *   (b4) ref: push('@' + x)
     *   (b5) vector ref: push('@' + x[0] + x[1].map)
     *   (b6) sys unary function: pop(a), push( x.map + '(' + a + ')' )
     *   (b7) custom function: pop(a), push('@x' + '(' + a + ')' )
     * so:
     * 'AB+C+' causes: s.push('@A);s.push('@B);b=s.pop();a=s.pop();push('(@A+@B)');
     *                 s.push('@C'); b=s.pop();a=s.pop();s.push('((@A+@B)+@C)');
     *  (c) pop the stack to read the exception
     */
    function rpn2infix(rpn, objArray) {
        function getToken(rpn) {
            var REGEXPS = {
                    bop: /^[+*\/\^\-]/,
                    num: /^(-?([0-9]+\.[0-9]*|[1-9][0-9]*|\.[0-9]+ )|0) ?/,
                    uop: /^!/,
                    ref: /^[A-Z]/,
                    vref: /^#[A-Z][0-9]/,
                    sfn: /^@(sin_|cos_|tan_|abs_|sqrt|ln__|rond|trnc|sgn_|asin|acos|atan|log_)/,
                    cfn: /^@f[A-Z]/,
                    var1: /^x/,
                    white: / /
                },
                t, key;
            for (key in REGEXPS) {
                if (REGEXPS.hasOwnProperty(key)) {
                    t = REGEXPS[key].exec(rpn);
                    if (t) {
                        return {type: key, val: t[0], rpn: rpn.substring(t[0].length)};
                    }
                }
            }
        }
        var VMAP ={'1': 'x', '2': 'y'},
            FMAP = {
                    '@sin_': 'sin',
                    '@cos_': 'cos',
                    '@tan_': 'tan',
                    '@abs_': 'abs',
                    '@sqrt': 'sqrt',
                    '@ln__': 'ln',
                    '@rond': 'round',
                    '@trnc': 'trunc',
                    '@sgn_': 'sgn',
                    '@asin': 'asin',
                    '@acos': 'acos',
                    '@atan': 'atan',
                    '@log_': 'log'
            },
            infix = '',
            tok = {rpn: rpn},
            st = [],
            a,
            b,
            parentIndex;
        while (true)  {
            tok = getToken(tok.rpn);
            if (!tok) {
                break;
            }
            if (tok.type === 'num') {
                st.push(tok.val.trim());
            } else if (tok.type === 'bop') {
                b = st.pop();
                a = st.pop();
                st.push('(' + a + tok.val + b + ')');
            } else if (tok.type === 'uop') {
                a = st.pop();
                st.push('(-' + a + ')');
            } else if (tok.type === 'ref') {
                parentIndex = tok.val.charCodeAt(0)-'A'.charCodeAt(0);
                st.push('@' + parentIndex);
            } else if (tok.type === 'vref') {
                st.push('@' + tok.val[1] + '.' + VMAP[tok.val[2]] );
            } else if (tok.type === 'sfn') {
                a = st.pop();
                st.push(FMAP[tok.val] + '(' + a + ')');
            } else if (tok.type === 'cfn') {
                a = st.pop();
                parentIndex = tok.val[2].charCodeAt(0)-'A'.charCodeAt(0);
                st.push('@' + parentIndex + '(' + a + ')');
            } else if (tok.type === 'var1') {
                st.push(tok.val);
            }
        }
        infix = st.pop();
        return infix;
    }



    var countCNI = 0;
    function sourceGenus(jsk, basis, wspSketch) {
        var source = wspSketch.objects[basis.parents.source];
        if (source) {
            // Axes transform as lines
            if( source.genus === 'Axis') {
                basis.genus = 'Line';
            } else {
                basis.genus = source.genus;
            }
        }
        else {
            GSP.log("Could not set transformation genus: " + basis.id);
        }
        switch (basis.kind) {
          case "Polygon":
          case "CircleInterior":
          basis.style.opacity = 1;
        }
        return basis;
    }
    function capabilityNotImplementedBuilder(jsk, basis) {
        countCNI += 1;
/*
        if (!basis.initgeom) { basis.initgeom = {}; }
        basis.initgeom.x = -300;
        basis.initgeom.y =  20 * countCNI;
        basis.text = "Cannot render: " + jsk.id + "(" + jsk.type + ")";
        basis.description = "capabilityNotImplemented";//JSON.stringify(jsk);
*/
        return basis;
    }
    var capabilityNotImplementedTemplate = {
        kind: "UnknownKind",
        constraint: "UnknownConstraint"
    };
    function unescapeString02(jskObject) {
        return unescapeText(jskObject.argGroups[0][2]);
    }
    function unescapeString03(jskObject) {
        return unescapeText(jskObject.argGroups[0][3]);
    }
    function unescapeString04(jskObject) {
        return unescapeText(jskObject.argGroups[0][4]);
    }
    function unescapeString05(jskObject) {
        return unescapeText(jskObject.argGroups[0][5]);
    }
    function jskArray0(jskObject) {
        var points = jskObject.argGroups[0], obj = {}, ix;
        for (ix = 0; ix < points.length; ix += 1) {
            obj[ix] = points[ix];
        }
        return obj;
    }
    function jskArray1(jskObject) {
        var points = jskObject.argGroups[1], 
            obj = {},
            ix;
        if (points) {
            for (ix = 0; ix < points.length; ix += 1) {
                obj[ix] = points[ix];
            }
        }
        return obj;
    }
    function jskString00(jskObject) {
        return jskObject.argGroups[0][0];
    }
    function jskString01(jskObject) {
        return jskObject.argGroups[0][1];
    }
    function jskString02(jskObject) {
        return jskObject.argGroups[0][2];
    }
    function jskString03(jskObject) {
        return jskObject.argGroups[0][3];
    }
    function jskString04(jskObject) {
        return jskObject.argGroups[0][4];
    }
    /*
    function jskString05(jskObject) {
        return jskObject.argGroups[0][5];
    }
    */
    function jskNum00(jskObject) {
        return Number(jskObject.argGroups[0][0]);
    }
    function jskNum01(jskObject) {
        return Number(jskObject.argGroups[0][1]);
    }
    function jskNum02(jskObject) {
        return Number(jskObject.argGroups[0][2]);
    }
    function jskNum03(jskObject) {
        return Number(jskObject.argGroups[0][3]);
    }
    function jskNum04(jskObject) {
        return Number(jskObject.argGroups[0][4]);
    }
    function jskNum05(jskObject) {
        return Number(jskObject.argGroups[0][5]);
    }
    /*
    function jskAngle01(jskObject) {
        var a = (-jskNum01(jskObject))/(2*Math.PI);
        return a % Math.floor(a);
    }
    */
    function jskColorRange04(jskObject) {
        var code = jskObject.argGroups[0][4];
        return ['LimitToRange', 'WrapToRange', 'ReflectToRange'][code];
    }
    function jskColorRange06(jskObject) {
        var code = jskObject.argGroups[0][6];
        return ['LimitToRange', 'WrapToRange', 'ReflectToRange'][code];
    }
/*
    function jskSourceGenus(jskObject) {
        var sourceID = jskObject.argGroups[0][0];
        var source = jskObject.objectList[sourceID];
        if (source) {
            return source.genus;
        }
    }
*/
    function jskSplit02(jskObject) {
        var t = unescapeText(jskObject.argGroups[0][2]);
        t = t.length? t: 'move';
        return unescapeText(jskObject.argGroups[0][2]).split("|");
    }
    function jskSplit03(jskObject) {
        return unescapeText(jskObject.argGroups[0][3]).split("|");
    }
    function parentKind(jskObject) {
        var source = jskObject.argGroups[0][0],
            kind = jskObject.objectList[source].kind;

        // Axes transform as lines
        if( kind === 'Axis') {
            kind = 'Straight';
        }
        return kind;
    }
    function jskNegativeString02(jskObject) {
      var n = Number(jskObject.argGroups[0][2]);
      n = (n === 0)? n : -n;
      return String(n);
    }
    function jskNegativeNum02(jskObject) {
      var n = Number(jskObject.argGroups[0][2]);
      return (n === 0)? n : -n;
    }

    function addUnitCircleAxes(sketch, basis, circleId, nextId) {
      function makeAxis(orientation, label) {
        return {
          kind: "Axis",
          constraint: "AxisUnitCircle",
          orientation: orientation,
          parents: {circle: circleId},
          label: label,
          style: {
            hidden: true,
            label: {
              showLabel: false
            },
            "line-style": "solid",
            width: 1,
            tickNumberStyle: "none"
          }
        };
      }
      var axisXId = nextId++;
      var axisYId = nextId++;

      sketch.objects[axisXId] = makeAxis('horizontal', 'x');
      sketch.objects[axisYId] = makeAxis('vertical', 'y');

      basis.parents.axisX = axisXId;
      basis.parents.axisY = axisYId;

      return nextId;
    }

    /**
     * Maps java sketchpad: objectNames to a function taking objectArguments
     * and optional formats and returning a web sketchpad JSON gobject
     * definition
     */
    var objectMaps = {
        // Constructions that create points
        Point: {
            template: {
                kind: "Point",
                constraint: "Free",
                genus: "Point",
                geom: {
	                loc: {
                		x: jskNum00,
                		y: jskNum01
                	}
                }
            }
        },
        FixedPoint: {
            template:{
                kind: "Point",
                constraint: "Free",
                geom: {
	                loc: {
                		x: jskNum00,
                		y: jskNum01
                	}
                },
                style: {
                    "selectable": false
                }
            }
        },
        Midpoint: {
            template:{
                kind: "Point",
                constraint: "Midpoint",
                parents: {
                    path: jskString00
                }
            }
        },
        "Point on object": {
            /*
             * If we are building a point on a circle we need to adjust units.
             * JSK has values in clockwise radians. WSP values, like all other
             * point on path units, are in the range [0-1).
             */
            builder: function(jsk, basis, sketch) {
                var path = sketch.objects[basis.parents.path],
                    v;
                if (path.kind === 'Circle') {
                    v = -basis.value/(2*Math.PI);
                    basis.value = GSP.math.mod(v, 1); // bring into 0-1 range
                }
                else if (path.kind === "Axis") {
                  // cf AxisPath_getUserValueFromCharacteristic_Proc
                  var SEMI_AXIS_PIXEL_BALANCE = 100;
                  var kStraightDist = SEMI_AXIS_PIXEL_BALANCE * 2;
                  var unit = sketch.objects[path.parents.unitPoint];
                  var unitDistance = unit.value;
                  basis.value = (basis.value - 0.5) * kStraightDist / unitDistance;
                }
                return basis;
            },
            template:{
                kind: "Point",
                constraint: "PointOnPath",
                genus: "PointOnPath",
                value: jskNum01,
                parents: {
                    path: jskString00
                }
            }
        },
        Intersect: {
            template:{
                kind: "Point",
                constraint: "Intersection",
                parents: {
                    line0: jskString00,
                    line1: jskString01
                }
            }
        },
        Intersect1: {
            template:{
                kind: "Point",
                constraint: "Intersection1",
                parents: {
                    obj: jskString00,
                    circle: jskString01
                }
            }
        },
        Intersect2: {
            template:{
                kind: "Point",
                constraint: "Intersection2",
                parents: {
                    obj: jskString00,
                    circle: jskString01
                }
            }
        },
        PlotXY: {
            template: {
                kind: "Point",
                constraint: "PlotMarkedXMarkedY",
                parents: {
                    coordX: jskString02,
                    coordY: jskString00,
                    coordSys: jskString01
                }
            }
        },
        PlotFixedXY: {
            template: {
                kind: "Point",
                constraint: "PlotFixedXFixedY",
                coordX: jskNum01,
                coordY: jskNum02,
                parents: {
                    coordSys: jskString00
                }
            }
        },
        UnitPoint: {
            template: {
                kind: "Point",
                constraint: "HorizontalUnitPoint",
                value: jskNum01,
                parents: {
                    origin: jskString00
                }
            }
        },
        SquareUnitPoint: {
            template: {
                kind: "Point",
                constraint: "UnitPointInternalSquare",
                parents: {
                    unitPoint: jskString00
                }
            }
        },
        RectangularUnitPoint: {
            template: {
                kind: "Point",
                constraint: "UnitPointInternalRectangle",
                parents: {
                    unitPoint: jskString00
                },
                unitDistance: jskNum01
            }
        },
        HorizontalAxis: {
            template: {
                kind: "Axis",
                constraint: "AxisInternalDist",
                genus: "Axis",
                orientation: "horizontal",
                parents: {
                    origin: jskString00,
                    unitPoint: jskString01
                },
                style: {
                  tickNumberStyle: "none"
                }
            }
        },
        VerticalAxis: {
            template: {
                kind: "Axis",
                constraint: "AxisInternalDist",
                genus: "Axis",
                orientation: "vertical",
                parents: {
                    origin: jskString00,
                    unitPoint: jskString01
                },
                style: {
                  tickNumberStyle: "none"
                }
            }
        },
        DriverPoint: {
            template: {
                kind: "Point",
                constraint: "Free",
                geom: {
	                loc: {
                		x: jskNum00,
                		y: jskNum01
                	}
                }
            }
        },
        // Constructions that create points
        Segment: {
            template:{
                kind: "Straight",
                constraint: "Segment",
                genus: "Segment",
                parents: {
                    p0: jskString01,
                    p1: jskString00
                }
            }
        },
        Ray: {
            template:{
                kind: "Straight",
                constraint: "Ray",
                genus: "Ray",
                parents: {
                    p0: jskString01,
                    p1: jskString00
                }
            }
        },
        Line: {
            template:{
                kind: "Straight",
                constraint: "Line",
                genus: "Line",
                parents: {
                    p0: jskString01,
                    p1: jskString00
                }
            }
        },
        Perpendicular: {
            template:{
                kind: "Straight",
                constraint: "Perpendicular",
                genus: "Line",
                parents: {
                    line: jskString00,
                    p0: jskString01
                }
            }
        },
        Parallel: {
            template:{
                kind: "Straight",
                constraint: "Parallel",
                genus: "Line",
                parents: {
                    line: jskString00,
                    p0: jskString01
                }
            }
        },
        AxisX: {
            template: {
                kind: "Axis",
                constraint: "AxisInternalDist",
                genus: "Axis",
                orientation: "horizontal",
                parents: {
                    origin: jskString00,
                    unitPoint: jskString01
                }
            }
        },
        AxisY: {
            template: {
                kind: "Axis",
                genus: "Axis",
                constraint: "AxisInternalDist",
                orientation: "vertical",
                parents: {
                    origin: jskString00,
                    unitPoint: jskString01
                }
            }
        },
        Bisector: {
            template: {
                kind: "Straight",
                constraint: "AngleBisector",
                genus: "Ray",
                parents: {
                    A: jskString00,
                    B: jskString01,
                    C: jskString02
                }
            }
        },
        // Constructions that create interiors
        Polygon: {
            template:{
                kind: "Polygon",
                constraint: "PolygonFromPoints",
                parents: jskArray0,
                style: {
                    opacity: 1,
                    layerOrder: 0,
                    "line-style": "solid",
                    width: 1
                }
            }
        },
        "Circle interior": {
            template: {
                kind: "CircleInterior",
                constraint: "CircleInterior",
                style: {
                  opacity: 1
                },
                parents: {
                    circle: jskString00
                }
            }
        },
        // Constructions that create circles
        Circle: {
            template:{
                kind: "Circle",
                constraint: "CircleFromTwoPoints",
                parents: {
                    p0: jskString00,
                    p1: jskString01
                }
            }
        },
        "Circle by radius": {
            template:{
                kind: "Circle",
                constraint: "CircleByRadius",
                parents: {
                    center: jskString00,
                    radius: jskString01
                }
            }
        },
        // Constructions that transform geometric objects
        Reflection: {
            builder: sourceGenus,
            template: {
                kind: parentKind,
                constraint: "Reflect",
                parents: {
                    source: jskString00,
                    mirror: jskString01
                }
            }
        },
        Dilation: {
            builder: sourceGenus,
            template: {
                kind: parentKind,
                constraint: "DilateFixFactor",
                scaleFactor: jskNum02,
                parents: {
                    source: jskString00,
                    center: jskString01
                }
            }
        },
        "Dilation/SegmentRatio": {
            builder: sourceGenus,
            template: {
                kind: parentKind,
                constraint: "Dilate2SegRatio",
                parents: {
                    source: jskString00,
                    center: jskString01,
                    seg0: jskString02,
                    seg1: jskString03
                }
            }
        },
        "Dilation/3PtRatio": {
            builder: sourceGenus,
            template: {
                kind: parentKind,
                constraint: "Dilate3PtRatio",
                parents: {
                    source: jskString00,
                    center: jskString01,
                    A: jskString02,
                    B: jskString03,
                    C: jskString04
                }
            }
        },
        "Dilation/MarkedRatio": {
            builder: sourceGenus,
            template: {
                kind: parentKind,
                constraint: "DilateMeasureFactor",
                parents: {
                    source: jskString00,
                    center: jskString01,
                    measure: jskString02
                }
            }
        },
        Rotation: {
            builder: sourceGenus,
            template: {
                kind: parentKind,
                constraint: "Rotate",
                angle: jskNegativeNum02,
                parents: {
                    source: jskString00,
                    center: jskString01
                }
            }
        },
        "Rotation/MarkedAngle": {
            builder: sourceGenus,
            template: {
                kind: parentKind,
                constraint: "Rotate3",
                parents: {
                    source: jskString00,
                    center: jskString01,
                    A: jskString02,
                    B: jskString03,
                    C: jskString04
                }
            }
        },
        "Rotation/MeasuredAngle": {
            builder: sourceGenus,
            template: {
                kind: parentKind,
                constraint: "RotateMeasureAngle",
                parents: {
                    source: jskString00,
                    center: jskString01,
                    angle: jskString02
                }
            }
        },
        Translation: {
            builder: sourceGenus,
            template: {
                kind: parentKind,
                constraint: "TranslateFixXFixY",
                offset: {
                    x: jskString01,
                    y: jskNegativeString02
                },
                parents: {
                    source: jskString00
                }
            }
        },
        VectorTranslation: {
            builder: sourceGenus,
            template: {
                kind: parentKind,
                constraint: "TranslateVector",
                parents: {
                    source: jskString00,
                    p0: jskString01,
                    p1: jskString02
                }
            }
        },
        "Translation/FixedAngle/MarkedDistance": {
            builder: sourceGenus,
            template: {
                kind: parentKind,
                constraint: "TranslateMeasureDistFixAngle",
                angle: jskNegativeNum02,
                parents: {
                    source: jskString00,
                    distance: jskString01
                }
            }
        },
        PolarTranslation: {
            builder: sourceGenus,
            // synonym for Translation
            template: {
                kind: parentKind,
                constraint: "Translate",
                offset: {
                    x: jskString01,
                    y: jskString02
                },
                parents: {
                    source: jskString00
                }
            }
        },
        "Translation/MarkedAngle/FixedDistance": {
            builder: sourceGenus,
            template: {
                kind: parentKind,
                constraint: "TranslateFixDistMeasureAngle",
                distance: jskNum02,
                parents: {
                    source: jskString00,
                    measure: jskString01
                }
            }
        },
        "Translation/MarkedAngle/MarkedDistance": {
            builder: sourceGenus,
            template: {
                kind: parentKind,
                constraint: "TranslateMeasureDistMeasureAngle",
                parents: {
                    source: jskString00,
                    angle: jskString01,
                    distance: jskString02
                }
            }
        },
        // Constuctions that Colorize Geometric Objects
        Colorized_Spectrum: {
            template: {
                kind: parentKind,
                constraint: "Colorization",
                parents: {
                    source: jskString00,
                    color: jskString01
                },
                colorModel: "UnivariateHue",
                colorRange: jskColorRange04,
                parameterDomainFrom: jskNum02,
                parameterDomainTo:jskNum03 
            }
        },
        Colorized_Grayscale: {
            template: {
                kind: parentKind,
                constraint: "Colorization",
                parents: {
                    source: jskString00,
                    color: jskString01
                },
                colorModel: "UnivariateIntensity",
                colorRange: jskColorRange04,
                parameterDomainFrom: jskNum02,
                parameterDomainTo:jskNum03
            }
        },
        Colorized_RGB: {
            template: {
                kind: parentKind,
                constraint: "Colorization",
                parents: {
                    source: jskString00,
                    red: jskString03,
                    green: jskString02,
                    blue: jskString01
                },
                colorModel: "TrivariateRGB",
                colorRange: jskColorRange06,
                parameterDomainFrom: jskNum04,
                parameterDomainTo:jskNum05
            }
        },
        Colorized_HSV: {
            template: {
                kind: parentKind,
                constraint: "Colorization",
                parents: {
                    source: jskString00,
                    red: jskString01,
                    green: jskString02,
                    blue: jskString03
                },
                colorModel: "TrivariateHSB",
                colorRange: jskColorRange06,
                parameterDomainFrom: jskNum04,
                parameterDomainTo:jskNum05
            }
        },
        // Constuctions that Create Pictures
        Image: {
            template: {
                kind: "Picture",
                constraint: "Free",
                initgeom: {
                    m00: 1, m10: 0, m20: jskNum00,
                    m01: 0, m11: 1, m21: jskNum01
                },
                image: {
                    src: jskString02
                }
            }
        },
        ImageOnPoint: {
            template: {
                kind: "Picture",
                constraint: "PictureHungOnOnePoint",
                parents: {
                    p0: jskString00
                },
                image: {
                    src: jskString01
                }
            }
        },
        ImageBetweenPoints: {
            template: {
                kind: "Picture",
                constraint: "PictureBetweenTwoPoints",
                parents: {
                    p0: jskString00,
                    p1: jskString01
                },
                image: {
                    src: jskString02,
                    width: 20,
                    height: 20
                }
            }
        },
        // Constructions that Measure Things
        Length: {
            template: {
                kind: "Measure",
                constraint: "MeasurementLength",
                geom: {
	                loc: {
                		x: jskNum01,
                		y: jskNum02
                	}
                },
                label: unescapeString03,
                parents: {
                    path: jskString00
                },
                style: {
                    showUnits: false,
                    "vertical-align": "bottom",
                    nameOrigin: "namedFromLabel",
                    prefixWithLabel: true
                }
            }
        },
        Angle: {
            template: {
                kind: "Measure",
                constraint: "MeasurementAngle",
                geom: {
	                loc: {
                		x: jskNum03,
                		y: jskNum04
                	}
                },
                label: unescapeString05,
                parents: {
                    p0: jskString00,
                    p1: jskString01,
                    p2: jskString02
                },
                style: {
                    showUnits: false,
                    "vertical-align": "bottom",
                    nameOrigin: "namedFromLabel",
                    prefixWithLabel: true
                }
            }
        },
        Perimeter: {
            template: {
                kind: "Measure",
                constraint: "MeasurementPerimeter",
                geom: {
	                loc: {
                		x: jskNum01,
                		y: jskNum02
                	}
                },
                parents: {
                    shape: jskString00
                },
                label: unescapeString03,
                style: {
                    showUnits: false,
                    "vertical-align": "bottom",
                    nameOrigin: "namedFromLabel",
                    prefixWithLabel: true
                }
            }
        },
        Circumference: {
            template: {
                kind: "Measure",
                constraint: "MeasurementCircumference",
                geom: {
	                loc: {
                		x: jskNum01,
                		y: jskNum02
                	}
                },
                parents: {
                    shape: jskString00
                },
                label: unescapeString03,
                style: {
                  showUnits: false,
                  "vertical-align": "bottom",
                  nameOrigin: "namedFromLabel",
                  prefixWithLabel: true
                }
            }
        },
        Radius: {
            template: {
                kind: "Measure",
                constraint: "MeasurementRadius",
                geom: {
	                loc: {
                		x: jskNum01,
                		y: jskNum02
                	}
                },
                parents: {
                    shape: jskString00
                },
                label: unescapeString03,
                style: {
                    showUnits: false,
                    "vertical-align": "bottom",
                    nameOrigin: "namedFromLabel",
                    prefixWithLabel: true
                }
            }
        },
        Area: {
            template: {
                kind: "Measure",
                constraint: "MeasurementArea",
                genus: "AreaMeasure",
                geom: {
	                loc: {
                		x: jskNum01,
                		y: jskNum02
                	}
                },
                parents: {
                    shape: jskString00
                },
                label: unescapeString03,
                style: {
                    showUnits: false,
                    "vertical-align": "bottom",
                    nameOrigin: "namedFromLabel",
                    prefixWithLabel: true
                }
            }
        },
        Slope: {
            template: {
                kind: "Measure",
                constraint: "GeometricSlope",
                geom: {
	                loc: {
                		x: jskNum01,
                		y: jskNum02
                	}
                },
                parents: {
                    "straight": jskString00
                },
                label: unescapeString03,
                style: {
                    showUnits: false,
                    "vertical-align": "bottom",
                    nameOrigin: "namedFromLabel",
                    prefixWithLabel: true
                }
            }
        },
        Distance: {
            template: {
                kind: "Measure",
                constraint: "MeasurementDistance",
                geom: {
	                loc: {
                		x: jskNum02,
                		y: jskNum03
                	}
                },
                parents: {
                    obj0: jskString00,
                    p0: jskString01
                },
                label: unescapeString04,
                style: {
                    showUnits: false,
                    "vertical-align": "bottom",
                    nameOrigin: "namedFromLabel",
                    prefixWithLabel: true
                }
            }
        },
        "Ratio/Segments": {
            template: {
                kind: "Measure",
                constraint: "MeasurementRatio",
                geom: {
	                loc: {
                		x: jskNum02,
                		y: jskNum03
                	}
                },
                parents: {
                    obj0: jskString00,
                    obj1: jskString01
                },
                label: unescapeString04,
                style: {
                    showUnits: false,
                    "vertical-align": "bottom",
                    nameOrigin: "namedFromLabel",
                    prefixWithLabel: true
                }
            }
        },
        "Ratio/Points": {
            template: {
                kind: "Measure",
                constraint: "MeasurementRatio",
                geom: {
	                loc: {
                		x: jskNum03,
                		y: jskNum04
                	}
                },
                parents: {
                    obj0: jskString00,
                    obj1: jskString01,
                    obj2: jskString02
                },
                label: unescapeString05,
                style: {
                    showUnits: false,
                    "vertical-align": "bottom",
                    nameOrigin: "namedFromLabel",
                    prefixWithLabel: true
                }
            }
        },
        Coordinates: {
            template: {
                kind: "Measure",
                constraint: "MeasurementRectCoordinates",
                geom: {
	                loc: {
                		x: jskNum02,
                		y: jskNum03
                	}
                },
                parents: {
                    point: jskString00,
                    coordSys: jskString01
                },
                style: {
                    showUnits: false,
                    "vertical-align": "bottom",
                    nameOrigin: "namedFromLabel",
                    prefixWithLabel: true
                }
            }
        },
        Abscissa: {
            template: {
                kind: "Measure",
                constraint: "MeasurementAbscissa",
                geom: {
	                loc: {
                		x: jskNum02,
                		y: jskNum03
                	}
                },
                parents: {
                    point: jskString00,
                    coordSys: jskString01
                },
                label: unescapeString04,
                style: {
                    showUnits: false,
                    "vertical-align": "bottom",
                    nameOrigin: "namedFromLabel",
                    prefixWithLabel: true
                }
            }
        },
        Ordinate: {
            template: {
                kind: "Measure",
                constraint: "MeasurementOrdinate",
                geom: {
	                loc: {
                		x: jskNum02,
                		y: jskNum03
                	}
                },
                parents: {
                    point: jskString00,
                    coordSys: jskString01
                },
                label: unescapeString04,
                style: {
                    showUnits: false,
                    "vertical-align": "bottom",
                    nameOrigin: "namedFromLabel",
                    prefixWithLabel: true
                }
            }
        },
        CoordinateDistance: {
            template: {
                kind: "Measure",
                constraint: "MeasurementCoordinateDistance",
                geom: {
	                loc: {
                		x: jskNum03,
                		y: jskNum04
                	}
                },
                parents: {
                    p0: jskString00,
                    p1: jskString01,
                    coordSys: jskString02
                },
                label: unescapeString05,
                style: {
                    showUnits: false,
                    "vertical-align": "bottom",
                    nameOrigin: "namedFromLabel",
                    prefixWithLabel: true
                }
            }
        },
        Calculate: {
            builder: function (jsk, basis) {
                var rpnStr = jsk.argGroups[0][3],
                    objArray = jsk.argGroups[1],
                    infixStr = rpn2infix(rpnStr, objArray);
                basis.expression = infixStr;
                return basis;
            },
            template: {
                kind: "Expression",
                constraint: "Calculation",
                expressionType: "UniMeasure_ExprType",
                geom: {
	                loc: {
                		x: jskNum00,
                		y: jskNum01
                	}
                },
              style: { 
                nameOrigin: "namedFromLabel",
                prefixWithLabel: true,
                showUnits: false,
                "vertical-align": "bottom"
              },
              label: unescapeString02,
              parents: jskArray1
            }
        },
        Parameter: {
            template:{
                kind: "Expression",
                constraint: "Free",
                expression: jskString00,
                expressionType: "UniMeasure_ExprType",
                measureType: "scalar",
                label: unescapeString03,
                geom: {
	                loc: {
                		x: jskNum01,
                		y: jskNum02
                	}
                },
                style: {
                    nameOrigin: 'namedFromLabel',
                    contenteditable: true,
                    prefixWithLabel: true,
                    showUnits: false,
                    "vertical-align": "bottom"
                }
            }
        },
        // Constructions that create buttons
        ToggleVisibilityButton: {
            template:{
                kind: "Button",
                constraint: "ActionButtonToggleHideShow",
                geom: {
	                loc: {
                		x: jskNum00,
                		y: jskNum01
                	}
                },
                messages: jskSplit02,
                parents: jskArray1,
                style: {
                    "selectable": false
                }
            }
        },
        ShowButton: {
            template:{
                kind: "Button",
                constraint: "ActionButtonShow",
                geom: {
	                loc: {
                		x: jskNum00,
                		y: jskNum01
                	}
                },
                messages: jskSplit02,
                parents: jskArray1,
                style: {
                    "selectable": false
                }                
            }
        },
        HideButton: {
            template:{
                kind: "Button",
                constraint: "ActionButtonHide",
                geom: {
	                loc: {
                		x: jskNum00,
                		y: jskNum01
                	}
                },
                messages: jskSplit02,
                parents: jskArray1,
                style: {
                    "selectable": false
                }                
            }
        },
        MoveButton: {
             builder: function (jsk, basis, sketch, params) {
                if( params.jspVersion === 4) {
                    basis.towardInitialDestination = true;
                }
                return basis;
            },            
            template: {
                kind: "Button",
                constraint: "ActionButtonMove",
                geom: {
	                loc: {
                		x: jskNum00,
                		y: jskNum01
                	}
                },
                rate: jskNum02,
                messages: jskSplit03,
                parents: jskArray1,
                style: {
                    "selectable": false
                }                
            }
        },
        AnimateButton: {
            builder: function (jsk, basis, sketch) {
                var MT_ON_CLOSED_PATH = ['backward', 'forward'],
                    MT_ON_OPEN_PATH = ['both', 'forward'],
                    ix, gobjs, parent, path, animStates;
                // second parameter group is gobject pairs
                gobjs = jsk.argGroups[1];
                for (ix = 0; ix < gobjs.length; ix += 1) {
                    if (ix%2===0) {basis.parents[String(ix/2)] = gobjs[ix];}
                }
                // third, fourth, and fifth groups are rate, repeat, and motion type
                // arrays
                animStates = basis.animationStates = [];
                //basis.rates = [];
                //basis.repeatOptions = [];
                //basis.motionTypes = [];
                for ( ix = 0; ix < jsk.argGroups[2].length; ix += 1) {
                    animStates[ix] = {};
                    animStates[ix].rate = + jsk.argGroups[2][ix];
                    animStates[ix].repeat = (Number(jsk.argGroups[3][ix]) === 0);
                    parent = sketch.objects[basis.parents[ix]];
                    if (parent.parents) {
                        path = sketch.objects[parent.parents.path];
                        if (path.kind === 'Circle' || 
                                path.kind === 'CircleInterior') {
                            animStates[ix].motionType 
                                = MT_ON_CLOSED_PATH[+ jsk.argGroups[4][ix]];
                        } else {
                            animStates[ix].motionType
                                = MT_ON_OPEN_PATH[+ jsk.argGroups[4][ix]];
                        }
                    }
                    else {
                        basis.constraint = "UnsupportedAnimation";
                        GSP.log("Animation of point not on path: " + basis.id);
                    }
                }
                basis.style = {
                    "selectable": false
                };
                return basis;
            },
            template: {
                kind: "Button",
                constraint: "ActionButtonAnimate",
                genus: "Action",
                geom: {
	                loc: {
                		x: jskNum00,
                		y: jskNum01
                	}
                },
                messages: jskSplit02,
                parents: {}
            }
        },
        SimultaneousButton: {
            template: {
                kind: "Button",
                constraint: "ActionButtonPresentSimultaneously",
                geom: {
	                loc: {
                		x: jskNum00,
                		y: jskNum01
                	}
                },
                messages: jskSplit02,
                parents: jskArray1,
                style: {
                    "selectable": false
                }                
            }
        },
        // Constructions that create Coordinate Systems
        CoordSysByAxes: {
            template: {
                kind: "CoordSys",
                constraint: "CoordSys",
                shape: "square",
                style : {
                    grid : "gridlines"
                },
                parents: {
                    axisX: jskString00,
                    axisY: jskString01
                }
            },
            postProcess: function(gobj) {
                gobj.style.width = 1; // In fact, JSP ignores specified width
            }
        },
        "Origin&Unit": {
            builder: function (jsk, basis) {
              var originId = jsk.argGroups[0][0];
              var distantPoint = jsk.argGroups[0][1];
              function createParents(sketch, nextId) {
                var circleId = nextId++;
                var circle = {
                  kind: "Circle",
                  constraint: "CircleFromTwoPoints",
                  parents: {
                    p0: originId,
                    p1: distantPoint
                  },
                  style: { hidden: true }
                };
                sketch.objects[circleId] = circle;
                return addUnitCircleAxes(sketch, basis, circleId, nextId);
              }
              return { wspObject: basis, createParentsFunc: createParents };
            },
            template: {
              kind: "CoordSys",
              constraint: "CoordSys",
              parents: {},
              shape: "square",
              style : {
                grid : "gridlines"
              }
            },
            createsNewParents: true
        },
        UnitCircle: {
            builder: function (jsk, basis) {
              var circleId = jsk.argGroups[0][0];
              function createParents(sketch, nextId) {
                return addUnitCircleAxes(sketch, basis, circleId, nextId);
              }
              return { wspObject: basis, createParentsFunc: createParents };
            },
            template: {
              kind: "CoordSys",
              constraint: "CoordSys",
              parents: {},
              shape: "square",
              style : {
                grid : "gridlines"
              }
            },
            createsNewParents: true
        },
        // Constructions that create Functions
        Function: {
            builder: function (jsk, basis) {
                var rpnStr = jsk.argGroups[0][3],
                    objArray = jsk.argGroups[1],
                    infixStr = rpn2infix(rpnStr, objArray);
                if (objArray.length === 0) {
                  basis.constraint = "Free";
                }
                basis.expression = infixStr;
                return basis;
            },
            template: {
                kind: "Expression",
                constraint: "Function",
                genus: "Function",
                geom: {
	                loc: {
                		x: jskNum00,
                		y: jskNum01
                	}
                },
                expressionType: "YofX_FunctionExprType",
                label: unescapeString02,
                parents: jskArray1,
                style: {
                  nameOrigin: "namedFromFixedString"
                }
            }
        },
        // Constructions that create Loci
        Locus: {
            builder: function (jsk, basis) {

                // Find a drivechain from start to end
                // Assumes gobjlist is in order, indexed by consecutive     integers
                function calculateDriveChain(gobjlist, start, end) {
                    var  l = Number(start),
                     h = Number(end),
                     startDownstream = {},
                     endUpstream = {},
                     i, k, parents,
                    ret = [];


                    // Who descends from start?
                    // Walk the gobjlist from start to end - if a parent descends from
                    // start, so does the current gobject
                    startDownstream[l] = true;
                    for( i = l+1; i <= h; i++) {
                        parents = gobjlist[i].parents;
                        for( k in parents) {
                            if( parents.hasOwnProperty(k)) {
                                if( startDownstream[parents[k]]) {
                                    startDownstream[i] = true;
                                    continue;
                                }
                            }
                        }
                    }

                    // And now who are the ancestors of end?
                    // Walk the gobjlist from end to start.
                    // Any if the gobj is an ancestor or end,
                    // so are all of its parents.
                    endUpstream[h] = true;
                    for( i = h; i >= l; i--) {
                        if( endUpstream[i]) {
                            parents = gobjlist[i].parents;
                            for( k in parents) {
                                if( parents.hasOwnProperty(k)) {
                                    endUpstream[parents[k]] = true;
                                }
                            }
                        }
                    }

                    // And now reap all descendends of start which
                    // are ancestors of end.
                    for( i = l+1; i <= h; i++) {
                        if( startDownstream[i] && endUpstream[i]) {
                            ret.push(i.toString());
                        }
                    }
                    return ret;
                }

                var driveChain = calculateDriveChain(jsk.objectList,
                    basis.parents.driverObject,
                    basis.parents.drivenObject
                    );

                driveChain.forEach(function(element, index) {
                    basis.parents[index] = element;
                });

                if( jsk.objectList[basis.parents.drivenObject].kind !== 'Point') {
                    basis.genus = 'Envelope';
                }

                return basis;
            },
            template: {
                kind: "Sampler",
                genus: "PointLocus",
                constraint: "GeomLocus",
              numSamples: jskNum03,
              driverDomain: {
                low: 0,
                high: 1
              },             
              parents: {
                drivenObject: jskString00,
                driverObject : jskString01,
                domainObject: jskString02
              }
          }
        },
        // {29} FunctionPlot(28,6,600,-17,17,0)[red,thick];
        FunctionPlot: {
            template: {
              kind: "Sampler",
              constraint: "FunctionPlot",
              numSamples: jskNum02,
              driverDomain: {
                low: jskNum03,
                high: jskNum04
              },
              parents: {
                "function": jskString00,
                coordSys: jskString01
              }
            }
        },
        // Constructions that create Captions
        FixedText: {
            template: {
                kind: "Text",
                constraint: "Free",
                genus: "Caption",
                geom: {
	                loc: {
                		x: jskNum00,
                		y: jskNum01
                	}
                },
                text: unescapeString02,
                style: {
                    "vertical-align": "bottom",
                    "selectable": false
                }
            }
        },
        PeggedText: {
            template: {
                kind: "Text",
                constraint: "Pegged",
                parents: {
                    p0: jskString00,
                    text: jskString01
                }
            }
        },
        ConcatText: {
          builder: function(jsk, basis, sketch) {
            var parents = {};

            function makeSwitches() {
              var parentIndices = jsk.argGroups[1],
                  ret = [];

              for (var i = 0;i < parentIndices.length;i++) {
                parents[i] = parentIndices[i];
                ret.push({
                  type: 'switch',
                  visibleNode: '1',
                  value: [GSP.mfs.makeTextMFS("")],
                  // In this context, a refcon is a 1-indexed, base
                  // 16-encoded index of a parent in the parentsList
                  // (see refConToMergeTextKey)
                  refCon: (i + 1).toString(16)
                });
              }
              return ret;
            }
            var tree = GSP.mfs.makeHorizontalMFS.apply(this, makeSwitches());
            basis.textMFS = GSP.mfs.makeMFSFromMFSParseTree(tree);
            basis.parents = parents;
            return basis;
          },
          template: {
            kind: "Text",
            constraint: "CompositeText",
            geom: {
              loc: {
                x: jskNum00,
                y: jskNum01
              }
            }
          }
        },
        // Catchall
        Unknown: {
            builder: capabilityNotImplementedBuilder,
            template:capabilityNotImplementedTemplate
        }
    };


    function copyTemplate(template, jskObject) {
        var copy = {}, key, tvalue;
        for (key in template) {
            tvalue = template[key];
            if (template.hasOwnProperty(key)) {
                if (typeof tvalue === 'string' ||
                    typeof tvalue === 'boolean' ||
                    typeof tvalue === 'number') {
                    copy[key] = tvalue;
                } else if (typeof tvalue === 'function') {
                    copy[key] = tvalue(jskObject);
                } else if (typeof tvalue  === 'object') {
                    copy[key] = copyTemplate(tvalue, jskObject);
                }
            }
        }
        return copy;
    }

    function convertOptions(jskOptions, wspObject) {
        if (!jskOptions) { return; }
        if (!wspObject) { return; }
        // do not set attributes on unimplemented objects.
        if (wspObject.description
                && wspObject.description === "Capability not implemented") {
            return;
        }
        var ix, key, opt, trans, selector;
        if (!wspObject.style) { wspObject.style = {}; }
        for(ix = 0; ix < jskOptions.length; ix += 1) {
            opt = jskOptions[ix];
            trans = attributeSubstitutions[opt];
            if (trans) {
                for (key in trans) {
                    if (trans.hasOwnProperty(key)) {
                        wspObject.style[key]=trans[key];
                    }
                }
            }
            else if (opt.match(/label\('[^']*'\)/)) {
                var labelMatch = /^label\('([^']*)'\)/.exec(opt);
                //GSP.log("labelMatch: " + labelMatch.join());
                wspObject.label = unescapeText(labelMatch[1]);

                if( !wspObject.style.label) {
                  wspObject.style.label = { };
                }

              var labelStyle = wspObject.style.label;
              labelStyle.labelOffsetX = 5;
              labelStyle.labelOffsetY = -13;
              labelStyle.showLabel = true;
            }
            else if (opt.match(/color\([^)]*\)/)) {
                var rgbcolorMatch = /^color(\([^)]*\))/.exec(opt);
                //GSP.log("colorMatch: " + rgbcolorMatch.join());
                wspObject.style.color="rgb" + rgbcolorMatch[1];
            }
            else if (opt.match(/size\([0-9]*\)/)) {
                selector = /size\(([0-9.]*)\)/.exec(opt);
                wspObject.style['font-size'] = + selector[1];
            }
            else if (opt.match(/layer\([0-9]*\)/)) {
                selector = /layer\(([0-9.]*)\)/.exec(opt);
                wspObject.style.layerOrder = + selector[1];
            }
            else if (opt.match(/font\('[^']*'\)/)) {
                selector = /font\('([^']*)'\)/.exec(opt);
                wspObject.style['font-family'] = selector[1];
            }
            else if (opt.match(/digits\('[^']*'\)/)) {
                selector = /digits\('([0-9]*)'\)/.exec(opt);
                wspObject.style.precision = + selector[1];
            }
            else if (opt.match(/image\('[^']*'\)/)) {
                selector = /image\('([^']*)'\)/.exec(opt);
                wspObject.style.url = selector[1];
            }
            else if (opt.match(/suffix\('[^']*'\)/)) {
                selector = /suffix\('([^']*)'\)/.exec(opt);
                wspObject.style.suffix = unescapeText(selector[1]);
            }
        }
        return wspObject;
    }
    function convertJskToWsp(jskObject, sketch) {
        var type = jskObject.type,
            typeDef,
            builder,
            template,
            basis,
            built,
            wspObject,
            createParentsFunc,
            gobj;

        if (objectMaps[type]) {
            typeDef = objectMaps[type];
        } else {
            typeDef = objectMaps.Unknown;
        }
        builder = typeDef.builder;
        template = typeDef.template;
        basis = copyTemplate(template, jskObject);
        if (!basis.style) {
            basis.style = {};
        }
        basis.style.label = {};
        basis.style.label["font-family"] = 0;
        basis.style.label["font-size"] = 16;
        basis.style.label["font-weight"] = "normal";

        built = builder? builder(jskObject, basis, sketch, params): basis;
        if (typeDef.createsNewParents) {
          wspObject = built.wspObject;
          createParentsFunc = built.createParentsFunc;
        }
        else {
          wspObject = built;
        }

        if (debugging) {
          var opts = jskObject.opts;
          var ix = opts.indexOf("hidden");
          if (ix !== -1) {
            opts.splice(ix, 1);
          }
        }

        gobj = convertOptions(jskObject.opts, wspObject);

        if( gobj && typeDef.postProcess) {
            typeDef.postProcess(gobj, sketch);
        }

        return { gobj: gobj, createParentsFunc: createParentsFunc };
    }

    var objDefinition,
        wspDoc = {
            metadata: {
                name: "autogenerated",
                description: "autogenerated",
                copyright:"(C) KCP Technologies 2012",
                width: params.width || 640,
                height: params.height || 480,
                "wsp-version" : "4.8.0",
                "start-page" : "1"
            },
            "preferences": {
               "fontList" : [
                 "Times",
                 "sans-serif"
               ]
            },
            "pages" : [
            {
              "metadata" : {
                "title" : "1",
                "id" : "1",
                "sketchRect" : {
                  "top" : 0,
                  "left" : 0,
                  "bottom" : 640,
                  "right" : 480
                  }
                },
                "preferences": {
                  "colorableComponents": {
                    "Background": {}
                  },
                  "fontList" : [
                    "Times",
                    "sans-serif"
                  ],
                  "text": {
                    "textTypes": {
                      "Label": {},
                      "Caption": {},
                      "Measurement": {},
                      "Action": {}
                    }
                  },
                  "units" : {
                     "length" : "pixels",
                     "angle" : "radians"
                   },
                   "precision" : {
                     "length" : 3,
                     "angle" : 3,
                     "scalar" : 3
                   }
                },
                objects: {}
            }]
        };
    var objDefinitions = [],
        red = 255, green = 255, blue = 255,
        ix;

    var sketch = wspDoc.pages[0];
    var textTypesAction = sketch.preferences.text.textTypes.Action;
    var textTypesMeasurement = sketch.preferences.text.textTypes.Measurement;
    var textTypesLabel = sketch.preferences.text.textTypes.Label;
    var textTypesCaption = sketch.preferences.text.textTypes.Caption;

    var textPrefs = [
      {
        property: 'font-weight',

        // Converts from applet parameter values to sketch preference
        // values.
        valueFunc: function(p) {
          return parseInt(p, 10) === 1 ? "bold" : "normal";
        },

        // Maps the name of an applet parameter to the sketch
        // preference object it will affect.
        mapping: [['ActionBold', textTypesAction],
                  ['LabelBold', textTypesLabel],
                  ['CaptionBold', textTypesCaption],
                  ['MeasureBold', textTypesMeasurement]]
      },
      {
        property: 'font-size',
        valueFunc: function(p) {
          return Number(p);
        },
        mapping: [['ActionSize', textTypesAction],
                  ['LabelSize', textTypesLabel],
                  ['CaptionSize', textTypesCaption],
                  ['MeasureSize', textTypesMeasurement]]
      },
      {
        property: 'font-style',
        valueFunc: function(p) {
          return parseInt(p, 10) === 1 ? "italic" : "normal";
        },
        mapping: [['ActionItalic', textTypesAction],
                  ['LabelItalic', textTypesLabel],
                  ['CaptionItalic', textTypesCaption],
                  ['MeasureItalic', textTypesMeasurement]]
      },
      {
        property: 'font-family',
        valueFunc: function(p) {
          return p;
        },
        mapping: [['ActionFont', textTypesAction],
                  ['LabelFont', textTypesLabel],
                  ['CaptionFont', textTypesCaption],
                  ['MeasureFont', textTypesMeasurement]]
      }
    ];

  function setPreferences() {

    function setPreference(appletParamName, prefObject, prefProperty, valueFunc) {
      var param = params[appletParamName];
      if (param === undefined || param === "") {
        return;
      }
      var value = valueFunc(param);
      if (value !== undefined) {
        prefObject[prefProperty] = value;
      }
    }

    function setTextPrefs() {
      for (var i = 0;i < textPrefs.length;i++) {
        for (var j = 0;j < textPrefs[i].mapping.length;j++) {
          var appletParamName = textPrefs[i].mapping[j][0];
          var prefObject = textPrefs[i].mapping[j][1];
          setPreference(appletParamName,
                        prefObject,
                        textPrefs[i].property,
                        textPrefs[i].valueFunc);
        }
      }

    }
    function setBackgroundColor() {
      if (params.BackRed) {
        red = params.BackRed;
      }
      if (params.BackGreen) {
        green = params.BackGreen;
      }
      if (params.BackBlue) {
        blue = params.BackBlue;
      }
      if ( red || green || blue ) {
        sketch.preferences.colorableComponents.Background.color =
          "rgb(" + red + "," + green + "," + blue + ")";
      }
    }

    function setAnglePrefs() {
      function getDefault(param, defaultVal) {
        if (params[param] === undefined || params[param] === "") {
          return defaultVal;
        }
        else {
          return Boolean(Number(params[param]));
        }
      }
      var measureInDegrees = getDefault('MeasureInDegrees', false);
      var directedAngles = getDefault('DirectedAngles', true);

      var units = sketch.preferences.units;

      if (measureInDegrees && directedAngles) {
        units.angle = "signed deg";
      }
      else if (!measureInDegrees && !directedAngles) {
        units.angle = "radian";
      }
      else if (!measureInDegrees && directedAngles) {
        // This should be "signed radian" but GSP and WSP do not support it
        units.angle = "radian";
      }
      else if (measureInDegrees && !directedAngles) {
        units.angle = "deg";
      }
    }
    function setPrecisionPrefs() {
      var param = params.Digits;
      if (param === undefined || param === "") {
        return;
      }
      var precision = sketch.preferences.precision;
      var value = parseInt(param, 10);
      if (!isNaN(value)) {
        precision.length = value;
        precision.angle = value;
        precision.scalar = value;
      }
    }
    function setLengthUnitPref() {
      setPreference("PixelsPerLengthUnit",
                    sketch.preferences.units,
                    "length",
                    function(val) {
                      if (val < 2) {
                        return "pixels";
                      }
                      else if (val < 50) {
                        return "centimeter";
                      }
                      else {
                        return "inches";
                      }
                    });
    }

    setTextPrefs();
    setBackgroundColor();
    setAnglePrefs();
    setPrecisionPrefs();
    setLengthUnitPref();
  }

  function makeRemoveTracesButton() {
    var button = {
      kind: "Button",
      constraint: "ActionButtonPresentSimultaneously",
      geom: {
	    loc: {
          x: wspDoc.metadata.width - 25,
          y: wspDoc.metadata.height - 22
        }
      },
      messages: ["X"],
      style: {
        selectable: false,
        color: "red",
        label: { "color": "red" }
      },
      eraseAnyTraces: true
    };
    return button;
  }

  try {
    objDefinitions = GSP.jskParser.parse(jskDoc);
    setPreferences(sketch);
    var removeTracesButton = null,
        createParentsFuncs = [];
    for (ix = 0; ix<objDefinitions.length; ix += 1) {
      objDefinition = objDefinitions[ix];
      objDefinition.objectList = sketch.objects;
      var converted = convertJskToWsp(objDefinition, sketch);
      var gobj = converted.gobj;
      if (gobj.style.traced && removeTracesButton === null) {
        removeTracesButton = makeRemoveTracesButton();
      }
      sketch.objects[objDefinition.id] = gobj;
      if (converted.createParentsFunc) {
        createParentsFuncs.push(converted.createParentsFunc);
      }
    }
    var nextId = ix + 1;
    for (var i = 0;i < createParentsFuncs.length;i++) {
      var func = createParentsFuncs[i];
      nextId = func(sketch, nextId);
    }
    if (removeTracesButton !== null) {
      removeTracesButton.id = nextId++;
      sketch.objects[removeTracesButton.id] = removeTracesButton;
    }
    //return JSON.stringify(wspDoc);
  } catch (ex) {
    ex.message = "Error parsing Java Sketchpad sketch: " + ex.message;
    GSP.signalCaughtError(ex);
  }
  return wspDoc;
};

(function() {
  if(!jQuery) {
    alert('jQuery not found. Web Sketchpad requires jQuery to be installed '+
          'in your page before the applet converter can run.');
    return;
  }

  if(!GSP || !GSP.parseJavaSP || !$.fn.WSP) {
    alert('The applet converter was not properly installed. Please refer to the documentation '+
          'to see the list of files that must be installed.');
    return;
  }


  jQuery(function($) {


    var parseQueryString = function() {
      var str = window.location.search;
      var objURL = {};
      str.replace(
        new RegExp( "([^?=&]+)(=([^&]*))?", "g" ),
        function( $0, $1, $2, $3 ){
          objURL[ $1 ] = $3;
        }
      );
      return objURL;
    };

    var params = parseQueryString();

    if (params.debugging) {
      $(document).bind('gLog', function (evt, args) {
        if( window.console && window.console.log) {
          window.console.log('GSP: ' + args.logType + ': ' + args.message);
          console.log(args.stack || '');
        }
        
      });
    }
    var whichSketch = params.whichSketch? Number(params.whichSketch) : 'all';


    var i = 0, archive;
    $('applet, wspapplet').each(function() {
      var $applet = $(this);
      i++;
      if (whichSketch !== 'all' &&
          whichSketch !== i) {
        return;
      }
      var sketchContainer = $('<div>'),
          attrs = {},
          construction,
          doc;

      $applet.children('PARAM').each(
        function() { 
          var name = $(this).attr('NAME'),
              value = $(this).attr('VALUE');
          if (name === 'Construction') {
            construction = value;
          }
          else {
            attrs[name] = value;
          }
        });

      // extact the jsp applet version from the name in the archive attribute
      archive = $applet.attr('ARCHIVE');
      if( archive) {
        archive = archive.match(/\d+/);
        if( archive) {
          attrs.jspVersion = parseInt(archive[0], 10);
        }
      }

      function setWidth() {
        var width = $applet.attr('width');
        var height = $applet.attr('height');
        if (params.debugging) {
          width = 1200;
          height = 1200;
        }
        if (width) attrs.width = width;
        if (height) attrs.height = height;
      }

      setWidth();

      $applet.replaceWith(sketchContainer);
      doc = GSP.parseJavaSP(construction, attrs, params.debugging);
      
      function setMargin() {
        var align = $applet.attr('align');
        if (!align) return;
        switch (align.toLowerCase()) {
        case "middle":
        case "center":
          sketchContainer.css("margin", "0 auto");
          break;
        case "left":
          sketchContainer.css("margin", "0 auto 0 0");
          break;
        case "right":
          sketchContainer.css("margin", "0 0 0 auto");
          break;
        }
      }

      setMargin();

      if (params.debugging) {
        $('body').append($('<pre>').css('line-height', 1)
                         .text(construction));
        $('body').append($('<pre>').css('line-height', 1)
                         .text(window.JSONcanonical.stringify(doc, undefined, 2)));
      }

      sketchContainer.WSP("loadSketch", {'data-sourceDocument': doc});
    });
  });
})();
