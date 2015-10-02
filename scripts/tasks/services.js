/*
  Shared tasks for manage.js script
  npm manage --task=
*/
var settings   = require('../../settings'),
    services   = require('../../services'),
    neo4j     = require('seraph')(settings.neo4j.host);
    
module.exports = {
  dbpedia: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.services.dbpedia'));
    
    var q = async.queue(function (record, next) {
      console.log(clc.blackBright('\n   dbpedia for',  clc.cyanBright(record.slug)));
      neo4j.read(record.id, function (err, node) {
        if(err){
          q.kill();
          callback(err);
          return;
        }
        console.log(clc.blackBright('   id:',  clc.cyanBright(node.id)));
        services.dbpedia.data({
          link: record.wiki_id
        }, function (err, results) {
          var enrich = {};
          // a really nice way to find different language labels ... !
          var labels = _.groupBy(_.compact(_.flattenDeep(_.pluck(results, "http://www.w3.org/2000/01/rdf-schema#label"))),'lang');
          
          if(labels.fr) {
            enrich.wiki_name_fr = _.get(_.first(labels.fr),'value', '');
            if(!node.name_fr)
              enrich.name_fr = enrich.wiki_name_fr;
          }
           
          if(labels.en) {
            enrich.wiki_name_en = _.get(_.first(labels.en),'value', '');
            if(!node.name_en)
              enrich.name_en = enrich.wiki_name_en;
          }
          
          if(_.isEmpty(enrich)) {
            console.log(clc.blackBright('   nothing to add, skipping. Remaining', q.length()));
            next();
          } else {
            for(var i in enrich) {
              console.log(clc.blackBright('    ', i), enrich[i]);
            }
            // read the proper node, independently from how the nodes have been extracted
            
              //  update the clean node
            neo4j.save(_.assign(node, enrich), function (err) {
              if(err) {
                q.kill();
                callback(err);
              } else {
                console.log(clc.greenBright('     saved'), clc.blackBright('remaining', q.length()));
                next();
              }
            })
            
          }
        });
      });
    }, 1);
    
    q.push(_.filter(options.records, function (d){
      return !_.isEmpty(d.wiki_id);
    }));
    q.drain = function() {
      callback(null, options)
    }
  },
  
  /*
    Call viaf service.
  */
  viaf: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.services.viaf'));
      
    var q = async.queue(function (record, next) {
      console.log(clc.blackBright('\n   viaf for',  clc.cyanBright(record.slug)));
      // get the clean version of the node from the record id
      neo4j.read(record.id, function (err, node) {
        if(err){
          q.kill();
          callback(err);
          return;
        }
        console.log(clc.blackBright('   id:',  clc.cyanBright(node.id)));
        services.viaf.links({
          link: record.viaf_id
        }, function (err, results) {
          var enrich = {};
          // isni
          if(results.ISNI && !node.isni_id)
            enrich.isni_id = _.first(results.ISNI);
          // worldcat
          if(results.LC && !node.worldcat_id)
            enrich.worldcat_id = 'lccn-' + _.first(results.LC);
          // wikidata
          if(results.WKP  && !node.wikidata_id)
            enrich.wikidata_id = _.first(results.WKP);
          
          if(_.isEmpty(enrich)) {
            console.log(clc.blackBright('   nothing to add,'), 'skipping', clc.blackBright('... Remaining', q.length()));
            next();
          } else {
            for(var i in enrich) {
              console.log(clc.blackBright('    ', i), enrich[i]);
            }
            // read the proper node, independently from how the records have been extracted
            
              //  update the clean node
            neo4j.save(_.assign(node, enrich), function (err) {
              if(err) {
                q.kill();
                callback(err);
              } else {
                console.log(clc.greenBright('     saved'), clc.blackBright('remaining', q.length()));
                next();
              }
            });
          }
        });
      });
    }, 1);
    
    q.push(_.filter(options.records, function (d){
      return !_.isEmpty(d.viaf_id);
    }));
    q.drain = function() {
      callback(null, options);
    }
  },
  
  /*
    A special service that find alternate names according to alternatenames settings
  */
  alternatenames: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.services.alternatenames'));
      
    var q = async.queue(function (record, next) {
       console.log(clc.blackBright('\n   alternatenames for',  clc.cyanBright(record.slug)));
      neo4j.read(record.id, function (err, node) {
        if(err){
          q.kill();
          callback(err);
          return;
        }
        console.log(clc.blackBright('   id:',  clc.cyanBright(node.id)));
        
        async.parallel(_.map(settings.alternatenames, function (d, service) {
          return function (nextService) {
            if(_.isEmpty(node[service + '_id'])) {
              nextService(null, []);
              return;
            };
            services.importio.custom({
              endpoint: d.endpoint,
              link: node[service + '_id']
            }, function (err, res) {
              console.log(clc.blackBright('   service:',  clc.cyanBright(service)));
              if(err) {
                console.log(err);
                nextService(null, []);
              } else {
                var results =  _.get(_.first(res.results), 'variations');
                if(typeof results != 'object')
                  results = [results];
                console.log(clc.blackBright('     found:',  clc.magentaBright(results.length), typeof results));
                nextService(null, results);
              }
            });
          }
        }), function (err, results) {
          if(err) {
            q.kill()
            callback(err)
          } else {
            var alternatenames = _.map(_.flatten(results), _.trim);
            console.log(clc.blackBright('   total:',  clc.magentaBright(alternatenames.length)));
           
            if(node.name_search)
              alternatenames = _.unique(node.name_search.split(' || ').concat(alternatenames));
            console.log(clc.blackBright('   merged with previous alternates:',  clc.magentaBright(alternatenames.length)));
            // console.log(alternatenames)
            // save alternate names as field in name_search autoindex.
            neo4j.save(_.assign(node, {
              name_search: alternatenames.join(' || ')
            }), function (err) {
              if(err) {
                q.kill();
                callback(err)
                return;
              }
              setTimeout(next, 100);
            });
          }
        });
        
      })
    },1);
    
    q.push(_.filter(options.records, function (d){
      for(var i in settings.alternatenames)
        if(!_.isEmpty(d[i + '_id']))
          return true
    }));
    q.drain = function() {
      callback(null, options)
    }
  },
  
  /*
    Call wikidata service (require wikidata_id)
  */
  wikidata: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.services.wikidata'));
      
    var q = async.queue(function (record, next) {
      console.log(clc.blackBright('\n   wikidata for',  clc.cyanBright(record.slug)));
      // get the clean version of the node from the record id
      neo4j.read(record.id, function (err, node) {
        if(err){
          q.kill();
          callback(err);
          return;
        }
        console.log(clc.blackBright('   id:',  clc.cyanBright(node.id)));
        services.wikidata.entity({
          link: record.wikidata_id
        }, function (err, entity) {
          
          var enrich = {};
          
          // isni
          if(entity.labels.fr) {
            enrich.wikidata_name_fr = entity.labels.fr.value;
            if(!node.name_fr)
              enrich.name_fr = enrich.wikidata_name_fr;
          }
           
          if(entity.labels.en) {
            enrich.wikidata_name_en = entity.labels.en.value;
            if(!node.name_en)
              enrich.name_en = enrich.wikidata_name_en;
          }
          
          if(_.isEmpty(enrich)) {
            console.log(clc.blackBright('   nothing to add, skipping. Remaining', q.length()));
            next();
          } else {
            for(var i in enrich) {
              console.log(clc.blackBright('    ', i), enrich[i]);
            }
            neo4j.save(_.assign(node, enrich), function (err) {
              if(err) {
                q.kill();
                callback(err);
              } else {
                console.log(clc.greenBright('     saved'), clc.blackBright('remaining', q.length()));
                next();
              }
            })
          }
          // console.log(results)
          
        });
      })
    }, 1);
    
    q.push(_.filter(options.records, function (d){
      return !_.isEmpty(d.wikidata_id);
    }));
    q.drain = function() {
      callback(null, options)
    }
  },
  
  /*
    Explore the geocode id
  */
  geocode: function(options, callback) {
    console.log(clc.yellowBright('\n   tasks.services.geocode'));
    
    var q = async.queue(function (record, next) {
      console.log(clc.blackBright('\n   geocode for',  clc.cyanBright(record.slug)));
      // get the clean version of the node from the record id
      neo4j.read(record.id, function (err, node) {
        if(err){
          q.kill();
          callback(err);
          return;
        }
        console.log(clc.blackBright('   id:',  clc.cyanBright(node.id)));
        services.geocode.search({
          address: record.address
        }, function (err, results) {
          if(err)
            return callback(err);
          // let's take the first one (shoul be perfect)
          var result = _.first(results);
          
          if(!result) {
            console.log(clc.blackBright('   no result found, skipping. Remaining', q.length()));
            next();
            return;
          }
         
          var country = _.get(_.find(result.address_components, function (d){
            return d.types.indexOf('country') != -1
          }), 'short_name');
          
          var city    = _.get(_.find(result.address_components, {types:['locality', 'political']}), 'long_name');
          
          if(!city) {
            
            city    = _.get(_.find(result.address_components, {types:['administrative_area_level_1', 'political']}), 'long_name');
          
          }
          // console.log(result)
          
          
          if(!country || !city){
            console.log(record.address, clc.redBright('     !no relevant information foound:    '), result.address_components);
            next();
          } else {
            console.log(clc.blackBright('     city:    '), city);
            console.log(clc.blackBright('     country: '), country);
            console.log(clc.blackBright('     place_id:'), result.place_id);
            console.log(clc.blackBright('     lat:     '), result.geometry.location.lat);
            console.log(clc.blackBright('     lng:     '), result.geometry.location.lng);
            
            neo4j.save(_.assign(node, {
              short_country: country,
              geocode_id: result.place_id,
              city: city,
              lat: result.geometry.location.lat,
              lng: result.geometry.location.lng
            }), function (err) {
              if(err) {
                q.kill();
                callback(err);
              } else {
                console.log(clc.greenBright('     saved'), clc.blackBright('remaining', q.length()));
                next();
              }
            })
          }
        })
      });
    }, 1);
    q.push(_.filter(options.records, function (d){
      return d.address;
    }));
    q.drain = function() {
      callback(null, options)
    }
  },
}