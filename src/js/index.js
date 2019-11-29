let APP_MODULE;

function errorAlert(msg) {
  document.getElementById("error-modal-description").innerText = msg;
  $(document.getElementById("error-modal")).modal();
}

/*
 * Initialisation de la page entière
 * Config / UI / Worker / etc...
 */
new Promise(function (resolve, reject) {

  // try {
  APP_MODULE = (function () {
    /*
     * Log Level
     * On veut, par défaut, toujours imprimer les erreurs dans la console
     */
    LoggerModule.setDebug("error");

    /**
     * On ne supporte que "en" et "fr". Il faut en installer d'autres si on veut les supporter
     * https://github.com/moment/moment/tree/develop/locale
     */
    let PREFERED_LANGUAGE = (window.location.search.indexOf("lang=fr") > -1) ? "fr" : (window.navigator.userLanguage || window.navigator.language);
    console.log("Detected language:", PREFERED_LANGUAGE);
    moment.locale(PREFERED_LANGUAGE);
    /**
     * Toujours utiliser l'offset UTC du navigateur
     */
    let timezone = moment.tz.guess(true);
    console.log("Detected TimeZone", timezone);
    console.log("TimeZone Offset", -moment.tz(new Date(), timezone).utcOffset() / 60 + "H");
    /*
      Highcharts.setOptions({
      time: {
        /**
         * Use moment-timezone.js to return the timezone offset for individual
         * timestamps, used in the X axis labels and the tooltip header.
         *
        getTimezoneOffset: function (timestamp) {
          let zone = moment.tz.guess(true);   // Détection automatique, sans storage dans le cache
          return -moment.tz(timestamp, zone).utcOffset();
        }
      }
    });  //*/

    /**
     * @GitHub
     * @Issue https://github.com/highcharts/highcharts/issues/10942
     *    En attendant, la version 1.7.3 pour le fix officiel, il faut utiliser ce @workaround
     *
     Highcharts.addEvent(Highcharts.Axis, 'afterBreaks', function() {
      this.series.forEach(function(series) {
        series.data.forEach(function(point) {
          point.graphicOverlay = point.graphicOverlay && point.graphicOverlay.destroy();
        });
      });
    }); // */

    /**
     * Traduire en Français si besoin
     */
    if (PREFERED_LANGUAGE === "fr")
      Highcharts.setOptions({
        lang: {
          loading: 'Chargement...',
          months: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
          weekdays: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
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
          // resetZoom: "Reset",i
          // resetZoomTitle: "Reset,
          thousandsSep: " ",
          decimalPoint: ','
        }
      });

    /**
     * @Issue #32
     * Automatiquement reconstruire le graphique si une Exception HighCharts est "Uncaught"
     *
     * Provoque l'affichage du chargement
     */
    if (window.location.search.indexOf("autofix=true") > -1)
      window.onerror = function myErrorHandler(errorMsg, url, lineNumber) {
        if (url.indexOf("highcharts-gantt.src.js") > -1 || url.indexOf("draggable-points.src.js") > -1) {
          TOAST.error({header: "Redrawing graph"});
          APP_MODULE.reinializeChart();
        }
      };

    /**
     * @private
     */
      // référence to Global Scope (window)
    let self = this,
      HTML_LOADER_ID = "loading-overlay",

      // CONFIG
      PARAMETRES_URL_ORIS = new ParametresUrlOris(window.location.href),
      PARAMETRES_URL_ORIS_NO_FUNCTIONS = PARAMETRES_URL_ORIS.getAllButFunctions(),
      GANTT_RENDERING_MODULE = new GanttRenderingModule(PARAMETRES_URL_ORIS_NO_FUNCTIONS),
      // UI
      LOADING_OVERLAY_HANDLER = new LoadingOverlayHandler(HTML_LOADER_ID),
      TASK_EDITOR_MODAL = null,

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
      TASK_EDITOR_MODAL = new TASK_EDITOR_MODAL_FACTORY(PARAMETRES_URL_ORIS_NO_FUNCTIONS);

      /**
       * Initialiser Page UI
       */
      let TASK_SEARCH_WIDGET = document.getElementById("task-search-widget");
      TASK_SEARCH_WIDGET.classList.add("active"); // TODO ne l'afficher qu'à la fin de l'initialisation globale ?
      // &fil=
      TASK_SEARCH_WIDGET.addEventListener("submit", function () {
        let newUrl = SHARED.addOrReplaceUrlParam(location.href, 'fil', document.getElementById("task-search-input").value);
        LoggerModule.warn("Changement d'URL", newUrl);
        window.location.replace(newUrl);
        return false;
      });
      document.getElementById("task-search-input").value = PARAMETRES_URL_ORIS.asRaw["fil"] || "";

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
          //  fait côté Worker
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
     * Demande au Worker toutes les données utilisables du serveur
     */
    function sendReinitializeMessageToWorker() {
      WORKER.postMessage({
        reinitialize: true
      });
    }

    /**
     * Détruit puis redessine le graphique
     */
    function reinitializeChart() {
      // todo sudo showLoading (si une requête MàJ entre temps, on ne veut pas que ça cache le chargement,
      //  on veut carrément l'ignorer vu qu'on doit redresser TOUT le graphique d'abord))
      LOADING_OVERLAY_HANDLER.showLoading("Redrawing because an error occurred");
      let renderToDiv = GANTT_RENDERING_MODULE.getChart().renderTo,
        renderToDivId = renderToDiv.id;
      // Détruire le graphique
      GANTT_RENDERING_MODULE.getChart().destroy();
      // Vider les restes
      renderToDiv.outerHTML = '<div id="' + renderToDiv.id + '" ></div>';
      // Envoyer le message au Worker pour récupérer totues les Tâches
      sendReinitializeMessageToWorker();
    }

    /**
     * Crée dynamiquement le Worker en fusionnant différents fichiers locaux
     * @return {Worker}
     */
    function evalWorker(workerPath) {
      if (arguments.length < 1 || !workerPath)
        throw EXCEPTIONS.InvalidArgumentException("[INDEX.evalWorker] script URL Path must be specified");

      let http = new XMLHttpRequest();
      // WORKER
      http.open('GET', workerPath, false); // /!\ SYNCHRONE /!\
      http.send();

      LoggerModule.log("[evalWorker] http.responseText", http.responseText);

      let template =
        // LoggerModule
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
        throw new EXCEPTIONS.InvalidArgumentException("workerMessageHandler n'accepte qu'un objet Worker en paramètre");

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
              errorAlert(errMsg);
          }
          // todo popup msg
          alertify.error(errMsg, 1.5)
        },
        invalidTasks: function (invalidTasksMsg) {
          LoggerModule.info("[INDEX.workerMessageHandler] Invalid tasks received", invalidTasksMsg)
          // todo popup msg
        },
        updatedTasks: function (updatedTasksMsg) {
          LoggerModule.info("[INDEX.workerMessageHandler] Updated tasks received", updatedTasksMsg);

          // FIRST CALL
          // ou si on l'a destroy (hard reset sans refresh)
          // Après on veut seulement update les données
          if (!GANTT_RENDERING_MODULE.getChart() || !GANTT_RENDERING_MODULE.getChart().renderTo) {
            LoggerModule.log("### INITIAL RENDER ###");
            try {
              GANTT_RENDERING_MODULE.draw(PARAMETRES_URL_ORIS_NO_FUNCTIONS, updatedTasksMsg)
            } catch (err) {
              LoggerModule.error("Error while drawing chart", err);
            }
          } else  // update
            GANTT_RENDERING_MODULE.update(PARAMETRES_URL_ORIS_NO_FUNCTIONS, updatedTasksMsg);

          // MàJ des <select> du modal
          TASK_EDITOR_MODAL.setChartOptions({
            yAxis: {
              categories: GANTT_RENDERING_MODULE.getChart().series[0].yAxis.categories
            },
            series: {
              data: GANTT_RENDERING_MODULE.getChart().series[0].userOptions.data,
            }
          });

          // Détruire les Toasts qui sont "prêts à disparaitre"
          TOAST.removeOutdateds();
        },
        done: function (doneMsg) {  // todo remplacer par un success/failure. On ne veut pas masquer mtn car potentiellement encore en train de dessiner
          LoggerModule.info("[INDEX.workerMessageHandler] 'Finally done' received", doneMsg);
          LOADING_OVERLAY_HANDLER.hideLoading();
        },
        failure: function (failureMsg) {  // todo useless
          LoggerModule.error("[INDEX.workerMessageHandler] Failure received", failureMsg);
          LOADING_OVERLAY_HANDLER.hideLoading();
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
      // /!\ SYNCHRONE /!\ TODO Passer en async Promise ? Je ne pense pas vu qu'il est en local
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
      try {
        init();
      } catch (e) {
        reject(e);
      }
    })
      .then(function () {
        LOADING_OVERLAY_HANDLER.hideLoading();
      })
      .catch(function (err) {
        LoggerModule.error("[INDEX.init] An error occured during page initialisation", err);

        reject(err)

        throw err;
        // LOADING_OVERLAY_HANDLER.hideLoading();
      }); //*/


    // todo ? isDebug == dev --> exposer les getters etc...
    return {
      getPreferedLanguage: function () {
        return PREFERED_LANGUAGE;
      },
      getParametresUrlOris: function () {
        return PARAMETRES_URL_ORIS;
      },
      getParametresUrlOrisNoFunction: function () {
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
        return GANTT_RENDERING_MODULE.getChart();
        // return APP_MODULE.getGanttRenderingModule().getChart();
      },
      getTaskEditor: function () {
        return TASK_EDITOR_MODAL;
      },

      reinitializeData: sendReinitializeMessageToWorker,
      reinializeChart: reinitializeChart
    }
  })();
  /* } catch (e) {
    LoggerModule.error("Page initialisation error:", e);
    errorAlert(e.description || e.message);
    APP_MODULE.getLoadingSpinnerHandler().hideLoading();
  } //*/
})
  .catch(function (e) {
    LoggerModule.error("Page initialisation error:", e);
    errorAlert("Page initialisation error: " + (e.description || e.message || e));
  })
  // finally
  .then(function (e) {
    // hideLoading à la main car certains l'handler peut ne pas être accessible s'il y a une erreur de syntaxe dans un fichier...
    setTimeout(function () {
      document.getElementById("loading-overlay").classList.remove("active");
    }, 250); // léger délais
  });