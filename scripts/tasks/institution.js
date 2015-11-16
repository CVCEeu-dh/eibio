/*
  
  Institution tasks collection

*/
var settings  = require('../../settings'),
    helpers   = require('../../helpers'),
    inquirer     = require('inquirer'),
    async     = require('async'),
    path      = require('path'),
    fs        = require('fs'),
    
    neo4j     = require('seraph')(settings.neo4j.host),
    Institution = require('../../models/institution');
    
    
    
module.exports = {
  
  FIELDS: [
    'id',
    'slug',
    'name',
    'name_en',
    'name_fr',
    'address',
    'country',
    'short_country',
    'city',
    'url',
    'lat',
    'lng',
    'viaf_id',
    'wiki_id',
    'wiki_name_fr',
    'wiki_name_en',
    'wikidata_id',
    'wikidata_name_fr',
    'wikidata_name_en',
    'isni_id',
    'worldcat_id',
    'name_search'
  ],
  
  UPDATABLE: [
    'slug',
    'name',
    'name_en',
    'name_fr',
    'address',
    'country',
    'short_country',
    'city',
    'url',
    'lat',
    'lng',
    'viaf_id',
    'wiki_id',
    'wikidata_id',
    'isni_id',
    'worldcat_id'
  ],
  
  mergeMany: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.institutions.mergeMany'));
    
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
          var ids = _.map(group, function (d) {return +d.id});// institutions ids to be merged !!
          
          console.log(clc.blackBright('\n   merging institutions:',  clc.cyanBright(JSON.stringify(ids))));
          
          neo4j.query('MATCH (ins:institution) WHERE id(ins) in {ids} WITH ins MATCH p=(ins)-[r]-(t) RETURN r', {
            ids: ids
          }, function (err, rels) {
            if(err) {
              q.kill();
              next(err);
              return;
            };
            // transform all the existing relationship to-from
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
            
            var clones = _.values(_.groupBy(ghosts, function(d) { // everything except the ID
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
                        neo4j.query('MATCH (ins:institution)-[r]-(t) WHERE id(ins) in {ids} AND id(r) = {id} DELETE r', {
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
        neo4j.query('MATCH (ins:institution) WHERE NOT (ins)-[]-() DELETE ins', next);
      },
      function update(next) {
        var q = async.queue(function (activity, nextActivity) {
          console.log(clc.blackBright('\n   check for update:',  clc.cyanBright(activity.id)));
        
          neo4j.query(
            ' MATCH (ins:institution) WHERE id(ins) = {id} RETURN ins', {
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
                updatable = module.exports.UPDATABLE;
                
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
  
  
  updateMany: function(options,callback) {
    
    console.log(clc.yellowBright('\n   tasks.institution.updateMany'));
    
    var overlappings = _.filter(_.values(_.groupBy(options.data, 'slug')), function(d) {
      return d.length > 1
    });
    
    if(overlappings.length > 0) {
      console.log(_.map(overlappings, 'slug'));
      callback('Beware, you have duplicated slugs in your file! User merge-many isntead');  
      return;
    }
      
    
    var q = async.queue(function (record, next) {
      neo4j.read(+record.id, function (err, node) {
        if(err){
          q.kill();
          callback(err);
          return;
        }
        
         
        console.log(clc.blackBright('   id:',  clc.cyanBright(node.id)));
        var needupdate = false,
            replaces = {};
            
        module.exports.UPDATABLE.forEach(function (d) {
          if(record[d] && record[d] != node[d]) {
            replaces[d] = record[d]
            console.log(clc.yellowBright('    ',d), clc.blackBright('replace'), node[d], clc.blackBright('with'), record[d])
            needupdate = true;
          }
        });
        
        if(needupdate) {
          inquirer.prompt([{
            type: 'confirm',
            name: 'YN',
            message: ' Press enter to UPDATE the selected fields, otherwise exit by typing "n"',
          }], function( answers ) {
            // Use user feedback for... whatever!! 
            if(answers.YN) {
              neo4j.save(_.assign(node, replaces), function (err) {
                if(err) {
                  q.kill();
                  callback(err);
                } else {
                  console.log(clc.greenBright('     saved'), clc.blackBright('remaining', q.length()));
                  next();
                }
              })
              
            } else {
              q.kill();
              callback('exit on prompt');
              return;
            }
              
          });
          
        } else {
          console.log(clc.blackBright('   nothing to update, skipping. Remaining', q.length()));
          next();
        }
      });
    }, 1)
    
    q.push(_.filter(options.data, 'slug'));
    q.drain = function() {
      callback(null, options);
    };
  },
  
  
  
  getOne: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.institution.getOne'));
    var query = helpers.cypher.query(
      ' MATCH (ins:institution) \n'+
      ' {if:slug}WHERE ins.slug = {slug}{/if} \n'+
      ' {if:id}WHERE id(ins) = {id}{/if} \n'+
      ' OPTIONAL MATCH (ins)--(act:activity)\n' +
      ' RETURN ins, LAST(collect(act)) as act\n', options);
    
    neo4j.query(query, options, function (err, nodes) {
      if(err) {
        callback(err);
        return;
      }
      console.log(_.take(nodes,1));
      options.fields = module.exports.FIELDS;
      
      options.records = nodes.map(function (d) {
        return d.ins;
      });
      callback(null, options)
      
    })
  },
  
  getMany: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.institution.getMany'));
    neo4j.query(
      ' MATCH (ins:institution)-[r]-() \n'+
      ' OPTIONAL MATCH (ins)--(act:activity)\n' +
      ' RETURN ins, LAST(collect(act)) as act\n'+
      ' SKIP {offset} LIMIT {limit}', {
      limit: +options.limit || 100000,
      offset: +options.offset || 0
    }, function (err, nodes) {
      if(err) {
        callback(err);
        return;
      }
      console.log(_.take(nodes,1));
      options.fields = module.exports.FIELDS;
      
      options.records = nodes.map(function (d) {
        return d.ins;
      });
      callback(null, options)
      
    })
  }
};