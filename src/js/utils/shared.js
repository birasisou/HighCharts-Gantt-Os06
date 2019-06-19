// Magouille pour pouvoir transférer (ENTRE AUTRES) SHARED au Web Worker
function SHARED_FACTORY() {
  return {
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
    isFrenchShortDate: function (str) {
      if (!/^(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}$/.test(str)) return false;
      let tmp = null;
      if (str.indexOf("/"))
        tmp = str.split("/");
      else
        tmp = str.split("-");

      // On transforme DD/MM/YYYY en MM/DD/YYYY
      let d = new Date(tmp[1] + "/" + tmp[0] + "/" + tmp[2]);
      return ((d.toISOString() === str || d.toISOString() === (str.slice(0, -1)+".000Z"))
        && d.getTime() === d.getTime()); // false si Invalid Date car (NaN === NaN) => false
    },

    /**
     * Importe dynamiquement un script
     * @param {String} url
     */
    loadJsScript: function(url) {
    if (arguments.length < 1)
      throw new EXCEPTIONS.MissingArgumentExcepetion("[initOrisGanttChartConfigModel url]");

    let script = document.createElement("script");  // create a script DOM node
    script.src = url;  // set its src to the provided URL

    document.head.appendChild(script);  // add it to the end of the head section of the page (could change 'head' to 'body' to add it to the end of the body section instead)
  }
}
}

// Objet global comme avant
let SHARED = new SHARED_FACTORY();

/** Gulp concat
  gulp.task('script', function() {
    return gulp.src(['./js/workers/*.js', './js/models/*.js', './js/utils/*.js'])
      .pipe(concat('all-in-one-worker.js'))
      .pipe(gulp.dest('./js/dist/'));
  });
 //*/