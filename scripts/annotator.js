/*

  Our crazy annotator
  ===

  Provide passport biographyes with annotation. This shouyld be run right after the parser.
  REsults are stored as json file in contents folder eibio_annotated.json.
*/
var fs         = require('fs'),
    path       = require('path'),
    settings   = require('../settings'),
    request    = require('request'),
    helpers    = require('../helpers.js'),
    moment     = require('moment'),
    async      = require('async'),
    _          = require('lodash'),
    
    clc        = require('cli-color'),
    
    eibio      = require('../contents/eibio');

var entitiesPrefixesToKeep = {
  YAGO_wordnet_district: 'place',
  YAGO_wordnet_administrative_district: 'place',
  YAGO_wordnet_person: 'person',
  YAGO_wordnet_social_group: 'social_group',
  YAGO_wordnet_institution: 'institution',
  YAGO_wordnet_organization: 'organization',
}

async.waterfall([
  function selectEntities (next) {
    console.log(eibio.length)
    
    // reduce eibio entities per language according to the selected prefix
    eibio.map(function (d) {
      d.languages.forEach(function (language) {
        d['entities_' + language] = _.map(_.filter(d['entities_' + language], function (entity) {
          entity.type.map(function (type) {
            var abstractType =  _.dropRight(type.split('_')).join('_');
            console.log(entity.entityId,'type found', abstractType, entitiesPrefixesToKeep[abstractType])
            if(entitiesPrefixesToKeep[abstractType]) {
              entity.abstract_type = (entity.abstract_type || []).concat([entitiesPrefixesToKeep[abstractType]])
              
            }
          });
          return entity.abstract_type;
        }), function (entity){
          return {
            startingPos: entity.startingPos,
            endingPos: entity.endingPos,
            entityId: entity.entityId,
            type: entity.abstract_type,
            wikiLink: entity.wikiLink
          }
        });
      });
      
      //console.log(d)
      throw 'stop'
    })
  },
], function() {
  console.log('\n\n\n', clc.cyan('    completed'), '\n\n\n');
});