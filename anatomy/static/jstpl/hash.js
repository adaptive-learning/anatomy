;(function(window, undefined){
    var hashes = {{hashes}};
    function get_hash(filename) {
        return hashes[filename] ? hashes[filename] : "";
    }
    window.hash = function(filename) {
        return filename + "?hash=" + get_hash(filename);
    }
})(window);
