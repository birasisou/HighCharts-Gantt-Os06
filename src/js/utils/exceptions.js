const EXCEPTIONS = {
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
    this.type = "NoParametersDetectedInURI";
    this.description = "No URI parameters detected";
    this.message = msg || undefined;
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
    this.type = "InvalidArgumentExcepetion";
    this.description = "An invalid argument was passed to a function";
    this.message = msg || undefined;
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
    this.type = "NotImplementedException";
    this.description = "This function is not yet implemented";
    this.message = msg || undefined;
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
    this.type = "NoMandatoryUrlParameterDetected";
    this.description = "A mandatory GET parameter was missing or has no value";
    this.message = msg || undefined;
  },

  /**
   * Exception renvoyée si l'host ou l'ID-Oris n'est pas détecté dans l'URI de la page (normalement passé en paramètre au constructeur)
   * @param msg
   * @constructor
   */
  NoIdOrisOrHostDetected: function (msg) {
    this.type = "NoIdOrisOrHostDetected";
    this.description = "Erreur lors de la récupération de l'ID-Oris ou de l'host";
    this.message = msg || undefined;
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
    this.type = "StringIsNotAnUriException";
    this.description = 'A string was not parsed into a Location object. Missing protocole ("http", "https", "ftp", ...) could be the reason';
    this.message = msg || undefined;
  }
};