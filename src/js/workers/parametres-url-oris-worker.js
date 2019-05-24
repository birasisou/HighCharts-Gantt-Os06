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
    LoggerModule.info("[WORKER.ONMESSAGE] event.data.CONFIG copy succesfuly ?", WORKER_CONFIG == event.data.CONFIG );
    LoggerModule.info("[WORKER.ONMESSAGE] event.data.CONFIG.asRaw", event.data.CONFIG.asRaw);
    LoggerModule.info("[WORKER.ONMESSAGE] WORKER_CONFIG.asRaw", WORKER_CONFIG.asRaw);


    if (event.data.START_AUTO)
      autoUpdateData(WORKER_CONFIG.webserviceUrl)
  }

  // TODO utiliser pour autoriser, côté main page, à recevoir des valeurs "invalides" (imaginons un popup signalant '3 valeurs étaient invalident et ont été ignorées'
  if (event.data.ALLOW_INVALID)
    ALLOW_INVALID = new OrisData(event.data.ALLOW_INVALID).asBoolean();

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
  LoggerModule.log("[WORKER.autoUpdateData] url:", url);

  return WORKER_GET(url)                 // requête
    .then(JSON.parse)             // Parser en JSON
    .then(extractRootNameData)    // Extraire les données
    .then(updateLocal)            // traiter les données
    .catch(postError)             // S'il y a une erreur, on informe la page principale TODO: arrêter la boucle? OU permettre à la page principale d'arrêter la couble
    .finally(function (arg) {
      LoggerModule.info("[WORKER.finally] arg", arg);
      self.postMessage({done: true})
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
  LoggerModule.log("[WORKER_GET] url:", url );

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
 * @return {Object} array de données de la base Oris
 *
 * @throws si le parsing du JSON renvoie une erreur (Syntax Error)
 */
function extractRootNameData(requestResponse) {
  LoggerModule.log("[extractRootNameData] WORKER_CONFIG", WORKER_CONFIG);
  LoggerModule.log("[extractRootNameData] requestResponse", requestResponse);
  LoggerModule.log("[extractRootNameData] WORKER_CONFIG.rootName", WORKER_CONFIG.rootName);

  // Récupérer les données à l'aide de "rootName"
  return requestResponse[WORKER_CONFIG.rootName]; //TODO dans d'autres bases, peut-être que le rootName sera 'nested' (exemple: 'root.baseName')
}

function updateLocal(rawTaskDatas) {
  LoggerModule.log("[updateLocal] rawTaskDatas", rawTaskDatas);

  let updatedTasks = {},
      invalidTasks = {},
      length = rawTaskDatas.length;

  // stocker les nouvelles valeurs et informer la page principale des changements
  while (length--) {
    LoggerModule.log("\n\nTRYING TO TRANSFORM", rawTaskDatas[length]);
    // instancier la nouvelle tâche
    let currentOrisTask = new OrisGanttTask(rawTaskDatas[length], WORKER_CONFIG),
//  let currentOrisTask = new OrisGanttTask(rawTaskDatas[length], WORKER_CONFIG.CONSTANTS.HC_CONFIG_KEYS),
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
    self.postMessage({
      updatedTasks: updatedTasks
    });
  }

  return updatedTasks;
}

/**
 * Renvoyer un message d'erreur (différent d'une exception proprement identifiée) à la page principale
 * @param errorMsg
 */
function postError(errorMsg) {
  LoggerModule.error("**** ERROR ****");
  LoggerModule.error(errorMsg);
  self.postMessage({
    error: errorMsg.toString()
  });
}

