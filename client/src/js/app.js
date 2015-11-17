/*
  Eibio app
*/
angular.module('eibio', [
  'ngResource',
  'ngRoute',
  'ui.bootstrap'
])
  .config(function ($routeProvider){
    $routeProvider
      .when('/', {
        templateUrl: 'templates/index.html',
        controller:  'IndexCtrl'
      })
      .when('/create/person', {
        templateUrl: 'templates/create-person.html',
        controller: 'CreatePersonCtrl'
      })

      .otherwise({
        redirectTo: '/'
      });
  })

  .filter('tsv', function($sce) {
    return function(input, fields) {
      return $sce.trustAsHtml(fields.map(function  (f) {
        return f
      }).join('&#9;') + '\n' + fields.map(function  (f) {
        return input[f]
      }).join('&#9;') + '\n');
    }
  })