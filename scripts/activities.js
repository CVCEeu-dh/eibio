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
    csv        = require('csv'),
    
    settings   = require('../settings'),
    helpers    = require('../helpers'),
    
    neo4j      = require('seraph')(settings.neo4j.host),
    activity   = require('../models/activity'),
    
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

var COUNTRY_CODES = require('../ISO_3166-1.js'),
    disambiguated_positions = {
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
      
      // clean data here
      var people = {},
          toberealigned = [],
          aligned       = [];
          
      data.forEach(function (d, i) {
        if(!people[d.slug])
          people[d.slug] = {
            slug: d.slug,
            duties_fr: [],
            duties_en: [],
            activities: {}
          };
          
        if(!d.pos_0_start.trim().length)
          return;
        
        // add duties
        for(var j = 0; j < 10; j++) {
          if(!d['pos_' + j + '_start'])
            break;
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
          
          people[d.slug]['duties_' + d.language].push({
            position: d.position,
            country: country,
            start_date: start_date,
            start_time: start.time, // 1980-01-01
            end_date: end_date,
            end_time: end.time, // 1980-01-01
          });
        };
      });
      
      // get statistics
      for(var slug in people) {
        var years_fr = _.indexBy(people[slug].duties_fr, function(d) {
          return d.start_date + '-' + d.end_date;
        });
        var years_en = _.indexBy(people[slug].duties_en, function(d) {
          return d.start_date + '-' + d.end_date;
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
          console.log('perfect overlapping for', clc.yellowBright(slug))//, _.keys(years_en), _.keys(years_fr));
          for(var year in years_en) {
            if(!people[slug].activities[year])
              people[slug].activities[year] = {
                country: years_en[year].country,
                start_date: years_en[year].start_date,
                start_time: years_en[year].start_time, // 1980-01-01
                end_date: years_en[year].end_date,
                end_time: years_en[year].end_time
              }
            people[slug].activities[year].description_en = years_en[year].position;
            people[slug].activities[year].description_fr = years_fr[year].position;
          }
          
          aligned.push({
            slug: slug,
            language: 'en',
            difference: difference_fr
          })
        }
      };
      
      console.log(toberealigned)
      console.log('aligned:    ', aligned.length)
      console.log('NOT aligned:', toberealigned.length);
      var notyetaperson = [];
      
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
              console.log(clc.blackBright('saving activities for'), clc.yellowBright(slug), nodes[0].original_slug, nodes[0].slug)
              
              var qi = async.queue(function (act, nextActivity) {
                activity.merge({
                  person: nodes[0],
                  description_en: act.description_en,
                  description_fr: act.description_fr,
                  start_date: act.start_date,
                  start_time: act.start_time, // 1980-01-01
                  end_date: act.end_date,
                  end_time: act.end_time, // 1980-01-01
                  country: act.country
                }, function(err) {
                  if(err)
                    throw err;
                  nextActivity();
                });
              }, 1);
              
              qi.push(_.values(people[slug].activities));
              qi.drain = nextSlug;
            });
          }, 1);
      
      //console.log(people)
      q.push(_.unique(_.map(aligned, 'slug')));
      q.drain = function() {
        fs.writeFileSync('script.activities.report.json', JSON.stringify(notyetaperson.map(function(slug) { return people[slug] }), null, 2));
        console.log(clc.blackBright('missing people'), notyetaperson.length)
        console.log(clc.cyanBright('completed'))
      }
      
      
      
    })
  }
], function() {
  
})
