/**
 * Module used to draw / update the Gantt Chart
 */
function GanttRenderingModule (PARAMETRES_URL_ORIS_NO_FUNCTIONS) {
  /**
   * @Variables
   */
  // PRIVATE
  let paramUrlOrisNoFunctions = PARAMETRES_URL_ORIS_NO_FUNCTIONS;

  // PUBLIC
  let currentConfig = null,
    self = this,
    chartObj = null,
    selectedPoint = null,
    // PRIVATE
    CONTAINER_ID = "graph-container", // ID de l'élément DOM cible (<div>) pour dessiner le graphique
    EVENT_HANDLER = {
      point: {
        select: function(event, options) {
          setTaskButtonDisabledState(false);
          // DOM_REF.editButtons.edit.disabled = false;
          // DOM_REF.editButtons.delete.disabled = false;
          // MàJ la référence vers le point selectionné
          selectedPoint = this;
          TOAST.info({body: "Task Selected Event", delay: 500 });
        },
        unselect: function(event, options) {
          // Décalage pour cohérence
          setTimeout(function() {
            document.getElementById("task-edit-button").disabled = !chartObj.getSelectedPoints().length;
            document.getElementById("task-delete-button").disabled = !chartObj.getSelectedPoints().length;
          }, 10);

          TOAST.info({ body: "Task Unselected Event", delay: 500 });
        },
        drop: function (event) {
          // Ici, les clefs sont celles d'HighCharts
          // On veut les remplacer par celles de notre base (param_url)
          let cloneOptions = {
            id: this.id
          };
          if (event.newPoint.start || event.newPoint.start === 0)
            cloneOptions.start = event.newPoint.start;
          if (event.newPoint.end || event.newPoint.end === 0)
            cloneOptions.end = event.newPoint.end;
          /**
           * Risque de poser problème si un Tick yAxis est "collapsed"
           * @Issue https://github.com/highcharts/highcharts/issues/11486
           */
          if (event.newPoint.y || event.newPoint.y === 0)
            cloneOptions.category = this.series.yAxis.categories[event.newPoint.y];
          // Ignorer les millisecondes. C'est déjà dans les pickers à l'affichage
          //*
          if (typeof cloneOptions.start === "number")
            cloneOptions.start = new Date(cloneOptions.start).setMilliseconds(0);
          if (typeof cloneOptions.end === "number")
            cloneOptions.end = new Date(cloneOptions.end).setMilliseconds(0);
          // */

          // S'il y a des groupes (parent/subtask),
          //  il faut faire une manipulation particulière pour également MàJ l'attribut &parent
          //  (HC version 7.1.2)
          //  https://github.com/highcharts/highcharts/issues/11486
          if (paramUrlOrisNoFunctions.asRaw["parent"]
              // MàJ un Point juste en le "resizant" ne change pas son Y donc event.newPoint.y n'existe pas
              && (event.newPoint["y"] || event.newPoint["y"] === 0)
              // && this.series.yAxis.mapOfPosToGridNode[event.newPoint["y"]]
              && this.series.yAxis.mapOfPosToGridNode[event.newPoint["y"]].nodes
              && this.series.yAxis.mapOfPosToGridNode[event.newPoint["y"]].nodes[0]) {
            cloneOptions.parent = this.series.yAxis.mapOfPosToGridNode[event.newPoint["y"]].nodes[0].parent || "";
            LoggerModule.info("newOptions.parent", cloneOptions.parent);
          }

          let newOptions = {},
            paramUrlKeys = paramUrlOrisNoFunctions.CONSTANTS.HC_CONFIG_KEYS.data;
          for (let option in cloneOptions) {
            if (paramUrlKeys[option]) {
              LoggerModule.info("'" + option + "' becomes '" + paramUrlOrisNoFunctions.asRaw[paramUrlKeys[option]["url_param"]] + "'", cloneOptions[option]);
              newOptions[paramUrlOrisNoFunctions.asRaw[paramUrlKeys[option]["url_param"]]] = (option === "start" || option === "end")
                ? (cloneOptions[option] ? new Date(cloneOptions[option]).toISOString(): "")
                : cloneOptions[option];
            }
          }
          // En dûr... &vline needed pour l'argument de la fonction et ID pour la requête
          newOptions["id"] = newOptions["vline"] = this.vline;


          LoggerModule.info("drop's newOptions", newOptions);

          APP_MODULE.getParametresUrlOris().tryAddOrEditPoint(newOptions, false);
          return false;
        },
      }
    },
    // Référence aux boutons d'édition de tâches @type {DOM}
    DOM_REF = {
      editButtons: {
        add: document.getElementById("task-add-button"),
        edit: document.getElementById("task-edit-button"),
        delete: document.getElementById("task-delete-button"),
        destroy: document.getElementById("chart-destroy-button")
      }
    };

  // Afficher le modal d'édition vide
  DOM_REF.editButtons["add"].addEventListener("click", function () {
    APP_MODULE.getTaskEditor().initAndShow({}, true)
  });

  // Afficher le modal d'édition avec les paramètres du point sélectionné
  DOM_REF.editButtons["edit"].addEventListener("click", function () {
    APP_MODULE.getTaskEditor().initAndShow(selectedPoint.options, false)
  });

  // Reinitialize graph:
  //  1) Destroy current graph and reset #graph-container's outterHTML (there are remains of previous chart)
  //  2) GET all data from Worker
  //  3) Redraw from scratch
  DOM_REF.editButtons.destroy.addEventListener("click", function () {
    // todo sudo showLoading (si une requête MàJ entre temps, on ne veut pas que ça cache le chargement,
    //  on veut carrément l'ignorer vu qu'on doit redresser TOUT le graphique d'abord))

    /* let renderToDiv = chartObj.renderTo,
      renderToDivId = renderToDiv.id;
    // Détruire le graphique
    chartObj.destroy();
    // Vider les restes
    renderToDiv.outerHTML = '<div id="' + renderToDiv.id + '" ></div>';
    // Envoyer le message au Worker pour récupérer totues les Tâches
    APP_MODULE.reinitializeData(); // */
    APP_MODULE.reinializeChart();
  });

  // Déselectionner le Point avec la touche "Échap"
  // todo prevent Default sur l'écouteur du modal pour ne pas désélectionner ici
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && selectedPoint                                             // touche Échap
      && !document.getElementById("delete-point-modal").classList.contains("show")  // Aucun modal d'ouvert (à ce moment là, Échap sert à fermer le modal
      && (!APP_MODULE.getTaskEditor().getInstance()
        || (APP_MODULE.getTaskEditor().getInstance() && !APP_MODULE.getTaskEditor().getInstance().isOpen())))
      selectedPoint.select(false);
  });

  /**
   * @Initialisation
   * TODO faire ça ailleurs...
   */
  /* Afficher le modal de suppression de point */
  $("#delete-point-modal").on({
    "show.bs.modal": function (event) {
      document.getElementById("delete-point-label").innerText = SHARED.decodeHTML(selectedPoint.options.label);
      document.getElementById("delete-point-label").innerHTML += /*"&nbsp;*/"<i>(ID: " + SHARED.decodeHTML(selectedPoint.options.id) + ")</i>";
    },
    // focus le bouton de suppression pour pouvoir le valider avec la touche Entrée
    "shown.bs.modal": function (event) {
      document.getElementById("delete-point-button").focus();
    }
  });
  document.getElementById("delete-point-button").addEventListener("click", function(event) {
    LoggerModule.info("Calling for deletion of #" + selectedPoint.id, selectedPoint.options);
    APP_MODULE.getParametresUrlOris().tryDeletePoint(selectedPoint.options);
  });

  /**
   * Set l'attribut "disabled" des bouttons (implémentés) du task-edit-widget
   * @param {boolean} isDisabled
   *  value for "disabled" attribute (true -> button won't be clickable)
   */
  function setTaskButtonDisabledState(isDisabled) {
    let supported = ["edit", "delete"],
      i = supported.length;
    while (i--) {
      DOM_REF.editButtons[supported[i]].disabled = isDisabled;
    }
  }

  /**
   * HighChart series Object
   * @param data
   * @throws if missing argument
   * @return {{data: *, name: string}}
   * @constructor
   */
  function Series(data) {
    if (arguments.length < 1)
      throw new EXCEPTIONS.MissingArgumentExcepetion("[Serie constructor] data argument is missing");

    return {
      name: data.name || "", // undefined ou null sont automatiquement remplacés par "Series N"
      data: data
    }
  }

  /**
   * Fixe le fait que la zone de labels de l'axe Y deviennent invisibles lorsque l'on update
   * https://github.com/highcharts/highcharts/issues/8862
   *
   * @param chart
   *    L'instance du graphique HighCharts
   */
  function invisibleYAxisWorkaround(chart) {
    if (!chart)
      return;

    // workaround start
    let H = Highcharts,
      container = chart.container,
      fixedRenderer = chart.fixedRenderer;
    if (!container || !fixedRenderer)
      return;
    // These elements are moved over to the fixed renderer and stay fixed
    // when the user scrolls the chart.
    [
      chart.inverted ?
        '.highcharts-xaxis' :
        '.highcharts-yaxis',
      chart.inverted ?
        '.highcharts-xaxis-labels' :
        '.highcharts-yaxis-labels',
      '.highcharts-contextbutton',
      '.highcharts-credits',
      '.highcharts-legend',
      '.highcharts-subtitle',
      '.highcharts-title',
      '.highcharts-legend-checkbox'
    ].forEach(function(className) {
      H.each(chart.container.querySelectorAll(className), function(elem) {
        (
          elem.namespaceURI === fixedRenderer.SVG_NS ?
            fixedRenderer.box :
            fixedRenderer.box.parentNode
        ).appendChild(elem);
        elem.style.pointerEvents = 'auto';
      });
    });
    // workaround end
  }

  /**
   * Fixe le fait que l'arrière plan semi-transparent de la zone des labels de l'axe Y
   * ne se colorait que jusqu'à la première catégorie contenant des sous-catégories
   * https://github.com/highcharts/highcharts/issues/11114
   *
   * @param chart
   *    L'instance du graphique HighCharts
   */
  function uncompleteOverlayBackgroundWorkaround(chart) {
    if (!chart || !chart.scrollableMask)
      return;

    setTimeout(function(){
      try {
        chart.applyFixed();
      } catch (e) {
        LoggerModule.warn("[uncompleteOverlayBackgroundWorkaround] Error ", e);
        return;
      }
    }, 0);
  }

  /**
   *
   * @param parametreUrlOris
   * @param tasks
   * @param yCategories
   * @constructor
   */
  // TODO obligé d'exposer pour pouvoir tester...
  function initOrisGanttChartConfigModel (parametreUrlOris, yCategories, tasks) {
    let day = 1000 * 60 * 60 * 24; // nombre de ms dans une journée

    if (arguments.length < 3)
      throw new EXCEPTIONS.MissingArgumentExcepetion("[initOrisGanttChartConfigModel constructor]");

    // template de base
    let BASE_CONFIG = {
      chart: {
        spacingLeft: 1,
        animation: false,
        events: {
          // Signaler à la page principale que le graphique est dessiné --> pour démarrer le monitoring
          load: function() {
            window.postMessage({
              chartLoaded: true
            }, "*");
          },
          redraw: function () {
            try {
              invisibleYAxisWorkaround(this);
              uncompleteOverlayBackgroundWorkaround(this);
            } catch (e) {
              LoggerModule.error("[chart.events.redraw] Error", e);
            }
          }
        }
      },
      credits: { enabled: false },
      title: { text: null },
      subtitle: { text: null },
      plotOptions: {
        series: {
          marker: {
            states: {
              select: {
                fillColor: "red"
              }
            }
          },
          animation: false,
          dataLabels: {
            enabled: true,
            // format: '{point.name}' // todo custom formatter, surtout si pre/suffix/img, etc...
            //*
            formatter: function() {
              let str = this.point.label || "";
              if (this.point.completed && this.point.completed.amount && typeof this.point.completed.amount === "number")
                str += " (" + ((Math.round(this.point.completed.amount*100)*10)/10)  + "%)"; // .toFixed(0) + "%)";
              return str;
            } //*/
          }
        }
      },
      yAxis: {
        type: 'category',
        categories: []
      },
      xAxis: [{
        //*
        dateTimeLabelFormats: {
          millisecond: '%H:%M:%S.%L',
          second: '%H:%M:%S',
          minute: '%H:%M',
          hour: '%H:%M',
          // day: '%a %e %b',
                            day: {
                                list: ['%A %e %B', '%a %e %b', '%e %b', '%E']    // enlever les caractères inutiles
                            },
          week: '%e %b',
          month: '%b \'%y',
          year: '%Y'
        }, // */
        currentDateIndicator: true,
        minPadding: 0.01,
        maxPadding: 0.01,
        minTickInterval: 86400000 // 1 Day: 24 * 3600000 = 86400000
      }, { // Le 2e axe X est la ligne des "semaines"
        labels: {
          format: (APP_MODULE.getPreferedLanguage() === "fr" ? 'Semaine' : 'Week') + ' {value:%W}'
        }
      }],
      tooltip: {
        xDateFormat: '%a %d %b %Y, %H:%M',
        useHTML: true,
        formatter: function () {
          // NAME
          let str = this.point.label ? "<span>" + this.point.label + "</span><br>" : "";

          // CATEGORY
          str += "<span><b>" + this.yCategory + "</b></span>";

          // START
          if (this.x)
            str += "<br><small>Début:&nbsp;" + Highcharts.dateFormat('%a %d %b %Y, %H:%M', this.x) + "</small>";  // todo format date

          // END
          if (this.x2)
            str += "<br><small>Fin:&nbsp;" + Highcharts.dateFormat('%a %d %b %Y, %H:%M', this.x2) + "</small>";

          // COMPLETED
          if (this.point.completed && this.point.completed.amount) {
            let amount = this.point.completed.amount;
            if (amount <= 1)
              amount = ((Math.round(amount*100)*10)/10);
            str += "<br><small>Avancement:&nbsp;" + amount + "%</small>";
          }

          // OWNER
          if (this.point.owner)
            str += "<br><small>Responsable:&nbsp;" + this.point.owner + "</small>";

          /**
           * @Issue #19
           * Custom Inputs
           */
          for (let customInput in paramUrlOrisNoFunctions.CONSTANTS.HC_CONFIG_KEYS.dataLabel) {
            // N'afficher la ligne que si l'input existe ET a une valeur
            if (this.point[customInput]) {
              str += "<br><small>";
              // Si l'input custom a un label, afficher "<label>: "
              let customLabel = paramUrlOrisNoFunctions.CONSTANTS.HC_CONFIG_KEYS.dataLabel[customInput];
              if (customLabel)
                str += customLabel + ": ";
              str += this.point[customInput] + "</small>";
            }
          }


          return str;
        }
      },
      series: []
    };

    // set CATEGORIES
    BASE_CONFIG.yAxis.categories = yCategories;
    // if (parametreUrlOris.asRaw["uniquenames"] === "true")
      // BASE_CONFIG.yAxis =  { uniqueNames: true };
    /**
     * Détecter ("calculer") yAxis.uniqueNames
     */
    BASE_CONFIG.yAxis =  { uniqueNames: true };

    // set SERIES
    //LoggerModule.warn(new Series(tasks));
    BASE_CONFIG.series.push(new Series(tasks)); // TODO gérer plusieurs séries

    // set TITLE
    if (parametreUrlOris.asRaw["title"])
      BASE_CONFIG.title = { text: parametreUrlOris.asRaw["title"] };

    // set SUBTITLE
    if (parametreUrlOris.asRaw["subtitle"])
      BASE_CONFIG.subtitle = { text: parametreUrlOris.asRaw["subtitle"] };

    // set NAVIGATOR
    if (parametreUrlOris.asRaw["navigator"] === "true")
      BASE_CONFIG.navigator = {
        enabled: true,
        liveRedraw: false,
        series: {
          type: 'gantt',
          pointPlacement: 0.5,
          pointPadding: 0.25
        },
        yAxis: {
          reversed: true,
          categories: []
        }
      };

    // set SCROLLBAR
    if (parametreUrlOris.asRaw["scrollbar"] === "true")
      BASE_CONFIG.scrollbar = { enabled: true };

    // set RANGE SELECTOR
    if (parametreUrlOris.asRaw["selector"] === "true")
      BASE_CONFIG.rangeSelector = {
        enabled: true,
          selected: 0
      };

    // set MIN WIDTH for scrollable Area (> que scrollbar, car pour scollbar il faut définir la taille en valeurs de X et qu'on a des dates...)
    if (parametreUrlOris.asRaw["minwidth"]) {
      let numberValue = new OrisData(parametreUrlOris.asRaw["minwidth"]).asNumber();
      if (numberValue)
        BASE_CONFIG.chart.scrollablePlotArea = {
          minWidth: numberValue
        };
    }
    /**
     * minHeight ne marhe pas...
    if (parametreUrlOris.asRaw["minheight"]) {
      let numberValue = new OrisData(parametreUrlOris.asRaw["minheight"]).asNumber();
      if (numberValue) {
        // Ne pas écraser l'objet "scrollablePlotArea" s'il existe déjà
        if (BASE_CONFIG.chart.scrollablePlotArea)
          BASE_CONFIG.chart.scrollablePlotArea.minHeight = numberValue;
        else
          BASE_CONFIG.chart.scrollablePlotArea = {
            minHeight: numberValue
          };
      }
    } */

    // enable EDIT
    /**
     * @Réunion du 30 juillet 2019
     *  L'édition est toujours activée
     *  Les boutons d'édition et le champ de recherche sont masqués par défauts et
     */
    //if (parametreUrlOris.asRaw["edit"] === "true") {
      // TODO events
      BASE_CONFIG.plotOptions.series.allowPointSelect = true;
      BASE_CONFIG.plotOptions.series.point = {
        events: {
          select: EVENT_HANDLER.point.select,
          unselect: EVENT_HANDLER.point.unselect,
          remove: EVENT_HANDLER.point.delete,
          dragStart: EVENT_HANDLER.point.dragStart,
          drag: EVENT_HANDLER.point.drag,
          drop: EVENT_HANDLER.point.drop
        }
      };

      // Changer le style d'un Point sélectionné
      BASE_CONFIG.plotOptions.gantt = {
        states: {
          select: {
            color: undefined, // ne pas changer la couleur du point sélectionné
            borderColor: "rgba(10, 240, 80, 0.6)", // "rgba(10, 190, 255, 0.5)", // "#0043ff", // "#83ff8d"
            borderWidth: 2.5
          }
        }
      };

      // TODO initialise UI
      //    Inclure une librairie ?
      // Enable Drag/Drop
      BASE_CONFIG.plotOptions.series.dragDrop = {
        liveRedraw: false,
        draggableX: true,
        draggableY: true, // ne fonctionne pas en mode "uniqeNames"
        dragPrecisionX: day / 2 // Snap to eight hours
      };

    /**
     * Ne pas réinstancier les boutons si on re-crée le graphe après l'avoir .destroy()
     */
    if (!DOM_REF.editButtons.edit) {
      // Déselectionner le Point avec la touche "Échap"
      // todo prevent Default sur l'écouteur du modal pour ne pas désélectionner ici
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && selectedPoint                                             // touche Échap
          && !document.getElementById("delete-point-modal").classList.contains("show")  // Aucun modal d'ouvert (à ce moment là, Échap sert à fermer le modal
          && (!APP_MODULE.getTaskEditor().getInstance()
            || (APP_MODULE.getTaskEditor().getInstance() && !APP_MODULE.getTaskEditor().getInstance().isOpen())))
          selectedPoint.select(false);
      });
    } // FIN init Buttons

    return currentConfig = BASE_CONFIG;
  }



  function drawChart (parametreUrlOris, rawTaskDatas) {
    // TODO check param integrity/type/etc...
    if (arguments.length !== 2)
      throw new EXCEPTIONS.MissingArgumentExcepetion("[GanttRenderingModule.categoryToIndex] 'parametreUrlOris' and/or 'rawTaskDatas' argument missing");

    // formatter les données
    let formattedYAxisAndData = formatYAxisAndTasks(rawTaskDatas);
    LoggerModule.log("[INDEX.WorkerMessageHandler] Ready to use yAxis and Data:", formattedYAxisAndData);

    // Init config
    let highChartConfig = new initOrisGanttChartConfigModel(parametreUrlOris, formattedYAxisAndData.categories, formattedYAxisAndData.data);
    // todo ne pas formatter les données et utiliser { yAxis: { uniqueNames: true } }


    chartObj = Highcharts.ganttChart(CONTAINER_ID, highChartConfig);
  }

  /**
   * Méthode naïve pour mettre à jour le graphique lors que de nouvelles données sont reçues
   * @param parametreUrlOris
   * @param rawTaskDatas
   */
  function updateChart (parametreUrlOris, rawTaskDatas) {
    // TODO check param integrity/type/etc...
    if (arguments.length !== 2)
      throw new EXCEPTIONS.MissingArgumentExcepetion("[GanttRenderingModule.updateChart] 'parametreUrlOris' and/or 'rawTaskDatas' argument missing");

    // formatter les données
    let formattedYAxisAndData = formatYAxisAndTasks(rawTaskDatas);
    LoggerModule.error("[INDEX.WorkerMessageHandler] Ready to use yAxis and Data:", formattedYAxisAndData);

    chartObj.update({
      yAxis: {
        categories: formattedYAxisAndData.categories  // no need quand &uniqueNames
      }, //*/
      series: [new Series(formattedYAxisAndData.data)]
    });
    LoggerModule.info("Done updating");
  }

  /**
   * Transforme un Objet contenant des Tasks en la liste des catégories Y
   * et met à jour les Tasks avec l'index de l'ID de leur catégorie
   * @param  {Object} tasksAsObject
   *    L'objet "updatedTasks" renvoyé par le Worker --> Object contenant les Tasks sous la forme {<ID Task>:<OrisGanttTaskModel>}
   * @return {Object}
   *     .categories  => les valeurs uniques de l'taskArray passé en paramètre
   *     .data        => l'array initial où les valeurs sont remplacées par l'index correspondant de .categories
   */
  function formatYAxisAndTasks (tasksAsObject) {
    if (arguments.length !== 1)
      throw new Error(new EXCEPTIONS.MissingArgumentExcepetion("[GanttRenderingModule.categoryToIndex] taskArray argument missing"));

    // Transformer l'Objet d'OrisGanttTasks en array d'OrisGantt
    let tasksAsArray = Object.values(tasksAsObject);

    /**
     * Empty return template
     * @type {{data: Array, categories: Array}}
     */
    let resultat = {
      categories: [],
      data:       tasksAsArray
    };

    // Récupérer les categories de chaque Task
    resultat.categories = resultat.data.map(function (current) {
      return current.category;
    })
      // valeurs uniques
      .filter(function (val, i, self) {
      return self.indexOf(val) === i;
    });
    // remplacer la catégorie (string) par son index (int) dans 'resultat.categories'
    // resultat.data = data.map(function (val) {
      // return resultat.categories.indexOf(val);
    // }); //pas besoin de filter
    let l = resultat.data.length;
    while (l--) {
      resultat.data[l]["y"] = resultat.categories.indexOf(resultat.data[l]["category"]);
    }
    return resultat;
  }

  return {
    getConfig: function () {
      return currentConfig;
    },
    getChart: function () {
      return chartObj;
    },

    getSelectedPoint: function () {
      return selectedPoint;
    },

    enableTaskButtons: function() {
      setTaskButtonDisabledState(false);
    },
    disableTaskButtons: function() {
      setTaskButtonDisabledState(true);
    },

    draw: drawChart,

    update: updateChart,

    Series: Series,
    initConfig: initOrisGanttChartConfigModel,
    setConfig: function (config) {  // pour debug
      currentConfig = config;
    },

    // exopsé pour tester ?
    formatYAxisAndTasks: formatYAxisAndTasks
  }
}
