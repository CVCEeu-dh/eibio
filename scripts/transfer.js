/*
  Transfer.
  ===
  
  Load JSON data into a proper neo4j db, v.2.2.
  Transfer json file should be provided inside the contents folder
  and named according to settings
*/
var settings   = require('../settings'),
    helpers   = require('../helpers'),
    neo4j      = require('seraph')(settings.neo4j.host),
    async      = require('async'),
    _          = require('lodash'),
    clc        = require('cli-color'),
    
    options    = require('minimist')(process.argv.slice(2)),
    
    queries    = require('decypher')('./queries/entity.cyp'),
    contents   = require('../contents/transfer');

console.log('\n\n                                      __^__');
console.log('                                     /(o o)\\');
console.log('==================================oOO==(_)==OOo=======================\n');

var batch = neo4j.batch();
var entitiesPrefixesToKeep = {
  YAGO_wordnet_district: 'place',
  YAGO_wordnet_administrative_district: 'place',
  YAGO_wordnet_person: 'person',
  YAGO_wordnet_social_group: 'social_group',
  YAGO_wordnet_institution: 'institution',
  YAGO_wordnet_organization: 'organization',
};

console.log(clc.blackBright('    n. of entities:', clc.magentaBright(_.values(contents).length)),'\n');

var q = async.queue(function (entity, nextEntity) {
  entity.languages = entity.languages || ['en', 'fr'];
  console.log(clc.blackBright('    entity', clc.whiteBright( entity.name),  entity.slug, clc.cyanBright('saved'), 'remaining:', q.length()));
    
  neo4j.batch(function (b) {
    for(var i in entity.languages) {
      var query = helpers.cypher.query(queries.merge_entity, {
        language: entity.languages[i]
      });
      entity['name_' + entity.languages[i]] = entity['name_' + entity.languages[i]] || '';
      entity['identity_' + entity.languages[i]] = entity['identity_' + entity.languages[i]] || '';
      entity['abstract_' + entity.languages[i]] = entity['abstract_' + entity.languages[i]] || '';
      entity['description_' + entity.languages[i]] = entity['description_' + entity.languages[i]] || '';
      b.query(query, entity);
    }
    
    entity.languages.forEach(function (language) {
      // give me the activities (please)
      if(!entity['duties_' + language]) {
        
        return;
      }
      for(var j in entity['duties_' + language])
        b.query(queries_activity.merge_activity, {
          language: language,
          position: entity['duties_' + language][j].position,
          years: entity['duties_' + language][j].position,
        })
       
      if(!entity['entities_' + language]) {   
        return;
      }
      
      // give me the entities (please)
      var entities = [];
      
      entities = _.map(_.filter(entity['entities_' + language], function (_ent) {
        _ent.type.map(function (type) {
          var abstractType =  _.dropRight(type.split('_')).join('_');
          //console.log(_ent.entityId,'type found', abstractType, entitiesPrefixesToKeep[abstractType])
          if(entitiesPrefixesToKeep[abstractType]) {
            _ent.abstract_type = (_ent.abstract_type || []).concat([entitiesPrefixesToKeep[abstractType]])
          }
        });
        return _ent.abstract_type;
      }), function (entity){
        return {
          startingPos: entity.startingPos,
          endingPos: entity.endingPos,
          entityId: entity.entityId,
          type: _.uniq(entity.abstract_type),
          wikiLink: entity.wikiLink
        }
      });
    })
  }, function (err, results) {
    /* results -> [{ id: 1, title: 'Kaikki Askeleet' },
                   { id: 2, title: 'Sinä Nukut Siinä' },
                   { id: 3, title: 'Pohjanmaa' }] */
    if(err)
      throw err;
    nextEntity();
  });
  
  
    
  
  
  // neo4j.query(queries.merge_entity, {}, function (err, item) {
  
// })  
}, 1);
q.push(_.values(contents));
q.drain = function() {
  console.log(clc.blackBright('    task', clc.cyanBright('completed')));
  console.log(clc.blackBright('\n======================================================================\n\n'));
}


