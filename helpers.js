'use-strict';
/*
  Helpers file
*/
var fs       = require('fs'),
    path     = require('path'),
    async    = require('async'),
    settings = require('./settings'),
    services = require('./services'),
    
    xml      = require('xml2js'),
    _        = require('lodash'),
    
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
  dbpedia:{
    lookup: function (query, next) {
      services.dbpedia.lookup({
        query: query
      }, function (err, wiki) {
        if(err) {
          next(err);
          return;
        }
        if(_.isEmpty(wiki.results)) {
          next(IS_EMPTY);
          return;
        }
        next(null, wiki.results);
      });
    },
  },
  /*
    Some text extractor
  */
  extract: {
    /**/
    years: function(text) {
      var spans = text.replace('–', '-').match(/(\d{4}[\d\;\-\s]*)/) // match parenthesis ()
      if(!spans)
        return [];
      return spans[spans.length - 1].split(';').map(function (couple) {
        return couple.split('-').map(function(di) {
          return +_.first(di.match(/\d+/));
        })
        
      });
    },
    entities: function(text, next) {
      console.log('entities', text.length)
      services.yagoaida.disambiguate({
        text: text
      }, function (err, entities) {
        if(err)
          next(err);
        next(null, entities);
      })
    }
  }
};