// Karma configuration
// Generated on Fri Mar 15 2019 09:36:01 GMT+0100 (Central European Standard Time)

module.exports = function(config) {
  var configuration = {

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // plugins starting with karma- are autoloaded
    plugins: ['karma-chrome-launcher', 'karma-firefox-launcher', 'karma-edge-launcher', 'karma-jasmine', 'karma-verbose-reporter', 'karma-coverage'],

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    files: [
      '../src/js/**/*.js',    //code
      './*[sS]pec.js',        //tests
      './**/*[sS]pec.js'
    ],

    // list of files / patterns to exclude
    exclude: [],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      '../src/**/*.js': 'coverage'
    },

    coverageReporter: {
      dir: 'coverage',
      reporters: [
        {type: 'html', subdir: 'lcov-report'},
        {type: 'json', subdir: './', file: 'coverage.json'}
      ]
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['verbose', 'progress', 'coverage'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_DEBUG,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    //browsers: ['Chrome', 'ChromeHeadless', 'Firefox', 'FirefoxHeadless', 'Edge'],
    //MODE HEADLESS ONLY car le PC décède
    browsers: ['Chrome_travis_ci', 'FirefoxHeadless'],

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

  //*
  if (process.env.TRAVIS) {
    //configuration.browsers = ['Chrome_travis_ci'];
    configuration.browsers = ['Chrome_travis_ci', 'FirefoxHeadless'];
  }//*/

  config.set(configuration);
};
