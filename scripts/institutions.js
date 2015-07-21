/*
  Institutions
  ============
  
  Load JSON data into a proper neo4j db, v.2.2.
  
  
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
    ISO_CODES   = require('../ISO_3166-1'),
    Person     = require('../models/person');

console.log('\n\n                                      __^__');
console.log('                                     /(o o)\\');
console.log('==================================oOO==(_)==OOo=======================\n');

/*
  Parse the tsv file and create the related institution according to the position.
*/
if(options.parse) {
  if(!options.source) {
    console.log('Please specify', clc.redBright('--source=/path/to/source.tsv'));
    return;
  }
  async.waterfall([
        
    function importInstitutionsFromCSV (next) {
      csv.parse(''+fs.readFileSync(options.source), {
        columns : true,
        delimiter: '\t'
      }, function (err, data) {
        if(err) {
          next(err);
          return;
        }
        var slugs = data.map(function (d) {
          var _d = {};
          // _.result(_.find(ISO_CODES, lookup), 'code');
          if(d.institution == 'Ministry') {
            _d.name = d.label;
            _d.slug =  helpers.extract.smartSlug(d.institution + '-' + d.tag)
          } else {
            _d.name = d.institution;
            _d.slug =  helpers.extract.smartSlug(d.institution)
          }
          if(d.url.match('dbpedia'))
            _d.wiki_id = _d.url = d.url;
          else
            _d.url = d.url;
          
          return _d
        }).sort().filter(function (d) {
          return d.slug.length > 0
        });
        console.log(_.indexBy(slugs, 'slug'))
        next()
      })
    }
    
  ], function (err) {
    if(err) {
      console.log(err);
      console.log('parse task', clc.redBright('error'));
    } else
      console.log('parse task', clc.cyanBright('completed'));
  });
}