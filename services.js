/**
  EI BIO remote services
*/
var path     = require('path'),
    
    clc      = require('cli-color'),
    settings = require('./settings'),
    request  = require('request'),
    
    _        = require('lodash');
    
module.exports = {
  dbpedia:{
    /*
      dbpedia data service, with automagic redirect.
      @param options.link - the last part of a wiki URI
    */
    data: function(options, next) {
      if(!settings.dbpedia.data || !settings.dbpedia.data.endpoint) {
        next('settings.dbpedia.endpoint not found')
        return;
      };
      
      var url   = settings.dbpedia.data.endpoint + options.link + '.json',
          level = options.level || 0;// recursion level, see below
      console.log(clc.blackBright('dbpedia service:'), url);
      request
        .get({
          url: url,//url,
          json: true,
          headers: {
            'Accept':  'application/json'
          },
        }, function (err, res, body) {
          if(err) {
            next(err);
            return;
          }
          
          var redirect = _.first(_.flattenDeep(_.compact(_.pluck(body, 'http://dbpedia.org/ontology/wikiPageRedirects'))));
          
          if(redirect && redirect.value && level < 1) {
            var link = redirect.value.split('/').pop();
            if(options.link == link) {
              // no need to scrape again...
              next(null, body);
              return
            }
            console.log(clc.blackBright('following redirection, level'), clc.cyan(level), clc.blackBright('link'), clc.cyan(link))
            setTimeout(function(){
              module.exports.dbpedia({
                link: link,
                level: level + 1
              }, next);
            }, 2300);
            return;
          };
          
          next(null, body)
        }); // eof request
    },
    /*
      dbpedia lookup PrefixSearch service
      @param options.query
    */
    lookup: function(options, next) {
      if(!settings.dbpedia || !settings.dbpedia.lookup || !settings.dbpedia.lookup.endpoint) {
        next('settings.dbpedia.lookup.endpoint not found')
        return;
      };
      var options = _.assign({
        query: '',
        QueryClass: 'person', // e.g. person
        limit: 1
      }, options);
      
      if(options.query.match(/[^a-zA-Z_\-'%0-9,\.]/g)) {
        options.query = encodeURIComponent(options.query);
      }

      request.get({
        url: settings.dbpedia.lookup.endpoint,
        qs: {
          QueryString: options.query,
          MaxHits: options.limit,
          QueryClass: options.QueryClass,
        },
        json: true,
        headers: {
          'Accept':  'application/json'
        }
      }, function (err, res, body) {
        if(err) {
          next(err);
          return;
        }
        
        next(null, body)
      });
    
    }
  }, // eof dbpedia services
  // yagoaida single service
  yagoaida: {
    disambiguate: function(options, next) {
      if(!settings.yagoaida || !settings.yagoaida.disambiguate || !settings.yagoaida.disambiguate.endpoint) {
        next('settings.yagoaida.disambiguate.endopoint not found')
        return;
      }
      // console.log('AIDA')
      request
        .post({
          url: settings.yagoaida.disambiguate.endpoint,
          json: true,
          headers: {
            'Accept': '*/*'
          },
          form: {
            text: options.text
          }
        }, function (err, res, body) {
          if(err)
            next(err);
          // FLATTEN YAGO entities by providing only entitites having "best entity"
          var entities = body.mentions.filter(function (d) {
            return d.bestEntity && d.bestEntity.kbIdentifier;
          }).map(function (d) {
            var _d = _.merge({
              startingPos: d.offset,
              endingPos: d.offset + d.length,
              matchedText: d.name
            }, body.entityMetadata[d.bestEntity.kbIdentifier]);
            
            if(_d.url)
              _d.wikiLink = path.basename(_d.url);
            // console.log(body.entityMetadata[d.bestEntity.kbIdentifier])
            return _d;
          });
          next(null, entities);
        });
    }
  }
};