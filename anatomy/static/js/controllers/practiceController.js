angular.module('proso.anatomy.controllers')

.controller('practiceController', ['$scope', '$routeParams', '$timeout', '$filter', '$rootScope',
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
              $scope.canNext = false;
              imageService.setImage(active.context.content, setImageCallback);
            } else if (active.additional_info) {
              active.additional_info = angular.fromJson(active.additional_info);
              var contextId = active.additional_info.contexts[active.question_type];
              if (contextId) {
                contextService.getContextByIdentifier(contextId).then(function(context) {
                  context.content = angular.fromJson(context.content);
                  $scope.canNext = false;
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
            if (!(userService.user.profile && userService.user.profile.subscribed) &&
                $scope.categoryId != 'relations') {
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


