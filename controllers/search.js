/**

  API Controller for search purposes
  ===
  Note: this controller hasn't any model attached.
*/
var settings   = require('../settings'),
    helpers    = require('../helpers'),
    services   = require('../services'),
    validator  = require('../validator'),
    
    async      = require('async'),
    _          = require('lodash'),
    
    neo4j      = require('seraph')(settings.neo4j.host),
    queries    = require('decypher')('./queries/search.cyp');
    
// transform a query into a valid regexp
var prepare = function(query) {
  return ['(?i).*', query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"),'.*'].join('')
};

// given a querystring, retun the correct lucene syntax
// replace spaces with AND clause, comma with OR
// e.g it should tranform query "winston churc" in "'name_search:*winston* AND name_search:*churc*'"
var lucene = function(query) {
  return 'name_search:' + query.split(' ').map(function(d){
    return '*' + d + '*'
  }).join(' AND name_search:');
}
  
module.exports = function(io) {

  return {
    /*
      viaf autosuggest (no remote cross orgiign in viaf api ...)
    */
    viaf: {
      autosuggest: function(req, res) {
        var form = validator.request(req, {
          limit: 10,
          offset: 0,
          q: ''
        });
        if(!form.isValid)
          return helpers.models.formError(form.errors, res);
        services.viaf.autosuggest({
          query: form.params.q
        }, function (err, result){
          if(err)
            res.error();
          else
            res.ok({
              items: result.result
            },form.params);
        })
      }
    },

    /*
      Distill.
      By using viaf api and dbpedia identifier

      1) viaf: load all the relative links (viaf links api)
      2) dbpedia: load dbpedia data
      3) check if a matching person is already available

    */
    distill: function(req, res) {
      var form = validator.request(req);


      async.parallel({
        viaf: function(callback) {
          if(!form.params.viaf_id) {
            callback(null, {});
            return;
          }
          // console.log(form.params.viaf_id)
          services.viaf.links({
            link: form.params.viaf_id
          }, callback);
        },

        dbpedia: function(callback) {
          if(!form.params.wiki_id) {
            callback(null, {});
            return;
          }

          services.dbpedia.data({
            link: form.params.wiki_id
          }, function (err, wiki) {
            if(err) {
              callback(err);
              return;
            };
            if(_.size(wiki) == 0) {
              callback(null, {});
              return;
            };
            var languages = [],
                props = {
                  thumbnail:   'http://dbpedia.org/ontology/thumbnail',
                  birth_date:  'http://dbpedia.org/property/dateOfBirth',
                  death_date:  'http://dbpedia.org/property/dateOfDeath',
                  birth_place: 'http://dbpedia.org/property/placeOfBirth',
                  death_place: 'http://dbpedia.org/property/placeOfDeath',
                  description: 'http://dbpedia.org/property/shortDescription',
                  abstracts:   'http://dbpedia.org/ontology/abstract',
                  first_name:  'http://xmlns.com/foaf/0.1/givenName',
                  last_name:   'http://xmlns.com/foaf/0.1/surname'
                };
            // find fields and complete the properties dict
            _.forIn(props, function (v, k, o) {
              o[k] = _.flattenDeep(_.compact(_.pluck(wiki, v)))
              if(k != 'abstracts')
                o[k] =_.first(o[k]);
            });
            // find  abstracts for specific languages
            _.filter(props.abstracts, function(d) {
              if(d.lang && settings.languages.indexOf(d.lang) !== -1) {
                props['abstract_' + d.lang] = d;
                languages.push(d.lang);
              }
            })
            // delete the big useless abstracts
            delete props.abstracts;
           
            // extract the juice and clean undefined
            _.forIn(props, function (v, k, o) {
              if(o[k] === undefined) {
                delete o[k];
              } else if(o[k].datatype == 'http://www.w3.org/2001/XMLSchema#date') {
                var _k = k.split('_').shift(),
                    _date = helpers.reconcileDate(v.value, 'YYYY-MM-DD'); // new k
                delete o[k];
                for(var i in _date){
                  o[_k + '_' + i] = _date[i]
                }
              } else {
                o[k] = v.value;
              }
            });
            //console.log(props)
            // abstract languages
            props.languages = _.unique(languages); 
            callback(null, props);
          });
        },

        eibio: function(callback) {
          if(!form.params.viaf_id && !form.params.wiki_id)
            callback(null, {});
          else
            neo4j.query(queries.get_identified_node, {
              viaf_id: form.params.viaf_id || '',
              wiki_id: form.params.wiki_id || ''
            }, function (err, nodes) {
              if(err) {
                callback(err);
              } else {
                var n = _.first(nodes);
                callback(null, n || {});
              }
            });
           
        }
      }, function (err, results) {
        if(err)
          res.error();
        else
          res.ok(results, form.params);
      })

    },

    /*
      Proper search method
    */
    
    suggest: function(req, res) {
      var form = validator.request(req, {
        limit: 10,
        offset: 0,
        q: ''
      });
      
      if(!form.isValid)
        return helpers.models.formError(form.errors, res);
      
      var q = lucene(form.params.q);
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
          params: _.assign({}, form.params, {
            lucene: q
          })
        })
      })
      
    },
    lookup: function(req, res) {
      
    }
  }
}