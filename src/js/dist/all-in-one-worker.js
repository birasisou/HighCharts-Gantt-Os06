/**
 * Worker récupérant les données d'une base Oris et les formattant pour un GanttChart
 **/

/**
 * @TO_SHARE
 * Publish / Subscribe Pattern
 * Permet d'abonner des fonctions à des évènements,
 * les fonctions seront executées à chaque fois que l'évènement se produit
 *
 * @Example:
 * PUB_SUB.publish('/page/load', {
 *   page_location: '/some/page_location/path' // any argument
 * });
 *
 * var subscription = PUB_SUB.subscribe('/page/load', function(obj) {
 *   // Do something now that the event has occurred
 * });
 *
 * // ...sometime later where I no longer want subscription...
 * subscription.remove();
 *
 * @type {{subscribe, publish}}
 */
let PUB_SUB = (function(){
  var topics = {};
  var hOP = topics.hasOwnProperty;

  return {
    subscribe: function(topic, listener) {
      // Create the topic's object if not yet created
      if(!hOP.call(topics, topic)) topics[topic] = [];

      // Add the listener to queue
      var index = topics[topic].push(listener) -1;

      // Provide handle back for removal of topic
      return {
        remove: function() {
          delete topics[topic][index];
        }
      };
    },
    publish: function(topic, info) {
      // If the topic doesn't exist, or there's no listeners in queue, just leave
      if(!hOP.call(topics, topic)) return;

      // Cycle through topics queue, fire!
      topics[topic].forEach(function(item) {
        item(info !== undefined ? info : {});
      });
    }
  };
})();

// @TO_PRIVATE
let CONFIG = {}; // ParametreUrlOris récupéré de la page principale
// "BD locale" des tâches (instancié
let orisTaskById = {};      // Row by ID, dictionnaire/hashmap des tâches (OrisGanttTask)

// TODO implémenter côté main page
let ALLOW_INVALID = false;

//Début du worker
self.onmessage = function(event) {
  // récupérer la config depuis l'Objet ParametresUrl appelant (ici, Oris) et lancer la récupération des données
  if (event.data.CONFIG) {
    CONFIG = event.data.CONFIG;
    autoUpdateData(CONFIG.webserviceUrl)

    // TODO Formatter / Corirger les valeurs ?
  }

  // TODO utiliser pour autoriser, côté main page, à recevoir des valeurs "invalides" (imaginons un popup signalant '3 valeurs étaient invalident et ont été ignorées'
  if (event.data.ALLOW_INVALID)
    ALLOW_INVALID = new OrisData(event.data.ALLOW_INVALID).asBoolean();

  // pour debug/test
  if (!event.data.LoggerModule) {
    self.postMessage({ LoggerModule: e.data});
  }

};

// TODO osef / delete
function initXMLHttpRequest(_xmlhttp) {
  // Comportement lorsque l'on reçoit un message de la page principale
  _xmlhttp.onreadystatechange = function() {
    try {
      if (_xmlhttp.readyState == XMLHttpRequest.DONE) {
        //CAS: Succès (200)
        if (_xmlhttp.status == 200) {

          // Formatter en JSON
          let response = JSON.parse(this.responseText);
          let formattedResponse = formatResponse(response, GLOBALS.nomRacine);

          // Parser les datas
          var yAxisAndSeriesDatas = parseFormattedResponse(formattedResponse);

          // Initialiser les axes Y / séries et regrouper avec la config vide
          creerLesAxesY(yAxisAndSeriesDatas);
          creerLesSeries(yAxisAndSeriesDatas);

          // Renvoyer toutes les config à la page principale
          self.postMessage({
            success: true,
            result: CONFIGS
          });
        }
        else if (_xmlhttp.status == 400) {
          throw {
            details: 'GET request resulted in error code: 400',
            exception: ""
          };
        }
        else {
          throw 'GET request resulted in error code other than 200 and 400';
        }
      }
    } catch (exc) {
      //Renvoyer un message d'erreur à la page principale
      self.postMessage({
        success: false,
        error: exc
      })
    }
  };
}

/**
 * S'occupe de tout
 *    > Fait la requête GET
 *    > Récupère les données du JSON
 *    > TODO Traite les nouvelles valeurs
 *    > TODO Informe la page principale des MàJ
 * @param url URL du web-service à contacter
 */
