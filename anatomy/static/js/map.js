var STROKE_WIDTH = 1.5;
var RIVER_WIDTH = STROKE_WIDTH * 2;
var ANIMATION_TIME_MS = 500;
var hash = function(x) {return x;};

angular.module('proso.anatomy.map', [])

  .value('chroma', chroma)

  .value('$', jQuery)

  .value('$K', window.kartograph)

  .value('bboxCache', bboxCache)

  .value('colors', {
    'GOOD': '#5CA03C',
    'BAD': '#e23',
    'NEUTRAL' : '#1d71b9',
    'BRIGHT_GRAY' : '#ddd',
    'WATER_COLOR' : '#73c5ef',
    'HIGHLIGHTS' : [
      '#f9b234',
      '#1d71b9',
      '#36a9e0',
      '#312883',
      '#fdea11',
      '#951b80',
    ],
  })

  .value('stateAlternatives', [
    "region",
    "province",
    "region_cz",
    "region_it",
    "bundesland",
    "autonomous_comunity",
  ])

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

  .factory('getLayerConfig', ['$log', 'colors', 'colorScale', 'citySizeRatio',
      'stateAlternatives', 'highlighted',
      function($log, colors, colorScale, citySizeRatio, stateAlternatives, highlighted) {
    'use strict';
    return function(config) {
      var layerConfig = {};
      layerConfig.bg = {
        'styles' : {
          'fill' : colors.BRIGHT_GRAY,
          'stroke-width' : STROKE_WIDTH,
          'transform' : ''
        }
      };

      layerConfig.state = {
        'styles' : {
          'fill' : function(d) {
            var flashcard = config.places && config.places[d.code];
            return flashcard && flashcard.practiced ?
              colorScale(flashcard.prediction).hex() :
              '#fff';
          },
          'stroke-width' : STROKE_WIDTH,
          'stroke' : '#000',
          'transform' : ''
        },
        'click' : function(data) {
          $log.log(data.code);
          if (config.click !== undefined) {
            config.click(data.code);
          }
        }
      };

      angular.forEach(stateAlternatives.concat('island', 'mountains'), function(sa){
        layerConfig[sa] = angular.copy(layerConfig.state);
      });

      layerConfig.river = angular.extend(angular.extend({}, layerConfig.state), {
        'styles' : {
          'stroke-width' : RIVER_WIDTH,
          'stroke' : function(d) {
            var flashcard = config.places && config.places[d.code];
            return flashcard && flashcard.practiced ?
              colorScale(flashcard.prediction).hex() :
              colors.WATER_COLOR;
          },
          'transform' : ''
        },
        'mouseenter' : function(data, path) {
          var zoomRatio = 4;
          var animAttrs = { 'stroke-width' : zoomRatio * RIVER_WIDTH };
          path.animate(animAttrs, ANIMATION_TIME_MS / 2, '>');
        },
        'mouseleave' : function(data, path) {
          var animAttrs = { 'stroke-width' : RIVER_WIDTH };
          path.animate(animAttrs, ANIMATION_TIME_MS / 2, '>');
        }
      });

      layerConfig.city = angular.extend(angular.extend({},layerConfig.state), {
        'mouseenter' : function(data, path) {
          if (!highlighted.isHighlighted(data.code)) {
            return;
          }
          path.toFront();
          var zoomRatio = 2.5 / citySizeRatio(data.population);
          var animAttrs = {
              'transform' : 's' + zoomRatio,
              'stroke-width' : zoomRatio * STROKE_WIDTH
            };
          path.animate(animAttrs, ANIMATION_TIME_MS / 2, '>');
        },
        'mouseleave' : function(data, path) {
          var animAttrs = {
              'transform' : '',
              'stroke-width' : STROKE_WIDTH
            };
          path.animate(animAttrs, ANIMATION_TIME_MS / 2, '>');
        }
      });

      layerConfig.lake = angular.copy(layerConfig.state, {});
      layerConfig.lake.styles.fill = function(d) {
        var flashcard = config.places && config.places[d.code];
        return flashcard && flashcard.practiced ?
          colorScale(flashcard.prediction).hex() :
          colors.WATER_COLOR;
      };
      return layerConfig;
    };
  }])

  .factory('initLayers', ['getLayerConfig', 'stateAlternatives', function(getLayerConfig, stateAlternatives) {

    function _hideLayer(layer){
      var paths = layer ? layer.getPaths({}) : [];
      angular.forEach(paths, function(path) {
        path.svgPath.hide();
      });
    }

    return function(map, config) {
      var layersConfig = getLayerConfig(config);
      var layersArray = [];
      for (var i in layersConfig) {
        map.addLayer(i, layersConfig[i]);
        var l = map.getLayer(i);
        if (l && l.id != 'bg') {
          layersArray.push(l);
          _hideLayer(l);
        }
      }
      var that = {
        hideLayer : function(layer) {
          _hideLayer(layer);
        },
        showLayer : function(layer) {
          var paths = layer ? layer.getPaths({}) : [];
          angular.forEach(paths, function(path) {
            path.svgPath.show();
          });
        },
        getLayerBySlug: function(slug) {
          var ret;
          angular.forEach(layersArray, function(l) {
            if (l.id == slug) {
              ret = l;
            }
          });
          return ret;
        },
        getAll : function(){
          return layersArray;
        },
        getConfig : function(layer){
          return layersConfig[layer.id];
        },
        getStateAlternative : function() {
          var ret;
          angular.forEach(stateAlternatives.concat(['state']), function(alternative){
            l = that.getLayerBySlug(alternative);
            if (l) {
              ret = l;
            }
          });
          return ret;
        }
      };
      return that;
    };
  }])

  .factory('mapFunctions', ['$timeout', '$', 'stateAlternatives', 'bboxCache',
      function($timeout, $, stateAlternatives, bboxCache){
    var that = {
      getZoomRatio : function(placePath) {
        if (!bboxCache.get(placePath.data.code)) {
          bboxCache.set(placePath.data.code, placePath.svgPath.getBBox());
        }
        bboxCache.setKey(placePath.svgPath.node.id, placePath.data.code);
        var bbox = placePath.svgPath.getBBox();
        var bboxArea = bbox.width * bbox.height;
        var zoomRatio = Math.max(1.2, 70 / Math.sqrt(bboxArea));
        return zoomRatio;
      },
      initMapZoom : function(paper) {
        var panZoom = paper.panzoom({});
        panZoom.enable();

        $('#zoom-in').click(function(e) {
          panZoom.zoomIn(1);
          e.preventDefault();
        });

        $('#zoom-out').click(function(e) {
          panZoom.zoomOut(1);
          e.preventDefault();
        });
        return panZoom;
      },
      getHighlightAnimationAttributes : function(placePath, layer, origStroke, color, zoomRatio) {
        zoomRatio = zoomRatio || that.getZoomRatio(placePath);
        var animAttrs = {
            transform : 's' + zoomRatio,
            'stroke-width' : Math.min(6, zoomRatio) * origStroke
          };
        if (color) {
          if (layer.id == 'river') {
            animAttrs.stroke = color;
          } else {
            animAttrs.fill = color;
          }
        }
        return animAttrs;
      },
      isStateAlternative : function (id) {
        var ret;
        angular.forEach(stateAlternatives.concat(['state']), function(alternative){
          if (id == alternative) {
            ret = alternative;
          }
        });
        return ret;
      }
    };
    return that;
  }])

  .factory('getTooltipGetter', ['$filter', 'colorScale', 'gettext',
      function($filter, colorScale, gettext){
    return function(places) {
      return function(d) {
        var place = places && places[d.code];
        var name = ( place ?
          '<div class="label label-default">' +
            '<i class="flag-' + d.code + '"></i> ' +
            place.term.name +
            '</div>' :
          '');
        var description = (place && place.practiced ?
          '<div>' +
            gettext('Odhad znalosti') + ': ' +
              '<span class="badge badge-default">' +
                '<i class="color-indicator" style="background-color :' +
                colorScale(place.prediction).hex() + '"></i>' +
                Math.round(10 * place.prediction) + ' / 10 ' +
              '</span><br><br>' +
            (d.population ? gettext('Počet obyvatel') + ': ' +
              '<span class="badge badge-default">' +
                $filter('number')(d.population) +
              '</span><br><br>' : '') +
          '</div>' :
            (place && place.summary ?
            '' :
            '<br>' + gettext('Neprocvičováno') + '<br><br>'));
        return [
          name + description,
          place ? place.name : ''
        ];
      };
    };
  }])

  .service('citySizeRatio', function(){
    var min_pop_ratios = [
      [5000000, 1.8],
      [1000000, 1.4],
      [500000, 1.2],
      [100000, 1],
      [30000, 0.8],
      [0, 0.6]
    ];

    return function (population) {
      for (var i = 0; i < min_pop_ratios.length; i++) {
        if (population > min_pop_ratios[i][0]) {
          return min_pop_ratios[i][1];
        }
      }
    };
  })

  .factory('highlighted', function(){
    var places = [];
    return {
      clear: function() {
        places = [];
      },
      isHighlighted: function(code) {
        return places.length === 0 || places.indexOf(code) != -1;
      },
      setHighlighted: function(codes) {
        places = angular.copy(codes);
      }
    };
  })

  .service('getMapResizeFunction', ['$', 'citySizeRatio', '$window',
      function($, citySizeRatio, $window){

    function getNewHeight(mapAspectRatio, isPractise, holderInitHeight) {
      angular.element('#ng-view').removeClass('horizontal');
      var newHeight;
      if (isPractise) {
        var screenAspectRatio = $window.innerHeight / $window.innerWidth;
        if (screenAspectRatio - mapAspectRatio < -0.2) {
          angular.element('#ng-view').addClass('horizontal');
          newHeight = $window.innerHeight;
        } else {
          var controlsHeight = $window.innerWidth > 767 ? 290 : 150;
          newHeight = $window.innerHeight - controlsHeight;
        }
      } else if (holderInitHeight / mapAspectRatio >= $window.innerWidth) {
        newHeight = Math.max(holderInitHeight / 2, mapAspectRatio * $window.innerWidth);
      } else {
        newHeight = holderInitHeight;
      }
      return newHeight;
    }

    var initCitySizes = {};

    function setCitiesSize(layer, currZoom) {
      if (!layer) {
        return;
      }
      currZoom = currZoom || 0;
      var paths = layer.paths;
      angular.forEach(paths, function(path) {
        var initSize = initCitySizes[path.data.code] || path.svgPath.attr("r");
        initCitySizes[path.data.code] = initSize;
        var newRadius = initSize * citySizeRatio(path.data.population) * (1 - (currZoom * 0.08));
        path.svgPath.attr({r: newRadius});
      });
    }

    return function(m, holder, practice) {
      var holderInitHeight = holder.height();
      var panZoom = m.panZoom;
      var map = m.map;
      var mapAspectRatio = map.viewAB.height / map.viewAB.width;

      return function () {
        var newHeight = getNewHeight(mapAspectRatio, practice, holderInitHeight);
        holder.height(newHeight);
        map.resize();
        if (panZoom) {
          panZoom.zoomIn(1);
          panZoom.zoomOut(1);
          panZoom.onZoomChange(function(currZoom) {
            setCitiesSize(map.getLayer("city"), currZoom);
          });
        }
        if (practice) {
          $("html, body").animate({ scrollTop: ($('.navbar').height() - 8) + "px" });
        }
        setCitiesSize(map.getLayer("city"));
      };
    };
  }])

  .service('singleWindowResizeFn', ['$window', function($window){
    var fn = function(){};
    angular.element($window).bind('resize', function() {
      fn();
    });
    return function(newFn) {
      fn = newFn;
    };
  }])

  .factory('mapControler', ['$', '$K', 'mapFunctions', 'initLayers', '$filter',
      'getTooltipGetter', 'highlighted',
      function($, $K, mapFunctions, initLayers, $filter, getTooltipGetter, highlighted) {
    $.fn.qtip.defaults.style.classes = 'qtip-dark';

    return function(mapCode, showTooltips, holder, callback) {
      var config = { state : [] };
      var layers;
      var _placesByTypes;

      config.showTooltips = showTooltips;
      config.isPractise = !showTooltips;
      config.places = [];

      var myMap = {
        map :  $K(holder),
        panZoom : undefined,
        onClick : function(clickFn) {
          config.click = function(code) {
            if (!myMap.panZoom.isDragging()) {
              clickFn(code);
            }
          };
        },
        highlightItems : function(states, color, zoomRatio) {
          var state = states.pop();
          var layer = this.getLayerContaining(state);
          var placePath = layer ? layer.getPaths({ code : state })[0] : undefined;
          if (placePath) {
            placePath.svgPath.toFront();
            var origStroke = layers.getConfig(layer).styles['stroke-width'];
            var animAttrs = mapFunctions.getHighlightAnimationAttributes(placePath, layer,
                origStroke, color, zoomRatio);
            placePath.svgPath.animate(animAttrs, ANIMATION_TIME_MS / 2, '>', function() {
              placePath.svgPath.animate({
                transform : '',
                'stroke-width' : origStroke
              }, ANIMATION_TIME_MS / 2, '<');
              myMap.highlightItems(states, color);
            });
          } else if (states.length > 0) {
            myMap.highlightItems(states, color);
          }
        },
        highlightItem : function(state, color, zoomRatio) {
          myMap.highlightItems([state], color, zoomRatio);
        },
        clearHighlights : function() {
          highlighted.clear();
          angular.forEach(layers.getAll(), function(layer) {
            layer.style(layers.getConfig(layer).styles);
            layers.showLayer(layer);
          });
        },
        updateItems : function(placesByTypes) {
          if (layers === undefined) {
            _placesByTypes = placesByTypes;
            return;
          }
          angular.forEach(placesByTypes, function(type) {
            var l = layers.getLayerBySlug(type.identifier);
            if (type.hidden) {
              layers.hideLayer(l);
            } else {
              layers.showLayer(l);
            }
          });

          var places = $filter('StatesFromPlaces')(placesByTypes);
          config.places = places;
          angular.forEach(layers.getAll(), function(layer) {
            var layerConfig = layers.getConfig(layer);
            layer.style('fill', layerConfig.styles.fill);
            layer.style('stroke', layerConfig.styles.stroke);
            if (config.showTooltips) {
              layer.tooltips(getTooltipGetter(places));
            }
          });
        },
        showSummaryTooltips : function(questions) {
          var places = {};
          questions.map(function(q){
            places[q.asked_code] = {
              'code' : q.asked_code,
              'name' : q.place,
              'summary' : true,
            };
          });
          angular.forEach(layers.getAll(), function(layer) {
            layer.tooltips(getTooltipGetter(places));
          });
        },
        getLayerContaining : function(placeCode) {
          var ret;
          angular.forEach(layers.getAll(), function(layer) {
            if (layer.getPaths({ code : placeCode }).length >= 1) {
              ret = layer;
            }
          });
          return ret;
        },
        showLayerContaining : function(placeCode) {
          var l = myMap.getLayerContaining(placeCode);
          layers.showLayer(l);
          if (l && l.id == "city") {
            layers.showLayer(layers.getStateAlternative());
          }
        },
        highLightLayer : function(layer) {
          angular.forEach(layers.getAll(), function(l) {
            if (l == layer || (layer && layer.id == 'city' && mapFunctions.isStateAlternative(l.id))) {
              layers.showLayer(l);
            }
            else {
              layers.hideLayer(l);
            }
          });
        },
        hideLayers : function() {
          angular.forEach(layers.getAll(), function(l) {
            layers.hideLayer(l);
          });
        },
        placeToFront : function(placeCode) {
          angular.forEach(layers.getAll(), function(layer) {
            var place = layer.getPaths({ code : placeCode })[0];
            if (place) {
              place.svgPath.toFront();
            }
          });
        }
      };

      myMap.map.loadCSS(hash('/static/css/map.css'), function() {
        myMap.map.loadMap(hash('/static/map/' + mapCode + '.svg'), function() {
          highlighted.clear();
          layers = initLayers(myMap.map, config);
          if (_placesByTypes !== undefined) {
            myMap.updateItems(_placesByTypes);
          }
          myMap.panZoom = mapFunctions.initMapZoom(myMap.map.paper);
          callback(myMap);
        });
      });
      return myMap;
    };
  }]);
