
/* Services */
angular.module('proso.anatomy.services', ['ngCookies'])

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

    var titles = {
      'static/tpl/about.html' : gettextCatalog.getString('O prjektu') + ' - ',
      'static/tpl/overview_tpl.html' : gettextCatalog.getString('Přehled znalostí') + ' - ',
    };
    return function (route) {
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

  .factory('contextService', ["$http", "$q", function ($http, $q) {
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
          deferredContext.resolve(data.data);
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

  .factory('categoryService', ["$http", "$q", function ($http, $q) {
    'use strict';
    var categories = [];
    var categoriesByIdentifier = {};
    var httpPromise;
    var deferredCategory = $q.defer();
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
        }
        deferredCategory.resolve(data.data);
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
      getAll: function () {
        return deferredCategory.promise;
      },
    };
    return that;
  }])

  .factory('flashcardService', ["$http", "$q",
      function ($http, $q) {
    'use strict';
    var flashcardCache = {};

    function updateFlashcardCache(flashcards) {
      for (var i = 0; i < flashcards.length; i++) {
        var fc = flashcards[i];
        flashcardCache[fc.description] = fc;
      }
    }

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
          updateFlashcardCache(data.data);
        }).error(function(data) {
          deferredFlashcards.reject(data);
        });
        return deferredFlashcards.promise;
      },
      getFlashcardByDescription : function (description) {
        return flashcardCache[description];
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
      return '#' + grayAverageHex + grayAverageHex + grayAverageHex;
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
  }]);
