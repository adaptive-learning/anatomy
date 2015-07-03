
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

.controller('AppView', ['$scope', '$routeParams', '$filter', 'flashcardService', 'mapTitle', 'placeTypeService',
    function($scope, $routeParams, $filter, flashcardService, mapTitle, placeTypeService) {
        'use strict';
        $scope.part = $routeParams.part;
        var user = $routeParams.user || '';
        $scope.typeCategories = flashcardService.getCategories($scope.part);

        var filter = {
            contexts : [$routeParams.part],
        };
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
            var placeTypes = placeTypeService.getTypes();
            placeTypes = placeTypes.map(function(pt) {
                pt.places = data.filter(function(fc) {
                    return fc.term.type == pt.identifier;
                });
                return pt;
            }).filter(function(pt) {
                return pt.places.length;
            });
            updateItems(placeTypes);
        }, function(){
            $scope.error = true;
        });

        $scope.placeClick = function(place) {
            $scope.imageController.highlightItem(place.description);
        };

        $scope.updateMap = function(type) {
            type.hidden = !type.hidden;
            $scope.imageController.updateItems($scope.placesTypes);
        };

        $scope.updateCat = function(category) {
            var newHidden = !category.hidden;
            angular.forEach($scope.typeCategories, function(type) {
                type.hidden = true;
            });
            angular.forEach($scope.placesTypes, function(type) {
                type.hidden = true;
            });
            category.hidden = newHidden;
            updateItems($scope.placesTypes);
        };

        function updateItems(data) {
            $scope.placesTypes = data;
            angular.forEach($scope.typeCategories, function(category) {
                var filteredTypes = $filter('isTypeCategory')($scope.placesTypes, category);
                angular.forEach(filteredTypes, function(type) {
                    type.hidden = category.hidden;
                });
            });
            $scope.imageController.updateItems($scope.placesTypes);
            $scope.name = mapTitle($scope.part, user);
        }
    }
])

.controller('AppPractice', ['$scope', '$routeParams', '$timeout', '$filter',
    'practiceService', 'userService', 'events', 'colors', '$', 'highlighted',
    'categoryService', 'flashcardService',

    function($scope, $routeParams, $timeout, $filter,
        practiceService, userService, events, colors, $, highlighted,
        categoryService, flashcardService) {
        'use strict';

        $scope.part = $routeParams.part;
        $scope.placeType = $routeParams.place_type;
        $scope.progress = 0;

        $scope.highlight = function() {
            var active = $scope.question;
            //$scope.imageController.placeToFront(active.description);
            if ($filter('isPickNameOfType')($scope.question)) {
                $scope.imageController.highlightItem(active.description, colors.NEUTRAL);
            }
            if ($filter('isFindOnMapType')($scope.question) && active.options) {
                var codes = active.options.map(function(option) {
                    var code = option.description;
                    console.log(option);
                    $scope.imageController.highlightItem(code, colors.NEUTRAL);
                    return code;
                });
                highlighted.setHighlighted(codes);
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
                $scope.imageController.showLayerContaining(q.description);
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

.controller('AppOverview', ['$scope', '$routeParams', 'categoryService', 'userStatsService', 'placeTypeService',
    function($scope, $routeParams, categoryService, userStatsService, placeTypeService) {
        'use strict';

        // var mapSkills = {};
        function addNamesAndSort(categories) {
          var categoryNames = {
          };
          var categoriesByIdentifier = {};
          for (var i = 0; i < categories.length; i++) {
            categories[i].name = categoryNames[categories[i].identifier];
            categoriesByIdentifier[categories[i].identifier] = categories[i];
          }
          var categoryTypes = ['world', 'continent', 'state'];
          var ret = [];
          for (i = 0; i < categoryTypes.length; i++) {
            if (categoriesByIdentifier[categoryTypes[i]]) {
              ret.push(categoriesByIdentifier[categoryTypes[i]]);
            }
          }
          return ret;
        }

        $scope.user = $routeParams.user || '';
        categoryService.getAll().then(function(categories){
            $scope.mapCategories = addNamesAndSort(categories);
            var maps = [];
            for (var i = 0; i < categories.length; i++) {
              maps = maps.concat(categories[i].maps);
            }
            var placeTypes = placeTypeService.getTypes();
            for (i = 0; i < maps.length; i++) {
              var map = maps[i];
              for (var j = 0; j < placeTypes.length; j++) {
                var pt = placeTypes[j];
                var id = map.identifier + '-' + pt.identifier;
                userStatsService.addGroup(id, {});
                userStatsService.addGroupParams(id, undefined, [map.identifier], [pt.identifier]);
              }
            }

            userStatsService.getStatsPost().success(function(data) {
              processStats(data);
              userStatsService.getStatsPost(true).success(processStats);
            });

            function processStats(data) {
              $scope.userStats = data.data;
              angular.forEach(maps, function(map) {
                map.placeTypes = [];
                angular.forEach(angular.copy(placeTypes), function(pt) {
                  var key = map.identifier + '-' + pt.identifier;
                  pt.stats = data.data[key];
                  if (pt.stats && pt.stats.number_of_flashcards > 0) {
                    map.placeTypes.push(pt);
                  }
                });
              });
              $scope.statsLoaded = true;
            }
        }, function(){});

        $scope.mapSkills = function(map, type) {
            if (!$scope.statsLoaded) {
                return;
            }
            var defalut = {
                count : 0
            };
            if (!type) {
                return avgSkills(map);
            }
            return type.stats || defalut;
        };

        function avgSkills(map) {
            var avg = {};
            angular.forEach(map.placeTypes, function(pt) {
              for (var i in pt.stats) {
                if (!avg[i]) {
                  avg[i] = 0;
                }
                avg[i] += pt.stats[i];
              }
            });
            return avg;
        }
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
    }).error(function(response) {
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

