/* exported WSPTest */
var WSPTest = (function() {
  "use strict";

  var module = {
    view:null
  };

  module.escapeHTML = function( s ) {
    return String(s).replace(/&/g,'&amp;')
      .replace(/</g,'&lt;').replace(/>/g,'&gt;');
  };

  module.buildTestSummary = function (sketch, sketchId) {
    var results = {compare: {}, unsupportedObjects: {}};

    var sketchSupport = GSP.Sketch.supportCheck(sketch.spec);
    if (sketchSupport.support !== 'full') {
      results.unsupportedObjects = GSP.Sketch.supportCheck(sketch.spec);
    }
    results.compare = sketch.verifyFromSpec();

    return results;
  };

  /**
   * This utilities assembles a message from a report of verification
   * of sketch calculations based on GSP exported debug data.
   *
   * @param sketch
   * @param report
   * @return {string}
   */
  module.assembleVerifyMessage = function (sketch, report) {
    var message = "",
      failMessages = [ ], m, gobj;

    if( !report.success) {
      for(m in report.failures) {
        gobj = sketch.sQuery().get(m);

        failMessages.push('<div class="utest-item">"' + m + '" [' +
          [gobj.kind, gobj.constraint, gobj.genus].join('/') + ']: '
          + report.failures[m] + '</div>');
        }
        message += failMessages.join("");
    } else {
        message = '<span class="expected">Success</span>';
    }

    return message;
  };

  /**
   * This utility creates a message from a report of unsupported kinds
   * and constraints
   *
   * @param sketchSupport
   * @returns {string}
   */
  module.assembleSupportMessage = function (sketchSupport) {
    var message = "",
      id,
      unsupportList = [],
      unknownId,
      failureReasonList;

    if( sketchSupport.support !== 'full') {
      for(id in sketchSupport.unsupported) {
        failureReasonList = [];
        for(unknownId in sketchSupport.unsupported[id]) {
          failureReasonList.push(sketchSupport.unsupported[id][unknownId]);
        }
        unsupportList.push( '"' + id + '": ' +
          failureReasonList.join(", "));
      }
      message += unsupportList.join("; ");
    }
    return message;
  };
  /**
   * Constructor for RunStats objects. These objects record and report
   * statistics for the quick test operation.
   *
   * @param el
   * @returns {*}
   */
  module.runStats = function (el) {
    var rs = Object.create(module.RunStatsPrototype);
    rs.stats = {};
    rs.logs = {};
    rs.el = el;
    return rs;
  };


  /**
   * Methods for RunStats object
   * The RunStats object facilitates the collection and display of
   * summary statistics. It is used by the quick test module.
   *
   */
  module.RunStatsPrototype = {
    /* clear the statisics object */
    clear: function() {
      this.stats = {};
      this.updateDisplay();
    },
    /* set the value of a property */
    set: function(prop, value){
      this.stats[prop] = value;
      this.updateDisplay();
    },
    /* get the value of a property */
    get: function(prop) {
      return this.stats[prop];
    },
    /* start a timer property */
    startTimer: function(prop) {
      this.stats[prop] = {
        begin: $.now(),
        toString: function() {
          return (this.end)?String(this.end-this.begin) + 'ms'
            : 'in progress'; }
      };
    },
    /* stop a timer property and record its interval */
    stopTimer: function(prop) {
      this.stats[prop].end = $.now();
      this.updateDisplay();
    },
    /* increment a counter property */
    increment: function(prop, count) {
     var incr = 1;
     if (typeof count !== "undefined") {
       incr = count;
     }
     if (typeof this.stats[prop] !== 'number') {
       this.stats[prop] = incr;
     } else {
       this.stats[prop] += incr;
     }
     this.updateDisplay();
    },
    /* add to a queue of log items */
    log: function(prop, item) {
     if (typeof this.logs[prop] === "undefined") {
       this.logs[prop] = [];
     }
     this.logs[prop].push(item);
    },
    /* updates the display of run statistics */
    updateDisplay: function() {
      var el = this.el, table;
      el.empty();
      table = $('<table class="ss-report"/>').appendTo(el);
      $.each(this.stats, function(k,v) {
        table.append('<tr><td>'+k+'</td><td>'+v+'</td></tr>');
      });
      $.each(this.logs, function(k,v) {
        table.append('<tr><td>' + k + '</td><td>'+v+'</td></tr>');
      });
    }
  };

  module.setView = function($view) {
    module.view = $view;
  };

  return module;
}());