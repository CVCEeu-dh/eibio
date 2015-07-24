/*
  
  Test search ctrl via REST API
  ===
  
  mocha -g 'controllers:search' 

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

describe('controllers:search', function() {
  it('shoudl provide some hint ', function(done) {
    session
      .get('/api/search/suggest?q=bahr')
      .expect('Content-Type', /json/)
      .expect(200)
      .end(function (err, res) { //
        should.not.exist(err);
        // should.exist(res.body.result.items)
        // console.log(res.body.info)
        done();
      });
  })
  it('shoudl fail because of the length of the query parameter ', function(done) {
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
}) 