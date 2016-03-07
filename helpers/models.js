'use-strict';
/*
  Helpers for model scripts. 
  ===
  Common flow for rest API (e.g, get a list of items and get total_count)
  They require a options.suffix for some
*/
var settings = require('../settings'),
    helpers  = require('../helpers'),
    async    = require('async'),
    neo4j    = require('seraph')(settings.neo4j.host);
    
    
module.exports = {
  /*
    Usage in models/*.js scripts:
    var models  = require('../helpers/models'),
        queries = require('decypher')('./queries/activity.cyp')
    ...
    module.exports: {
      getMany: function(params, next) {
        models.getMany({
          queries: {
            items: queries.get_activities,
            total_count: queries.count_activities
          },
          params: params
        }, function (err, results) {
          if(err)
            next(err)
          else
            next(null, results);
        });
      }
    }
  */
  getMany: function(options, next) {
    async.parallel({
      total_count: function (callback) {
        var query = helpers.cypher.query(options.queries.total_count, options.params);
        neo4j.query(query, options.params, function (err, result) {
          if(err)
            return callback(err);
          callback(null, result[0].total_count)
        })
      },
      items: function (callback) {
        var query = helpers.cypher.query(options.queries.items);
        neo4j.query(query, options.params, function (err, nodes) {
          if(err)
            return callback(err);
          callback(null, nodes);
        });
      }
    }, function (err, results) {
      if(err)
        next(err);
      else
        next(null, results);
    });
  }
}