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
    moment   = require('moment'),
    
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
    Some cypher extractor
  */
  cypher: {
    query:function(cypherQuery, filters) {
      var _concatenate = false,
          methods = {
            lt: '<=',
            gt: '>=',
            slt: '<', 
            sgt: '>',
            equals: '=',
            differs: '<>',
            pattern: '=~' // MUST be replaced by a neo4j valid regexp.
          };
      
      
      return cypherQuery
        // .replace(/\{each:([a-zA-Z_])\sin\s([a-zA-Z_])(.*){\\each}/g, function (m, item, collection, repeater) {
        //   // replace each loop {each:language in languages} .. {/each} with join. the variable will be used.
        //   // return something that has to be replaced later.
        //   return filters[collection].map(function (d) {
        //     return repeater
        //   }).join(' ');
        // })
        .replace(/\{:([a-z_A-Z%\(\)\s]+)\}/g, function (m, placeholder){
          // replace dynamic variables, e.g to write ent.title_en WHERE 'en' is dynaically assigned,
          // write as query
          // ent.{sub:title_%(language) % language}
          // and provide the filters with language
          return placeholder.replace(/%\(([a-z_A-Z]+)\)/g, function (m, property) {
            return filters[property]
          });
        })
        .replace(/\{(AND|OR)?\?([a-z_A-Z]+):([a-z_A-Z]+)__([a-z_A-Z]+)\}/g, function (m, operand, node, property, method) {
          // replace WHERE clauses
          var chunk = '';
          
          if(!methods[method])  
            throw method + ' method is not available supported method, choose between ' + JSON.stringify(methods);
          
          if(!filters[property])
            return '';
          
          if(_concatenate && operand == undefined)
            _concatenate = false; // start with WHERE
          
          if(!_concatenate)
            chunk = ['WHERE', node + '.' + property, methods[method], filters[property]].join(' ') 
          else 
            chunk = [operand, node + '.' + property, methods[method], filters[property]].join(' ');
          
          _concatenate = true;
          return chunk;
        })
    },
  },
  
  extract:{
    slug: function(text) {
      return text.toLowerCase()
        .replace(/[^a-z]/g, '-')
        .replace(/-{1,}/g,'-')
        .replace(/-$/,'')
        .split('-')
        .sort()
        .join('-');
    },
    smartSlug: function(text) {
      var from = 'àáäâèéëêìíïîòóöôùúüûñç',
          to   = 'aaaaeeeeiiiioooouuuunc',
          text = text.toLowerCase();
          
      for (var i=0, l=from.length ; i<l ; i++) {
        text = text.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
      }
      
      return text.toLowerCase()
        .replace(/[^a-z]/g, '-')
        .replace(/-{1,}/g,'-')
        .replace(/-$/,'')
        .replace(/^-/, '');
    },
    /**/
    years: function(text) {
      var spans = text.replace('–', '-').match(/(\d{4}[\d\;\,\-\s]*)/) // match parenthesis ()
      if(!spans)
        return [];
      return spans[spans.length - 1].split(/[;,]/g).map(function (couple) {
        return couple.split('-').map(function(di) {
          return +_.first(di.match(/\d+/));
        })
        
      });
    },
    dates: function(text, format) {
      var _d = moment.utc(text, format);
      return {
        date: _d.format(format),
        time:  _d.format('X'),
      }
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