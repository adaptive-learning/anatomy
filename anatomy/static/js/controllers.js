
/* Controllers */
angular.module('proso.anatomy.controllers', [])

.controller('AppCtrl', ['$scope', '$rootScope', 'userService', 'pageTitle', 'configService', 'gettextCatalog', '$location', 'categoryService', 'termsLanguageService',
    function($scope, $rootScope, userService, pageTitle, configService, gettextCatalog, $location, categoryService, termsLanguageService) {
        'use strict';
        $scope.configService = configService;
        $rootScope.userService = userService;
        $rootScope.$location = $location;

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
            termsLanguageService.init(code);
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
          filter : [ $routeParams.category ? ['category/' + $routeParams.category] : []],
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
          userStatsService.addGroupParams(id, [filter.filter[0], ['context/' + id]]);
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
      userStatsService.addGroupParams(catId, filter.filter);
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
            filter : [ 
                ['context/' + context.identifier],
            ],
            stats : true,
            user : $routeParams.user,
          };
          if($routeParams.category) {
              filter.filter.push(['category/' + $routeParams.category]);
          }
          var activeContext = $scope.activeContext;
          contextService.getContext(context.id).then(function(fullContext) {
            if (activeContext != $scope.activeContext) {
              return;
            }
            $scope.activeContext.content = fullContext.content;
            $scope.activeContext.flashcards = fullContext.flashcards.map(function(fc) {
              fc.context = context;
              return fc;
            });
            if ($scope.activeContext.content.paths) {
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
            } else {
              flashcardService.getFlashcards(filter).then(function(data) {
                context.flashcards = data.map(function(fc) {
                  fc.context = context;
                  return fc;
                });
              });
            }
          });
        }
      };

      $scope.usePracticeDwopdown = function() {
        $cookies.practiceDropdownUsed = true;
      };
    }
])

