
/* Controllers */
angular.module('proso.anatomy.controllers', [])

.controller('AppCtrl', ['$scope', '$rootScope', 'userService', 'pageTitle', 'configService', 'gettextCatalog',
    function($scope, $rootScope, userService, pageTitle, configService, gettextCatalog) {
        'use strict';
        $scope.configService = configService;
        $scope.userService = userService;

        $rootScope.initTitle = function (title) {
            $rootScope.initialTitle = title;
            $rootScope.title = title;
        };

        $rootScope.$on("$routeChangeStart", function(event, next) {
            $rootScope.title = pageTitle(next) + $rootScope.initialTitle;
        });

        $scope.initLanguageCode = function (code) {
            gettextCatalog.setCurrentLanguage(code);
            $rootScope.LANGUAGE_CODE = code;
        };

        $scope.initUser = function (data) {
            userService.processUser(data);
        };

        $scope.logout = function() {
            $rootScope.user = userService.logout();
        };

}])

.controller('AppView', ['$scope', '$routeParams', 'contextService', 'flashcardService', 'categoryService',
    function($scope, $routeParams, contextService, flashcardService, categoryService) {
        'use strict';
        categoryService.getAll().then(function(){
          $scope.category = categoryService.getCategory($routeParams.category);
          console.log($scope.category);
          var user = $routeParams.user || '';

          var filter = {
              categories : [$routeParams.category],
          };

          contextService.getContexts(filter).then(function(data) {
            $scope.contexts = data;
          });

          $scope.typeCategories = flashcardService.getCategories($routeParams.category);

          if ($routeParams.user == 'average') {
            filter.new_user_predictions = true;
          }

          flashcardService.getFlashcards(filter).then(function(data) {
              angular.forEach(data, function(flashcard) {
                if (filter.new_user_predictions) {
                  flashcard.prediction = flashcard.new_user_prediction;
                  flashcard.practiced = true;
                }
                flashcard.prediction = Math.ceil(flashcard.prediction * 10) / 10;
              });
          }, function(){
              $scope.error = true;
          });
        });

        $scope.activateContext = function(context) {
          $scope.activeContext = $scope.activateContext !== context ? context : undefined;
        };

    }
])

.controller('AppPractice', ['$scope', '$routeParams', '$timeout', '$filter',
    'practiceService', 'userService', 'events', 'colors', 'flashcardService',

    function($scope, $routeParams, $timeout, $filter,
        practiceService, userService, events, colors, flashcardService) {
        'use strict';

        $scope.part = $routeParams.part;
        $scope.placeType = $routeParams.place_type;
        $scope.progress = 0;

        $scope.highlight = function() {
            var active = $scope.question;
            if ($filter('isPickNameOfType')($scope.question)) {
                $scope.imageController.highlightItem(active.description, colors.NEUTRAL);
            }
            if ($filter('isFindOnMapType')($scope.question) && $scope.question.options) {
              for (var i = 0; i < $scope.question.options.length; i++) {
                console.log($scope.question, $scope.question.options[i].description);
                $scope.imageController.highlightItem(
                  $scope.question.options[i].description, colors.HIGHLIGHTS[i]);
              }
            }
        };

        $scope.checkAnswer = function(selected) {
            var asked = $scope.question.description;
            highlightAnswer(asked, selected);
            $scope.question.answered_code = selected;
            $scope.question.responseTime += new Date().valueOf();
            var selectedFC = flashcardService.getFlashcardByDescription(selected);
            practiceService.saveAnswerToCurrentFC(selectedFC.id, $scope.question.responseTime);
            $scope.progress = 100 * (practiceService.getSummary().count / practiceService.getConfig().set_length);
            //user.addAnswer(asked == selected);
            if (asked == selected) {
                $timeout(function() {
                    $scope.next();
                }, 700);
            } else {
                $scope.canNext = true;
            }
        };

        $scope.next = function() {
            if ($scope.progress < 100) {
                practiceService.getFlashcard().then(function(q) {
                    setQuestion(q);
                }, function(){
                    $scope.error = true;
                });
            } else {
                setupSummary();
            }
        };

        function highlightAnswer (asked, selected) {
            if ($filter('isFindOnMapType')($scope.question)) {
                $scope.imageController.highlightItem(asked, colors.GOOD);
            }
            $scope.imageController.highlightItem(selected, asked == selected ? colors.GOOD : colors.BAD);
            if ($filter('isPickNameOfType')($scope.question) && $scope.question.options) {
                highlightOptions(selected);
            }
        }

        function setupSummary() {
            $scope.question.slideOut = true;
            $scope.summary = practiceService.getSummary();
            $scope.summary.correctlyAnsweredRatio = $scope.summary.correct / $scope.summary.count;
            console.log($scope.summary);
            $scope.showSummary = true;
            $scope.imageController.clearHighlights();
            //$scope.imageController.showSummaryTooltips($scope.summary.flashcards);
            angular.forEach($scope.summary.flashcards, function(q) {
                var correct = q.description == q.answered_code;
                //$scope.imageController.showLayerContaining(q.description);
                $scope.imageController.highlightItem(q.description, correct ? colors.GOOD : colors.BAD, 1);
            });
            $("html, body").animate({ scrollTop: "0px" });
            //TODO fix this when answered_count available
            // events.emit('questionSetFinished', userService.getUser().answered_count);
        }

        function setQuestion(active) {
            console.log(active);
            $scope.initImage(angular.fromJson(active.context.content));
            if ($scope.question) {
                $scope.question.slideOut = true;
            }
            $scope.question = active;
            $scope.question.responseTime = - new Date().valueOf();
            $scope.questions.push(active);
            $scope.imageController.clearHighlights();
            $scope.highlight();
            $scope.canNext = false;

            $scope.imageController.onClick(function(code) {
                if ($filter('isFindOnMapType')($scope.question) &&
                    !$scope.canNext &&
                    $filter('isAllowedOption')($scope.question, code)) {

                    $scope.checkAnswer(code);
                    $scope.$apply();
                }
            });
        }

        function highlightOptions(selected) {
            $scope.question.options.map(function(o) {
                o.correct = o.description == $scope.question.description;
                o.selected = o.description == selected;
                o.disabled = true;
                return o;
            });
        }

        $scope.mapCallback = function() {
            practiceService.initSet('common');
            var filter = {};
            if ($routeParams.part) {
                filter.categories = [$routeParams.part];
            }
            if ($routeParams.place_type) {
                filter.types = [$routeParams.place_type];
            }
            flashcardService.getFlashcards(filter);
            practiceService.setFilter(filter);
            practiceService.getFlashcard().then(function(q) {
                $scope.questions = [];
                setQuestion(q);

            }, function(){
                $scope.error = true;
            });

        };
        $scope.mapCallback();
  }])

