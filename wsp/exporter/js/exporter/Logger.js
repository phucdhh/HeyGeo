/* global BrowserDetect */
/* exported Logger */
var Logger = (function() {
  "use strict";

  var module = {
    logQueue: []
  };

  module.setup = function() {
    module.clearQueue = setInterval(function() {
      if (module.logQueue.length > 0) {
        var logBatch = {logs:[]};
        for(var x= 0;x<20 && module.logQueue.length>0;x++) {
          logBatch.logs.push(module.logQueue[0]);
          module.logQueue.shift();
        }
        module.sendLogs(logBatch);
      }
    }, 5000);
  };

  module.setBuildNumber = function(buildNumber) {
    module.buildNumber = buildNumber;
  };

  module.logEvent = function(eventInfo) {
    var log = module.preprocessLogMessage(eventInfo);
    module.pushToLogQueue(JSON.stringify(log));
  };

  module.pushToLogQueue = function(log) {
    module.logQueue.push(log);
  };

  module.preprocessLogMessage = function(eventInfo) {
    //a note: encodeURIComponent does not properly encode single quote ' character.  this may lead
    //to injection issues later down the road.  keep this in mind.  may need further encoding, converting
    //the single quote to %27
    var message = {message: eventInfo.message,
                  filereference: (eventInfo.sketchName || ''),
                  browser_version: BrowserDetect.browser,
                  operating_system: BrowserDetect.OS,
                  build_number: module.buildNumber},
        date = new Date(),
        formattedDate = date.getFullYear() + '-' + ('0' + (date.getMonth()+1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2) + ' ' +
                    ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2) + ':' + ('0' + date.getSeconds()).slice(-2);
    message.browser_timestamp = formattedDate;
    message.page = eventInfo.page ? eventInfo.page : "N/A";
    return message;
  };

  module.sendLogs = function(logs) {
    $.ajax({
      url: 'exporter/logs/savelog.php',
      data: logs,
      type: 'POST'
    });
  };

  return module;
}());