
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
      filter.filter.push(['category/images']);

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
          userStatsService.addGroupParams(id, filter.filter.concat([['context/' + id]]));
          console.log(id, filter.filter.concat([['context/' + id]]));
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
            practiceService.initSet($routeParams.config || 'common');
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
            if (!userService.user.profile.subscribed && $scope.categoryId != 'relations') {
              filter.filter.push(['category/images']);
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

.controller('AppOverview', ['$scope', '$routeParams', 'categoryService', 'userStatsService', 'gettextCatalog', '$cookies', '$filter', '$location',
    function($scope, $routeParams, categoryService, userStatsService, gettextCatalog, $cookies, $filter, $location) {
        'use strict';

        function getProgressRadius() {
          var radius =  $('.tile').width() / 2;
          return radius;
        }
        var overviewType = $location.path().split('/')[1];
        var activeTypeCookieName = overviewType + 'activeType';
        var selectedCategoriesCookieName = overviewType + 'selectedCategoires';
        $scope.viewPath = overviewType == 'overview' ? 'view' : 'relations';
        $scope.practicePath = overviewType == 'overview' ? 'practice' : 'practice/relations';
        $scope.allCategory = overviewType == 'overview' ? 'images' : 'relations';
        $scope.defaultTab = overviewType == 'overview' ? 'system' : 'location';
        $scope.title = overviewType == 'overview' ?
          gettextCatalog.getString("Přehled znalostí") :
          gettextCatalog.getString("Souvislosti");

        $scope.activateCatType = function(categoryType) {
          angular.forEach($scope.categoriesByType, function(ct) {
            ct.isActive = ct == categoryType;
          });
          $cookies[activeTypeCookieName] = categoryType.categories[0] && categoryType.categories[0].type;
        };

        $scope.toggleSelectedCategories = function(selected) {
          angular.forEach($scope.categories, function(c) {
            c.selected = selected;
          });
          $scope.saveSelectedCategoriesToCookie();
        };

        $scope.saveSelectedCategoriesToCookie = function() {
          var selected = $filter('getSelectedIdentifiers')($scope.categories);
          $cookies[selectedCategoriesCookieName] = selected;
        };

        function isActive(categoryType) {
          if ($routeParams.tab && $routeParams.tab != $cookies[activeTypeCookieName]){
            $cookies[activeTypeCookieName] = $routeParams.tab;
          }
          return $cookies[activeTypeCookieName] == categoryType ||
            (categoryType == $scope.defaultTab && !$cookies[activeTypeCookieName]);
        }

        $scope.user = $routeParams.user || '';
        categoryService.getAllByType().then(function(categoriesByType){
            $scope.categories = categoriesByType.system.concat(
              categoriesByType.location).concat(categoriesByType.relation);
            $scope.categoriesByType = [ {
              name: gettextCatalog.getString('Části těla'),
              categories : categoriesByType.location,
              isActive : isActive('location'),
            }];
            if ($location.path().indexOf('relations') === -1) {
              $scope.categoriesByType.unshift({
                name: gettextCatalog.getString('Orgánové systémy'),
                categories : categoriesByType.system,
                isActive : isActive('system'),
              });
            } else {
              $scope.categoriesByType.push({
                name: gettextCatalog.getString('Souvislosti'),
                categories : categoriesByType.relation,
                isActive : isActive('relation'),
              });
            }
            userStatsService.clean();
            userStatsService.addGroup('all', []);
            userStatsService.addGroupParams('all', [['category/' + $scope.allCategory]]);
            for (var i = 0; i < $scope.categories.length; i++) {
              var cat = $scope.categories[i];
              var id = cat.identifier;
              userStatsService.addGroup(id, {});
              userStatsService.addGroupParams(id, [
                ['category/' + $scope.allCategory],
                ['category/' + cat.identifier]]);

              cat.selected = ($cookies[selectedCategoriesCookieName] + '').indexOf(id) != -1;
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

.controller('PremiumController', ['$scope', 'userService', 'subscriptionService', 'smoothScroll', '$routeParams', 'gettextCatalog',
    function($scope, userService, subscriptionService, smoothScroll, $routeParams, gettextCatalog){

  var errorMessages = {
    'discount_code_limit_exceeded' : gettextCatalog.getString(
      "Zadaný slevový kód byl již použit maximálním počtem uživatelů."),
    'discount_code_already_used' : gettextCatalog.getString(
      "Zadaný slevový kód nemůžež použít podruhé."),
  };

  subscriptionService.getPlans($routeParams.discount_code).success(function(data) {
    $scope.plans = data.data;
    loadDiscountCodeUsage();
  }).error(function(data, status) {
    if ($routeParams.discount_code && status == 404) {
      $scope.error = gettextCatalog.getString(
        "Byl zadán neplatný slevový kód '{{discountCode}}'.");
    } else if ($routeParams.discount_code && status == 400) {
      $scope.error = errorMessages[data.error_type];
    } else {
      $scope.error = true;
    }
  }).finally(scrollToPlans);


  function scrollToPlans() {
    if ($routeParams.discount_code) {
      var elem = document.getElementById("plans");
      smoothScroll(elem, {
        offset: 10,
        duration: 200,
      });
    }
  }

  function loadDiscountCodeUsage() {
    if ($routeParams.discount_code) {
      subscriptionService.getDiscountCode($routeParams.discount_code).success(function(data) {
        $scope.discountCodeUsage = data.data;
        $scope.discountCodeUsage.usage_left = Math.max(0, 
          $scope.discountCodeUsage.usage_limit - $scope.discountCodeUsage.usage);
      });
    }
  }
  $scope.userService = userService;
  $scope.discountCode = $routeParams.discount_code;

  $scope.buyPlan = function(plan) {
    subscriptionService.buyPlan(plan,
      $routeParams.discount_code,
      $routeParams.referral_username);
  };
}])

.controller('SettingsController', ['$scope', 'userService', 'configService', 'customConfigService', 'gettextCatalog',
    function($scope, userService, configService, customConfigService, gettextCatalog) {
  var keys = {
    targetDifficulty: "item_selector.parameters.target_probability",
    setLength: 'practice.common.set_length',
    allowOpenQuestions: "option_selector.parameters.allow_zero_options",
    allowWriting: "option_selector.parameters.allow_zero_options_restriction",
  };
  $scope.form = {
    targetDifficulty: configService.getConfig("proso_models", keys.targetDifficulty, 65),
    questionType: getQuestionType(),
    setLength: configService.getConfig("proso_models", keys.setLength, 10),
  };
  console.log($scope.form);
  $scope.user = userService.user;

  $scope.save = function() {
    $scope.message = gettextCatalog.getString('Ukládání změn...');
    $scope.messageType = 'info';

    customConfigService.setConfig({
      app_name: 'proso_models',
      key : keys.targetDifficulty,
      value: $scope.form.targetDifficulty,
    });

    customConfigService.setConfig({
      app_name: 'proso_models',
      key : keys.setLength,
      value: $scope.form.setLength,
    });

    customConfigService.setConfig({
      app_name: 'proso_models',
      key : keys.allowOpenQuestions,
      value: $scope.form.questionType != 'options-only',
    });

    customConfigService.setConfig({
      app_name: 'proso_models',
      key : keys.allowWriting,
      value: $scope.form.questionType == 'all',
    }).success(function () {
      $scope.message = gettextCatalog.getString('Nastavení bylo uloženo.');
      $scope.messageType = 'success';
    }).error(function () {
      $scope.message = gettextCatalog.getString('Ukládání nastavení selhalo.');
      $scope.messageType = 'danger';
    });
  };

  function getQuestionType() {
    var allowOpenQuestions = configService.getConfig("proso_models", keys.allowOpenQuestions);
    var allowWriting = configService.getConfig("proso_models", keys.allowWriting);
    if (allowOpenQuestions === false) {
      return 'options-only';
    } else if (allowWriting === true) {
      return 'no-write';
    } else {
      return 'all';
    }
  }
}])

.controller('RelationsController', ['$scope',  '$routeParams', 'categoryService', 'contextService', 'userStatsService', 'flashcardService',
    function($scope, $routeParams, categoryService, contextService, userStatsService, flashcardService) {
      $scope.user = $routeParams.user || '';
      var category = 'relations';
      var subcategory;

      var filter = {
          filter : [['category/' + category]],
      };

      if ($routeParams.category) {
          subcategory = $routeParams.category;
          filter.filter.push(['category/' + $routeParams.category]);
      }

      categoryService.getAllByType().then(function(){
        $scope.category = categoryService.getCategory(category);
        if (subcategory) {
          $scope.subcategory = categoryService.getCategory(subcategory);
        }

        $scope.subcategories = categoryService.getSubcategories(category);

        flashcardService.getFlashcards(
                angular.extend(filter, {with_contexts:true})).then(function(data) {
            $scope.flashcards = data;
            $scope.parseRelations();

            flashcardService.getFlashcards(
                angular.extend(filter, {stats:true})).then(function(data) {
              $scope.flashcards = data;
              $scope.flashcards.forEach(function(fc) {
                var originalFc = $scope.flashcardsById[fc.id];
                if (originalFc) {
                  originalFc.prediction = fc.prediction;
                  originalFc.practiced = fc.practiced;
                  originalFc.mastered = fc.mastered;
                }
              });
              makeRelationsStats();
            });
        });
      });

      function makeRelationsStats() {
        $scope.relations.forEach(function(relation) {
          var mastered = 0;
          var practiced = 0;
          var total = 0;
          for (var i = 0; i < $scope.subcategories.length; i++) {
            var c = $scope.subcategories[i].identifier;
            if (!relation[c]) {
              continue;
            }
            for (var j = 0; j < relation[c].length; j++) {
              mastered += relation[c][j].mastered;
              practiced += relation[c][j].practiced;
              total++;
            }
          }
          relation.stats = {
            number_of_practiced_items: practiced,
            number_of_mastered_items: mastered,
            number_of_items: total
          };
        });
      }

      $scope.parseRelations = function() {
        var relationsByMuscle = {};
        $scope.flashcardsById = {};
        $scope.flashcards.forEach(function(fc) {
          var relationsObj = relationsByMuscle[fc.term.identifier] || {};
          relationsObj.primaryTerm = fc.term;
          relationsObj[fc.context.identifier] = relationsObj[fc.context.identifier] || [];
          var fc_secondary = angular.copy(fc);
          fc_secondary.term = fc_secondary.term_secondary;
          relationsObj[fc.context.identifier].push(fc_secondary);
          relationsByMuscle[fc.term.identifier] = relationsObj;
          $scope.flashcardsById[fc_secondary.id] = fc_secondary;
        });
        $scope.relations = [];
        for (var i in relationsByMuscle) {
          $scope.relations.push(relationsByMuscle[i]);
        }
        $scope.relations = $scope.relations.sort(function(a, b) {
          return a.primaryTerm.name < b.primaryTerm.name ? -1 : 1;
        });
      };

      $scope.activateRelation = function(relation) {
        if ($scope.user) {
          return;
        }
        $scope.activeRelation = $scope.activeRelation !== relation ? relation : undefined;
      };

      var catId = category;
      userStatsService.clean();
      userStatsService.addGroup(catId, {});
      userStatsService.addGroupParams(catId, filter.filter);
      userStatsService.getStatsPost(true, $scope.user).success(function(data) {
        $scope.stats = data.data[catId];
      });

      $scope.rowsLimit = 30;
      $scope.addRows = function() {
        if ($scope.relations && $scope.rowsLimit < $scope.relations.length) {
          $scope.rowsLimit += 30;
        }
      };
}]);
