module.exports = function(grunt) {
    'use strict';

    grunt.initConfig({
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
                    'angular-i18n': 'angular-locale_cs-cz.js',
                    'proso-apps-js': 'proso-apps-all.js',
                }
            }
        },
        concat: {
            anatomy: {
                src: ['static/js/*.js', 'static/dist/js/translations.js'],
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
                flatten: true,
                src: 'bower_components/bootstrap/fonts/*',
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
                    "chroma": false,
                    "console": false,
                    "gettext": false,
                    "jQuery": false,
                    "$": false,
                    "Raphael": false,
                },
                "maxcomplexity": 7,
                "indent": 2,
                "maxdepth" : 3,
                "maxparams": 9,
            },
            dist: {
                src: 'static/js/',
            }
        },
        nggettext_compile: {
            all: {
                files: {
                    'static/dist/js/translations.js': ['static/po/*.po']
                }
            },
        },
        nggettext_extract: {
            pot: {
                files: {
                    'static/po/template.pot': ['static/tpl/*.html']
                }
            },
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
    grunt.loadNpmTasks('grunt-angular-gettext');

    grunt.registerTask('collect-libs', ['bower_concat:all', 'uglify:libs', 'copy:fonts']);
    grunt.registerTask('prepare-libs', ['shell:bower_install', 'collect-libs']);
    grunt.registerTask('prepare', ['jshint','string-replace:homepage', 'html2js:anatomy', 'concat:anatomy', 'uglify:anatomy', 'sass:anatomy', 'copy:above-fold', 'copy:images']);
    grunt.registerTask('default', ['prepare-libs', 'prepare']);
}
