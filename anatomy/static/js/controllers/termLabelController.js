angular.module('proso.anatomy.controllers')

.controller('termLabelController', ['$scope', '$element', 'colorScale', 'gettextCatalog',
    function($scope, $element, colorScale, gettextCatalog) {
    'use strict';
  $element.addClass('label');
  $element.addClass('label-default');
  $scope.$watch('flashcard.prediction', update);

  function update() {
    $element.css('border-bottom', '5px solid #777');
    if ($scope.flashcard.prediction) {
      $element.css('border-bottom', '5px solid ' + 
        colorScale(Math.ceil(10 * $scope.flashcard.prediction) / 10).hex());
      if ($scope.flashcard.practiced) {
        $element.css('border-left', '5px solid #fe3');
      }
      if ($scope.flashcard.mastered) {
        $element.css('border-left', '5px solid #5ca03c');
      }
      var alternativeNames = $scope.flashcard.term.name.split(';').splice(1).join('<br>');
      $element.tooltip({
        html : true,
        placement: 'bottom',
        container: 'body',
        title : ($scope.flashcard.term_secondary && $scope.flashcard.context ?
             '<div>' +
               $scope.flashcard.context.name + ': ' +
               '<strong>' + $scope.flashcard.term_secondary.name + '</strong>' +
             '</div><br>':
             '') +
              '<div class="skill-tooltip">' +
              gettextCatalog.getString('Odhad znalosti') +
              ' <span class="badge badge-default">' +
                '<i class="color-indicator" style="background-color :' +
                colorScale(Math.ceil(10 * $scope.flashcard.prediction) / 10).hex() + '"></i>' +
                (Math.ceil(10 * $scope.flashcard.prediction)) + ' / 10 ' +
              '</span>' +
             '</div>' +
             (alternativeNames ?
             '<div>' +
              gettextCatalog.getString('Alternativní názvy') +
              ':<br> <strong>' + alternativeNames + '</strong>' +
             '</div>':
             ''),
      });
    }
  }
  update();
}]);

