
/* Controllers */
angular.module('proso.anatomy.controllers', [])

.controller('AppCtrl', ['$scope', '$rootScope', 'userService', 'pageTitle', 'configService', 'gettextCatalog', '$location',
    function($scope, $rootScope, userService, pageTitle, configService, gettextCatalog, $location) {
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
        if ($location.search().sessionid) {
          userService.loadUser();
          $location.search('sessionid', undefined);
        } else {
          $scope.initUser = function (data) {
              userService.processUser(data);
          };
        }

        $scope.logout = function() {
            $rootScope.user = userService.logout();
        };

}])

.controller('AppView', ['$scope', '$routeParams', 'contextService', 'flashcardService', 'categoryService', 'userStatsService', 'imageService', 'colorScale', '$cookies', 'smoothScroll',
    function($scope, $routeParams, contextService, flashcardService, categoryService, userStatsService, imageService, colorScale,  $cookies, smoothScroll) {
        'use strict';
      $scope.user = $routeParams.user || '';

      var filter = {
          categories : $routeParams.category ? [$routeParams.category] : [],
      };

      categoryService.getAllByType().then(function(){
        $scope.category = categoryService.getCategory($routeParams.category);
        $scope.subcategories = categoryService.getSubcategories($routeParams.category);
      });

      contextService.getContexts(filter).then(function(data) {
        $scope.contexts = data;
        $scope.countsLoaded = true;

        userStatsService.clean();
        for (var i = 0; i < data.length; i++) {
          var context = data[i];
          var id = context.identifier;
          userStatsService.addGroup(id, {});
          userStatsService.addGroupParams(id, filter.categories, [id]);
        }
        userStatsService.getStatsPost(true, $scope.user).success(function(data) {
          angular.forEach($scope.contexts, function(context) {
            context.placeTypes = [];
            var id = context.identifier;
            context.stats = data.data[id];
            if ($routeParams.context && $routeParams.context == id) {
              $scope.activateContext(context);
            }
          });
        });
      });

      if ($routeParams.user == 'average') {
        filter.new_user_predictions = true;
      }

      var catId = $routeParams.category;
      userStatsService.clean();
      userStatsService.addGroup(catId, {});
      userStatsService.addGroupParams(catId, filter.categories);
      userStatsService.getStatsPost(true, $scope.user).success(function(data) {
        $scope.stats = data.data[catId];
      });

      $scope.activateContext = function(context) {
        $scope.activeContext = $scope.activeContext !== context ? context : undefined;
        if ($scope.activeContext) {
          setTimeout(function() {
            var elem = document.getElementById(context.identifier);
            smoothScroll(elem, {
              offset: 10,
              duration: 200,
            });
          }, 400);
          var filter = {
            contexts : [context.identifier],
            categories : $routeParams.category ? [$routeParams.category] : [],
            stats : true,
          };
          contextService.getContext(context.id).then(function(fullContext) {
            $scope.activeContext.content = fullContext.content;
            $scope.activeContext.flashcards = fullContext.flashcards;
            imageService.setImage($scope.activeContext.content, function(ic) {
              $scope.imageController = ic;
              flashcardService.getFlashcards(filter).then(function(data) {
                context.flashcards = data;
                for (var i = 0; i < context.flashcards.length; i++) {
                  var fc = context.flashcards[i];
                  $scope.imageController.setColor(fc.description, colorScale(fc.prediction).hex());
                }
              });
            });
          });
        }
      };

      $scope.usePracticeDwopdown = function() {
        $cookies.practiceDropdownUsed = true;
      };
    }
])

