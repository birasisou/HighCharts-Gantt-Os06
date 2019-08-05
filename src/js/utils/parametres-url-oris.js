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
      chart: {
        title: {
          url_param: 'title',
          format: 'asString'
        },
        subtitle: {
          url_param: 'title',
          format: 'asString'
        }
      },
      dataLabel: {
        // prefix
        // suffix
        // idefix
      },
      data: {
        // ID unique, automatique, d'un Point Oris
        // On ajoute "manuellement" '&_id=id'
        vline: {
          url_param: '_id',
          format: 'asString'
        },

        id: { // {unique string} id de la tâche @MANDATORY
          url_param: 'id',    //paramètre URL contenant la colonne correspondante
          //format: 'asRaw'  //fonction de formatage de OrisDataModel TODO @share ? @RepositoryPattern
          format: 'asString'  //fonction de formatage de OrisDataModel TODO @share ? @RepositoryPattern
        },
        start: {  // {date} date de début de la tâche @MANDATORY
          url_param: 'start',
          format: 'asTimestamp'
        },
        end: {  // {date} date de fin de la tâche @MANDATORY (sauf si 'milestone == true', auquel cas il faut null)
          url_param: 'end',
          format: 'asTimestamp'
        },
        name: { // {string} texte apparant sur la tâche
          url_param: 'category',
          // url_param: 'name',
          format: 'asString'
        },
        category: {   // {string} libellé de la "ligne" sur laquelle doit se trouver cette tâche
          url_param: 'category',
          format: 'asString'
        },
        dependency: { // {string} @id d'une autre tâche dont celle-ci dépend
          url_param: 'dependency',
          format: 'asStringOrFalse'
        },
        completed: { // {number} nombre entre 0 et 1 (il s'agit d'un pourcentage) désignant l'avancement d'une tâche
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
          format: 'asString'
        },
        icon: {   // ne image (base64 ?) sur la task à gauche ou à droite (panneau danger, etc...) TODO (bonus) css INLINE à partir de la base64 ?
          url_param: 'icon',
          format: 'asString'
        },
        label: {
          // url_param: 'label', // 'desc',
          url_param: 'name',
          format: 'asString'
        },
        parent: {
          url_param: 'parent',
          format: 'asString'
        }
      },
      flippedData: {}
    },

    PATH_KEY: "data",                     //clé du paramètres GET contenant le chemin de l'URI du webservice

    ROOT_NAME_IDENTIFIER: "_gestion.ini"  //identificateur du nom de base Oris (utilisé pour récupérer un sub-string du nom complet)
  };

  /**
   * On aura besoin de la liaison inverse (du paramètre GET, query, à l'userOptions HighCharts
   */
  for (let option in this.CONSTANTS.HC_CONFIG_KEYS.data) {
    this.CONSTANTS.HC_CONFIG_KEYS.flippedData[this.CONSTANTS.HC_CONFIG_KEYS.data[option]["url_param"]] = option;
  }

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
      this.page_location = SHARED.stringToLocation(this.pageUri + "&_id=id");   //nécessite une URI valide, c-à-d qui commence par un protocole (ftp, https, etc...)

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
   *  location.host inclut automatiquement le port s'il existe
   *
   * @return {string} l'URI du WebService distribuant les données des de la BD
   */
  this.generateWebserviceUrl = function() {
    return this.page_location.protocol + "//" + this.USER_INFOS.HOST + "/"
      + this.USER_INFOS.ID_ORIS + "/"
      + this.asRaw[this.CONSTANTS.PATH_KEY]   //&data
      + genererParamData.call(this)
      + "&_id=id";  // On veut stocker l'ID unique en tant que "vline" mais &vline fait foirer la requête
  };

  /**
   * Génère le début de l'URL permettant une action sur la Base
   * (avec le paramètre demandant un format JSON, &json=true)
   *
   * @param {String} act
   *  Actions possibles:
   *    - modif, modifier un tuple de la Base
   *    - newvalid, créer un nouveau tuple dans la Base
   *    - kill, supprimer un tuple de la Base
   *
   * @return {string} le début d'URL pour l'action voulue
   */
  this.generateWebserviceActionUrl = function(act) {
    LoggerModule.log("[generateWebserviceActionUrl] act param", act);

    if (!act || (act !== "modif" && act !== "newvalid" && act !== "kill"))
      throw new EXCEPTIONS.InvalidArgumentExcepetion("[generateWebserviceActionUrl] Le paramètre &act=" + act + " n'est pas valide.");

    let url = this.webserviceUrl.slice(0, this.webserviceUrl.indexOf("?"))
      + "?json=true&act=" + act;

    return url;
  };

  /**
   * Génère l'URL permettant de modifier un "Point" dans la base
   *
   * @param {Object} userOptions
   *  données (userOptions) du Point à MàJ
   *    /!\ DOIT IMPÉRATIVEMENT CONTENIR L'ATTRIBUT vline
   */
  this.generateWebserviceUpdateUrl = function(userOptions) {
    LoggerModule.log("[generateWebserviceUpdateUrl] input param", userOptions);

    if (typeof userOptions !== "object")
      throw new EXCEPTIONS.InvalidArgumentExcepetion("[generateWebserviceUpdateUrl] Le paramètre doit être un Objet contenant les attributs du Point à modifier " + userOptions);

    if (!userOptions.vline && !userOptions.vline !== 0)
      throw new EXCEPTIONS.InvalidArgumentExcepetion("[generateWebserviceUpdateUrl] Le paramètre doit contenir l'attribut vline");

    let url = this.generateWebserviceActionUrl("modif");
    // ajouter les clé/valeurs à modifier AU FORMAT DE LA BASE ORIS (Date DD/MM/YYYY mais on perd les heures...)
    for (let option in userOptions) {
      url += "&" + option + "=" + userOptions[option];
    }
    return encodeURI(url);
  };

  this.generateWebserviceAddUrl = function(userOptions) {
    console.log("[generateWebserviceAddUrl] input param", userOptions);

    if (typeof userOptions !== "object")
      throw new EXCEPTIONS.InvalidArgumentExcepetion("[generateWebserviceUpdateUrl] Le paramètre doit être un Objet contenant les attributs du Point à modifier " + userOptions);

    let url = this.generateWebserviceActionUrl("newvalid");
    // ajouter les clé/valeurs à modifier AU FORMAT DE LA BASE ORIS (Date DD/MM/YYYY mais on perd les heures...)
    for (let option in userOptions) {
      url += "&" + option + "=" + userOptions[option];
    }

    // remove &id=&vline=

    return encodeURI(url);
  };

  /**
   *
   * @param {Object} formattedData
   * @param {boolean} isAddRequest
   *  @default false
   */
  this.tryAddOrEditPoint = function (formattedData, isAddRequest) {
    let self = this,  // Pas nécessaire mais bonne pratique ???
      initToast = TOAST.info({
        header: "Trying to " + ( isAddRequest ?  "create a new task" : ("edit Task #" + formattedData.vline) ),
        // delay: 10000  // Il y a peut-être un risque que le Toast ne se masque pas si la réponse du Worker arrive trop vite (très improbable)
        autoHide: false
      });
    LoggerModule.log("INIT TOAST", initToast);

    

    return new Promise(function (resolve, reject) {
      // todo show loading
      //APP_MODULE.getLoadingSpinnerHandler().showLoading();
      //  try POST request
      //  onsuccess
      //   hideLoading
      //   hideModal
      //   success notification
      //  onerror
      //   hideLoading
      //   ? hideModal ?
      //   error notification
      
      
      // Generate & encode URI
      let url = isAddRequest ? APP_MODULE.getParametresUrlOris().generateWebserviceAddUrl(formattedData) : APP_MODULE.getParametresUrlOris().generateWebserviceUpdateUrl(formattedData);

      console.warn("Point update URL", url);
      resolve(url);
    })
      .then(SHARED.promiseGET)
      // GET
      // SHARED.promiseGET(url)
      // JSON Parse
      .then(function (response) {
        LoggerModule.warn("Trying to parse:", response);
        try {
          return JSON.parse(response);
        } catch (e) {
          LoggerModule.warn("But got Error", e);
          throw Error("Unable to parse response to JSON. " + e.message);
        }
      })
      // extract root
      // /!\ The rootName doesn't contain the additional "s" (GET => rootName is "<something>s"; POST => rootName is "<something>") /!\
      .then(function (json) {
        let root = json[APP_MODULE.getParametresUrlOrisNoFunction().rootName.slice(0, -1)];  // sans le "s" bonus
        if (!root)
          throw new Error("Unable to extract root (" + APP_MODULE.getParametresUrlOrisNoFunction().rootName.slice(0, -1) + ") from JSON", json);
        return root;
      })
      // The server replies with its stored value for the given vline ID.
      // We have to check if this data is what we pushed (success) or different (failed)
      // AND
      // In this case, the root contains the Object (usually, it's an Array of Objects)
      .then(function (root) {
        // TODO check values
        //    hide modal
        let postedTask = new OrisGanttTask(formattedData, APP_MODULE.getParametresUrlOrisNoFunction()),
          actualTask = new OrisGanttTask(root, APP_MODULE.getParametresUrlOrisNoFunction()),
          flippedDataKeys = APP_MODULE.getParametresUrlOrisNoFunction().CONSTANTS.HC_CONFIG_KEYS.flippedData;

        LoggerModule.log("formattedData", formattedData);
        LoggerModule.log("postedTask", postedTask);
        LoggerModule.log("actualTask", actualTask);

        // On ne compare que les valeurs modifiées
        // et on les formatte en userOptions
        for (let attr in formattedData) {
          if (!flippedDataKeys[attr])
            continue;

          let currentPosted = postedTask["userOptions"][flippedDataKeys[attr]],
            currentActual = actualTask["userOptions"][flippedDataKeys[attr]];

          console.log("- (userOptions' value) Is formattedData[" + flippedDataKeys[attr] + "]: " + (typeof currentPosted === "object" ? JSON.stringify(currentPosted) : currentPosted)
            + ", === to root[" + flippedDataKeys[attr] + "]: " +  (typeof currentPosted === "object" ? JSON.stringify(currentActual) : currentActual) + " ?");
          // if (actualTask["userOptions"][attr] !== postedTask["userOptions"][attr])
          if (typeof currentPosted === "object") {
            if (JSON.stringify(currentPosted) !== JSON.stringify(currentActual))
              throw "Mise à jour du Point échouée.<br/>La valeur ('" + flippedDataKeys[attr] + "'->"+ JSON.stringify(currentPosted) + "') du formulaire est différente de celle récupérée depuis le serveur (->'" + JSON.stringify(currentActual) +"').";
          } else if (SHARED.decodeHTML(currentPosted) !== SHARED.decodeHTML(currentActual))
            throw "Mise à jour du Point échouée.<br/>La valeur ('" + flippedDataKeys[attr] + "'->'"+ SHARED.decodeHTML(currentPosted) + "') du formulaire différentes de celle récupérée depuis le serveur(->'" + SHARED.decodeHTML(currentActual) + "').";
        }

        // Success Toast
        TOAST.turnSuccess(initToast, {
          header: "Task " + (isAddRequest ? " created" : "#" + formattedData.id + " successfuly updated") + "."
        });
        return true;
      })
      .catch(function (err) {
        LoggerModule.error("Data update error:", err);
        alertify.postErrorAlert(err.description || err.message || err);
        // Turn into Error Toast
        TOAST.turnError(initToast, {
          header: "Failed to " + (isAddRequest ? "add new Task" : "update Task #" + formattedData.id) + "."
        });

        // Masquer le Toast nous-même après 3 secondes
        // Vu qu'il y a eu une erreur, le Worker ne va pas update et donc pas appeler TOAST.removeOutdateds
        setTimeout(function() {
          TOAST.removeTarget(initToast);
        }, 3000);

        // Ne pas fermer le modal
        return false; // TODO osef car on veut "non bloquantes" ?
      })
      .then(function (success) {
        // Prépare le Toast initial pour destruction automatique (ne sera détruit qu'une fois que le Worker renvoie
        initToast.setAttribute("outdated", true);

        // Juste au cas où, mais, en soit, s'il y a succès mais que le Toast ne disparait pas c'est qu'il n'y a pas eu de MàJ
        // todo d'après le Worker
        // surement que l'attribut "&id" est différent de vline (et, forcément, n'est pas affecté lors de la création...)
        setTimeout(function() {
          TOAST.removeTarget(initToast);
        }, 15000);

        // TODO osef car on veut "non bloquantes" ?
        return success;
      });
  };

  /**
   * Génère l'URL permettant de supprimer un "Point" de la base
   *  (&act=kill)
   *
   * @param {Object} userOptions
   *  Options du point à supprimer. Doit impérativement contenir une valeur vline et start
   */
  this.generateWebserviceDeleteUrl = function(userOptions) {
    if (!userOptions)
      throw new Error("[generateWebserviceDeleteUrl] Le paramètre est absent ou invalide."); // EXCEPTIONS.InvalidArgumentExcepetion("[generateWebserviceDeleteUrl] Le paramètre est absent ou invalide.");

    if (typeof userOptions !== "object"
      || !userOptions["vline"]
      || !userOptions["start"]
    )
      throw new EXCEPTIONS.InvalidArgumentExcepetion("[generateWebserviceDeleteUrl] Le paramètre est invalide (doit contenir vline et start)");

    return this.generateWebserviceActionUrl("kill") + "&vline=" + userOptions.vline; // en dûr, pas bien :(
  };

  /**
   * Suppression de Point via requête GET "tout en un" (fonctionnel, pas visuel)
   *
   * @param {Object} userOptions
   *  Options du Point à supprimer
   */
  this.tryDeletePoint = function (userOptions) {
    let self = this,  // Pas nécessaire mais bonne pratique ???
    initToast = TOAST.info({
      header: "Trying to detelete task #" + userOptions.vline,
      delay: 10000  // Il y a peut-être un risque que le Toast ne se masque pas si la réponse du Worker arrive trop vite (très improbable)
      // autoHide: false
    });
    LoggerModule.log("INIT TOAST", initToast);

    new Promise(function (resolve) {
      resolve(self.generateWebserviceDeleteUrl(userOptions));
    })
      .then(SHARED.promiseGET)
      .then(function(response) {
        LoggerModule.log("parsing", response);
        return JSON.parse(response)
      })
      // extract root
      .then(function (json) {
        if (!json[self.rootName])
          throw new Error("Unable to extract root (" + self.rootName + ") from JSON.");
        return json[self.rootName];
      })
      // On reçoit TOUTE LA BASE...
      // Vérifier si le Point a bien été supprimé (on ne le trouve pas => OK)
      .then(function (data) {
        LoggerModule.log("[tryDelete] root's data", data);
        LoggerModule.log("Does it contain " + userOptions.vline);
        let searchResult = data.filter(function(elem) {
          LoggerModule.log("-", elem);
          LoggerModule.log("self.CONSTANTS.HC_CONFIG_KEYS.data.id.url_param", self.CONSTANTS.HC_CONFIG_KEYS.data["id"]["url_param"]);
          LoggerModule.log("self.asRaw["+self.CONSTANTS.HC_CONFIG_KEYS.data["id"]["url_param"]+"]", self.asRaw[self.CONSTANTS.HC_CONFIG_KEYS.data["id"]["url_param"]])
          LoggerModule.log("elem["+ self.asRaw[self.CONSTANTS.HC_CONFIG_KEYS.data["id"]["url_param"]] +"]", elem[self.asRaw[self.CONSTANTS.HC_CONFIG_KEYS.data["id"]["url_param"]]])

          return elem[self.asRaw[self.CONSTANTS.HC_CONFIG_KEYS.data.id.url_param]] === userOptions[self.asRaw[self.CONSTANTS.HC_CONFIG_KEYS.data["id"]["url_param"]]]
        });
        LoggerModule.info("searchResult", searchResult);
        if (searchResult.length)
          throw new Error("Failed to delete data");
        return true;
      })
      // handle success
      .then(function (success) {
        // disable editing buttons as we can't interact with the removed data
        APP_MODULE.getGanttRenderingModule().disableTaskButtons();

        //TOAST.success({
        setTimeout(function() {
          TOAST.turnSuccess(initToast, {
            header: "Data #" + userOptions.id + " succesfully deleted."
          })
        }, 250);
      })
      .catch(function (err) {
        let errorHeader = "Error while trying to delete #" + userOptions.id;
        LoggerModule.error(errorHeader, err);

        // car pas possible d'utiliser "outdated"
        TOAST.removeTarget(initToast);

        TOAST.error({
          header: errorHeader
        });
      })
      .then(function (finallyParam) {

        // Prépare le Toast initial pour destruction automatique (ne sera détruit qu'une fois que le Worker renvoie
        initToast.setAttribute("outdated", true);
      })
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
  /*
  let thisWithoutFunction = {};
  for (let key in this) {
    if (typeof this[key] !== "function")
      thisWithoutFunction[key] = this[key];
  }

  // hackerino TODO trouver comment ne pas avoir à faire ça (transférer des fonctions via postMessage est impossible)
  if (thisWithoutFunction.page_location)
    thisWithoutFunction.page_location = undefined;
  return thisWithoutFunction;
  //*/

  return JSON.parse(JSON.stringify(this));
};

// TODO OU mettre toutes les