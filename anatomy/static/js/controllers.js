
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

.controller('AppView', ['$scope', '$routeParams', 'contextService', 'flashcardService', 'categoryService', 'userStatsService', '$location', 'imageService', 'colorScale',
    function($scope, $routeParams, contextService, flashcardService, categoryService, userStatsService, $location, imageService, colorScale) {
        'use strict';
      categoryService.getAll().then(function(){
        $scope.category = categoryService.getCategory($routeParams.category);
      });

      var filter = {
          categories : [$routeParams.category],
      };

      contextService.getContexts(filter).then(function(data) {
        $scope.contexts = data;

        userStatsService.clean();
        for (var i = 0; i < data.length; i++) {
          var context = data[i];
          var id = context.identifier;
          userStatsService.addGroup(id, {});
          userStatsService.addGroupParams(id, [$routeParams.category], [context.identifier]);
          if ($routeParams.context && $routeParams.context == id) {
            $scope.activateContext(context);
          }
        }

        userStatsService.getStatsPost().success(function(data) {
          resolveContexts(data);
          userStatsService.getStatsPost(true).success(resolveContexts);
        });

        function resolveContexts(data) {
          angular.forEach($scope.contexts, function(context) {
            context.placeTypes = [];
            var key = context.identifier;
            context.stats = data.data[key];
          });
          $scope.statsLoaded = true;
        }
      });

      if ($routeParams.user == 'average') {
        filter.new_user_predictions = true;
      }

      var catId = $routeParams.category;
      userStatsService.addGroup(catId, {});
      userStatsService.addGroupParams(catId, [$routeParams.category]);
      userStatsService.getStatsPost(true).success(function(data) {
        $scope.stats = data.data[catId];
      });

      $scope.activateContext = function(context) {
        $scope.activeContext = $scope.activeContext !== context ? context : undefined;
        //$location.search('context', context.identifier);
        if ($scope.activeContext) {
          var filter = {
            contexts : [context.identifier],
            stats : true,
          };
          flashcardService.getFlashcards(filter).then(function(data) {
            context.flashcards = data;
            contextService.getContext(context.id).then(function(fullContext) {
              $scope.activeContext.content = fullContext.content;
              imageService.setImage($scope.activeContext.content, function(ic) {
                  $scope.imageController = ic;
                  for (var i = 0; i < context.flashcards.length; i++) {
                    var fc = context.flashcards[i];
                    $scope.imageController.setColor(fc.description, colorScale(fc.prediction).hex());
                  }
                });
            });
          });
        }
      };
    }
])

.controller('AppPractice', ['$scope', '$routeParams', '$timeout', '$filter',
    'practiceService', 'userService', 'events', 'colors', 'flashcardService', 'imageService',

    function($scope, $routeParams, $timeout, $filter,
        practiceService, userService, events, colors, flashcardService, imageService) {
        'use strict';

        $scope.categoryId = $routeParams.category;
        $scope.progress = 0;

        $scope.highlight = function() {
            var active = $scope.question;
            if ($filter('isPickNameOfType')($scope.question)) {
                $scope.imageController.highlightItem(active.description, colors.NEUTRAL);
            }
            if ($filter('isFindOnMapType')($scope.question) && $scope.question.options) {
              for (var i = 0; i < $scope.question.options.length; i++) {
                $scope.question.options[i].color = colors.HIGHLIGHTS[i];
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
            practiceService.saveAnswerToCurrentFC(selectedFC && selectedFC.id, $scope.question.responseTime);
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

        $scope.highlightFlashcard = function(fc) {
          $scope.activeQuestion = fc;
        };

        function highlightAnswer (asked, selected) {
            if ($filter('isFindOnMapType')($scope.question)) {
                $scope.imageController.highlightItem(asked, colors.GOOD);
            }
            $scope.imageController.highlightItem(selected, asked == selected ? colors.GOOD : colors.BAD);
            highlightOptions(selected);
        }

        function setupSummary() {
            $scope.question.slideOut = true;
            $scope.summary = practiceService.getSummary();
            $scope.summary.correctlyAnsweredRatio = $scope.summary.correct / $scope.summary.count;
            console.log($scope.summary);
            $scope.showSummary = true;
            $("html, body").animate({ scrollTop: "0px" });
            //TODO fix this when answered_count available
            // events.emit('questionSetFinished', userService.getUser().answered_count);
        }

        function setQuestion(active) {
            console.log(active);
            if ($scope.question) {
                $scope.question.slideOut = true;
            }
            $scope.question = active;
            $scope.activeQuestion = active;
            $scope.question.responseTime = - new Date().valueOf();
            $scope.questions.push(active);
            active.context.content = angular.fromJson(active.context.content);

            imageService.setImage(active.context.content,
              function(ic) {
                $scope.imageController = ic;

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
              });
        }

        function highlightOptions(selected) {
            ($scope.question.options || []).map(function(o) {
                o.correct = o.description == $scope.question.description;
                o.selected = o.description == selected;
                if (o.selected || o.correct) {
                  o.color = undefined;
                }
                o.disabled = true;
                return o;
            });
        }

        $scope.mapCallback = function() {
            practiceService.initSet('common');
            var filter = {};
            if ($routeParams.categories) {
                filter.categories = $routeParams.categories;
            }
            if ($routeParams.category) {
                filter.categories = [$routeParams.category];
            }
            if ($routeParams.context) {
                filter.contexts = [$routeParams.context];
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

.controller('AppOverview', ['$scope', '$routeParams', 'categoryService', 'userStatsService', 'gettextCatalog',
    function($scope, $routeParams, categoryService, userStatsService, gettextCatalog) {
        'use strict';

        function getProgressRadius() {
          var radius =  $('.tile').width() / 2;
          return radius;
        }

        $scope.activateCatType = function(categoryType) {
          angular.forEach($scope.categoriesByType, function(ct) {
            ct.isActive = ct == categoryType;
          });
        };

        $scope.user = $routeParams.user || '';
        categoryService.getAll().then(function(categories){
            var categoriesByType = {};
            for (var i = 0; i < categories.length; i++) {
              if (!categoriesByType[categories[i].type]) {
                categoriesByType[categories[i].type] = [];
              }
              categoriesByType[categories[i].type].push(categories[i]);
            }
            $scope.categoriesByType = [{
              name: gettextCatalog.getString('Oragánové systémy'),
              categories : categoriesByType.system,
              isActive : true,
            }, {
              name: gettextCatalog.getString('Části těla'),
              categories : categoriesByType.location,
            }];
            $scope.systems = categoriesByType.system;
            userStatsService.addGroup('all', {});
            for (i = 0; i < categories.length; i++) {
              var cat = categories[i];
              var id = cat.identifier;
              userStatsService.addGroup(id, {});
              userStatsService.addGroupParams(id, [cat.identifier]);
            }

            userStatsService.getStatsPost(true).success(processStats);

            function processStats(data) {
              $scope.progressRadius = getProgressRadius();
              $scope.userStats = data.data;
              $scope.stats = {};
              angular.forEach(categories, function(map) {
                map.placeTypes = [];
                var key = map.identifier;
                map.stats = data.data[key];
              });
              $scope.stats = data.data.all;
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

