xdescribe("Le Worker est en charge d'effectuer les requêtes vers le web-service et de signaler des changements de valeurs", function () {
  let config = undefined;
  beforeEach(function () {
    config = new ParametresUrlOris("http://www.localhost:8080/id-000192.168.1.74424011-0/index.html"
      + "?data=main_gestion.ini&id=uniqueID&start=d1&end=d2&category=cat&is-milestone=bool&color=rgb&complete=percentage");

  });

  describe("Une fois la requête effectuée, la réponse est parsée en JSON et les données sont", function () {
    it("test spy", function () {
      // console.log("getEventListeners(window)", getEventListeners(window));
      // console.log("self", self);
      window.addEventListener("message", function (e) {
        console.log("!!!!!!!!!!!!!!!!!!!!!! message !!!!!!!!!!!!!!!!!!!!!!", e.data);
      });

      //Espionner le listener mais le laisser fonctionner normalement
      //let tmp = jasmine.createSpy('message').and.callThrough();
      spyOn(window, 'postMessage').and.callThrough();

      // test
      window.postMessage('REEEEEEEEEEEEEH');

      expect(window.postMessage).toHaveBeenCalled();

      let noFunctions = config.getAllButFunctions();
      console.log("@@@@@@@@@@@@@ noFunctions", noFunctions);

      window.postMessage({ CONFIG: noFunctions });
    })
  });

});