function autoUpdateData(url) {
  GET(url)                                    // requête
    .then(responseRootNameToJson(response))   // récupérer les données
    .then(updateLocal(rawTasksData))                                   // traiter les données
    .catch(postError(err))                    // S'il y a une erreur, on informe la page principale TODO: arrêter la boucle? OU permettre à la page principale d'arrêter la couble
    .finally();
}

//TODO: importer es6-promise.auto.min.js ? (le polyfill pour les Promise);
/**
 * Promise réalisant la requête GET vers l'URL passée en argument
 *
 * @param url
 * @returns {Promise<any>}
 * @constructor
 */
function GET(url) {
  // Return a new promise.
  return new Promise(function(resolve, reject) {
    // Do the usual XHR stuff
    let req = new XMLHttpRequest();
    req.open('GET', url, false);

    req.onload = function() {
      // This is called even on 404 etc
      // so check the status
      if (req.status === 200) {
        resolve(req.response);
      }
      else {
        // Otherwise reject with the status text
        // which will hopefully be a meaningful error
        reject(Error(req.statusText));
      }
    };

    // Handle network errors
    req.onerror = function() {
      reject(Error("Network Error"));
    };

    // Make the request
    req.send();
  });
}


/**
 * Convertir le résultat de la requête en JSON et y récupérer les données brutes via 'CONFIG.rootName'
 * @param {string} requestResponse
 *  résulat de la requête
 *
 * @return {JSON} array de données de la base Oris
 *
 * @throws si le parsing du JSON renvoie une erreur (Syntax Error)
 */
function responseRootNameToJson(requestResponse) {
  // Parse response to JSON
  let parsedResponse = undefined;
  //try {
    parsedResponse = JSON.parse(requestResponse);
  /*} catch (e) { // Détecter erreur de syntaxe du JSON
    throw new Error(e);
  }//*/

  // Récupérer les données à l'aide de "rootName"
  return parsedResponse[CONFIG.rootName]; //TODO dans d'autres bases, peut-être que le rootName sera 'nested' (exemple: 'root.baseName')
}

function updateLocal(rawTaskData) {
  let updatedTasks = {},
      invalidTasks = {},
      length = rawTaskData.length;

  // stocker les nouvelles valeurs et informer la page principale des changements
  while (length--) {
    // instancier la nouvelle tâche
    let currentOrisTask = new OrisGanttTask(rawTaskData[length], CONFIG),
        //ancienne valeur pour cette tâche
        oldTask = orisTaskById[currentOrisTask.getRaw('id')];

    // Ignorer les tâches "invalides" TODO (puis SIGNALER à la page principale)
    if (!currentOrisTask.isValidTask()) {
      invalidTasks[currentOrisTask.getRaw('id')] = currentOrisTask.rawUserOptions;
      continue;
    }

    // Ne rien faire si TOUTES les valeurs sont les mêmes
    if (oldTask === undefined
        || SHARED.objectEquals(oldTask.rawUserOptions, currentOrisTask.rawUserOptions))
      continue;

    // Remplacer la valeur et enregistrer ce remplacement TODO signaler ce remplacement
    updatedTasks[currentOrisTask.getRaw('id')] = orisTaskById[currentOrisTask.getRaw('id')] = currentOrisTask;
  }

  // Informer des éventuels changements de valeurs
  if (Object.keys(updatedTasks).length > 0) {
    postMessage({
      updatedTasks: updatedTasks
    });
  }

  //
}

/**
 * Renvoyer un message d'erreur (différent d'une exception proprement identifiée) à la page principale
 * @param errorMsg
 */
function postError(errorMsg) {
  postMessage({
    error: errorMsg
  });
}


/**
 * /!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\
 * TODO Vu qu'on ne peut pas importer de script dans un Web Worker (erreur de MIME), il faut C/C ce code.
 * TODO il faut donc penser à le faire à chaque fois que le code est modifié
 * /!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\
 */

/**
 * @DataModel pour une donnée Oris
 * le web-service renvoie toujours des données en string,
 * ce modèle nous sert à normaliser leur formatage
 * @param {string} _value valeur de la donnée
 * @constructor
 */
function OrisData(_value) {
  this.value = _value;
  this.booleanValue = undefined;
  this.dateValue = undefined;
  this.numberValue = undefined;
  this.rgbValue = undefined;
  this.timestampValue = undefined;

  this.update = function () {
    this.asBoolean();
    this.asDate();
    this.asNumber();
    this.asRgb();
    this.asTimestamp();
  };

  //Auto Init
  this.update();
}

/**
 * Récupérer la valeur brute
 */
OrisData.prototype.asRaw = function () {
  return this.value;
};

