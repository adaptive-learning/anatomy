angular.module('proso.anatomy.controllers')

.controller('anatomyImageController', ['$scope', '$element', 'imageService', '$window', '$', 'colorService', '$timeout', '$filter', 'colors',
    function($scope, $element, imageService, $window, $, colorService, $timeout, $filter, colors) {
  var ANIMATION_TIME_MS = 1000;
  $element.parent().addClass('anatomy-image');
  $element.parent().addClass('image-' + $scope.code);

  function setMinImageHeight() {
    angular.element('body').removeClass('horizontal');
    var screenAspectRatio = $window.innerHeight / $window.innerWidth;

    if (screenAspectRatio < 1 && $window.innerWidth > 600) {
      angular.element('body').addClass('horizontal');
      $element.css("min-height", $window.innerHeight * 0.8);
    } else {
      $element.css("min-height", $window.innerHeight / 2);
    }
  }
  setMinImageHeight();
  angular.element(window).bind('resize', function() {
    setMinImageHeight();
  });

  var initImage = function(image){
    var paper = {
      x : 0,
      y : 0,
    };
    $element.attr("oncontextmenu", "return false;");
    $element[0].innerHTML = "";
    var r = Raphael($element[0]);
    var clickFn;


    function clickHandler(){
      var clickedCode = this.data('code');
      if (!clickedCode || $scope.$parent.canNext) {
        return;
      }
      if (clickFn) clickFn(clickedCode);
      $scope.$parent.$apply();
    }

    var paths = [];
    var pathsObj = {};
    var pathsByCode = {};
    var rPathsObj = {};

    var highlights = [];
    var highlightsByCode = {};

    var that = {
      onClick: function(callback) {
        clickFn = callback;
      },
      highlightItem : function(code, color, animate) {
        var paths = code ? (pathsByCode[code] || []) : [];
        var bbox = getBBox(paths.map(function(p) {return p.getBBox();}));
        angular.forEach(paths, function(path) {
          if (color == 'no-change') {
            color = chroma(path.data('color')).darken().hex();
          }
          if (color) {
            path.attr({
              'fill' : animate ? '#fff' : path.data('color'),
              'stroke' : animate ? '#fff' : path.data('stroke-color'),
            });
            var animAttrs = {
              'fill' : color,
              'stroke' : color,
              'opacity' : 1,
            };
            path.animate(animAttrs, ANIMATION_TIME_MS, '>');
            path.data('highlight-color', color);
            highlights.push(path);
          }
        });

        if (animate) {
          var highlightEllipse = r.circle(
            bbox.x + bbox.width / 2,
            bbox.y + bbox.height / 2,
            Math.max(bbox.width, bbox.height) / 2);
          highlightEllipse.attr({
            'stroke-width' : image.bbox.height / 100,
            'stroke' : color,
            'stroke-opacity' : 0.5,
            'transform' : 's ' + getZoomRatio(bbox),
          });
          var animAttrs = {
            transform : '',
          };
          highlightEllipse.animate(animAttrs, ANIMATION_TIME_MS / 2, '>', function() {
            highlightEllipse.remove();
          });
        }
      },

      clearHighlights : function() {
        for (var i = 0; i < highlights.length; i++) {
          highlights[i].attr({
            'fill' : highlights[i].data('color'),
            'stroke' : highlights[i].data('stroke-color'),
            'opacity' : highlights[i].data('opacity'),
          });
          highlights[i].data('highlight-color', undefined);
        }
        highlights = [];
        highlightsByCode = {};
      },
      setColor : function(code, color) {
        var paths = pathsByCode[code] || [];
        for (var i = 0; i < paths.length; i++) {
          paths[i].data('color', color);
          paths[i].data('stroke-color', color);
          paths[i].attr({
            'fill' : color,
            'stroke' : color,
          });
        }
      },
      hoverIn : hoverInHandler,
      hoverOut : hoverOutHandler,
      highlightAnswer : function (question, selected) {
          var asked = question.description;
          if ($filter('isFindOnMapType')(question)) {
              that.highlightItem(asked, colors.GOOD);
          }
          that.highlightItem(selected, asked == selected ? colors.GOOD : colors.BAD);
          /*
          if ((question.question_type == 't2ts' ||
                question.question_type == 'ts2t') &&
              question.additional_info) {
            that.highlightItem(
              question.additional_info.descriptions[question.question_type],
              question.isCorrect ? colors.GOOD : colors.BAD);

          }
          */
      },
      highlightQuestion : function (question) {
        if ($filter('isPickNameOfType')(question)) {
          var callback = function(iteration) {
            that.highlightItem(
              question.description, colors.HIGHLIGHTS[1], true);
            $timeout(function() {
              if (!question.responseTime) {
                callback(iteration + 1);
              }
            }, 2 * ANIMATION_TIME_MS * iteration * iteration);
          };
          callback(1);
        }
        if ($filter('isFindOnMapType')(question) && question.options) {
          for (var i = 0; i < question.options.length; i++) {
            question.options[i].bgcolor = colors.HIGHLIGHTS[i];
            question.options[i].color = colors.HIGHLIGHTS_CONTRAST[i];
            that.highlightItem(
              question.options[i].description,
              colors.HIGHLIGHTS[i]);
          }
        }
      },

    };

    function hoverInHandler(pathCode) {
      var path = pathsByCode[pathCode] && pathsByCode[pathCode][0] || this;
      setHoverColor(path, true);
    }

    function hoverOutHandler(pathCode) {
      var path = pathsByCode[pathCode] && pathsByCode[pathCode][0] || this;
      setHoverColor(path, false);
    }

    function getZoomRatio(bbox) {
      var widthRatio =  image.bbox.width / bbox.width;
      var heightRatio = image.bbox.height / bbox.height;
      var minRatio = Math.min(widthRatio, heightRatio);
      var zoomRatio = Math.max(1.05, minRatio);
      return zoomRatio;
    }

    function canBeSelected(code) {
      return $filter('isFindOnMapType')($scope.$parent.question) &&
        !$scope.$parent.canNext &&
        $filter('isAllowedOption')($scope.$parent.question, code);
    }

    function setHoverColor(path, lower) {
        var code = path && path.data && path.data('code');
        if (code && (!$scope.practice || canBeSelected(code))) {
          var paths = (pathsByCode[code] || []).concat(
              highlightsByCode[code] || []);
          for (var i = 0; i < paths.length; i++) {
            var attr = getHoverAttr(paths[i], lower);
            paths[i].attr(attr);
          }
        }
    }

    function getHoverAttr(path, lower) {
      var attr;
      var color = path.data('highlight-color') || path.data('color');
      var strokeColor = path.data('highlight-color') || path.data('stroke-color');
      if (lower) {
        attr = {
          'fill' : chroma(color).darken().hex(),
          'stroke' : strokeColor && chroma(strokeColor).darken().hex(),
          'cursor' : 'pointer',
        };
      } else {
        attr = {
          'fill' : color,
          'stroke' : strokeColor,
          'cursor' : 'default',
        };
      }
      return attr;
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


    for (var i = 0; i < image.paths.length; i++) {
      var p = image.paths[i];
      var simplePathString = p.d;
      var path = r.path(simplePathString);
      var color = colorService.toGrayScale(p.color);
      var strokeColor = p.stroke && colorService.toGrayScale(p.stroke);
      path.attr({
        'fill' : color,
        'opacity' : p.opacity,
        'stroke-width' : p.stroke_width,
        'stroke' : strokeColor,
      });
      path.data('id', p.id);
      path.data('color', color);
      path.data('stroke-color', strokeColor);
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

    image.bbox = image.bbox || getBBox(image.paths.map(function(p) {
      p.bbox.x2 = p.bbox.x + p.bbox.width;
      p.bbox.y2 = p.bbox.y + p.bbox.height;
      return p.bbox;
    }));

    function setTermsConteinerHeight(screenAspectRatio) {
      if (!$scope.practice) {
        var height;
        if (screenAspectRatio < 1) {
          height = $window.innerHeight * 0.7;
        } else {
          height = ($window.innerHeight / 2) - 40;
        }
        angular.element('.terms-container').css('max-height', height + 'px');
      }
    }

    function getHorizontalViewDimensions(paper){
      var imageOfWindowWidthRatio = 0.7;
      if ($scope.practice) {
        var headerHeight = angular.element('.header-practice').height() || 0;
        headerHeight += angular.element('#nav-main').height() || 0;
        headerHeight -= Math.min(60, angular.element($window).scrollTop());
        var alertHeight = angular.element('.beta-alert').outerHeight() ||
          angular.element('.bottom-alert').outerHeight() || 0;
        paper.height = $window.innerHeight - (25 + headerHeight + alertHeight);
        paper.width = $window.innerWidth  * 0.7 - 20;
      } else {
        paper.height = $window.innerHeight * 0.7 - 90;
        paper.width = $('.panel-body').innerWidth() * imageOfWindowWidthRatio - 40;
      }
      return paper;
    }

    function onWidowResize(){
      angular.element('body').removeClass('horizontal');
      var screenAspectRatio = $window.innerHeight / $window.innerWidth;

      if (screenAspectRatio < 1 && $window.innerWidth > 600) {
        angular.element('body').addClass('horizontal');
        paper = getHorizontalViewDimensions(paper);
      } else {
        paper.height = ($window.innerHeight / 2) * ($scope.relativeHeight || 1);
        paper.width = $window.innerWidth - ($scope.practice ? 35 : 75);
      }
      setTermsConteinerHeight(screenAspectRatio);

      r.setSize(paper.width, paper.height);
      r.setViewBox(image.bbox.x, image.bbox.y, image.bbox.width, image.bbox.height, true);
    }
    onWidowResize();
    angular.element($window).bind('resize', function() {
      onWidowResize();
    });
    if ($scope.practice) {
      angular.element("html, body").animate({
        scrollTop: (angular.element('.navbar').height() - 8) + "px"
      }, function() {
        onWidowResize();
      });
    }

    return that;
  };

  $scope.$watch('code', function(value) {
    if (value) {
      imageService.getImage(function(i) {
        if (typeof i == 'string') {
          $scope.alert = i;
        } else {
          return initImage(i);
        }
      });
    }
  });
}]);
