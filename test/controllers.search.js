/*
  
  Test search ctrl via REST API
  ===
  
  mocha -g 'controllers:search' 

*/
'use strict';

var settings  = require('../settings'),
    should    = require('should'),
    neo4j     = require('seraph')(settings.neo4j.host),
    
    app       = require('../server').app,

    Session   = require('supertest-session')({
      app: app
    }),

    session,
    
    _         =  require('lodash'),

    Person    = require('../models/person'),
    __person;

/*
  Create a session
*/
before(function () {
  session = new Session();
  

});

after(function () {
  session.destroy();
});

describe('controller:search before', function() {
  it('should remove a person', function (done) {
    Person.remove({
      slug: 'test-slug-handle-with-care',
    }, function (err) {
      should.not.exist(err);
      done();
    });
  });

  it('should create a person', function (done) {
    Person.merge({ 
      slug: 'test-slug-handle-with-care',
      original_slug: 'ATEST-BSLUG-CHANDLE-DWITH-ECARE',
      first_name: 'Simone',
      last_name: 'Veil',
      name: 'Desire Velasco Test Simone Veil',
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
  })
})


describe('controller:search', function() {
  it('shoudl provide some hint for the person just created', function (done) {
    session
      .get('/api/search/suggest?q=test Velasco')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) { //
        should.not.exist(err);
        console.log(res.body.result)
        should.equal(res.body.result.items[0].slug, __person.slug)
        done();
      });
  })
  it('shoudl fail because of the length of the query parameter ', function (done) {
    session
      .get('/api/search/suggest')
      .expect('Content-Type', /json/)
      .expect(400)
      .end(function (err, res) { //
        should.not.exist(err);
        should.exist(res.body.error);
        should.equal(res.body.status, 'error');
        done();
      });
  })
});

describe('controller:search viaf', function() {
  it('shoudl look for viaf candidates for a specific person ', function (done) {
    session
      .get('/api/search/viaf?q=Lamfalussy')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) { //
        should.not.exist(err);
        console.log(res.body);
        done();
      });
  })
});


describe('controller:search distill viaf', function() {
  it('distill a person by viaf_id', function (done) {
    session
      .get('/api/search/distill?viaf_id=34470968')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) { //
        should.not.exist(err);
        // should.equal('34470968', res.body.result.viaf.viafID);
        done();
      });
  })
});

describe('controller:search distill wiki', function() {
  it('distill a person by wiki_id AND viaf_id', function (done) {
    session
      .get('/api/search/distill?viaf_id=34470968&wiki_id=Konrad_Adenauer')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) { //
        should.not.exist(err);
        console.log(res.body);
        done();
      });
  })
});

describe('controller:search after', function() {
  it('should remove a person', function (done) {
    Person.remove({
      slug: 'test-slug-handle-with-care',
    }, function (err) {
      should.not.exist(err);
      done();
    });
  });
});