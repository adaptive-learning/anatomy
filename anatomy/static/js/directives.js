/* Directives */
angular.module('proso.anatomy.directives', ['proso.anatomy.templates'])

  .directive('termLabel', [function() {
    return {
      restrict : 'A',
      template : '{{flashcard.term.name}}',
      controller : 'termLabelController',
    };
  }])

.directive('anatomyImage', [function() {
  return {
      restrict: 'A',
      scope: {
          code: '=code',
          practice: '=practice',
      },
      controller : 'anatomyImageController',
      template: '<div class="alert alert-info" ng-if="alert">{{alert}}</div>',
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

  .directive('categoryProgress', [function() {
    return {
      restrict : 'A',
      templateUrl : 'static/tpl/progress_tpl.html',
      scope : {
        skills : '=skills',
        hideLabels : '=hideLabels',
      },
    };
  }])

  .directive('progressLabels', [function() {
    return {
      restrict : 'A',
      templateUrl : 'static/tpl/progress_labels.html',
      scope : {
        skills : '=skills',
        hideLabels : '=hideLabels',
      },
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
        element.bind("click", function(){
          $analytics.eventTrack('click', {
            category: attrs.trackClick,
            label: attrs.trackLabel || attrs.href,
            value: attrs.trackValue,
          });
        });
      }
    };
  }])

  .directive('trackShow', ['$analytics', function ($analytics) {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        $analytics.eventTrack('show', {
          category: attrs.trackShow,
          label: attrs.trackLabel,
          value: attrs.trackValue,
        });
      }
    };
  }])

  .directive('trackHover', ['$analytics', function ($analytics) {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        element.bind("mouseover", function(){
          $analytics.eventTrack('hover', {
            category: attrs.trackHover,
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
          $timeout(function() {
            element.text($rootScope.title);
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
                  '<p><strong>' +
                  gettextCatalog.getString("V aplikaci bohužel nastala chyba.") +
                  '</strong></p>' +
                  '<ul><li>' +
                    gettextCatalog.getString('Pro vyřešení problému zkuste') +
                    ' <a href="" onClick="window.location.href=window.location.href" ' +
                        'class="btn btn-default">' +
                      gettextCatalog.getString('obnovit stránku') +
                    '</a>' +
                  '</li><li>' +
                    gettextCatalog.getString("Pokud problém přetrval zkuste to znovu později nebo") +
                    ' <a feedback-comment class="btn btn-default" email="{{email}}" href=""> ' +
                       gettextCatalog.getString('nám napiště')  +
                    '</a>' +
                  '</li></ul>' +
                '</div>',
    };
  }])

  .directive('pageNumber', ['gettextCatalog', function (gettextCatalog) {
    return {
      restrict : 'A',
      scope : true,
      template: '<span ng-show="pageNumber" class="page-number" > ' +
                gettextCatalog.getString('Zdroj') + ': ' +
                  ' <a href="http://anatomie.memorix.cz">' +
                  gettextCatalog.getString('Memorix anatomie') + '</a>, ' +
                  gettextCatalog.getString('str.') + ' {{pageNumber}}' +
                ' </span>',
      link : function($scope, elem, attrs) {
        $scope.pageNumber = attrs.pageNumber;
        attrs.$observe('pageNumber', function(value) {
          if (value) {
            $scope.pageNumber = value;
          }
        });
      },
    };
  }])

  .directive('isActive',['$location', '$rootScope',
      function($location, $rootScope) {
    return {
      restrict: 'A',
      link: function(scope, element) {
        $rootScope.$on("$routeChangeSuccess", function() {
          var href = element.children('a').attr('href');
          if ($location.path() == href) {
            element.addClass('active');
          } else {
            element.removeClass('active');
          }
        });
      }
    };
  }])

  .directive('shareButton', ['shareModal', function(shareModal) {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        element.bind('click', function(){
          shareModal.open(attrs);
        });
      }
    };
  }])

  .directive('imageModal', [function() {
    return {
      scope: {
        category: '=category',
        context: '=context',
        contexts: '=contexts',
        openAction: '=openAction',
      },
      restrict: 'E',
      controller: 'imageModalController',
    };
  }])

  .directive('relationsModal', [function() {
    return {
      scope: {
      },
      restrict: 'E',
      controller: 'relationsModalController',
    };
  }])

  .directive('imageView', [function() {
    return {
      scope: {
        context: '=?context',
        category: '=?category',
        contextId: '=?contextId',
        stats: '=stats',
      },
      restrict: 'A',
      templateUrl: 'static/tpl/image_view.html',
      controller: 'imageViewController',
    };
  }])

  .directive('signInBanner', ['userService', 'signupModal',
      function(userService, signupModal) {
    return {
      restrict: 'A',
      templateUrl : 'static/tpl/sign_in_banner.html',
      link: function ($scope) {
        $scope.userService = userService;
        $scope.openSignupModal = function() {
            signupModal.open();
        };
      }
    };
  }])

  .directive('premiumBanner', ['userService', '$timeout', '$rootScope', '$location',
      function(userService, $timeout, $rootScope, $location) {
    return {
      restrict: 'A',
      templateUrl : 'static/tpl/premium_banner.html',
      link: function ($scope) {
        $scope.userService = userService;

        $rootScope.$on('questionSetFinished', function() {
          var shouldShow = !userService.status.loading &&
            !userService.user.profile.subscribed &&
            !$scope.closed &&
            userService.user.profile.number_of_answers >= 40;
          if (shouldShow) {
            $scope.show = true;
            $timeout(function() {
              $scope.class = 'alert-grow';
            }, 5000);
          }
        });

        $scope.close = function() {
          $scope.closed = true;
        };

        $scope.goto = function(link) {
          $scope.closed = true;
          $scope.show = false;
          $location.url(link);
        };
      }
    };
  }])

  .directive('mySubscriptions', ['subscriptionService', '$location',
      function(subscriptionService, $location) {
    return {
      restrict: 'A',
      templateUrl : 'static/tpl/my_subscriptions_tpl.html',
      link: function ($scope) {
        subscriptionService.getMyScubscriptions().success(function(data) {
          $scope.subscriptions = data.data;
        }).error(function() {
          $scope.error = true;
        });
        $scope.referalLink = $location.absUrl().split('?')[0].replace(
          'u/', 'premium/?referal_username=');
      }
    };
  }])

  .directive('paymentState', ['gettextCatalog', function(gettextCatalog) {
    return {
      restrict: 'A',
      scope: {
        paymentState: '=paymentState',
      },
      templateUrl : 'static/tpl/payment_state_tpl.html',
      link: function ($scope) {
        $scope.paymentStates = {
          'PAID': gettextCatalog.getString('Zaplaceno'),
          'TIMEOUTED': gettextCatalog.getString('Vypršel časový limit na zaplacení'),
          'CREATED': gettextCatalog.getString('Vytvořeno'),
          'CANCELED': gettextCatalog.getString('Zrušeno'),
          'AUTHORIZED': gettextCatalog.getString('Předautorizováno'),
          'REFUNDED': gettextCatalog.getString('Refundováno'),
          'PARTIALLY_REFUNDED': gettextCatalog.getString('Částečně refundováno')
        };
        $scope.getLabelClass = function() {
          return {
            'PAID': 'success',
            'CREATED': 'warning',
            'TIMEOUTED': 'danger',
          }[$scope.paymentState] || 'default';
        };
      }
    };
  }])

  .directive('setCookieOnClick', ['$cookies', function($cookies) {
    return {
      restrict: 'A',
      link: function ($scope, element, attrs) {
        element.click(function() {
          $cookies.put(attrs.setCookieOnClick, 'true');
        });
      }
    };
  }])

  .directive('countFrom', ['$interval', function($interval) {
    var stop;
    return {
      restrict: 'A',
      template: '<span>{{count | number}}</span>',
      link: function ($scope, element, attrs) {
        if (angular.isDefined(stop)) {
          $interval.cancel(stop);
          stop = undefined;
        }

        $scope.count = attrs.countFrom;
        var step = 1000 / attrs.countPerSecond;

        if (attrs.countPerSecond > 0) {
          stop = $interval(function() {
            $scope.count++;
          }, step);
        }
      }
    };
  }])

  .directive('colorScaleLegend', [function() {
    return {
      restrict: 'A',
      replace: true,
      templateUrl : 'static/tpl/color_scale_legend.html',
      link: function ($scope) {
        $scope.values = [];
        for (var i = 1; i <= 10; i++) {
          $scope.values.push(i);
        }
      }
    };
  }])

  .directive('summary', ['practiceService', 'hotkeys', '$location', '$routeParams',
      function(practiceService, hotkeys, $location, $routeParams) {
    return {
      restrict: 'A',
      replace: true,
      scope: {
        controller: '=controller',
        categoryId: '=categoryId',
        category2Id: '=category2Id',
      },
      templateUrl : 'static/tpl/summary_tpl.html',
      link: function ($scope) {
        $scope.intro = $routeParams.config === 'intro';
        $scope.summary = practiceService.getSummary();
        $scope.summary.correctlyAnsweredRatio =
          $scope.summary.questions.filter(function(q) {
            return q.payload.isCorrect;
          }).length / 
          $scope.summary.questions.length;

        hotkeys.bindTo($scope).add({
          combo: 'enter',
          description: 'Pokračovat',
          callback: function() {
            var url = "/refreshpractice/" + ($scope.categoryId || "") +
              "/" + ($scope.category2Id || "");
            $location.url(url);
          }
        });

      },
    };
  }])

  .directive('tile', [function(){
    return {
      restrict: 'A',
      replace: true,
      scope: {
        category: '=category',
        index: '=index',
        clickAction: '=clickAction',
        practicePath: '=practicePath',
        viewPath: '=viewPath',
        disabled: '=disabled',
        thumbnailPath: '=thumbnailPath',
        hideSelect: '=?hideSelect',
      },
      controller : 'tileController',
      templateUrl : 'static/tpl/tile.html',
    };
  }])

  .directive('shortcut', [function() {
    return {
      restrict: 'A',
      scope: {
        shortcut: '@shortcut',
      },
      template: '<span class="pull-right shortcut-info hidden-xs hidden-sm" ' +
            'title="{{\'Klávesová zkratka: \' | translate}}{{shortcut}}"> ' +
          '&nbsp;&nbsp;[{{shortcut}}]' +
        '</span>',
      replace: true,
    };
  }])

  .directive('optionButtons', ['$rootScope', 'serverLogger', 'hotkeys',
      function($rootScope, serverLogger, hotkeys) {
    return {
      restrict: 'A',
      scope: {
        question: '=question',
        imageController: '=imageController',
        canNext: '=canNext',
        controller: '=controller',
      },
      templateUrl : 'static/tpl/option_buttons_tpl.html',
      link: function ($scope) {

        function optionSelected(event, action) {
          var option = $scope.question && $scope.question.options && $scope.question.options[action.combo[0] - 1];
          if (option && ! option.disabled) {
            $scope.controller.checkAnswer(option, true);
          }
        }

        for (var i = 1; i <= 6; i++) {
          hotkeys.bindTo($scope)
          .add({
            combo: '' + i,
            description: 'Vybrat možnost ' + i,
            callback: optionSelected
          });
        }

        $rootScope.$on('questionAnswered', function() {
            highlightOptions();
        });

        function highlightOptions() {
            ($scope.question.options || []).map(function(o) {
                o.correct = o.term_secondary ?
                  o.term_secondary.id == $scope.question.term_secondary.id :
                  o.description == $scope.question.description;
                o.selected = o.term_secondary ?
                  $scope.question.answered_term_secondary &&
                    o.term_secondary.id == $scope.question.answered_term_secondary.id :
                  o.description == $scope.question.answered_code;
                if (o.selected || o.correct) {
                  o.bgcolor = undefined;
                  o.color = undefined;
                }
                o.disabled = true;
                return o;
            });
        }
      }
    };
  }])

  .directive('questionAndAnswer', ['flashcardService', function(flashcardService) {
    return {
      restrict: 'A',
      scope: {
        question: '=question',
        imageController: '=imageController',
        clickFn: '=clickFn',
        categoryId: '=categoryId',
        category2Id: '=category2Id',
      },
      templateUrl : 'static/tpl/question_and_answer_tpl.html',
      link: function ($scope) {
        $scope.getFlashcardByDescription = function(description) {
          for (var i = 0; i < $scope.question.context.flashcards.length; i++) {
            var fc = $scope.question.context.flashcards[i];
            if (fc.description == description) {
              return fc;
            }
          }
        };
        $scope.wrongAnswers = [];
        if ($scope.question.options && $scope.question.options.length === 0) {
          var question = $scope.question.question_type == 't2ts' ?
            'term' : 'term_secondary';
          var answer = $scope.question.question_type == 'ts2t' ?
            'term' : 'term_secondary';
          flashcardService.getFlashcards({}).then(function(flashcards) {
            $scope.wrongAnswers = flashcards.filter(function(fc) {
              return fc.context_id == $scope.question.context.id &&
                fc[question] && fc[question].id == $scope.question[question].id &&
                fc[answer] && fc[answer].id != $scope.question[answer].id;
            });
          });
        }
      },
    };
  }])

  .directive('practiceHeader', ['userService', function(userService) {
    return {
      restrict: 'A',
      replace: true,
      scope: {
        question: '=question',
        categoryId: '=categoryId',
      },
      templateUrl : 'static/tpl/practice_header_tpl.html',
      link: function ($scope) {
        $scope.userService = userService;
        $scope.$watch('question', function() {
          if ($scope.question) {
            if ($scope.question.additional_info && 
                $scope.question.additional_info.contexts) {
              $scope.contextId = $scope.question.additional_info.contexts[
                $scope.question.question_type];
            } else {
              $scope.contextId = $scope.question.context.identifier;
            }
          }
        });
      }
    };
  }])

  .directive('practiceSetting', ['termsLanguageService',
      function(termsLanguageService) {
    return {
      restrict: 'A',
      replace: true,
      scope: {
        categoryId: '=categoryId',
        category2Id: '=category2Id',
      },
      templateUrl : 'static/tpl/practice_setting_tpl.html',
      link: function ($scope) {
        $scope.possibleLangs = termsLanguageService.getPossibleTermsLangs();
        $scope.setTermsLang = termsLanguageService.setTermsLang;
        $scope.getTermsLang = termsLanguageService.getTermsLang;
      }
    };
  }])

  .directive('practiceActionButtons', ['userService', 'hotkeys',
      function(userService, hotkeys) {
    return {
      restrict: 'A',
      replace: true,
      scope: {
        question: '=question',
        canNext: '=canNext',
        controller: '=controller',
      },
      templateUrl : 'static/tpl/practice_action_buttons_tpl.html',
      link: function ($scope) {
        $scope.userService = userService;

        hotkeys.bindTo($scope)
        .add({
          combo: 'enter',
          description: 'Pokračovat',
          callback: function() {
            if ($scope.canNext) {
              $scope.controller.next();
            }
          }
        })
        .add({
          combo: 'esc',
          description: 'Nevím',
          callback: function() {
            if (!$scope.canNext) {
              $scope.controller.checkAnswer(undefined, true);
            }
          }
        });

      }
    };
  }])

  .directive('imageScreenShot', ['$rootScope', '$http', '$timeout',
      function($rootScope, $http, $timeout) {
    var screenshotTaken;
    return {
      restrict: 'A',
      replace: true,
      template : '<canvas style="display: none" id="screen-shot"></canvas> ',
      link: function () {
        function takeScreenshot(event, identifier, force) {
          if (screenshotTaken && !force) {
            return;
          }
          var allSvg = document.querySelectorAll(".image-" + identifier.split('--')[0] + " svg");
          var lastSvg = allSvg[allSvg.length - 1];
          var svgData = new XMLSerializer().serializeToString(lastSvg);
          var canvas = document.getElementById("screen-shot");
          window.canvg(canvas, svgData);
          var imgSrc    = canvas.toDataURL("image/png");
          var data = {
            name : identifier,
            image : imgSrc,
          };
          $http.post('/savescreenshot/', data);
          screenshotTaken = true;
        }
        $rootScope.$on('imageDisplayed', function(event, identifier, force) {
          $timeout(function() {
            takeScreenshot(event, identifier, force);
          }, 500);
        });

      }
    };
  }])

  .directive('openQuestionsAlert', ['configService',
      function(configService) {
    return {
      restrict: 'A',
      replace: true,
      scope: {
      },
      templateUrl : 'static/tpl/open_questions_alert_tpl.html',
      link: function ($scope) {
        var restrictionKey = 'proso_models.options_count.parameters.allow_zero_options_restriction';
        $scope.configService = configService;
        $scope.openQuestionsDisabled = configService.getOverridden()[restrictionKey];

        $scope.allowOpenQuestions = function() {
          configService.override(restrictionKey, false);
          $scope.openQuestionsDisabled = false;
        };
      }
    };
  }])

  .directive('scrollTop', ['smoothScroll', function(smoothScroll) {
    return {
      restrict: 'A',
      link: function ($scope, element) {
        element.click(function() {
          var elem = document.getElementById('wrap');
          smoothScroll(elem, {
            offset: 10,
            duration: 200,
          });
        });
      }
    };
  }])

  .directive('openAnswer', ['flashcardService', 'configService', '$window', '$filter', 'serverLogger',
      function(flashcardService, configService, $window, $filter, serverLogger) {
    return {
      restrict: 'A',
      replace: true,
      scope: {
        question: '=question',
        canNext: '=canNext',
        controller: '=controller',
      },
      templateUrl : 'static/tpl/open_answer_tpl.html',
      link: function ($scope, element) {
        $scope.canNext = false;

        var question = angular.copy($scope.question);
        $scope.questionAndAnswer = toQuestionAndAnswer(question);
        $scope.questionsAndAnswers = [$scope.questionAndAnswer];

        $scope.$watch('answer', function() {
          if ($scope.answer && $scope.questionsAndAnswers.length <= 1) {
            serverLogger.error("User typed something before typeahead loaded", {    
               question : question,   
               answer : $scope.answer,   
             });
          }
        });

        flashcardService.getAllFlashcards().then(function(flashcards) {
          var qaaByAnswer = {};
          $scope.questionsAndAnswers = flashcards.filter(function(fc) {
            return fc.term && fc.term.name;
          }).map(toQuestionAndAnswer
            ).filter(function(qaa) {
              return qaa.answer;
          }).filter(function(qaa) {
            if (qaa.question == $scope.questionAndAnswer.question &&
                qaa.answer != $scope.questionAndAnswer.answer) {
              return false;
            }
            if (!qaaByAnswer[qaa.answer]) {
              qaaByAnswer[qaa.answer] = qaa;
              return true;
            } else if (qaa.question == $scope.questionAndAnswer.question) {
              qaaByAnswer[qaa.answer].flashcard = qaa.flashcard;
              qaaByAnswer[qaa.answer].question = qaa.question;
            }
            return false;
          }).sort(function(a, b){
            return a.answer.length - b.answer.length;
          });
        });

        function toQuestionAndAnswer(fc) {
          return {
            question: $filter('stripAlternatives')(
              $scope.question.question_type == 't2ts' ?
              fc.term.name : (fc.description ||
                (fc.term_secondary && fc.term_secondary.name))),
            answer: $filter('stripAlternatives')(
              $scope.question.question_type == 't2ts' ?
              (fc.term_secondary && fc.term_secondary.name) : fc.term.name),
            flashcard: fc,
          };
        }

        $scope.canAnswer = function() {
          return !$scope.canNext && $scope.answer && (
            $scope.answer.answer);
        };
        $scope.checkAnswer = function(keyboardUsed) {
          if ($scope.canAnswer()) {
            if ($scope.answer.question == $scope.questionAndAnswer.question) {
              $scope.answer = $scope.questionAndAnswer;
            }
            $scope.controller.checkAnswer(keyboardUsed);
            if ($scope.answer.answer == $scope.questionAndAnswer.answer) {
              $scope.question.isCorrect = true;
            } else {
              $scope.question.isIncorrect = true;
            }
          }
        };
        $scope.disableOpenQuestions = function() {
          var restrictionKey = 'proso_models.options_count.parameters.allow_zero_options_restriction';
          configService.override(restrictionKey, true);
          $window.location.reload();
        };

        element.children('input').focus();
        $scope.inputKeypress = function($event) {
          if ($event.which == 13) {
            $scope.checkAnswer(true);
          }
        };
      }
    };
  }])

  .directive("preloadResource", ["resourceCache", 
    function(resourceCache) {
      return { link: function (scope, element, attrs) { 
        resourceCache.put(attrs.preloadResource, element.html()); 
        element.html('');
      }};
    }
  ]);
