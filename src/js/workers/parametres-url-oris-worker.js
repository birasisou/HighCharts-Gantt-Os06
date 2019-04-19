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
let CONFIG = undefined; // ParametreUrlOris récupéré de la page principale
let dataById = {};      //

//Début du worker
self.onmessage = function(event) {
  //récupérer la config depuis l'Objet ParametresUrl appelant (ici, Oris)
  CONFIG = event.data.CONFIG;

  //Faire la requête GET + formatter le JSON + retourner le JSON

};

function initXMLHttpRequest(_xmlhttp) {
  //Comportement lorsque l'on reçoit un message de la page principale
  _xmlhttp.onreadystatechange = function() {
    try {
      if (_xmlhttp.readyState == XMLHttpRequest.DONE) {
        //CAS: Succès (200)
        if (_xmlhttp.status == 200) {

          //Formatter en JSON
          var response = JSON.parse(this.responseText);
          var formattedResponse = formatResponse(response, GLOBALS.nomRacine);

          //Parser les datas
          var yAxisAndSeriesDatas = parseFormattedResponse(formattedResponse);

          //Initialiser les axes Y / séries et regrouper avec la config vide
          creerLesAxesY(yAxisAndSeriesDatas);
          creerLesSeries(yAxisAndSeriesDatas);

          //Renvoyer toutes les config à la page principale
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
    .then()                                   // traiter les données
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
  try {
    parsedResponse = JSON.parse(requestResponse);
  } catch (e) { // Détecter erreur de syntaxe du JSON
    throw new Error(e);
  }
  // Récupérer les données à l'aide de "rootName"
  return parsedResponse[CONFIG.rootName]; //TODO dans d'autres bases, peut-être que le rootName sera 'nested' (exemple: 'root.baseName')
}

function formatData(rawData) {

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

