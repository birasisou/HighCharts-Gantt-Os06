// Karma configuration
// Generated on Fri Mar 15 2019 09:36:01 GMT+0100 (Central European Standard Time)

module.exports = function(config) {
  let configuration = {

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // plugins starting with karma- are autoloaded
    plugins: [
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-edge-launcher',
      'karma-jasmine-ajax',
      'karma-jasmine',
      'karma-verbose-reporter',
      'karma-coverage'/*,
      'karma-coverage-istanbul-reporter'  --> "karma-coverage-istanbul-reporter": "^2.0.5" DANS PACKAGE.JSON
      //*/
    ],

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine-ajax', 'jasmine'],

    // list of files / patterns to load in the browser
    files: [
      '../src/js/**/*.js',    //code
      './*[sS]pec.js',        //tests
      './**/*[sS]pec.js'
    ],

    // list of files / patterns to exclude
    exclude: [
      '../src/js/dist/all-in-one-worker.js'
    ],       //fichier concaténé avec GULP mais qui, du coup, redéclare des "let" (ce qui est interdit)

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      '../src/**/*.js': 'coverage'
    },

    coverageReporter: {
      dir: 'coverage',
      reporters: [
        //{type: 'html', subdir: 'html-report'},
        {type: 'lcov', subdir: './'}, //thml+Icov
        {type: 'text', subdir: './'}, //sans filename --> écrit dans la console
        {type: 'json', subdir: './', file: 'coverage.json'}
      ]
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    //reporters: ['verbose', 'progress', 'coverage'],
    reporters: ['progress'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_ERROR,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    //browsers: ['Chrome', 'ChromeHeadless', 'Firefox', 'FirefoxHeadless', 'Edge'],
    //MODE HEADLESS ONLY car le PC décède
//    browsers: ['Chrome_travis_ci'],
    //Pour pouvoir tester avec window
    //browsers: ['Chrome', 'FirefoxHeadless'],
    browsers: ['Chrome'],

    // e.g see https://swizec.com/blog/how-to-run-javascript-tests-in-chrome-on-travis/swizec/6647
    customLaunchers: {
      Chrome_travis_ci: {
        base: 'Chrome',
        flags: ['--no-sandbox']
      },
      FirefoxHeadless: {
        base: 'Firefox',
        flags: ['-headless']
      }
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  };

  // CUSTOM inline arguments
  if (config.verbose)
    configuration.reporters.push('verbose');
  if (config.coverage)
    configuration.reporters.push('coverage');
  if (config.firefox)
    configuration.browsers.push('FirefoxHeadless');

  //*
  if (process.env.TRAVIS) {
    configuration.browsers = ['Chrome_travis_ci', 'FirefoxHeadless'];
    configuration.logLevel = config.LOG_DEBUG;
    configuration.reporters = ['verbose', 'progress', 'coverage'];

  }//*/

  config.set(configuration);
};
