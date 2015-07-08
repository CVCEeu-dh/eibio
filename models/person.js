/*
  Model: Person
  =============
  
  A Person is a sub type of an Entity. Each person is qualified with a distinct slug.
  That is, we can say that a person is unique by checking its neo4J label and its slug.
  The previous doi has been preserved for migration purposes.
  Its json representation should be at least:
  
  { 
    slug: 'simone-veil',
    first_name: 'Simone',
    last_name: 'Veil',
    name: 'Simone Veil',
    doi: '',
    birth_date: '1927-07-13',
    birth_time: '-1355961180',
    birth_place: 'Nice, Provence, France',
    thumbnail: 'http://commons.w..',
    viaf_id: '120689047',
    wiki_id: 'Simone_Veil'
    languages: [ 'en' ],
    abstract_en: '...'
  }
  
*/
var settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    
    neo4j     = require('seraph')(settings.neo4j.host),
    queries   = require('decypher')('./queries/person.cyp'),
    
    _         = require('lodash');



module.exports = {
  merge: function(properties, next) {
    var now = helpers.now(),
        query = helpers.cypher.query(queries.merge_person, properties);
    
    neo4j.query(query, _.assign(properties, {
      creation_date: now.date,
      creation_time: now.time
    }), function (err, node) {
      if(err) {
        next(err);
        return;
      }
      if(!node.length) {
        next(helpers.IS_EMPTY);
        return;
      }
      next(null, node[0]);
    })
  },
  
  remove: function(person, next) {
    neo4j.query(queries.remove_person, {
      slug: person.slug
    }, function (err, node) {
      if(err) {
        next(err);
        return;
      }
      next(null);
    })
  }
};