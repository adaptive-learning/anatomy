angular.module('proso.anatomy.controllers')

.controller('settingsController', ['$scope', 'userService', 'configService', 'customConfigService', 'gettextCatalog',
    function($scope, userService, configService, customConfigService, gettextCatalog) {
  var keys = {
    targetDifficulty: "item_selector.parameters.target_probability",
    setLength: 'practice.common.set_length',
    allowOpenQuestions: "options_count.parameters.allow_zero_options",
    forbidWriting: "options_count.parameters.allow_zero_options_restriction",
  };
  $scope.form = {
    targetDifficulty: configService.getConfig("proso_models", keys.targetDifficulty, 65),
    questionType: getQuestionType(),
    setLength: configService.getConfig("proso_models", keys.setLength, 10),
  };
  console.log($scope.form);
  $scope.user = userService.user;

  $scope.save = function() {
    $scope.message = gettextCatalog.getString('Ukládání změn...');
    $scope.messageType = 'info';

    customConfigService.setConfig({
      app_name: 'proso_models',
      key : keys.targetDifficulty,
      value: $scope.form.targetDifficulty,
    });

    customConfigService.setConfig({
      app_name: 'proso_models',
      key : keys.setLength,
      value: $scope.form.setLength,
    });

    customConfigService.setConfig({
      app_name: 'proso_models',
      key : keys.allowOpenQuestions,
      value: $scope.form.questionType != 'options-only',
    });

    customConfigService.setConfig({
      app_name: 'proso_models',
      key : keys.forbidWriting,
      value: $scope.form.questionType != 'all',
    }).success(function () {
      $scope.message = gettextCatalog.getString('Nastavení bylo uloženo.');
      $scope.messageType = 'success';
    }).error(function () {
      $scope.message = gettextCatalog.getString('Ukládání nastavení selhalo.');
      $scope.messageType = 'danger';
    });
  };

  function getQuestionType() {
    var allowOpenQuestions = configService.getConfig("proso_models", keys.allowOpenQuestions);
    var forbidWriting = configService.getConfig("proso_models", keys.forbidWriting);
    if (allowOpenQuestions === false) {
      return 'options-only';
    } else if (forbidWriting === true) {
      return 'no-write';
    } else {
      return 'all';
    }
  }
}]);
