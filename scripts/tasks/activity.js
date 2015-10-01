/*
  
  Activity tasks collection

*/
var settings  = require('../../settings'),
    helpers   = require('../../helpers'),
    inquirer     = require('inquirer'),
    async     = require('async'),
    path      = require('path'),
    fs        = require('fs'),
    
    neo4j     = require('seraph')(settings.neo4j.host);
    
module.exports = {
  
  mergeMany: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.activity.mergeMany'));
    
    var groups,
        toBeUpdated,
        toBeMerged;
    // groups of rows by slug ;)    
    groups = _.values(_.groupBy(options.data,'slug'));
    
    // update only
    toBeUpdated = _.flatten(groups.filter(function (d) {
      return d.length == 1
    }));
    
    toBeMerged = groups.filter(function (d) {
      return d.length > 1
    });
    
    // remove groups from memory
    delete groups
    
    // output to the user
    console.log(clc.blackBright('\n   to be updated:', clc.magentaBright(toBeUpdated.length), '- to be merged:',clc.magentaBright(_.sum(toBeMerged, function (d) {return d.length}))));
    
    // first thing first: update what need to be updated, with confirmation
    async.series([
      function update(next) {
        var q = async.queue(function (activity, nextActivity) {
          console.log(clc.blackBright('\n   check for update:',  clc.cyanBright(activity.id)));
        
          neo4j.query(
            ' MATCH (act:activity) WHERE id(act) = {id} RETURN act', {
              id: +activity.id
            }, function (err, nodes) {
            if(err) {
              q.kill();
              next(err);
              return;
            }
            // the activity node, by ID
            var node = _.first(nodes);
            if(!node)
              console.log(activity, node);
            
            var needupdate = false,
                replaces = {},
                updatable = [
                  'slug',
                  'position',
                  'description_en',
                  'description_fr',
                ];
                
            updatable.forEach(function (d) {
              if(activity[d] && activity[d] != node[d]) {
                replaces[d] = activity[d]
                console.log(clc.yellowBright('    ',d), clc.blackBright('replace'), node[d], clc.blackBright('with'), activity[d])
                needupdate = true;
              }
            });
            
            if(needupdate) {
              inquirer.prompt([{
                type: 'confirm',
                name: 'YN',
                message: ' Press enter to UPDATE the selected fields, otherwise SKIP by typing "n"',
              }], function (answers) {
                // Use user feedback for... whatever!! 
                if(answers.YN) {
                  neo4j.save(_.assign(node, replaces), function(err, node) {
                    if(err) {
                      q.kill();
                      next(err);
                      return;
                    }
                    console.log(clc.greenBright('   updated'));
                    nextActivity();
                  });
                  
                } else {
                  console.log(clc.blackBright('   skipped, nothing changed for', clc.cyanBright(activity.position)));
                  nextActivity();
                  return;
                }
              });
            } else {
              console.log(clc.blackBright('   nothing to do, remaining'), q.length());
              nextActivity();
            } 
            
          });    
        }, 1);
        
        q.push(toBeUpdated);
        q.drain = next;
      },
      function merge(next) {
        next();
      }
    ], function (err, results) { //eof async.series
      if(err)
        callback(err)
      else
        callback(null, options)
    });
  },
  
  getMany: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.activity.getMany'));
    neo4j.query(
      ' MATCH (act:activity) \n'+
      ' OPTIONAL MATCH (act)--(ins:institution)\n' +
      ' RETURN act, LAST(collect(ins)) as ins\n'+
      ' SKIP {offset} LIMIT {limit}', {
      limit: +options.limit || 100000,
      offset: +options.offset || 0
    }, function (err, nodes) {
      if(err) {
        callback(err);
        return;
      }
      options.fields = [
        'id',
        'slug',
        'country',
        'institution_country',
        'institution_name',
        'position',
        'description_en',
        'description_fr',
        'critical'
      ];
      options.records = nodes.map(function (d) {
        d.act.institution_country = d.ins? d.ins.country : '';
        d.act.institution_name    = d.ins? d.ins.name: '';
        if(_.isEmpty(d.act.position))
          d.act.position = d.act.description_en;
        d.act.critical = d.act.institution_country != d.act.country && !_.isEmpty(d.act.institution_country)? 1: 0;
        return d.act;
      });
      callback(null, options)
      
    })
  }
  
}