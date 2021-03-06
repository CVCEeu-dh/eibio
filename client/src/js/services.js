/*
  EIBIO service factories
*/
angular.module('eibio')
  .factory('viafFactory', function ($resource) {
    return $resource('/api/search/viaf');
  })

  .factory('dbpediaFactory', function ($resource) {
    return $resource('http://lookup.dbpedia.org/api/search.asmx/PrefixSearch')
  })
  .factory('suggestFactory', function ($resource) {
    return $resource('/api/search/suggest');
  })
  .factory('personFactory', function ($resource) {
    return $resource('/api/person/:slug');
  })
  .factory('distillFactory', function ($resource) {
    return $resource('/api/search/distill');
  })