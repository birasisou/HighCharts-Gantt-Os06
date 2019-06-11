/**
 * On crée un Web Worker via Blob afin de ne pas avoir un fichier "en dur"
 * dans lequel on recopie (même de façon automatique en concaténant avec Gulp par exemple)
 *
 * Pour cela, il faut fournir un template (String) au Blop
 *
 * Ceci rend impossible l'utilisation de protoype (ou plutôt, ils seront perdu lors du 'parsing') et nous oblige à
 */

function myWorker(config) {
  // Invisible car dans le Worker
  console.info("[myWorker] param", config);

  /**
   * Création des fonctions
   */
  let that = {
    config: config,

    url: config.webserviceUrl || 'https://api.kanye.rest/',

    dataById: {},
    keepLooping: true,
    loopTimeoutMs: 1500, // 1.5s

    start: function () {
      self.postMessage({msg: "[From Worker] === START WORKER ==="});
      that.infiniteGet();
    },

    infiniteGet: function () {
      self.postMessage({msg: "[From Worker] === infiniteGet ==="});

      let xhr = new XMLHttpRequest();
      xhr.open("GET", that.url, false);

      // Préparer la requête
      xhr.onload = function () {
        if (xhr.status !== 200) {
          let err = "Request failed (" + xhr.status + ")";
          self.postMessage({ error: err, description: "[Worker to Worker]" } );
          postMessage( { error: err, description: "[Worker to Window] " } );
          throw new Error(err);
          return;
        }

        // Parse en JSON
        let json;
        try {
          json = JSON.parse(xhr.responseText);
        } catch (e) {
          let err = "JSON parsing failed";
          console.error(err, xhr.responseText);

          self.postMessage({ error: err, details: xhr.responseText, description: "[Worker to Worker]" } );
          postMessage( { error: err, details: xhr.responseText, description: "[Worker to Window] " } );
          throw new Error(err);
          return;
        }
        self.postMessage({description: "[From Worker] JSON content", data: json});

        // Loop -> Stock/Update
        if (that.dataById[json.id]) { // TODO hasOwnProperty plutôt, sinon on risque d'avoir false si on a 0/false/""/...
          that.dataById[json.id] = json;
          self.postMessage({ updatedData: that.dataById[json.id] });
        } else {
          that.dataById[json.id] = json;
          self.postMessage( { newData: that.dataById[json.id] } );
        }

        self.postMessage({ allData: that.dataById } );

        // Infinite Loop
        if (that.keepLooping)
          setTimeout(that.infiniteGet, that.loopTimeoutMs);
      };

      // Effectuer la requête
      xhr.send();
    },

    getJsonAndExtractRoot: function (url) {
      return new Promise( function(resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        xhr.onload = function() {
          if (xhr.status !== 200) {
            reject("Request failed (" + xhr.status + " - " + xhr.statusText + ")");
            return;
          }

          let json = JSON.parse(xhr.responseText);

          if (json[config.rootName])
            resolve(json[config.rootName]);
          else
            reject ("Unable to extract data from JSON (looking for '" + config.rootName + "').");
        };

        xhr.onerror = function() {
          reject("Request failed (" + xhr.status + " - " + xhr.statusText + ")");
        };

        xhr.send();
      });
    },

    formatToOrisGanttTask: function (array) {
      if (array instanceof Array)
        return array.map(function (data) {

        });
    }

  };

  // Les déclare dans la page principale et pas dans le Worker
  self.addEventListener("message", function (e) {
    let content = e.data;

    self.postMessage("[WORKER] Received: " + e.data);

    if (content.stop) {
      that.keepLooping = false;
      self.postMessage(" /// WILL STOP AFTER CURRENT LOOP \\\\\\")
    }

    if (content.start) {
      that.keepLooping = true;
      that.infiniteGet();
    }

    if (content.getAll)
      self.postMessage(that.dataById);
  });

  // Faire démarrer par la page principale (avec postMessage({}) ou même postMessage({init: true}))
  // TODO that.start();
}

// TODO remove Global (pour debug)
let worker;

/**
 *
 * @param {ParametresUrlOris} config
 *    config SANS FONCTIONS
 */
function initWorker (config) {
/*
  // Auto init pas...
  let workerTemplate = "self.onmessage = function (e) {" +
      "((" + stringWorker + ")(e.data))" +
    "}";
//*/

  // Magouille
  let workerTemplate =
    // SHARED
    SHARED_FACTORY.toString() + "\nvar SHARED = new SHARED_FACTORY(); " +
    // Oris Data
    OrisData.toString() + "\n" +
    // Oris Gantt Task
    OrisGanttTask.toString() + "\n" +
    // IIFE du Worker avec la CONFIG (ParametresUrlOris) en paramètre
    "("+myWorker.toString() + ")(" + config + ")";

  LoggerModule.info("workerTemplate", workerTemplate);

  let blob = new Blob([workerTemplate], { type: 'text/javascript' });

  let blobUrl = window.URL.createObjectURL(blob);

  worker = new Worker(blobUrl);

  worker.addEventListener("message",function (e) {
    console.log("[MAIN] Received message:", e.data);
  });

  worker.addEventListener("error", function (e) {
    console.error("[MAIN] Received error:", e.data);
  });

  // Pour le démarrer
  // worker.postMessage({});
}