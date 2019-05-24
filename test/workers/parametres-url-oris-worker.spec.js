xdescribe("Worker", function () {
  // Activer le débug
  LoggerModule.setDebug(true);

  let SPEC_WORKER_CONFIG = undefined,
    testUrl = "http://www.localhost:8080/id-000192.168.1.74424011-0/index.html?data=main_gestion.ini&id=uniqueID&start=d1&end=d2&category=cat&is-milestone=bool&color=rgb&complete=percentage",
    response_content = {
    mains: [
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
          bool: "true",
          rgb: "0f0",
          percentage: "0.4"
        }
      ],
    osef: {
        ceci: 0,
        n_est: true,
        pas: false,
        utile: "!"
      }
  },
    fake_response = {
    success: {
      status: 200,
      responseText: JSON.stringify(response_content),
      response: JSON.stringify(response_content),
    },
  };

  beforeEach(function () {
    // Pour fake requests
    jasmine.Ajax.install();

    SPEC_WORKER_CONFIG = new ParametresUrlOris(testUrl);
  });

  // don't forget to uninstall as well...
  afterEach(function() {
    jasmine.Ajax.uninstall();
  });

  // Espion postMessage
  xit("Test Espion sur window.postMessage", function () {
    window.addEventListener("message", function (e) {
      console.log("------------- window.addEventListener -------------", Object.keys(e.data));
    });

    //Espionner le listener mais le laisser fonctionner normalement
    //let tmp = jasmine.createSpy('message').and.callThrough();
    spyOn(window, 'postMessage').and.callThrough();

    // test
    window.postMessage('REEEEEEEEEEEEEH');

    expect(window.postMessage).toHaveBeenCalled();
  });

  it("Just postMessage", function (done) {
    let noFunctions = SPEC_WORKER_CONFIG.getAllButFunctions();

    window.addEventListener("message", function (e) {
      if (e.data.done == true) {
        console.log("\n/////////////\nresult\n/////////////\n");
        /*
        expect(WORKER_GET).toHaveBeenCalled();
        expect(JSON.parse).toHaveBeenCalled();
        expect(extractRootNameData).toHaveBeenCalled();
        expect(updateLocal).toHaveBeenCalled();
        */
        expect(window.autoUpdateData).toHaveBeenCalled();
        expect(window.WORKER_GET).toHaveBeenCalled();
        //expect(spies.WORKER_GET).toThrow();

        //http://dummy.restapiexample.com/api/v1/employees
        expect(JSON.parse).toHaveBeenCalled();
        expect(window.extractRootNameData).toHaveBeenCalled();
        expect(window.updateLocal).toHaveBeenCalled();

        done()
      }
    });

    // Espion
    spyOn(window, 'autoUpdateData').and.callThrough();

    spyOn(window, 'postMessage').and.callThrough();

    //spyOn(window, 'WORKER_GET').and.returnValue(Promise.resolve(JSON.stringify(fake_response.success)));
    //spyOn(JSON, 'parse').and.returnValue(Promise.resolve(fake_response.success));

    spyOn(window, 'WORKER_GET').and.callThrough();

    spyOn(JSON, 'parse').and.callThrough();

    spyOn(window, 'extractRootNameData').and.callThrough();

    spyOn(window, 'updateLocal').and.callThrough();

    spyOn(window, 'postError').and.callThrough();

    //*
    window.postMessage({
      CONFIG: noFunctions,
      START_AUTO: true            // empêcher le GET auto de démarer
    });//*/

    setTimeout(function () {
      let request = jasmine.Ajax.requests.mostRecent();
      request.respondWith(fake_response.success)
    }, 2000);
    /*
    setTimeout(function (result) {
      console.log("///////////// result /////////////", result);
      expect(WORKER_GET).toHaveBeenCalled();
      expect(JSON.parse).toHaveBeenCalled();
      expect(extractRootNameData).toHaveBeenCalled();
      expect(updateLocal).toHaveBeenCalled();
      done()
    }, 2000);
    //*/

  });

  it("Cas normal: toutes les fonctions sont appelées", function (done) {
    let noFunctions = SPEC_WORKER_CONFIG.getAllButFunctions();

    // Espion
    spyOn(window, 'autoUpdateData').and.callThrough();
    spyOn(window, 'postMessage').and.callThrough();
    spyOn(window, 'WORKER_GET').and.returnValue(Promise.resolve(JSON.stringify(fake_response.success)));
    spyOn(JSON, 'parse').and.returnValue(Promise.resolve(fake_response.success));
    spyOn(window, 'extractRootNameData').and.callThrough();
    spyOn(window, 'updateLocal').and.callThrough();
    spyOn(window, 'postError').and.callThrough();

    /*
    window.postMessage({
      CONFIG: noFunctions,
      STOP: true            // empêcher le GET auto de démarer
    });//*/


    //expect(window.postMessage).toHaveBeenCalled();


    //console.info("SPEC_WORKER_CONFIG", SPEC_WORKER_CONFIG);

    // TODO NE S'EXECUTE PAS FFS
    let promise = new Promise(function (resolve, reject) {
      console.log("PROMISE START");
      //resolve(autoUpdateData("http://dummy.restapiexample.com/api/v1/employees"));

      //*
      window.postMessage({
        CONFIG: noFunctions,
        START_AUTO: false            // empêcher le GET auto de démarer
      });//*/
      resolve("RIP Iron Man");
      console.log("PROMISE SHOULD BE RESOLVING");
    });

    promise
      .then(function () {
        expect(postMessage).toHaveBeenCalled();
      })
      .then(function() {
        autoUpdateData("http://dummy.restapiexample.com/api/v1/employees");
        done();
      })
      .finally(function (result) {
        console.log("///////////// result /////////////", result);
        console.log("\n");
        expect(WORKER_GET).toHaveBeenCalled();
        console.log("\n");
        expect(JSON.parse).toHaveBeenCalled();
        console.log("\n");
        expect(extractRootNameData).toHaveBeenCalled();
        console.log("\n");
        expect(updateLocal).toHaveBeenCalled();
        console.log("\n\nFIN FINALLY\n");
        done();
      });

    console.log("promise", promise);

/*
    // TODO FAIL car auto est async
    console.log("\n#");
    expect(WORKER_GET).toHaveBeenCalled();
    console.log("\n#");
    expect(JSON.parse).toHaveBeenCalled();
    console.log("\n#");
    expect(extractRootNameData).toHaveBeenCalled();
    console.log("\n#");
    expect(updateLocal).toHaveBeenCalled();
    console.log("\n#\nFIN\n#");
*/
    /*
      autoUpdateData("http://dummy.restapiexample.com/api/v1/employees").then(function (result) {
        console.warn("result", result);

      });
    */


  });

});