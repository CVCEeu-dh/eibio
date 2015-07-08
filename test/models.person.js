/*
  
  Testing Person model
  ====================
  
  usage from command line:
  cd eibio
  mocha -g 'models:person' 
*/
'use strict';


var helpers = require('../helpers'),
    person  = require('../models/person'),
    should  = require('should');
    
describe('models:person', function() {
  var __person;
  
  it('should create a brand new person (merge with non-existing person)', function (done) {
    person.merge({ 
      slug: 'TEST-SLUG-HANDLE-WITH-CARE',
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
  
  it('should remove a person', function (done) {
    person.remove(__person, function (err) {
      should.not.exist(err);
      done()
    })
  });
})