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
  .controller('CreatePersonCtrl', function ($scope, $log, $q, viafFactory, dbpediaFactory) {
    $scope.query = 'adenauer';

    $scope.person = {"wiki_id":"Konrad_Adenauer","viaf_id":"34470968"};

    $scope.tabs = [
      {
        title: 'viaf',
        templateUrl: 'templates/partials/viaf.html'
      },
      {
        title: 'dbpedia',
        templateUrl: 'templates/partials/dbpedia.html',
        
      },
      {
        title: 'distill',
        templateUrl: 'templates/partials/dbpedia.html',
        active: true
      }
    ];
    
    $scope.step = 0;
    
    $scope.viafItems=[];
    $scope.viafItems=[];

    $scope.getViaf = function(){
      viafFactory.get({
        q: $scope.query
      }, function(res) {
        $scope.viafItems = res.result.items;
        
      })
    }

    $scope.getDbpedia = function() {
      dbpediaFactory.get({
        QueryClass: '',
        MaxHits: 5,
        QueryString: $scope.query
      }, function(res) {
        console.log(res)
        $scope.dbpediaItems = res.results.map(function(d){
d.wiki_id = d.uri.split('/').pop()
          return d;
        });
        // $scope.info = res.info;
      })
    }
    
    $scope.next = function(){
        $scope.step++;
      }
      
      $scope.restart = function(){
        $scope.step = 0;
      }
      
    })