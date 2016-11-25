angular.module('proso.anatomy.controllers')

.controller('shareController', ['$scope', '$modalInstance', 'loginModal', 'userService', 'gettextCatalog', '$analytics', '$location', '$window', 'data',
    function ($scope, $modalInstance, loginModal, userService, gettextCatalog, $analytics, $location, $window, data) {

  $scope.credentials = {};
  $scope.alerts = [];
  $scope.title = data.shareTitle;
  $scope.url = data.shareUrl;
  $scope.demoTitle = data.shareDemoTitle;

  $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
  };

  $scope.openSharePage = function(site) {
    var siteUrls = {
      facebook : "https://www.facebook.com/sharer/sharer.php?u=",
      twitter : "http://twitter.com/home?status=",
      google : "https://plus.google.com/share?url=",
      demo : "",
    };
    if (userService.user.username) {
      var shareUrl = siteUrls[site] + data.shareUrl;
      $window.open(shareUrl, "_blank");
    } else {
      loginModal.open();
    }
  };

  $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
  };
}]);