/**
 * Récupérer la valeur sous forme booléenne
 * @returns {null|boolean}
 */
OrisData.prototype.asBoolean = function () {
  return this.booleanValue !== undefined
    ? this.booleanValue
    : (this.booleanValue = this.tryParseBoolean());
};
/**
 * Tente de convertir la valeur brute en boolean
 * @returns {null|boolean}
 */
OrisData.prototype.tryParseBoolean = function () {
  if (typeof this.value == "boolean")
    return this.value;

  if (typeof this.value != "string")
    return null;

  switch (this.value.toLocaleLowerCase()) {
    case "true":
      return true;

    case "false":
      return false;

    default:
      return null;
  }
};

/**
 * Récupérer la valeur sous forme de nombre
 * @returns {null|Number}
 */
OrisData.prototype.asNumber = function () {
  return this.numberValue !== undefined
    ? this.numberValue
    : (this.numberValue = this.tryParseNumber());
};
/**
 * Tente de convertir la valeur brute en nombre
 * @returns {null|Number}
 */
OrisData.prototype.tryParseNumber = function () {
  if (this.value === null || this.value === undefined)
    return null;

  let tmpParsed = Number(this.value);
  return isNaN(tmpParsed) ? null
                          : tmpParsed;
};

/**
 * Récupérer la valeur sous forme de Date
 * @returns {Date}
 */
OrisData.prototype.asDate = function () {
  return this.dateValue !== undefined
    ? this.dateValue
    : (this.dateValue = this.tryParseDate());
};
OrisData.prototype.tryParseDate = function () {
  let parsedDate = new Date(this.value);

  //Si la date est invalide {Invalid Date}, les fonctions renvoient NaN
  //et NaN est le seul "type" qui n'est jamais égal à lui même (NaN === NaN -> false)
  return (parsedDate.getTime() !== parsedDate.getTime())
    ? null //la date est invalide / n'a pas pû être parsée automatiquement
    : parsedDate;
};

/**
 * Récupérer la valeur sous forme de timestamp (en ms, car JavaScript)
 * @returns {null|number}
 */
OrisData.prototype.asTimestamp = function () {
  return this.timestampValue !== undefined
    ? this.timestampValue
    : (this.timestampValue = this.tryParseTimestamp())
};
OrisData.prototype.tryParseTimestamp = function () {
  let parsedDate = this.asDate();

  return parsedDate
    ? parsedDate.getTime()
    : null;
};

/**
 * Récupérer la valeur sous forme de string représentant un RGB ou RGBA
 * @returns {null|string}
 */
OrisData.prototype.asRgb = function () {
  return this.rgbValue !== undefined
    ? this.rgbValue
    : (this.rgbValue = this.tryParseRgb());
};
OrisData.prototype.tryParseRgb = function () {
  let formattedRgb = this.value[0] === "#"
    ? this.value
    : ("#"+this.value);

  return isValidHexColor(formattedRgb) ? this.value : null;
};

/**
 * @TO_SHARE Teste si une chaine de caractère consitue une valeur hexadécimale (couleur) légale
 *
 * source: https://stackoverflow.com/questions/8027423/how-to-check-if-a-string-is-a-valid-hex-color-representation
 * - ^ match beginning
 * - # a hash
 * - [a-f0-9] any letter from a-f and 0-9
 * - {6} the previous group appears exactly 6 times
 * - $ match end
 * - i ignore case
 *
 * @param  {string}  stringToTest
 *     chaine de caractères à tester
 * @return {Boolean}
 *     true si la chaine est une couleur écrite en hexadécimal :
 *     - court (3 caractères, en plus du '#') "#cf9"
 *     - long (6) "#ccff99"
 *     - long, avec opacité (8) "#ccff9955"
 *     - court, avec opacité (4) "#f9f9"
 *     - même sans '#' initial "ccff9955" / "f9f9"
 *
 */
function isValidHexColor(stringToTest) {
  return /^#?(?:(?:[A-F0-9]{2}){3,4}|[A-F0-9]{3}|[A-F0-9]{4})$/i.test(stringToTest);
}
/**
 * /!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\
 * TODO Vu qu'on ne peut pas importer de script dans un Web Worker (erreur de MIME), il faut C/C ce code.
 * TODO il faut donc penser à le faire à chaque fois que le code est modifié
 * /!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\
 */

