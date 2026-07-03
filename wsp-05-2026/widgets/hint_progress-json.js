window.hint_progress = {
  "metadata": {
    "width": 135,
    "height": 135,
    "wsp-version": "4.8.0",
    "wsp-build-number": "1080",
    "wsp-build-stamp": "cae4deb72d83/20230417225119",
    "exporter-version": "5.10(dev)",
    "exporter-build": "3054(dev)",
    "original-document-name": "hint_progress-json",
    "start-page": "1",
    "authorPreferences": {
      "visibilitywidget": "none",
      "stylewidget": "none",
      "tracewidget": "none",
      "labelwidget": "none",
      "deletewidget": "none",
      "toollook": "compact",
      "disablescrolling": true,
      "removeinaccessibleobjects": true,
      "resetbutton": "none",
      "enablelabeldragging": false,
      "wsplogo": false,
      "downloadutil": false,
      "uploadutil": false
    }
  },
  "resources": {
    "fontList": ["\"Times New Roman\", sans-serif", "\"Arial\", sans-serif"]
  },
  "pages": [{
      "metadata": {
        "title": "1",
        "id": "1",
        "sketchRect": {
          "top": 1,
          "left": -1,
          "bottom": 136,
          "right": 134
        }
      },
      "preferences": {
        "units": {
          "length": "px",
          "angle": "rad"
        },
        "precision": {
          "length": 2,
          "angle": 0,
          "scalar": 2
        },
        "colorableComponents": {
          "Straights": {
            "color": "blue"
          },
          "Curves": {
            "color": "rgb(47,221,219)"
          },
          "Interior": {
            "color": "rgb(47,221,219)"
          },
          "PointLocus": {
            "color": "blue"
          },
          "CoordSys": {
            "color": "rgb(160,160,160)"
          },
          "ActionButton": {
            "color": "black"
          }
        },
        "text": {
          "mathItalicization": true,
          "textTypes": {
            "Label": {
              "font-family": "\"Times New Roman\", serif",
              "font-size": 16,
              "font-weight": "normal"
            },
            "Caption": {
              "font-family": "\"Arial\", sans-serif",
              "font-size": 12
            },
            "Measurement": {
              "font-family": "\"Times New Roman\", serif",
              "font-size": 16
            },
            "Action": {
              "label": {
                "font-family": "\"Arial\", sans-serif",
                "font-size": 14
              }
            },
            "Table": {
              "font-family": "\"Arial\", sans-serif",
              "font-size": 12
            },
            "AxisTicksAndOptionalLabel": {
              "font-family": "\"Arial\", sans-serif",
              "color": "rgb(160,160,160)"
            }
          }
        },
        "limitScrolling": true
      },
      "objects": {
        "1": {
          "kind": "Expression",
          "genus": "DistanceParameter",
          "constraint": "Free",
          "geom": {
            "loc": {
              "x": 217,
              "y": 11
            }
          },
          "expressionType": "UniMeasure_ExprType",
          "expression": "8 pixels",
          "label": "radius",
          "style": {
            "precision": 0,
            "nameOrigin": "namedFromLabel",
            "contenteditable": true,
            "selectable": false
          }
        },
        "2": {
          "kind": "Point",
          "genus": "Point",
          "constraint": "Free",
          "geom": {
            "loc": {
              "x": 16.97259026127267,
              "y": 17.95327259741876
            }
          },
          "label": "?",
          "style": {
            "hidden": true,
            "color": "rgb(47,221,219)"
          }
        },
        "3": {
          "kind": "Circle",
          "genus": "Circle",
          "parents": {
            "p0": "2",
            "radius": "1"
          },
          "constraint": "CircleByRadius",
          "label": "c[1]",
          "style": {
            "hidden": true,
            "color": "aqua",
            "label": {
              "showLabel": true,
              "labelOffsetX": 4,
              "labelOffsetY": 0,
              "labelParam": 0.875000000000002
            },
            "line-style": "dashed"
          }
        },
        "4": {
          "kind": "Point",
          "genus": "PlottedPoint",
          "parents": {
            "path": "3"
          },
          "value": 0.25,
          "constraint": "PlotFixedValueOnPath",
          "label": "A",
          "style": {
            "hidden": true
          }
        },
        "5": {
          "kind": "Text",
          "genus": "Caption",
          "constraint": "Free",
          "geom": {
            "loc": {
              "x": 273,
              "y": 93
            }
          },
          "textMFS": "<VL<T'?'>>",
          "style": {
            "font-size": 18,
            "selectable": false
          }
        },
        "6": {
          "kind": "Text",
          "genus": "CompositeText",
          "parents": {
            "p0": "2",
            "text": "5"
          },
          "constraint": "Pegged",
          "latentVisibility": true,
          "style": {
            "selectable": false
          }
        },
        "7": {
          "kind": "Measure",
          "genus": "ScalarMeasure",
          "parents": {
            "point": "4",
            "path": "3"
          },
          "constraint": "MeasurementValueOfPointOnPath",
          "geom": {
            "loc": {
              "x": 217,
              "y": 37
            }
          },
          "style": {
            "precision": 2,
            "nameOrigin": "namedFromTemplate",
            "selectable": false
          }
        },
        "8": {
          "kind": "Expression",
          "genus": "ScalarParameter",
          "constraint": "Free",
          "geom": {
            "loc": {
              "x": 217,
              "y": 62
            }
          },
          "expressionType": "UniMeasure_ExprType",
          "expression": "1.0931372312526",
          "label": "x",
          "style": {
            "precision": 2,
            "nameOrigin": "namedFromLabel",
            "contenteditable": true,
            "selectable": false
          }
        },
        "9": {
          "kind": "Button",
          "genus": "Action",
          "parents": {
            "0": "7",
            "1": "8"
          },
          "geom": {
            "loc": {
              "x": 152,
              "y": 15
            }
          },
          "label": "Move Parameter",
          "constraint": "ActionButtonMove",
          "messages": ["Move Parameter"],
          "shouldAutogenerateLabel": true,
          "rate": 0,
          "towardInitialDestination": true,
          "style": {
            "selectable": false
          }
        },
        "10": {
          "kind": "Point",
          "genus": "PlottedPoint",
          "parents": {
            "param": "8",
            "path": "3"
          },
          "constraint": "PlotValueOnPath",
          "style": {
            "hidden": true
          }
        },
        "11": {
          "kind": "Arc",
          "genus": "SimpleArc",
          "parents": {
            "circle": "3",
            "p0": "4",
            "p1": "10"
          },
          "constraint": "ArcOnCircle",
          "latentVisibility": true,
          "style": {
            "selectable": false
          }
        },
        "12": {
          "kind": "Button",
          "genus": "Action",
          "parents": {
            "0": "11",
            "1": "6",
            "2": "2"
          },
          "geom": {
            "loc": {
              "x": 152,
              "y": 72
            }
          },
          "label": "Hide Objects",
          "constraint": "ActionButtonHide",
          "messages": ["Hide Objects", "Show Objects"],
          "shouldAutogenerateLabel": true,
          "style": {
            "selectable": false
          }
        },
        "13": {
          "kind": "Button",
          "genus": "Action",
          "parents": {
            "0": "11",
            "1": "6"
          },
          "geom": {
            "loc": {
              "x": 152,
              "y": 34
            }
          },
          "label": "Show Objects",
          "constraint": "ActionButtonShow",
          "messages": ["Show Objects", "Hide Objects"],
          "shouldAutogenerateLabel": true,
          "style": {
            "selectable": false
          }
        },
        "14": {
          "kind": "Button",
          "genus": "Action",
          "parents": {
            "0": "8"
          },
          "geom": {
            "loc": {
              "x": 152,
              "y": 53
            }
          },
          "label": "Animate Parameter",
          "constraint": "ActionButtonAnimate",
          "messages": ["Animate Parameter"],
          "animationStates": [{
              "rate": 1,
              "timeInterval": 1.7000000476837158,
              "repeat": false,
              "motionType": "forward",
              "lowerParamBound": 0.25,
              "upperParamBound": 1.25,
              "discrete": false
            }
          ],
          "style": {
            "selectable": false
          }
        },
        "15": {
          "kind": "Button",
          "genus": "Action",
          "parents": {
            "0": "9",
            "1": "13",
            "2": "14",
            "3": "12"
          },
          "geom": {
            "loc": {
              "x": 152,
              "y": 93
            }
          },
          "label": "Show",
          "constraint": "ActionButtonPresentSequentially",
          "messages": ["Show"],
          "waitTime": 0,
          "style": {
            "selectable": false
          }
        },
        "16": {
          "kind": "Point",
          "genus": "Point",
          "constraint": "Free",
          "geom": {
            "loc": {
              "x": -1,
              "y": 1
            }
          },
          "style": {
            "hidden": true
          }
        },
        "17": {
          "kind": "Button",
          "genus": "Action",
          "parents": {
            "0": "16"
          },
          "geom": {
            "loc": {
              "x": 152,
              "y": 113
            }
          },
          "label": "Scroll",
          "constraint": "ActionButtonScroll",
          "messages": ["Scroll"],
          "shouldAutogenerateLabel": true,
          "scrollDest": "topLeft",
          "style": {
            "selectable": false
          }
        }
      }
    }
  ]
};
