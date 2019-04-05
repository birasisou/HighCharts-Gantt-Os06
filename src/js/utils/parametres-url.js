/**
 * À hériter
 * Sert de classe abstraite, de base (interface), aux objets permettant d'intéragir avec une nouvelle
 * (différent format de données / location /etc...) base de données
 *
 * @param {string} windowLocation
 *  @required
 *  substring d'une URI contenant les paramètres GET (avec ou sans "?" initial)
 *
 * @param {boolean} isEmptyAllowed
 *  @default false
 *  autorise ou non la présence de paramètres GET sans valeurs
 *
 * @param {boolean} isAlreadyDecoded
 *  @default false
 *  précise s'il est nécessaire ou non de décoder l'URL
 *
 * @constructor
 */
function ParametresUrl (windowLocation, isEmptyAllowed, isAlreadyDecoded) {
  //EXCEPTIONS: on n'accepte que du {string} pour locationSearch
  //!ATTENTION! Ne pas modifier le message
  if (typeof windowLocation !== "string")
    throw new EXCEPTIONS.InvalidArgumentExcepetion("ParametresUrlOris n'accepte qu'une chaîne de caractères en paramères (location)");
  this.isAlreadyDecoded = isAlreadyDecoded || false;
  this.isEmptyAllowed = isEmptyAllowed || false;

  this.pageUri = windowLocation;

  this.locationSearch = undefined;  //TODO: useless ?
  this.asRaw = {};     //le paramètre entier
  this.asArray = {};   //le paramètre sous forme de tableau (chaque élément préalablement séparés par une virgule ",")
  this.MANDATORY_GET_PARAMETERS = [];
  this.rootName = undefined;
  this.webserviceUrl = undefined;


  /**
   * Initialise l'objet
   * Toujours dans cet ordre
   * C'est aux classes héritiaires d'implémenter les fonctions de façon à ce que ça corresponde en nom et en type de retour
   */
  this.init = function() {
    //Récupérer les paramètres de l'URL
    getParamsFromPageUri.call(this);

    //Check for missing / incorrect MANDATORY parameters
    this.checkMandatoryParameters();

    //Générer l'URL pour les requêtes REST, dans le cas d'Oris on a le nom dans &data (jusqu'à un "_gestion.ini") et on rajoute un "s"
    this.webserviceUrl = this.generateWebserviceUrl();

    //Générer le nom de l'objet contenant les données une fois le JSON récupéré par requête GET
    this.rootName = this.generateRootName();
  };

  /**
   * @private
   * Transforme et stock les paramètres GET d'une URL en un Objet
   *
   * @param {string} locationSearch
   *   chaîne de caractères correspondants aux paramètres
   *   commençant par un '?' et avec & comme séparateur des paramètres (&a=b)
   *
   * @param {boolean} isAlreadyDecoded
   * @default false
   *   Précise si la chaîne de caractères passée a déjà été décodée ou non
   *
   * @param {boolean} isEmptyAllowed
   * @default false
   *   détermine si l'absence de paramètres doit être considéré comme une exception ou non
   *
   * @returns {object}
   *
   * @throws "No parameters detected"
   */
  function getParamsFromPageUri() {
    console.warn("getParamsFromPageUri's this", this);
    let parametresUrl = {
        asRaw: {},
        asArray: {}
      },
      parametresSplit;

    //Vérifier que l'URL contient des paramètres GET
    let debutParam = this.pageUri.indexOf("?");
    if (debutParam < 0) {
      if (isEmptyAllowed) {
        this.locationSearch = "";
        this.asRaw = parametresUrl.asRaw;
        this.asArray = parametresUrl.asArray;
        return parametresUrl;
      } else
        throw new EXCEPTIONS.NoParametersDetectedInURI('Query string should start with "?"');
    }
    this.locationSearch = this.pageUri.substr(debutParam);


    //EXCEPTIONS: URI vide et/ou sans paramètres GET
    if (this.locationSearch.indexOf("=") < 0) {
      if (isEmptyAllowed)
        return parametresUrl;
      throw new EXCEPTIONS.NoParametersDetectedInURI();
    }

    //Enlever le '?' initial, s'il existe
    if (this.locationSearch[0] === '?')
      this.locationSearch = this.locationSearch.substr(1);
    //Récupérer les paramètres
    parametresSplit = this.locationSearch.split("&"); //Tout derrière le 1er "?" (que l'on supprime) de l'URL --> devient un tableau
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
        continue;

      //Décoder si nécessaire
      if (!isAlreadyDecoded)
        try {
          arr[1] = decodeURIComponent(arr[1]);
        } catch (e) {
          if (e instanceof URIError) {
            isAlreadyDecoded = true;
            parametresUrl.asRaw[arr[0]] = arr[1];
          } else
            throw e;
        }
      parametresUrl.asRaw[arr[0]] = arr[1];

      if (!parametresUrl.asRaw[arr[0]])
        LoggerModule.warn("Le paramètre '" + arr[0] + "' n'a pas de valeur");

      parametresUrl.asArray["_" + arr[0]] = (parametresUrl.asRaw[arr[0]]).split(",");
    }

    //return parametresUrl;
    this.asRaw = parametresUrl.asRaw;
    this.asArray = parametresUrl.asArray;
  }

  /**
   * Génère l'URL du web-service à questionner pour récupérer les données (JSON) du graphique
   *
   * @returns {string}
   */
  this.generateWebserviceUrl = function() {
    throw new EXCEPTIONS.NotImplementedException();
  };

  /**
   * Génère le nom de la clé (du JSON) qui contient les données du graphique
   * TODO: voir comment gérer le cas où la clé est "nested"
   *
   * @returns {string}
   */
  this.generateRootName = function() {
    throw new EXCEPTIONS.NotImplementedException();
  };

  /**
   * Vérifie qu'aucun des paramètres définis (dans le code) comme "obligatoires" sont absents ou invalide ("" / undefined)
   *
   * À appeler après getParamsFromUrl()
   */
  this.checkMandatoryParameters = function() {
    let missingParameters = [];
    let length = this.MANDATORY_GET_PARAMETERS.length;
    while (length--) {
      //potentiellement false, undefined, 0, ou "" mais vu que tout est stocké sous forme de de {string], que "" et undefined remplissent cette condition
      if (!this.asRaw[this.MANDATORY_GET_PARAMETERS[length]])
        missingParameters.push(this.MANDATORY_GET_PARAMETERS[length]);
    }
    if (missingParameters.length)
      throw new EXCEPTIONS.NoMandatoryUrlParameterDetected(missingParameters.toString() + ' is/are missing');
  }

}
