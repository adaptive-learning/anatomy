module.exports = function(grunt) {
    'use strict';

    grunt.initConfig({
        bboxcache: {
            default: {
                files: {
                    'static/dist/bboxcache.json': ['static/map/*.svg'],
                },
            },
        },
        bower_concat: {
            all: {
                dest: 'static/dist/js/bower-libs.js',
                cssDest: 'static/dist/css/bower-libs.css',
                dependencies: {
                    'kartograph.js': ['jquery'],
                    'qtip2': ['jquery'],
                    'raphael-pan-zoom': ['raphael'],
                },
                mainFiles: {
                    'raphael-pan-zoom': 'src/raphael.pan-zoom.js',
                    'angular-i18n': 'angular-locale_cs-cz.js'
                }
            }
        },
        concat: {
            anatomy: {
                src: ['static/js/*.js'],
                dest: 'static/dist/js/anatomy.js'
            }
        },
        copy: {
            'above-fold': {
                src: 'static/dist/css/above-fold.css',
                dest: 'templates/dist/above-fold.css'
            },
            'images': {
                expand: true,
                cwd: 'static/img',
                src: ['**'],
                dest: 'static/dist/img/'
            },
            'fonts': {
                expand: true,
                cwd: 'bower_components/bootstrap/fonts/',
                src: ['**'],
                dest: 'static/dist/fonts/'
            }
        },
        html2js: {
            options: {
                base: '.',
                module: 'proso.anatomy.templates',
                singleModule: true,
                useStric: true
            },
            anatomy: {
                src: ['static/tpl/*.html'],
                dest: 'static/dist/js/anatomy.html.js',
            }
        },
        jshint: {
            options: {
                "undef": true,
                "unused": true,
                "browser": true,
                "globals": {
                    "angular": false,
                    "bboxCache": false,
                    "chroma": false,
                    "console": false,
                    "gettext": false,
                    "jQuery": false,
                },
                "maxcomplexity": 6,
                "indent": 2,
                "maxstatements": 12,
                "maxdepth" : 3,
                "maxparams": 12,
            },
            dist: {
                src: 'static/js/',
            }
        },
        sass: {
            options: {
                style: "compressed"
            },
            anatomy: {
                files: [{
                    expand: true,
                    cwd: 'static/sass',
                    src: ['*.sass'],
                    dest: 'static/dist/css',
                    ext: '.css'
                }]
            }
        },
        shell: {
            bower_install: {
                command: 'node_modules/bower/bin/bower install -f'
            }
        },
        'string-replace': {
            homepage: {
              options: {
                replacements: [
                  {
                      pattern: /\{\{\s*(("[^"]+")|('[^']+'))\s*\|\s*translate\s*\}\}/g,
                      replacement: '{% trans $1 %}'
                  }
                ]
              },
              src: ['static/tpl/homepage.html'],
              dest: 'templates/generated/homepage.html',
            },
            bboxcache: {
                options: {
                    replacements: [{
                        pattern: '{{bboxes}}',
                        replacement: "<%= grunt.file.read('static/dist/bboxcache.json') %>"
                    }]
                },
                src: ['static/jstpl/bbox.js'],
                dest: 'static/dist/js/bbox.js',
            }
        },
        uglify: {
            libs: {
                options: {
                    mangle: {
                        except: ['Kartograph', 'Raphael']
                    },
                    sourceMap: true,
                    sourceMapIncludeSources: true,
                    sourceMapName: 'static/dist/js/bower-libs.min.js.map'
                },
                src: 'static/dist/js/bower-libs.js',
                dest: 'static/dist/js/bower-libs.min.js'
            },
            anatomy: {
                options: {
                    sourceMap: true,
                    sourceMapIncludeSources: true,
                    sourceMapName: 'static/dist/anatomy.min.js.map'
                },
                src: 'static/dist/js/anatomy.js',
                dest: 'static/dist/js/anatomy.min.js'
            },
            'anatomy-tpls': {
                options: {
                    sourceMap: true,
                    sourceMapIncludeSources: true,
                    sourceMapName: 'static/dist/anatomy-tpls.min.js.map'
                },
                src: 'static/dist/js/anatomy-tpls.js',
                dest: 'static/dist/js/anatomy-tpls.min.js'
            },

        },
        watch: {
            'anatomy-js': {
                files: 'static/js/*.js',
                tasks: ['concat:anatomy', 'uglify:anatomy']
            },
            'anatomy-css': {
                files: 'static/sass/*.sass',
                tasks: ['sass:anatomy', 'copy:above-fold']
            },
            'anatomy-tpls': {
                files: 'static/tpl/*.html',
                tasks: ['string-replace:homepage', 'html2js:anatomy', 'concat:anatomy', 'uglify:anatomy']
            }
        }
    });

    grunt.loadNpmTasks('grunt-bower-concat');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-string-replace');
    grunt.loadNpmTasks('grunt-html2js');

    grunt.registerTask('bboxcache-all', ['bboxcache', 'string-replace:bboxcache']);
    grunt.registerTask('collect-libs', ['bower_concat:all', 'uglify:libs', 'copy:fonts']);
    grunt.registerTask('prepare-libs', ['shell:bower_install', 'collect-libs']);
    grunt.registerTask('prepare', ['jshint','string-replace:homepage', 'html2js:anatomy', 'concat:anatomy', 'uglify:anatomy', 'sass:anatomy', 'copy:above-fold', 'copy:images']);
    grunt.registerTask('default', ['bboxcache-all', 'prepare-libs', 'prepare']);

    /* CUSTOM TASKS */

    grunt.registerMultiTask('bboxcache', 'Precompute bbox of svg paths.', function() {

        var raphael = require('node-raphael');
        var DomJS = require("dom-js").DomJS;
        var RANDOM_CONST = 42;

        function mapNameFromFilepath (filepath) {
            var splittedPath = filepath.split('/');
            var filename = splittedPath[splittedPath.length -1];
            return filename.split('.')[0];
        }

        // Iterate over all specified file groups.
        this.files.forEach(function(f) {
            var cache = {
                bboxes : {},
                maps : {},
            };

            f.src.filter(function(filepath) {
                // Warn on and remove invalid source files (if nonull was set).
                if (!grunt.file.exists(filepath)) {
                    grunt.log.warn('Source file "' + filepath + '" not found.');
                    return false;
                } else {
                    return true;
                }
            }).map(function(filepath) {

                var domjs = new DomJS();

                domjs.parse(grunt.file.read(filepath), function(err, dom) {
                    var mapName = mapNameFromFilepath(filepath);
                    var map = {
                        width :  parseInt(dom.attributes.width),
                        height :  parseInt(dom.attributes.height),
                    };
                    cache.maps[mapName] = map;

                    raphael.generate(RANDOM_CONST, RANDOM_CONST, function draw(paper) {
                        dom.children.filter(function(e) {
                            return e.name == 'g';
                        }).map(function (e) {
                            return e.children.filter(function(ch) {
                                return ch.name == 'path' && ch.attributes['data-code'];
                            }).map(function(ch) {
                                var d = ch.attributes.d;
                                var code = ch.attributes['data-code'];
                                if (code) {
                                    var path = paper.path(d);
                                    var bbox =  path.getBBox();
                                    var keys = ['x', 'y', 'cx', 'cy', 'x2', 'y2', 'width', 'height'];
                                    for (var j = 0; j < keys.length; j++) {
                                        bbox[keys[j]] = Math.round(bbox[keys[j]]);
                                    }
                                    bbox.map = mapName;
                                    if (!cache.bboxes[code]) {
                                        cache.bboxes[code] = bbox;
                                    }
                                }
                            });
                        });
                    });
                });
                return;
            });

            // Write the destination file.
            grunt.file.write(f.dest, JSON.stringify(cache));

            // Print a success message.
            grunt.log.writeln('File "' + f.dest + '" created.');
        });
    });
}
