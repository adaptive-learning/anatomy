
/* Controllers */
angular.module('proso.anatomy.controllers', [])

.controller('AppCtrl', ['$scope', '$rootScope', 'userService', 'pageTitle', 'configService', 'gettextCatalog', '$location', 'categoryService',
    function($scope, $rootScope, userService, pageTitle, configService, gettextCatalog, $location, categoryService) {
        'use strict';
        $scope.configService = configService;
        $scope.userService = userService;

        $rootScope.initTitle = function (title) {
            $rootScope.initialTitle = title;
            $rootScope.title = title;
        };

        $rootScope.$on("$routeChangeStart", function(event, next) {
          categoryService.getAllByType().then(function(){
            $rootScope.title = pageTitle(next, $rootScope.initialTitle);
          });
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

        $scope.setStats = function(stats) {
            $rootScope.stats = stats;
        };

        $scope.logout = function() {
            $rootScope.user = userService.logout();
        };

}])

.controller('AppView', ['$scope', '$routeParams', 'contextService', 'flashcardService', 'categoryService', 'userStatsService', 'imageService', 'colorScale', '$cookies', 'smoothScroll', '$location', '$rootScope',
    function($scope, $routeParams, contextService, flashcardService, categoryService, userStatsService, imageService, colorScale,  $cookies, smoothScroll, $location, $rootScope) {
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
        if ($scope.user) {
          return;
        }
        $scope.activeContext = $scope.activeContext !== context ? context : undefined;
        $location.update_path('/view/' + $routeParams.category +
          ($scope.activeContext ? '/image/' + $scope.activeContext.identifier : ''));
        var contextName = $scope.activeContext ? context.name + ' - ' : '';
        setTimeout(function() {
          $rootScope.title = contextName + $rootScope.title;
        }, 10);
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
            user : $routeParams.user,
          };
          var activeContext = $scope.activeContext;
          contextService.getContext(context.id).then(function(fullContext) {
            if (activeContext != $scope.activeContext) {
              return;
            }
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
    'practiceService', 'userService', 'imageService',
    function($scope, $routeParams, $timeout, $filter, $rootScope,
        practiceService, userService, imageService) {
        'use strict';

        $scope.categoryId = $routeParams.category;
        $scope.category2Id = $routeParams.category2;
        $scope.progress = 0;

        var controller = {
          highlight : function() {
            $scope.imageController.highlightQuestion($scope.question);
          },
          getFlashcardByDescription : function(description) {
            for (var i = 0; i < $scope.question.context.flashcards.length; i++) {
              var fc = $scope.question.context.flashcards[i];
              if (fc.description == description) {
                return fc;
              }
            }
          },
          checkAnswer : function(selected, keyboardUsed) {
              if ($scope.checking) {
                return;
              }
              $scope.checking = true;
              var asked = $scope.question.description;
              $scope.imageController.highlightAnswer($scope.question, selected);
              saveAnswer(selected, keyboardUsed);
              $scope.progress = 100 * (
                practiceService.getSummary().count /
                practiceService.getConfig().set_length);
              var isCorrect = asked == selected;
              if (isCorrect) {
                  $timeout(function() {
                      controller.next(function() {
                        $scope.checking = false;
                      });
                  }, 700);
              } else {
                  $scope.checking = false;
                  $scope.canNext = true;
              }
              addAnswerToUser(asked == selected);
              $rootScope.$emit('questionAnswered');
          },
          next : function(callback) {
              if ($scope.progress < 100) {
                  $scope.loadingNextQuestion = true;
                  practiceService.getFlashcard().then(function(q) {
                      $scope.loadingNextQuestion = false;
                      setQuestion(q);
                      if (callback) callback();
                  }, function(){
                      $scope.loadingNextQuestion = false;
                      $scope.error = true;
                  });
              } else {
                  setupSummary();
                  if (callback) callback();
              }
          },
          highlightFlashcard : function(fc) {
            $scope.activeQuestion = fc;
          },
        };
        $scope.controller = controller;


        function saveAnswer(selected, keyboardUsed) {
          $scope.question.answered_code = selected;
          $scope.question.responseTime = new Date().valueOf() - $scope.question.startTime;
          var isCorrect = $scope.question == selected;
          var selectedFC = isCorrect ?
            $scope.question :
            controller.getFlashcardByDescription(selected);
          var meta;
          if (keyboardUsed) {
            meta = {keyboardUsed: keyboardUsed};
          }
          practiceService.saveAnswerToCurrentFC(
            selectedFC && selectedFC.id, $scope.question.responseTime, meta);
        }

        function addAnswerToUser(isCorrect) {
          if (userService.user.profile) {
            userService.user.profile.number_of_answers++;
            if (isCorrect) {
              userService.user.profile.number_of_correct_answers++;
            }
          }
        }

        function setupSummary() {
            $scope.question.slideOut = true;
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
            $scope.question.startTime = new Date().valueOf();
            $scope.questions.push(active);
            active.context.content = angular.fromJson(active.context.content);

            imageService.setImage(active.context.content,
              function(ic) {
                $scope.imageController = ic;

                $scope.imageController.clearHighlights();
                controller.highlight();
                $scope.canNext = false;

                $scope.imageController.onClick(function(code) {
                    if ($filter('isFindOnMapType')($scope.question) &&
                        !$scope.canNext &&
                        $filter('isAllowedOption')($scope.question, code)) {

                        controller.checkAnswer(code);
                        $scope.$apply();
                    }
                });
              });
        }

        $scope.mapCallback = function() {
            practiceService.initSet('common');
            var filter = {};
            if ($routeParams.category2) {
              filter.categories = $routeParams.category2.split('-');
            }
            if ($routeParams.category) {
              filter.categories = $routeParams.category.split('-');
              if ($routeParams.category2) {
                filter.categories = [$routeParams.category.split('-'), $routeParams.category2.split('-')];
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

.controller('AppOverview', ['$scope', '$routeParams', 'categoryService', 'userStatsService', 'gettextCatalog', '$cookies', '$filter',
    function($scope, $routeParams, categoryService, userStatsService, gettextCatalog, $cookies, $filter) {
        'use strict';

        function getProgressRadius() {
          var radius =  $('.tile').width() / 2;
          return radius;
        }

        $scope.activateCatType = function(categoryType) {
          angular.forEach($scope.categoriesByType, function(ct) {
            ct.isActive = ct == categoryType;
          });
          $cookies.activeType = categoryType.categories[0] && categoryType.categories[0].type;
        };

        $scope.toggleSelectedCategories = function(selected) {
          angular.forEach($scope.categories, function(c) {
            c.selected = selected;
          });
          $scope.saveSelectedCategoriesToCookie();
        };

        $scope.saveSelectedCategoriesToCookie = function() {
          var selected = $filter('getSelectedIdentifiers')($scope.categories);
          $cookies.selectedCategoires = selected;
        };

        function isActive(categoryType) {
          if ($routeParams.tab && $routeParams.tab != $cookies.activeType){
            $cookies.activeType = $routeParams.tab;
          }
          return $cookies.activeType == categoryType ||
          (categoryType =='system' && !$cookies.activeType);
        }

        $scope.user = $routeParams.user || '';
        categoryService.getAllByType().then(function(categoriesByType){
            $scope.categories = categoriesByType.system.concat(categoriesByType.location);
            $scope.categoriesByType = [{
              name: gettextCatalog.getString('Orgánové systémy'),
              categories : categoriesByType.system,
              isActive : isActive('system'),
            }, {
              name: gettextCatalog.getString('Části těla'),
              categories : categoriesByType.location,
              isActive : isActive('location'),
            }];
            userStatsService.clean();
            userStatsService.addGroup('all', {});
            for (var i = 0; i < $scope.categories.length; i++) {
              var cat = $scope.categories[i];
              var id = cat.identifier;
              userStatsService.addGroup(id, {});
              userStatsService.addGroupParams(id, [cat.identifier]);

              cat.selected = ($cookies.selectedCategoires + '').indexOf(id) != -1;
            }

            userStatsService.getStatsPost(true, $scope.user).success(processStats);

            function processStats(data) {
              $scope.progressRadius = getProgressRadius();
              $scope.userStats = data.data;
              $scope.stats = {};
              angular.forEach($scope.categories, function(map) {
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
}])

.controller('ShareController', ['$scope', '$modalInstance', 'loginModal', 'userService', 'gettextCatalog', '$analytics', '$location', '$window',
    function ($scope, $modalInstance, loginModal, userService, gettextCatalog, $analytics, $location, $window) {

    $scope.credentials = {};
    $scope.alerts = [];

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };

    $scope.openSharePage = function(site) {
      var siteUrls = {
        facebook : "https://www.facebook.com/sharer/sharer.php?u=",
        twitter : "http://twitter.com/home?status=",
        google : "https://plus.google.com/share?url=",
        demo : "",
      };
      if (userService.user.username) {
        var shareUrl = siteUrls[site] + $location.absUrl() + userService.user.username;
        $window.open(shareUrl, "_blank");
      } else {
        loginModal.open();
      }
    };

    $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
    };
  }]);
