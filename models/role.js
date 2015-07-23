/*
  Model: Role
  ===========
  
  A Role is a sub type of an Entity. Each role is qualified with a distinct slug.
  That is, we can say that a role is unique by checking its neo4J label and its slug.
  Its neo4j json representation should be at least:
  {
    slug: 'secretary-general',
    uri:  'person/secretary-general',
    props: { 
      id: 12315
      slug: 'secretary-general',
      name: 'Secretary General',
      name_fr: 'Secrétaire général',
      name_en: 'Secretary General'
    }
  }
  
*/
var settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    
    neo4j     = require('seraph')(settings.neo4j.host),
    queries   = require('decypher')('./queries/role.cyp'),
    
    _         = require('lodash');



module.exports = {
  /*
    Get a single role by slug.
  */
  getRelatedActivities: function (role, next) {
    neo4j.query(queries.get_role, {
      slug: role.slug
    }, function (err, nodes) {
      if(err) {
        next(err);
        return
      }
      if(!nodes.length) {
        next(helpers.IS_EMPTY);
        return;
      }
      var per  = {
            slug: nodes[0].slug,
            props: nodes[0].props
          },
          rels = _.groupBy(nodes[0].rels, 'end');
      //console.log(nodes[0].rels)
      per.activities = _.values(_.indexBy(nodes[0].activities.map(function (d) {
        var _d = {
          slug:           d.slug,
          country_code:   d.country,
          description_fr: d.description_fr,
          description_en: d.description_en,
          timeline: _.map(rels[d.id], 'properties')
        };
        
        _d.country_code = d.country;
        _d.country = _.find(COUNTRIES, {code: d.country}).value;
        return _d;
      }), 'slug'));
      
      next(null, per)
    });
  },
  
  addRelatedActivity: function(role, activity, next) {
    var now = helpers.now();
    
    neo4j.query(queries.merge_role_activity_relationship, {
      slug: role.slug,
      activity_slug: activity.slug
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
  
  merge: function(properties, next) {
    var now = helpers.now(),
        query = helpers.cypher.query(queries.merge_role, properties);
    
    neo4j.query(query, {
      slug:          helpers.extract.smartSlug(properties.name),
      name:          properties.name,
      name_fr:       properties.name_fr,
      name_en:       properties.name_en,
      abstract_fr:   properties.abstract_fr,
      abstract_en:   properties.abstract_en,
      creation_date: now.date,
      creation_time: now.time
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

  remove: function(role, next) {
    neo4j.query(queries.remove_role, {
      slug: role.slug
    }, function (err) {
      if(err) {
        next(err);
        return;
      }
      next(null);
    })
  }
};