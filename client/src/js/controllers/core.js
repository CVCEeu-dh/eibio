/*
  Core Controllers
*/
angular.module('eibio')
  .controller('CoreCtrl', function ($scope, $log, $q, suggestFactory, $state) {
    $log.debug('CoreCtrl');

    $scope.person = {}

    $scope.setPerson = function() {
      $log.log('CoreCtrl -> setPerson');
      $scope.person = person;
    }

    // csv fields
    $scope.personFields = [
      'id',
      'slug',
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
      'isni_id',
      'abstract_en',
      'abstract_fr'
    ];

    
  });