/**
 * @DataModel pour une tâche Oris
 * TODO: extends une classe du genre GanttDataModel
 * @param {Object} data_row
 *    Objet contenant les données des colonnes récupérées
 *    (&id, &start, &end, etc...)
 *
 * @param {ParametresUrlOris} parametres_url_oris_config
 *    configuration passée en paramètres (contient notamment les colonnes de la base Oris)
 *
 * @constructor
 */
function OrisGanttTask(data_row, parametres_url_oris_config) {
  // @Repository pattern (context) TODO l'init à part "{ id: 'id'
  this.ORIS_CONFIG = parametres_url_oris_config;

  this.rawUserOptions = {};

  this.userOptions = {}; //id, name, start, end, etc...

  /**
   * Initialise l'objet en récupérant de l'argument les valeurs correctement formattées (sinon, null) correspondant aux userOptions d'une série (Gantt)
   */
  this.init = function () {
    // Liste des paramètres "implémentés" d'une série HighCharts
    let keys = Object.keys(this.ORIS_CONFIG.CONSTANTS.HC_CONFIG_KEYS),
        length = keys.length;

    while (length--) {
      let key = keys[length];
      //On stock en dur pour debug
      this.rawUserOptions[key] = data_row[this.ORIS_CONFIG.CONSTANTS.HC_CONFIG_KEYS[key['url_param']]];
      //On stock directement la clé dans le format souhaité par HighCharts pour ne pas faire 3 boucles de plus
      this.userOptions[key] = new OrisData(this.rawUserOptions[key])[this.ORIS_CONFIG.CONSTANTS.HC_CONFIG_KEYS[key['format']]];
    }

    //TODO plus tard, ignorer les OrisGanttTask malformées (&id, &start ou &end incorrect, aka "null") lorsqu'on ajout

  };
}

/**
 * Une Tâche Oris est "valide" SSI &id, &start ET &end ne sont pas null
 *  &id est faux SSI il est vide ("")
 *  &start et &end sont "null" si le parsing à l'initialisation à foiré (.getTime() !== .getTime())
 *  &end est valide s'il est manquant SSI &milestone == true
 *
 * @return {boolean} true si la tâche est considérée comme "valide"
 */
OrisGanttTask.prototype.isValidTask = function () {
  return this.userOptions['id'].asRaw()
            && this.userOptions['start'].asDate()
            && (this.userOptions['end'].asDate() || this.userOptions['milestone']);
};

OrisGanttTask.prototype.get = function (key) {
  return this.userOptions[key];
};
OrisGanttTask.prototype.getRaw = function (key) {
  return this.rawUserOptions[key];
};
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
/**
 * @Module
 * Remplace la condition "isDebug" précédent chaque console.log/info/warn/error
 *
 * On peut envisager 3 états
 * @None désactive toutes les fonctions du Logger
 * @Semi désactive .log/.info
 * @All ne désactive rien
 *
 * @type {{warn, log, error, toggleOn, info}}
 */
let LoggerModule = (function () {
  return {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    setDebug: function(isOn) {
      this.log = isOn === true ? console.log : function () {};
      this.info = isOn === true ? console.info : function () {};
      this.warn = isOn === true ? console.warn : function () {};
      this.error = isOn === true ? console.error : function () {};
      return isOn;
    }
  }
}());

/**
 * /!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\
 * TODO Vu qu'on ne peut pas importer de script dans un Web Worker (erreur de MIME), il faut C/C ce code.
 * TODO il faut donc penser à le faire à chaque fois que le code est modifié
 * /!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\
 */

/**
 * @Subclass of ParametresUrl
 *
 * @param {string} pageUri
 *  @required
 *
 * @param {boolean} isEmptyAllowed
 *  @default false
 *
 * @param {boolean} isAlreadyDecoded
 *  @default false
 *
 * @constructor
 */
