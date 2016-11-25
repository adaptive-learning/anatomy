angular.module('proso.anatomy.controllers')

.controller('premiumController', ['$scope', 'userService', 'subscriptionService', 'smoothScroll', '$routeParams', 'gettextCatalog',
    function($scope, userService, subscriptionService, smoothScroll, $routeParams, gettextCatalog){
  $scope.userService = userService;
  $scope.discountCode = $routeParams.discount_code;
  $scope.discountCodeInput = $routeParams.discount_code;
  $scope.isSubscribed = subscriptionService.isSubscribed;

  var errorMessages = {
    'discount_code_limit_exceeded' : gettextCatalog.getString(
      "Zadaný slevový kód byl již použit maximálním počtem uživatelů."),
    'discount_code_already_used' : gettextCatalog.getString(
      "Zadaný slevový kód nemůžež použít podruhé."),
  };

  subscriptionService.getPlans($routeParams.discount_code).success(function(data) {
    $scope.plans = data.data;
    loadDiscountCodeUsage();
  }).error(function(data, status) {
    if ($routeParams.discount_code && status == 404) {
      $scope.error = gettextCatalog.getString(
        "Byl zadán neplatný slevový kód '{{discountCode}}'.", $scope);
    } else if ($routeParams.discount_code && status == 400) {
      $scope.error = errorMessages[data.error_type];
    } else {
      $scope.error = true;
    }
  }).finally(scrollToPlans);


  function scrollToPlans() {
    if ($routeParams.discount_code) {
      var elem = document.getElementById("plans");
      smoothScroll(elem, {
        offset: 10,
        duration: 200,
      });
    }
  }

  function loadDiscountCodeUsage() {
    if ($routeParams.discount_code) {
      subscriptionService.getDiscountCode($routeParams.discount_code).success(function(data) {
        $scope.discountCodeUsage = data.data;
        $scope.discountCodeUsage.usage_left = Math.max(0,
          $scope.discountCodeUsage.usage_limit - $scope.discountCodeUsage.usage);
      });
    }
  }

  $scope.buyPlan = function(plan) {
    subscriptionService.buyPlan(plan,
      $routeParams.discount_code,
      $routeParams.referral_username);
  };
}]);