.controller('AppPractice', ['$scope', '$routeParams', '$timeout', '$filter', '$rootScope',
    'practiceService', 'userService', 'colors', 'imageService', 'serverLogger',

    function($scope, $routeParams, $timeout, $filter, $rootScope,
        practiceService, userService, colors, imageService, serverLogger) {
        'use strict';

        $scope.categoryId = $routeParams.category;
        $scope.category2Id = $routeParams.category2;
        $scope.progress = 0;

        $scope.highlight = function() {
            var active = $scope.question;
            if ($filter('isPickNameOfType')($scope.question)) {
                $scope.imageController.highlightItem(
                  active.description, colors.HIGHLIGHTS[1], true);
            }
            if ($filter('isFindOnMapType')($scope.question) && $scope.question.options) {
              for (var i = 0; i < $scope.question.options.length; i++) {
                $scope.question.options[i].color = colors.HIGHLIGHTS[i];
                $scope.imageController.highlightItem(
                  $scope.question.options[i].description,
                  colors.HIGHLIGHTS[i]);
              }
            }
        };

        $scope.checkAnswer = function(selected) {
            if ($scope.checking) {
              return;
            }
            $scope.checking = true;
            var asked = $scope.question.description;
            var isCorrect = asked == selected;
            highlightAnswer(asked, selected);
            $scope.question.answered_code = selected;
            $scope.question.responseTime += new Date().valueOf();
            var selectedFC = isCorrect ?
              $scope.question :
              $scope.getFlashcardByDescription(selected);
            practiceService.saveAnswerToCurrentFC(
              selectedFC && selectedFC.id, $scope.question.responseTime);
            $scope.progress = 100 * (
              practiceService.getSummary().count /
              practiceService.getConfig().set_length);
            if (isCorrect) {
                $timeout(function() {
                    $scope.next(function() {
                      $scope.checking = false;
                    });
                }, 700);
            } else {
                $scope.checking = false;
                $scope.canNext = true;
            }
            checkOptions();
        };

        $scope.next = function(callback) {
            if ($scope.progress < 100) {
                practiceService.getFlashcard().then(function(q) {
                    setQuestion(q);
                    if (callback) callback();
                }, function(){
                    $scope.error = true;
                });
            } else {
                setupSummary();
                if (callback) callback();
            }
        };

        $scope.highlightFlashcard = function(fc) {
          $scope.activeQuestion = fc;
        };

        $scope.getFlashcardByDescription = function(description) {
          for (var i = 0; i < $scope.activeQuestion.context.flashcards.length; i++) {
            var fc = $scope.activeQuestion.context.flashcards[i];
            if (fc.description == description) {
              return fc;
            }
          }
        };

        function checkOptions() {
          var buttonCount = angular.element('.inner-practice:not(.slide-out) .btn-option').length;
          var optionCount = $scope.activeQuestion.options ? $scope.activeQuestion.options.length : 0;
          if (buttonCount != optionCount) {
            serverLogger.error("Option count doesn't math button count", {
              buttonCount : buttonCount,
              optionCount : optionCount,
              question : $scope.activeQuestion,
            });
          }
        }

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
            angular.element("html, body").animate({ scrollTop: "0px" }, function() {
              angular.element(window).trigger('resize');
            });
            $rootScope.$emit('questionSetFinished');
        }

        function setQuestion(active) {
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
              if ($routeParams.category2) {
                filter.categories = [[$routeParams.category], [$routeParams.category2]];
              }
            }
            if ($routeParams.context) {
                filter.contexts = [$routeParams.context];
            }
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

.controller('AppOverview', ['$scope', '$routeParams', 'categoryService', 'userStatsService', 'gettextCatalog', '$cookies',
    function($scope, $routeParams, categoryService, userStatsService, gettextCatalog, $cookies) {
        'use strict';

        function getProgressRadius() {
          var radius =  $('.tile').width() / 2;
          return radius;
        }

        $scope.activateCatType = function(categoryType) {
          angular.forEach($scope.categoriesByType, function(ct) {
            ct.isActive = ct == categoryType;
          });
          $cookies.activeType = categoryType.categories[0].type;
        };

        $scope.user = $routeParams.user || '';
        categoryService.getAllByType().then(function(categoriesByType){
            var categories = categoriesByType.system.concat(categoriesByType.location);
            $scope.categoriesByType = [{
              name: gettextCatalog.getString('Orgánové systémy'),
              categories : categoriesByType.system,
              isActive : $cookies.activeType == 'system' || ! $cookies.activeType,
            }, {
              name: gettextCatalog.getString('Části těla'),
              categories : categoriesByType.location,
              isActive : $cookies.activeType == 'location',
            }];
            userStatsService.clean();
            userStatsService.addGroup('all', {});
            for (var i = 0; i < categories.length; i++) {
              var cat = categories[i];
              var id = cat.identifier;
              userStatsService.addGroup(id, {});
              userStatsService.addGroupParams(id, [cat.identifier]);
            }

            userStatsService.getStatsPost(true, $scope.user).success(processStats);

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

