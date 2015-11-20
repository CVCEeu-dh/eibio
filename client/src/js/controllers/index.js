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

  .controller('PersonCtrl', function ($scope, $log, $q, $filter, viafFactory, dbpediaFactory, distillFactory) {
    $scope.query;

    $scope.status = 'READY'

    
    // $scope.person = {}//"wiki_id":"Tommaso_Padoa-Schioppa","viaf_id":"22113496"};
    $scope.person = {
      name: 'unknown person'
    };
    // csv fields
    
    $scope.reset = function() {
      $scope.person = {
        name: 'unknown person'
      }
    }

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

    $scope.getDistill = function(item) {
      $scope.status = 'BUSY'
      
      if(!$scope.person.name)
        $scope.person.name = item.term || item.label;
      var per = {};
      if($scope.person.viaf_id)
        per.viaf_id = $scope.person.viaf_id;
      if($scope.person.wiki_id)
        per.wiki_id = $scope.person.wiki_id;

      if(per.wiki_id || per.viaf_id){
        distillFactory.get(per, function (res) {
          console.log(res)
          var person = angular.copy($scope.person);
          // if there is eibio, add those before
          // signale link
          // if(res.result.eibio.slug)
          //   $scope.person = angular.extend({
          //     id: res.result.eibio.id,
          //     slug: res.result.eibio.slug
          //   },  res.result.eibio.props, angular.copy($scope.person));
          if(res.result.dbpedia) { // complete
            [
              'first_name',
              'last_name',
              'thumbnail',
              'birth_place',
              'death_place'
            ].map(function (f) {
              if(res.result.dbpedia[f])
                person[f] = res.result.dbpedia[f];
            });

            [
              'birth_time',
              'death_time'
            ].map( function (f) {
              if(res.result.dbpedia[f]) {
                var datetime = moment.utc(res.result.dbpedia[f], 'X');
                person[f] = datetime.format('X');
                person[f.split('_')[0] + '_date'] = datetime.format('YYYY-MM-DD')
              }
            });
          }
          if(res.result.viaf.viafID) {
            // check isni
            if(res.result.viaf.ISNI)
              person.isni_id = res.result.viaf.ISNI[0];
            if(res.result.viaf.WKP)
              person.wikidata_id = res.result.viaf.WKP[0];
            if(res.result.viaf.LC)
              person.worldcat_id = 'lccn-' + res.result.viaf.LC[0]
          }

          $scope.person = person;
          $scope.status = 'DONE';
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
    
  })
