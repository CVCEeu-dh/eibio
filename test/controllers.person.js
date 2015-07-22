/*
  
  Test person ctrl via REST API
  ===
  
  mocha -g 'controllers:person' 

*/
'use strict';

var settings = require('../settings'),
    should  = require('should'),
    neo4j   = require('seraph')(settings.neo4j.host),
    
    app = require('../server').app,

    Session = require('supertest-session')({
      app: app
    }),

    session,
    
    _ = require('lodash');

before(function () {
  session = new Session();
});

after(function () {
  session.destroy();
});

/*
  Local instance of other models concerned.
*/
var Person = require('../models/person'),
    Activity = require('../models/activity'),
    __person,
    __activity;


describe('controllers:person init', function() {
 
  
  it('should create a brand new person (merge with non-existing person)', function (done) {
    Person.merge({ 
      slug: 'test-slug-handle-with-care',
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
  
  
  it('should create a brand new activity for him/her', function (done) {
    Activity.merge({ 
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

});

describe('controllers:person API', function() {
  it('should show a list of person, with results grouped', function (done) {
    session
      .get('/api/person?limit=5')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) { //
        should.not.exist(err);
        should.equal(res.body.info.params.limit, 5);
        done();
      });
  });
  it('should show person activities', function (done) {
    session
      .get('/api/person/test-slug-handle-with-care')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) { //
        should.not.exist(err)
        should.equal(res.body.result.item.slug, __person.slug);
        done();
      });
  });
});

describe('controllers:person finish', function() {
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
});