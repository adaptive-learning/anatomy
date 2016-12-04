module.exports = function(grunt) {
    'use strict';
    require('jit-grunt')(grunt, {
      'nggettext_extract': 'grunt-angular-gettext',
      'nggettext_compile': 'grunt-angular-gettext',
    });

    try {
      var thumbnails = grunt.file.readJSON('static/dist/thumbnails.json');
    } catch (e) {
      var thumbnails = {};
    }

    grunt.initConfig({
        bower_concat: {
            all: {
                dest: 'static/dist/js/bower-libs.js',
                cssDest: 'static/dist/css/bower-libs.css',
                dependencies: {
                    'angular': ['jquery'],
                },
                mainFiles: {
                    'raphael-pan-zoom': 'src/raphael.pan-zoom.js',
                    'angular-i18n': 'angular-locale_cs-cz.js',
                    'proso-apps-js': 'proso-apps-all.js',
                    'angular-count-to': 'src/count-to.js',
                },
                exclude: [
                  'proso-apps-js',
                  'angular-google-experiments',
                ]
            }
        },
        concat: {
            anatomy: {
                src: [
                  '<%= jshint.dist.src %>',
                  '<%= nggettext_compile.all.dest %>',
                  '<%= html2js.anatomy.dest %>',
                ],
                dest: 'static/dist/js/anatomy.js'
            },
            unminifiable: {
                src: [
                  'bower_components/proso-apps-js/proso-apps-all.js',
                  'bower_components/angular-google-experiments/googleExperiments.min.js',
                ],
                dest: 'static/dist/js/unminifiable-libs.js'
            },
            css: {
                src: [
                  'static/dist/css/app-with-images.css',
                  'static/dist/css/bower-libs.css',
                ],
                dest: 'static/dist/css/all.min.css'
            }
        },
        copy: {
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
            },
            'proso-apps-js': {
                src: 'bower_components/proso-apps-js/proso-apps-all.js',
                dest: 'static/dist/js/proso-apps-all.js'
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
                "maxparams": 12,
            },
            dist: {
                src: 'static/js/**/*.js',
            }
        },
        nggettext_compile: {
            all: {
                src: ['static/po/*.po'],
                dest:'static/dist/js/translations.js',
            },
        },
        nggettext_extract: {
            pot: {
                src: [
                  '<%= html2js.anatomy.src %>',
                  '<%= jshint.dist.src %>',
                ],
                dest: 'static/dist/client.pot'
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
                command: 'node_modules/bower/bin/bower install'
            }
        },
        cssUrlEmbed: {
          encodeDirectly: {
            options: {
              baseDir: './',
              skipUrlsLargerThan: '40 KB',
            },
            files: {
              'static/dist/css/app-with-images.css': [
                'static/dist/css/app.css'],
              'templates/dist/above-fold-with-images.css': [
                'templates/dist/above-fold.css'],
            }
          }
        },
        'string-replace': {
            homepage: {
              options: {
                replacements: [
                  {
                      pattern: /\{\{\s*(("[^"]+")|('[^']+'))\s*\|\s*translate\s*\}\}/g,
                      replacement: '{% trans $1 %}'
                  }, {
                  pattern: /src="(\/static\/img\/[^"]*)"/g,
                  replacement: function (match, p1) {
                      if (thumbnails[p1]) {
                        match = match.replace(p1, 'data:image/png;base64,' + thumbnails[p1]);
                      }
                      return match;
                    }
                  }
                ]
              },
              src: [
                'static/tpl/homepage.html',
                'static/tpl/premium.html',
                'static/tpl/overview_tpl.html',
              ],
              dest: 'templates/generated/',
            },
            'above-fold': {
              options: {
                replacements: [
                  {
                      pattern: 'sourceMappingURL=',
                      replacement: 'sourceMappingURL=/static/dist/css/'
                  }
                ]
              },
              src: 'static/dist/css/above-fold.css',
              dest: 'templates/dist/above-fold.css'
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
                src: '<%= bower_concat.all.dest %>',
                dest: 'static/dist/js/bower-libs.min.js'
            },
            anatomy: {
                options: {
                    sourceMap: true,
                    sourceMapIncludeSources: true,
                    sourceMapName: 'static/dist/js/anatomy.min.js.map'
                },
                src: '<%= concat.anatomy.dest %>',
                dest: 'static/dist/js/anatomy.min.js'
            },
            'anatomy-tpls': {
                options: {
                    sourceMap: true,
                    sourceMapIncludeSources: true,
                    sourceMapName: 'static/dist/js/anatomy-tpls.min.js.map'
                },
                src: 'static/dist/js/anatomy-tpls.js',
                dest: 'static/dist/js/anatomy-tpls.min.js'
            },

        },
        watch: {
            'anatomy-js': {
                files: '<%= concat.anatomy.src %>',
                tasks: ['anatomy-js']
            },
            'unminifiable-libs': {
                files: '<%= concat.unminifiable.src %>',
                tasks: ['concat:unminifiable']
            },
            'anatomy-css': {
                files: 'static/sass/*.sass',
                tasks: ['anatomy-css']
            },
            'anatomy-tpls': {
                files: '<%= html2js.anatomy.src %>',
                tasks: ['anatomy-tpls']
            },
            'anatomy-nggettext_compile': {
                files: '<%= nggettext_compile.all.src %>',
                tasks: ['newer:nggettext_compile']
            }
        }
    });

    grunt.registerTask('static-check', ['newer:jshint:dist']);
    grunt.registerTask('collect-libs', ['bower_concat:all', 'concat:unminifiable', 'uglify:libs', 'copy:fonts', 'copy:proso-apps-js']);
    grunt.registerTask('prepare-libs', ['shell:bower_install', 'collect-libs']);
    grunt.registerTask('anatomy-js', ['static-check', 'newer:concat:anatomy', 'newer:uglify:anatomy', 'newer:nggettext_extract:pot']);
    grunt.registerTask('prepare', ['newer:nggettext_compile', 'anatomy-tpls', 'anatomy-js', 'anatomy-css', 'newer:copy:images']);
    grunt.registerTask('anatomy-tpls', ['newer:string-replace:homepage', 'newer:html2js:anatomy',  'newer:nggettext_extract:pot']);
    grunt.registerTask('anatomy-css', ['sass:anatomy', 'newer:string-replace:above-fold', 'cssUrlEmbed', 'concat:css']);
    grunt.registerTask('default', ['prepare-libs', 'prepare']);
};
