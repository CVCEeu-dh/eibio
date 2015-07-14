/*
  Harvester.
  ==========
  
  Load JSON data into a proper neo4j db, v.2.2.
  contents .tsv location should be specified as options.source
  
  > node .\scripts\activities.js --source=contents\activities.tsv
*/
var fs         = require('fs'),
    csv        = require('csv'),
    
    settings   = require('../settings'),
    helpers    = require('../helpers'),
    neo4j      = require('seraph')(settings.neo4j.host),
    
    async      = require('async'),
    _          = require('lodash'),
    clc        = require('cli-color'),
    options    = require('minimist')(process.argv.slice(2));
    

console.log('\n\n                                      __^__');
console.log('                                     /(o o)\\');
console.log('==================================oOO==(_)==OOo=======================\n');

if(!options.source) {
  console.log('Please specify', clc.redBright('--source=/path/to/activities.tsv'));
  return;
}

var disambiguated_positions = {
      en: [],
      fr: []
    };
    
async.waterfall([
  function importDisambiguatedPositions(next) {
    csv.parse(''+fs.readFileSync('./contents/positions.tsv'), {columns : true, delimiter: '\t', quote: '´'}, function (err, data) {
      if(err)
        throw err;
      // clean data here
      disambiguated_positions.en = data.map(function (d) {
        return helpers.extract.smartSlug(d['Forme anglaise']);
      });
      disambiguated_positions.fr = data.map(function (d) {
        return helpers.extract.smartSlug(d['Forme française']);
      });
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

      // add description based on activities without date;
      var q = async.queue(function (per, nextPerson) {
          neo4j.query('MATCH (n:person) WHERE n.original_slug = {slug} RETURN n', 
            per, function (err, nodes) {
              if(err)
                throw err;
              if(!nodes.length) {
                nextPerson();
                return;
              };
              if(!nodes.length > 0) {
                throw 'duplicate person slug!'
              };
              nodes[0].description_en = per.description_en;
              nodes[0].description_fr = per.description_fr;
              neo4j.save(nodes[0], function (err, n) {
                if(err)
                  throw err;
                nextPerson();
              })
              
            });
          }, 1);
      // clean data here
      var people = {};
      data.forEach(function (d, i) {
        if(!people[d.slug])
          people[d.slug] = {
            slug: d.slug,
            duties_fr: [],
            duties_en: [],
            description_en: '',
            description_fr: ''
          };
          
        if(!d.pos_0_start.trim().length)
          people[d.slug]['description_' + d.language] = d.position;
        else{
          // collecting duties ...
          var match = false;
          if(!d.language) {
            console.log(d, i)
          }
          for(var j = 0 ; j <  disambiguated_positions[d.language].length; j++) {
            if(helpers.extract.smartSlug(d.position).indexOf(disambiguated_positions[d.language][j].toLowerCase()) != -1) {
              // console.log(d.position, '---', disambiguated_positions[d.language][i]);
              // leaned position
              match = true;
              break;
            }
          }
          if(!match)
            console.log(clc.blackBright('not matching'), d.position)
        }
        // console.log(d.pos_0_start.trim(),d.pos_1_start.trim().length)
        // console.log(people[d.slug])
      })
      //console.log(people)
      q.push(_.values(people));
      q.drain = function() {
        
      }
      
      
      
    })
  }
], function() {
  
})
