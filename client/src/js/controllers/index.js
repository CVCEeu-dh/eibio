/*
  Controllers
*/
angular.module('eibio')
  .controller('IndexCtrl', function ($scope, $log, $q, suggestFactory) {
    $log.debug('IndexCtrl')
    $scope.items = [];
    $scope.query = 'adenauer';
      
    $scope.getEibio = function() {
      $log.debug('getEibio')
      $scope.info = false;
      suggestFactory.get({
        q: $scope.query
      }, function(res) {
        console.log(res)
        $scope.items = res.result.items;
        $scope.info = res.info
      });
    }
  })

  
