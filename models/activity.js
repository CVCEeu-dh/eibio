/*
  Model: Activity
  ===============
  
  Each Activity has a distinct slug.
  Rules:
  (entity:person)-[:employed_as]->(activity)
  (entity:institution)-[:appears_in]->(activity)
  
  That is, we can say that a person is unique by checking its neo4J label and its slug.
  The previous doi has been preserved for migration purposes.
  Its json representation should be at least:
  
  { 
    slug: 'england-master-and-commander',
    languages: ['en', 'fr'],
    description_en: 'Master and commander - The Far side of the World (1980-1987)',
    description_fr: 'Master & Commander : de l'autre côté du monde (1980-1987)'
    country: 'ITA'
  }
  
  Country MUST be provided as ISO 3166 alpha 3 country code.
  
  (entity:person)-[:employed_as] relationship has at least: {
    start_time:
    start_date:
    end_time: 
    end_date:
  }
  
  Activities can be related to institution, tags and other entities.
*/

var settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    ISO_CODES = require('../ISO_3166-1'),
    neo4j     = require('seraph')(settings.neo4j.host),
    queries   = require('decypher')('./queries/activity.cyp'),
    
    _         = require('lodash');



module.exports = {
  /*
    Require as properties:
    person, description_en, description_fr, country
    Country NUST be provided as 3 letters ISO 3166 country code.
  */
  merge: function(properties, next) {
    var now = helpers.now(),
        query = helpers.cypher.query(queries.merge_activity, properties);
    
    neo4j.query(queries.merge_activity, {
      slug: helpers.extract.smartSlug(properties.description_en + ' ' + properties.country),
      person_slug:    properties.person.slug,
      description_en: properties.description_en,
      description_fr: properties.description_fr,
      country:        properties.country,
      start_date:     +properties.start_date,
      start_time:     +properties.start_time,
      end_date:       +properties.end_date,
      end_time:       +properties.end_time, 
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
  
  remove: function(activity, next) {
    neo4j.query(queries.remove_activities, {
      slug: activity.props.slug
    }, function (err, node) {
      if(err) {
        next(err);
        return;
      }
      next(null);
    })
  }
};