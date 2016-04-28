var fs          = require('fs'),
    settings    = require('../settings'),
    options     = require('minimist')(process.argv.slice(2));
    async       = require('async'),
    _           = require('lodash'),
    clc         = require('cli-color'),
    
    tasks       = require('require-all')({
                    dirname: __dirname + '/tasks',
                    filter  :  /(.*).js$/
                  }),
    task = '';

console.log(clc.yellowBright('looking for'), options.task, 'in', _.keys(tasks) );

task = _.get(tasks, options.task);
if(!task) {
  console.log(clc.blackBright(' task', clc.whiteBright(options.task || 'null'), clc.redBright('not found'), 'please specify a valid', clc.whiteBright('--task'),'param'));
  console.log('available tasks starts with:', _.keys(tasks))
  console.log("\n\n");
  return;
}
console.log(clc.cyanBright('executing'), options.task)

async.waterfall([
  // send initial options
  function init(callback) {
    callback(null, options);
  },
  tasks.common.tick.start
].concat(_.isArray(task)? task: [task])
 .concat([tasks.common.tick.end]), function (err) {
  if(err) {
    console.warn(err);
    console.log(clc.blackBright('\n task'), clc.whiteBright(options.task), clc.redBright('exit with error'));
  } else
    console.log(clc.blackBright('\n task'), clc.whiteBright(options.task), clc.cyanBright('completed'));
  
  console.log("\n\n")
});