function ParametresUrlOris (pageUri, isEmptyAllowed, isAlreadyDecoded) {

  this.CONSTANTS = {
    // @url_param Définir ici comment on nomme chaque paramètre URL nécessaire à l'instanciation des séries HighCharts (en mode Gantt)
    // @format Et comment on souhaite les formater (parser en string, nombre, booléen, couleur, date, etc...)
    HC_CONFIG_KEYS: {
      id: { // {unique string} id de la tâche @MANDATORY
        url_param: 'id',    //paramètre URL contenant la colonne correspondante
        format: 'asRaw'  //fonction de formatage de OrisDataModel TODO @share ? @RepositoryPattern
      },
      start: {  // {date} date de début de la tâche @MANDATORY
        url_param: 'start',
        format: 'asTimestamp'
      },
      end: {  // {date} date de fin de la tâche @MANDATORY (sauf si 'milestone == true', auquel cas il faut null)
        url_param: 'start',
        format: 'asTimestamp'
      },
      name: { // {string} texte apparant sur la tâche
        url_param: 'name',
        format: 'asRaw'
      },
      milestone: {  // {boolean} true => il s'agit d'une milestone (un losange à une date fixe et pas une zone)
        url_param: 'is-milestone',
        format: 'asBoolean'
      },
      category: {   // {string} libellé de la "ligne" sur laquelle doit se trouver cette tâche
        url_param: 'category',
        format: 'asRaw'
      },
      dependency: { // {string} @id d'une autre tâche dont celle-ci dépend
        url_param: 'dependency',
        format: 'asRaw'
      },
      complete: { // {number} nombre entre 0 et 1 (il s'agit d'un pourcentage) désignant l'avancement d'une tâche
        url_param: 'complete',
        format: 'asNumber'
      },
      color: {  // {RGBA} couleur en RGB ou RGBA (avec ou sans '#', court ou long) de la tâche
        url_param: 'color',
        format: 'asRgb'
      },

      //TODO bonus
      owner: {  // {id} responsable de la tâche TODO (bonus) nécessite de modifier le tooltipFormatter, donc prévoir un loop sur un objet HC_OPTIONAL_CONFIG_KEYS et appeler leur formatters là
        url_param: 'owner',
        format: 'asRaw'
      },
      icon: {   // ne image (base64 ?) sur la task à gauche ou à droite (panneau danger, etc...) TODO (bonus) u
        url_param: 'icon',
        format: 'asRaw'
      }
    },

    PATH_KEY: "data",                     //clé du paramètres GET contenant le chemin de l'URI du webservice

    ROOT_NAME_IDENTIFIER: "_gestion.ini"  //identificateur du nom de base Oris (utilisé pour récupérer un sub-string du nom complet)
  };

  //Hériter de ParametresUrl
  ParametresUrl.call(this, pageUri, isEmptyAllowed, isAlreadyDecoded);

  //Paramètres OBLIGATOIRES de cette implémentation
  this.MANDATORY_GET_PARAMETERS = ["data", "id", "start", "end"];
  this.USER_INFOS = {
    HOST: undefined,
    ID_ORIS: undefined
  };


  /**
   * Extends basic init()
   */
  this.init = (function (oldInit) {
    return function() {
      //obligé de le dupliquer/rappeler ici pour ce qui suit.
      this.page_location = SHARED.stringToLocation(this.pageUri);   //nécessite une URI valide, c-à-d qui commence par un protocole (ftp, https, etc...)

      this.USER_INFOS.ID_ORIS = generateID_Oris.call(this);
      this.USER_INFOS.HOST = generateHost.call(this);
      oldInit.call(this);
    }
  })(this.init);

  /**
   * Récupère le nom de la base dans l'attribut "data="
   * ET
   * le formate (enlève _gestion.ini et rajoute un "s" (minuscule)
   * CE QUI correspond au nom de l'objet contenant les valeurs des Points/Axes etc...
   * qui sera siuté à la RACINE du JSON récupéré par la requête GET
   *
   * @return {string}  le nom de la base avec un "s" en plus
   */
  this.generateRootName = function() {
    if (this.rootName)
      return this.rootName;

    //en minuscules
    let lowerCasePath = this.asRaw[this.CONSTANTS.PATH_KEY].toLowerCase(),
      offset = this.CONSTANTS.ROOT_NAME_IDENTIFIER.length,
      //Récupère tout AVANT ".ini" dans l'attribut "data"
      chemin_ini = lowerCasePath.substring(0, lowerCasePath.lastIndexOf(this.CONSTANTS.ROOT_NAME_IDENTIFIER) + offset), //+12, car ".ini" = 4 caractères
      //Nom de la base AVEC "_gestion.ini"
      base_ini = chemin_ini.substring(chemin_ini.lastIndexOf("/") + 1);
      //Nom de la base SANS "_gestion.ini" et AVEC un "s" en plus
      this.rootName = base_ini.replace(this.CONSTANTS.ROOT_NAME_IDENTIFIER, "") + "s";
    return this.rootName;
    };

  /**
   * Génère l'URL du webservice Oris permettant de communiquer avec la base
   *  location.host inclu automatiquement le port s'il existe
   *
   * @return {string} l'URI du WebService distribuant les données des de la BD
   */
  this.generateWebserviceUrl = function() {
    return this.page_location.protocol + "//" + this.USER_INFOS.HOST + "/"
      + this.USER_INFOS.ID_ORIS + "/"
      + this.asRaw[this.CONSTANTS.PATH_KEY]   //&data
      + genererParamData.call(this);
  };

  /**
   * @private
   *
   * @param parametresAsRaw
   * @return {string}
   */
  function genererParamData() {
    let toutData = "?json=true";
    for(let i in this.asRaw) {
      if (this.asRaw.hasOwnProperty(i)
        && typeof this.asRaw[i] === "string"
        && i !== "data")
        toutData += "&" + i + "=" + this.asRaw[i];
    }
    return toutData;
  }

  /**
   * @private
   * Renvoie l'ID Oris en "splittant" l'page_location à chaque slash ("/")
   *
   * @return {string} id Oris
   */
  function generateID_Oris () {
    let path = this.page_location.pathname; // renvoie "/id-000192.168.1.74424011-0/reste/de/l/page_location/index.html"
    if (path.split("/")[1].indexOf("id-") >= 0) {
      this.USER_INFOS.ID_ORIS = path.split("/")[1];  //[0] est une chaine vide car le pathname commence par un "/"
      return this.USER_INFOS.ID_ORIS;
    } else
      throw new EXCEPTIONS.NoIdOrisOrHostDetected();
  }

  /**
   * @private
   * Renvoie l'attribut host de l'objet window.page_location, et non pas hostname,
   * afin d'inclure un éventuel port
   *
   * @return {string}
   */
  function generateHost() {
    this.USER_INFOS.HOST = this.USER_INFOS.HOST || this.page_location.host;
    if (!this.USER_INFOS.HOST)
      throw new EXCEPTIONS.NoIdOrisOrHostDetected();
    return this.USER_INFOS.HOST;
  }

  //Automatiquement initialiser l'Objet lorsqu'il est instancié
  this.init();
}

