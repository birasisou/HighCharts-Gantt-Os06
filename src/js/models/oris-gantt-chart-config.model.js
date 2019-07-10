/**
 * Module used to draw / update the Gantt Chart
 */
function GanttRenderingModule () {
//let GanttRenderingModule = (function () {
  /**
   * @Private
   */
  // ID de l'élément DOM cible (<div>) pour dessiner le graphique
  let CONTAINER_ID = "container";

  /**
   * @public
   */
  let currentConfig = null,
      chartObj = null;

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
          animation: false,
          dataLabels: {
            enabled: true,
            // format: '{point.name}' // todo custom formatter, surtout si pre/suffix/img, etc...
            //*
            formatter: function() {
              let str = this.point.label;
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
        currentDateIndicator: true
      },{
        labels: {
          format: 'Semaine {value:%W}'
        }
      }],
      tooltip: {
        xDateFormat: '%a %d %b %Y, %H:%M',
        useHTML: true,
        formatter: function () {
          LoggerModule.log("this", this);

          // NAME
          let str = "<span>" + this.point.label + "</span>";

          // CATEGORY
          str += "<br><span><b>" + this.yCategory + "</b></span>";

          // START
          if (this.x)
            str += "<br><small>Début: " + Highcharts.dateFormat('%a %d %b %Y, %H:%M', this.x) + "</small>";  // todo format date

          // END
          if (this.x2)
            str += "<br><small>Fin: " + Highcharts.dateFormat('%a %d %b %Y, %H:%M', this.x2) + "</small>";

          // COMPLETED
          if (this.point.completed && this.point.completed.amount) {
            let amount = this.point.completed.amount;
            if (amount <= 1)
              amount = amount * 100;
            str += "<br><small>Avancement: " + amount + "%</small>";
          }

          // OWNER
          if (this.point.owner)
            str += "<br><small>Responsable: " + this.point.owner + "</small>";

          return str;
        }
      },
      series: []
    };

    // set CATEGORIES
    BASE_CONFIG.yAxis.categories = yCategories;
    // BASE_CONFIG.yAxis =  { uniqueNames: true };
    // TODO rendre ça mandatory car c'est juste "plus mieux"
    if (parametreUrlOris.asRaw["uniquenames"] === "true")
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
          // select: updateRemoveButtonStatus,
          // unselect: updateRemoveButtonStatus,
          // remove: updateRemoveButtonStatus
        }
      };

      // TODO initialise UI

      // Enable Drag/Drop
      BASE_CONFIG.plotOptions.series.dragDrop = {
        draggableX: true,
          draggableY: true,
          dragPrecisionX: day / 4 // Snap to eight hours
      }
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
    console.info("[INDEX.WorkerMessageHandler] Ready to use yAxis and Data:", formattedYAxisAndData);

    // Init config
    let highChartConfig = new initOrisGanttChartConfigModel(parametreUrlOris, formattedYAxisAndData.categories, formattedYAxisAndData.data);
    // todo ne pas formatter les données et utiliser { yAxis: { uniqueNames: true } }

    // console.warn("highChartConfig", highChartConfig);

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
    LoggerModule.info("[INDEX.WorkerMessageHandler] Ready to use yAxis and Data:");
    // console.warn("formattedYAxisAndData.categories", formattedYAxisAndData.categories);
    // console.warn("formattedYAxisAndData.data", formattedYAxisAndData.data);

    // console.error("new Series(formattedYAxisAndData.data)", new Series(formattedYAxisAndData.data));

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
