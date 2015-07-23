/*
  Harvester.
  ==========
  
  Load CSV tab separated data into a proper neo4j db, v.2.2.
  
  `options.source` locate the tsv resource on fs:
  
    > node .\scripts\activities.js --source=contents\activities.tsv
  
  The `options.source` file MUST have as column names:
    
    - position        string "description"
    - slug            string "person slug" already existing person, identified by this slug
    - field           string "academic|ambassador"
    - institution     string "institution name"
    - language        lang   'en|fr'
    - d.pos_0_start   year   YYYY
    - d.pos_0_end     year   YYYY
    - ...
    - d.pos_5_start   year   YYYY
    - d.pos_5_end     year   YYYY
  
  
*/
var fs         = require('fs'),
    path       = require('path'),
    csv        = require('csv'),
    
    settings   = require('../settings'),
    helpers    = require('../helpers'),
    
    neo4j       = require('seraph')(settings.neo4j.host),
    activity    = require('../models/activity'),
    Institution = require('../models/institution'),
    Role        = require('../models/role'),
    
    async       = require('async'),
    _           = require('lodash'),
    clc         = require('cli-color'),
    
    queries     = require('decypher')('./queries/activity.cyp'),
    options     = require('minimist')(process.argv.slice(2)),
    
    
    COLUMNS     = {
                    stringify: [
                      'person__slug',
                      'person__original_slug',
                      'start_date',
                      'end_date',
                      'activity__slug',
                      'activity__country',
                      'activity__position'
                    ]
                  };
    

console.log('\n\n                                      __^__');
console.log('                                     /(o o)\\');
console.log('==================================oOO==(_)==OOo=======================\n');



var COUNTRY_CODES = require('../ISO_3166-1.js'),
    disambiguated_positions = {
      en: [],
      fr: []
    };

if(options.realign) {
  // provide a source file like the one given in data/activities.tsv.example
  //
  if(!options.source) { // skip this step is no source has been specified
    console.log(clc.blackBright('source file not specified, you can modify', clc.yellowBright('data/activities.tsv.example')));
    return;
  }
  
  async.waterfall([
    function importDisambiguatedPositions(next) {
      csv.parse(''+fs.readFileSync(options.source), {
        columns : true,
        delimiter: '\t',
        quote: '´'
      }, function (err, data) {
        if(err)
          throw err;
        // clean data here
        next(null, data);
      });
    },
    
    function saveActivitiesIntoNeo4j(activities, next) {
      var q = async.queue(function (activity, nextActivity) {
        neo4j.query(queries.merge_activity_lite, activity, function (err, node) {
          if(err)
            throw err;
          console.log(clc.greenBright(' V '), activity.slug, clc.blackBright('\n    ~>', activity.position), q.length(), 'remaining');
          
          nextActivity();
        })
      }, 1);
      q.push(activities);
      q.drain = next;
    }
  ], function(err){
    if(err) {
      console.log(err);
      console.log('realign task', clc.redBright('error'));
    } else
      console.log('realign task', clc.cyanBright('completed'));
  }); 
  return;
}

if(options.prepare) { // prepare the export for the realign task (aka correction).
  async.waterfall([
        
    function getPositionsFromNeo4j (next) {
      neo4j.query(queries.get_positions, function (err, nodes) {
        if(err) {
          next(err);
          return;
        }
        
        next(null, {
          records: nodes,
          filepath: 'contents/activities-positions.csv',
          fields: [
            'slug',
            'position',
            'description_fr',
            'description_en',
            'country'
          ]
        });
      });
    },
    
    helpers.CSV.stringify
  
  ], function(err){
    if(err) {
      console.log(err);
      console.log('stringify task', clc.redBright('error'));
    } else
      console.log('stringify task', clc.cyanBright('completed'));
  }); 
  return;
}

if(options.stringify) {
  async.waterfall([
        
    function getPositionsFromNeo4j (next) {
      neo4j.query('MATCH (per:person)-[r]-(act:activity) RETURN {person__slug: per.slug, person__original_slug:per.original_slug, start_date: r.start_date, end_date: r.end_date, activity__slug: act.slug, activity__country:act.country, activity__position: act.position}', function (err, paths) {
        if(err) {
          next(err);
          return;
        }
        
        console.log(paths)
        
        next(null, {
          records: paths,
          filepath: 'data/persons__activities.tsv',
          fields: COLUMNS.stringify
        });
      });
    },
    
    helpers.CSV.stringify
  
  ], function(err){
    if(err) {
      console.log(err);
      console.log('stringify task', clc.redBright('error'));
    } else
      console.log('stringify task', clc.cyanBright('completed'));
  }); 
  return;
}
  

