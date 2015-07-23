/*
  
  Testing Activity model
  ======================
  
  usage from command line:
  cd eibio
  mocha -g 'models:activity' 
*/
'use strict';


var helpers = require('../helpers'),
    institution  = require('../models/institution'),
    activity  = require('../models/activity'),
    person  = require('../models/person'),
    should  = require('should');
    
describe('models:institution', function() {
  var __person,
      __institution,
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
      position: 'Master and commander - The Far side of the World',
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
  
  it('should create a brand new institution', function (done) {
    this.timeout(5000)
    institution.merge({ 
      name: 'European Parliament',
      name_en: 'European Parliament',
      name_fr: 'Parlement Europeen',
      country: '',
      wiki_id: 'European Parliament'
    }, function (err, ins) {
      if(err)
        throw err;
      __institution = ins;
      should.equal(ins.type, 'institution')
      should.not.exist(err);
      // console.log(__institution)
      done()
    })
  })
  
  it('should create a relationship between the institution and the activity', function (done) {
    institution.addRelatedActivity(__institution, __activity, function (err, ins) {
      if(err)
        throw err
      done()
    })
  })
  
  
  it('should enrich the institution with the wiki_id', function (done) {
    institution.discover(__institution, function (err, ins) {
      if(err)
        throw err;
      should.equal(ins.id, __institution.id)
      should.exist(ins.props.wiki_id);
      done();
    });
    
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
  
  it('should remove the institution', function (done) {
    institution.remove(__institution, function (err) {
      should.not.exist(err);
      done()
    })
  });
  
})