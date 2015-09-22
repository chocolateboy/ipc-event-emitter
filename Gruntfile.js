'use strict';

module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        babel: {
            options: {
                sourceMaps: 'inline',
                nonStandard: false,
                optional: [ 'runtime', 'strict' ],
                plugins: [ 'source-map-support' ],
                stage: 0,
            },
            src: {
                expand: true,
                src: [
                    'src/**/*.js',
                    'examples/src/**/*.js',
                ],
                dest: 'target',
            },
            test: {
                options: {
                    plugins: [ 'babel-plugin-espower' ],
                },
                expand: true,
                src: 'test/src/**/*.js',
                dest: 'target',
            }
        },
        clean: [ 'target' ],
        mochaTest: {
            options: {
                timeout: 5000
            },
            test: {
                src: [
                    'target/test/**/*.js',
                ]
            },
        },
        shell: {
            example: {
                command: 'node ./target/examples/src/parent.js'
            }
        }
    })

    grunt.registerTask('compile', [ 'babel' ]);
    grunt.registerTask('example', [ 'compile', 'shell:example' ]);
    grunt.registerTask('test', [ 'compile', 'mochaTest' ]);
    grunt.registerTask('default', [ 'test' ]);
};