if(options.parse) {
  if(!options.source) {
    console.log('Please specify the tsv path', clc.redBright('--source=/path/to/source.tsv'));
    return;
  }
  return;
};

if(options.FOOparse) {
  
  var missing_positions = [
    {
      fr: 'député socialiste au parlement européen',
      en: 'socialist member of the european parliament'
    }
  ]
  
  async.waterfall([
    function importDisambiguatedPositions(next) {
      csv.parse(''+fs.readFileSync('./contents/institutions.tsv'), {
        columns : true,
        delimiter: '\t',
        quote: '´'
      }, function (err, data) {
        if(err)
          throw err;
        // clean data here
        disambiguated_positions.en = _.groupBy(_.map(data, function (d, i) {
          d.country_code = d.country.length > 0? _.result(_.find(COUNTRY_CODES, {'value': d.country}), 'code') : '';
          if(typeof d.country_code == undefined) {
            console.log(d)
            throw 'ouch, country not found' + ' ' + d.country
          }
          d.line = helpers.extract.smartSlug(d.backup + ' ' + d.country_code);
          d.slug_en = helpers.extract.smartSlug(d.title_en + ' ' + d.country_code);
          return d;
        }), 'slug_en');
        disambiguated_positions.fr = _.groupBy(_.map(data, function (d) {
          d.slug_fr = helpers.extract.smartSlug(d.title_fr + ' ' + d.country_code);
          return d;
        }), 'slug_fr');
        
        // disambiguated_positions.fr = data.map(function (d) {
        //   return helpers.extract.smartSlug(d.title_fr);
        // });
        // console.log(_.values(disambiguated_positions.en).filter(function(d){
        //   return d.length > 1
        // }))
        next();
      });
    },
    
    /**

    Step 1A
    -------

    Import and check for duplicates in file
    */
    function importActivitiesFromSource(next) {
      if(!options.source) { // skip this step is no source has been specified
        console.log(clc.blackBright('source file not specified,', clc.yellowBright('skipping'), 'import people from source file'))
        next();
        return;
      }
      csv.parse(''+fs.readFileSync(options.source), {columns : true, delimiter: '\t', quote: '´'}, function (err, data) {
        if(err)
          throw err;
        
        // clean data here
        var people = {},
            toberealigned = [],
            aligned       = [],
            missing_positions = [];
        
        data.forEach(function (d, i) {
          if(!people[d.slug])
            people[d.slug] = {
              slug: d.slug,
              duties_fr: [],
              duties_en: [],
              activities: []
            };
          //(d.slug == 'anthony-eden') console.log(disambiguated_positions)
          if(!d.pos_0_start.trim().length)
            return;
          
          // add duties
          for(var j = 0; j < 10; j++) {
            if(!d['pos_' + j + '_start'])
              continue;
            var start_date = d['pos_' + j + '_start'].replace(/[^0-9]/g, ''),
                end_date = d['pos_' + j + '_end'].replace(/[^0-9]/g, ''),
                country = '',
                start,
                end;
                
            if(start_date.length != 4) {
              console.log(d)
              throw 'pos_' + j + '_start date, line ' + i + ' is not valid, found "' + start_date +'"';
            }
            if(end_date.length && end_date.length!= 4) {
              console.log(d)
              throw 'pos_' + j + '_end date, line ' + i + ' is not valid, found "' + end_date +'"';
            }
            if(!end_date.length) {
              end_date = '' + start_date; // clone 
            }
            start = helpers.extract.dates(start_date + '-01-01', 'YYYY-MM-DD', true);
            end   = helpers.extract.dates(end_date + '-12-31', 'YYYY-MM-DD', true);
            
            if(d.country.trim().length) {
              country = _.result(_.find(COUNTRY_CODES, {'value': d.country}), 'code');
              if(!country)
                throw 'country "' + d.country + '" does not have a proper ISO code, at line ' + i + ', please check'; 
            }
            // collect tags and other stories if(helpers. disambiguated_positions[d.language])
            var position = d.position,
                disambiguated_position = disambiguated_positions[d.language][helpers.extract.smartSlug(d.position + ' ' + country)],
                tags = [],
                role,
                institution,
                url,
                ambiguous_slug;
            
            //(d.slug == 'anthony-eden') {
              // disambiguated position, per language
            if(!disambiguated_position) {
              position = d.position
                          .replace(/[\(\d;–\)]/g, ' ')
                          .replace(/\s-\s/g, ' ')
                          .replace(/\s+/g, ' ')
                          .trim();
              d.slug == 'anthony-eden' && console.log(clc.yellowBright(' ! '), clc.blackBright('~>', d.position), start_date, end_date)
              d.slug == 'anthony-eden' && console.log('   ', position)
            } else {
              position    = disambiguated_position[0]['title_' + d.language];
              tags        = _.compact([disambiguated_position[0]['tag'],disambiguated_position[0]['institution'], disambiguated_position[0]['secondary-tag']]);
              url         = disambiguated_position[0]['url'];
              role        = disambiguated_position[0]['tag'];
              if(disambiguated_position[0]['institution-address'].length)
                institution = {
                  name:     disambiguated_position[0]['institution'].trim(),
                  address:  disambiguated_position[0]['institution-address'],
                  location: disambiguated_position[0]['institution-location'],
                  url:      disambiguated_position[0]['url']
                };
              if(disambiguated_position.length == 1) { // unique disambiguatin, fine
                d.slug == 'anthony-eden' && console.log(clc.greenBright(' V '), clc.blackBright('~>', d.position), start_date, end_date );
              } else { // further disambiguation needed
                d.slug == 'anthony-eden' && console.log(clc.blackBright('~>', d.position), start_date, end_date, clc.yellowBright('need disambiguation'), disambiguated_position.length);
                ambiguous_slug = helpers.extract.smartSlug(d.position + ' ' + country)
              }
            }
            // disambiguate position according to the 
            people[d.slug]['duties_' + d.language].push({
              position: position,
              country: country,
              tags: tags,
              url: url,
              institution: institution,
              role: role,
              line: disambiguated_position? disambiguated_position[0].line: 0,
              ambiguous_slug: ambiguous_slug,
              start_date: start_date,
              start_time: start.time, // 1980-01-01
              end_date: end_date,
              end_time: end.time, // 1980-01-01
            });
          };
        });
        
        // get statistics
        for(var slug in people) {
          var years_fr = _.groupBy(people[slug].duties_fr, function (d) {
            return [d.start_date, d.end_date].join('-');
          });
          var years_en = _.groupBy(people[slug].duties_en, function (d) {
            return [d.start_date, d.end_date].join('-');
          });
          var difference_en = _.difference(_.keys(years_en), _.keys(years_fr));
          var difference_fr = _.difference(_.keys(years_fr), _.keys(years_en));
          
          
          if(difference_en.length) {
            console.log(clc.red('beware EN'), clc.yellowBright(slug))
            //console.log(difference_en);
            // for(var i in difference_en)
            //   console.log(years_en[difference_en[i]], 'vs', years_fr[difference_en[i]])
            // //throw 'there are differences between en and fr version... "'
            toberealigned.push({
              slug: slug,
              language: 'fr',
              difference: difference_en
            })
          } else if(difference_fr.length) {
            console.log(clc.red('beware FR'), clc.yellowBright(slug))
            //console.log(difference_fr);
            // for(var i in difference_fr)
            //   console.log(years_en[difference_fr[i]], 'vs', years_fr[difference_fr[i]])
            // //throw 'there are differences between en and fr version... "'
            toberealigned.push({
              slug: slug,
              language: 'en',
              difference: difference_fr
            })
          } else {
            for(var i in years_en) {
              if(years_en[i].length > 1) {
                var position_fr; // that is, the french translation of it
                
                for(var j in years_en[i]) {
                  var position_fr = _.result(_.find(years_fr[i], {line:  years_en[i][j].line}), 'position');
                  if(position_fr) {
                    people[slug].activities.push({
                      country: years_en[i][j].country,
                      position:        years_en[i][j].position,
                      institution:     years_en[i][j].institution,
                      role:            years_en[i][j].role,
                      start_date:      years_en[i][j].start_date,
                      start_time:      years_en[i][j].start_time,
                      end_date:        years_en[i][j].end_date,
                      end_time:        years_en[i][j].end_time,
                      description_en:  years_en[i][j].position,
                      description_fr:  position_fr
                    });
                  }
                  //slug == 'anthony-eden' &&  console.log('>ARR', i, j, years_en[i][j].line, position_fr);
                }
                
                if(!position_fr)
                  missing_positions.push({
                    position:    years_en[i][j].position,
                    candidates:  years_fr[i],
                    slug:        slug,
                    years:       i
                  })
              
              } else {
                people[slug].activities.push({
                  country:         years_en[i][0].country,
                  position:        years_en[i][0].position,
                  institution:     years_en[i][0].institution,
                  role:            years_en[i][0].role,
                  start_date:      years_en[i][0].start_date,
                  start_time:      years_en[i][0].start_time,
                  end_date:        years_en[i][0].end_date,
                  end_time:        years_en[i][0].end_time,
                  description_en:  years_en[i][0].position,
                  description_fr:  years_fr[i][0].position
                })
              }
            }
            
            aligned.push({
              slug:       slug,
              language:   'en',
              difference: difference_fr
            })
          }
        };
        
        console.log(toberealigned)
        console.log('aligned:    ', aligned.length)
        console.log('NOT aligned:', toberealigned.length);
        var notyetaperson = [],
            tobecompleted = [];
        
        var q = async.queue(function (slug, nextSlug) {
          
            neo4j.query('MATCH (n:person) WHERE n.original_slug = {slug} RETURN n', {
                slug: slug
              }, function (err, nodes) {
                if(err)
                  throw err;
                if(_.values(people[slug].activities).length == 0) {
                  nextSlug();
                  return;
                }
                if(!nodes.length) {
                  notyetaperson.push(slug)
                  console.log(clc.redBright('is not yet a person'), clc.yellowBright(slug), clc.blackBright('with', clc.magenta(_.values(people[slug].activities).length), 'activities'));
                  setTimeout(function(){
                    nextSlug();
                  }, 100);
                  return;
                };
                if(!nodes.length > 0) {
                  console.log(nodes)
                  throw 'duplicate person slug!'
                };
                //console.log(people[slug].activities)
                console.log(clc.blackBright('  saving activities for'), clc.yellowBright(slug), nodes[0].original_slug, nodes[0].slug)
                
                slug == 'anthony-eden' && console.log(slug, people[slug].activities)
                
                var qi = async.queue(function (act, nextActivity) {
                  activity.merge({
                    person: nodes[0],
                    position: act.position,
                    description_en: act.description_en,
                    description_fr: act.description_fr,
                    start_date: act.start_date,
                    start_time: act.start_time, // 1980-01-01
                    end_date: act.end_date,
                    end_time: act.end_time, // 1980-01-01
                    country: act.country
                  }, function (err, _act) {
                    if(err) {
                      tobecompleted.push(nodes[0])
                      nextActivity();
                    } else if(act.institution) { // create institution, if everything is ok
                      var country = act.institution.location.match(/\(([A-Z]{2})\)/)
                      
                      if(!country || !country.length) {
                        console.log(act.institution, country[1]) // find country
                        throw 'country not found for the given institution'
                      }
                        
                      var country_code = _.result(_.find(COUNTRY_CODES, {short: country[1]}), 'code');
                      if(!country_code) {
                        console.log(act.institution, country[1]) // find country
                        throw 'country CODE was not found for the given country: ' + country[1]
                      }// console.log(country_code)
                      if(act.institution.name == 'Municipality') {
                        act.institution.name = act.institution.name + 'of ' + act.institution.location
                      }
                      
                      async.parallel({
                        mergeInstitution: function (callback) {
                          Institution.merge({
                            country: country_code,
                            name: act.institution.name,
                            address: act.institution.address,
                            location: act.institution.location,
                            url: act.institution.url.length? act.institution.url: undefined,
                            wiki_id: act.institution.url.match('dbpedia.org')? path.basename(act.institution.url): undefined
                          }, function (err, _ins) {
                            if(err)
                              throw err;
                            console.log(clc.blackBright('  saving institution for'), _ins.props.name)
                            Institution.addRelatedActivity(_ins, _act, function (err) {
                              if(err)
                                throw err;
                              callback();
                            })
                            // console.log(err, node)
                          });
                        },
                        mergeRole: function(callback) {
                          if(!act.role.trim().length)
                            return callback();
                          Role.merge({
                            name: act.role,
                            name_en: act.role
                          }, function (err, _rol) {
                            if(err)
                              throw err;
                            Role.addRelatedActivity(_rol, _act, function (err) {
                              if(err)
                                throw err;
                              callback();
                            })
                          })
                        }
                        
                      }, function(err, results) {
                        nextActivity();
                      })
                      
                    } else {
                      nextActivity();
                    }//  throw err;
                  });
                }, 1);
                
                qi.push(people[slug].activities);
                qi.drain = nextSlug;
              });
            }, 4);
        
        //console.log(people)
        q.push(_.unique(_.map(aligned, 'slug'))); // q.push(['anthony-eden']) // 
        q.drain = function() {
          fs.writeFileSync('script.activities.missing-people.json', JSON.stringify(notyetaperson.map(function(slug) { return people[slug] }), null, 2));
          fs.writeFileSync('script.activities.missing-positions.json', JSON.stringify(missing_positions, null, 2));
          
          fs.writeFileSync('script.activities.incompleted-people.json', JSON.stringify(tobecompleted, null, 2));
          console.log(clc.blackBright('missing people'), notyetaperson.length)
          console.log(clc.blackBright('missing positions'), missing_positions.length)
          console.log(clc.blackBright('incomplete people'), tobecompleted.length)
          console.log(clc.cyanBright('completed'))
        }
        
        
        
      })
    }
  ], function() {
    
  })
}
