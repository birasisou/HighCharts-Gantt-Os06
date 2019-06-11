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
let WORKER_CONFIG = {}; // ParametreUrlOris récupéré de la page principale
// "BD locale" des tâches (instancié
let orisTaskById = {};      // Row by ID, dictionnaire/hashmap des tâches (OrisGanttTask)

// TODO implémenter côté main page
let ALLOW_INVALID = false;

//Début du worker
// TODO NE SURTOUT PAS IMPORTER SINON LA PAGE PRINCIPALE VA EXECUTER (enfin non, car elle ne recevra jamais de .CONFIG, mais ...)
self.onmessage = function(event) {
  LoggerModule.log("[WORKER.ONMESSAGE] event.data", event.data);

  // récupérer la config depuis l'Objet ParametresUrl appelant (ici, Oris) et lancer la récupération des données
  if (event.data.CONFIG) {
    LoggerModule.log("[WORKER.ONMESSAGE] event.data.CONFIG received");
    WORKER_CONFIG = event.data.CONFIG;

    if (event.data.START_AUTO)
      autoUpdateData(WORKER_CONFIG.webserviceUrl)
  }

  // TODO utiliser pour autoriser, côté main page, à recevoir des valeurs "invalides" (imaginons un popup signalant '3 valeurs étaient invalident et ont été ignorées'
  if (event.data.ALLOW_INVALID)
    ALLOW_INVALID = new OrisData(event.data.ALLOW_INVALID).asBoolean();

};

/**
 * S'occupe de tout
 *    > Fait la requête GET
 *    > Récupère les données du JSON
 *    > TODO Traite les nouvelles valeurs
 *    > TODO Informe la page principale des MàJ
 * @param url URL du web-service à contacter
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
      throw err;
    })             // S'il y a une erreur, on informe la page principale TODO: arrêter la boucle? OU permettre à la page principale d'arrêter la couble
    .finally(function (arg) {
      LoggerModule.warn("[WORKER.autoUpdateData.finally] arg", arg);
      self.postMessage({done: true}); // Pour débug
    }); // TODO rendre infini
                // mais je pense plutôt attendre que le main "confirme" le monde infini
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
  LoggerModule.info("[WORKER.WORKER_GET] url", url);
  // Return a new promise.
  return new Promise(function(resolve, reject) {
    // Do the usual XHR stuff
    let req = new XMLHttpRequest();
    req.open('GET', url, true);

    req.onload = function() {
      LoggerModule.info("[GET.onload] req.status", req.status);
      // This is called even on 404 etc
      // so check the status
      if (req.status === 200) {
        LoggerModule.info("[GET.onload] req.response", req.response);
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

    // Timeout après 60s
    //req.timeout = 5000;

    /*
    req.ontimeout = function(e) {
      LoggerModule.error("Request Timeout e:", e);
      LoggerModule.error("Request Timeout req.statusText:", req.statusText);
      LoggerModule.error("Request Timeout req.status:", req.status);
      reject(Error("Request Timeout"))
    }; //*/

    // Make the request
    req.send();
  });
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
    throw new Error("[updateLocal] Argument is invalid (" + rawTaskDatas +")");

  LoggerModule.log("[updateLocal] rawTaskDatas", rawTaskDatas);

  let updatedTasks = {},  // Nouvelles tâches à afficher / MàJ dans le graphique
      invalidTasks = {},  // Tâches invalides, seront renvoyés à la page principale et signalées via popup
      length = rawTaskDatas.length;

  // stocker les nouvelles valeurs et informer la page principale des changements
  while (length--) {
    LoggerModule.log("\n\nTRYING TO TRANSFORM", rawTaskDatas[length]);
    // instancier la nouvelle tâche
    // TODO try / catch car throw si pas le
    let currentOrisTask = new OrisGanttTask(rawTaskDatas[length], WORKER_CONFIG),
      //ancienne valeur pour cette tâche
      oldTask = orisTaskById[currentOrisTask.getRaw('id')];

    LoggerModule.log("currentOrisTask", currentOrisTask.userOptions);

    // Ignorer les tâches "invalides" TODO (puis SIGNALER à la page principale)
    if (!currentOrisTask.isValidTask()) {
      invalidTasks[currentOrisTask.getRaw('id')] = currentOrisTask.rawUserOptions;
      continue;
    }

    // Ne rien faire si TOUTES les valeurs sont les mêmes
    if (oldTask !== undefined
        && SHARED.objectEquals(oldTask.rawUserOptions, currentOrisTask.rawUserOptions)) {
      LoggerModule.info("\nVALUES DIDN'T CHANGE\n");
      continue;
    }

    // Remplacer la valeur et enregistrer ce remplacement TODO signaler ce remplacement
    updatedTasks[currentOrisTask.getRaw('id')] = orisTaskById[currentOrisTask.getRaw('id')] = currentOrisTask.userOptions;
  }

  // Informer des éventuels changements de valeurs, et de celles qui sont invalides
  if (Object.keys(updatedTasks).length > 0 || Object.keys(invalidTasks).length > 0) {
    self.postMessage({
      updatedTasks: updatedTasks,
      invalidTasks: invalidTasks
    });
  }

  return {
    updatedTasks: updatedTasks,
    invalidTasks: invalidTasks
  };
}

/**
 * Renvoyer un message d'erreur (différent d'une exception proprement identifiée) à la page principale
 * @param errorMsg
 */
function postError(errorMsg) {
  LoggerModule.error("**** [WORKER] postError ****", errorMsg);
  self.postMessage({
    error: errorMsg.toString()
  });
}

