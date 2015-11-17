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

  .controller('CreatePersonCtrl', function ($scope, $log, $q, viafFactory, dbpediaFactory, distillFactory) {
    $scope.query;

    $scope.status = 'READY'

    $scope.person = {"wiki_id":"Tommaso_Padoa-Schioppa","viaf_id":"22113496"};

    // csv fields
    $scope.personFields = [
      'name',
      'first_name',
      'last_name',
      'birth_date',
      'birth_place',
      'death_date',
      'death_place',
      'wiki_id',
      'viaf_id',
      'wikidata_id',
      'worldcat_id',
      'abstract_en',
      'abstract_fr'
    ];

    $scope.tabs = [
      {
        title: 'viaf',
        templateUrl: 'templates/partials/viaf.html',
      },
      {
        title: 'dbpedia',
        templateUrl: 'templates/partials/dbpedia.html',
       
        
      },
      {
        title: 'distill',
        templateUrl: 'templates/partials/distill.html',
        active: true
      }
    ];
    
    $scope.step = 0;
    
    $scope.viafItems=[];
    $scope.viafItems=[];

    $scope.getViaf = function(query){
      $scope.status = 'BUSY'
      $scope.query = query;
      viafFactory.get({
        q: $scope.query
      }, function(res) {
        $scope.viafItems = res.result.items;
        $scope.status = 'DONE';
      })
    }

    $scope.getDistill = function() {
       $scope.status = 'BUSY'
      var per = {};
      if($scope.person.viaf_id)
        per.viaf_id = $scope.person.viaf_id;
      if($scope.person.wiki_id)
        per.wiki_id = $scope.person.wiki_id;

      if(per.wiki_id || per.viaf_id){
        distillFactory.get(per, function (res) {
          console.log(res)
          // if there is eibio, add those before
          if(res.result.eibio.slug)
            $scope.person = angular.extend({
              id: res.result.eibio.id,
              slug: res.result.eibio.slug
            },  res.result.eibio.props, angular.copy($scope.person));
        });
      }
    }

    $scope.getDbpedia = function(query) {
       $scope.status = 'BUSY'
      $scope.query = query;
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
        $scope.status = 'DONE';
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