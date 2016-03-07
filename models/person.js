/*
  Model: Person
  =============
  
  A Person is a sub type of an Entity. Each person is qualified with a distinct slug.
  That is, we can say that a person is unique by checking its neo4J label and its slug.
  The previous doi has been preserved for migration purposes.
  Its neo4j json representation should be at least:
  {
    slug: 'simone-veil',
    uri:  'person/simone-veil',
    props: { 
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
  }
  
*/
var settings  = require('../settings'),
    helpers   = require('../helpers.js'),
    models    = require('../helpers/models'),
    neo4j     = require('seraph')(settings.neo4j.host),
    queries   = require('decypher')('./queries/person.cyp'),
    
    _         = require('lodash'),
    async     = require('async'),
    COUNTRIES = require('../ISO_3166-1');



module.exports = {
  /*
    Given a cypher Person with some activities on it,
    return the clean model. The person shoulkd have some relationships and activities. It should be linked to activity model scratch as well
  */
  scratch: function(person) {
    var per  = {
          slug: person.slug,
          uri:  person.uri,
          props: person.props
        },
        rels = _.groupBy(person.rels, 'end');
    per.activities = _.values(_.keyBy(person.activities.map(function (d) {
      var _d = {
        slug:           d.slug,
        country_code:   d.country,
        description_fr: d.description_fr,
        description_en: d.description_en,
        timeline: _.map(rels[d.id], 'properties')
      };
      
      _d.country_code = d.country;
      _d.country = d.country.length? _.find(COUNTRIES, {
        code: d.country
      }).value: '';
      return _d;
    }), 'slug'));
    return per
  },
  /*
    Get a single person out of the list by person slug.
    It come with activitites related information
  */
  get: function (person, next) {
    neo4j.query(queries.get_person, {
      slug: person.slug
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
            uri:  nodes[0].uri,
            props: nodes[0].props
          };
      // console.log(nodes[0].activities)
      // re write activities
      per.nationalities = nodes[0].nationalities.filter(function (d) {
        return d.id;
      }).map(function (d) {
        var _d =  {
          slug: d.slug,
          uri: d.uri,
          props: d.props,
          reference: d.rel? (d.rel.reference || ''): '',
          timeline: d.rel? d.rel.properties : [],
          country: _.find(COUNTRIES, {code: d.slug})
        };
        return _d
      });


      per.activities = _.orderBy(_.map(_.filter(nodes[0].activities, 'id'), function (d) {
        var _d =  _.assign({
          slug: d.slug,
          uri: d.uri,
          props: d.props,
          institutions: _.filter(d.institutions || [], 'id')
        }, (d.rel? d.rel.properties : {}));

        _d.props.country_code = ''+d.props.country;
        _d.props.country = _.find(COUNTRIES, {code: d.props.country}).value;
        
        return _d
      }), ['start_date', 'end_date'], ['asc', 'asc']);

      //per.activities = per.activities ['start_date', 'end_date'],['desc', 'desc']);
      
      next(null, per)
    });
  },
  
  getMany: function(params, next) {
    models.getMany({
      queries:{
        items: queries.get_persons,
        total_count: queries.count_persons
      },
      params: params
    }, next);
  },
  
  getRelatedMedia: function(person, params, next) {
    var params = _.assign({
      offset: 0,
      limit: 10
    }, params, {
      slug:  person.slug
    });

    models.getMany({
      queries:{
        items: queries.get_related_medias,
        total_count: queries.count_related_medias
      },
      params: params
    }, next);
  },

  getRelatedPersonsByMedia: function(person, params, next) {
    var params = _.assign({
      offset: 0,
      limit: 10
    }, params, {
      slug:  person.slug
    });
    
    models.getMany({
      queries:{
        items: queries.get_related_persons_by_media,
        total_count: queries.count_related_persons_by_media
      },
      params: params
    }, next);
  },

  getRelatedPersons: function(person, params, next) {
    async.parallel({
      by_activity: function(callback) {
        neo4j.query(queries.get_related_persons_by_activity, {
          slug:   person.slug,
          offset: params.offset,
          limit:  params.limit
        }, callback)
      },
      by_institution: function(callback) {
        neo4j.query(queries.get_related_persons_by_institution, {
          slug:   person.slug,
          offset: params.offset,
          limit:  params.limit
        }, callback)
      }
    }, function (err, results) {
      if(err)
        return next(err);
      var persons = _.values(_.groupBy(_.filter(results.by_activity, 'id').concat(results.by_institution), 'slug'))
            .map(function (d) {
              var person = {
                slug: d[0].slug,
                uri: 'person/' + d[0].slug,
                props: d[0].props,
                score: _.sum(d, function(e) { // calculate also in term of time proximity
                  return e.activities? e.amount*2: e.amount;
                }),
                activities: _.filter(_.flatten(_.compact(_.map(d, 'activities'))), 'id').map(function (d) {
                  var _d =  _.assign({
                    slug: d.slug,
                    uri: d.uri,
                    props: d.props,
                    institutions: _.filter(d.institutions || [], 'id')
                  }, (d.rel? d.rel.properties : {}));

                  _d.props.country_code = ''+d.props.country;
                  _d.props.country = _.find(COUNTRIES, {code: d.props.country}).value;
                  return _d;
                }),
                institutions: _.flatten(_.compact(_.map(d, 'institutions')))
              };
              return person;
            });
      
      next(null, _.orderBy(persons, 'score', 'desc'));
    })
    
  },
  
  /*
    Create a person, take into account the unicity of the person as well.
  */
  create: function(person, next) {
    if(!person.slug)
      person.slug = helpers.extract.smartSlug(person.first_name + ' ' + person.last_name);
    // if(!person.slug) { // get the first empty slug...
    //   neo4j.query(queries.get_slugs, function (err, slugs){
    //     // take the very first, non existing slug, then create it.
    //     if(err) {
    //       return next(err)
    //     }
    //     var slugs = _.map(slugs, 'slug'),
    //         slug = helpers.extract.smartSlug(person.first_name + ' ' + person.last_name);
    //     console.log('test with', slug, slugs.indexOf(slug))
    //     if(slugs.indexOf(slug) !== -1) {
    //       slug = slug + person.birth_date.substr(0,4);
    //       console.log('test twice with', slug, person.birth_date.substr(0,4),slugs.indexOf(slug))
    //     }
        
    //     module.exports.create(_.assign(person, {slug: slug}), next);
    //   });
    //   return;
    // }
    var now = helpers.now(),
        query = helpers.cypher.query(queries.create_person, person);
    // i you have provided a slugs that means that is has to be unique...
    neo4j.query(query, _.assign(person, {
      creation_date: now.date,
      creation_time: now.time
    }), function (err, nodes) {
      if(err)
        return next(err);
      next(null, nodes[0]);
    });
  },
  
  merge: function(properties, next) {
    var now = helpers.now(),
        query = helpers.cypher.query(queries.merge_person, properties);

    if(_.isEmpty(properties.name_search)) {
      properties.name_search = (properties.name || '').toLowerCase(); // lowercase true
    };
    // birth_time
    if(properties.birth_date && !properties.birth_time) {
      properties.birth_time = helpers.reconcileDate(properties.birth_date, 'YYYY-MM-DD').time
      properties.birth_date = helpers.reconcileDate(properties.birth_date, 'YYYY-MM-DD').date
    }
    // death_time
    if(properties.death_date && !properties.death_time) {
      properties.death_time = helpers.reconcileDate(properties.death_date, 'YYYY-MM-DD').time
      properties.death_date = helpers.reconcileDate(properties.death_date, 'YYYY-MM-DD').date
    }
    // create name_search if there isn't any
    neo4j.query(query, _.assign({}, properties, {
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
  
  discover: function(person, next) {
    // collect all the activities, then find stuff
    
    neo4j.query(queries.get_person, person, function (err, nodes) {
      if(err) {
        next(err);
        return;
      }
      if(!nodes.length) {
        next(helpers.IS_EMPTY);
        return;
      }
      var node = nodes[0];
      
      var contents = node.activities.map(function(d) {
        return d.description_en;
      }).join('; ')
      console.log(node.props.name + ' ' + contents)
      helpers.yagoaida({
        contents: contents
      }, function (err, entities) {
        next(null, node);
      })
    })
    
  },
  
  // createNationality: function(person, next) {
  //   var now = helpers.now(),
  //       query = helpers.cypher.query(queries.merge_person, properties);
    
  // },
  /*
    Placeholder for real person. It uses name and original_slug to 
    prepare a person.
    To find incomplete person:
    MATCH (p:person) WHERE not(has(p.slug)) RETURN p
  */
  merge_incomplete: function(properties, next) {
    var now = helpers.now(),
        query = helpers.cypher.query(queries.merge_incomplete_person, properties);
    neo4j.query(query, {
      original_slug: properties.original_slug,
      name: properties.name,
      doi: properties.doi,
      dois: properties.dois,
      languages: properties.languages,
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