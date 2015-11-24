
/* Services */
angular.module('proso.anatomy.services', ['ngCookies'])

  .value('chroma', chroma)

  .value('$', jQuery)

  .value('colors', {
    'GOOD': '#5CA03C',
    'BAD': '#e23',
    'HIGHLIGHTS' : [
      '#f9b234',
      '#1d71b9',
      '#36a9e0',
      '#312883',
      '#fdea11',
      '#951b80',
    ],
  })

  .factory('colorScale', ['colors', 'chroma', function(colors, chroma) {
    var scale = chroma.scale([
        colors.BAD,
        '#f40',
        '#fa0',
        '#fe3',
        colors.GOOD
      ]);
    return scale;
  }])

  .factory('mapTitle', ['places', function(places) {
    'use strict';
    return function(part, user) {
      var name = places.getName(part);
      if (!name) {
        return;
      } else if (user === '' || user == 'average') {
        return name;
      } else {
        return name + ' - ' + user;
      }
    };
  }])

  .factory('events', function() {
    'use strict';
    var handlers = {};
    return {
      on : function(eventName, handler) {
        handlers[eventName] = handlers[eventName] || [];
        handlers[eventName].push(handler);
      },
      emit : function(eventName, args) {
        handlers[eventName] = handlers[eventName] || [];
        handlers[eventName].map(function(handler) {
          handler(args);
        });
      }
    };
  })

  .factory('pageTitle',['categoryService', 'gettextCatalog', function(categoryService, gettextCatalog) {
    'use strict';
    return function (route) {
      var titles = {
        'static/tpl/about.html' : gettextCatalog.getString('O prjektu') + ' - ',
        'static/tpl/overview_tpl.html' : gettextCatalog.getString('Přehled znalostí') + ' - ',
      };
      var title = "";
      if (route.controller == "AppView" || route.controller == "AppPractice") {
        var category = categoryService.getCategory(route.params.part);
        if (category) {
          title = category.name + ' - ';
        }
      } else if (route.controller == "AppUser") {
        title = route.params.user + ' - ';
      } else {
        title = titles[route.templateUrl] || '';
      }
      return title;
    };
  }])

  .factory('contextService', ["$http", "$q", "userStatsService",
      function ($http, $q, userStatsService) {
    'use strict';
    var that = {
      getContexts: function (filter) {
        filter = angular.extend(filter, {
          db_orderby : 'name',
          without_content : 'True',
          all : 'True',
        });
        var deferredContext = $q.defer();
        $http.get('/flashcards/contexts', {params: filter, cache: true}
        ).success(function(data) {
          userStatsService.clean();
          for (var i = 0; i < data.data.length; i++) {
            var context = data.data[i];
            var id = context.identifier;
            userStatsService.addGroup(id, {});
            userStatsService.addGroupParams(id, filter.categories, [id]);
          }
          var contexts = data.data;

          userStatsService.getFlashcardCounts().success(function(data) {
            for (var i = 0; i < contexts.length; i++) {
              var context = contexts[i];
              var id = context.identifier;
              var number_of_flashcards = data.data[id];
              context.stats = {
                'number_of_flashcards' : number_of_flashcards,
              };
            }
            contexts = contexts.filter(function(c) {
              return c.stats.number_of_flashcards > 0;
            });
            deferredContext.resolve(contexts);
          });
        }).error(function(error){
          console.error("Something went wrong while loading contexts from backend.");
          deferredContext.reject(error);
        });
        return deferredContext.promise;
      },
      getContext: function (id) {
        var deferredContext = $q.defer();
        $http.get('/flashcards/context/' + id, {cache: true}
        ).success(function(data) {
          if (data.data.content) {
            data.data.content = angular.fromJson(data.data.content);
          }
          deferredContext.resolve(data.data);
        }).error(function(error){
          console.error("Something went wrong while loading contexts from backend.");
          deferredContext.reject(error);
        });
        return deferredContext.promise;
      },
    };
    return that;
  }])

  .factory('categoryService', ["$http", "$q", "userStatsService", "$cookies",
      function ($http, $q, userStatsService, $cookies) {
    'use strict';
    var categories = [];
    var categoriesByIdentifier = {};
    var httpPromise;
    var deferredCategory = $q.defer();
    var categoriesByType = {};
    function init(){
      var filter = {
        all : 'True',
        db_orderby : 'identifier',
      };
      httpPromise = $http.get('/flashcards/categorys', {params: filter, cache: true}
      ).success(function(data) {
        categories = data.data;
        for (var i = 0; i < data.data.length; i++) {
          categoriesByIdentifier[data.data[i].identifier] = data.data[i];
          if (!categoriesByType[data.data[i].type]) {
            categoriesByType[data.data[i].type] = [];
          }
          categoriesByType[data.data[i].type].push(data.data[i]);
        }
        deferredCategory.resolve(angular.copy(categoriesByType));
      }).error(function(error){
        console.error("Something went wrong while loading categories from backend.");
        deferredCategory.reject(error);
      });
    }
    init();
    var that = {
      getCategory: function (identifier) {
        return categoriesByIdentifier[identifier];
      },
      getAllByType: function () {
        return deferredCategory.promise;
      },
      getSubcategories: function (identifier) {
        var category = categoriesByIdentifier[identifier];
        var subcategories;
        var filter = {
            categories : identifier ? [identifier] : [],
        };

        if (category.type == "system") {
          subcategories = angular.copy(categoriesByType.location);
        } else if (category.type == "location") {
          subcategories = angular.copy(categoriesByType.system);
        }
        userStatsService.clean();
        for (var i = 0; i < subcategories.length; i++) {
          var id = subcategories[i].identifier;
          userStatsService.addGroup(id, {});
          userStatsService.addGroupParams(id, [filter.categories, [id]]);
        }
        userStatsService.getFlashcardCounts().success(function(data) {
          for (var i = 0; i < subcategories.length; i++) {
            var subcategory = subcategories[i];
            var id = subcategory.identifier;
            var number_of_flashcards = data.data[id];
            subcategory.stats = {
              'number_of_flashcards' : number_of_flashcards,
            };
          }
          if (!$cookies.practiceDropdownUsed) {
            setTimeout(function() {
              angular.element('.practice-dropdown').click();
            }, 1);
          }
        });
        return subcategories;
      },
    };
    return that;
  }])

  .factory('flashcardService', ["$http", "$q",
      function ($http, $q) {
    'use strict';

    var that = {
      getFlashcards: function (filter) {
        var deferredFlashcards = $q.defer();
        for (var i in filter) {
          filter[i] = angular.toJson(filter[i]);
        }
        filter.all = 'True';
        filter.without_contexts = 'True';
        $http.get('/flashcards/flashcards', {
          params: filter
        }).success(function(data) {
          deferredFlashcards.resolve(data.data);
        }).error(function(data) {
          deferredFlashcards.reject(data);
        });
        return deferredFlashcards.promise;
      },
    };
    return that;
  }])

