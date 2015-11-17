/**
  
  Basic custom api params validation
  ===

*/
var _    = require('lodash'),
    validator  = require('validator');


module.exports = {
  /*
    Verify that for each field in form, everything looks good.
    @params form    - req.body and/or req.params
    @params fields  - array of validation techniques per field.
    @return true or the array of not valid fields
  */
  verify: function (form, fields, options) {
    var options = options || {},
        errors = [];
        
    if(options.strict) {
      for(var i in fields) {
        if(fields[i].optional && !form[fields[i].field])
          continue;
        if(!validator[fields[i].check].apply(this, [form[fields[i].field]].concat(fields[i].args))) {
          errors.push(fields[i]);
        }
      }
    } else {
      var indexes = _.map(fields, 'field');
      
      for(var i in form) {
        var index = indexes.indexOf(i);
        if(index == -1)
          continue;
        // console.log(indexes, index, fields[index], i)
        // console.log(i, form[i], fields[index].check)
        if(!validator[fields[index].check].apply(this, [form[i]].concat(fields[index].args))) {
          fields[index].value = form[i];
          errors.push(fields[index]);
        }
      }
    }
        
    if(errors.length)
      return errors;
    return true;
  },

  /*
    Validate request.body against POST data.
    It uses validate and provide the right validation to the right field.
    @param params   - predefined params
    
  */
  request: function(req, params, next) {
    var errors     = {},
        safeParams = {},
        params     = _.merge(params || {}, req.query || {}, req.body || {}, req.params || {}),
        
        fields     = [
          {
            field: 'viaf_id',
            check: 'isInt',
            args: [
              0
            ],
            error: 'viaf identifier is not valid'
          },
          {
            field: 'id',
            check: 'isInt',
            args: [
              0
            ],
            error: 'id not valid'
          },
          {
            field: 'ids',
            check: 'matches',
            args: [
              /[\d,]+/
            ],
            error: 'ids should contain only numbers and commas'
          },
          {
            field: 'limit',
            check: 'isInt',
            args: [
              1,
              50
            ],
            error: 'should be a number in range 1 to max 50'
          },
          {
            field: 'offset',
            check: 'isInt',
            args: [
              0
            ],
            error: 'should be a number in range 1 to max 50'
          },
          {
            field: 'name',
            check: 'isLength',
            args: [
              3,
              500
            ],
            error: 'should be at least 3 to 160 chars',
            optional: true
          },
          {
            field: 'q',
            check: 'isLength',
            args: [
              2,
              100
            ],
            error: 'should be at least 2 to 100 chars'
          },
          {
            field: 'description',
            check: 'isLength',
            args: [
              3,
              2500
            ],
            error: 'should be at least 3 to 250 chars'
          },
          {
            field: 'password',
            check: 'isLength',
            args: [
              8,
              32
            ],
            error: 'password have to ...'
          }
        ],
        result;
    // console.log(params)
    result = module.exports.verify(params, fields);
    // errors?
    if(result !== true) {
      if(next)
        next(result);
      else
        return {
          isValid: false,
          errors: result
        };
    }
    // sanitize here the params if required (e.g, limit and offset if they're exagerated etc..)...
    safeParams = params;
    if(safeParams.id)
      safeParams.id = +safeParams.id;
    if(safeParams.ids)
      safeParams.ids = _.compact(safeParams.ids.split(',')).map(function(d) {
        return +d;
      });
    if(safeParams.limit)
      safeParams.limit = +safeParams.limit;
    if(safeParams.offset)
      safeParams.offset = +safeParams.offset;
    if(next)
      next(null, safeParams);
    else
      return {
        isValid: true,
        params: safeParams
      };
  }
};