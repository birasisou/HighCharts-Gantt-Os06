/**
 * Worker récupérant les données d'une base Oris et les formattant pour un GanttChart
 */

// @TO_PRIVATE
let WORKER_CONFIG = {}; // ParametreUrlOris récupéré de la page principale
// "BD locale" des tâches
let ORIS_TASKS_BY_ID = {};      // Row by ID, dictionnaire/hashmap des tâches (OrisGanttTask)

// TODO implémenter côté main page
let ALLOW_INVALID = false,
  IS_MONITORING = true,
  MONITORING_DELAY = 10000; // delay entre deux mise à jours (en ms)

//Début du worker
// TODO NE SURTOUT PAS IMPORTER SINON LA PAGE PRINCIPALE VA EXECUTER (enfin non, car elle ne recevra jamais de .CONFIG, mais ...)
self.onmessage = function(event) {
  // récupérer la getConfig depuis l'Objet ParametresUrl appelant (ici, Oris) et lancer la récupération des données
  if (event.data.CONFIG) {
    LoggerModule.log("[WORKER.ONMESSAGE] event.data.CONFIG received");
    WORKER_CONFIG = event.data.CONFIG;

    MONITORING_DELAY = WORKER_CONFIG.asRaw["refresh"]
      ? (Number(WORKER_CONFIG.asRaw["refresh"]) * 1000)
      : MONITORING_DELAY; // delay entre deux mise à jours (en ms)
    LoggerModule.info("MONITORING_DELAY", MONITORING_DELAY);
  }
  if (event.data.START_AUTO) {
    LoggerModule.info("[WORKER.ONMESSAGE] event.data.START_AUTO received.", "Stopping monitoring after current loop");
    IS_MONITORING = true;
    autoUpdateData(WORKER_CONFIG.webserviceUrl);
  }
  if (event.data.STOP_AUTO) {
    LoggerModule.info("[WORKER.ONMESSAGE] event.data.STOP_AUTO received.", "Stopping monitoring after current loop");
    IS_MONITORING = false;
  }

  // TODO utiliser pour autoriser, côté main page, à recevoir des valeurs "invalides" (imaginons un popup signalant '3 valeurs étaient invalident et ont été ignorées'
  if (event.data.ALLOW_INVALID)
    ALLOW_INVALID = new OrisData(event.data.ALLOW_INVALID).asBoolean();

  if (event.data.reinitialize) {
    LoggerModule.info("[WORKER.ONMESSAGE] event.data.reinisialize received.", "Sending all stored Tasks");
    postMessage({
      // deep clone pour ne pas provoquer une deuxième requête juste après (clearID modifie le paramètre)
      updatedTasks: clearParentIds(JSON.parse(JSON.stringify(ORIS_TASKS_BY_ID))),
      done: "Here ya go"
    }, "*");

  }

};

/**
 * S'occupe de tout
 *    > Fait la requête GET
 *    > Récupère les données du JSON
 *    > Traite les nouvelles valeurs
 *    > Informe la page principale des MàJ
 * @param url URL du web-service à contacter
 *
 * @returns {Promise}
 */
function autoUpdateData(url) {
  LoggerModule.info("[WORKER.autoUpdateData] url:", url);

  return WORKER_GET(url)                 // requête
    .then(function (response) {
      return customJsonParse(response);
    })             // Parser en JSON
    .then(function (json) {
      return extractData(json);
    })    // Extraire les données
    .then(function (rawDatas) {
      return updateLocal(rawDatas);
    })            // traiter les données
    .catch(function (err) {
      postError(err.message);
      // throw err;
    })             // S'il y a une erreur, on informe la page principale TODO: arrêter la boucle? OU permettre à la page principale d'arrêter la couble
    //.finally(function (arg) {
    .then(function (arg) {
      fakeFinally(arg);
      }, function (arg) {
      fakeFinally(arg);
    });
  // TODO rendre infini
                // mais je pense plutôt attendre que le main "confirme" le monde infini
}

/**
 * Toujours exécuté à la fin d'autoUpdateData
 * Promise.prototype.finally n'est pas toujours supporté
 * @param arg
 */
function fakeFinally(arg) {
  LoggerModule.log("[WORKER.autoUpdateData.finally] arg", arg);
  postMessage({done: true}, "*"); // Pour débug

  if (IS_MONITORING)
    setTimeout(function () {
      autoUpdateData(WORKER_CONFIG.webserviceUrl);
    }, MONITORING_DELAY);
}

//TODO: importer es6-promise.auto.min.js ? (le polyfill pour les Promise);
/**
 * Promise réalisant la requête GET vers l'URL passée en argument
 *
 * @param url
 * @returns {Promise<any>}
 * @constructor
 */
