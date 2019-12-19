module.exports = function (grunt) {
  grunt.initConfig({

    // define source files and their destinations
    uglify: {
      options: {
        mangle: false
      },
      all_personal_js: {
        files: [
          {
            expand: true,
            cwd: "src/js/",
            src: ["**/*.js", "!**/*.min.js"],
            dest: "src/js/",
            ext: ".min.js",
            flatten: true,   // remove all unnecessary nesting
          }
        ]
      }
    }
  });

// load plugins
  grunt.loadNpmTasks('grunt-contrib-uglify');

// register at least this one task
  grunt.registerTask('default', [ 'uglify' ]);


};
