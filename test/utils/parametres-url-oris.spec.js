describe("ParametresUrlOris permet d'initialiser différents paramètres nécessaires à l'interaction avec une BD Oris", function() {
  LoggerModule.setDebug(false);

  let mandatoryParameters = ["data", "id", "start", "end"];

  describe("Lors de l'initialisation...", function() {
    it("Renvoie une exception si l'un des paramètres obligatoires est absent", function() {
      let url = "http://XxX_420-Dark-Angel-1337-du-69_XxX:8080/id-000192.168.1.74424011-0/reste/de/l/page_location/index.html"
        + "?param1=aze&param2=bbb";
      let parametres_url;

      //Tester chaque paramètre obligatoire individuellement
      expect( function() { parametres_url = new ParametresUrlOris(url) } )
        .toThrow(new EXCEPTIONS.NoMandatoryUrlParameterDetected(mandatoryParameters.reverse().toString() + ' is/are missing'));


    });

    it("Cas normal", function() {
      let parametres_url = new ParametresUrlOris("http://XxX_420-Dark-Angel-1337-du-69_XxX:8080/id-000192.168.1.74424011-0/reste/de/l/page_location/index.html"
                            + "?data=aze_gestion.ini&id=col0&start=col1&end=col2", true, true);

      //Liste des paramètres obligatoires
      expect( parametres_url.MANDATORY_GET_PARAMETERS ).toEqual(mandatoryParameters);

      //Formatage des paramètres de l'URL
      expect( parametres_url.asRaw ).toEqual({
        end: "col2",
        data: "aze_gestion.ini",
        id: "col0",
        start: "col1"

      });
      expect( parametres_url.asArray ).toEqual({
        _end: ["col2"],
        _start: ["col1"],
        _id: ["col0"],
        _data: ["aze_gestion.ini"]
      });
      //Génération de l'URL
      expect( parametres_url.webserviceUrl )
        .toEqual("http://xxx_420-dark-angel-1337-du-69_xxx:8080/id-000192.168.1.74424011-0/aze_gestion.ini?json=true&end=col2&start=col1&id=col0");
      //Génération de la clé du JSON contenant les données
      expect( parametres_url.rootName )
        .toEqual("azes");
    });
  });
});