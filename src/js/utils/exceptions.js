const EXCEPTIONS = {
  /**
   * Constructeur pour toutes les Exceptions
   *
   * @param _type {string}
   *    EXACTEMENT le nom de la fonction/exception
   *    sert pour faire un faux "type of" / "class name"
   *
   * @param _description {string}
   *    description générale prédéfinie de l'excepion
   *
   * @param _msg {string}
   *    message passé en paramètre lorsque l'exception est thrown
   *    sert à détailler cette exception en particulier
   *
   * @constructor
   */
  DefaultException: function(_type, _description, _msg) {
    this.type = _type;
    this.description = _description;
    this.message = _msg ||undefined;
  },

  /**
   * Exception renvoyée si l'URL de la page (passé en argument de la fonction init) ne contient pas de paramètres GET
   * (commence à "?", sont séparés par des "&" et ont la forme <clé>=<valeur>
   *
   * @param {string} msg
   *   @default undefined
   *   message complémentaire utilisé pour détailler l'erreur et faciliter le débug
   *
   * @constructor
   */
  NoParametersDetectedInURI: function (msg) {
    EXCEPTIONS.DefaultException.call(this,
      "NoParametersDetectedInURI",
      "No URI parameters detected",
      msg);
  },

  /**
   * Exception renvoyée si un argument passé à une fonction est jugé comme invalide
   *
   * @param {string} msg
   *   @default undefined
   *   message complémentaire utilisé pour détailler l'erreur et faciliter le débug
   *
   * @constructor
   */
  InvalidArgumentExcepetion: function (msg) {
    EXCEPTIONS.DefaultException.call(this,
      "InvalidArgumentExcepetion",
      "An invalid argument was passed to a function",
      msg);
  },

  /**
   * Exception renvoyée si une fonction non implémentée est appelée.
   * Elle peut être en cours dedéveloppement
   * OU
   * Un objet (interface / class abstraite) a été hérité mais pas correctement implémenté
   *
   * @param {string} msg
   *   @default undefined
   *   message complémentaire utilisé pour détailler l'erreur et faciliter le débug
   *
   * @constructor
   */
  NotImplementedException: function (msg) {
    EXCEPTIONS.DefaultException.call(this,
      "NotImplementedException",
      "This function is not yet implemented",
      msg);
  },

  /**
   * Exception renvoyée si l'URL de la page (passé en argument de la fonction init)
   * ne contient pas l'un des paramètres GET obligatoires nécessaire à la communication avec une base
   * ou celui-ci n'a pas de valeurs
   *
   * @param {string} msg
   *   @default undefined
   *   message complémentaire utilisé pour détailler l'erreur et faciliter le débug
   *
   * @constructor
   */
  NoMandatoryUrlParameterDetected: function (msg) {
    EXCEPTIONS.DefaultException.call(this,
      "NoMandatoryUrlParameterDetected",
      "A mandatory GET parameter was missing or has no value",
      msg);
  },

  /**
   * Exception renvoyée si l'host ou l'ID-Oris n'est pas détecté dans l'URI de la page (normalement passé en paramètre au constructeur)
   * @param msg
   * @constructor
   */
  NoIdOrisOrHostDetected: function (msg) {
    EXCEPTIONS.DefaultException.call(this,
      "NoIdOrisOrHostDetected",
      "Erreur lors de la récupération de l'ID-Oris ou de l'host",
      msg);
  },

  /**
   * Exception renvoyée si une string n'a pas pu être parsé en objet Location (en gros, une URI)
   * Ceci peut arriver si le string ne comprenait pas de protocole
   *
   * (et vu que le parsing enlève les vides inutiles, " http://foo.bar " sera différent après parsing, i.e "http://foo.bar")
   *
   * @param msg
   * @constructor
   */
  StringIsNotAnUriException: function (msg) {
    EXCEPTIONS.DefaultException.call(this,
      "StringIsNotAnUriException",
      "'A string was not parsed into a Location object. Missing protocole (\"http\", \"https\", \"ftp\", ...) could be the reason'",
      msg);
  },

  XMLHttpBadRequestException: function (msg) {
    EXCEPTIONS.DefaultException.call(this,
      "XMLHttpBadRequestException",
      "XMLHttpRequest resulted with a status code of '400 Bad Request'",
      msg);
  }
};