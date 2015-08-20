/*
  Institutions
  ============
  
  Load JSON data into a proper neo4j db, v.2.2.
  
  example usage
  
  > node .\scripts\institutions.js --source=data\institutions.tsv
*/
var fs         = require('fs'),
    path       = require('path'),
    csv        = require('csv'),
    settings   = require('../settings'),
    helpers    = require('../helpers'),
    neo4j      = require('seraph')(settings.neo4j.host),
    async      = require('async'),
    _          = require('lodash'),
    clc        = require('cli-color'),
    
    options    = require('minimist')(process.argv.slice(2)),
    
    queries    = require('decypher')('./queries/entity.cyp'),
    ISO_CODES  = require('../ISO_3166-1'),
    
    
    COLUMNS    = [ // columns that HAVE TO BE PRESENT IN THE SOURCE TSV FILE!!!!
      'original_slug',    // changed slug 
      'slug',
      'country', // ISO country code, three letters.
      'name',
      'title_en',
      'title_fr',
      'viaf_id',
      'wiki_id',
      'url',
      'address', // the complete, well formatted address (geonames or geocoding api)
      'lat',     // decimal, like 12.0988
      'lng'      // decimal, too
    ],
    
    Institution = require('../models/institution');
    

console.log('\n\n                                      __^__');
console.log('                                     /(o o)\\');
console.log('==================================oOO==(_)==OOo=======================\n');

/*
  Printout all the metadata available for the institutions
*/
if(options.stringify) {
  async.waterfall([
    function getInstitutionsFromNeo4j (next) {
      neo4j.query('MATCH (n:institution) RETURN n', function (err, nodes) {
        if(err) {
          next(err);
          return;
        }
        
        next(null, {
          records: nodes.map(function (d) {
            d.original_slug = d.slug;
            d.title_en = d.name;
            d.title_fr = d.title_fr || d.title_en;
            return d
          }),
          filepath: 'contents/institutions.tsv',
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
  Parse the tsv file thus modifing the institutions (e.g, in order to better translate them).
*/
if(options.nparse) {
  
  return;
}
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
        console.log(data)
        var slugs = data.filter(function (d) {
          return d.status != 'Error'  
        }).map(function (d, i) {
          var _d = {
            viaf_id: d['viaf-institution'],
            address: d['formatted-address'],
            position: {
              tag: d.tag,
              
              country: _.result(_.find(ISO_CODES, {value: d.country}), 'code')
            },
            c: i
          };
          
          if(d.institution == 'Ministry') {
            _d.name = _.compact([
              d['url-label'],
              d['tag'],
              d['secondary-tag']
            ]).join(', ');
          } else {
            _d.name = d.institution;
          }
          
          if(!_.isEmpty(d['institution-location'])) {
            _d.country = _.result(_.find(ISO_CODES, {
              short: _.last(helpers.extract.smartSlug(d['institution-location']).split('-')).toUpperCase()
            }), 'code');
            if(!_d.country) {
              console.log(d)
              throw d['institution-location']
            }
          }
            
          _d.slug =  helpers.extract.smartSlug([
            _d.name,
            _d.country || ''
          ].join(' '));
          
          _d.position.name = d.title_en.replace(/[\(\d;–\)]/g, ' ')
                      .replace(/\s-\s/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim();
                      
          _d.position.slug = helpers.extract.smartSlug(_d.position.name + ' ' + (_d.position.country || ''));
                      
          if(!_.isEmpty(d.url)) {
            _d.url = d.url;
            if(d.url.match('dbpedia'))
            _d.wiki_id = path.basename(_d.url);
          }
          // latitude and longitude coordinates
          if(d['geo-lat-lng']) {
            _d.lat = d['geo-lat-lng'].split(',')[0].trim()
            _d.lng = d['geo-lat-lng'].split(',')[1].trim()
          }
          
          return _d
        }).sort().filter(function (d) {
          return d.slug.length > 0
        });
        var institutions = _.values(_.groupBy(slugs, 'slug'));
        //console.log(_.take(institutions, 1))
        console.log('importing', institutions.length, 'institutions over', data.length)
        next(null, institutions)
      })
    },
    
    function saveInstitutions(institutions, next) {
      var q = async.queue(function (positions, nextInstitution) {
        //console.log(institution)
        Institution.merge(_.first(positions), function (err, node) {
          if(err)
            throw err;
          console.log("institution", clc.yellow(node.slug), clc.cyanBright('saved'), clc.blackBright(q.length(), 'remaining'));
          var _q = async.queue(function (position, nextPosition) {
            // hidden queue: add activity to institution, if any activity has been provided !
            neo4j.query('MATCH (act:activity) WHERE act.slug = {slug} RETURN act', {
              slug: position.slug
            }, function (err, activities) {
              if(activities.length) {
                console.log("  --> ", clc.yellowBright(position.slug), activities.length, clc.cyanBright('saved'), clc.blackBright(q.length(), 'remaining'));
                // save the link between the institution and the activity.
                Institution.addRelatedActivity(node, activities[0], function (err) {
                  if(err)
                    throw err;
                  nextPosition();
                })
                
              } else{
                console.log("  --> ", clc.yellowBright(position.slug), clc.redBright('failed'), clc.blackBright(q.length(), 'remaining'));
                nextPosition();
              }
            })
          });
          _q.push(_.map(positions, 'position'));
          _q.drain = nextInstitution;
        })
      }, 1);
      q.push(_.take(institutions, institutions.length));
      q.drain = next;
    }
    
  ], function (err) {
    if(err) {
      console.log(err);
      console.log('parse task', clc.redBright('error'));
    } else
      console.log('parse task', clc.cyanBright('completed'));
  });
}