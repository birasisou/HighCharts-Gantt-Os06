describe("SHARED", function () {
  /**
   * stringToLocation
   */
  describe('stringToLocation permet de convertir une chaîne de caractères en objet URI', function () {
    describe('throw une Excepetion si la chaîne ne correspond pas à une URI', function () {
      it('si la chaîne est vide', function () {
        expect(function () { SHARED.stringToLocation('') }).toThrow();
        expect(function () { SHARED.stringToLocation(undefined) }).toThrow();
        expect(function () { SHARED.stringToLocation(null) }).toThrow();
        expect(function () { SHARED.stringToLocation(NaN) }).toThrow();
      });
      it('si la chaîne ne contient pas de protocole (http, https, ftp, ...)', function () {
        expect(function () { SHARED.stringToLocation('www.google.fr') }).toThrow();
      });
      it('Uri OK sans "/" final MAIS avec des paramètres GET ("http://www.google.fr?aze=tmp")', function () {
        let stringUri = 'http://www.google.fr?aze=tmp';    // ATTENTION AU '/' FINAL
        let fakeWindowLocation = document.createElement('a');
        fakeWindowLocation.href = stringUri;

        expect(function () { SHARED.stringToLocation(stringUri) }).toThrow();
      });
    });
    describe('renvoie un objet {HTMLElement/Location}', function () {
      it('Uri OK sans "/" final', function () {
        let stringUri = 'http://www.google.fr';    // ATTENTION AU '/' FINAL
        let fakeWindowLocation = document.createElement('a');
        fakeWindowLocation.href = stringUri;

        expect(function () { SHARED.stringToLocation(stringUri) }).not.toThrow();
        expect(SHARED.stringToLocation(stringUri)).toEqual(fakeWindowLocation);
      });

      it('Uri OK avec "/" final', function () {
        let stringUri = 'http://www.google.fr/';    // ATTENTION AU '/' FINAL
        let fakeWindowLocation = document.createElement('a');
        fakeWindowLocation.href = stringUri;

        expect(function () { SHARED.stringToLocation(stringUri) }).not.toThrow();
        expect(SHARED.stringToLocation(stringUri)).toEqual(fakeWindowLocation);
      });

      it('Uri OK avec "/" final avec des paramètres GET', function () {
        let stringUri = 'http://www.google.fr/?aze=tmp';    // ATTENTION AU '/' FINAL
        let fakeWindowLocation = document.createElement('a');
        fakeWindowLocation.href = stringUri;

        expect(function () { SHARED.stringToLocation(stringUri) }).not.toThrow();
        expect(SHARED.stringToLocation(stringUri)).toEqual(fakeWindowLocation);
      });
    });
  });

  describe('isIsoDate permet de vérifier si une chaîne de caractères est une date au format ISO (Zulu Time)', function () {
    it('renvoie true si la chaine respecte EXACTEMENT le standard ISO 8601 définie par ECMAScript ("yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'")', function () {
      expect(SHARED.isIsoDate(new Date().toISOString())).toBe(true);
    });
    it('renvoie false dans n\'importe quel autre cas', function () {
      expect(SHARED.isIsoDate()).toBe(false);
      expect(SHARED.isIsoDate(true)).toBe(false);
      expect(SHARED.isIsoDate("")).toBe(false);
      expect(SHARED.isIsoDate(null)).toBe(false);
      expect(SHARED.isIsoDate(undefined)).toBe(false);
      expect(SHARED.isIsoDate(new Date())).toBe(false);
      expect(SHARED.isIsoDate("2011-04-06")).toBe(false);   //date valide mais pas ISO
    });
  });
});