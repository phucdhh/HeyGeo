/**
 * @fileOverview String Localization Utilities
 * @author <a href="mailto:kswenson@kcptech.com">Kirk Swenson</a>
 * @version 0.0
 * @preserve Copyright © 2011 KCP Technologies, Inc. All rights reserved.
 */
/**
 * The GSP.Strings module provides a set of string utilities that support
 * parameter replacement and localization. Current functionality is preliminary
 * with further design work/thinking expected to refine the approach further.
 * The current approach is patterned after SproutCore's.
 *
 */
GSP.Strings = (function() {

  return {
  
    /**
     * Returns a new string formatted with appropriate replacement strings.
     * @param {String}  iFmt: format string with '%@' representing replacement targets
     * @param {Array}   iArgsArray: array of arguments used as replacements
     */
    format: function(iFmt, iArgsArray) {
      var str = iFmt,
          i, count = iArgsArray.length;
      if (str && count) {
        for (i = 0; i < count; ++i) {
          str = str.replace("%@", iArgsArray[i]);
        }
      }
      return str;
    },
  
    /**
     * Returns a formatted version of the specified format string with any
     * additional arguments beyond the format string used as replacements
     * for any replacement targets in the format string.
     * @param {String}  iFmt: format string with '%@' representing replacement targets
     * @param {...*} var_args: additional arguments used as replacement strings
     */
    fmt: function(iFmt) {
      var args = Array.prototype.slice.call(arguments, 1);
      return GSP.Strings.format(iFmt, args);
    },
    
    /**
     * Returns a formatted and localized version of the specified string key
     * with any additional arguments beyond the format string used as
     * replacements for any replacement targets in the format string.
     * @param {String}  iKey: key used to lookup localized string from current locale
     * @param {...*} var_args: additional arguments used as replacement strings
     */
    loc: function(iKey) {
      var args = Array.prototype.slice.call(arguments, 1),
          str = GSP.Locale.current && GSP.Locale.current[iKey];
      if (str) {
        str = GSP.Strings.format(str, args);
      }
      else if (str == null) {
        GSP.signalErrorWithMessage("Localized string " + iKey + " not found.", 
                                 "GSP.Error.localeStringNotFound");
          
        // Return the key in case of failure
        str = iKey;
      }
      return str;
    }
  
  };
})();
