/**
 * À hériter
 * Sert de classe abstraite, de base (interface), aux objets permettant d'intéragir avec une nouvelle
 * (différent format de données / page_location /etc...) base de données
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
    throw new EXCEPTIONS.InvalidArgumentExcepetion("ParametresUrlOris n'accepte qu'une chaîne de caractères en paramères (page_location)");
  this.isAlreadyDecoded = isAlreadyDecoded || false;
  this.isEmptyAllowed = isEmptyAllowed || false;

  //@argument {string} windowLocation
  this.pageUri = windowLocation;
  //{Object} Location construit à partir de l'@argument windowLocation
  this.page_location = undefined;

  //les tuples clé/valeur des paramètres GET récupérés dans l'url
  this.asRaw = {};     //valeur de chaque paramètre sous forme de {string}
  this.asArray = {};   //valeur de chaque paramètre sous forme d'array (séparation = "," virgule)
  //Paramètres GET obligatoire (Exception renvoyée si l'un d'entre eux manque
  this.MANDATORY_GET_PARAMETERS = [];
  //Clé du JSON (reçu du webservice) contenant les données du graph
  this.rootName = undefined;
  //URL du webservice d'où on  récupère les données
  this.webserviceUrl = undefined;


  /**
   * Initialise l'objet
   * Toujours dans cet ordre
   * C'est aux classes héritiaires d'implémenter les fonctions de façon à ce que ça corresponde en nom et en type de retour
   */
  this.init = function() {
    //Transforme l'argument URL {string} en objet page_location
    if (!this.page_location)
      this.page_location = SHARED.stringToLocation(this.pageUri);   //nécessite une URI valide, c-à-d qui commence par un protocole (ftp, https, etc...)

    //Récupérer les paramètres de l'URL
    let params = SHARED.getParamsFromPageUri(this);
    this.asRaw = params.asRaw;
    this.asArray = params.asArray;
    this.locationSearch = params.locationSearch;

    //Check for missing / incorrect MANDATORY parameters
    this.checkMandatoryParameters();

    //Générer l'URL pour les requêtes REST, dans le cas d'Oris on a le nom dans &data (jusqu'à un "_gestion.ini") et on rajoute un "s"
    this.webserviceUrl = this.generateWebserviceUrl();

    //Générer le nom de l'objet contenant les données une fois le JSON récupéré par requête GET
    this.rootName = this.generateRootName();
  };

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
