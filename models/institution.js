/*
  Model: Institution
  ==================
  
  Each Institution has a distinct slug.
  Rules:
  (entity:Institution)-[:appears_in]->(activity)
  
  A json representation of an institution should be at least:
  
  { 
    name: 'European Parliament',
    slug: 'european-parliament',
    languages: ['en', 'fr'],
    name_en: 'European Parliament',
    name_fr: 'Parlement Europeen'
  }
  
  Optional but very important
  { 
    country: 'ITA',
    wiki_id : 'European_Parliament'
  }
  
  wiki_id is the last part of the http://dbpedia.org/resource/European_Parliament resource URI
  Country MUST be provided as ISO 3166 alpha 3 country code.
  
  (entity:person)-[:employed_as] relationship has at least: {
    start_time:
    start_date:
    end_time: 
    end_date:
  }
  
  Activities can be related to institution, tags and other entities.
*/

var path      = require('path'),
    settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    ISO_CODES = require('../ISO_3166-1'),
    neo4j     = require('seraph')(settings.neo4j.host),
    queries   = require('decypher')('./queries/institution.cyp'),
    
    _         = require('lodash');



module.exports = {
  /*
    Require as properties:
    name, name_en, name_fr
    Country NUST be provided as 3 letters ISO 3166 country code.
  */
  merge: function(properties, next) {
    var now = helpers.now(),
        query = helpers.cypher.query(queries.merge_institution, properties);
    
    neo4j.query(query, {
      slug: helpers.extract.smartSlug(properties.name_en + ' ' + properties.country),
      name: properties.name,
      name_en: properties.name_en,
      name_fr: properties.name_fr,
      description_fr: properties.description_fr,
      country:        properties.country || '',
      wiki_id:        properties.wiki_id || '',
      creation_date:  now.date,
      creation_time:  now.time
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
  /*
    Use dbpedia lookup to determine which is the institution 
    wiki resource page.
  */
  discover: function(institution, next) {
    var now = helpers.now();
    if(!institution.props.wiki_id) {
      helpers.dbpedia.lookup({
        query: institution.props.name,
        QueryClass: '',
        limit: 10
      }, function (err, wiki) {
        if(err) {
          next(err);
          return;
        }
        // get the most similar by "slug"
        for(var i in wiki) {
          if(helpers.extract.smartSlug(wiki[i].label) == helpers.extract.smartSlug(institution.props.name)) {
            institution.props.wiki_id = path.basename(wiki[i].uri);
            institution.props.wiki_description = wiki[i].description;
            institution.props.wiki_score = 1;
            break;
          }
        }
        // otherwise use the very first (lowest score, min 1/10, max 9/10)
        if(!institution.props.wiki_id) {
          institution.props.wiki_id = path.basename(wiki[0].uri);
          institution.props.wiki_description = wiki[0].description;
          institution.props.wiki_score = .9 / wiki.length;
        };
        institution.props.last_modification_date = now.date;
        institution.props.last_modification_time = now.time;
        
        neo4j.save(institution.props, function (err, node) {
          if(err)
            next(err);
          else
            next(null, institution);
        })
      });
    } else {
      // discover dbpedia resource data
      next(null, institution);
    }
  },
  addRelatedActivity: function(institution, activity, next) {
    var now = helpers.now();
    
    neo4j.query(queries.merge_institution_activity_relationship, {
      slug: institution.props.slug,
      activity_slug: activity.props.slug
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
  
  remove: function(institution, next) {
    neo4j.query(queries.remove_activities, {
      slug: institution.props.slug
    }, function (err, node) {
      if(err) {
        next(err);
        return;
      }
      next(null);
    })
  }
};