/*
  
  Test institution ctrl via REST API
  ===
  
  mocha -g 'controllers:institution' 

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
    Institution = require('../models/institution'),
    __person,
    __activity,
    __institution;


describe('controllers:institution init', function() {
 
  
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
      // console.log(act)
      done();
    })
  });

  it('should create a brand new institution', function (done) {
    this.timeout(5000)
    Institution.merge({ 
      name: 'Test European Parliament',
      name_en: 'Test European Parliament',
      name_fr: 'Parlement Europeen, test',
      country: '',
      wiki_id: 'European_Parliament'
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
    Institution.addRelatedActivity(__institution, __activity, function (err, ins) {
      if(err)
        throw err
      done()
    })
  })
});

describe('controllers:institution API', function() {
  it('should show a list of institutions', function (done) {
    session
      .get('/api/institution?limit=5')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) { //
        should.not.exist(err);
        should.equal(res.body.info.params.limit, 5);
        done();
      });
  });
  
  it('should get the institution', function (done) {
    session
      .get('/api/institution/' + __institution.slug)
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) { //
        should.not.exist(err);
        done();
      });
  });

  it('should show the activity with some persons concerned', function (done) {
    session
      .get('/api/institution/' + __institution.slug + '/related/person?limit=13')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) { //
        should.not.exist(err)
        should.equal(res.body.info.params.limit, 13);
        should.equal(res.body.info.total_count, 1);
        should.exist(res.body.result.items)
        done();
      });
  });
  it('should get closest institutions', function (done) {
    session
      .get('/api/institution/european-commission-bel/related/institution?limit=130')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) { //
        should.not.exist(err)
        should.equal(res.body.info.params.limit, 130);
        should.exist(res.body.result.items)
        done();
      });
  });
  it('should show the activity with some persons concerned', function (done) {
    session
      .get('/api/institution/european-parliament-ita/related/person?limit=13')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) { //
        should.not.exist(err)
        should.equal(res.body.info.params.limit, 13);
        // should.equal(res.body.info.total_count, 1);
        should.exist(res.body.result.items)
        done();
      });
  });
  
});

describe('controllers:institution finish', function() {
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

  it('should remove the institution', function (done) {
    Institution.remove(__institution, function (err) {
      should.not.exist(err);
      done()
    })
  });
});