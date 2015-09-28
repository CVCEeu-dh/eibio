/*
  Shared tasks for manage.js script
  npm manage --task=
*/
var settings   = require('../../settings'),
    inquirer     = require('inquirer')
    fs         = require('fs'),
    csv        = require('csv'),

    exectimer  = require('exectimer');
    
module.exports = {
  tick: {
    start: function(options, callback) {
      options.__tick = new exectimer.Tick("TIMER");
      console.log(clc.yellowBright('\n   tasks.helpers.tick.start'));
      options.__tick.start()
      callback(null, options)
    },
    end: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.tick.end'));
      options.__tick.stop();
      console.log(clc.blackBright("   It took: "), exectimer.timers.TIMER.duration()/1000000000);
      callback(null, options)
    },
  },
  
  
  prompt: {
    confirm: function(options, callback) {
      inquirer.prompt([{
        type: 'confirm',
        name: 'YN',
        message: ' Press enter to continue, otherwise exit by typing "n"',
      }], function( answers ) {
          // Use user feedback for... whatever!! 
        if(answers.YN)
          callback(null, options)
        else
          callback('exit on prompt')
      });
    }
  },
  
  /*
    Print out a csv file, to be used in a waterfall, with err.
    require as options
      filepath
      records
      fields
  */
  csv: {
    checkTarget: function(options, callback) {
      if(!options.target) {
        return callback(' Please specify the OUTPUT file path with WRITE permissions with --target=path/to/target.csv');
      }
      callback(null, options);
    },
    checkSource: function(options, callback) {
      if(!options.source) {
        return callback(' Please specify the INPUT file path with READ permissions with --source=path/to/source.csv');
      }
      callback(null, options);
    },
    stringify: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.csv.stringify'));
      csv.stringify(options.records, {
        delimiter: options.delimiter || '\t',
        columns:   options.fields,
        header:    true
      }, function (err, data) {
        fs.writeFile(options.target,
           data, function (err) {
          if(err) {
            callback(err);
            return
          }
          callback(null, options);
        })
      });
    },
    /*
      REQUIRE an absolute or relative to this file task
    */
    parse: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.csv.parse'));
      if(!options.source) {
        return callback(' Please specify the file path with --source=path/to/source.tsv');
      }
      csv.parse(''+fs.readFileSync(options.source), {
        columns : true,
        delimiter: options.delimiter || '\t'
      }, function (err, data) {
        if(err) {
          callback(err);
          return;
        }
        console.log(clc.blackBright('   parsing csv file completed, example:'));
        console.log(_.first(data));
        console.log(clc.blackBright('   ', clc.magentaBright(data.length), 'records found'));
        options.data = data;
        callback(null, options);
      });
    }
  },
  

};