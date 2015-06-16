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
      console.log(contents)
      next(null, contents.people.person);
    })
  },
  
  function discoverPeople (people, next) {
    var wikiPeople = [],
        notWikiPeople = [],
        strangePeople = [];
    
    var q = async.queue(function (person, nextPerson) {
          
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
          
          _.forEach(person.duties, function(d) {
            if(d.$.lang && d._) {
              per['duties_' + d.$.lang] = _.compact(d._.split('\n'));
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
          
          
          console.log(clc.blackBright('check dbpedia for'), per.name, settings.dbpedia.lookup.endpoint);
          
          
          
          if(!per.name || !per.name.length)
            throw 'per is not a valid person...';
          
          if(per.name.length < 3) {
            strangePeople = per;
            nextPerson();
            return;
          }
          
          helpers.lookup(per.name, function (err, results) {
            if(err == helpers.IS_EMPTY) {
              console.log(clc.blackBright('not found on dbpedia'), clc.yellowBright('skipping'), per.name);
              notWikiPeople.push(per)
              nextPerson();
              return;
            }
            if(err)
              throw err;
            console.log(clc.blackBright('found on dbpedia'), clc.magentaBright(results.length));
            
            if(results.length > 1)
              per.disambiguate = results;
            
            per.links_wiki = path.basename(_.first(results).URI);
            console.log(clc.blackBright('push to the wiki people list'), per.links_wiki);
            
            wikiPeople.push(per);
            //console.log(results)
            nextPerson()
          });
        }, 1);
    
    q.push(_.take(people,people.length));
    q.drain = function(){
      next(null, wikiPeople, notWikiPeople, strangePeople) 
    }
  }  
], function (err, wikiPeople, notWikiPeople, strangePeople) {
  fs.writeFileSync('./contents/eibio.json', JSON.stringify( wikiPeople.concat(notWikiPeople),null, 2));
  fs.writeFileSync('./contents/eibio_wiki.json', JSON.stringify( wikiPeople,null, 2));
  fs.writeFileSync('./contents/eibio_notwiki.json', JSON.stringify( notWikiPeople,null, 2));
  fs.writeFileSync('./contents/eibio_errors.json', JSON.stringify( strangePeople,null, 2));
  console.log(clc.cyan('completed'))
});

