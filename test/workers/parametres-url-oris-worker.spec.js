describe("Worker functions", function () {
  let SPEC_WORKER_CONFIG = undefined,
    testUrl = "http://www.localhost:8080/id-000192.168.1.74424011-0/index.html?data=main_gestion.ini&id=uniqueID&start=d1&end=d2&category=cat&is-milestone=bool&color=rgb&complete=percentage",
    mock_data = undefined,
    response_content = undefined,
    fake_response = undefined,
    noFunctions = undefined,
    expected_gantt_oris_data = {
      valid: {},
      invalid: {}
    };


  beforeEach(function () {
    //  LoggerModule.setDebug("log");

    mock_data = {
      valid: [
        {
          uniqueID: "id-0",                 // ID
          d1: "2019-05-17T06:49:13.878Z",   // start
          d2: "2019-05-18T09:00:00.000Z",   // end
          cat: "",                          // category
          bool: "false",                    // is-milestone
          rgb: "f00",                       // color
          percentage: "0.4"                 // completion
        },
        {
          uniqueID: "id-1",
          d1: "2019-04-01T09:00:00.000Z",
          d2: "2019-04-18T09:00:00.000Z",
          cat: "Category 1",
          bool: "false",
          rgb: "0f0",
          percentage: "0.4"
        },
        {
          uniqueID: "id-2",
          d1: "2019-04-01T09:00:00.000Z",
          d2: "null",
          cat: "Milestones",
          bool: "true",
          rgb: "f0ff0f",
          percentage: "0.9"
        }
      ],
      invalid: [
        /*{
          uniqueID: "id-invalid-2",         // Ne peut pas être une milestone (bool=true) ET avoir une date de fin (D2)
          d1: "2019-05-17T06:49:13.878Z",
          d2: "2019-05-18T09:00:00.000Z",
          cat: "",
          bool: "true",
          rgb: "000",
          percentage: ""
        }, //*/
        {
          uniqueID: "id-invalid-3",       // d2 < d1
          d1: "2019-04-19T09:00:00.000Z",
          d2: "2019-04-18T09:00:00.000Z",
          cat: "",
          bool: "false",
          rgb: "fcffcf",
          percentage: "0.1"
        },
      ]
    };
    response_content = {
      mains: mock_data.valid.concat(mock_data.invalid),
      osef: {
        ceci: 0,
        n_est: true,
        pas: false,
        utile: "!"
      }
    };
    fake_response = {
      success_mixed: {
        status: 200,
        responseText: JSON.stringify(response_content),
        response: JSON.stringify(response_content)
      },
      success_only_valid: {
        status: 200,
        responseText: JSON.stringify({ mains: mock_data.valid }),
        response: JSON.stringify({ mains: mock_data.valid  })
      },
      no_root: {
        status: 200,
        responseText: JSON.stringify(response_content.osef),
        response: JSON.stringify(response_content.osef)
      },
      no_data: {
        status: 200,
        responseText: JSON.stringify({ mains: mock_data.invalid }),
        response: JSON.stringify({ mains: mock_data.invalid })
      },
      status_404: {
        status: 404,
        responseText: JSON.stringify(response_content),
        response: JSON.stringify(response_content)
      },
      status_0: {
        status: 0,
        responseText: JSON.stringify(response_content),
        response: JSON.stringify(response_content)
      }
    };

    // Pour fake requests
    jasmine.Ajax.install();
    SPEC_WORKER_CONFIG = new ParametresUrlOris(testUrl);
    noFunctions = SPEC_WORKER_CONFIG.getAllButFunctions();

    let validLength = mock_data.valid.length;
    while (validLength--) {
      expected_gantt_oris_data.valid[mock_data.valid[validLength].uniqueID] = new OrisGanttTask(mock_data.valid[validLength], noFunctions).userOptions;
    }
    let invalidLength = mock_data.invalid.length;
    while (invalidLength--) {
      expected_gantt_oris_data.invalid[mock_data.invalid[invalidLength].uniqueID] = new OrisGanttTask(mock_data.invalid[invalidLength], noFunctions).rawUserOptions;
    }

    window.addEventListener("message", function (e) {
      if (e.data.error)
        LoggerModule.warn("\n[window.onmessage] e.data.error", e.data.error);

      if (e.data.updatedTasks)
        LoggerModule.warn("\n[window.onmessage] Object.keys(e.data.updatedTasks)", Object.keys(e.data.updatedTasks));

      if (e.data.invalidTasks)
        LoggerModule.warn("\n[window.onmessage] Object.keys(e.data.invalidTasks)", Object.keys(e.data.invalidTasks));
    });

    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;
  });

  // don't forget to uninstall as well...
  afterEach(function() {
    jasmine.Ajax.uninstall();
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });

  // TODO Jasmine responseTimeout ne fonctionne pas et n'est pas documenté
  //      jasmine.clock().install fait tout bugger
  xit('WORKER_GET should postError on request Timeout', function (done) {
    window.addEventListener("message", function (e) {
      // Fin GET+Traitement
      if (e.data.done) {
        expect(window.autoUpdateData).toHaveBeenCalled();
        expect(window.WORKER_GET).toHaveBeenCalled();
        //http://dummy.restapiexample.com/api/v1/employees
        expect(window.customJsonParse).not.toHaveBeenCalled();
        expect(window.extractData).not.toHaveBeenCalled();
        expect(window.updateLocal).not.toHaveBeenCalled();

        // async Jasmine... J'ai pas compris
        done()
      }
    });

    // Espion
    spyOn(window, 'autoUpdateData').and.callThrough();
    spyOn(window, 'postMessage').and.callThrough();
    spyOn(window, 'WORKER_GET').and.callThrough();
    spyOn(window, 'customJsonParse').and.callThrough();
    spyOn(window, 'extractData').and.callThrough();
    spyOn(window, 'updateLocal').and.callThrough();
    spyOn(window, 'postError').and.callThrough();

    window.postMessage({
      CONFIG: noFunctions,
      START_AUTO: true            // empêcher le GET auto de démarrer
    }, "*");

    jasmine.clock().tick(5001);
    setTimeout(function () {
      var request = jasmine.Ajax.requests.mostRecent();
      LoggerModule.warn("fake timeout");
      jasmine.Ajax.requests.mostRecent().responseTimeout();

      done()
    }, 500);
  });

  it('(statusCode !== 200) WORKER_GET should postError on non-OK status', function (done) {

      // Spies
      let autoUpdateDataSpy = spyOn(window, 'autoUpdateData').and.callThrough();
      let WORKER_GETSpy = spyOn(window, 'WORKER_GET').and.callThrough();
      let customJsonParseSpy = spyOn(window, 'customJsonParse').and.callThrough();
      let extractDataSpy = spyOn(window, 'extractData').and.callThrough();
      let updateLocalSpy = spyOn(window, 'updateLocal').and.callThrough();
      let postErrorSpy = spyOn(window, 'postError').and.callThrough();

      let aze = function (e) {
        // Fin GET
        if (e.data.done) {
          expect(autoUpdateDataSpy).toHaveBeenCalled();
          expect(WORKER_GETSpy).toHaveBeenCalled();
          expect(customJsonParseSpy).not.toHaveBeenCalled();
          expect(extractDataSpy).not.toHaveBeenCalled();
          expect(updateLocalSpy).not.toHaveBeenCalled();
          expect(postErrorSpy).toHaveBeenCalled();

          window.removeEventListener("message", aze, false);
          // async Jasmine... J'ai pas compris
          done()
        }
      };
      window.addEventListener("message", aze);

      window.postMessage({
        CONFIG: noFunctions,
        START_AUTO: true
      }, "*");

      setTimeout(function () {
        let request = jasmine.Ajax.requests.mostRecent();
        request.respondWith(fake_response.status_404);
      }, 0);

    });

  // Pour tester onerror, il faut une panne physique du réseau, ou un requête CORS (Cross-Origin Resource Sharing) bloquée
  // On peut mettre une URI d'un autre domaine (par exemple, Google) ou alors Spy WORKER_GET et Reject
  it('(WORKER_GET.ONERROR) WORKER_GET should postError on request fail, Network or CORS', function (done) {
      // Spies
      let autoUpdateSpy = spyOn(window, 'autoUpdateData').and.callThrough();
      let WORKER_GETSpy = spyOn(window, 'WORKER_GET').and.returnValue(Promise.reject(Error("[GET.onerror] Network Error")));
      let customJsonParseSpy = spyOn(window, 'customJsonParse').and.callThrough();
      let extractDataSpy = spyOn(window, 'extractData').and.callThrough();
      let updateLocalSpy = spyOn(window, 'updateLocal').and.callThrough();
      let postErrorSpy = spyOn(window, 'postError').and.callThrough();

      // une URI pour générer une erreur CORS
      // SPEC_WORKER_CONFIG = new ParametresUrlOris("http://www.google.fr/id-000192.168.1.74424011-0/index.html?data=main_gestion.ini&id=uniqueID&start=d1&end=d2&category=cat&is-milestone=bool&color=rgb&complete=percentage");
      // noFunctions = SPEC_WORKER_CONFIG.getAllButFunctions();

      let aze = function (e) {
        if (e.data.done) {
          setTimeout(function () {
            // Appelés lors du .error
            expect(autoUpdateSpy).toHaveBeenCalled();
            expect(WORKER_GETSpy).toHaveBeenCalled();
            expect(customJsonParseSpy).not.toHaveBeenCalled();
            expect(extractDataSpy).not.toHaveBeenCalled();
            expect(updateLocalSpy).not.toHaveBeenCalled();
            expect(postErrorSpy).toHaveBeenCalled();

            window.removeEventListener("message", aze, false);
            done();
          }, 0);
        }
      };

      window.addEventListener("message", aze);

      window.postMessage({
        CONFIG: noFunctions,
        START_AUTO: true
      }, "*");
    });

  it('(NOT VALID JSON) WORKER_GET should postError if response content is not a valid JSON ', function (done) {
      // Spies
      let autoUpdateSpy = spyOn(window, 'autoUpdateData').and.callThrough();
      let WORKER_GETSpy = spyOn(window, 'WORKER_GET').and.returnValue(Promise.resolve("this isn't a valid JSON"));
      let customJsonParseSpy = spyOn(window, 'customJsonParse').and.callThrough();
      let extractDataSpy = spyOn(window, 'extractData').and.callThrough();
      let updateLocalSpy = spyOn(window, 'updateLocal').and.callThrough();
      let postErrorSpy = spyOn(window, 'postError').and.callThrough();

      let aze = function (e) {
        if (e.data.done) {
          setTimeout(function () {
            // Appelés lors du .error
            expect(autoUpdateSpy).toHaveBeenCalled();
            expect(WORKER_GETSpy).toHaveBeenCalled();
            expect(customJsonParseSpy).toHaveBeenCalled();
            expect(extractDataSpy).not.toHaveBeenCalled();
            expect(updateLocalSpy).not.toHaveBeenCalled();
            expect(postErrorSpy).toHaveBeenCalled();

            window.removeEventListener("message", aze, false);
            done();
          }, 0);
        }
      };

      window.addEventListener("message", aze);

      window.postMessage({
        CONFIG: noFunctions,
        START_AUTO: true
      }, "*");
    });

  it('(no rootName in JSON) WORKER_GET should postError if the root field (not found in the JSON\'s root)', function (done) {
      // Spies
      let autoUpdateSpy = spyOn(window, 'autoUpdateData').and.callThrough();
      let WORKER_GETSpy = spyOn(window, 'WORKER_GET').and.returnValue(Promise.resolve(fake_response.no_root.response));
      let customJsonParseSpy = spyOn(window, 'customJsonParse').and.callThrough();
      let extractDataSpy = spyOn(window, 'extractData').and.callThrough();
      let updateLocalSpy = spyOn(window, 'updateLocal').and.callThrough();
      let postErrorSpy = spyOn(window, 'postError').and.callThrough();

      let aze = function (e) {
        if (e.data.done) {
          setTimeout(function () {
            // Appelés lors du .error
            expect(autoUpdateSpy).toHaveBeenCalled();
            expect(WORKER_GETSpy).toHaveBeenCalled();
            expect(customJsonParseSpy).toHaveBeenCalled();
            expect(extractDataSpy).toHaveBeenCalled();
            expect(updateLocalSpy).not.toHaveBeenCalled();
            expect(postErrorSpy).toHaveBeenCalled();

            window.removeEventListener("message", aze, false);
            done();
          }, 0);
        }
      };
      window.addEventListener("message", aze);

      window.postMessage({
        CONFIG: noFunctions,
        START_AUTO: true
      }, "*");
    });

  it('(no valid Data in JSON) should run OK and return an empty data Object', function (done) {
      // Spies
      let autoUpdateSpy = spyOn(window, 'autoUpdateData').and.callThrough();
      let WORKER_GETSpy = spyOn(window, 'WORKER_GET').and.returnValue(Promise.resolve(fake_response.no_data.response));
      let customJsonParseSpy = spyOn(window, 'customJsonParse').and.callThrough();
      let extractDataSpy = spyOn(window, 'extractData').and.callThrough();
      let updateLocalSpy = spyOn(window, 'updateLocal').and.callThrough();
      let postErrorSpy = spyOn(window, 'postError').and.callThrough();

      let finalValidDatas = undefined,
        finalInvalidDatas = undefined;

      let aze = function (e) {
        LoggerModule.log("[window.onmessage] message.data", e.data);

        // Valid Values
        if (e.data.updatedTasks) {
          // Pas de valeurs valides
          finalValidDatas = e.data.updatedTasks;
        }

        // Invalid Values
        if (e.data.invalidTasks) {
          finalInvalidDatas = e.data.invalidTasks;
        }

        if (e.data.done) {
          setTimeout(function () {
            // Appelés lors du .error
            expect(autoUpdateSpy).toHaveBeenCalled();
            expect(WORKER_GETSpy).toHaveBeenCalled();
            expect(customJsonParseSpy).toHaveBeenCalled();
            expect(extractDataSpy).toHaveBeenCalled();
            expect(updateLocalSpy).toHaveBeenCalled();
            expect(postErrorSpy).not.toHaveBeenCalled();

            expect(finalValidDatas).toEqual({});
            expect(finalInvalidDatas).toEqual((expected_gantt_oris_data.invalid));

            window.removeEventListener("message", aze, false);
            done();
          }, 0);
        }
      };
      window.addEventListener("message", aze);

      window.postMessage({
        CONFIG: noFunctions,
        START_AUTO: true
      }, "*");
    });

  it("(OK) Cas normal, certaines données sont OK, d'autres sont invalides", function (done) {
    // Spies
    let autoUpdateSpy = spyOn(window, 'autoUpdateData').and.callThrough();
    let WORKER_GETSpy = spyOn(window, 'WORKER_GET').and.callThrough();
    let customJsonParseSpy = spyOn(window, 'customJsonParse').and.callThrough();
    let extractDataSpy = spyOn(window, 'extractData').and.callThrough();
    let updateLocalSpy = spyOn(window, 'updateLocal').and.callThrough();
    let postErrorSpy = spyOn(window, 'postError').and.callThrough();

    let finalValidDatas = {},
      finalinValidDatas = {};

    let aze = function (e) {
      if (e.data.updatedTasks)
        finalValidDatas = e.data.updatedTasks;
      if (e.data.invalidTasks)
        finalinValidDatas = e.data.invalidTasks;

      if (e.data.done) {
        setTimeout(function () {
          LoggerModule.warn("[window.onmessage] e.data.done", e.data.done);
          expect(autoUpdateSpy).toHaveBeenCalled();
          expect(WORKER_GETSpy).toHaveBeenCalled();
          //http://dummy.restapiexample.com/api/v1/employees
          expect(customJsonParseSpy).toHaveBeenCalled();
          expect(extractDataSpy).toHaveBeenCalled();
          expect(updateLocalSpy).toHaveBeenCalled();
          expect(postErrorSpy).not.toHaveBeenCalled();

          expect(finalValidDatas).toEqual(expected_gantt_oris_data.valid);

          expect(finalinValidDatas).toEqual(expected_gantt_oris_data.invalid);

          window.removeEventListener("message", aze, false);
          // async Jasmine... J'ai pas compris
          done()
        }, 100);
      }
    };
    window.addEventListener("message", aze);

    window.postMessage({
      CONFIG: noFunctions,
      START_AUTO: true
    }, "*");

    setTimeout(function () {
      let request = jasmine.Ajax.requests.mostRecent();
      request.respondWith(fake_response.success_mixed);
    }, 0);

  });

  it("(OK) Cas normal, toutes les données sont OK", function (done) {
    // Spies
    let autoUpdateSpy = spyOn(window, 'autoUpdateData').and.callThrough();
    let WORKER_GETSpy = spyOn(window, 'WORKER_GET').and.returnValue(Promise.resolve(fake_response.success_only_valid.response));
    let customJsonParseSpy = spyOn(window, 'customJsonParse').and.callThrough();
    let extractDataSpy = spyOn(window, 'extractData').and.callThrough();
    let updateLocalSpy = spyOn(window, 'updateLocal').and.callThrough();
    let postErrorSpy = spyOn(window, 'postError');

    let finalValidDatas = {},
      finalinValidDatas = {};

    let aze = function (e) {
      if (e.data.updatedTasks)
        finalValidDatas = e.data.updatedTasks;
      if (e.data.invalidTasks)
        finalinValidDatas = e.data.invalidTasks;

      if (e.data.done) {
        setTimeout(function () {
          LoggerModule.warn("[window.onmessage] e.data.done", e.data.done);
          expect(autoUpdateSpy).toHaveBeenCalled();
          expect(WORKER_GETSpy).toHaveBeenCalled();
          //http://dummy.restapiexample.com/api/v1/employees
          expect(customJsonParseSpy).toHaveBeenCalled();
          expect(extractDataSpy).toHaveBeenCalled();
          expect(updateLocalSpy).toHaveBeenCalled();
          expect(postErrorSpy).not.toHaveBeenCalled();

          console.log("\n\n\n\n\n\n\n");
          console.log("finalValidDatas", finalValidDatas);
          console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
          expect(finalValidDatas).toEqual(expected_gantt_oris_data.valid);

          expect(finalinValidDatas).toEqual({});

          window.removeEventListener("message", aze, false);
          // async Jasmine... J'ai pas compris
          done()
        }, 0); // 100);
      }
    };
    window.addEventListener("message", aze);

    window.postMessage({
      CONFIG: noFunctions,
      START_AUTO: true
    }, "*");
/*
    setTimeout(function () {
      let request = jasmine.Ajax.requests.mostRecent();
      request.respondWith(fake_response.success_only_valid);
    }, 0);
//*/
  });


});