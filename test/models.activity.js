/*
  
  Testing Activity model
  ======================
  
  usage from command line:
  cd eibio
  mocha -g 'models:activity' 
*/
'use strict';


var helpers = require('../helpers'),
    Activity  = require('../models/activity'),
    Person  = require('../models/person'),
    should  = require('should');
    
describe('models:activity', function() {
  var __person,
      __activity;
  
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
  
  it('should return the person along with its Master and commander activity timeline', function (done) {
    Person.get({slug: __person.slug}, function (err, node) {
      should.not.exist(err);
      done()
    })
  })
  it('should return the activity', function (done) {
    Activity.get({slug: __activity.slug}, function (err, node) {
      should.not.exist(err);
      should.equal(node.slug, __activity.slug);
      should.exist(node.uri);
      // console.log(node)
      done()
    })
  })
  it('should return some activity (with related institutions)', function (done) {
    Activity.getMany({
      limit: 10,
      offset: 0
    }, function (err, results) {
      should.not.exist(err);
      should.exist(results.total_count);
      should.exist(results.items.length);
      done()
    })
  })
  it('should return the activity along with its person', function (done) {
    Activity.getRelatedPersons({slug: __activity.slug}, {
      limit:  5,
      offset: 0
    }, function (err, node) {
      should.not.exist(err);
      should.equal(node.slug, __activity.slug);
      should.exist(node.uri);
      // console.log(node)
      done()
    })
  })
  
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
  
})