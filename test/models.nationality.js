/*
  
  Testing Nationality model
  =========================
  
  usage from command line:
  cd eibio
  mocha -g 'models:nationality' 
*/
'use strict';


var helpers = require('../helpers'),
    nationality  = require('../models/nationality'),
    person  = require('../models/person'),
    should  = require('should');
    
describe('models:nationality', function() {
  var __person,
      __nationality;
  
  it('should create a brand new person (merge with non-existing person)', function (done) {
    this.timeout(5000)
    person.merge({ 
      slug: 'TEST-SLUG-HANDLE-WITH-CARE',
      original_slug: 'TEST-SLUG-HANDLE-WITH-CARE',
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
  
  it('should create a brand new nationality for him/her without any specification', function (done) {
    nationality.merge({ 
      person: __person,
      // start_date: '1980',
      // start_time: 315532800, // 1980-01-01
      // end_date: '1987',
      // end_time: 567907200, // 1980-01-01
      country: 'PRC'
    }, function (err, nat) {
      __nationality = nat;
      if(err)
        console.log(err)
      // should.equal(act.start_time, 315532800)
      should.equal(nat.props.country, 'PRC')
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
  
  it('should remove the nationality', function (done) {
    nationality.remove(__nationality, function (err) {
      should.not.exist(err);
      done()
    })
  });
  
})