/*
  
  Person task collection

*/
var settings  = require('../../settings'),
    helpers   = require('../../helpers'),

    // task helpers, e.g. print csv
    thelpers  = require('./helpers'),
    inquirer     = require('inquirer'),
    async     = require('async'),
    path      = require('path'),
    fs        = require('fs'),
    
    neo4j     = require('seraph')(settings.neo4j.host),
    Person    = require('../../models/person'),
    Activity  = require('../../models/activity');

var task = {
  
  getManyLinks: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.person.links'));
    var query = helpers.cypher.query('MATCH (per:person) WHERE has(per.{:service}_id) RETURN per.slug, per.{:service}_id as {:service}_id', {
      service: options.service
    });
    neo4j.query(query, function (err, nodes) {
      options.fields = [
        'slug', 
        options.service + '_id'
      ];
      options.records = nodes;
      callback(null, options)
    });
  },
  
  getOne: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.person.getOne'));
    neo4j.query('MATCH (per:person) WHERE id(per) = {id} WITH per OPTIONAL MATCH (per)-[r]-(t)  RETURN per as person, count(r) as rels', {
      id: +options.id,
    }, function (err, nodes) {
      if(err) {
        callback(err);
        return;
      }
      if(!nodes.length) {
        callback('   Can\'t find any person matching id:'+options.id);
        return
      }
      options.person = nodes[0].person;
      options.records = _.map(nodes, 'person');
      // console.log(options.person)
      console.log(clc.blackBright('\n   this person has', clc.magentaBright(nodes[0].rels), 'relationships'));
      callback(null, options)
    })
  },
  
  getActivities: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.person.getActivities'));

    // set new options.fields
    options.fields = [
      'person_id',
      'activity_id',
      'country',
      'description_fr', 
      'description_en',
      'start_date',
      'end_date',
      'institution_id',
      'institution_name',
      'institution_viaf_id'
    ];

    var records = [];

    var q = async.queue(function (person, nextPerson) {
      console.log(person.slug)
      neo4j.query('MATCH (per:person)-[r:employed_as]-(act:activity) WHERE id(per) = {id} WITH per, r, act OPTIONAL MATCH (act)-[:appears_in]-(ins) WITH per, r, act, ins  RETURN {activity: act, rel: r, institution: ins} as result', person, function (err, tuples) {
        if(err) {
          q.kill()
          callback(err)
          return;
        }
        
        // organize activities by year
        records = records.concat(_.orderBy(_.map(tuples, function (tuple) {
          return {
            person_id:            person.id,
            person_name:          person.name,
            person_slug:          person.slug,
            activity_id:          tuple.activity.id,
            country:              tuple.activity.country,
            description_fr:       tuple.activity.description_fr,
            description_en:       tuple.activity.description_en,
            start_date:           tuple.rel.properties.start_date,
            end_date:             tuple.rel.properties.end_date,
            institution_id:       tuple.institution? tuple.institution.id: '',
            institution_name:     tuple.institution? tuple.institution.name: '',
            institution_viaf_id:  tuple.institution? tuple.institution.viaf_id: '',
            
          }
        }), ['start', 'end'], ['asc', 'asc']));
        nextPerson();
      })
    }, 1); // ONE BY ONE
    q.push(options.records);
    q.drain = function() {
      options.records = records;
      callback(null, options)
    }
  },

  setActivities: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.person.setActivities'));
    
    // get all person slugs
    // todo
    var records = [];

    var q = async.queue(function (record, nextRecord) {
      // use the validator to validate: todo
      record.start_time = helpers.extract.dates(record.start_date + '-01-01', 'YYYY-MM-DD', true).time;
      record.end_time = helpers.extract.dates(record.end_date + '-01-01', 'YYYY-MM-DD', true).time;

      var params = {
        person:{
          slug: record.person_slug
        }
      };

      if(record.activity_slug) {
        // update instead
        params.slug = record.activity_slug;
      }
      record.position = record.description_en.trim();
      console.log(clc.blackBright('    merging'), clc.yellowBright(record.person_slug));
      
      Activity.merge(_.assign(params, record), function (err, node) {
        if(err){
          q.kill();
          callback(err)
        } else {
          console.log(clc.greenBright('    merged'), clc.yellowBright(node.slug));
          record.activity_slug = node.slug;
          nextRecord()
        }
      })
      
      
      // nextCouple();
    }, 1)
    q.push(options.data);
    q.drain = function() {
      callback(null, options)
    };
    
  },


  removeOne: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.person.removeOne'));
    neo4j.query('MATCH (per:person) WHERE id(per) = {id} DELETE per', {
      id: +options.id,
    }, function (err, nodes) {
      if(err) {
        callback(err);
        return;
      }
      
      callback(null, options)
    })
  },
  


  /*
    Main entry point.
    Require options.data to be properly filled
  */
  createMany: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.person.createMany'));

    // verify fields @todo


    // verify that there are no duplicate slugs
    var slugGroups = _.values(_.groupBy(options.data, 'slug')),
        duplicates = _.filter(slugGroups, function(d) {return d.length > 1});

    if(duplicates.length) {
      console.log(duplicates);
      callback('duplicate "slug"are not allowed, check the line above')
      return
    }

    var q = async.queue(function (person, nextPerson) {
      console.log(clc.blackBright('    adding'), clc.yellowBright(person.slug));
      Person.merge(person, function (err, node) {
        if(err){
          q.kill();
          callback(err);
        } else {
          console.log(clc.greenBright('    added'), clc.yellowBright(node.slug));
          nextPerson()
        }
      })
    }, 1);

    q.push(options.data);
    q.drain = function(){
      callback(null, options)
    }
    
  },

  updateMany: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.person.updateMany'));
    
    var q = async.queue(function (person, next) {
      // validate and extract birth dates
      
      var birth = helpers.extract.dates(person.birth_date , 'YYYY-MM-DD', true);
      var death = helpers.extract.dates(person.death_date , 'YYYY-MM-DD', true);
      
      if(birth) {
        person.birth_date = birth.date;
        person.birth_time = birth.time;
      }
      if(death) {
        person.death_date = death.date;
        person.death_time = death.time;
      }
      person.dois = _.compact(_.map(person.dois.split(','), _.trim))
      
      
      neo4j.query(
        ' MATCH (per:person {slug:{slug}}) '+
        ' RETURN per LIMIT 1 ', person, function (err, nodes) {
        if(err) {
          q.kill();
          callback(err);
          return;
        }
        var node = _.first(nodes);
        if(!node)
          console.log(person, node)
        console.log(clc.blackBright('   verify person: ', node.slug, 'remaining', q.length()));
        
        // calculate differences, prompt if any changes occurred
        var needupdate = false,
            replaces = {
            },
            updatable = [
              'birth_date',
              'birth_time',
              'death_date',
              'death_time',
              'birth_place',
              'death_place',
              'viaf_id',
              'worldcat_id',
              'wikidata_id',
              'isni_id',
              'last_name',
              'first_name',
              'name',
              'dois'
            ];
        
        updatable.forEach(function (d) {
          if(person[d] && person[d] != node[d]) {
            if(d == 'dois') { // do not replace dois?
              // if(_.difference(person.dois, node.dois).length > 0) {
              //   console.log(d, 'DOIS replace', node[d], ' with', person[d], 'diff', _.difference(person.dois, node.dois))
              //   needupdate = true;
              // }
              // SKIP
            } else {
              replaces[d] = person[d]
              console.log(clc.yellowBright('    ',d), clc.blackBright('replace'), node[d], clc.blackBright('with'), person[d])
              needupdate = true;
            }
          }
        });
        
        if(needupdate) {
          
          inquirer.prompt([{
            type: 'confirm',
            name: 'YN',
            message: ' Press enter to UPDATE the selected fields, otherwise exit by typing "n"',
          }], function( answers ) {
            // Use user feedback for... whatever!! 
            if(answers.YN) {

              neo4j.save(_.assign(node, replaces), function(err, node) {
                if(err) {
                  q.kill();
                  callback(err);
                  return;
                }
                next() 
              });
              
            }
            else {
              q.kill();
              callback('exit on prompt');
              return;
            }
              
          });
          
        } else
          next();
      });
      
    },1);
    q.push(_.filter(options.data, 'slug'));
    q.drain = function() {
      callback(null, options);
    };
  },

  /*
    Require a list of doi provided as source
  */
  getManyByDoi: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.person.getManyByDoi'));
    var records = [];
    options.fields = [
      'id',
      'slug',
      'name',
      'first_name',
      'last_name',
      'birth_date',
      'death_date',
      'birth_place',
      'death_place',
      'wiki_id',
      'viaf_id',
      'wikidata_id',
      'worldcat_id',
      'isni_id',
      'dois',
      'activity',
      'match'
    ];
    var q = async.queue(function (candidate, nextCandidate) {
      console.log('doi', candidate.name, candidate.doi)
      

      neo4j.query('MATCH (p:person) WHERE length(p.slug) > 0 AND {doi} in p.dois WITH p OPTIONAL MATCH (p)--(act:activity)  RETURN p as per, LAST(collect(act.description_en)) as first_act ORDER BY p.last_name', {
          doi: candidate.doi.trim(),
          limit: 1,
          offset: 0
        }, function (err, nodes) {
        if(err) {
          callback(err);
          return;
        }
        console.log(clc.blackBright('   records: '), nodes.length);

        var record = {
          match: candidate.doi,
          name: candidate.name
        };

        if(nodes.length)
          _.assign(record, nodes[0].per);

        records.push(record);
        nextCandidate();
      })
    }, 1);

    q.push(options.data);
    q.drain = function() {
      options.records = records;
      callback(null, options)
    }
  },
  
  getMany: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.person.getMany'));
    neo4j.query('MATCH (p:person) OPTIONAL MATCH (p)--(act:activity) WHERE length(p.slug) > 0 RETURN p as per, LAST(collect(act.description_en)) as first_act ORDER BY p.last_name skip {offset} LIMIT {limit} ', {
      limit: +options.limit || 100000,
      offset: +options.offset || 0
    }, function (err, nodes) {
      if(err) {
        callback(err);
        return;
      }
      console.log(clc.blackBright('   records: '),nodes.length);
      options.fields = [
        'id',
        'slug',
        'name',
        'first_name',
        'last_name',
        'birth_date',
        'death_date',
        'birth_place',
        'death_place',
        'wiki_id',
        'viaf_id',
        'wikidata_id',
        'worldcat_id',
        'isni_id',
        'dois',
        'activity'
      ];
      options.records = nodes.map(function (d) {
        d.per.activity = d.first_act;
        d.per.dois = d.per.dois? d.per.dois.join(', '): ''
        return d.per
      });
      callback(null, options)
    });
  },
  
  
  
  
  
  discoverBio: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.person.discoverBio'));
    callback(null, options)
  },
  
  /*
    Given a list of person and / or text
    Return a cleaned list of birth_date and other stories
  */
  discoverMany: function(options, callback) {
    
  },
  
  parseBio: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.person.parseBio'));
        
    var person = {};
    
    person.positions = [];
    person.nationalities = [];
    
    if(options.language) {
      console.log(clc.blackBright('    language'), clc.greenBright(options.language));
      // add language
      person.languages = _.unique((options.person.languages || []).concat(options.language).sort());
    };
    
    var q1 = async.queue(function (language, nextLanguage) {
      // for each langauge in person.languages
      var q2 = async.queue(function (doi, nextDoi) {
        // for each doi in person.dois
        var filename = path.join(options.source, doi + '_' + language + '.txt');
        fs.readFile(filename, {
          encoding: 'utf8'
        }, function (err, contents) {
          if(err) {
            console.log(err)
            nextDoi();
            return;
          }
          
          
          /* extract some information, if any are available */
          _.compact(contents.split(/\n/)).forEach(function (d) {
            d = d.replace(/^[^\w]*/,'').replace(/\t/,'');// cleaning not common letters;
            // check if it contains the nationality
            var nationality = d.match(/(Nationalité|Nationality|Staatsangehörigkeit)[\s:]*(.*)/);
            if(nationality)
              person['nationality_' + language] = nationality[2];
            
            // check if there are years.
            var years = helpers.extract.years(d);
            
            if(years.length) {
              years.forEach(function (couple) {
                person.positions.push({
                  position: d,
                  language: language,
                  years: couple,
                  doi: doi
                });
              })
            }
          });
          
          /*step 4: save contents locally */
          // person.contents = (person.contents || []).concat([{
          //   language: language,
          //   doi: options.doi || '',
          //   contents: '' + contents
          // }]);
          
          nextDoi()
          
        });
      }, 1);
      
      q2.drain = nextLanguage;
      q2.push(options.person.dois);
    }, 1);

    q1.drain = function() {
      options.records = [];
      // put the records ...
      var max_activities = 0;
      
      person.positions.forEach(function (d) {
        var record = {
          slug: options.person.slug,
          name: options.person.name,
          language: d.language,
          birth_date: options.person.birth_date,
          death_date: options.person.death_date,
          description: d.position,
          start_date: d.years[0],
          end_date: d.years[1]
        };
        
        options.records.push(record)
        
        
      })
      
      options.fields = [
        'slug',
        'name',
        'language',
        'birth_date',
        'death_date',
        'position',
        'description',
        'start_date',
        'end_date'
      ];
      
      options.records = _.orderBy(options.records, ['start_date', 'end_date', 'language'], ['asc', 'asc', 'asc'])
      callback(null, options);
    }
    q1.push(options.person.languages);
    
  },

  getManyActivities: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.activity.getMany'));
    neo4j.query(
      ' MATCH (act:activity)-[r]-(per:person) \n'+
      ' OPTIONAL MATCH (act)-[r2]-(ins:institution)\n' +
      ' RETURN act, LAST(collect(ins)) as ins\n'+
      ' SKIP {offset} LIMIT {limit}', {
      limit: +options.limit || 100000,
      offset: +options.offset || 0
    }, function (err, nodes) {
      if(err) {
        callback(err);
        return;
      }
      options.fields = [
        'id',
        'slug',
        'country',
        'institution_country',
        'institution_name',
        'position',
        'description_en',
        'description_fr',
        'critical'
      ];
      options.records = nodes.map(function (d) {
        d.act.institution_country = d.ins? d.ins.country : '';
        d.act.institution_name    = d.ins? d.ins.name: '';
        if(_.isEmpty(d.act.position))
          d.act.position = d.act.description_en;
        d.act.critical = d.act.institution_country != d.act.country && !_.isEmpty(d.act.institution_country)? 1: 0;
        return d.act;
      });
      callback(null, options)
      
    })
  }
};

module.exports = {
  getActivities: [
    thelpers.checkTarget,
    task.getOne,
    task.getActivities,
    thelpers.csv.stringify
  ],

  getManyByDoi: [
    thelpers.checkTarget,
    thelpers.checkSource,
    thelpers.csv.parse,
    task.getManyByDoi,
    thelpers.csv.stringify
  ],
  task: task
}