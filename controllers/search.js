/**

  API Controller for search purposes
  ===
  Note: this controller hasn't any model attached.
*/
var settings   = require('../settings'),
    helpers    = require('../helpers'),
    validator  = require('../validator'),
    
    async      = require('async'),
    _          = require('lodash'),
    
    neo4j      = require('seraph')(settings.neo4j.host),
    queries    = require('decypher')('./queries/search.cyp');
    
// transform a query into a valid regexp
var prepare = function(query) {
  return ['(?i).*', query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"),'.*'].join('')
};
  
module.exports = function(io) {

  return {
    fuzzy: function(req, res) {
        
        
    },
    suggest: function(req, res) {
      var form = validator.request(req, {
        limit: 10,
        offset: 0,
        q: ''
      });
      
      if(!form.isValid)
        return helpers.models.formError(form.errors, res);
      
      var q = prepare(form.params.q);
      async.parallel({
        count_suggest: function(callback) {
          neo4j.query(queries.count_suggest, {
            query: q
          }, function (err, result) {
            if(err)
              return callback(err);
            callback(null, result.total_count);
          })
        },
        get_suggest: function(callback) {
          neo4j.query(queries.get_suggest, {
            query: q,
            limit: form.params.limit,
            offset: form.params.offset
          }, function (err, suggestions) {
            if(err)
              return callback(err);
            callback(null, suggestions.map(function (d) {
              d.uri = d.type + '/' + d.slug
              return d;
            }));
          })
        }
      }, function (err, results) {
        if(err)
          return helpers.models.cypherQueryError(err, res);
        return helpers.models.getMany(err, res, results.get_suggest, {
          total_count: results.count_suggest,
          params: _.assign(form.params, {
            regexp: q
          })
        })
      })
      
    },
    lookup: function(req, res) {
      
    }
  }
}