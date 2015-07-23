/*
  
  Testing Person model
  ====================
  
  usage from command line:
  cd eibio
  mocha -g 'models:person' 
*/
'use strict';


var helpers = require('../helpers'),
    Person  = require('../models/person'),
    should  = require('should');
    
describe('models:person', function() {
  var __person,
      __unknown;
  
  it('should create a brand new person (merge with non-existing person)', function (done) {
    Person.merge({ 
      slug: 'TEST-SLUG-HANDLE-WITH-CARE',
      original_slug: 'ATEST-BSLUG-CHANDLE-DWITH-ECARE',
      first_name: 'Simone',
      last_name: 'Veil',
      name: 'Simone Veil',
      doi: '',
      birth_date: '1927-07-13',
      birth_time: -1355961180,
      birth_place: 'Nice, Provence, France',
      thumbnail: 'http://commons.w..',
      viaf_id: '120689047', 
      wiki_id: 'Simone_Veil',
      languages: [ 'en' ],
      abstract_en: '...'
    }, function (err, per) {
      __person = per;
      should.not.exist(err)
      done();
    })
  });
  
  it('should create a brand new INCOMPLETE person. Incomplete peope do not have slugs', function (done) {
    Person.merge_incomplete({ 
      original_slug: 'TEST-INCOMPLETE-SLUG-HANDLE-WITH-CARE',
      name: 'Simone Veil',
      doi: 'DOI FOR THAT ORIGINAL SLUG',
      dois: ['DOI FOR THAT ORIGINAL SLUG'],
      languages: [ 'en', 'jp' ]
    }, function (err, per) {
      __unknown = per;
      should.not.exist(err)
      done();
    })
  });
  
  it('should return some colleague', function (done) {
    Person.getRelatedPersons({slug: 'egon-bahr'}, {
      limit:  10,
      offset: 0
    }, function (err, pers) {
      should.not.exist(err);
      
      //console.log(pers)
      done()
    })
  })
  
  it('should remove a person', function (done) {
    Person.remove(__person, function (err) {
      should.not.exist(err);
      done()
    })
  });
  
  it('should remove an incomplete person', function (done) {
    // person.remove_incomplete(__person, function (err) {
    //   should.not.exist(err);
    //   done()
    // })
  done();
  });
})