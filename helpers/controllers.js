'use-strict';
/*
  Helpers for controller scripts. 
  ===
  
  Prepare the express API response (cfr. models/)
  
  @param err         - error, if any
  @param res         - express response to write to
  @param item|items  - array of items to return or single item
  @param params      - the validated params describing the result
    
*/
module.exports = {
  getOne: function (err, res, item, info) {
    if(err == IS_EMPTY)
      return res.error(404);
    if(err)
      return module.exports.models.cypherQueryError(err, res);
    return res.ok({
      item: item
    }, info || {});
  },
  getMany: function (err, res, items, info) {
    if(err && err != IS_EMPTY)
      return module.exports.models.cypherQueryError(err, res);
    
    var response = {
          items: items || []
        },
        _info = {};
    
    if(info.item)
      response.item     = info.item ;
    if(info.params)
      _info.params      = info.params;
    if(info.warnings)
      _info.warnings    = info.warnings;
    if(info.total_count !== undefined)
      _info.total_count = info.total_count;
    return res.ok(response, _info);
  },
  /**
    Handle Form errors (Bad request)
  */
  formError: function(err, res) {
    return res.error(400, err);
  },
  /**
    Handle causes and stacktraces provided by seraph Query and rawQuery.
    @err the err OBJECT provided by cypher
    @res the express response object
  */
  cypherQueryError: function(err, res) {
    // for(i in err)
    //   console.log(i)
    // console.log('@helpers.cypherQueryError', err.neo4jException, err.statusCode, err.neo4jCause)
    switch(err.neo4jException) {
      case 'EntityNotFoundException':
        return res.error(404, {
          message:  err.neo4jCause.message,
          exception: err.neo4jException
        });
      default:
        return res.error(err.statusCode, err);
    };
  }
}