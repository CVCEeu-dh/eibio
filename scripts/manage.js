/*
  Import tsv file into Neo4J
  ---
  
  Import UTF8 tsv data into neo4j.
  Schema
  languages: en,fr comma separated
    
  all other fields will be stored as well.
  Note that if a slug field is present.
  
  task=
*/
var settings    = require('../settings'),
    fs          = require('fs'),
    options     = require('minimist')(process.argv.slice(2));
    async       = require('async'),
    _           = require('lodash'),
    clc         = require('cli-color'),
    
    tasks       = require('require-all')({
                    dirname: __dirname + '/tasks',
                    filter  :  /(.*).js$/
                  }),
    
    availableTasks = _.assign({

      'create-people': [
        tasks.helpers.checkSource,
        tasks.helpers.csv.parse,
        tasks.person.createMany
      ],

      'get-person-activities': [
        tasks.helpers.checkTarget,
        tasks.person.getOne,
        tasks.person.getActivities,
        tasks.helpers.csv.stringify
      ],

      'set-people-activities': [
        tasks.helpers.checkSource,
        tasks.helpers.csv.parse,
        tasks.person.setActivities,
        // tasks.person.checkActivities,
        tasks.activity.setInstitutions
      ],
      



      'demo': [
        
      ],
      'parse-bio': [
        tasks.helpers.checkId,
        tasks.helpers.checkTarget,
        tasks.person.getOne,
        tasks.person.parseBio,
        tasks.helpers.csv.stringify,
      ],
      'stringify-people': [
        tasks.helpers.checkTarget,
        tasks.person.getMany,
        tasks.helpers.csv.stringify,
      ],
      
      'remove-person': [
        tasks.person.getOne,
        tasks.helpers.prompt.confirm,
        tasks.person.removeOne,
      ],
      
      'find-people-by-doi': [
        tasks.helpers.checkSource,
        tasks.helpers.checkTarget,
        tasks.helpers.csv.parse,
        tasks.person.getManyByDoi,

        tasks.helpers.csv.stringify,
      ],
      'get-person': [
        tasks.person.getOne,
      ],
      
      'get-person-activities': [
      tasks.helpers.checkTarget,
        tasks.person.getOne,
        tasks.person.getActivities,
       tasks.helpers.csv.stringify
      ],
      

      
      'viaf-people': [
        tasks.person.getMany,
        tasks.services.viaf,
      ],
      
      'dbpedia-people': [
        tasks.person.getMany,
        tasks.services.dbpedia,
      ],
      
      'wikidata-people': [
        tasks.person.getMany,
        tasks.services.wikidata,
      ],
      'alternatenames-people': [
        tasks.person.getMany,
        tasks.services.alternatenames,
        
      ],
      /*
        Specify a target as well, a place where it will backup a local copy.
      */
      'update-people': [
        tasks.helpers.checkSource,
        tasks.helpers.checkTarget,
        tasks.person.getMany,
        tasks.helpers.csv.stringify,
        tasks.helpers.csv.parse,
        tasks.helpers.prompt.confirm,
        tasks.person.updateMany,
        
      ],
      
      'link-people-activities': [
        tasks.helpers.checkSource,
        tasks.helpers.csv.parse,
        tasks.person.linkActivities,
        
      ],
      
      'stringify-activities': [
        tasks.helpers.checkTarget,
        tasks.activity.getMany,
        tasks.helpers.csv.stringify,
        
      ],
      
      'stringify-institutions': [
        tasks.helpers.checkTarget,
        tasks.institution.getMany,
        tasks.helpers.csv.stringify,
        
      ],
      
      /*
        Require a compiled address field for the institution
      */
      'geocode-institutions': [
        tasks.institution.getMany,
        tasks.services.geocode,
        
      ],
      
      'dbpedia-institutions': [
        tasks.institution.getMany,
        tasks.services.dbpedia,
        
      ],
      
      'viaf-institutions': [
        tasks.institution.getMany,
        tasks.services.viaf,
        
      ],
      
      'wikidata-institutions': [
        tasks.institution.getMany,
        tasks.services.wikidata,
        
      ],
      
      'alternatenames-institutions': [
        tasks.institution.getMany,
        tasks.services.alternatenames,
        
      ],
      
      'alternatenames-institution': [
        tasks.institution.getOne,
        tasks.services.alternatenames,
        
      ],
      'update-institutions': [
        tasks.helpers.checkSource,
        // tasks.helpers.checkTarget,
        tasks.institution.getMany,
        // tasks.helpers.csv.stringify,
        tasks.helpers.csv.parse,
        tasks.helpers.prompt.confirm,
        tasks.institution.updateMany,
        
      ],
      /*
        BEWARE: FOR MIGRATION ONLY
        Require: id and slug field to be present. cfr stringify-institutions.
        It writes a backup file in target
      */
      'merge-institutions': [
        tasks.helpers.checkSource,
        // tasks.helpers.checkTarget,
        tasks.institution.getMany,
        // tasks.helpers.csv.stringify,
        tasks.helpers.csv.parse,
        tasks.helpers.prompt.confirm,
        tasks.institution.mergeMany,
        
      ],
      /*
        BEWARE: FOR MIGRATION ONLY
        Require: id and slug field to be present. cfr stringify-activities.
        It writes a backup file in target
      */
      'merge-activities': [
        tasks.helpers.checkSource,
        tasks.helpers.checkTarget,
        
        tasks.activity.getMany,
        tasks.helpers.csv.stringify,
        tasks.helpers.csv.parse,
        tasks.helpers.prompt.confirm,
        tasks.activity.mergeMany,
        
      ],
      
      /*
        Test query, BEWARE when testing SET or CREATE or MERGE statements!!
      */
      'query': [
        tasks.helpers.cypher.raw,
      ],

      /*
        perform index installation
      */
      'setup': [
        tasks.setup.indexes,
      ],
    },  settings.availableTasks || {});

console.log(clc.whiteBright( "\n\n +-+-+ "));
console.log(clc.whiteBright( " |EIBIO| "));
console.log(clc.whiteBright( " +-+-+ \n\n"));

if(!availableTasks[options.task]) {
  console.log(clc.blackBright(' task', clc.whiteBright(options.task || 'null'), clc.redBright('not found'), 'please specify a valid', clc.whiteBright('--task'),'param'));
  console.log(clc.blackBright(' available tasks: '), _.keys(availableTasks));
  console.log("\n\n");
  return;
} 

// the waterfall specified for the task
async.waterfall([
  // send initial options
  function init(callback) {
    callback(null, options);
  },
  tasks.helpers.tick.start
  
].concat(availableTasks[options.task].map(function (d) {
  if(typeof d == 'function')
    return d;
  var fn = _.get(tasks, d.replace('tasks.', ''));
  if(typeof fn != 'function') {
    console.log(clc.blackBright('\n task'), clc.whiteBright(d), clc.redBright('not found in task list'))
  }
  return fn
})).concat([tasks.helpers.tick.end]), function (err) {
  if(err) {
    console.warn(err);
    console.log(clc.blackBright('\n task'), clc.whiteBright(options.task), clc.redBright('exit with error'));
  } else
    console.log(clc.blackBright('\n task'), clc.whiteBright(options.task), clc.cyanBright('completed'));
  
  console.log("\n\n")
});


