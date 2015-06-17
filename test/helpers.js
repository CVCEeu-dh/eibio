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

describe('helpers: date parser', function() {
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
})