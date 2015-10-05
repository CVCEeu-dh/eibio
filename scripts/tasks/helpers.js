/*
  Shared tasks for manage.js script
  npm manage --task=
*/
var settings   = require('../../settings'),
    inquirer     = require('inquirer'),
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
  
  checkId: function(options, callback) {
    if(!options.id) {
      return callback(' Please specify the neo4J node ID --id=1234');
    }
    callback(null, options);
  },
  checkTarget: function(options, callback) {
    if(!options.target) {
      return callback(' Please specify the OUTPUT file path with WRITE permissions with --target=path/to/target');
    }
    callback(null, options);
  },
  checkSource: function(options, callback) {
    if(!options.source) {
      return callback(' Please specify the INPUT file path with READ permissions with --source=path/to/source');
    }
    callback(null, options);
  },
  /*
    Print out a csv file, to be used in a waterfall, with err.
    require as options
      filepath
      records
      fields
  */
  csv: {
    
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
        
        console.log(clc.blackBright('   ', clc.magentaBright(data.length), 'lines'));
        options.data = data;
        callback(null, options);
      });
    }
  },
  
  cypher: {
    raw: function(options, callback) {
      console.log(clc.yellowBright('\n   tasks.helpers.cypher.raw'));
      if(!options.cypher) {
        return callback(' Please specify the query path (decypher file without .cyp extension followed by / query name), e.g. --cypher=resource/count_related_users');
      }
      
      var path = options.cypher.split('/');
      
      if(path.length != 2) {
        return callback(' Please specify a valid query path, e.g. --cypher=resource/count_related_users, since you specified ' + options.cypher);
      }
        
      
      var neo4j     = require('seraph')(settings.neo4j.host),
          queries   = require('decypher')('./queries/' + path[0] + '.cyp'),
          helpers    = require('../../helpers.js'),
          query;
      
      if(!queries[path[1]]) {
        console.log(clc.blackBright('  queries available:'), _.keys(queries));
        return callback(' Please specify a valid query name with --name=<queryname>');
      
      }
      
      console.log(clc.blackBright('   executing query: ', clc.magentaBright(options.cypher), '...\n'));
      
      
      query = helpers.cypher.query(queries[path[1]], options);
      console.log(query)
      
      
      neo4j.query(query, options, function (err, result) {
        console.log(clc.blackBright('\n   result: \n'));
        if(err)
          console.log(err);
        else
          console.log(result);
        
      callback(null, options);
      })
      
    }
    
  }

};