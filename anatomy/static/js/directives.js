/* Directives */
angular.module('proso.anatomy.directives', ['proso.anatomy.templates'])

  .directive('placeLabel', ['colorScale', 'gettextCatalog', function(colorScale, gettextCatalog) {
    return {
      restrict : 'A',
      template : '{{place.term.name}}',
      link : function($scope, elem) {
        elem.addClass('label');
        elem.addClass('label-default');
        elem.tooltip({
          html : true,
          placement: 'bottom',
          container: 'body',
          title : '<div class="skill-tooltip">' +
                gettextCatalog.getString('Odhad znalosti') +
                ' <span class="badge badge-default">' +
                  '<i class="color-indicator" style="background-color :' +
                  colorScale($scope.place.prediction).hex() + '"></i>' +
                  (10 * $scope.place.prediction) + ' / 10 ' +
                '</span>' +
               '</div>'
        });
      }
    };
  }])

.directive('anatomyImage', function(imageService, $window, $, colorService, $timeout) {
  var paths = [];
  var pathsObj = {};
  var pathsByCode = {};
  var rPathsObj = {};
  var viewBox = {
    x : 0,
    y : 0,
  };
  var focused = [];
  var glows = [];
  var HOVER_OPACITY = 0.2;
  var ANIMATION_TIME_MS = 500;

  return {
      restrict: 'A',
      scope: {
          dset: '='
      },
      link: function(scope, element, attrs) {
          element.addClass('anatomy-image');
          scope.$parent.initImage = function(image){
            viewBox = image.bbox;
            var paper = {
              x : 0,
              y : 0,
            };
            element[0].innerHTML = "";
            var r = Raphael(element[0]);
            var clickFn;


            function clickHandler(){
              var clickedCode = this.data('code');
              if (!clickedCode || scope.$parent.canNext) {
                return;
              }
              if (clickFn) clickFn(clickedCode);
              scope.$parent.$apply();
            }

            var highlights = [];
            var highlightsByCode = {};
            var highlightQueue = [];
            var highlightInProgress = false;

            var that = {
              onClick: function(callback) {
                clickFn = callback;
              },
              _next : function() {
                if (highlightQueue.length > 0) {
                  var item = highlightQueue.shift();
                  that._highlightTerm(item[0], item[1]);
                  $timeout(that._next, ANIMATION_TIME_MS / 2);
                } else {
                  highlightInProgress = false;
                }
              },
              highlightItem : function(code, color) {
                highlightQueue.push([code, color]);
                if (!highlightInProgress) {
                  highlightInProgress = true;
                  that._next();
                }
              },
              _highlightTerm : function(code, color) {
                var paths = pathsByCode[code] || [];
                var bbox = getBBox(paths.map(function(p) {return p.getBBox();}));
                var centerX = Math.floor(bbox.x + bbox.width / 2);
                var centerY = Math.floor(bbox.y + bbox.height / 2);
                var clones = [];
                for (var i = 0; i < paths.length; i++) {
                  var clone = clonePath(paths[i], code, color);
                  animateClone(clone, centerX, centerY);
                  clones.push(clone);
                }
                highlightsByCode[code] = clones;
                highlights = highlights.concat(clones);
              },

              clearHighlights : function() {
                for (var i = 0; i < highlights.length; i++) {
                  highlights[i].remove();
                }
                highlights = [];
                highlightsByCode = {};
              },
            };

            scope.$parent.imageController = that;

            function hoverInHandler() {
              setLowerOpacity(this, HOVER_OPACITY);
            }

            function hoverOutHandler() {
              setLowerOpacity(this, 0);
            }

            function clonePath(path, code, color) {
              var clone = path.clone();
              clone.click(clickHandler);
              clone.hover(hoverInHandler, hoverOutHandler);
              clone.data('id', path.data('id'));
              clone.data('code', code);
              clone.data('opacity', path.data('opacity'));
              clone.data('color', color);
              clone.attr({
                'fill' : color,
              });
              return clone;
            }
            
            function animateClone(clone, centerX, centerY) {
              var animAttrs = {
                transform : 's' + [1.5, 1.5, centerX, centerY].join(','),
              };
              clone.animate(animAttrs, ANIMATION_TIME_MS / 2, '>', function() {
                clone.animate({
                  transform : '',
                }, ANIMATION_TIME_MS / 2, '<');
              });
            }

            function setLowerOpacity(path, decrease) {
                var code = path.data('code');
                if (!code) {
                  return;
                }
                var paths = (pathsByCode[code] || []).concat(
                    highlightsByCode[code] || []);
                for (var i = 0; i < paths.length; i++) {
                  paths[i].attr({
                    'opacity' : paths[i].data('opacity') - decrease,
                  });
                }
            }

            for (var i = 0; i < image.paths.length; i++) {
              var p = image.paths[i];
              var simplePathString = p.d;
              var path = r.path(simplePathString);
              var color = colorService.toGrayScale(p.color);
              path.attr({
                'fill' : color,
                'opacity' : p.opacity,
                'stroke-width' : p.stroke_width,
                'stroke' : p.stroke && colorService.toGrayScale(p.stroke),
                'cursor' : p.disabled ? 'default' : 'pointer',
              });
              path.data('id', p.id);
              path.data('color', color);
              path.data('opacity', p.opacity);
              path.click(clickHandler);
              path.hover(hoverInHandler, hoverOutHandler);
              p.bbox = p.bbox || path.getBBox();
              paths.push(path);
              rPathsObj[p.id] = path;
              var code = p.term;
              path.data('code', code);
              if (!pathsByCode[code]) {
                pathsByCode[code] = [];
              }
              pathsByCode[code].push(path);
              pathsObj[p.id] = p;
            }

            viewBox = getBBox(image.paths.map(function(p) {
              p.bbox.x2 = p.bbox.x + p.bbox.width;
              p.bbox.y2 = p.bbox.y + p.bbox.height;
              return p.bbox;
            }));
            image.bbox = viewBox;

            function onWidowResize(){
              angular.element('#ng-view').removeClass('horizontal');

              var imageAspectRatio = viewBox.height / viewBox.width;
              var screenAspectRatio = $window.innerHeight / $window.innerWidth;
              if (screenAspectRatio < imageAspectRatio) {
                angular.element('#ng-view').addClass('horizontal');
                paper.height = $window.innerHeight - 8;
                paper.width = $window.innerWidth  * 0.7;
              } else {
                paper.height = ($window.innerHeight /2) * (attrs.relativeHeight || 1);
              paper.width = $window.innerWidth ;
              }

              r.setSize(paper.width, paper.height);
              r.setViewBox(viewBox.x, viewBox.y, viewBox.width, viewBox.height, true);
            }
            onWidowResize();
            angular.element($window).bind('resize', function() {
              onWidowResize();
            });
            if (attrs.practice || true) { // TODO change this when using for preview
              angular.element("html, body").animate({
                scrollTop: (angular.element('.navbar').height() - 8) + "px"
              });
            }



            var initMapZoom = function(paper, options) {
              var panZoom = paper.panzoom(options);
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
            };
            var panZoomOptions = {
             initialPosition : {
               x : viewBox.x,
               y : viewBox.y,
             }
            };

            $('#init-zoom').click(function() {
              initMapZoom(r, panZoomOptions);
              scope.zoomInited = true;
              $(this).hide();
            });

            imageService.bindFocus(function(pathOrByColor) {
              clearFocused();
              if (pathOrByColor.d) {
                focusPath(pathOrByColor);
              }
            });

            function clearFocused() {
              for (var i = 0; i < glows.length; i++) {
                glows[i].remove();
              }
              glows = [];
              for (i = 0; i < focused.length; i++) {
                var p = pathsObj[focused[i].data('id')];
                focused[i].attr('stroke-width', p.stroke_width);
                focused[i].attr('stroke', p.stroke);
              }
              focused = [];
            }

            function focusPath(path) {
              if (path.isTooSmall) {
                return;
              }
              var rPath = rPathsObj[path.id];
              focused.push(rPath);
              var glow = rPath.glow({
                'color': 'red',
                'opacity': 1,
                'width': 5,
              });
              glow.toFront();
              glows.push(glow);
              return path.bbox;
            }

            function getBBox(bboxes) {
              var xs = bboxes.map(function(b){return b.x;});
              var minX = Math.min.apply(Math, xs);
              var ys = bboxes.map(function(b){return b.y;});
              var minY = Math.min.apply(Math, ys);
              var x2s = bboxes.map(function(b){return b.x2;});
              var maxX = Math.max.apply(Math, x2s);
              var y2s = bboxes.map(function(b){return b.y2;});
              var maxY = Math.max.apply(Math, y2s);
              return {
                x : minX,
                y : minY,
                width : maxX - minX,
                height : maxY - minY,
              };
            }

          };
          if (attrs.context) {
            scope.$parent.initImage(angular.fromJson(attrs.context));
          }
      }
  };
})

  .directive('blindMap', ['mapControler', 'places', 'singleWindowResizeFn',
        'getMapResizeFunction', '$parse',
      function(mapControler, places, singleWindowResizeFn,
        getMapResizeFunction, $parse) {
    return {
      restrict : 'E',
      templateUrl : 'static/tpl/map_tpl.html',
      link : function($scope, elem, attrs) {
        $scope.loading = true;
        $scope.name = places.getName($scope.part);
        $scope.practice = !attrs.showTooltips;
        var showTooltips = attrs.showTooltips !== undefined;

        var map = mapControler($scope.part, showTooltips, elem, function(m) {
          $scope.loading = false;
          var resize = getMapResizeFunction(m, elem, $scope.practice);
          singleWindowResizeFn(resize);
          resize();
          $scope.$eval(attrs.callback);
          $scope.$digest();
        });
        var model = $parse(attrs.map);
        //Set scope variable for the map
        model.assign($scope, map);
      },
      replace : true
    };
  }])

  .directive('email', function() {
    return {
      restrict : 'C',
      compile : function(elem) {
        var emailAddress = elem.html();
        emailAddress = emailAddress.replace('{zavinac}', '@');
        emailAddress = '<a href="mailto:' + emailAddress +
  '">' + emailAddress +
  '</a>';
        elem.html(emailAddress);
      }
    };
  })

  .directive('atooltip', function() {
    return {
      restrict : 'C',
      link : function($scope, elem, attrs) {
        elem.tooltip({
          'placement' : attrs.placement || 'bottom',
          'container' : attrs.container,
        });
      }
    };
  })

  .directive('points', ['$timeout', 'events', function($timeout, events) {
    return {
      scope : true,
      restrict : 'C',
      link : function($scope, elem) {
        events.on('userUpdated', function(user) {
          $scope.user = user;
          if (user.points == 1) {
            $timeout(function() {
              elem.tooltip('show');
            }, 0);
          }
        });
      }
    };
  }])

  .directive('categoryProgress', ['gettextCatalog', function(gettextCatalog) {
    return {
      restrict : 'A',
      template : '<div class="progress overview-progress">' +
                    '<div class="progress-bar progress-bar-practiced" style="' +
                        'width: {{100 * skills.number_of_practiced_flashcards / skills.number_of_flashcards}}%;">' +
                    '</div>' +
                    '<div class="progress-bar progress-bar-learned" style="' +
                        'width: {{100 * skills.number_of_mastered_flashcards / skills.number_of_flashcards}}%;">' +
                    '</div>' +
                  '</div>' + 
                  '<div class="text-center">' +
                     '<span class="badge badge-default">' +
                       '<i class="color-indicator learned"></i>' +
                       '<span translate>Naučeno</span>: ' +
                       '{{skills.number_of_mastered_flashcards !== undefined ? skills.number_of_mastered_flashcards : "..."}} / ' +
                       '{{skills.number_of_flashcards || 0}}' +
                     '</span> ' +
                     '<span class="badge badge-default">' +
                       '<i class="color-indicator practiced"></i>' +
                       '<span translate>Procvičováno</span>: ' +
                       '{{skills.number_of_nonmastered_practiced_flashcards !== undefined ? skills.number_of_nonmastered_practiced_flashcards : "..."}} / ' +
                       '{{skills.number_of_flashcards || 0}}' +
                     '</span>' +
                   '</div>',
      link : function($scope, elem, attrs) {
        attrs.$observe('skills', function(skills) {
          if(skills !== '') {
            $scope.skills = angular.fromJson(skills);
            $scope.skills.number_of_nonmastered_practiced_flashcards =
              Math.max(0, $scope.skills.number_of_practiced_flashcards -
              ($scope.skills.number_of_mastered_flashcards || 0));
          }
        });
      }
    };
  }])

  .directive('levelProgressBar',['userService', '$timeout', 'gettextCatalog',
      function(userService, $timeout, gettextCatalog) {

    function getLevelInfo(user) {
      var points = user.number_of_correct_answers || 0;
      var levelEnd = 0;
      var levelRange = 30;
      var rangeIncrease = 0;
      for (var i = 1; true; i++) {
        levelEnd += levelRange;
        if ((points || 0) < levelEnd) {
          return {
            level : i,
            form : levelEnd - levelRange,
            to : levelEnd,
            range : levelRange,
            points : points - (levelEnd - levelRange),
          };
        }
        levelRange += rangeIncrease;
        rangeIncrease += 10;
      }

    }
    return {
      restrict : 'C',
      template : '<span class="badge level-start" ' +
                   'tooltip-append-to-body="true" ' +
                   'ng-bind="level.level" tooltip="' + gettextCatalog.getString('Aktuální úroveň') + '">' +
                 '</span>' +
                 '<div class="progress level-progress" ' +
                     'tooltip-append-to-body="true" ' +
                     'tooltip="{{level.points}} / {{level.range}} ' +
                     gettextCatalog.getString('bodů do příští úrovně') + '">' +
                   '<div class="progress-bar progress-bar-warning" ' +
                        'style="width: {{(level.points/level.range)|percent}};">' +
                   '</div>' +
                 '</div>' +
                 '<span class="badge level-goal" ' +
                     'tooltip-append-to-body="true" ' +
                     'ng-bind="level.level+1" tooltip="' + gettextCatalog.getString('Příští úroveň') + '">' +
                 '</span>',
      link : function($scope, elem, attrs) {
        elem.addClass('level-wrapper');
        if (attrs.username != userService.user.username) {
          userService.getUserProfile(attrs.username, true).success(function(data){
            $scope.level = getLevelInfo(data);
          });
        } else {
          $scope.level = getLevelInfo(userService.user.profile);
        }
      }
    };
  }])

  .directive('myGooglePlus', ['$window', function ($window) {
    return {
      restrict: 'A',
      link: function (scope, element) {
        element.addClass('g-plus');
        scope.$watch(function () { return !!$window.gapi; },
          function (gapiIsReady) {
            if (gapiIsReady) {
              $window.gapi.plus.go(element.parent()[0]);
            }
          });
      }
    };
  }])

  .directive('myFbShare', ['$window', function ($window) {
    return {
      restrict: 'A',
      link: function (scope, element) {
        element.addClass('fb-share-button');
        scope.$watch(function () { return !!$window.FB; },
          function (fbIsReady) {
            if (fbIsReady) {
              $window.FB.XFBML.parse(element.parent()[0]);
            }
          });
      }
    };
  }])

  .directive('locationAppend', ['$rootScope', '$location',
      function ($rootScope, $location) {
    return {
      restrict: 'A',
      link: function ($scope, element, attrs) {
        var url = attrs.href.substring(0, 3);
        $rootScope.$on("$routeChangeSuccess", function() {
          element.attr('href', url + $location.path());
        });
      }
    };
  }])

  .directive('trackClick', ['$analytics', function ($analytics) {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        element.click(function(){
          $analytics.eventTrack('click', {
            category: attrs.trackClick,
            label: attrs.href,
          });
        });
      }
    };
  }])

  .directive('dynamicTitle', ['$rootScope', 'pageTitle', '$route', '$timeout',
      function ($rootScope, pageTitle, $route, $timeout) {
    return {
      restrict : 'A',
      scope : {},
      link : function (scope, element, attrs) {
        $rootScope.$on("$locationChangeSuccess", function() {
          $rootScope.title = pageTitle($route.current) + attrs.dynamicTitle;
          //console.log($rootScope.title);
          $timeout(function() {
            element.text($rootScope.title);
            //console.log($rootScope.title);
          }, 0, false);
        });
      }
    };
  }])

  .directive('setPlaceTypeNames', ['places', function (places) {
    return {
      restrict : 'A',
      link : function (scope, element, attrs) {
        var obj = angular.fromJson(attrs.setPlaceTypeNames);
        places.setPlaceTypeNames(obj);
      }
    };
  }])

  .directive('errorMessage', ['gettextCatalog', function (gettextCatalog) {
    return {
      restrict : 'A',
      template: '<div class="alert alert-danger">' +
                  gettextCatalog.getString("V aplikaci bohužel nastala chyba.") +
                '</div>',
    };
  }])

  .directive('showAfterXAnswers', ['$timeout', 'events', function($timeout, events) {
    return {
      scope : true,
      restrict : 'A',
      link : function($scope, elem, attrs) {
        var x = parseInt(attrs.showAfterXAnswers);
        events.on('userUpdated', function(user) {
          if (user.answered_count == x) {
            $timeout(function() {
              elem.tooltip({
                placement: 'right',
                title : elem.attr('tooltip'),
              });
              elem.tooltip('show');
            }, 100);
          }
        });
      }
    };
  }]);
