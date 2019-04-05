var SHARED = {
  /**
   * Parse un string en un objet Location (on peut alors utiliser les attributs host/protocol/...)
   *
   * @param {string} stringToParse
   *  doit impérativement commencer par un protocole ("http://", "https://", "ftp://", etc...)
   *    SINON
   *  le string remplacerait le .pathname de l'URI de la page en cours (window.location)
   *    ET
   *  renvoie alors une exception
   *
   * @throws StringIsNotAnUriException
   * @return {Location}
   */
  stringToLocation: function (stringToParse) {
    let fakeWindowLocation = document.createElement('a');
    fakeWindowLocation.href = stringToParse;
    if (stringToParse === fakeWindowLocation.href)
      return fakeWindowLocation;
    throw new EXCEPTIONS.StringIsNotAnUriException('"' + stringToParse + '" wasn\'t parsed to an URI (result: "' + fakeWindowLocation.href +'"');
  }
};