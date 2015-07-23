/*
  Persons script.
  ==============
  
  Load JSON data into a proper neo4j db, v.2.2.
  contents .tsv location should be specified as options.source
  
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
    
    queries    = require('decypher')('./queries/person.cyp'),
    
    Person     = require('../models/person'),
    
    COLUMNS    = [ // columns that HAVE TO BE PRESENT IN THE SOURCE TSV FILE!!!!
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
          fields: COLUMNS
        });
      });
    },
    
    helpers.CSV.stringify
  
  ], function (err){
    if(err) {
      console.log(err);
      console.log('stringify task', clc.redBright('error'));
    } else
      console.log('stringify task', clc.cyanBright('completed'));
  }); 
  return;
  
}



/*
  Parse the metadata file and look for changes....
*/
if(options.parse) {
  if(!options.source) {
    console.log('Please specify the tsv path', clc.redBright('--source=/path/to/source.tsv'));
    return;
  }
  // brand new persons, for the moment pure import
  async.waterfall([
    function importPersonsFromCSV (next) {
      csv.parse(''+fs.readFileSync(options.source), {
        columns : true,
        delimiter: '\t'
      }, function (err, data) {
        if(_.difference(COLUMNS, _.keys(data[0])).length)
          return next('source file MUST contain the following column names: [' + COLUMNS.join(',') + ']');
        var newborns = data.filter(function (d) {
          return d.slug.trim().length == 0 && d.first_name.trim().length && d.last_name.trim().length;
        })
        console.log(clc.blackBright('found', clc.magentaBright(newborns.length), 'persons to create'));
        next(null, {
          newborns: newborns
        })
      });
    },
    
    function savePersons (persons, next) {
      var q = async.queue(function() {
        
      });
      // persons.newborns
      next(null, {})
    }
    
    
  ], function (err){
    if(err) {
      console.log(err);
      console.log(clc.blackBright('parse task', clc.redBright('error'), 'for'), options.source);
    } else
      console.log(clc.blackBright('parse task', clc.cyanBright('completed'), 'for'), options.source);
  }); 
  return;
}
  
  
  
console.log(options)
console.log('task', clc.redBright('not found'));