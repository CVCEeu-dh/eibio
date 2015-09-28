/*
  
  Person task collection

*/
var settings  = require('../../settings'),
    async     = require('async'),
    path      = require('path'),
    fs        = require('fs'),
    
    neo4j     = require('seraph')(settings.neo4j.host),
    Person    = require('../../models/person');

module.exports = {
  getOne: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.person.getOne'));
    neo4j.query('MATCH (per:person) WHERE id(per) = {id} WITH per OPTIONAL MATCH (per)-[r]-(t)  RETURN per as person, count(r) as rels', {
      id: +options.id,
    }, function (err, nodes) {
      if(err) {
        callback(err);
        return;
      }
      if(!nodes.length) {
        callback('   Can\'t find any person matching id:'+options.id);
        return
      }
      options.person = nodes[0].person;
      console.log(options.person)
      console.log(clc.blackBright('\n   this person has', clc.magentaBright(nodes[0].rels), 'relationships'));
      callback(null, options)
    })
  },
  
  removeOne: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.person.removeOne'));
    neo4j.query('MATCH (per:person) WHERE id(per) = {id} DELETE per', {
      id: +options.id,
    }, function (err, nodes) {
      if(err) {
        callback(err);
        return;
      }
      
      callback(null, options)
    })
  },
  
  updateMany: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.person.updateMany'));
    
    var q = async.queue(function (person, next) {
      neo4j.read(+person.id, function (err, node) {
        if(err) {
          q.kill();
          callback(err);
          return;
        }
        next();
      });
      
    },1);
    q.push(options.data);
    q.drain = function() {
      callback(null, options);
    };
  },
  
  getMany: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.person.getMany'));
    neo4j.query('MATCH (p:person) OPTIONAL MATCH (p)--(act:activity) WHERE length(p.slug) > 0 RETURN p as per, LAST(collect(act.description_en)) as first_act ORDER BY p.last_name skip {offset} LIMIT {limit} ', {
      limit: +options.limit || 100000,
      offset: +options.offset || 0
    }, function (err, nodes) {
      if(err) {
        callback(err);
        return;
      }
      console.log(clc.blackBright('   records: '),nodes.length);
      options.fields = [
        'id',
        'slug',
        'name',
        'first_name',
        'last_name',
        'birth_date',
        'death_date',
        'viaf_id',
        'wiki_id',
        'activity',
        'dois'
      ];
      options.records = nodes.map(function(d) {
        d.per.activity = d.first_act;
        d.per.dois = d.per.dois? d.per.dois.join(', '): ''
        return d.per
      });
      callback(null, options)
    });
  }
};