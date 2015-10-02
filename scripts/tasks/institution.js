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
  
  updateMany: function(options,callback) {
    
    console.log(clc.yellowBright('\n   tasks.institution.updateMany'));
    
    var overlappings = _.filter(_.values(_.groupBy(options.data, 'slug')), function(d) {
      return d.length > 1
    });
    
    if(overlappings.length > 0) {
      console.log(overlappings);
      callback('Beware, you have duplicated slugs in your file!');  
      return;
    }
      
    
    var q = async.queue(function (record, next) {
      next();
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