function WORKER_GET(url) {
  LoggerModule.log("[WORKER.WORKER_GET] url", url);
  // Return a new promise.
  return SHARED.promiseGET(url);
}

/**
 * JSON.parse mais avec un message d'erreur plus détaillé
 * @param response
 * @return {JSON/Error}
 */
function customJsonParse(response) {
  LoggerModule.log("[WORKER.customJsonParse] response", response);
  let a = undefined;
  try {
    a = JSON.parse(response);
    return a;
  } catch (e) {
    LoggerModule.warn("Tried to Parse:", response);
    throw Error("[WORKER.customJsonParse] Unable to parse response to JSON. " + e.message);
  }
}

/**
 * Convertir le résultat de la requête en JSON et y récupérer les données brutes via 'CONFIG.rootName'
 * @param {string} requestResponse
 *  résulat de la requête
 *
 * @return {Object} array de données de la base Oris
 *
 * @throws si le parsing du JSON renvoie une erreur (Syntax Error)
 */
function extractData(requestResponse) {
  LoggerModule.log("[extractData] WORKER_CONFIG", WORKER_CONFIG);
  LoggerModule.log("[extractData] requestResponse", requestResponse);
  LoggerModule.info("[extractData] WORKER_CONFIG.rootName", WORKER_CONFIG.rootName);

  return new Promise(function(resolve, reject) {
    // Pas de root
    if (!requestResponse[WORKER_CONFIG.rootName])
      reject(Error("RootName (" + WORKER_CONFIG.rootName + ") not found in the JSON"));

    // Récupérer les données à l'aide de "rootName"
    resolve(requestResponse[WORKER_CONFIG.rootName]); //TODO dans d'autres bases, peut-être que le rootName sera 'nested' (exemple: 'root.baseName')
  });
}

function updateLocal(rawTaskDatas) {
  if(arguments.length !== 1)
    throw new Error("[updateLocal] Missing an argument");
  if(!rawTaskDatas)
    throw new Error("[updateLocal] Argument is invalid ('" + rawTaskDatas +"')");

  LoggerModule.log("[updateLocal] rawTaskDatas", rawTaskDatas);

  let validTasksUserOptions = {},  // Tâches valides
    updatedTasks = {},  // Nouvelles tâches à afficher / MàJ dans le graphique
    invalidTasks = {};  // Tâches invalides, seront renvoyés à la page principale et signalées via popup



  // stocker les nouvelles valeurs et informer la page principale des changements
  // while (length--) {
  for (let i=0, length = rawTaskDatas.length; i<length; ++i) {
    LoggerModule.log("\n\nTRYING TO TRANSFORM", rawTaskDatas[i]);
    // instancier la nouvelle tâche
    // TODO try / catch car throw si pas le
    let currentOrisTask = new OrisGanttTask(rawTaskDatas[i], WORKER_CONFIG),
      //ancienne valeur pour cette tâche
      oldTask = ORIS_TASKS_BY_ID[currentOrisTask.getRaw('id')];

    // Ignorer les tâches "invalides" TODO (puis SIGNALER à la page principale)
    if (!currentOrisTask.isValidTask()) {
      invalidTasks[currentOrisTask.getRaw('id')] = currentOrisTask.rawUserOptions;
      continue;
    }

    // Stocker la Tâche valide
    validTasksUserOptions[currentOrisTask.getRaw('id')] = currentOrisTask.rawUserOptions;

    // Ne rien faire si TOUTES les valeurs sont les mêmes
    if (oldTask !== undefined
        && SHARED.quickObjectEquals(oldTask, currentOrisTask.userOptions)) {
        // && SHARED.objectEquals(oldTask.rawUserOptions, currentOrisTask.rawUserOptions)) {
      LoggerModule.info("\nVALUES DIDN'T CHANGE\n");
      continue;
    }

    // Remplacer la valeur et enregistrer ce remplacement pour le signaler
    // TODO signaler ce remplacement (pour l'instant on est en mode naif)
    LoggerModule.info("updated or new ", currentOrisTask.userOptions);
    updatedTasks[currentOrisTask.getRaw('id')] = ORIS_TASKS_BY_ID[currentOrisTask.getRaw('id')] = currentOrisTask.userOptions;
  }

  /**
   * @GitHub-Issue #8
   * Détecter une suppression côté serveur
   */
  let deletedTasksIds = SHARED.arrayDifference(Object.keys(ORIS_TASKS_BY_ID), Object.keys(validTasksUserOptions));
  if (deletedTasksIds.length) {
    LoggerModule.info("IDs to delete", deletedTasksIds);
    let length = deletedTasksIds.length;
    while (length--) {
      LoggerModule.log("deleting deletedTasksIds[length]", deletedTasksIds[length]);
      delete ORIS_TASKS_BY_ID[deletedTasksIds[length]];
    }
  }

  // Informer des changements de valeurs OU s'il n'y
  if (Object.keys(updatedTasks).length > 0          // nouvelles datas
    || Object.keys(ORIS_TASKS_BY_ID).length === 0   // pour "showNoData()"
    || deletedTasksIds.length                       // signaler une suppresion
    // || Object.keys(updatedTasks).length !== Object.keys(ORIS_TASKS_BY_ID).length  //
  ) {
    // Clone pour faire des opérations avant de POST sans que ça ne soit pris en compte lors de la "détection de modifications"
    let tasksToPush = JSON.parse(JSON.stringify(ORIS_TASKS_BY_ID));
    LoggerModule.log("tasksToPush ", tasksToPush);

    /**
     * @GanttIssue une valeur (ID) inexistante pour l'attribut &parent d'un Point cause un bug visuel
     * S'assurer de ne pas envoyer de valeurs non-existantes pour l'attribut parent
     */
    if (WORKER_CONFIG.asRaw["parent"])
      tasksToPush = clearParentIds(tasksToPush);

    postMessage({
      updatedTasks: tasksToPush // todo Ne plus utiliser la version naïve d'updatedTasks (TOUT renvoyer)
    }, "*");
  }
  // Informer de l'existence de valeurs invalides dans la BD
  if (Object.keys(invalidTasks).length > 0) {
    postMessage({
      invalidTasks: invalidTasks
    }, "*");
  }

  return {
    updatedTasks: updatedTasks,
    invalidTasks: invalidTasks
  };
}

