/* Filters */
angular.module('proso.anatomy.filters', [])

  .filter('percent', function() {
    return function(n) {
      n = n || 0;
      return Math.round(100 * n) + '%';
    };
  })

  .filter('StatesFromPlaces', function() {
    return function(data) {
      var places = {};
      if (data && data[0]) {
        angular.forEach(data, function(category) {
          if (!category.haveMaps && category.places) {
            angular.forEach(category.places, function(place) {
              places[place.description] = place;
            });
          }
        });
      }
      return places;
    };
  })

  .filter('colNum', function() {
    return function(colsCount) {
      return Math.floor(12 / colsCount);
    };
  })

  .filter('isFindOnMapType', function() {
    return function(question) {
      return question && question.question_type == "t2d";
    };
  })

  .filter('isPickNameOfType', function() {
    return function(question) {
      return question && question.question_type == "d2t";
    };
  })

  .filter('isAllowedOption', function() {
    return function(question, code) {
      return !question.options || 
        0 === question.options.length || 
        1 === question.options.filter(function(option) {
          return option.description == code;
        }).length;
    };
  })

  .filter('questionText', ['gettextCatalog', '$rootScope', '$filter',
      function(gettextCatalog, $rootScope, $filter) {
    return function(question) {
      var stripAlts = $filter('stripAlternatives');
      var type = question && question.question_type;
      var lang = $rootScope.LANGUAGE_CODE;
      if (type == "t2d") {
        return gettextCatalog.getString("Vyber");
      } else if (type == "d2t") {
        return gettextCatalog.getString("Co je zvýrazněno?");
      } else if (type == "t2ts") {
        return question.context.content.question[lang][type].replace('{}',
          '<span class="label label-default">' + stripAlts(question.term.name) + '</span>');
      } else if (type == "ts2t") {
        return question.context.content.question[lang][type].replace('{}',
          '<span class="label label-default">' + stripAlts(question.term_secondary.name) + '</span>');
      }
      return "";
    };
  }])

  .filter('isTypeCategory', function() {
    return function(types, category) {
      types = types && types.filter(function(t){
        return category.types.filter(function(slug){
          return slug == t.identifier;
        }).length == 1;
      });
      return types;
    };
  })

  .filter('categoryIdToName',['categoryService', function(categoryService) {
    return function(id) {
      var category = categoryService.getCategory(id);
      return category ? category.name + ' - ' : '';
    };
  }])

  .filter('probColor', ['colorScale', function(colorScale) {
    return function(probability) {
      return colorScale(probability).hex();
    };
  }])

  .filter('stripAlternatives', [ function() {
    String.prototype.mapReplace = function(map) {
        var regex = [];
        for(var key in map)
            regex.push(key.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"));
        return this.replace(new RegExp(regex.join('|'),"g"),function(word){
            return map[word];
        });
    };

    var replacements = {
      'musculi': 'mm.',
      'venae  ': 'vv. ',
      'nervi ': 'nn. ',
      'arteriae ': 'aa. ',
      'rami ': 'rr. ',
      'ligamenta ': 'ligg. ',
      'musculus': 'm.',
      'vena ': 'v. ',
      'nervus ': 'n. ',
      'arteria ': 'a. ',
      'ramus ': 'r. ',
      'ligamentum ': 'lig. ',
    };
    return function(name) {
      return name && name.mapReplace(replacements).split(';')[0];
    };
  }])

  .filter('alternativeNames', ['gettextCatalog', function(gettextCatalog) {
    return function(name) {
      var names = (name || '').split(';');
      if (names.length > 1) {
        return gettextCatalog.getString('Alternativní názvy') +
          ':<br> <strong>' + names.splice(1).join('<br>') + '</strong>';
      }
      return '';
    };
  }])

  .filter('sumCounts', [ function() {
    return function(layers) {
      if (!layers || layers.length === 0) {
        return 0;
      }
      var sum = layers.map(function(p){
        return p.count;
      }).reduce(function(a, b) {
        return a + b;
      });
      return sum;
    };
  }])

  .filter('stripedStyle', [function () {
    return function (goal, isLearnedBar) {
      var barWidth =  isLearnedBar ? goal.progress : goal.progress_diff;
      var deg = isLearnedBar ? "90" : "270";
      var noOfDays = (new Date(goal.finish_date) - new Date(goal.start_date)) /
        (24 * 60 * 60 * 1000);
      var dayWidth = 1 / noOfDays;
      var relDayWidth = dayWidth / barWidth;
      var dayPercent = relDayWidth * 100 + '%';
      var startPercent = (relDayWidth * 100) - (0.5 / barWidth) + '%';
      var style = {
        "background-image" :
        "repeating-linear-gradient( " + deg + "deg, transparent, transparent " +
          startPercent + ", rgba(0,0,0,0.2) " + startPercent + ", rgba(0,0,0,0.2) " + dayPercent + ")"
      };
      return style;
    };
  }])

  .filter('reportText', ['gettextCatalog', '$filter', '$location',
      function(gettextCatalog, $filter, $location) {
    return function(question, categoryId) {
      var text = gettextCatalog.getString(
        'Na obrázku: "{{imageName}}"\n{{url}}\nv otázce:\n{{question}}\nje tato chyba:',
        {
          imageName: question.context.name,
          url: $location.protocol() + '://' + $location.host() + ':' +  $location.port() +
            "/view/" + (categoryId || '').split('-')[0] +
            "?context=" + question.context.identifier,
          question: $filter('questionText')(question) +
            (question.question_type == 'd2t' && question.options ?
              '\n  ' + question.options.map(function(o) {
                return o.term.name;}).join('\n  ') :
              ' "' + question.term.name + '"'),
        });
      return text;
    };
  }])

  .filter('getSelectedIdentifiers', ['$filter', function($filter) {
    return function(categories, type) {
      var selected = $filter('getSelectedCategories')(categories, type);
      selected = selected.map(function(c) {
        return c.identifier;
      }).join('-');
      if (!selected && type == 'relation') {
        selected = 'relations';
      }
      return selected;
    };
  }])

  .filter('getSelectedCategories', [function() {
    return function(categories, type) {
      var selected = categories || [];
      selected = selected.filter(function(c) {
        return c.selected && (c.type == type || !type);
      });
      return selected;
    };
  }])

  .filter('getSelectedCategoriesText', ['gettextCatalog', '$filter',
      function(gettextCatalog, $filter) {

    function getSection(title, categories, categoryType) {
      var selectedCategoires = $filter('getSelectedCategories')(
          categories, categoryType).map(function(c) {
        return c.name;
      });
      var text = '';
      if (selectedCategoires.length) {
        text += title + '<br>' + '<b>' + selectedCategoires.join(', ') + '</b><br><br>';
      }
      return text;
    }
    return function(categories) {
      var text;
      if ($filter('getSelectedCategories')(categories).length === 0) {
        text = gettextCatalog.getString('Vyber si libovolnou kombinaci orgánových sytémů a částí těla (v pravém horním rohu každé dlaždice).');
      } else {
        text = getSection(gettextCatalog.getString('Vybrané orgánové systémy:'),
          categories, 'system');
        text += getSection(gettextCatalog.getString('Vybrané části těla:'),
          categories, 'location');
        text += getSection(gettextCatalog.getString('Vybrané typy souvislostí:'),
          categories, 'relation');
      }
      return text;
    };
  }])

  .filter('cookieExists', ["$cookies", function ($cookies) {
      return function(name) {
        return $cookies[name];
      };
  }])

  .filter('currencySymbol', [function () {
      var symbols = {
        'CZK': 'Kč',
        'EUR': '€',
      };
      return function(code) {
        return symbols[code];
      };
  }]);