.controller('AppOverview', ['$scope', '$routeParams', 'categoryService', 'userStatsService',
    function($scope, $routeParams, categoryService, userStatsService) {
        'use strict';

        function getProgressRadius() {
          var radius =  $('.tile').width() / 2;
          return radius;
        }



        $scope.user = $routeParams.user || '';
        categoryService.getAll().then(function(categories){
            var categoriesByType = {};
            for (var i = 0; i < categories.length; i++) {
              if (!categoriesByType[categories[i].type]) {
                categoriesByType[categories[i].type] = [];
              }
              categoriesByType[categories[i].type].push(categories[i]);
            }
            $scope.bodyparts = categoriesByType.location;
            $scope.systems = categoriesByType.system;
            for (i = 0; i < categories.length; i++) {
              var cat = categories[i];
              var id = cat.identifier;
              userStatsService.addGroup(id, {});
              userStatsService.addGroupParams(id, [cat.identifier]);
            }

            userStatsService.getStatsPost().success(function(data) {
              $scope.progressRadius = getProgressRadius();
              processStats(data);
              userStatsService.getStatsPost(true).success(processStats);
            });

            function processStats(data) {
              $scope.userStats = data.data;
              angular.forEach(categories, function(map) {
                map.placeTypes = [];
                var key = map.identifier;
                map.stats = data.data[key];
              });
              $scope.statsLoaded = true;
            }
        }, function(){});
    }
])

.controller('AppConfused', ['$scope', '$http',
    function($scope, $http){
        'use strict';
        $http.get('/confused/').success(function(data){
            angular.forEach(data, function(p){
                p.wrongRatio = p.mistake_count / p.asked_count;
            });
            $scope.confused = data;
            $scope.loaded = true;
        }).error(function(){
            $scope.loaded = true;
            $scope.error = true;
        });
    }
])

.controller('AppUser', ['$scope', 'userService', '$routeParams', '$location',
    '$timeout', 'gettextCatalog',
    function($scope, userService, $routeParams, $location, $timeout, gettextCatalog) {

  $scope.profileUrl = $location.absUrl();
  if ($routeParams.user == userService.user.username) {
    $scope.user = userService.user;
    $scope.editRights = true;
    if ($routeParams.edit !== undefined && $scope.editRights) {
      $timeout(function() {
        $scope.editableForm.$show();
      },10);
    }
  } else {
    $scope.user = {username: $routeParams.user};
    userService.getUserProfile($routeParams.username, true).success(function(response){
      $scope.user = response.data;
    }).error(function() {
      $scope.error = gettextCatalog.getString("Hledaný profil neexistuje.");
      console.error($scope.error);
    });
  }

  $scope.saveUser = function() {
    // $scope.user already updated!
    return userService.updateProfile($scope.user).error(function(err) {
      if(err.field && err.msg) {
        // err like {field: "name", msg: "Server-side error for this username!"}
        $scope.editableForm.$setError(err.field, err.msg);
      } else {
        // unknown error
        $scope.editableForm.$setError('name', gettextCatalog.getString("V aplikaci bohužel nastala chyba."));
      }
    });
  };

}])


.controller('ReloadController', ['$window', function($window){
    'use strict';
    $window.location.reload();
}]);

