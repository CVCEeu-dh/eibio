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