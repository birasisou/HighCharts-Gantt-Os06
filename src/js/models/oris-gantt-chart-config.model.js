/**
 * Module used to draw / update the Gantt Chart
 */
function GanttRenderingModule () {
//let GanttRenderingModule = (function () {
  /**
   * @Private
   */
  let CONTAINER_ID = "graph-container", // ID de l'élément DOM cible (<div>) pour dessiner le graphique
    EVENT_HANDLER = {
      point: {
        select: function(event, options) {
          DOM_REF.editButtons.edit.disabled = false;
          // MàJ la référence vers le point selectionné
          selectedPoint = this;
          alertify.success("Task Selected Event", 0.75);


        },
        unselect: function(event, options) {
          // Décalage pour cohérence
          setTimeout(function() {
            document.getElementById("task-edit-button").disabled = !chartObj.getSelectedPoints().length;
          }, 10);

          TOAST.success({ body: "Task Unselected Event", delay:750 });
          // alertify.success("Task Unselected Event", 0.75);
          // TODO
          console.warn("TODO: to implement");

          // return false;
        },
        remove: function(event, options) {
          alertify.success("Task Removed Event", 0.5);
          // TODO
          console.warn("TODO: to implement");
          return false;
        },
        /*
        drag: function (event, options) {
          alertify.success("Task Drag Event", 0.5);
          // TODO
          console.warn("TODO: to implement");
          // return false;
        },
        dragStart: function (event, options) {
          alertify.success("Task DragStart Event", 0.5);
          // TODO
          console.warn("TODO: to implement");
          // return false;
        }, // */
        drop: function (event) {
          console.log("drop.event", event);
          // TODO formatter event.newPoint.start et .end

          alertify.error("Task Drop Event", 1);
          // TODO
          //    faire la requête pour le point déplacé
          //    if (OK)
          //      alertify.success
          //    else
          //      alertify.

          let formattedData = SHARED.formatDataOptionsToPost(event.target.options, APP_MODULE.getParametresUrlOrisNoFunction());
          console.error("formattedData", formattedData);

          console.warn("TODO: to implement");
          return false;
        },
      }
    },

    /**
     * Référence aux boutons d'édition de tâche
     * @type {DOM}
     */
    DOM_REF = {
      editButtons: {
        add: null,
        edit: null,
        remove: null
      }
    };

  /**
   * @public
   */
  let currentConfig = null,
      chartObj = null,
      selectedPoint = null;

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
              LoggerModule.warn("[chart.events.redraw] Error", e);
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
                str += " (" + (this.point.completed.amount*100).toFixed(0) + "%)";
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
        /*
        dateTimeLabelFormats: {
          millisecond: '%H:%M:%S.%L',
          second: '%H:%M:%S',
          minute: '%H:%M',
          hour: '%H:%M',
          day: '%a %e %b',
                            day: {
                                list: ['%A %e %B', '%a %e %b', '%E']    // enlever les caractères inutiles
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
              amount = amount * 100;
            str += "<br><small>Avancement:&nbsp;" + amount + "%</small>";
          }

          // OWNER
          if (this.point.owner)
            str += "<br><small>Responsable:&nbsp;" + this.point.owner + "</small>";

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

    // enable EDIT
    if (parametreUrlOris.asRaw["edit"] === "true") {
      // TODO events
      BASE_CONFIG.plotOptions.series.allowPointSelect = true;
      BASE_CONFIG.plotOptions.series.point = {
        events: {
          select: EVENT_HANDLER.point.select,
          unselect: EVENT_HANDLER.point.unselect,
          remove: EVENT_HANDLER.point.remove,
          dragStart: EVENT_HANDLER.point.dragStart,
          drag: EVENT_HANDLER.point.drag,
          drop: EVENT_HANDLER.point.drop
        }
      };

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

      let editWidget = document.getElementById("task-edit-widget");
      let editButtonStyles = {
        add: {
          class: "success",
          icon: "fa-plus",
          label: "Add"
        },
        edit: {
          class: "primary",
          icon: "fa-edit",
          label: "Edit"
        },
        remove: {
          class: "danger",
          icon: "fa-trash",
          label: "Remove"
        }
      };

      for (let key in DOM_REF.editButtons) {
        let div = document.createElement("div");
        div.classList.add("btn-group", "col-4");

        let btn = document.createElement("button");
        btn.id = "task-" + key + "-button";
        btn.disabled = true;
        btn.classList.add("btn", "btn-" + editButtonStyles[key]["class"]);  // , "col-3", "mr-1"
        btn.innerHTML = '<i class="fa ' + editButtonStyles[key]["icon"] + '"></i>&nbsp;' + editButtonStyles[key]["label"];

        div.appendChild(btn);
        editWidget.appendChild(div);
        DOM_REF.editButtons[key] = btn;
      }
      DOM_REF.editButtons["edit"].addEventListener("click", function () {
        APP_MODULE.getTaskEditor().initAndShow(selectedPoint.options)
      });

      // Déselectionner le Point avec la touche "Échap"
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && selectedPoint)
          selectedPoint.select(false);
      });
    }

    return currentConfig = BASE_CONFIG;
    // return currentConfig; // { config: currentConfig };
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

    getSelectedPoints: function () {
      return chartObj.getSelectedPoints();
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
