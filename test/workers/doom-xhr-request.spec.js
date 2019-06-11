xdescribe("Intercepting HTTP requests in tests with Jasmine", function () {
  var xhr, request, errorHandling;

  var TestResponses = {
    search: {
      success_mixed: {
        status: 200,
        responseText: '{"titi":"toto"}'
      },
      _404: {
        status: 404,
        responseText: '{ "error": "You should not be able to access this} }',
        statusText: 'reasons'
      }
    }
  };


  beforeEach(function() {
    jasmine.Ajax.install();

    xhr = new XMLHttpRequest();
    xhr.open("GET", 'https://osef.rest/', false);

    errorHandling = jasmine.createSpy();

    xhr.onload = function () {
      if (xhr.status !== 200) {
        errorHandling();
        return;
      }


      // Parse en JSON
      let json = JSON.parse(xhr.responseText);
      console.log("json", json);
    };

    xhr.onerror = function () {
      throw new Error("xhr error");
    };

  });

  // don't forget to uninstall as well...
  afterEach(function() {
    jasmine.Ajax.uninstall();
  });

  it("Status = 200",function () {
    xhr.send();

    request = jasmine.Ajax.requests.mostRecent();

    expect(request.url).toBe('https://osef.rest/');
    expect(request.method).toBe('GET');

    request.respondWith(TestResponses.search.success);

  });

  it("Status = 400 (SPY)", function () {
    //expect(function () {
      xhr.send();
    //}).toThrow();


    request = jasmine.Ajax.requests.mostRecent();

    request.respondWith(TestResponses.search._404);

    expect(errorHandling).toHaveBeenCalled();

    /*
    expect(XMLHttpRequest.prototype.open).toHaveBeenCalled();
    expect(XMLHttpRequest.prototype.onload).toHaveBeenCalled();
    expect(XMLHttpRequest.prototype.onload).toThrow();

    expect(onload).toHaveBeenCalled();
    expect(onload).toThrow();

    expect(xhr.onload).toThrow();
    expect(function () { xhr.onload }).toThrow();
    expect(function () { xhr }).toThrow();
    //*/

  });

});