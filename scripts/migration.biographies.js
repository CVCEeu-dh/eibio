/*
  Migration script for biographies file
  contents/biography.xml
  Merge each doi with the corresponding txt file.
  The biography xml has been transformed into a json with this structure:
  
  ´´´ json
  {
    "louis-michel": [
      {
        "doi": "31441309-51aa-49bb-9cb2-9d5664b874f4",
        ...
        "name": "Louis Michel",
        "original_slug": "louis-michel"
      }
    ],
    "catherine-lalumi-re": [
      {
        "doi": "853b7431-d203-4ebc-83a1-cbad56bec305",
        ...
        "name": "Catherine Lalumière",
        "original_slug": "catherine-lalumi-re"
      },
      {
        "doi": "ce6c635b-6558-46c7-b89e-f5238468c666",
        ...
        "name": "Catherine Lalumière",
        "original_slug": "catherine-lalumi-re"
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
    

var LANGUAGES = ['en', 'fr', 'de']
    biographies = require('../data/biography'),
    persons     = {};
    specials    = {};


async.waterfall([
  /*
    Give a uniq, complete structure to every person in biographies.
    There could be multiple doi - that is, multiple resources - for each person.
    this function concatenates all information about the person.
    This funcion also generates two distinct files:
      'data/biography.full.json'
      'data/biography.aliases.json'
    The latter contains all person having multiple DOIs attached.
    
    @next - a dictionary of persons, indexed by slug.
  */
  function extractBiographiesByDOI (next) {


    var q = async.queue(function (aliases, nextAliases) {
          var person = {
                original_slug: aliases[0].original_slug,
                name: aliases[0].name,
                doi: aliases[0].doi,
                dois: _.map(aliases, 'doi'),
                name_fr: _.first(_.compact(_.map(aliases, 'name_fr'))) || '',
                name_en: _.first(_.compact(_.map(aliases, 'name_en'))) || '',
                name_de: _.first(_.compact(_.map(aliases, 'name_de'))) || '',
                contents: [],
                languages: [],
                nationalities: []
              },
              parallels = [];
          
          console.log(clc.blackBright('person: ', clc.yellowBright(person.original_slug)), 'aliases:', aliases.length);
          // console.log(person);
          // get language for each biography.
          // import anationality as well
          var qi = async.queue(function (alias, nextAlias) {
                var qii = async.queue(function (language, nextLanguage) {
                      fs.readFile('contents/contents/' + alias.doi + '_' + language + '.txt', function (err, contents) {
                        if(err) {
                          console.log(clc.blackBright('language not found', language,  alias.doi))
                          nextLanguage();
                          return;
                        }
                        /* step 1: get contents per doi and per language */
                        console.log(clc.blackBright('language found'), clc.greenBright(language))
                        person.languages.push(language);
                        
                        /* step 2: extract some information, if any are available */
                        _.compact(('' + contents).split(/\n/)).map(function (d) {
                          d = d.replace(/^[^\w]*/,'').replace(/\t/,'');// cleaning not common letters;
                          // check if it contains the nationality
                          var nationality = d.match(/(Nationalité|Nationality|Staatsangehörigkeit)[\s:]*(.*)/);
                          if(nationality)
                            person['nationality_' + language] = nationality[2];
                          
                          // check if there are years.
                          var years = helpers.extract.years(d);
                          if(years.length) {
                            if(!person['duties_' + language])
                              person['duties_' + language] = [];
                            person['duties_' + language].push({
                              position: d,
                              years: years,
                              doi: alias.doi
                            })
                          }
                          return d;
                        });
                        /*step 4: save contents locally */
                        person.contents.push({
                          language: language,
                          doi: alias.doi,
                          contents: '' + contents
                        });
                        nextLanguage();
                      });
                    });
                qii.push(LANGUAGES);
                qii.drain = function() {
                  // resolve and sort languages
                  person.languages = _.uniq(person.languages).sort()
                  if(aliases.length > 1)
                    specials[person.original_slug] = person
                  
                  nextAlias();
                }
              });
          qi.push(aliases);
          qi.drain = function() {
            persons[person.original_slug] = person;
            nextAliases();
          }
        }, 1);
    q.push(_.values(biographies));
    q.drain = function(){
      fs.writeFileSync('data/biography.full.json', JSON.stringify(persons, null, 2));
      fs.writeFileSync('data/biography.aliases.json', JSON.stringify(specials, null, 2));
      console.log(clc.cyanBright('saved'),_.values(specials).length ,'biograhpies having aliases');
      console.log(clc.cyanBright('saved'),_.values(biographies).length ,'biograhpies');
      next(null, persons);
    }
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
        ISO_CODES   = require('../ISO_3166-1');
    
    var q = async.queue(function (person, nextPerson) {
          console.log(clc.blackBright('person: ', clc.yellowBright(person.original_slug)), 'aliases:', person.dois.length);
          
          neo4j.query('MATCH (per:person) WHERE per.original_slug = {original_slug} OR per.original_slug={old_slug} return per', {
            original_slug: person.original_slug,
            old_slug: '-' + person.original_slug
          }, function (err, nodes) {
            if(err)
              throw err;
            if(nodes.length == 1) {
              // update node with nationalities.
              var qi = async.queue(function (nationality, nextNationality) {
                    var lookup = {};
                    lookup[nationality.key] = nationality.value
                    // find code for nationality
                    var country = _.result(_.find(ISO_CODES, lookup), 'code');
                    person.nationalities.push(country)
                    // console.log(person.original_slug, nationality.value, country?country:clc.redBright('not found'))
                    nextNationality();
                  }, 1);
              qi.push(_.compact(LANGUAGES.map(function (d) {
                return person['nationality_' + d]? {
                  key: 'nationality_' + d,
                  value: person['nationality_' + d].replace(/\?/g, '').trim()
                }: undefined;
              })));
              
              qi.drain = function() {
                person.nationalities = _.compact(_.uniq(person.nationalities));
                console.log('         nationality: ',clc.greenBright(person.nationalities.join('')))
                nodes[0].doi = person.doi;
                nodes[0].dois = person.dois;
                // update nodes with dois
                neo4j.save(nodes[0], function (err){
                  if(err)
                    throw err;
                  nextPerson();
                });
              }
              
            } else if(nodes.length > 1) {
              console.log(nodes)
              throw 'resolve duplicates MANUALLY...'
            } else {
              Person.merge_incomplete({
                original_slug: person.original_slug,
                name: person.name,
                doi: person.doi,
                dois: person.dois,
                languages: person.languages
              }, function (err, per) {
                if(err)
                  throw err;
                //nextPerson()
                console.log(per)
              }) 
            }
          });
        });
    q.push(_.values(persons));
    q.drain(next)
    
  }
  
 
  
  
], function(err) {
  if(err) {
    console.log(err);
    console.log('biographies task', clc.redBright('error'));
  } else
    console.log('biographies task', clc.cyanBright('completed'));
})

