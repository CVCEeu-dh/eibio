/*
  
  Testing helpers (markdown parsing mechanism)
  ===
  
  usage from command line:
  cd eibio
  mocha -g 'helpers:' 
*/
'use strict';


var helpers = require('../helpers.js'),
    should  = require('should');
    
describe('helpers: slugs', function() {
  it('should translate the name into a proper slug', function (done) {
    should.equal(helpers.extract.smartSlug('Alexander MÖLLER'), 'alexander-moller');
    done()
  })
})

describe('helpers: geo', function() {
  it('should get the address for the University of Munich', function (done) {
    should.equal(helpers.extract.smartSlug('Alexander MÖLLER'), 'alexander-moller');
    done()
  })
})

describe('helpers: date parser', function() {
  it('should parse a date correctly', function (done) {
    var valid    = helpers.extract.dates('1927-07-13', 'YYYY-mm-DD'),
        notValid = helpers.extract.dates('', 'YYYY-mm-DD');
    
    should.equal(valid.date, '1927-07-13');
    should.not.exist(notValid.date);
    done();
  });
  
  it('should parse multiple dates correctly', function (done) {
    var y = helpers.extract.years("Député conservateur (1924-1929; 1931-1945)");
    should.equal(y[0][0], 1924);
    should.equal(y[0][1], 1929);
    should.equal(y[1][0], 1931);
    should.equal(y[1][1], 1945);
    done();
    
  });
  
  it('should parse couple of date correctly', function (done) {
    var y = helpers.extract.years("Prime Minister (1957–1963)");
    should.equal(y[0][0], 1957);
    should.equal(y[0][1], 1963);
    done();
  });
  
  it('should also parse single dates', function (done) {
    var y = helpers.extract.years("Ministre de l'Air (1945)");
    should.equal(y[0][0], 1945);
    done();
  });
  
  it('should also parse single dates with mistakes', function (done) {
    var y = helpers.extract.years("Ministre de l'Air (1945");
    should.equal(y[0][0], 1945);
    done();
  });
  
  it('should parse multiple dates correctly, with comma', function (done) {
    var y = helpers.extract.years("Chairman of the EPP Group in the European Parliament (1977-1982, 1984-1992)");
    should.equal(y[0][0], 1977);
    should.equal(y[0][1], 1982);
    should.equal(y[1][0], 1984);
    should.equal(y[1][1], 1992);
    done();
  });
  
  it('should parse the enricherd cypher query correctly', function (done) {
    var y = helpers.cypher.query('MATCH (ent {{:title_%(language)}:"english title", slug: {slug}}) RETURN ent', {
      language: 'en'
    });
    var z = helpers.cypher.query('ON MERGE SET ent.{:name_%(language)} = {{:name_%(language)}}', {
      language: 'fr'
    })
    
    should.equal(y, 'MATCH (ent {title_en:"english title", slug: {slug}}) RETURN ent');
    should.equal(z, 'ON MERGE SET ent.name_fr = {name_fr}');
    done();
  });
  
  
  
})