/*
  Model: Nationality
  ==================
  
  Each Nationality has a distinct slug that MUST correspond to ISO 3166-1 alpha3 code
  or to ISO 3166-3 alpha3 code (up to 4 letters for old countries)...
  
  Rules:
  (entity:person)-[:has_nationality]->(nationality)
  
  Its json representation should be at least:
  
  { 
    slug: 'PRC',
    name: 'chinese',
    name_en: 'chinese',
    name_fr: 'chinois'
    country: 'PRC'
  }
  
  (entity:person)-[:has_nationality] relationship MAY HAVE: {
    start_time: int<epoch ms>
    start_date: int<YYYY>
    end_time:   int<epoch ms>
    end_date:   int<YYYY>
    caption:    string
  }
  
*/

var settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    ISO_CODES = require('../ISO_3166-1'),
    neo4j     = require('seraph')(settings.neo4j.host),
    queries   = require('decypher')('./queries/nationality.cyp'),
    
    _         = require('lodash');



module.exports = {
  /*
    Require as properties:
    person, description_en, description_fr, country
    Country NUST be provided as 3 letters ISO 3166 country code.
  */
  merge: function(properties, next) {
    var now = helpers.now(),
        query = helpers.cypher.query(queries.merge_nationality, properties);

    neo4j.query(query, {
      slug:         properties.country,
      person_slug:  properties.person.slug,
      country:      properties.country,
      caption:      properties.caption || '',
      start_date:   properties.start_date,
      start_time:   properties.start_time,
      end_date:     properties.end_date,
      end_time:     properties.end_time, 
      creation_date:  now.date,
      creation_time:  +now.time
    }, function (err, node) {
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
  
  remove: function(nationality, next) {
    neo4j.query(queries.remove_nationality, {
      slug: nationality.props.slug
    }, function (err, node) {
      if(err) {
        next(err);
        return;
      }
      next(null);
    })
  }
};