angular.module('proso.anatomy.controllers')

.controller('reloadController', ['$window', function($window){
    'use strict';
    $window.location.reload();
}]);
