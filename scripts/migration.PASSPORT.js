/*
  Migration script for biographies file
  contents/PASSPORT.xml
  The passport xml file has been transformed into a json with this structure:
  
  ´´´ json
  {
    "ferjac-fernand-levain-paul-pol": [
      {
        "name": "Paul Fernand Levain (Pol FERJAC)",
        "doi": "de14d7b1-d2f6-4c5b-b11a-6d66586e25bc",
        "birth_date": "Mon Jun 04 00:15:57 CET 1900",
        "death_date": "Fri Jun 08 00:00:00 CEST 1979",
        "birth_place": "Merlerault",
        "death_place": "Nice",
        "languages": [
          "fr"
        ],
        "original_slug": "ferjac-fernand-levain-paul-pol",
        "duties_fr": [
          {
            "position": "Dessinateur humoriste et caricaturiste politique, Pol FERJAC collabora, entre autres, au _Canard enchaîné_, _L’Humanité_, _Franc-Tireur_, _Le Parisien Libéré_ et _France-Soir_.",
            "years": []
          }
        ],
        "abstract_fr": "Paul Fernand Levain (Pol FERJAC).\n\nDessinateur humoriste et caricaturiste politique, Pol FERJAC collabora, entre autres, au _Canard enchaîné_, _L’Humanité_, _Franc-Tireur_, _Le Parisien Libéré_ et _France-Soir_.",
        "not_wiki": true
      }
    ],
  }
  ´´´
*/
var fs         = require('fs'),
    path       = require('path'),
    settings   = require('../settings'),
    helpers    = require('../helpers'),
    services    = require('../services'),
    neo4j      = require('seraph')(settings.neo4j.host),
    async      = require('async'),
    _          = require('lodash'),
    clc        = require('cli-color'),
    csv        = require('csv');
    

var LANGUAGES = ['en', 'fr', 'de'],
    ISO_CODES   = require('../ISO_3166-1'),
    biographies = require('../data/PASSPORT'),
    persons     = {};
    specials    = {};
    

async.waterfall([
  /*
    Check that do not exist more than one person per slug.
  */
  function extractBiographiesByDOI (next) {
    _.values(biographies).forEach(function (aliases) {
      var person = {
            original_slug: aliases[0].original_slug,
            name: aliases[0].name,
            doi: aliases[0].doi,
            dois: _.map(aliases, 'doi'),
            abstract_en: _.compact(_.map(aliases, function (d) {
              return (d.abstract_en || '').trim()
            })).join(' --- '),
            abstract_fr: _.compact(_.map(aliases, function (d) {
              return (d.abstract_fr || '').trim()
            })).join(' --- '),
            languages: ['en', 'fr'],
            nationalities: _.flatten(_.union(_.map(aliases, function (alias) {
              return _.compact(LANGUAGES.map(function (d) {
                return alias['nationality_' + d]? {
                  key: 'nationality_' + d,
                  value: alias['nationality_' + d].replace(/\?/g, '').trim()
                }: undefined;
              }))
            })))
          }
          
      persons[person.original_slug] = person;
      
      console.log(clc.yellowBright(person.original_slug));
      person.nationalities = _.unique(_.flatten(person.nationalities.map(function (nationality) {
        var _nationalities = [],
            lookup = {};
            lookup[nationality.key] = nationality.value,
            country = _.result(_.find(ISO_CODES, lookup), 'code');
            
        if(country) {
          console.log('   found', country);
          return country
        }
        // try to reduce
        lookup[nationality.key] = nationality.value.toLowerCase();
        country = _.result(_.find(ISO_CODES, lookup), 'code');
        if(country) {
          console.log('   found', country);
          return country
        }
        
         _.compact(_.map(nationality.value.split(/[\/,\(\)]|(puis)|(then)/), _.trim)).forEach(function (d) {
          lookup[nationality.key] = d;
          // console.log('looking for', nationality.key,'=', d)
          country = _.result(_.find(ISO_CODES, lookup), 'code');
          if(!country) {
            console.log(clc.redBright('   not found:'), d, 'of',nationality.value);
            return;
          }
          
          console.log(clc.greenBright('   found:'), country, 'for',nationality.value);
          _nationalities.push( country)
        });
        
        if(!_nationalities.length)
          console.log(clc.redBright('   not found:'), nationality.value);
        return _nationalities
      })));
      console.log(clc.blackBright('    nationalities:'), person.nationalities)
  
      
    })
    next(null, persons)
  },
  
  /*
    Merge the person found by original_slug and attributes the doi if any found.
    Note that in our neo4j person model, 'slug' is different because it is based on first_name and last_name!
    However, person modela also has the original_slug.
    @next - a dictionary of persons, indexed by slug.
  */
  function savePersonToNeo4j (persons, next) {
    
    
    var Person      = require('../models/person'),
        Nationality = require('../models/nationality'),
        errors = [];
    
    var q = async.queue(function (person, nextPerson) {
          console.log(clc.blackBright('person: ', clc.yellowBright(person.original_slug)), 'aliases:', person.dois.length, 'nationalitites', person.nationalities);
          
          neo4j.query('MATCH (per:person) WHERE per.original_slug = {original_slug} OR per.original_slug={old_slug} return per', {
            original_slug: person.original_slug,
            old_slug: '-'+ person.original_slug
          }, function (err, nodes) {
            if(err)
              throw err;
            
            if(nodes.length == 1) {
              
              
              // save doi and dois if needed
              
              
              nodes[0].doi = (nodes[0].doi || person.doi || '').trim();
              nodes[0].abstract_fr = nodes[0].abstract_fr || person.abstract_fr
              nodes[0].abstract_en = nodes[0].abstract_en || person.abstract_en
              nodes[0].dois = _.unique((nodes[0].dois || [])
                .concat([nodes[0].doi.trim()] || [])
                .concat(person.dois)
                .concat([person.doi.trim()]))
              if(nodes[0].dois.length > 1)
                console.log(nodes[0].doi, nodes[0].dois)
              
              neo4j.save(nodes[0], function (err, node) {
                if(err)
                  throw err;
                // save different nationalities
                var qi = async.queue(function(nationality, nextNationality) {
                  console.log("save", nationality)
                  Nationality.merge({
                    country: nationality,
                    person: node
                  }, function (err, node) {
                    // if(err)
                    //   throw err;
                    if(err)
                      errors.push(nodes[0])
                     nextNationality();
                  });
                 
                })
                  
                qi.push(person.nationalities)
                qi.drain = nextPerson;
              })
              
              
            } else if(nodes.length > 1) {
              console.log(nodes)
              throw 'resolve duplicates MANUALLY...'
            } else {
              console.log('creating record', person.original_slug)
              Person.merge_incomplete({
                original_slug: person.original_slug,
                name: person.name,
                doi: person.doi,
                dois: person.dois,
                languages: person.languages
              }, function (err, per) {
                if(err)
                  throw err;
                console.log(per)
                nextPerson()
              }) 
            }
            //nextPerson()
          });
        }, 1);
    q.push(_.values(persons));
    q.drain = function() {
      console.log(errors)
      next()
    }
  }
  
], function(err) {
  if(err) {
    console.log(err);
    console.log('PASSPORT task', clc.redBright('error'));
  } else
    console.log('PASSPORT task', clc.cyanBright('completed'));
})
