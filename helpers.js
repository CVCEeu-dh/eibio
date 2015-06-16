'use-strict';
/*
  Helpers file
*/
var fs       = require('fs'),
    path     = require('path'),
    async    = require('async'),
    settings = require('./settings'),
    services = require('./services'),
    
    xml        = require('xml2js'),
    
    IS_EMPTY = 'is_empty',
    LIMIT_REACHED = 'LIMIT_REACHED', // when limit of request for free /pauid webservices has been reached.
    IS_IOERROR  = 'IOError';
    
module.exports = {
  IS_EMPTY: IS_EMPTY,
  IS_IOERROR: IS_IOERROR,
  IS_LIMIT_REACHED: LIMIT_REACHED,
  
  /**
    Call dbpedia lookup service and translate its xml to a more human json content
    @to be tested, ideed
  */
  lookup: function (query, next) {
    services.dbpedia.lookup({
      query: query
    }, function (err, wiki) {
      if(err) {
        next(err);
        return;
      }

      xml.parseString(wiki, function (err, result) {
        if(err) {
          next(err); // this should never happen /D
          return;
        }

        if(!result || !result.ArrayOfResult || !result.ArrayOfResult.Result) {
          next(IS_EMPTY);
          return;
        }
        next(null, result.ArrayOfResult.Result);
      });
    });
  }
};