describe("ParametresUrlOris permet d'initialiser différents paramètres nécessaires à l'interaction avec une BD Oris", function() {
  let parametres_url;

  describe("Lors de l'initialisation", function() {
    it("Renvoie une exception si l'un des paramètres obligatoires est absent", function() {
      let url = "?param1=aze&param2=bbb",
        mandatoryParameters = ["data", "id", "start", "end"];
      parametres_url = new ParametresUrlOris(url);

      //Liste des paramètres obligatoires
      expect( parametres_url.MANDATORY_GET_PARAMETERS ).toEqual(mandatoryParameters);

      //Tester chaque paramètre obligatoire individuellement
      expect( function() { parametres_url.init() } )
        .toThrow(new EXCEPTIONS.NoMandatoryUrlParameterDetected(mandatoryParameters.reverse().toString() + ' is/are missing'));
    });

    it("Cas normal avec '?' initial", function() {
      parametres_url = new ParametresUrlOris("?data=.&id=col0&start=col1&end=col2", true, true);

      try {
        parametres_url.init();
      } catch (e) {
        console.log(e.name, e);
      }

      expect( parametres_url.asRaw ).toEqual({
        data: ".",
        id: "col0",
        start: "col1",
        end: "col2"
      });
      expect( parametres_url.asArray ).toEqual({
        _data: ["."],
        _id: ["col0"],
        _start: ["col1"],
        _end: ["col2"]
      });

    });
  });
});