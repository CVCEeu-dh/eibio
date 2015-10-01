/*
  
  Testing services
  ===
  
  usage from command line:
  cd eibio
  mocha -g 'services:' 
*/
'use strict';


var services = require('../services.js'),
    should  = require('should');
  
describe('services: viaf', function() {
  it('should get the proper VIAF info', function (done) {
    services.viaf.links({
      link: '312733552'
    }, function (err, results) {

      should.not.exist(err);
      should.equal(results.viafID, '312733552');
      done()
    })
    
  })
})
    