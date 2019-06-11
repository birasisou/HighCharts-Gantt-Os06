/**
 * @Test instanciation et initialisation
 */
describe("ParametresUrl permet d'initialiser différents paramètres nécessaires à l'intéraction avec un BD. " +
  "Il s'agit d'une classe destinée à être héritée et non pas utilisée directement", function () {
  let parametres_url;
  // LoggerModule.setDebug(false);

  describe("Lors de l'initialisation...", function() {
    it("L'argument à fournir est l'URI de la page {string}", function() {
      expect( function(){ parametres_url = new ParametresUrl(true); } ).toThrow(new EXCEPTIONS.InvalidArgumentExcepetion("ParametresUrlOris n'accepte qu'une chaîne de caractères en paramères (page_location)"));
      expect( function(){ parametres_url = new ParametresUrl({}); } ).toThrow(new EXCEPTIONS.InvalidArgumentExcepetion("ParametresUrlOris n'accepte qu'une chaîne de caractères en paramères (page_location)"));
      expect( function(){ parametres_url = new ParametresUrl(""); } ).not.toThrow(new EXCEPTIONS.InvalidArgumentExcepetion());
    });

    it("Renvoie une exception NoParametersDetectedInURI par défaut s'il n'y a pas de paramètres", function() {
      parametres_url = new ParametresUrl(window.location.href); //window.page_location.href sur travis = http://localhost:9876
      expect( function(){ parametres_url.init() } ).toThrow(new EXCEPTIONS.NoParametersDetectedInURI('Query string should start with "?"'));
    });

    it("Mais il est possible de considérer cette absence de paramètre comme autorisée", function() {
      parametres_url = new ParametresUrl(window.location.href, true, true);
      expect( function(){ parametres_url.init() } ).not.toThrow(new EXCEPTIONS.NoParametersDetectedInURI());
      expect( parametres_url.asRaw ).toEqual({});
      expect( parametres_url.asArray ).toEqual({});
    });

    it("Cette classe sert d'interface et n'est pas à être utilisée telle quelle (l'init renverra des exceptions car les ne sont pas implémentées)", function() {
      parametres_url = new ParametresUrl(window.location.href, true, true);
      expect( function(){ parametres_url.init() } ).toThrow(new EXCEPTIONS.NotImplementedException());
    });

  });
});