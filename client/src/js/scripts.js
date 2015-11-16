angular.module('eibio', ['ngResource', 'ngRoute'])
  .factory('viafFactory', function ($resource) {
    return $resource('/api/search/viaf');
  })
  .controller('MainCtrl', function ($scope, $log, $q, viafFactory) {
  $scope.query = 'Adenauer'; 
  
  $scope.steps = [
    {},
    {},
    {}
  ];
  
  $scope.step = 0;
  
  $scope.viafItems=[];
  $scope.viafItem = {}

  $scope.getViaf = function(){
    viafFactory.get({
      q: $scope.query
    }, function(res) {
      $scope.viafItems = res.result.items
    })
  }
  
  $scope.next = function(){
      $scope.step++;
    }
    
    $scope.restart = function(){
      $scope.step = 0;
    }
    
  })
  