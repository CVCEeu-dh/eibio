/*
  
  Person task collection

*/
var settings  = require('../../settings'),
    helpers   = require('../../helpers'),
    inquirer     = require('inquirer'),
    async     = require('async'),
    path      = require('path'),
    fs        = require('fs'),
    
    neo4j     = require('seraph')(settings.neo4j.host),
    Person    = require('../../models/person');

module.exports = {
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
      console.log(options.person)
      console.log(clc.blackBright('\n   this person has', clc.magentaBright(nodes[0].rels), 'relationships'));
      callback(null, options)
    })
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
              'viaf_id',
              'wiki_id',
              'last_name',
              'first_name',
              'name',
              'dois'
            ];
        
        updatable.forEach(function (d) {
          if(person[d] && person[d] != node[d]) {
            if(d == 'dois') {
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
        'viaf_id',
        'wiki_id',
        'activity',
        'dois'
      ];
      options.records = nodes.map(function(d) {
        d.per.activity = d.first_act;
        d.per.dois = d.per.dois? d.per.dois.join(', '): ''
        return d.per
      });
      callback(null, options)
    });
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
                  years: years,
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
          description: d.position
        };
        
        for(var k in d.years) {
          record['position_' + k +'_start_date'] = d.years[k][0];
          record['position_' + k +'_end_date']   = d.years[k][1]
          max_activities = Math.max(max_activities, k);
        }
        options.records.push(record)
        
        
      })
      
      options.fields = [
        'slug',
        'name',
        'language',
        'birth_date',
        'death_date',
        'description',
      ];
      for(var i = 0; i < max_activities + 1; i++)
        options.fields.push('position_' + i +'_start_date', 'position_' + i +'_end_date')
   
      callback(null, options);
    }
    q1.push(options.person.languages);
    
  }
};