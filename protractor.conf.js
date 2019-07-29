// protractor.conf.js
exports.config = {
  framework: 'jasmine',

  // baseUrl: 'file:///' + __dirname,
//  baseUrl: 'http://localhost:69/ID-420', // + __dirname,
  baseUrl: 'http://localhost:69/ID-420/' + __dirname,

  onPrepare: function(){
    /**
     * If you are testing against a non-angular site - set ignoreSynchronization setting to true
     *
     * If true, Protractor will not attempt to synchronize with the page before
     * performing actions. This can be harmful because Protractor will not wait
     * until $timeouts and $http calls have been processed, which can cause
     * tests to become flaky. This should be used only when necessary, such as
     * when a page continuously polls an API using $timeout.
     *
     * @type {boolean}
     */
    browser.ignoreSynchronization = true;

    global.dv = browser.driver;

    // By default, Protractor use data:text/html,<html></html> as resetUrl, but
    // location.replace from the data: to the file: protocol is not allowed
    // (we'll get ‘not allowed local resource’ error), so we replace resetUrl with one
    // with the file: protocol (this particular one will open system's root folder)
    browser.resetUrl = 'file://';
  },

  seleniumAddress: 'http://localhost:4444/wd/hub',

  specs: [
    'test/protractor/**/*.spec.js',
  ],

  exclude: [
    'src/js/index.js'
  ],

  capabilities: {
    browserName: 'chrome',
    /*
    proxy: {
      proxyType: 'manual',
      httpProxy: 'localhost:69/ID-420'
    }, //*/
    chromeOptions: {
      // --allow-file-access-from-files - allow XHR from file://
      args: ['allow-file-access-from-files']
    }
  }
};