.service('colorService', function() {
  function lowerContrast(grayValue) {
    grayValue = grayValue - 128;
    grayValue = grayValue * 0.5;
    grayValue = grayValue + 128;
    return grayValue;
  }

  var that = {
    hexToRgb : function(c) {
      var red = parseInt(c.substr(1, 2), 16);
      var green = parseInt(c.substr(3, 2), 16);
      var blue = parseInt(c.substr(5, 2), 16);
      return [red, green, blue];
    },
    rgbToHex : function(rgb) {
      var ret = '#';
      for (var i = 0; i < rgb.length; i++) {
        ret += rgb[i].toString(16);
      }
      return ret;
    },
    isGray : function(c) {
      var rgb = that.hexToRgb(c);
      return Math.max(Math.abs(rgb[0] - rgb[1]), Math.abs(rgb[0] - rgb[2])) < 10;
    },
    toGrayScale : function(c) {
      if (that.isGray(c)) {
        return c;
      }
      var rgb = that.hexToRgb(c);
      var weights =  [0.299, 0.587, 0.114];
      var graySum = 0;
      for (var i = 0; i < rgb.length; i++) {
        graySum += 3.7 * rgb[i] * weights[i];
      }
      var grayAverage = Math.min(235, Math.round(lowerContrast(graySum / 3)));
      var grayAverageHex = grayAverage.toString(16);
      if (grayAverageHex == 'NaN') {
        return '#000000';
      }
      for (i = 0; i < rgb.length; i++) {
        rgb[i] = Math.floor((rgb[i] + grayAverage * 8) / 10);
      }
      return that.rgbToHex(rgb);
    },
  };
  return that;
})

.service('imageService', function() {
  var image;
  var callback;
  var callback2;

  return {
    setImage : function(i, fn) {
      if (callback) {
        fn(callback(i));
        callback = undefined;
      } else {
        image = i;
        callback2 = fn;
      }
    },
    getImage : function(fn) {
      if (image) {
        callback2(fn(image));
        image = undefined;
        callback2 = undefined;
      } else {
        callback = fn;
      }
    },
  };
})


  .factory('confirmModal', ["$modal", function ($modal) {
    'use strict';
    var ModalConfirmCtrl = ['$scope', '$modalInstance', 'question', 'confirm',
        function ($scope, $modalInstance, question, confirm) {
      $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
      };
      $scope.confirm = confirm;
      $scope.question = question;
    }];

    return {
      open : function(question, callback) {
        $modal.open({
          templateUrl: 'static/tpl/confirm_modal.html',
          controller: ModalConfirmCtrl,
          resolve: {
            confirm: function () {
              return  callback;
            },
            question: function () {
              return  question;
            },
          },
        });
      }
    };
  }])

  .factory('shareModal', ["$modal", function($modal) {
    return {
      open: function() {
        $modal.open({
          templateUrl: 'static/tpl/share-modal.html',
          controller: 'ShareController',
        });
      }
    };
  }]);
