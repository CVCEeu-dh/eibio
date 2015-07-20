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
    
    person     = require('../models/person');

console.log('\n\n                                      __^__');
console.log('                                     /(o o)\\');
console.log('==================================oOO==(_)==OOo=======================\n');


/*
  Printout all the metadata needed
*/
if(options.metadata) {
  async.waterfall([
        
    function getPersonsFromNeo4j (next) {
      neo4j.query('MATCH (n:person) RETURN n', function (err, nodes) {
        if(err) {
          next(err);
          return;
        }
        
        next(null, {
          records: nodes,
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
            'abstract',
            'thumbnail'
          ]
        });
      });
    },
    
    helpers.CSV.stringify
  
  ], function(err){
    if(err) {
      console.log(err);
      console.log('metadata task', clc.redBright('error'));
    } else
      console.log('metadata task', clc.cyanBright('completed'));
    }); 
  return;
}


if(!options.source) {
  console.log('Please specify', clc.redBright('--source=/path/to/source.tsv OR/AND --activities=/path/to/activities.tsv'));
  return;
}


async.waterfall([
  /**

  Step 1A
  -------

  Import and check for duplicates in file
  */
  function importPeopleFromSource(next) {
    if(!options.source) { // skip this step is no source has been specified
      console.log(clc.blackBright('source file not specified,', clc.yellowBright('skipping'), 'import people from source file'))
      return;
    }
    // read options.source tsv file
    csv.parse(''+fs.readFileSync(options.source), {
      columns : true,
      delimiter: '\t'
    }, function (err, data) {
      if(err)
        throw err;
      // filter by people having wiki or viaf
      var people = _.sortBy(_.filter(data, function (d) {
        return d.status != 'Rien trouvé'
            && d.status != 'Duplicate'
            && (d.wiki_id.trim().length > 0 || d.viaf_id.trim().length > 0)
            && (d.first_name + d.last_name).trim().length
            && d.birth_date.trim().length;
      }), 'slug');
      console.log(people)
      // check for duplicates
      var clones = _.difference(_.map(people, 'slug'), _.compact(_.map(people, 'slug')).length);
      if(clones > 0) {
        console.log(clones)
        throw 'duplicates detected in file ...'
      }
      console.log(clc.blackBright(clc.yellowBright(people.length), 'people found having validated viaf_id or wiki_id'));
      
      next(null, people);
    });
  },
  /**

  Step 1B
  -------

  Save entities into the db
  */
  function preparePeople(people, next) {
    // create a proper slug ...
    var slugs = [];
    
    people = _.map(people, function (d) {
      var slug = d.smart_slug || helpers.extract.smartSlug(d.first_name + ' ' + d.last_name);
      console.log('  ', clc.yellowBright(slug), 'for' , d.first_name + ' ' + d.last_name)
      if(slugs.indexOf(slug) !== -1 || !(d.first_name + d.last_name).trim().length) {
        console.log(d);
        throw 'dup' + slug; // @todo
      }
      
      slugs.push(slug);
      slugs.sort();
      
      var birth_date = helpers.extract.dates(d.birth_date, 'YYYY-mm-DD')
      
      var person = {
        slug: slug, // new lslug..
        original_slug: d.slug,
        first_name: d.first_name,
        last_name: d.last_name,
        name: d.name,
        doi: d.doi || '',
        birth_date: birth_date.date,
        birth_time: birth_date.time,
        birth_place: d.birth_place,
        death_place: d.death_place,
        thumbnail: d.thumbnail,
        languages: ['en'],
        viaf_id: d.viaf_id,
        wiki_id: d.wiki_id,
        abstract_en: ''
      };
      
      if(d.death_place.trim().length)
        person.death_place = d.death_place; // disambiguated later ...
      if(d.death_date.trim().length) {
        var death_date = helpers.extract.dates(d.birth_date, 'YYYY-mm-DD')
        person.death_date = death_date.date; // disambiguated later ...
        person.death_time = death_date.time;
      }
      
      
      // look for people having
      return person;
    })
    
    
    next(null, people)
  },
  
  function savePeopleIntoNeo4J (people, next) {
    var q = async.queue(function (per, nextPerson) {
      console.log('  saving', clc.yellowBright(per.slug), per.first_name + ' ' + per.last_name, per.doi);
      
      person.merge(per, function (err, node) {
        if(err)
          throw err;
        nextPerson()
      });
    
    }, 1);
    q.push(people);
    q.drain = next;
    
    // person.merge({ 
    //     slug: 'TEST-SLUG-HANDLE-WITH-CARE',
    //     first_name: 'Simone',
    //     last_name: 'Veil',
    //     name: 'Simone Veil',
    //     doi: '',
    //     birth_date: '1927-07-13',
    //     birth_time: -1355961180,
    //     birth_place: 'Nice, Provence, France',
    //     thumbnail: 'http://commons.w..',
    //     viaf_id: '120689047', 
    //     wiki_id: 'Simone_Veil',
    //     languages: [ 'en' ],
    //     abstract_en: '...'
    //   }, function (err, per) {
    //     __person = per;
    //     should.not.exist(err)
    //     done();
    //   })
  }
  
], function (err, people) {
  console.log('\n',clc.blackBright(clc.cyanBright('completed'), 'imported', clc.yellowBright(people?people.length:0), 'people'),'\n');
});



