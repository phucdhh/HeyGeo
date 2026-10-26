/**
 * @fileOverview Localization Utilities
 * @author <a href="mailto:kswenson@kcptech.com">Kirk Swenson</a>
 * @version 0.0
 * @preserve Copyright © 2014 KCP Technologies, Inc. All rights reserved.
 */
/**
 * The GSP.Locale object contains localization utilities.
 *
 *  It is initially empty, but can be filled with a set of locales keyed by
 *  language code (e.g. GSP.Locale.locales['en'] = { ... }) and possibly
 *  country code (e.g. GSP.Locale.locales['en-GB'] = {...}) or perhaps
 *  (GSP.Locale.locales['en'].countries['GB'] = {...}). For now we start
 *  simple and assume a simple language model.
 *
 *  Clients should simply use GSP.Locale.current which is a {key,value} map
 *  where the keys are the localizable string keys (e.g. 'GSP.Error.invalidSketch')
 *  and the values are the localized strings for the particular locale, e.g.
 *  "Error: The specified sketch is empty or invalid."
 *
 */
GSP.Locale = (function() {

  return {
  
    current: null,
  
    locales: {
    }
  
  };
})();
