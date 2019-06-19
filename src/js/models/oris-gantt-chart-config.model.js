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
   *
   * @param parametreUrlOris
   * @param tasks
   * @param yCategories
   * @constructor
   */
  // TODO obligé d'exposer pour pouvoir tester...
  function initOrisGanttChartConfigModel (parametreUrlOris, yCategories, tasks) {
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
          }
        }
      },
      /*
      navigator: ,
      scrollbar: {
        enabled: true
      },
      rangeSelector: {
        enabled: true,
        selected: 0
      },//*/
      credits: { enabled: false },
      title: { text: null },
      subtitle: { text: null },
      plotOptions: {
        series: {
          animation: false,
          dataLabels: {
            enabled: true
            // format: '{point.name}' // todo custom formatter, surtout si pre/suffix/img, etc...
          }
        },
        dataLabels: {
          enabled: true,
          format: '{point.name}',
          style: {
            cursor: 'default',
            pointerEvents: 'none'
          }
        },
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
        xDateFormat: '%a %d %b, %H:%M'
      },
      series: []
    };

    // TODO implement
    // set yAxis.CATEGORIES
    BASE_CONFIG.yAxis.categories = yCategories;
    //
    // BASE_CONFIG.yAxis.categories =  { uniqueNames: true };
    if (parametreUrlOris.asRaw["uniquenames"] === "true")
      BASE_CONFIG.yAxis =  { uniqueNames: true };

    // set SERIES
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

    return currentConfig = BASE_CONFIG;
    // return currentConfig; // { config: currentConfig };
  }

  function drawChart (parametreUrlOris, rawTaskDatas) {
      // TODO check param integrity/type/etc...
      if (arguments.length !== 2)
        throw new EXCEPTIONS.MissingArgumentExcepetion("[GanttRenderingModule.categoryToIndex] 'parametreUrlOris' and/or 'rawTaskDatas' argument missing");

      // formatter les données
      let formattedYAxisAndData = formatYAxisAndTasks(rawTaskDatas);
      LoggerModule.info("[INDEX.WorkerMessageHandler] Ready to use yAxis and Data:", formattedYAxisAndData);

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
    LoggerModule.info("[INDEX.WorkerMessageHandler] Ready to use yAxis and Data:");
    LoggerModule.log("formattedYAxisAndData.categories", formattedYAxisAndData.categories);
    LoggerModule.log("formattedYAxisAndData.data", formattedYAxisAndData.data);

    chartObj.update({
      yAxis: {
        categories: formattedYAxisAndData.categories
      },
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
    },    // todo est-ce qu'il est référencé / se mettra à jour
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
