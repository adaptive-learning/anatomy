
/* Services */
angular.module('proso.anatomy.services', ['ngCookies'])

  .factory('places', ['$http', 'gettext', function($http, gettext) {
    'use strict';
    var cache = {};
    var mapCache = {};
    var categoriesCache = {};
    var names = {
        'us' : gettext('USA'),
        'world' : gettext('Svět')
      };
    var categories = [
      {
        slug :'political',
        name : gettext('Politická mapa'),
        types : [
          'state',
          'region',
          'province',
          'region_cz',
          'region_it',
          'autonomous_Comunity',
          'bundesland',
          'city',
        ]
      },{
        slug : 'water',
        name : gettext('Vodstvo'),
        types : ['river', 'lake'],
        hidden:true
      },{
        slug : 'surface',
        name : gettext('Povrch'),
        types : ['mountains', 'island'],
        hidden:true
      }
    ];
    var placeTypeNames = {};

    function addOneToNames(code, name) {
      if (!names[code]) {
        names[code] = name;
      }
    }

    function addToNames(code, placesTypes) {
      angular.forEach(placesTypes, function(type) {
        angular.forEach(type.places, function(place) {
          addOneToNames(place.code, place.name);
        });
      });
    }

    var that = {
      get : function(part, user, fn) {
        var url = '/usersplaces/' + part + '/' + user;
        var promise = $http.get(url, {cache: user == 'average'}).success(function(data) {
          var placesTypes = data.placesTypes;
          cache[url] = placesTypes;
          fn(placesTypes);
        });
        return promise;
      },
      setName : function(code, name) {
        names[code] = names[code] || name;
      },
      getName : function(code) {
        return names[code];
      },
      getCategories : function(part) {
        if (!categoriesCache[part]) {
          categoriesCache[part] = angular.copy(categories);
        }
        var allHidden = 0 === categoriesCache[part].filter(function(c){
          return !c.hidden;
        }).length;
        if (allHidden) {
          categoriesCache[part][0].hidden = false;
        }
        return categoriesCache[part];
      },
      _setActiveCategory : function (part, active) {
        that.getCategories(part, active);
        angular.forEach(categoriesCache[part], function(cat) {
          cat.hidden = cat.slug != active &&
            0 === cat.types.filter(function(t){
              return t == active;
            }).length;
        });
      },
      practicing : function (part, type) {
        that._setActiveCategory(part, type);
        // To fetch names of all places on map and be able to show name of wrongly answered place
        var process = function(placesTypes){
          addToNames(part, placesTypes);
        };
        var url = '/usersplaces/' + part + '/';
        if (cache[url]) {
          process(cache[url]);
        } else {
          that.get(part, '', process);
        }
      },
      getOverview : function () {
        return $http.get('/placesoverview/', {cache: true});
      },
      getMapLayers : function(map) {
        return mapCache[map].placesTypes.map(function(l){
          return l.slug;
        });
      },
      getMapLayerCount : function(map, layer) {
        if (!mapCache[map]) {
          return 0;
        }
        return mapCache[map].placesTypes.filter(function(l){
          return l.slug == layer;
        }).map(function(l){
          return l.count;
        })[0];
      },
      setPlaceTypeNames : function (obj) {
        placeTypeNames = obj;
      },
      getPlaceTypeName : function (slug) {
        return placeTypeNames[slug];
      },
    };
    /*
    that.getOverview().success(function(data){
      angular.forEach(data, function(category){
        angular.forEach(category.maps, function(map){
          mapCache[map.slug] = map;
        });
      });
    });
    */
    return that;
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

  .service('question', ['$http', '$log', '$cookies', '$analytics', 'params',
      function($http, $log, $cookies, $analytics, params) {
    'use strict';
    var qIndex = 0;
    var url;
    $http.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

    function returnQuestion(fn) {
      var q = questions[qIndex++];
      if (q)
        q.response_time = -new Date().valueOf();
      fn(q);
    }
    function hasNoTwoSameInARow(array) {
      for (var i = 0, j = array.length; i + 1 < j; i++) {
        if (array[i].asked_code == array[i + 1].asked_code) {
          return false;
        }
      }
      return true;
    }
    var questions = [];
    var summary = [];
    return {
      first : function(part, placeType, fn) {
        url = '/question/' + part + '/' + (placeType ? placeType : '') +
          params.queryString().replace('&', '?');
        $analytics.eventTrack('started', {
          category: 'practice',
          label: url,
        });
        summary = [];
        var promise = $http.get(url).success(function(data) {
          qIndex = 0;
          questions = data.questions;
          returnQuestion(fn);
        });
        return promise;
      },
      next : function(part, placeType, fn) {
        returnQuestion(fn);
      },
      answer : function(question) {
        question.response_time += new Date().valueOf();
        question.index = qIndex - 1;
        summary.push(question);
        $http.defaults.headers.post['X-CSRFToken'] = $cookies.csrftoken;
        $http.post(url, question).success(function(data) {
          var futureLength = qIndex + data.questions.length;
          // questions array should be always the same size
          // if data sent by server is longer, it means the server is delayed
          if (questions.length == futureLength) {
            // try to handle interleaving
            var questionsCandidate = questions.slice(0, qIndex).concat(data.questions);
            if (hasNoTwoSameInARow(questionsCandidate)) {
              questions = questionsCandidate;
              $log.log('questions updated, question index', qIndex);
            }
          }
          /*
          if (data.goals) {
            goal.update(data.goals);
          }
          */
        });
        return 100 * qIndex / questions.length;
      },
      summary : function() {
        $analytics.eventTrack('finished', {
          category: 'practice',
          label: url,
        });
        var correctlyAnswered = summary.filter(function(q) {
            return q.asked_code == q.answered_code;
          });
        return {
          correctlyAnsweredRatio : correctlyAnswered.length / summary.length,
          questions : summary
        };
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

  .factory('pageTitle',['places', 'gettext', function(places, gettext) {
    'use strict';

    var titles = {
      'static/tpl/about.html' : gettext('O prjektu') + ' - ',
      'static/tpl/overview_tpl.html' : gettext('Přehled map') + ' - ',
    };
    return function (route) {
      var title;
      if (route.controller == "AppView" || route.controller == "AppPractice") {
        title = places.getName(route.params.part) + ' - ';
        var typeName = places.getPlaceTypeName(route.params.place_type);
        if (typeName) {
          title += typeName + ' - ';
        }
      } else if (route.controller == "AppUser") {
        title = route.params.user + ' - ';
      } else {
        title = titles[route.templateUrl] || '';
      }
      return title;
    };
  }])

  .factory('params', ["$routeParams", "$location",
      function ($routeParams, $location) {
    'use strict';
    var keys = ['limit'];
    var params = {};
    var that =  {
      get: function (key) {
        if (params[key] && ! $routeParams[key]) {
          $location.search(key, params[key]);
        }
        if ($routeParams[key]) {
          params[key] = $routeParams[key];
        }
        return params[key];
      },
      all : function() {
        for (var i = 0; i < keys.length; i++) {
          that.get(keys[i]);
        }
        return params;
      },
      queryString : function() {
        that.all();
        var string = keys.map(function(key) {
          return that.get(key) ? '&' + key + '=' + that.get(key) : '';
        }).join('');
        return string;
      }
    };
    return that;
  }])

  .factory('categoryService', ["$http", "$q", "gettext", function ($http, $q, gettext) {
    'use strict';
    var categories = [];
    var categoriesByIdentifier = {};
    var httpPromise;
    var deferredCategory = $q.defer();
    function init(){
      var filter = {
        all : 'True',
        db_orderby : 'name',
      };
      httpPromise = $http.get('/flashcards/categorys', {params: filter}).success(function(data) {
        categories = data.data;
        var categoriesByType = {};
        for (var i = 0; i < data.data.length; i++) {
          categoriesByIdentifier[data.data[i].identifier] = data.data[i];
          if (!categoriesByType[data.data[i].type]) {
            categoriesByType[data.data[i].type] = [];
          }
          categoriesByType[data.data[i].type].push(data.data[i]);
        }
        var allCategories = [];
        for (i in categoriesByType) {
          allCategories.push({
            maps: categoriesByType[i],
            identifier: i,
          });
        }
        deferredCategory.resolve(allCategories);
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
    var categoriesCache = {};
    var categories = [
      {
        slug :'political',
        name : gettext('Politická mapa'),
        types : [
          'state',
          'region',
          'province',
          'region_cz',
          'region_it',
          'autonomous_Comunity',
          'bundesland',
          'city',
        ]
      },{
        slug : 'water',
        name : gettext('Vodstvo'),
        types : ['river', 'lake'],
        hidden:true
      },{
        slug : 'surface',
        name : gettext('Povrch'),
        types : ['mountains', 'island'],
        hidden:true
      }
    ];

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
        filter.stats = 'True';
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
      getCategories : function(part) {
        if (!categoriesCache[part]) {
          categoriesCache[part] = angular.copy(categories);
        }
        var allHidden = 0 === categoriesCache[part].filter(function(c){
          return !c.hidden;
        }).length;
        if (allHidden) {
          categoriesCache[part][0].hidden = false;
        }
        return categoriesCache[part];
      },
      _setActiveCategory : function (part, active) {
        that.getCategories(part, active);
        angular.forEach(categoriesCache[part], function(cat) {
          cat.hidden = cat.slug != active &&
            0 === cat.types.filter(function(t){
              return t == active;
            }).length;
        });
      },
    };
    return that;
  }])


  .service('placeTypeService', ["gettext", function (gettext) {
    'use strict';
    var self = this;
    var placeTypeNames = {
        'state' : 'Státy',
        'region' : gettext('Regiony'),
        'province' : gettext('Provincie'),
        'region_cz' : gettext('Kraje'),
        'region_it' : gettext('Oblasti'),
        'autonomous_Comunity' : gettext('Autonomní společenství'),
        'bundesland' : gettext('Spolkové země'),
        'city' : gettext('Města'),
        'river' : gettext('Řeky'),
        'lake' : gettext('Jezera'),
        'mountains' : gettext('Pohoří'),
        'island' : gettext('Ostrovy'),
    };
    var placeTypes = [];
    for(var i in placeTypeNames) {
      placeTypes.push({
        name : placeTypeNames[i],
        identifier : i,
      });
    }

    self.getTypes = function () {
      return placeTypes;
    };
  }])

.service('colorService', function() {
  var that = {
    hexToRgb : function(c) {
      var red = parseInt(c.substr(1, 2), 16);
      var green = parseInt(c.substr(3, 2), 16);
      var blue = parseInt(c.substr(5, 2), 16);
      return [red, green, blue];
    },
    getDominantColor : function(c) {
      var rgb = that.hexToRgb(c);
      return rgb.indexOf(Math.max.apply(Math, arr));
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
      var grayAverageHex = Math.round(graySum / 3).toString(16);
      return '#' + grayAverageHex + grayAverageHex + grayAverageHex;
    },
  };
  return that;
})

.service('imageService', function($http, $location ,$cookies) {
  var focusListeners = [];
  var promises = {};
  return {
    all : function(cached) {
      var url = '/imagejson/';
      if (cached && promises[url]){
        return promises[url];
      }
      var promise = $http.get(url);
      promises[url] = promise;
      return promise;
    },
    get : function(imageSlug) {
      var urlParts = $location.absUrl().split('/');
      var url = '/imagejson/' + (imageSlug || urlParts[urlParts.length - 1]);
      var promise = promises[url] || $http.get(url);
      promises[url] = promise;
      return promise;
    },
    bindFocus : function(callback) {
      focusListeners.push(callback);
    },
    focus : function(path) {
      for (var i = 0; i < focusListeners.length; i++) {
        focusListeners[i](path);
      }
    },
    save : function(image, paths) {
      var url = "/image/update";
      var data = {
        image: image,
        paths: paths,
      };
      $http.defaults.headers.post['X-CSRFToken'] = $cookies.csrftoken;
      return $http.post(url, data);
    }
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
