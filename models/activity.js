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
    helpers   = require('../helpers'),
    models    = require('../helpers/models'),
    
    ISO_CODES = require('../ISO_3166-1'),
    neo4j     = require('seraph')(settings.neo4j.host),
    queries   = require('decypher')('./queries/activity.cyp'),
    
    _         = require('lodash');



module.exports = {
  /*
    Get a single activity by activity slug.
    It comes with a list of person concerned.
  */
  get: function (activity, next) {
    neo4j.query(queries.get_activity, {
      slug: activity.slug
    }, function (err, nodes) {
      if(err) {
        next(err);
        return
      }
      if(!nodes.length) {
        next(helpers.IS_EMPTY);
        return;
      }
      var act  = {
            uri:   nodes[0].uri,
            slug:  nodes[0].slug,
            props: nodes[0].props
          };
      
      next(null, act)
    });
  },
  
  getRelatedPersons: function (activity, params, next) {
    neo4j.query(queries.get_activity_related_persons, {
      slug:   activity.slug,
      offset: params.offset,
      limit:  params.limit
    }, function (err, nodes) {
      if(err) {
        next(err);
        return
      }
      if(!nodes.length) {
        next(helpers.IS_EMPTY);
        return;
      }
      var act  = {
            uri:   nodes[0].uri,
            slug:  nodes[0].slug,
            props: nodes[0].props
          },
          rels = _.groupBy(nodes[0].rels, 'start');
      // console.log(nodes[0].rels)
      act.persons = _.values(_.indexBy(nodes[0].persons.map(function (d) {
        var _d = {
          slug:           d.slug,
          props:          d,
          timeline: _.map(rels[d.id], 'properties')
        };
        return _d;
      }), 'slug'));
      
      next(null, act)
    });
  },
  
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
  },
  
  /*
    Require as properties:
    person, description_en, description_fr, country
    Country NUST be provided as 3 letters ISO 3166 country code.
  */
  merge: function(properties, next) {
    var now = helpers.now(),
        query = helpers.cypher.query(queries.merge_activity, properties);
    
    neo4j.query(queries.merge_activity, {
      slug: helpers.extract.smartSlug(properties.position + ' ' + properties.country),
      person_slug:    properties.person.slug,
      position:       properties.position,
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