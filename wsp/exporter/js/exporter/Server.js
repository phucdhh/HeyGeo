/* exported Server */
var Server = (function() {
  "use strict";

  var module = {};

  module.parseServerResponse = function(responseJSON) {
    var response,
        result = { sketchObj: null };
    try {
      response = $.parseJSON(responseJSON);
      if (!response.status) {
        throw new Error("It is valid json, but not a valid Sketch JSON.");
      }
      if (response.status === 'failed') {
        result.message = response.message;
      }
      else {
        result.sketchObj = response.document;
      }
    } catch (e) {
      console.log(e);
      result.message = "An Error Occurred";
    }
    return result;
  };


  module.convertGSP = function(options) {
    var file = options.file,
        onSuccess = options.onSuccess,
        onError = options.onError,
        onUnknownError = options.onUnknownError,
        converterURL = options.converterURL || "./exporter/convert.php",
        xhr = new XMLHttpRequest(),
        initialize = options.initialize || function () {},
        fd = new FormData();

    initialize();
    
    fd.append('gsp-file', file);

    xhr.open("POST", converterURL, true);

    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          onSuccess(xhr.response);
        } else if (xhr.status === 404 || (xhr.status >= 500 && xhr.status < 600)) {
          onError(xhr.status);
        } else {
          onUnknownError();
        }
      }
    };
    // Initiate a multipart/form-data upload
    xhr.send(fd);
  };

  return module;
})();
