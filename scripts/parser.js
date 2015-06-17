/**
  Integrate passport biographyes and reconcilitae whenever possible. store a report of the results somewhere.
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
    
    xml        = require('xml2js');


async.waterfall([
  function readPeopleFile (next) {
    fs.readFile(settings.paths.xml.people, function (err, res) {
      if(err)
        throw err;
    
      next(null, res);
    });
  },
  
  function parsePeopleFile (res, next) {
    xml.parseString(('<people>'+res+'</people>')
      .replace(/<\\?i>/g, '</i>')
      .replace('<\\>i>','</i>')
      .replace(/<\/?ita>/g, '_')
      .replace(/<\/?i>/g, '_'), function (err, contents) {
      if(err)
        throw err;
      var limit = 5;
      next(null, _.take(contents.people.person, limit || contents.people.person.length));
    })
  },
  
  function discoverPeople (people, next) {
    var wikiPeople = [],
        notWikiPeople = [],
        strangePeople = [];
    
    var q = async.queue(function (person, nextPerson) {
          
          console.log();
          console.log();
          console.log();
          var per = {
            name: _.first(person.title)._,
            doi: _.first(person.doi),
            birth_date: _.first(person.birthDate),
            death_date: _.first(person.deathDate),
            birth_place: _.first(person.birthPlace),
            death_place: _.first(person.deathPlace),
            languages: []
          };
          
          if(per.birth_place)
            per.birth_place = per.birth_place._;
          if(per.death_place)
            per.death_place = per.death_place._;
          // duties and dates
          _.forEach(person.duties, function(d) {
            if(d.$.lang && d._) {
              per['duties_' + d.$.lang] = _.compact(d._.split(/[\n\r]/)).map(function (di) {
                return {
                  position: di,
                  years: helpers.extract.years(di) 
                }
              });
              per['abstract_' + d.$.lang] = [per.name].concat(d._.split(/[\n\r]/)).join('.\n\n');
              per.languages.push(d.$.lang);
            }
          });
          
          _.forEach(person.education, function(d) {
            if(d.$.lang && d._) {
              per['education_' + d.$.lang] = _.compact(d._.split('\n'));
              per.languages.push(d.$.lang);
            }
          });
          
          per.languages = _.uniq(per.languages);
          // look for someone in  in dbpedia babe...
          
          console.log(clc.blackBright('----'), per.name, clc.blackBright(people.length - q.length(),'/',people.length, '----'),'\n');
          console.log(clc.blackBright('     check dbpedia for'), per.name);
          
          if(!per.name || !per.name.length)
            throw 'per is not a valid person...';
          
          if(per.name.length < 3) {
            strangePeople = per;
            nextPerson();
            return;
          }
          // call dbpedia lookup service
          helpers.dbpedia.lookup(per.name, function (err, results) {
            if(err == helpers.IS_EMPTY) {
              console.log(clc.blackBright('     not found on dbpedia'), clc.yellowBright('skipping'), per.name);
              per.not_wiki = true;
              notWikiPeople.push(per)
              nextPerson();
              return;
            }
            if(err)
              throw err;
            console.log(clc.blackBright('     found on dbpedia'), clc.magentaBright(results.length));
            
            if(results.length > 1)
              per.disambiguate = results;
            
            per.wiki_uri         = path.basename(_.first(results).uri);
            per.wiki_name        = path.basename(_.first(results).label);
            per.wiki_description = path.basename(_.first(results).description);
            
            console.log(clc.blackBright('     push to the wiki people list'), per.wiki_uri);
            console.log(clc.blackBright('     name adequancy'), per.name, per.wiki_name, per.name == per.wiki_name? clc.greenBright('yep!'): clc.redBright('nope!') );
            wikiPeople.push(per);
            
            setTimeout(nextPerson,500)
          });
        }, 1);
    
    q.push(people);
    q.drain = function(){
      next(null, wikiPeople, notWikiPeople, strangePeople) 
    }
  },
  function extractEntities(wikiPeople, notWikiPeople, strangePeople, next) {
    var people = wikiPeople.concat(notWikiPeople);
    console.log()
    console.log('=====================')
    
    console.log(clc.blackBright('     extract entities from', clc.magentaBright(people.length), 'people biographies'));
    var q = async.queue(function (person, nextPerson) {
          
          console.log();
          console.log();
          console.log();
      
          console.log(person.languages, person.name);
          // async queue for yagoaida
          var qi = async.queue(function (abstract, nextAbstract) {
            console.log(abstract)
            helpers.extract.entities(abstract.text, function (err, entities) {
              if(err)
                throw err
              console.log(entities);
              person['entities_'+abstract.language] = entities;
              nextAbstract();
            })
            
           
          },1);
          // fill queue with different abstracts...
          qi.push(person.languages.map(function (d) {
            return {
              text: person['abstract_' + d],
              language: d
            }
          }))
          qi.drain = nextPerson;
    }, 1);
    q.push(people);
    q.drain = function() {
      next(null, _.filter(people, 'wiki_uri'), _.filter(people, 'not_wiki'), strangePeople) 
    }
    
                  // entities: helpers.extract.entities(di)
    
  }
], function (err, wikiPeople, notWikiPeople, strangePeople) {
  fs.writeFileSync('./contents/eibio.json', JSON.stringify( wikiPeople.concat(notWikiPeople),null, 2));
  fs.writeFileSync('./contents/eibio_wiki.json', JSON.stringify( wikiPeople,null, 2));
  fs.writeFileSync('./contents/eibio_notwiki.json', JSON.stringify( notWikiPeople,null, 2));
  fs.writeFileSync('./contents/eibio_errors.json', JSON.stringify( strangePeople,null, 2));
  console.log('\n\n\n', clc.cyan('    completed'), '\n\n\n');
});

