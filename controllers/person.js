/**

  API Controller for eibio:Person
  ===
  
*/
var helpers    = require('../helpers'),
    validator  = require('../validator'),
    Person     = require('../models/person');
    
module.exports = function(io) {
  return {
    /*
      get a single person, validated against slugs at express level.
    */
    getItem: function (req, res) {
      var form = validator.request(req);
      if(!form.isValid)
        return helpers.models.formError(err, res);
      Person.get({
        slug: form.params.slug
      }, function (err, item) {
        return helpers.models.getOne(err, res, item, form.params);
      });
    },
    
    /*
      get a list of people.
    */
    getItems: function (req, res) {
      var form = validator.request(req, {
        limit: 10,
        offset: 0
      });
      if(!form.isValid)
        return helpers.formError(err, res);
        
      Person.getMany(form.params, function (err, results) {
        return helpers.models.getMany(err, res, results, {params: form.params});
      });
    },
    
    /*
      get a list of related items, according to the model specified.
    */
    getRelatedItems: function (req, res) {
      var form = validator.request(req, {
        limit: 10,
        offset: 0
      });
      if(!form.isValid)
        return helpers.formError(form.errors, res);
      var related = {
        person: 'getRelatedPersons',
        media: 'getRelatedMedia',
        'person-by-media': 'getRelatedPersonsByMedia'
      }
      
      Person[related[form.params.model]]({
        slug: form.params.slug
      }, form.params, function (err, items) {
        return helpers.models.getMany(err, res, items, {
          params: form.params
        });
      });
    }
  }
};