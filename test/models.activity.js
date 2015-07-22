/*
  
  Testing Activity model
  ======================
  
  usage from command line:
  cd eibio
  mocha -g 'models:activity' 
*/
'use strict';


var helpers = require('../helpers'),
    activity  = require('../models/activity'),
    person  = require('../models/person'),
    should  = require('should');
    
describe('models:activity', function() {
  var __person,
      __activity;
  
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
  
  it('should create a brand new activity for him/her', function (done) {
    activity.merge({ 
      person: __person,
      description_en: 'Master and commander - The Far side of the World (1980-1987)',
      description_fr: 'Master & Commander : de l\'autre côté du monde (1980-1987)',
      start_date: '1980',
      start_time: 315532800, // 1980-01-01
      end_date: '1987',
      end_time: 567907200, // 1980-01-01
      country: 'ITA'
    }, function (err, act) {
      __activity = act;
      should.equal(act.start_time, 315532800)
      should.equal(act.props.country, 'ITA')
      should.not.exist(err)
      done();
    })
  });
  
  it('should get the person along with its Master and commander activity timeline', function (done) {
    person.get({slug: 'konrad-adenauer'}, function (err, node) {
      should.not.exist(err);
      done()
    })
  })
  
  it('should remove a person', function (done) {
    person.remove(__person, function (err) {
      should.not.exist(err);
      done()
    })
  });
  
  it('should remove the activity', function (done) {
    activity.remove(__activity, function (err) {
      should.not.exist(err);
      done()
    })
  });
  
})