.controller('AppPractice', ['$scope', '$routeParams', '$timeout', '$filter', '$rootScope',
    'practiceService', 'userService', 'imageService', 'termsLanguageService',
    'contextService',
    function($scope, $routeParams, $timeout, $filter, $rootScope,
        practiceService, userService, imageService, termsLanguageService,
        contextService) {
        'use strict';

        $scope.categoryId = $routeParams.category;
        $scope.category2Id = $routeParams.category2;
        $scope.progress = 0;

        var controller = {
          highlight : function() {
            $scope.imageController.highlightQuestion($scope.question);
          },
          getFlashcardByDescription : function(description) {
            if ($scope.question.context.flashcards) {
              //TODO fix this
              for (var i = 0; i < $scope.question.context.flashcards.length; i++) {
                var fc = $scope.question.context.flashcards[i];
                if (fc.description == description) {
                  return fc;
                }
              }
            }
          },
          checkAnswer : function(selected, keyboardUsed) {
              if ($scope.checking) {
                return;
              }
              var selectedFC;
              if (selected && (selected.description || selected.term_secondary)) {
                selectedFC = selected;
                selected = selected.description;
              }
              $scope.question.selectedFC = selectedFC;
              $scope.checking = true;
              var asked = $scope.question.description;
              $scope.question.isCorrect = (selected && $scope.question.description == selected) || $scope.question.id == (selectedFC && selectedFC.id);
              if ($scope.imageController) {
                $scope.imageController.highlightAnswer($scope.question, selected);
              }
              saveAnswer(selected, keyboardUsed, selectedFC);
              $scope.progress = 100 * (
                practiceService.getSummary().count /
                practiceService.getConfig().set_length);
              if ($scope.question.isCorrect) {
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
                  practiceService.getQuestion().then(function(q) {
                      $scope.loadingNextQuestion = false;
                      q.payload.question_type = q.question_type;
                      setQuestion(q.payload);
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


        function saveAnswer(selected, keyboardUsed, selectedFC) {
          $scope.question.answered_code = selected;
          $scope.question.answered_term_secondary = selectedFC && selectedFC.term_secondary;
          $scope.question.responseTime = new Date().valueOf() - $scope.question.startTime;
          var isCorrect = $scope.question == selected;
          if (!selectedFC) {
            selectedFC = isCorrect ?
              $scope.question :
              controller.getFlashcardByDescription(selected);
          }
          var meta;
          if (keyboardUsed) {
            meta = {keyboardUsed: keyboardUsed};
          }
          practiceService.saveAnswerToCurrentQuestion(
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

            if (active.context.content.paths) {
              imageService.setImage(active.context.content, setImageCallback);
            } else if (active.additional_info) {
              active.additional_info = angular.fromJson(active.additional_info);
              var contextId = active.additional_info.contexts[active.question_type];
              if (contextId) {
                contextService.getContextByIdentifier(contextId).then(function(context) {
                  context.content = angular.fromJson(context.content);
                  imageService.setImage(context.content, setImageCallback);
                });
              } else {
                imageService.setImage(undefined, function(){});
              }
            }

            function setImageCallback(ic) {
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
                var imageName = active.context.identifier + (
                  active.question_type == 'd2t' ? '--' + active.description : '');
                if (!active.options || active.options.length === 0) {
                  $rootScope.$emit('imageDisplayed', imageName);
                }
              }
        }

        function categoryToFilter(c) {
          return c.split('-').map(function(c) {
            return 'category/' + c;
          });
        }

        $scope.mapCallback = function() {
            practiceService.initSet('common');
            var filter = {
              filter: [],
            };
            if ($routeParams.category) {
              filter.filter.push(categoryToFilter($routeParams.category));
            }
            if ($routeParams.category2) {
              filter.filter.push(categoryToFilter($routeParams.category2));
            }
            if ($routeParams.context) {
                filter.filter.push(['context/' + $routeParams.context]);
            }
            filter.language = termsLanguageService.getTermsLang();
            practiceService.setFilter(filter);
            practiceService.getQuestion().then(function(q) {
                $scope.questions = [];
                q.payload.question_type = q.question_type;
                setQuestion(q.payload);

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
            userStatsService.addGroup('all', []);
            for (var i = 0; i < $scope.categories.length; i++) {
              var cat = $scope.categories[i];
              var id = cat.identifier;
              userStatsService.addGroup(id, {});
              userStatsService.addGroupParams(id, [['category/' + cat.identifier]]);

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
  $scope.isOwnProfile = $routeParams.user == userService.user.username;
  if ($scope.isOwnProfile) {
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

.controller('ShareController', ['$scope', '$modalInstance', 'loginModal', 'userService', 'gettextCatalog', '$analytics', '$location', '$window', 'data',
    function ($scope, $modalInstance, loginModal, userService, gettextCatalog, $analytics, $location, $window, data) {

    $scope.credentials = {};
    $scope.alerts = [];
    $scope.title = data.shareTitle;
    $scope.url = data.shareUrl;
    $scope.demoTitle = data.shareDemoTitle;

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
        var shareUrl = siteUrls[site] + data.shareUrl;
        $window.open(shareUrl, "_blank");
      } else {
        loginModal.open();
      }
    };

    $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
    };
}])

.controller('PremiumController', ['$scope', 'userService', 'subscriptionService', 'smoothScroll', '$routeParams',
    function($scope, userService, subscriptionService, smoothScroll, $routeParams){
  subscriptionService.getPlans($routeParams.discount_code).success(function(data) {
    $scope.plans = data.data;
  }).error(function(data, status) {
    if ($routeParams.discount_code && status == 404) {
      $scope.invalidCode = true;
    } else {
      $scope.error = true;
    }
  });

  $scope.userService = userService;
  $scope.discountCode = $routeParams.discount_code;

  $scope.buyPlan = function(plan) {
    subscriptionService.buyPlan(plan,
      $routeParams.discount_code,
      $routeParams.referral_username);
  };

  $scope.scrollToPlans = function() {
    var elem = document.getElementById('plans');
    smoothScroll(elem, {
      offset: 10,
      duration: 200,
    });
  };
}]);
