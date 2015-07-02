;(function(window, undefined){
    var cache = {{bboxes}};
    
    function resize(bbox, paper) {
      if (window.location.hash.indexOf(bbox.map) == -1) {
          return;
      }
      var map = cache.maps[bbox.map];
      var transform = getTransform(paper, map);
      var scaledBBox = {}
      var keys = ['x', 'y', 'cx', 'cy', 'x2', 'y2', 'width', 'height'];
      for (var j = 0; j < keys.length; j++) {
        var offset =  j >= 6 ? 0 :
            j % 2 === 0 ? transform.x : transform.y;
        scaledBBox[keys[j]] = (bbox[keys[j]] + offset) / transform.scale;
      }
      return scaledBBox;
    }
    
    function getTransform(paper, map) {
        var transform = {
            x : 0,
            y : 0,
            scale : 1
        };
        var origRatio = map.width / map.height;
        var currRatio = paper.width / paper.height;;
        if (origRatio < currRatio) {
          transform.scale = map.height / paper.height;
          transform.x = (paper.width * transform.scale - map.width) /2;
        } else {
          transform.scale = map.width / paper.width;
          transform.y = (paper.height * transform.scale - map.height) /2;
        }
        return transform;
    }
    
    window.bboxCache = {
      get : function(code, paper) {
        if (paper && cache.bboxes[code] && cache.bboxes[code].map) {
            return resize(cache.bboxes[code], paper)
        }
        return cache.bboxes[code];
      },
      set : function(code, value) {
        if (!cache.bboxes[code]) {
          cache.bboxes[code] = value;
        }
      },
      setKey : function(code, oldKey) {
        if (!cache.bboxes[code] && cache.bboxes[oldKey]) {
          cache.bboxes[code] = cache.bboxes[oldKey];
        }
      },
    }
})(window);