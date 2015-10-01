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
      return _.first(d)//.length == 1
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
      
      function merge(next) {
        var q = async.queue(function (group, nextGroup) {
          var ids = _.map(group, function (d) {return +d.id});// activities id to merge !!
          
          console.log(clc.blackBright('\n   merging activities:',  clc.cyanBright(JSON.stringify(ids))));
          
          neo4j.query('MATCH (act:activity) WHERE id(act) in {ids} WITH act MATCH p=(act)-[r]-(t) RETURN r', {
            ids: ids
          }, function (err, rels) {
            if(err) {
              q.kill();
              next(err);
              return;
            };
            
            var ghosts = rels.map(function (rel) {
              if(ids.indexOf(rel.start) != -1 && rel.start != ids[0]) {
                console.log(rel.start, '===== s ', ids[0]);
                rel.new_start  = ids[0];
                rel.new_end = rel.end
                rel.CHANGE = true; 
              } else if(ids.indexOf(rel.end) != -1 && rel.end != ids[0]) {
                console.log(rel.end, '===== e ', ids[0]);
                rel.new_start  =  rel.start;
                rel.new_end = ids[0]
                rel.CHANGE = true; 
              }
              return rel;
            });
            
            var clones = _.values(_.groupBy(ghosts, function(d) {
              // everything except the ID
              return [d.start, d.end, d.type, JSON.stringify(d.properties)].join();
            }));
            
            var relToBeRemoved = _.flatten(clones.filter(function (d) {
              return d.length > 1;
            }).map(function (d) {
              return _.takeRight(_.map(d, 'id'), d.length -1);
            }));
            
            var relToBeUpdated = _.flatten(clones.map(function(d) {
              return _.first(d, 1);
            })).filter(function (d) {
              return d.CHANGE
            });
            
            console.log(clc.blackBright('   remove relationships:'), relToBeRemoved)
            console.log(clc.blackBright('   update relationships:'), relToBeUpdated)
            if(relToBeUpdated.length + relToBeRemoved.length == 0) {
              console.log(clc.blackBright('   nothing to do, skipping', clc.cyanBright(JSON.stringify(ids))));
              nextGroup();
              return;
            };
            
            
            inquirer.prompt([{
                type: 'confirm',
                name: 'YN',
                message: ' Press enter to MERGE or REMOVE the selected relationships, otherwise SKIP by typing "n"',
              }], function (answers) {
                // Use user feedback for... whatever!! 
                if(answers.YN) {
                  async.series([
                    function removeClonedRelationships(_next) {
                      var removeQueue = async.queue(function (rel, nextRelationship) {
                        console.log(clc.blackBright('   relationship to remove'), rel);
                        // remove cloned relationships
                        // var queueRemoveRelationship = async.queue
                        neo4j.query('MATCH (act:activity)-[r]-(t) WHERE id(act) in {ids} AND id(r) = {id} DELETE r', {
                          ids: ids,
                          id: rel
                        }, function (err) {
                          if(err) {
                            updateQueue.kill();
                            _next(err);
                          } else {
                            console.log(clc.greenBright('   relationship removed'));
                            nextRelationship();
                          }
                        });
                      }, 1);
                      removeQueue.push(relToBeRemoved);
                      removeQueue.drain = _next;
                    },
                    function updateChangedRelationships(_next) {
                      var updateQueue = async.queue(function (rel, nextRelationship) {
                        console.log(clc.blackBright('   relationship to update'), rel);
                        
                        var query = helpers.cypher.query(
                          ' MATCH (s) WHERE id(s)={new_start} ' + 
                          '   WITH s MATCH (t) WHERE id(t)={new_end} ' +
                          '   WITH s,t MATCH ()-[r]-() WHERE id(r)={id}'+
                          ' MERGE (s)-[rc:{:type}]->(t) '+
                          ' ON CREATE SET rc = r '+
                          ' ON MATCH SET rc=r WITH r DELETE r', rel
                        );
                        console.log(query)
                       
                        neo4j.query(query,rel, function (err) {
                          if(err) {
                            updateQueue.kill();
                            _next(err);
                          } else {
                            console.log(clc.greenBright('   relationship updated'));
                            nextRelationship();
                          }
                        });
                      }, 1);
                      updateQueue.push(relToBeUpdated);
                      updateQueue.drain = _next;
                    }
                  ], function (err) {
                    if(err) {
                      q.kill();
                      next(err);
                    } else {
                      console.log(clc.greenBright('   merged successfully'));
                      nextGroup();
                    }
                  })
                  
                  
                  
                } else {
                  console.log(clc.blackBright('   skipped, nothing changed for', clc.cyanBright(JSON.stringify(ids))));
                  nextGroup();
                  return;
                }
              });
            
            // collect relationship from both nodes, then merge them together
            // nextGroup();
          
          });
          
        }, 1);
        q.push(toBeMerged);
        q.drain = next;
      },
      // remove orphelins
      function cleanup(next) {
        console.log(clc.blackBright('\n   cleaning orphelins'));
        neo4j.query('MATCH (act:activity) WHERE NOT (act)-[]-() DELETE act', next);
      },
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
            if(!node) {
              console.log(clc.blackBright('\n   node not found:',  clc.cyanBright(activity.id)));
              nextActivity()
              return;
            }
              
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
      ' MATCH (act:activity)-[r]-() \n'+
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