ParametresUrlOris.prototype.getAllButFunctions = function () {
  let thisWithoutFunction = {};
  for (let key in this) {
    if (typeof this[key] !== "function")
      thisWithoutFunction[key] = this[key];
  }

  // hackerino TODO trouver comment ne pas avoir à faire ça (transférer des fonctions via postMessage est impossible)
  if (thisWithoutFunction.page_location)
    thisWithoutFunction.page_location = undefined;

  return thisWithoutFunction;
};
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

  this.getJSON = function (callback) {

  }
}

// TODO serait mieux en module car "this"
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
    if (stringToParse !== fakeWindowLocation.href) {
      throw new EXCEPTIONS.StringIsNotAnUriException("'" + stringToParse + "' wasn\'t parsed to an URI (result: '" + fakeWindowLocation.href + "')");
    }
    return fakeWindowLocation;
  },

  /**
   * Transforme et stock les paramètres GET d'une URL en un Objet
   *
   * @param {object/ParametresUrl} target
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
   *    config pour un Objet ParametresUrl
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
      parametresSplit = [];

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
  },

  /**
   * Deep Object comparaison
   * @param {Object} x
   * @param {Object} y
   * @return {boolean}
   */
  objectEquals: function(x, y) {
    if (x === null || x === undefined || y === null || y === undefined) { return x === y; }
    // after this just checking type of one would be enough
    if (x.constructor !== y.constructor) { return false; }
    // if they are functions, they should exactly refer to same one (because of closures)
    if (x instanceof Function) { return x === y; }
    // if they are regexps, they should exactly refer to same one (it is hard to better equality check on current ES)
    if (x instanceof RegExp) { return x === y; }
    if (x === y || x.valueOf() === y.valueOf()) { return true; }
    if (Array.isArray(x) && x.length !== y.length) { return false; }

    // if they are dates, they must had equal valueOf
    if (x instanceof Date) { return false; }

    // if they are strictly equal, they both need to be object at least
    if (!(x instanceof Object)) { return false; }
    if (!(y instanceof Object)) { return false; }

    // recursive object equality check
    var p = Object.keys(x);
    return Object.keys(y).every(function (i) { return p.indexOf(i) !== -1; }) &&
      p.every(function (i) { return SHARED.objectEquals(x[i], y[i]); });
  }

};

/** Gulp concat
  gulp.task('script', function() {
    return gulp.src(['./js/workers/*.js', './js/models/*.js', './js/utils/*.js'])
      .pipe(concat('all-in-one-worker.js'))
      .pipe(gulp.dest('./js/dist/'));
  });
 //*/