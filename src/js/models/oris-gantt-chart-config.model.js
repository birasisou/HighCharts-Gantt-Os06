/**
 * Module used to draw / update the Gantt Chart
 */
function GanttRenderingModule (PARAMETRES_URL_ORIS_NO_FUNCTIONS) {
  /**
   * @Variables
   */
  // PRIVATE
  let paramUrlOrisNoFunctions = PARAMETRES_URL_ORIS_NO_FUNCTIONS,
    hcConfigKeys = paramUrlOrisNoFunctions.CONSTANTS.HC_CONFIG_KEYS,
    // utilisé pour créer l'event Double Click
    pointClickedId = "";

  // PUBLIC
  let currentConfig = null,
    self = this,
    chartObj = null,
    selectedPoint = null,
    // PRIVATE
    CONTAINER_ID = "graph-container", // ID de l'élément DOM cible (<div>) pour dessiner le graphique
    EVENT_HANDLER = {
      point: {
        select: function(event) {
          setTaskButtonDisabledState(false);
          // DOM_REF.editButtons.edit.disabled = false;
          // DOM_REF.editButtons.delete.disabled = false;
          // MàJ la référence vers le point selectionné
          selectedPoint = this;

          if (pointClickedId && event.target.id === pointClickedId) {
            EVENT_HANDLER.point.dbclick(event, this);
          } else {
            pointClickedId = this.id;
            setTimeout(function () {
              pointClickedId = "";
            }, 500) // 500ms pour "détecter le double click", même valeur que Windows
          }

          // TOAST.info({body: "Task Selected Event", delay: 500 });
        },
        unselect: function(event) {
          // Détecter DBClick, même si le point est déjà sélectionné
          // fixes @GituIssue #36 mais il faut vérifier qu'il s'agit du même ID car "unselect" est lancé après "select"
          // et ça détectait comme DB click lors de clic d'un Point à un autre
          if (pointClickedId && event.target.id === pointClickedId) {
            EVENT_HANDLER.point.dbclick(event, this);
            return false;
          } else if (!pointClickedId) { // obligé de préciser car sinon --> #36
            pointClickedId = this.id;
            setTimeout(function () {
              pointClickedId = "";
            }, 500) // 500ms pour "détecter le double click", même valeur que Windows
          }

          // Décalage pour cohérence
          setTimeout(function() {
            document.getElementById("task-edit-button").disabled = !chartObj.getSelectedPoints().length;
            document.getElementById("task-delete-navbar-button").disabled = !chartObj.getSelectedPoints().length;
          }, 10);

          // TOAST.info({ body: "Task Unselected Event", delay: 500 });
        },

        // Double Clic
        dbclick: function (event, target) {
          $(".multi-collapse").collapse('show');
          APP_MODULE.getTaskEditor().initAndShow(selectedPoint.options, false);
        },

        dragStart: function () {
          // update toast infos
          updateDragInfoToast(this);
          // show toast
          TOAST.showDragInfoToast();
          TOAST.getDragInfoToast().autoHide = true;
          // Si le dragStart n'était qu'un simple clic, on a besoin de manuellement le remasquer
          setTimeout(function() {
            if (TOAST.getDragInfoToast().autoHide)
              TOAST.hideDragInfoToast();
          }, 750);
        },

        drag: function (event) {
          TOAST.getDragInfoToast().autoHide = false;

          let tmp = event.newPoint;
          tmp["raw-start"] = this["raw-start"];
          tmp["raw-end"] = this["raw-end"];
          updateDragInfoToast(tmp);
        },

        drop: function (event) {
          console.log("drop event", event);

          // Ici, les clefs sont celles d'HighCharts
          // On veut les remplacer par celles de notre base (param_url)
          let cloneOptions = {
            id: this.id
          };
          if (event.newPoint.start || event.newPoint.start === 0) {
            cloneOptions.start = event.newPoint.start;
            cloneOptions["raw-start"] = event.newPoints[event.target.id].point.options["raw-start"];  // oui, c'est relou ET fortement couplé à la librairie HighCharts...
          }
          if (event.newPoint.end || event.newPoint.end === 0) {
            cloneOptions.end = event.newPoint.end;
            cloneOptions["raw-end"] = event.newPoints[event.target.id].point.options["raw-end"];  // oui, c'est relou ET fortement couplé à la librairie HighCharts...
          }

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
              if (option === "start" || option === "end") {
                let date = new Date(cloneOptions[option]);
                // Conserver le format de la DB (Long/Court)
                let isShortFrenchDate = (cloneOptions["raw-" + option] && cloneOptions["raw-" + option].indexOf("Z") < 0);  // format long --> Zulu Time
                newOptions[paramUrlOrisNoFunctions.asRaw[paramUrlKeys[option]["url_param"]]] = isShortFrenchDate ? SHARED.toShortFrenchDate(date) : date.toISOString();
                // newOptions[paramUrlOrisNoFunctions.asRaw[paramUrlKeys[option]["url_param"]]] = isShortFrenchDate ? (date.getDate() + "/" + (date.getMonth()+1) + "/" + date.getFullYear()) : date.toISOString();
              } else
                newOptions[paramUrlOrisNoFunctions.asRaw[paramUrlKeys[option]["url_param"]]] = cloneOptions[option];
                /*newOptions[paramUrlOrisNoFunctions.asRaw[paramUrlKeys[option]["url_param"]]] =
                (option === "start" || option === "end")
                  ? (cloneOptions[option] ?
                    // FORMAT COURT / LONG
                    ( cloneOptions["raw-" + option].indexOf("Z") > 0 ? new Date(cloneOptions[option]).toISOString() : )
                    : "")
                  : cloneOptions[option];
                  */
            }
          }
          // En dûr... &vline needed pour l'argument de la fonction et ID pour la requête
          newOptions["id"] = newOptions["vline"] = this.vline;


          console.info("drop's newOptions", newOptions);

          APP_MODULE.getParametresUrlOris().tryAddOrEditPoint(newOptions, false);

          setTimeout(TOAST.hideDragInfoToast, 250);
          return false;
        },
      }
    },
    // Référence aux boutons d'édition de tâches @type {DOM}
    DOM_REF = {
      editButtons: {
        add: document.getElementById("task-add-button"),
        edit: document.getElementById("task-edit-button"),
        delete: document.getElementById("task-delete-navbar-button"),
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
        || (APP_MODULE.getTaskEditor().getInstance() && !APP_MODULE.getTaskEditor().isOpen())) )
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
    },
    "hide.bs.modal": function (event) {
      if (APP_MODULE.getTaskEditor().isOpen())
        APP_MODULE.getTaskEditor().hide();
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
   * @GitIssue #33 Ajouter des icônes aux tâches
   * Génère l'élément DOM adapté pour afficher une icône dans une tâche
   *
   * @param {string} icon
   *    Si la valeur contient un "." il s'agit d'une URI, absolue ou relative,
   *    sinon on interprète cela comme une icône FontAwesome 4.7.0
   *
   *    Dans le cas FontAwesome, il est possible de préciser la taille via les classes css FontAwesome (https://fontawesome.com/how-to-use/on-the-web/styling/sizing-icons)
   *    et la couleur via les classes Bootstrap 4 (https://getbootstrap.com/docs/4.3/utilities/colors/)
   *
   * @return {string}
   *    Élément DOM sous forme de string
   */
  function iconFormatter(icon, align) {
    if (icon.indexOf(".") > 0)  // fichier local, à mettre dans un tag <img>
      return '<div style="opacity: 0.85; width: 24px; height: 24px; overflow: hidden; '
        + ((align === "left")
          ? 'margin-left: -25px; '
          : 'position:absolute; left: 0; top: -1px; ')
        + '">\n<img src="' + icon + '" style="width: 24px; ">\n</div>';
    else
      return '<i class="fa ' + icon + '" style="opacity: 0.85; vertical-align: middle; "></i>';
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
      data: data,

      dataLabels: [
        // icon-left
        {
          enabled: true,
          allowOverlap: true,
          align: 'left',
          useHTML: true,
          formatter: function() {
            let icon = this.point.iconLeft;
            if (icon)
              return iconFormatter(icon, "left");
          }
        },
        // label
        {
          allowOverlap: true,
          enabled: true,
          // useHTML: true,
          formatter: function() {
            let str = this.point.label || "";
            if (this.point.completed && this.point.completed.amount && typeof this.point.completed.amount === "number")
              str += " (" + ((Math.round(this.point.completed.amount*100)*10)/10)  + "%)"; // .toFixed(0) + "%)";
            return str;
          }
        },
        // icon-right
        {
          enabled: true,
          allowOverlap: true,
          align: 'right',
          useHTML: true,
          formatter: function() {
            let icon = this.point.iconRight;
            if (icon) {
              return iconFormatter(icon, "right");
            }
          }
        }]

    }
  }

  /**
   * @Issue Fixe le fait que la zone de labels de l'axe Y deviennent invisibles lorsque l'on update
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

    /**
     * @TEMPALTE Gantt
     */
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
          animation: false
        }
      },
      yAxis: {
        type: 'category',
        categories: []
      },
      xAxis: [{
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
        },
        gridLineWidth: parametreUrlOris.asRaw["grid"] === "true" ? 1 : 0,
        currentDateIndicator: parametreUrlOris.asRaw["current"] === "true" ? { color: 'red' } : false,
        minPadding: 0.01,
        maxPadding: 0.01,
        // minTickInterval: (parametreUrlOris.asRaw["xinterval"] || 1) * 24 * 3600 * 1000 // 1 Day === 24 * 3600 * 1000 en ms
        tickInterval: (parametreUrlOris.asRaw["xinterval"] || 1) * 24 * 3600 * 1000 // 1 Day === 24 * 3600 * 1000 en ms
      }, { // Le 2e axe X est la ligne des "semaines"
        labels: {
          /*formatter: function () {
            console.info("labels this", this);
            if (!parametreUrlOris.asRaw["xlabel"])
              return (APP_MODULE.getPreferedLanguage() === "fr" ? 'Semaine' : 'Week') + ' {value:%W}';
            else
              return "{value:%" + parametreUrlOris.asArray["_xlabel"].join('}{value:%') + "}";
          }, //*/
          /**
           * @Issue #38
           **/
          format: parametreUrlOris.asRaw["xlabel"]
            ? ("{value:" + parametreUrlOris.asArray["_xlabel"].join("}{value:") + "}") //  {value:%B}  {value:%Y}'
            // ? ("{value:%" + parametreUrlOris.asRaw["xlabel"] + "}") //  {value:%B}  {value:%Y}'
            : (APP_MODULE.getPreferedLanguage() === "fr" ? 'Semaine' : 'Week') + ' {value:%W}' //*/
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
            str += "<br><small>"+ (APP_MODULE.getPreferedLanguage() === "fr" ? 'Début' : 'Start')
              + ":&nbsp;" + (this.point.options["raw-start"].indexOf("Z") < 0
                ? SHARED.toShortFrenchDate(this.x)
                : Highcharts.dateFormat('%a %d %b %Y, %H:%M', new Date(this.x))) + "</small>";  // todo format date

          // END
          if (this.x2)
            str += "<br><small>"+ (APP_MODULE.getPreferedLanguage() === "fr" ? 'Fin' : 'End')
              + ":&nbsp;" + (this.point.options["raw-end"].indexOf("Z") < 0
                ? SHARED.toShortFrenchDate(this.x2)
                : Highcharts.dateFormat('%a %d %b %Y, %H:%M', new Date(this.x2))) + "</small>";
          // + Highcharts.dateFormat('%a %d %b %Y, %H:%M', this.x2) + "</small>";

          // COMPLETED
          if (this.point.completed && this.point.completed.amount) {
            let amount = this.point.completed.amount;
            if (amount <= 1)
              amount = ((Math.round(amount*100)*10)/10);
            str += "<br><small>Avancement:&nbsp;" + amount + "%</small>";
          }

          /**
           * @Issue #19 & #33
           * Custom Inputs
           */
          for (let customInput in paramUrlOrisNoFunctions.CONSTANTS.HC_CONFIG_KEYS.dataLabel) {
            // N'afficher la ligne que si l'input existe ET a une valeur
            if ((this.point[customInput] || this.point[customInput] === "" ) && (customInput !== paramUrlOrisNoFunctions.asRaw["icon-left"] && customInput !== paramUrlOrisNoFunctions.asRaw["icon-right"])) {
              str += "<br><small>";
              // Si l'input custom a un label, afficher "<label>: "
              let customLabel = paramUrlOrisNoFunctions.CONSTANTS.HC_CONFIG_KEYS.dataLabel[customInput];
              // N'ajouter le ": " que s'il y a un label
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
    // if (parametreUrlOris.asRaw["title"])
    //  BASE_CONFIG.title = { text: parametreUrlOris.asRaw["title"] };
    if (parametreUrlOris.asRaw[hcConfigKeys.chart.title.url_param]) // version moins "couplée"
      BASE_CONFIG.title = {
        text: decodeURIComponent(parametreUrlOris.asRaw[hcConfigKeys.chart.title.url_param])
    };

    // set SUBTITLE
    // if (parametreUrlOris.asRaw["subtitle"])
    //  BASE_CONFIG.subtitle = { text: parametreUrlOris.asRaw["subtitle"] };
    if (parametreUrlOris.asRaw[hcConfigKeys.chart.subtitle.url_param]) // version moins "couplée"
      BASE_CONFIG.subtitle = {
      text: decodeURIComponent(parametreUrlOris.asRaw[hcConfigKeys.chart.subtitle.url_param])
    };

    // TODO pas recommandé
    // set NAVIGATOR
    if (parametreUrlOris.asRaw["navigator"] === "true")
      BASE_CONFIG.navigator = {
        enabled: true,
        liveRedraw: false,
        series: {
          type: 'gantt',
          pointPlacement: 0.5,
          pointPadding: 0.25,
          dataLabels: [{
            enabled: false
          }, {
            enabled: false
          }]
        },
        yAxis: {
          reversed: true,
          categories: []
        }
      };

    // TODO pas recommandé
    // set SCROLLBAR
    if (parametreUrlOris.asRaw["scrollbar"] === "true")
      BASE_CONFIG.scrollbar = { enabled: true };

    // set RANGE SELECTOR
    if (parametreUrlOris.asRaw["selector"] === "true")
      BASE_CONFIG.rangeSelector = {
          enabled: true,
          // selected: 0,
          buttons: []
      };


    // set MIN WIDTH for scrollable Area (> que scrollbar, car pour scollbar il faut définir la taille en valeurs de X et qu'on a des dates...)
    if (parametreUrlOris.asRaw[hcConfigKeys.chart.minWidth.url_param]) {
      let numberValue = new OrisData(parametreUrlOris.asRaw[hcConfigKeys.chart.minWidth.url_param])[hcConfigKeys.chart.minWidth.format]();
      if (numberValue)
        BASE_CONFIG.chart.scrollablePlotArea = {
          minWidth: numberValue
        };
    }
    // set WIDTH et HEIGHT pour forcer une dimension au graphique (/!\ désactiver la responsivité /!\)
    // Attention à ne pas utiliser WIDTH avec minWidth (si width < minWidth, le graphique dépassera sa bordure de droite...)
    if (parametreUrlOris.asRaw[hcConfigKeys.chart.height.url_param]) {
      let numberValue = new OrisData(parametreUrlOris.asRaw[hcConfigKeys.chart.height.url_param])[hcConfigKeys.chart.height.format]();
      if (numberValue)
        BASE_CONFIG.chart.height = numberValue
    }
    if (parametreUrlOris.asRaw[hcConfigKeys.chart.width.url_param]) {
      let numberValue = new OrisData(parametreUrlOris.asRaw[hcConfigKeys.chart.width.url_param])[hcConfigKeys.chart.width.format]();
      if (numberValue)
        BASE_CONFIG.chart.width = numberValue
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

      // Enable Drag/Drop
      BASE_CONFIG.plotOptions.series.dragDrop = {
        liveRedraw: false,
        draggableX: true,
        draggableY: true, // ne fonctionne pas en mode "uniqeNames"
        dragPrecisionX: parametreUrlOris.asRaw["xprecision"]
          ? (parametreUrlOris.asRaw["xprecision"] * 36e5) // précision en heures
          // : (day / 2) // Snap to 12 hours
          : (day / 48) // Snap to 30 minutes
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
            || (APP_MODULE.getTaskEditor().getInstance() && !APP_MODULE.getTaskEditor().isOpen())))
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
    LoggerModule.info("[INDEX.WorkerMessageHandler] Ready to use yAxis and Data:", formattedYAxisAndData);

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

  // TODO
  //    Drag Info Toast, ici plutôt que dans TOAST factory ?
  /**
   * Met à jour les dates &start/end indicatives du Toast de Drag/Drop
   * @param {Object} newData
   *    HighCharts Point.userOptions (x/start et y/end)
   */
  function updateDragInfoToast(newData) {
    LoggerModule.log("newData", newData);
    // Date de départ
    newData.x = newData.x || newData.start;
    if (newData.x) {
      TOAST.getDragInfoToast().start.innerText = SHARED.isShortFrenchDate(newData["raw-start"])
        ? SHARED.toShortFrenchDate(newData.x)
        : Highcharts.dateFormat('%a  %d %b %Y, %H:%M', new Date(newData.x))
    }

    // Date de fin
    newData.x2 = newData.x2 || newData.end;
    if (newData.x2) {
      TOAST.getDragInfoToast().element.classList.remove("is-milestone");
      TOAST.getDragInfoToast().end.innerText = SHARED.isShortFrenchDate(newData["raw-end"])
        ? SHARED.toShortFrenchDate(newData.x2)
        : Highcharts.dateFormat('%a %d %b %Y, %H:%M', new Date(newData.x2))
    } else { // Cas milestone
      TOAST.getDragInfoToast().element.classList.add("is-milestone");
    }
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
