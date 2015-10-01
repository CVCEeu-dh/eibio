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
var fs          = require('fs'),
    options     = require('minimist')(process.argv.slice(2));
    async       = require('async'),
    _           = require('lodash'),
    clc         = require('cli-color'),
    
    tasks       = require('require-all')({
                    dirname: __dirname + '/tasks',
                    filter  :  /(.*).js$/
                  }),
    
    availableTasks = {
      'demo': [
        tasks.helpers.tick.start,
        tasks.helpers.tick.end
      ],
      'parse-bio': [
        tasks.helpers.checkId,
        tasks.helpers.checkTarget,
        tasks.helpers.tick.start,
        tasks.person.getOne,
        tasks.person.parseBio,
        tasks.helpers.csv.stringify,
        tasks.helpers.tick.end
        
      ],
      'stringify-people': [
        tasks.helpers.checkTarget,
        tasks.helpers.tick.start,
        tasks.person.getMany,
        tasks.helpers.csv.stringify,
        tasks.helpers.tick.end
      ],
      'remove-person': [
        tasks.helpers.tick.start,
        tasks.person.getOne,
        tasks.helpers.prompt.confirm,
        tasks.person.removeOne,
        tasks.helpers.tick.end
      ],
      'get-person': [
        tasks.helpers.tick.start,
        tasks.person.getOne,
        tasks.helpers.tick.end
      ],
      /*
        Specify a target as well, a place where it will backup a local copy.
      */
      'update-people': [
        tasks.helpers.checkSource,
        tasks.helpers.checkTarget,
        tasks.person.getMany,
        tasks.helpers.csv.stringify,
        tasks.helpers.tick.start,
        tasks.helpers.csv.parse,
        tasks.helpers.prompt.confirm,
        tasks.person.updateMany,
        tasks.helpers.tick.end
      ],
      
      'link-people-activities': [
        tasks.helpers.checkSource,
        tasks.helpers.tick.start,
        tasks.helpers.csv.parse,
        tasks.person.linkActivities,
        tasks.helpers.tick.end
      ],
      
      'stringify-activities': [
        tasks.helpers.checkTarget,
        tasks.helpers.tick.start,
        tasks.activity.getMany,
        tasks.helpers.csv.stringify,
        tasks.helpers.tick.end
      ],
      /*
        Require: id and slug field to be present. cfr stringify-activities.
        It writes a backup file in target
      */
      'merge-activities': [
        tasks.helpers.checkSource,
        tasks.helpers.checkTarget,
        tasks.helpers.tick.start,
        tasks.activity.getMany,
        tasks.helpers.csv.stringify,
        tasks.helpers.csv.parse,
        // tasks.helpers.prompt.confirm,
        tasks.activity.mergeMany,
        tasks.helpers.tick.end
      ]
    };

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
  }
].concat(availableTasks[options.task]), function (err) {
  if(err) {
    console.warn(err);
    console.log(clc.blackBright('\n task'), clc.whiteBright(options.task), clc.redBright('exit with error'));
  } else
    console.log(clc.blackBright('\n task'), clc.whiteBright(options.task), clc.cyanBright('completed'));
  
  console.log("\n\n")
});


