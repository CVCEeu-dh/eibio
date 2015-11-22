/*
  Eibio app
*/
angular.module('eibio', [
  'ngResource',
  'ui.router',
  'ui.bootstrap'
])
  .config(function ($stateProvider, $urlRouterProvider){
    $urlRouterProvider
       .otherwise('/');

    $stateProvider
      .state('index', {
        url: '/',
        templateUrl: 'templates/index.html',
        controller: 'IndexCtrl'
      })

      .state('person', {
        url: '/person/{slug:[a-z-0-9]{2,64}}',
        templateUrl: 'templates/person.html',
        controller: 'PersonCtrl',
        resolve: {
          person: function(personFactory, $stateParams) {
            return personFactory.get({
              slug: $stateParams.slug
            }).$promise
          }
        }
      })

      .state('createPerson', {
        abstract: true,
        url: '/person/new',
        templateUrl: 'templates/person.create.html',
        controller: 'CreatePersonCtrl'
      })
        
        .state('createPerson.viaf', {
          url: '',
          templateUrl: 'templates/partials/viaf.html',
          // controller: 'ViafCtrl'
        })

        .state('createPerson.dbpedia', {
          url: '/dbpedia',
          templateUrl: 'templates/partials/dbpedia.html',
          // controller: 'ViafCtrl'
        })    

        .state('createPerson.description', {
          url: '/description',
          templateUrl: 'templates/partials/description.html',
          // controller: 'ViafCtrl'
        })    


  })

  .filter('tsv', function($sce) {
    return function(input, fields) {
      // return $sce.trustAsHtml(fields.map(function  (f) {
      //   return f
      // }).join('&#9;') + '\n' + 

      return fields.join('\t') + '\n' + fields.map(function  (f) {
        if(input && input[f])
          if( typeof input[f] != 'string')
            return input[f]
          else
            return (input[f]||'').split(/\n/).join(' -/- ')
        else
          return ''; 
        
      }).join('\t') + '\n';
    }
  })
  /*
    @param inputs - array of items
  */
  .filter('tsvs', function($sce) {
    return function(inputs, fields) {
      // return $sce.trustAsHtml(fields.map(function  (f) {
      //   return f
      // }).join('&#9;') + '\n' + 

      return fields.join('\t') + '\n' + inputs.map(function  (input) {
        return fields.map(function (f) {
          if(input && input[f])
            if( typeof input[f] != 'string')
              return input[f]
            else
              return (input[f]||'').split(/\n/).join(' -/- ')
          else
            return ''; 
        }).join('\t')
        
      }).join('\n');
    }
  })

  .filter('datesOfAPerson', function() {
    return function(props) {
      if(! props)
        return '( ? - ... )';
      var start_date_a = moment.utc(props.birth_time, 'X'),
          start_date_b = moment.utc(props.death_time, 'X'),
          delta = moment.duration(start_date_b.diff(start_date_a));
      
      return [
        '(', 
          start_date_a.isValid()? start_date_a.format('ll'): ' ? ',
        ' — ',
          start_date_b.isValid()? start_date_b.format('ll'): ' ... ',
        ')'
      ].join(''); // count years
    };
  })

  .directive('marked', function ($compile, $log) {
    return {
      restrict : 'A',
      scope:{
        marked: '=',
        context: '='
      },
      link : function(scope, element, attrs) {
        var entities = [],
            renderer = new marked.Renderer();
        // chenge how marked interpred link for this special directive only
        
        
        
        scope.$watch('marked', function(val) {
          if(!val)
            return;
          element.html(marked(scope.marked));
        })
      }
    }
  })
  /*
    Code from: https://github.com/omichelsen/angular-clipboard
    License: The MIT License (MIT)
  */
  .directive('clipboard', ['$document', function ($document) {
    return {
      restrict: 'A',
      scope: {
          onCopied: '&',
          onError: '&',
          text: '='
      },
      link: function (scope, element) {
        function createNode(text) {
            var node = $document[0].createElement('textarea');
            node.style.position = 'absolute';
            node.style.left = '-10000px';
            node.textContent = text;
            return node;
        }

        function copyNode(node) {
            // Set inline style to override css styles
            $document[0].body.style.webkitUserSelect = 'initial';

            var selection = $document[0].getSelection();
            selection.removeAllRanges();
            node.select();

            if(!$document[0].execCommand('copy')) {
              throw('failure copy');
            }
            selection.removeAllRanges();

            // Reset inline style
            $document[0].body.style.webkitUserSelect = '';
        }

        function copyText(text) {
            var node = createNode(text);
            $document[0].body.appendChild(node);
            copyNode(node);
            $document[0].body.removeChild(node);
        }

        element.on('click', function (event) {
            try {
                copyText(scope.text);
                if (angular.isFunction(scope.onCopied)) {
                    scope.$evalAsync(scope.onCopied());
                }
            } catch (err) {
                if (angular.isFunction(scope.onError)) {
                    scope.$evalAsync(scope.onError({err: err}));
                }
            }
        });
      }
    };
  }]);