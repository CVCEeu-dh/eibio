/**

  API Controller for eibio:Activity
  ===
  
*/
var helpers    = require('../helpers'),
    validator  = require('../validator'),
    Activity   = require('../models/activity');
    
module.exports = function(io) {
  return {
    /*
      get a single activity, validated against slugs at express level.
    */
    getItem: function (req, res) {
      var form = validator.request(req);
      if(!form.isValid)
        return helpers.models.formError(form.errors, res);
      Activity.get({
        slug: form.params.slug
      }, function (err, item) {
        return helpers.models.getOne(err, res, item, form.params);
      });
    },
    
    /*
      get a list of activities.
    */
    getItems: function (req, res) {
      var form = validator.request(req, {
        limit: 10,
        offset: 0
      });
      if(!form.isValid)
        return helpers.formError(err, res);
        
      Activity.getMany(form.params, function (err, items) {
        return helpers.models.getMany(err, res, items, {
          params: form.params
        });
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
        person: 'getRelatedPersons'
      }
      
      Activity[related[form.params.model]]({
        slug: form.params.slug
      }, form.params, function (err, item) {
        return helpers.models.getMany(err, res, item.persons, {
          item: item,
          params: form.params
        });
      });
    }
  }
};