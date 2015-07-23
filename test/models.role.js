/*
  
  Testing Activity model
  ======================
  
  usage from command line:
  cd eibio
  mocha -g 'models:activity' 
*/
'use strict';


var helpers = require('../helpers'),
    Activity     = require('../models/activity'),
    Person       = require('../models/person'),
    Role         = require('../models/role'),
    should  = require('should');

var __person,
    __institution,
    __activity,
    __role;
    
describe('models:role init', function() {
  it('should create a brand new person (merge with non-existing person)', function (done) {
    this.timeout(5000)
    Person.merge({ 
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
    Activity.merge({ 
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
  
});


describe('models:role', function() {  
  it('should create a brand new role', function (done) {
    Role.merge({ 
      name: 'Secretary General',
      name_fr: 'Secrétaire général',
      name_en: 'Secretary General'
    }, function (err, rol) {
      __role = rol;
      should.equal(rol.slug, 'secretary-general')
      should.equal(rol.props.name_fr, 'Secrétaire général')
      should.equal(rol.props.name_en, 'Secretary General')
      should.not.exist(err)
      done();
    })
  });
   it('should create a relationship between the role and the activity', function (done) {
    Role.addRelatedActivity(__role, __activity, function (err, rol) {
      if(err)
        throw err
      should.not.exist(err)
      done()
    })
  })
});

describe('models:role destroy', function() {  
  
  it('should remove a person', function (done) {
    Person.remove(__person, function (err) {
      should.not.exist(err);
      done()
    })
  });
  
  it('should remove the activity', function (done) {
    Activity.remove(__activity, function (err) {
      should.not.exist(err);
      done()
    })
  });
  
  it('should remove the role', function (done) {
    Role.remove(__role, function (err) {
      should.not.exist(err);
      done()
    })
  });
  
})