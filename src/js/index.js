// document ready todo ou instancier dans le "vrai" document.ready

/**
 * Traduire en Français
 * todo Rendre ça optionnel via url ?
 */
Highcharts.setOptions({
    lang: {
      loading: 'Chargement...',
      months: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
      weekdays: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi','Jeudi', 'Vendredi', 'Samedi'],
      shortMonths: ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juill', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'],
      exportButtonTitle: 'Exporter',
      printButtonTitle: 'Imprimer',
      rangeSelectorFrom: 'De',
      rangeSelectorTo: 'À',
      rangeSelectorZoom: 'Période',
      downloadCSV: 'Télécharger au format CSV',
      downloadJPEG: 'Télécharger au format JPEG',
      downloadPDF: 'Télécharger au format PDF',
      downloadPNG: 'Télécharger au format PNG',
      downloadSVG: 'Télécharger au format SVG',
      downloadXLS: 'Télécharger au format XLS',
      printChart: 'Imprimer',
      // resetZoom: "Reset",
      // resetZoomTitle: "Reset,
      thousandsSep: " ",
      decimalPoint: ','
    }
  }
);
let APP_MODULE;
try {
  APP_MODULE = (function () {
    LoggerModule.setDebug("error");

    /**
     * @private and/or GLOBAL
     */
      // référence to Global Scope (window)
    let self = this,
      HTML_LOADER_ID = "loading-overlay",

      // CONFIG
      PARAMETRES_URL_ORIS = new ParametresUrlOris(window.location.href),
      PARAMETRES_URL_ORIS_NO_FUNCTIONS = PARAMETRES_URL_ORIS.getAllButFunctions(),
      GANTT_RENDERING_MODULE = new GanttRenderingModule(),
      // UI
      LOADING_OVERLAY_HANDLER = new LoadingOverlayHandler(HTML_LOADER_ID),
      // Worker
      WORKER = null,
      WORKER_MESSAGE_HANDLER = null;

    if (typeof PARAMETRES_URL_ORIS.asRaw["debug"] !== "undefined") {
      console.log("Setting Log level to:", PARAMETRES_URL_ORIS.asRaw["debug"]);
      LoggerModule.setDebug(PARAMETRES_URL_ORIS.asRaw["debug"]);
    }

    // TODO Intégrer le Worker
    function init() {
      /**
       * Initialisation et UI
       **/
      LOADING_OVERLAY_HANDLER.showLoading();

      /**
       *  General messages (should never happen)
       **/
      window.onmessage = function (e) {
        LoggerModule.info("[indexJS > window.onmessage] e.data", e.data);

        // Erreur générale (n'est pas censé remonter jusqu'ici)
        if (e.data.error) {
          LoggerModule.error("[indexJS > window.onmessage] e.data.error", e.data.error);
          LOADING_OVERLAY_HANDLER.hideLoading();
        } else if (e.data.chartLoaded) {
          // todo startMonitoring
          /*
          WORKER.postMessage({
            START_AUTO: true
          })//*/
        }

      };

      // Lancer la Worker
      startWorker();
    }

    /**
     * Crée dynamiquement le Worker en fusionnant différents fichiers locaux
     * @return {Worker}
     */
    function evalWorker(workerPath) {
      if (arguments.length < 1 || !workerPath)
        throw EXCEPTIONS.InvalidArgumentExcepetion("[INDEX.evalWorker] script URL Path must be specified");

      let http = new XMLHttpRequest();
      // WORKER
      http.open('GET', workerPath, false); // /!\ SYNCHRONE /!\
      http.send();

      LoggerModule.log("[evalWorker] http.responseText", http.responseText);

      let template =
        // LoggerModule
        // LOGGER_MODULE_FACTORY.toString() + "var LoggerModule = new LOGGER_MODULE_FACTORY();\n" +
        LOGGER_MODULE_FACTORY.toString() + "var LoggerModule = new LOGGER_MODULE_FACTORY();\n" +
        "LoggerModule.setDebug('" + LoggerModule.getCurrent_log_level() + "');\n" +
        // SHARED
        SHARED_FACTORY.toString() + "\nvar SHARED = new SHARED_FACTORY();\n" +
        // Oris Data Model
        OrisData.toString() + "\n" +
        OrisData.prototype.toString() + "\n" +
        // Oris Gantt Task Model
        OrisGanttTask.toString() + "\n" +
        OrisGanttTask.prototype.toString() + "\n" +

        // todo overload self.postMessage car 1 seul argument vs 2 pour pouvoir tester etc...
        'let oldSelfPostMessage = postMessage; \n' +
        'postMessage = function(content, hack) { oldSelfPostMessage(content); }\n' +
        http.responseText;

      let blob = new Blob([template], {type: 'text/javascript'});
      let url = URL.createObjectURL(blob);
      return new Worker(url);
    }

    /**
     * Définition des comportements à adopter en fonction des messages reçus du Worker
     * @param {Worker} worker
     *    Worker à écouter
     */
    function workerMessageHandler(worker) {
      let FAILURE_COUNTER = 0,
        MAX_FAIL_COUNTERS = 5; // nombre max de tentatives avant d'arrêter

      if (typeof worker !== "object")
        throw new EXCEPTIONS.InvalidArgumentExcepetion("workerMessageHandler n'accepte qu'un objet Worker en paramètre");

      /*
      Fournir timestamp
      todo utile ?
      let lastReceived = {
        message: undefined,
        updatedTasks: undefined,
        invalidTasks
      };
      // */

      // todo sortir ?
      let caseHandling = {
        error: function (errMsg) {
          LoggerModule.error("[workerMessageHandler] Error received", errMsg);

          ++FAILURE_COUNTER;
          console.error("Tentatives restantes:", MAX_FAIL_COUNTERS - FAILURE_COUNTER);
          // Arrêter
          if (FAILURE_COUNTER >= MAX_FAIL_COUNTERS - 2) {   // -2 car le temps que le postMessage fasse effet, une deuxième requête sera faite (donc 2 popups)
            worker.postMessage({STOP_AUTO: true});
            if (FAILURE_COUNTER >= MAX_FAIL_COUNTERS - 1)
              alertify.postErrorAlert(errMsg);
          }
          // todo popup msg
          alertify.error(errMsg, 1.5)
        },
        invalidTasks: function (invalidTasksMsg) {
          LoggerModule.warn("[INDEX.workerMessageHandler] Invalid tasks received", invalidTasksMsg)
          // todo popup msg
        },
        updatedTasks: function (updatedTasksMsg) {
          LoggerModule.info("[INDEX.workerMessageHandler] Updated tasks received", updatedTasksMsg);

          // FIRST CALL, après on veut seulement update les données
          if (!GANTT_RENDERING_MODULE.getChart()) {
            LoggerModule.log("### INITIAL RENDER ###");
            try {
              GANTT_RENDERING_MODULE.draw(PARAMETRES_URL_ORIS_NO_FUNCTIONS, updatedTasksMsg)
            } catch (err) {
              LoggerModule.error("Error while drawing chart", err);
            }
          } else  // update
            GANTT_RENDERING_MODULE.update(PARAMETRES_URL_ORIS_NO_FUNCTIONS, updatedTasksMsg);
        },
        done: function (doneMsg) {  // todo remplacer par un success/failure. On ne veut pas masquer mtn car potentiellement encore en train de dessiner
          LoggerModule.info("[INDEX.workerMessageHandler] 'Finally done' received", doneMsg);
          if (APP_MODULE.getLoadingSpinnerHandler().spinner.classList.contains("active"))
            APP_MODULE.getLoadingSpinnerHandler().hideLoading();
        },
        failure: function (failureMsg) {  // todo useless
          LoggerModule.error("[INDEX.workerMessageHandler] Failure received", failureMsg);
          if (APP_MODULE.getLoadingSpinnerHandler().spinner.classList.contains("active"))
            APP_MODULE.getLoadingSpinnerHandler().hideLoading();
        }
      };

      // Listeners
      worker.onmessage = function (e) {
        LoggerModule.log("[INDEX.workerMessageHandler] message received. Object.keys(e.data)", Object.keys(e.data));
        let eKeys = Object.keys(e.data);
        for (let i in eKeys) {
          if (caseHandling[eKeys[i]])
            caseHandling[eKeys[i]](e.data[eKeys[i]]);
          else
            LoggerModule.warn("[INDEX.workerMessageHandler] Unhandled message type '" + eKeys[i] + "'", e.data[eKeys[i]]);
        }
      }
    }

    /**
     * Démarre le Worker, attache les écouteurs de messages et lui dit de démarrer
     */
    function startWorker() {
      // /!\ SYNCHRONE /!\ TODO Passer en async Promise
      WORKER = evalWorker("./src/js/workers/parametres-url-oris-worker.js");

      // todo Ajouter le message Handler
      //    Useless
      WORKER_MESSAGE_HANDLER = workerMessageHandler(WORKER);

      WORKER.postMessage({
        CONFIG: PARAMETRES_URL_ORIS.getAllButFunctions(),
        START_AUTO: true
      });
    }

    // AUTO INIT via Promise car éléments async
    new Promise(function (resolve, reject) {
      init();
    })
      .catch(function (err) {
        LoggerModule.error("[INDEX.init] An error occured during page initialisation", err);
        // LOADING_OVERLAY_HANDLER.hideLoading();
      })
      .then(function () {
        LOADING_OVERLAY_HANDLER.hideLoading();
      });


    // todo ? isDebug == dev --> exposer les getters etc...
    return {
      getParametresUrlOris: function () {
        return PARAMETRES_URL_ORIS;
      },
      parametresUrlOrisNoFunction: function () {
        return PARAMETRES_URL_ORIS_NO_FUNCTIONS;
      },
      getWorker: function () {
        return WORKER;
      },
      getLoadingSpinnerHandler: function () {
        return LOADING_OVERLAY_HANDLER;
      },
      getGanttRenderingModule: function () {
        return GANTT_RENDERING_MODULE;
      },
      getChart: function () {
        return APP_MODULE.getGanttRenderingModule().getChart();
      }
    }
  })();
} catch (e) {
  LoggerModule.error("Page initialisation error:", e);
  alertify.postErrorAlert(e.description)
}