/**
 * Pour éviter une erreur HighCharts, on supprime les valeurs de l'attribut "parent" référençant un ID n'existant pas
 *
 * @param {Object} tasks
 *    Objet où la clé est l'ID du Point
 *
 * @returns {Object}
 */
function clearParentIds(tasks) {
  let distinctIds = Object.keys(tasks);

  for (let key in tasks) {
    if (distinctIds.indexOf(tasks[key]["parent"]) < 0) { // Aucun Point ne possède l'ID spécifié dans l'attribut &parent de ce Point
      LoggerModule.warn("Aucun Point avec comme ID " + tasks[key]["parent"]
        + " n'existe (référencé par l'attribut 'parent' du Point '" + key + "').", "La valeur a été remplacée par 'null'");

      /**
       * Créer un "faux" Point afin de garder le concept de groupes
       */
      if (WORKER_CONFIG.asRaw["fakeparent"] === "true") { // TODO /!\ Ceci est async
        console.error("Création de faux parents...");
        let fakeParentId = tasks[key]["parent"];
        // Ne créer un faux groupe que s'il y a une valeur valide à
        if (typeof fakeParentId !== "undefined" && typeof fakeParentId !== "object") {
          /*
          WORKER_GET(SHARED.addOrReplaceUrlParam(WORKER_CONFIG.webserviceUrl, "fil", fakeParentId))
            .then(customJsonParse)
            .then(extractData)
            .then(function (datas) {
              // Normalement, vu que l'on fait un &fil=<ID>, l'ID doit être unique et on ne doit avoir qu'une seule valeur dans le JSON
              let data = datas[0];
              if (fakeParentId !== data.id)
              tasks[fakeParentId] = {
                id: fakeParentId,
                name: data[WORKER_CONFIG.asRaw["name"]]    // TODO faire une requête GET avec &fil=fakeParentId pour récupérer le nom de
              };
              distinctIds.push(tasks[key]["parent"]);
            })
            // En cas d'Erreur, on supprime simplement la référence
            .catch(function (err) {
              LoggerModule.error(err);
              postError(err);
              tasks[key]["parent"] = null;
            });
          //*/
            tasks[fakeParentId] = {
              id: fakeParentId,
              name: fakeParentId    // TODO faire une requête GET avec &fil=fakeParentId pour récupérer le nom de
            };
            distinctIds.push(tasks[key]["parent"]);
        }
      } else {
        /**
         * Supprimer la référence
         */
        tasks[key]["parent"] = null;
      }
    }
  }

  return tasks;
}

/**
 * Renvoyer un message d'erreur (différent d'une exception proprement identifiée) à la page principale
 * @param errorMsg
 */
function postError(errorMsg) {
  LoggerModule.error("[WORKER] postError", errorMsg);
  postMessage({
    error: errorMsg.toString()
  }, "*");
}