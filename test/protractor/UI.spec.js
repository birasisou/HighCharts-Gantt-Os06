// const EXCEPTIONS = require('./src/js/utils/exceptions.js');
// const EXCEPTIONS = require('../../src/js/utils/exceptions.js');

describe('The main page', function () {

  beforeEach(function () {
    // jasmine.Ajax.install();
    console.log("browser", browser);
    dv.ignoreSynchronization = true;
  });
  /*
  afterEach(function () {
    jasmine.Ajax.uninstall();
  });
  // */

  it("affiche un message d'alerte si l'url de la page ne contient pas les paramètres minimums nécessaires à l'initialisation de la page", function () {



  // it('should display an error message in the alert if no parameters are provided', function () {
    browser.waitForAngularEnabled(false);
    browser.get('/index.html');
    element(by.className('ajs-content')).getText().then(console.log);
    browser.sleep(5000);
    expect(element(by.className('ajs-content')).getText()).toEqual("Erreur lors de la récupération de l'ID-Oris ou de l'host");
    // expect(element(by.className('ajs-content')).getText()).toEqual(new EXCEPTIONS.NoParametersDetectedInURI().description);
    browser.sleep(5000);
    console.log("");
    console.log("");
    console.log("");
    browser.getCurrentUrl().then(console.log);
  });
});