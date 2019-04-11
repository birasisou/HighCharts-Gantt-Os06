var SHARED = {
  /**
   * Parse un string en un objet Location (on peut alors utiliser les attributs host/protocol/...)
   *
   * @param {string} stringToParse
   *  doit impérativement commencer par un protocole ("http://", "https://", "ftp://", etc...)
   *    SINON
   *  le string remplacerait le .pathname de l'URI de la page en cours (window.page_location)
   *    ET
   *  renvoie alors une exception
   *
   * @throws StringIsNotAnUriException
   * @return {HTMLElement/Location}
   */
  stringToLocation: function (stringToParse) {
    let fakeWindowLocation = document.createElement('a');
    fakeWindowLocation.href = stringToParse;
    LoggerModule.info("stringToParse", stringToParse);
    LoggerModule.log("fakeWindowLocation.href", fakeWindowLocation.href);
    if (stringToParse.toLowerCase() !== fakeWindowLocation.href) {
      throw new EXCEPTIONS.StringIsNotAnUriException("'" + stringToParse + "' wasn\'t parsed to an URI (result: '" + fakeWindowLocation.href + "')");
    }
    return fakeWindowLocation;
  },

  /**
   * Transforme et stock les paramètres GET d'une URL en un Objet
   *
   * @param {object} target
   *    Objet ParametreUrl cible contenant
   *      - {string} locationSearch
   *        chaîne de caractères correspondants aux paramètres
   *        commençant par un '?' et avec & comme séparateur des paramètres (&a=b)
   *
   *      - {boolean} isAlreadyDecoded
   *        Précise si la chaîne de caractères passée a déjà été décodée ou non
   *
   *      - {boolean} isEmptyAllowed
   *        détermine si l'absence de paramètres doit être considéré comme une exception ou non
   *
   * @returns {object}
   *
   * @throws "No parameters detected"
   */
  getParamsFromPageUri: function (target) {
    let _pageUri = target.pageUri,
      _location = target.page_location,
      _isEmptyAllowed = target.isEmptyAllowed,
      _isAlreadyDecoded = target.isAlreadyDecoded;

    let parametresUrl = {
        asRaw: {},
        asArray: {},
        locationSearch: ""
      },
      parametresSplit = []

    //Vérifier que l'URL contient des paramètres GET
    //let debutParam = _pageUri.indexOf("?");
    //if (debutParam < 0) {
    if (!_location.search) {
      if (_isEmptyAllowed)
        return parametresUrl;
      else
        throw new EXCEPTIONS.NoParametersDetectedInURI('Query string should start with "?"');
    }
    //{string} sous partie de l'URI commençant au "?" (équivaut à window.page_location.search)
    //parametresUrl.locationSearch = _pageUri.substr(debutParam);
    parametresUrl.locationSearch = _location.search;

    //EXCEPTIONS: URI vide et/ou sans paramètres GET
    if (parametresUrl.locationSearch.indexOf("=") < 0) {
      if (_isEmptyAllowed)
        return parametresUrl;
      throw new EXCEPTIONS.NoParametersDetectedInURI();
    }

    //Enlever le '?' initial, s'il existe
    if (parametresUrl.locationSearch[0] === '?')
      parametresUrl.locationSearch = parametresUrl.locationSearch.substr(1);

    //Récupérer les paramètres
    parametresSplit = parametresUrl.locationSearch.split("&"); //Tout derrière le 1er "?" (que l'on supprime) de l'URL --> devient un tableau
    //Stocker les paramètres comme objet
    let i = parametresSplit.length;
    while (i--) {
      //Ignorer les paramètres vides "&&"
      if (!parametresSplit[i].length)
        continue;

      let arr = parametresSplit[i].split("="); //arr[0] == clé/paramètre ("mask", "data", ...)

      //Ignorer les faux paramètres "&toto" ou "&tata="
      if (arr.length < 2 ||                 //paramètres sans "="
        !arr[0].length || !arr[1].length)   //paramètres sans valeur après le "="
        continue; //ignorer le paramètre

      //Décoder si nécessaire
      if (!_isAlreadyDecoded)
        try {
          arr[1] = decodeURIComponent(arr[1]);
        } catch (e) {
          if (e instanceof URIError) {
            _isAlreadyDecoded = true;
            parametresUrl.asRaw[arr[0]] = arr[1];
          } else
            throw e;
        }
      parametresUrl.asRaw[arr[0]] = arr[1];

      if (!parametresUrl.asRaw[arr[0]])
        LoggerModule.warn("Le paramètre '" + arr[0] + "' n'a pas de valeur");

      parametresUrl.asArray["_" + arr[0]] = (parametresUrl.asRaw[arr[0]]).split(",");
    }
    return parametresUrl;
  }

};