'use-strict';
/*
  Helpers file
*/
var fs       = require('fs'),
    csv       = require('csv'),
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
  
  /*
    helpers for express API response (cfr. models/)
    @param err
    @param res    - express response
    @param items  - array of items to return
    @param params - the validated params describing the result
    
  */
  models:{
    getOne: function (err, res, item, info) {
      if(err == IS_EMPTY)
        return res.error(404);
      if(err)
        return module.exports.models.cypherQueryError(err, res);
      return res.ok({
        item: item
      }, info || {});
    },
    getMany: function (err, res, items, info) {
      if(err && err != IS_EMPTY)
        return module.exports.models.cypherQueryError(err, res);
      
      var response = {
            items: items || []
          },
          _info = {};
      
      if(info.item)
        response.item     = info.item ;
      if(info.params)
        _info.params      = info.params;
      if(info.warnings)
        _info.warnings    = info.warnings;
      if(info.total_count !== undefined)
        _info.total_count = info.total_count;
      return res.ok(response, _info);
    },
    /**
      Handle Form errors (Bad request)
    */
    formError: function(err, res) {
      return res.error(400, err);
    },
    /**
      Handle causes and stacktraces provided by seraph Query and rawQuery.
      @err the err OBJECT provided by cypher
      @res the express response object
    */
    cypherQueryError: function(err, res) {
      // for(i in err)
      //   console.log(i)
      // console.log('@helpers.cypherQueryError', err.neo4jException, err.statusCode, err.neo4jCause)
      switch(err.neo4jException) {
        case 'EntityNotFoundException':
          return res.error(404, {
            message:  err.neo4jCause.message,
            exception: err.neo4jException
          });
        default:
          return res.error(err.statusCode, err);
      };
    }
  
  }, 
  
  /**
    Call dbpedia lookup service and translate its xml to a more human json content
    @to be tested, ideed
  */
  dbpedia:{
    lookup: function (options, next) {
      services.dbpedia.lookup(options, function (err, wiki) {
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
   /**
    Call yagoaida neo4j service for people/place/institution reconciliation.
    If there are no entities, res will contain an empty array but no error will be thrown.
    @return err, res
   */
  yagoaida: function (options, next) {
    //console.log(options.contents);
    services.yagoaida.disambiguate({
      text: options.contents
    }, function (err, candidates) {
      if(err) {
        next(err)
        return
      }
      console.log(candidates);
      next(null, candidates);
    })
  },
  /*
    Some cypher extractor
  */
  cypher: {
    
    query: function(cypherQuery, filters) {
      var _concatenate = false,
          methods = {
            lt: '<=',
            gt: '>=',
            slt: '<', 
            sgt: '>',
            equals: '=',
            differs: '<>',
            pattern: '=~', // MUST be replaced by a neo4j valid regexp.
            
            ID: 'id(node) ='
          };
      
      return cypherQuery
          .replace(/[\n\r]/g, ' ')
          .replace(/\{if:([a-zA-Z_]+)\}((?:(?!\{\/if).)*)\{\/if\}/g, function (m, item, contents) {
            // replace if template.
            // console.log(arguments)
            if(filters[item])
              return module.exports.cypher.query(contents, filters);
            else 
              return '';
          })
          .replace(/\{each:([a-zA-Z_]+)\sin\s([a-zA-Z_]+)\}((?:(?!\{\/each).)*)\{\/each\}/g, function (m, item, collection, contents) {
            // replace loop {each:language in languages} {:title_%(language)} = {{:title_%(language)}} {/each} with join.
            // produce something like
            // title_en = {title_en}, title_fr = {title_fr}
            // which should be cypher compatible.
            // This function call recursively cypher.query() 
            var template = [];
            for(var i in filters[collection]) {
              var f = {};
              f[item] = filters[collection][i];
              template.push(module.exports.cypher.query(contents, f));
            }
            return template.join(', ');
          })
          .replace(/\{:([a-z_A-Z%\(\)\s]+)\}/g, function (m, placeholder) {
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
            var chunk = '',
                segments = [
                  node + '.' + property,
                  methods[method],
                  filters[property]
                ];
            
            if(!methods[method])
              throw method + ' method is not available supported method, choose between ' + JSON.stringify(methods);
              
            if(!filters[property])
              return '';
            
            if(method == 'ID')
              segments = [methods[method].replace('node', node), filters[property]];
            
            if(_concatenate && operand == undefined)
              _concatenate = false; // start with WHERE
            
            
            if(!_concatenate)
              chunk = ['WHERE'].concat(segments).join(' ') 
            else 
              chunk = [operand].concat(segments).join(' ');
            
            _concatenate = true;
            return chunk;
          })
    },
  },
  
  CSV: {
    /*
      helper to print out a csv file, to be used in a waterfall, with err.
      require as options
        filepath
        records
        fields
    */
    stringify: function(options, next) {
      csv.stringify(options.records, {
        delimiter: options.delimiter || '\t',
        columns:   options.fields,
        header:    true
      }, function (err, data) {
        fs.writeFile(options.filepath,
           data, function (err) {
          if(err) {
            next(err);
            return
          }
          next(null, options.filepath);
        })
      });
    }
  },
  
  now: function() {
    var now = moment.utc(),
        result = {};
    
    result.date = now.format();
    result.time = +now.format('X');
    return result;
  },
  extract:{
    slug: function(text) {
      return text.toLowerCase()
        .replace(/[^a-z]/g, '-')
        .replace(/-{1,}/g,'-')
        .replace(/-$/,'')
        .replace(/^-/,'')
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
      var spans = text.split(/[–‒]/).join("-").match(/(\d{4}[\d\;\,\-\s]*)/g) // match parenthesis ()
      // console.log(spans)
      if(!spans)
        return [];
      var results = [];
      
      spans.forEach(function (matching) {
        results = results.concat(matching.split(/[;,]/g).map(function (couple) {
          return couple.split('-').map(function(di) {
            return +_.first(di.match(/\d+/));
          });
        }));
        // console.log(results)
      });
      return results;
      // return spans[spans.length - 1].split(/[;,]/g).map(function (couple) {
      //   return couple.split('-').map(function(di) {
      //     return +_.first(di.match(/\d+/));
      //   })
        
      // });
    },
    dates: function(text, format, strict, round) {
      var _d = moment.utc(text, format, strict);
        
      if(_d.isValid()) {
        if(round)
          _d.set({
            'hour': 0,
            'minute': 0,
            'second': 0,
            'millisecond': 0
          })
        return {
          date: _d.format(format),
          time:  +_d.format('X'),
        }
      }
      else return false;
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