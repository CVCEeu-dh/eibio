/*
  Person Controllers
*/
angular.module('eibio')
  .controller('PersonCtrl', function ($scope, $log, $q, person, suggestFactory, $state) {
    $log.debug('PersonCtrl', person.result);

    $scope.item = person.result.item;
    
    if(!$scope.item.activities || !$scope.item.activities.length) {
      $scope.item.activities = [{
        person_slug: person.result.item.slug
      }]
    } else {
      var activities = []
      person.result.item.activities.forEach(function (d) {
        (d.institutions.length? d.institutions: [ {} ]).forEach(function (ins) {
          
          var act = {
            person_slug: person.result.item.slug,
            activity_slug: d.props.slug,
            country: d.props.country_code,
            country_long: d.props.country,
            description_fr: d.props.description_fr,
            description_en: d.props.description_en,
            start_date: d.timeline.start_date,
            end_date: d.timeline.end_date
            
          };
          if(ins.id) {
            act.institution_slug = ins.slug;
            act.institution_name = ins.props.name;
            act.institution_country = ins.props.country; // if any!!!!
            act.institution_viaf_id = ins.props.viaf_id;
          }
          activities.push(act);
          console.log("institutions", act)
        })
      });
      activities.sort(function(a, b) {
        if(a.start_date < b.start_date)
          return 1;
        else if(a.start_date == b.start_date)
          return a.end_date <= b.end_date
        return -1
      });
      $scope.item.activities = activities;
    }

    if(!$scope.item.nationalities || !$scope.item.nationalities.length) {
      $scope.item.nationalities = [{
        person_slug: person.result.item.slug
      }]
    } else {
      $scope.item.nationalities = person.result.item.nationalities.map(function (d) {
        // console.log(d)
        var start_date = d.timeline.start_date,
            end_date = d.timeline.end_date;

        if(!start_date) {
          start_date = moment.utc(person.result.item.props.birth_time, 'X', true);
          start_date = start_date.isValid()? start_date.format('YYYY'): '';
        }

        if(!end_date) {
          end_date = moment.utc(person.result.item.props.death_time, 'X', true);
          end_date = end_date.isValid()? end_date.format('YYYY'): '';
        }

        return {
          person_slug: person.result.item.slug,
          country: d.slug,
          country_long: d.country.value,
          description_fr: d.country.nationality_fr,
          description_en: d.country.nationality_en,
          start_date: start_date,
          end_date: end_date,
          reference: d.reference
        }
      })
    }

    // csv fields
    $scope.activityFields = [
      'action',
      'person_slug',
      'activity_slug',
      'country',
      'description_fr',
      'description_en',
      'start_date',
      'end_date',
      'institution_slug',
      'institution_name',
      'institution_country', // if any!!!!
      'institution_viaf_id'
    ];

    $scope.nationalityFields = [
    'action',
      'person_slug',
      'country',
      'start_date',
      'end_date',
      'reference'
    ];


  })

  .controller('CreatePersonCtrl', function ($scope, $log, $q, $filter, viafFactory, dbpediaFactory, distillFactory) {
    $scope.query;

    $scope.status = 'READY'

    $scope.copyfail = function() {
        console.log('copyfail!');
    }

    $scope.copied = function() {
        console.log('Copied!');
      alert('the biography has been copied to your clipboard and can be pasted in google spreadsheet')
    }
    // $scope.person = {}//"wiki_id":"Tommaso_Padoa-Schioppa","viaf_id":"22113496"};
    $scope.person = {
      
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