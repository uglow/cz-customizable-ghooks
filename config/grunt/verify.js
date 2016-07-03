module.exports = function (grunt) {
  'use strict';

  var path = require('path');
  var pathJoin = function(item) { return path.join(item); };

  grunt.extendConfig({
    eslint: {
      options: {
        configFile: path.join('config/verify/.eslintrc'),
        quiet: true // Report errors only
      },
      all: {
        src: [
            'lib/**/*.js',
            'config/**/*.js'
          ].map(pathJoin)
      }
    },

    watch: {
      verify: {
        options: {
          spawn: true
        },
        files: [
            'lib/**/*.js',
            'config/**/*.js'
          ].map(pathJoin),
        tasks: [
            'newer:eslint:all'
          ]
      }
    }
  });

  grunt.registerTask('verify', 'Run all the verify tasks', [
      'eslint:all'
    ]);
};
