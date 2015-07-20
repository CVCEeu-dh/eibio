/*
  Harvester.
  ==========
  
  Load JSON data into a proper neo4j db, v.2.2.
  contents .tsv location should be specified as options.source
  
  Transfer json file should be provided inside the contents folder
  and named according to settings
*/
var fs         = require('fs'),
    csv        = require('csv'),
    settings   = require('../settings'),
    helpers    = require('../helpers'),
    neo4j      = require('seraph')(settings.neo4j.host),
    async      = require('async'),
    _          = require('lodash'),
    clc        = require('cli-color'),
    
    options    = require('minimist')(process.argv.slice(2)),
    
    queries    = require('decypher')('./queries/entity.cyp'),
    
    Person     = require('../models/person');

console.log('\n\n                                      __^__');
console.log('                                     /(o o)\\');
console.log('==================================oOO==(_)==OOo=======================\n');


/*
  Printout all the metadata needed
*/
if(options.stringify) {
  async.waterfall([
        
    function getPersonsFromNeo4j (next) {
      neo4j.query('MATCH (n:person) RETURN n', function (err, nodes) {
        if(err) {
          next(err);
          return;
        }
        
        next(null, {
          records: nodes.map(function (d) {
            // clean abstract_fr and abstract_en, replace \n\n
            if(d.abstract_en)
              d.abstract_en = d.abstract_en.replace(/\n/g, ' ')
            if(d.abstract_fr)
              d.abstract_fr = d.abstract_fr.replace(/\n/g, ' ')
            return d
          }),
          filepath: 'contents/persons-metadata.csv',
          fields: [
            'original_slug',
            'slug',
            'doi',
            'name',
            'first_name',
            'last_name',
            'birth_date',
            'death_date',
            'birth_place',
            'death_place',
            'viaf_id',
            'wiki_id',
            'wiki_description',
            'abstract_fr',
            'abstract_en',
            'thumbnail'
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

if(options.parse) {
  
  async.waterfall([
        
    function importPersonsFromCSV (next) {
      if(!options.source) {
        console.log('Please specify', clc.redBright('--source=/path/to/source.tsv'));
        return;
      }
      csv.parse(''+fs.readFileSync(options.source), {columns : true, delimiter: '\t'}, function (err, data) {
        if(err) {
          next(err);
          return;
        }
        var slugs = {};
        
        var persons = data.filter(function (d) {
          return d.status != 'Rien trouvé'
                  && d.status != 'Duplicate'
                  && (d.first_name + d.last_name).trim().length > 0
        }).sort(function(a, b){
          return a.last_name > b.last_name
        }).map(function (d, i) {
          // create smart slug coming from first name and last_name !
          d.slug = helpers.extract.smartSlug(d.first_name + ' ' + d.last_name);
          d.original_slug = d.original_slug.replace(/^-/, '')
          console.log(clc.blackBright('  line', i, clc.yellowBright(d.slug), 'for' , d.first_name, clc.magentaBright(d.last_name)))
          
          if(slugs[d.slug])
            throw 'homonym found!'
          return d;
        });
        console.log(clc.blackBright(clc.yellowBright(persons.length), 'people found'))
        // console.log(persons);
        // // clean data here, group by slug ...
        // var people = _.filter(data, function (d) {
        //   return d.status != 'Rien trouvé' && d.status != 'Duplicate' && (d.wiki_id.length > 0 || d.viaf_id.length > 0);
        // });
        // // check for duplicates
        // var clones = _.difference(_.map(people, 'slug'), _.compact(_.map(people, 'slug')).length);
        // if(clones > 0) {
        //   console.log(clones)
        //   throw 'duplicates detected in file ...'
        // }
        
        next(null, persons);
      });
    },
    
    function mergePersons (persons, next) {
      
      var q = async.queue(function (person, nextPerson) {
        neo4j.query('MATCH (per:person) WHERE per.original_slug = {original_slug} OR per.original_slug = {prefixed_original_slug} OR per.slug = {slug} RETURN per', {
          original_slug: person.original_slug,
          prefixed_original_slug: '-' +  person.original_slug,
          slug: person.slug
        },function (err, nodes) {
          if (err) {
            next(err);
            return;
          };
          var now = helpers.now(),
                _person = {
                  original_slug: person.original_slug,
                  slug: person.slug,
                  name: person.name,
                  first_name: person.first_name,
                  last_name:  person.last_name,
                  creation_date: now.date,
                  creation_time: now.time,
                  wiki_id:    person.wiki_id,
                  viaf_id:    person.viaf_id
                },
                birth,
                death;
            
            birth = helpers.extract.dates(person.birth_date, 'YYYY-mm-DD');
            
            _person.birth_date = person.birth_date;
            _person.birth_time = birth.time;
            
            if(person.death_place.trim().length)
              _person.death_place = person.death_place; // disambiguated later ...
            if(person.death_date.trim().length) {
              death = helpers.extract.dates(person.death_date, 'YYYY-mm-DD');
              _person.death_date = death.date; // disambiguated later ...
              _person.death_time = death.time;
            }
          
          if(nodes.length == 0) {
            console.log(person);
            // save from scratch
            Person.merge(_person, function (err, node) {
              console.log(err)
              console.log(node);
              next('person just created, please restart')
            });
            return;
          }
          if(nodes.length > 1) {
            console.log(nodes)
            next('duplicate')
            return;
          }
          console.log(clc.blackBright('  original_slug', clc.yellowBright(person.original_slug), 'for', clc.magentaBright(person.last_name), 'viaf_id', person.viaf_id));
          // update some fields only
          // person.original
          Person.merge(_person, function (err, node) {
            if(err)
              throw err
            nextPerson();
            return
          });
         
        });
      }, 1);
      
      q.push(persons);
      q.drain = next;
      
    }
    
  ], function (err) {
    if(err) {
      console.log(err);
      console.log('parse task', clc.redBright('error'));
    } else
      console.log('parse task', clc.cyanBright('completed'));
  }); 
  return;
}


if(!options.source) {
  console.log('Please specify', clc.redBright('--source=/path/to/source.tsv OR/AND --activities=/path/to/activities.tsv'));
  return;
}


// async.waterfall([
//   /**

//   Step 1A
//   -------

//   Import and check for duplicates in file
//   */
//   function importPeopleFromSource(next) {
//     if(!options.source) { // skip this step is no source has been specified
//       console.log(clc.blackBright('source file not specified,', clc.yellowBright('skipping'), 'import people from source file'))
//       return;
//     }
//     // read options.source tsv file
//     csv.parse(''+fs.readFileSync(options.source), {
//       columns : true,
//       delimiter: '\t'
//     }, function (err, data) {
//       if(err)
//         throw err;
//       // filter by people having wiki or viaf
//       var people = _.sortBy(_.filter(data, function (d) {
//         return d.status != 'Rien trouvé'
//             && d.status != 'Duplicate'
//             && (d.wiki_id.trim().length > 0 || d.viaf_id.trim().length > 0)
//             && (d.first_name + d.last_name).trim().length
//             && d.birth_date.trim().length;
//       }), 'slug');
//       console.log(people)
//       // check for duplicates
//       var clones = _.difference(_.map(people, 'slug'), _.compact(_.map(people, 'slug')).length);
//       if(clones > 0) {
//         console.log(clones)
//         throw 'duplicates detected in file ...'
//       }
//       console.log(clc.blackBright(clc.yellowBright(people.length), 'people found having validated viaf_id or wiki_id'));
      
//       next(null, people);
//     });
//   },
//   /**

//   Step 1B
//   -------

//   Save entities into the db
//   */
//   function preparePeople(people, next) {
//     // create a proper slug ...
//     var slugs = [];
    
//     people = _.map(people, function (d) {
//       var slug = d.smart_slug || helpers.extract.smartSlug(d.first_name + ' ' + d.last_name);
//       console.log('  ', clc.yellowBright(slug), 'for' , d.first_name + ' ' + d.last_name)
//       if(slugs.indexOf(slug) !== -1 || !(d.first_name + d.last_name).trim().length) {
//         console.log(d);
//         throw 'dup' + slug; // @todo
//       }
      
//       slugs.push(slug);
//       slugs.sort();
      
//       var birth_date = helpers.extract.dates(d.birth_date, 'YYYY-mm-DD')
      
//       var person = {
//         slug: slug, // new lslug..
//         original_slug: d.slug,
//         first_name: d.first_name,
//         last_name: d.last_name,
//         name: d.name,
//         doi: d.doi || '',
//         birth_date: birth_date.date,
//         birth_time: birth_date.time,
//         birth_place: d.birth_place,
//         death_place: d.death_place,
//         thumbnail: d.thumbnail,
//         languages: ['en'],
//         viaf_id: d.viaf_id,
//         wiki_id: d.wiki_id,
//         abstract_en: ''
//       };
      
//       if(d.death_place.trim().length)
//         person.death_place = d.death_place; // disambiguated later ...
//       if(d.death_date.trim().length) {
//         var death_date = helpers.extract.dates(d.birth_date, 'YYYY-mm-DD')
//         person.death_date = death_date.date; // disambiguated later ...
//         person.death_time = death_date.time;
//       }
      
      
//       // look for people having
//       return person;
//     })
    
    
//     next(null, people)
//   },
  
//   function savePeopleIntoNeo4J (people, next) {
//     var q = async.queue(function (per, nextPerson) {
//       console.log('  saving', clc.yellowBright(per.slug), per.first_name + ' ' + per.last_name, per.doi);
      
//       person.merge(per, function (err, node) {
//         if(err)
//           throw err;
//         nextPerson()
//       });
    
//     }, 1);
//     q.push(people);
//     q.drain = next;
    
//     // person.merge({ 
//     //     slug: 'TEST-SLUG-HANDLE-WITH-CARE',
//     //     first_name: 'Simone',
//     //     last_name: 'Veil',
//     //     name: 'Simone Veil',
//     //     doi: '',
//     //     birth_date: '1927-07-13',
//     //     birth_time: -1355961180,
//     //     birth_place: 'Nice, Provence, France',
//     //     thumbnail: 'http://commons.w..',
//     //     viaf_id: '120689047', 
//     //     wiki_id: 'Simone_Veil',
//     //     languages: [ 'en' ],
//     //     abstract_en: '...'
//     //   }, function (err, per) {
//     //     __person = per;
//     //     should.not.exist(err)
//     //     done();
//     //   })
//   }
  
// ], function (err, people) {
//   console.log('\n',clc.blackBright(clc.cyanBright('completed'), 'imported', clc.yellowBright(people?people.length:0), 'people'),'\n');
// });



