// Magouille pour pouvoir transférer (ENTRE AUTRES) SHARED au Web Worker
function SHARED_FACTORY() {
  return {
    /*
     * Valeur réservée par Oris pou signifier qu'une valeur est "vide"
     * (on ne peut pas push une valeur vide via une requête GET)
     */
    ORIS_EMPTY_VALUE: "", // todo ne marche pas, faute du service: marche avec l'URL &mchX, mais pas la mienne, où j'utilise les vrais ID des colonnes, et pas leur index

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
    /*stringToLocation: function (stringToParse) {
      let fakeWindowLocation = document.createElement('a');
      fakeWindowLocation.href = stringToParse;
      LoggerModule.info("stringToParse", stringToParse);
      LoggerModule.log("fakeWindowLocation.href", fakeWindowLocation.href);
      if (stringToParse.toLowerCase() !== fakeWindowLocation.href && (stringToParse.toLowerCase() + '/') !== fakeWindowLocation.href) {
        throw new EXCEPTIONS.StringIsNotAnUriException("'" + stringToParse + "' wasn\'t parsed to an URI (result: '" + fakeWindowLocation.href + "')");
      }
      return fakeWindowLocation;
    },*/
    stringToLocation: function (stringToParse) {
      let fakeWindowLocation = document.createElement('a');
      fakeWindowLocation.href = stringToParse;
      LoggerModule.info("stringToParse", stringToParse);
      LoggerModule.log("fakeWindowLocation.href", fakeWindowLocation.href);

      if (stringToParse != fakeWindowLocation.href
        && stringToParse.toLowerCase() != fakeWindowLocation.href.toLowerCase()
        && (stringToParse+'/') != fakeWindowLocation.href
        && (stringToParse+'/').toLowerCase() != fakeWindowLocation.href.toLowerCase())
      {
        LoggerModule.log("stringToParse", stringToParse);
        LoggerModule.log("fakeWindowLocation.href", fakeWindowLocation.href);
        LoggerModule.log("stringToParse != fakeWindowLocation.href", stringToParse != fakeWindowLocation.href);

        LoggerModule.log("stringToParse.toLowerCase()", stringToParse.toLowerCase());
        LoggerModule.log("fakeWindowLocation.hreftoLowerCase()", fakeWindowLocation.href.toLowerCase());
        LoggerModule.log("stringToParsetoLowerCase() != fakeWindowLocation.hreftoLowerCase()", stringToParsetoLowerCase() != fakeWindowLocation.hreftoLowerCase());

        LoggerModule.log("(stringToParse+'/')", (stringToParse+'/'));
        LoggerModule.log("(stringToParse+'/') != fakeWindowLocation.href", stringToParse != fakeWindowLocation.href);

        LoggerModule.log("(stringToParse+'/').toLowerCase()", (stringToParse+'/').toLowerCase());
        LoggerModule.log("(stringToParse+'/').toLowerCase() != fakeWindowLocation.href.toLowerCase()", (stringToParse+'/').toLowerCase() != fakeWindowLocation.href.toLowerCase());

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
     *    getConfig pour un Objet ParametresUrl
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
      // {string} sous partie de l'URI commençant au "?" (équivaut à window.page_location.search)
      parametresUrl.locationSearch = _location.search;

      // EXCEPTIONS: URI vide et/ou sans paramètres GET
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

        parametresUrl.asArray["_" + arr[0]] = (parametresUrl.asRaw[arr[0]]).split(";");
      }
      return parametresUrl;
    },

    /**
     * Deep Object comparaison
     * @param {Object} x
     * @param {Object} y
     * @return {boolean}
     */
    objectEquals: function (x, y) {
      if (x === null || x === undefined || y === null || y === undefined) {
        return x === y;
      }
      // after this just checking type of one would be enough
      if (x.constructor !== y.constructor) {
        return false;
      }
      // if they are functions, they should exactly refer to same one (because of closures)
      if (x instanceof Function) {
        return x === y;
      }
      // if they are regexps, they should exactly refer to same one (it is hard to better equality check on current ES)
      if (x instanceof RegExp) {
        return x === y;
      }
      if (x === y || x.valueOf() === y.valueOf()) {
        return true;
      }
      if (Array.isArray(x) && x.length !== y.length) {
        return false;
      }

      // if they are dates, they must had equal valueOf
      if (x instanceof Date) {
        return false;
      }

      // if they are strictly equal, they both need to be object at least
      if (!(x instanceof Object)) {
        return false;
      }
      if (!(y instanceof Object)) {
        return false;
      }

      // recursive object equality check
      var p = Object.keys(x);
      return Object.keys(y).every(function (i) {
          return p.indexOf(i) !== -1;
        }) &&
        p.every(function (i) {
          return SHARED.objectEquals(x[i], y[i]);
        });
    },

    /**
     * Quick and limited Object comparator using JSON.stringify
     *  JSON.stringify turns the object into a String, ignoring the functions) and compares these,
     *  essentially comparing only all of the Objects values
     * @param {Object} obj1
     * @param {Object} obj2
     * @return {boolean}
     */
    quickObjectEquals: function (obj1, obj2) {
      return JSON.stringify(obj1) === JSON.stringify(obj2);
    },

    /**
     * Check si une chaîne de caractères est une Date au format ISO
     * @param {string} str
     * @return {boolean} true SSI exactement le format ISO (norme Ecmascript, Zulu time)
     */
    isIsoDate: function (str) {
      if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(str) && !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(str)) return false;
      let d = new Date(str);
      return ((d.toISOString() === str || d.toISOString() === (str.slice(0, -1)+".000Z"))
        && d.getTime() === d.getTime()); // false si Invalid Date car (NaN === NaN) => false
    },

    /**
     * Check si une chaîne de caractère est une Date au format "Short Date" mais Européen (DD/MM/YYYY, au lieu du natif MM/DD/YYYY)
     * @param str
     * @return {boolean}
     */
    isShortFrenchDate: function (str) {
      if (!(/^(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}$/.test(str))) return false;
      let tmp = (str.indexOf("/")) ? str.split("/") : str.split("-");
      LoggerModule.log("[isShortFrenchDate] tmp", tmp);
      // On transforme DD/MM/YYYY en MM/DD/YYYY
      let d = new Date(tmp[1] + "/" + tmp[0] + "/" + tmp[2]);
      LoggerModule.log("[isShortFrenchDate] date", d);

      // return ((d.toISOString() === str || d.toISOString() === (str.slice(0, -1)+".000Z")) &&
      return d.getTime() === d.getTime(); // false si Invalid Date car (NaN === NaN) => false
    },

    /**
     * Tenter de transformer le paramètre en une Date écrite au format court DD/MM/YYYY
     * @param {Date|moment|Number} date
     *    Date à transcrire.
     *    La chaîne de caractère est interprétée différemment par le constructeur Date selon les navigateurs donc OSEF
     *
     * @return {String|undefined}
     */
    toShortFrenchDate: function (date) {
      if (typeof date === "number")
        date = new Date(date);

      // Déjà une Date valide ou objet MomentJS ?
      if (typeof date === "object") {
        if (date._isAMomentObject)
          date = date._d;
        if (typeof date.getTime()) // Date Invalid --> .getTime() == NaN
          // IMPÉRATIF d'utiliser les valeurs UTC car c'est celles-ci qui sont "uniformes" et que l'on fixe avec des `.setTime(23*3600*1000-offset...)`
          return (date.getUTCDate() < 10 ? "0": "") + date.getUTCDate()
            + "/" + ((date.getUTCMonth() + 1) < 10 ? "0" : "") + (date.getUTCMonth() + 1)
            + "/" + date.getUTCFullYear();
      }

      return undefined;
    },

    /**
     * https://stackoverflow.com/questions/1187518/how-to-get-the-difference-between-two-arrays-in-javascript
     * Compare two arrays (of primitive values) and returns
     * @param {Array} arr1
     * @param {Array} arr2
     *
     * @return {Array} array of the elements from the first Array NOT CONTAINED in the second (NOT symmetric difference)
     */
    arrayDifference: function (arr1, arr2) {
      return arr1.filter(function (i) {
        return arr2.indexOf(i) < 0;
      });
    },

    /**
     * Importe dynamiquement un script
     * @param {String} url
     */
    loadJsScript: function(url) {
      if (arguments.length < 1)
        throw new EXCEPTIONS.MissingArgumentException("[initOrisGanttChartConfigModel url]");

      let script = document.createElement("script");  // create a script DOM node
      script.src = url;  // set its src to the provided URL

      document.head.appendChild(script);  // add it to the end of the head section of the page (could change 'head' to 'body' to add it to the end of the body section instead)
    },

    /**
     * Décode les entités HTML d'un string
     *  utilise l'objet `document` et, de ce fait, ne peut pas être utilisé par un Worker
     *  (j'intègre donc une version alternative qui ne remplace, "en dur", que les 4 entités ASCII
     *  - & == &amp;
     *  - < == &lt;
     *  - >	== &gt;
     *  - " == &quot;
     *
     * @param {string} html
     * @returns {string|undefined}
     */
    decodeHTML: function (html) {
      // version Document (classique)
      if (typeof document !== "undefined") {
        var txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
      }
      else
        // version Workers
        return html ? html.replace(/&amp;/gmi, '&')
          .replace(/&lt;/gmi, '<')
          .replace(/&gt;/gmi, '>')
          .replace(/&quot;/gmi, '"') : html;
    },

    /**
     * Remplace, s'il existe, le paramètre de l'URL par la valeur spécifiée
     *
     * @param {String} url
     *    chaîne de caractères où l'on va chercher le paramètre
     * @param {String} param
     *    clef (paramètre) à trouver
     * @param {String} newValue
     *
     */
    addOrReplaceUrlParam: function (url, param, newValue) {
      if (!url || !param)
        throw new EXCEPTIONS.InvalidArgumentException("[SHARED.addOrReplaceUrlParam] URL or Param argument ");
      newValue = newValue || "";

      /*
      let symbol = "&";

      let paramStart = url.indexOf(symbol + param + "=");
      if (paramStart < 0) {	// potentiellement, il est le premier param... c'est pour ça qu'il faudrait plutôt utiliser un regex
        symbol = "?";
        paramStart = url.indexOf(symbol + param + "=");
        if (paramStart < 0)	// n'existe pas
          return url + "&" + param + "=" + newValue;
      }

      let paramEnd = url.indexOf("&", paramStart+1);
      if (paramEnd < 0)	//	s'il est le dernier paramètre donc pas de "&" après
        paramEnd = url.length;

      return url.replace(url.substring(paramStart, paramEnd), (symbol + param +"=" + newValue));
      // */

      // Version Regex
      let match = url.match(new RegExp("[\?|&]" + param + "=([^&]+)"));

      // Remplacer le paramètre de l'URL
      // OU
      // juste l'ajouter
      return match ? url.replace(match[0], match[0][0] + param + "=" + newValue) : (url + "&" + param + "=" + newValue);  // Pas besoin d'encodeURIComponent
    },

    promiseGET: function (url) {
      // Return a new promise.
      return new Promise(function(resolve, reject) {
        // Do the usual XHR stuff
        let req = new XMLHttpRequest();
        req.open('GET', url, true);

        req.onload = function() {
          LoggerModule.log("[GET.onload] req.status", req.status);
          // This is called even on 404 etc
          // so check the status
          if (req.status === 200) {
            LoggerModule.log("[GET.onload] req.response", req.response);
            resolve(req.response);
          }
          else {
            // Otherwise reject with the status text
            // which will hopefully be a meaningful error
            let msg = "[GET.onload] req.status !== 200. \nActual req.status: " + req.status;
            LoggerModule.error(msg);
            reject(Error(msg));
          }
        };

        // Handle network errors
        req.onerror = function(e) {
          LoggerModule.error("[GET.onerror] Network Error. e:", e);
          LoggerModule.error("[GET.onerror] Network Error. xhr.statusText: ", "'" + req.statusText + "'");
          LoggerModule.error("[GET.onerror] Network Error. xhr.status:", req.status);
          reject(Error("[GET.onerror] Network Error "+ req.statusText +"(" + req.status + ")"));
        };

        // Make the request
        req.send();
      });
    }
  }
}

// Objet global comme avant
let SHARED = new SHARED_FACTORY();