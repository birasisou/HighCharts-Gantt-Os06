// Extend existing 'alert' dialog
if(!alertify.postErrorAlert){
  //define a new errorAlert base on alert
  alertify.dialog('postErrorAlert',function factory(){
    return{
      build:function(){
        let errorHeader = '<span class="fa fa-exclamation-triangle fa-2x" '
          +    'style="vertical-align:middle;color:#e10000;">'
          + '</span> Error';
        this.setHeader(errorHeader);
      }
    };
  }, false,'alert');
}

/**
 * Instancie le modal utilisé pour éditer une tâche
 *
 * // todo static vs dynamic
 * L'instanciation est statique. En effet, on ne peut pas "deviner" l'ID de la colonne à éditer.
 * Ces ID des colonnes renseignées dans l'URL sont stockées dans "asRaw"
 * Les paramètres HighCharts paramétrables sont renseignés dans ParametresUrlOris.CONSTANTS.HC_CONFIG_KEYS.data
 *  et c'est ici que l'on fait l'équivalence entre "attribut HC" et "ID de la colonne de la base"
 */
function TASK_EDITOR_MODAL_FACTORY () {
  /**
   * Form HTML servant de template
   * @type {HTMLElement}
   */
  let FORM_TEMPLATE = document.getElementById("secret-santa"),
    /**
     * userOptions de la Tâche actuellement modifiée (ou dernièrement modifiée)
     */
    currentTaskOptions = null,
    currentYAxisCategories = [],
    currentDataIds = [],

    /**
     * Référence à l'objet AlertifyJS
     */
    INSTANCE = null,
    /**
     * Objet contenant les références HTML de chaque <input> du modal
     * <userOption>:<DOM Input>
     */
    INPUTS = {
      label: document.getElementById(inputId("name")),
      id: document.getElementById(inputId("id")),
      start: document.getElementById(inputId("start")),
      end: document.getElementById(inputId("end")),
      completed: document.getElementById(inputId("completed")),
      color: document.getElementById(inputId("color")),
      category: document.getElementById(inputId("category")),
      dependency: document.getElementById(inputId("dependency")),
      vline: document.getElementById(inputId("vline"))

      // TODO Add custom Labels (responsable, icon, etc...)
    },
    DATERANGEPICKER_CONFIG = {
    "singleDatePicker": true,
    "timePicker": true,
    "timePicker24Hour": true,
    "locale": {
      "format": "DD/MM/YYYY",
      "separator": " - ",
      "applyLabel": "Valider",
      "cancelLabel": "Annuler",
      "fromLabel": "De",
      "toLabel": "À",
      "weekLabel": "S",
      "daysOfWeek": [
        "Dim",
        "Lun",
        "Mar",
        "Mer",
        "Jeu",
        "Ven",
        "Sam"
      ],
      "monthNames": [
        "janvier",
        "février",
        "mars",
        "avril",
        "mai",
        "juin",
        "juillet",
        "août",
        "septembre",
        "octobre",
        "novembre",
        "décembre"
      ],
      "firstDay": 1
    },
  };

  /**
   * Initialiser les éléments de l'UI
   * Appelé qu'une seule fois
   */
  // Color picker, pas de config particulière (permet le RGBA)
  $(INPUTS["color"]).colorpicker();
  // Les Date pickers
//  $(INPUTS["start"]).daterangepicker(JSON.parse(JSON.stringify(DATERANGEPICKER_CONFIG)));
  $(INPUTS["start"]).datetimepicker({
    allowInputToggle: true,
    locale: 'fr'
  });
  $(INPUTS["end"]).datetimepicker({
    allowInputToggle: true,
    locale: 'fr'
  });
  $(INPUTS["start"]).on("dp.change", function (e) {
    $(INPUTS["end"]).data("DateTimePicker").minDate(e.date);
  });
  $(INPUTS["end"]).on("dp.change", function (e) {
    $(INPUTS["start"]).data("DateTimePicker").maxDate(e.date);
  });

  // todo ????
  // TODO MàJ le dateMin/dateMax de end/start en fonction de la date choisie
  /*
  $(INPUTS["start"]).on('apply.daterangepicker', function (ev, picker) {
    console.warn("ev", ev);
    console.warn("picker", picker);
    console.warn("picker.element[0].value", picker.element[0].value);

    let newConfig = JSON.parse(JSON.stringify(DATERANGEPICKER_CONFIG));
    console.log("minDate", picker.element[0].value);
    console.log("=", moment(picker.element[0].value).format("MM/DD/YYYY"));
    newConfig.minDate = moment(picker.element[0].value).format("MM/DD/YYYY");
    $(INPUTS["end"]).daterangepicker(newConfig);
    //Rattacher
  });
  $(INPUTS["end"]).on('apply.daterangepicker', function (ev, picker) {
    console.warn("ev", ev);
    console.warn("picker", picker);


    let newConfig = JSON.parse(JSON.stringify(DATERANGEPICKER_CONFIG));
    newConfig.maxDate = moment(picker.element[0].value).format("DD/MM/YYYY");
    $(INPUTS["start"]).daterangepicker(newConfig);
  });
  //*/

  // Les sélecteurs sont vides par défaut, on n'a qu'à les update
  $(INPUTS["category"]).selectpicker();
  $(INPUTS["dependency"]).selectpicker();

  /**
   * Génère l'ID de l'input (normalisation)
   * @param {String} id
   * @returns {String}
   */
  function inputId(id) {
    return "task-" + id + "-input";
  }

  // todo
  /**
   * Initilialise les valeurs des inputs du formulaire en fonction du Point.userOptions passé en argument
   *
   * @param {Object} taskOptions
   *    HighCharts Task userOptions
   */
  function initInputs(taskOptions) {
    if (!taskOptions)
      throw new EXCEPTIONS.InvalidArgumentExcepetion("initInputs");

    for (let input in INPUTS) {
      console.warn("taskOptions['"+input+"']",taskOptions[input]);
      if (!INPUTS[input])
        continue;

      if (typeof taskOptions[input] !== "object"              // null
        && typeof taskOptions[input] !== "undefined"          // undefined
        && (taskOptions[input] || taskOptions[input] === 0))  // Number (0 compte comme false donc on doit l'autoriser manuellement)
      {
        taskOptions[input] = SHARED.decodeHTML(taskOptions[input]);
        if (input === "start" || input === "end") {
          $(INPUTS[input]).data("DateTimePicker").date(moment(Number(taskOptions[input])));
          // INPUTS[input].value = moment(taskOptions[input]).format("DD/MM/YYYY");
          // data('DateTimePicker').date(moment(taskOptions[input]).format("DD/MM/YYYY"));
          // $(INPUTS[input]).data('daterangepicker').setEndDate(moment(taskOptions[input]).format("DD/MM/YYYY")); // todo ? supporter les heures ?
          if (!taskOptions[input])
            INPUTS[input].disabled = true;
        } else if (input === "color")
          $(INPUTS[input]).data('colorpicker').setValue(taskOptions[input]);
        else
          INPUTS[input].value = taskOptions[input];

        INPUTS[input].disabled = (input === "category" && APP_MODULE.getParametresUrlOrisNoFunction().asRaw.parent);
      }
      else if (typeof taskOptions[input] === "object" && input === "completed") {
        INPUTS["completed"].value = (Number(taskOptions["completed"]["amount"]) <= 1) ? Number(taskOptions["completed"]["amount"])*100 : Number(taskOptions["completed"]["amount"]);
        INPUTS[input].disabled = false;
      }
      else {
        INPUTS[input].value = "";
        /**
         * @Github #Issue update de/vers une milestone cause un bug graphique
         * donc on désactive les inputs si les dates sont invalides initialement
         */
        INPUTS[input].disabled = input === "start" || input === "end";
      }
    }
  }

  /**
   * Constructeur d'un <option>
   * @param value
   * @returns {HTMLElement}
   * @constructor
   */
  function SelectOption(value, subtext) {
    let option = document.createElement("option");
    if (subtext)
      option.setAttribute("data-subtext", subtext);
    option.innerText = option.value = value;
    return option;
  }

  /**
   * Remplacer les <option>s d'un <select>
   * @param {HTMLElement} select
   *   sélecteur à vider puis populer en fonction du 2e argument
   *
   * @param {Array} optionValues
   *   chaque valeur de cet Array devient un tag <option> dans le <select>
   */
  function setSelectorOptions(select, optionValues) {
    if (!select || typeof select !== "object") // DOM HTMLElement est un objet
      return;

    // Vider le select
    select.innerText = "";
    // Ajouter l'option "vide"
    select.innerHTML += new SelectOption("").outerHTML;
    // Ajouter les options, s'il y en a
    if (optionValues)
      for (let i=0, l=optionValues.length; i<l; ++i) {
        if (optionValues[i])
          select.innerHTML += new SelectOption(optionValues[i].id, optionValues[i].name).outerHTML;
      }

    // Appliquer les changements à la librairie
    $(select).selectpicker('refresh');
  }

  /**
   * Met à jour la liste des catégories à afficher dans le <select>
   *
   * @param {Array} newYAxisCategories
   *
   */
  function updateYAxisCategories(newYAxisCategories) {
    if (!newYAxisCategories || !Array.isArray(newYAxisCategories))
      return false;

    // todo update only if different
    currentYAxisCategories = newYAxisCategories;
    setSelectorOptions(INPUTS["category"], currentYAxisCategories);
  }

  function updateDataIds(newDataIds) {
    if (!newDataIds || !Array.isArray(newDataIds))
      return false;

    // todo update only if different
    currentDataIds = newDataIds;
    setSelectorOptions(INPUTS["dependency"], newDataIds); //todo ajouter subtext --> NAME equivalent
  }

  /**
   * @Exposed
   * Mettre à jour tout ou une partie des éléments "généraux" du modal
   * Pour le moment, il s'agit du selecteur d'ID et de catégories
   *
   * @param {Object} options
   *   contient les options "utiles" du graphique:
   *    - yAxis.categories  -> les catégories (uniqueNames)
   *    - series.data       -> les données (series[0].userOptions.data)
   */
  function updateChartOptions(options) {
    if (!options)
      throw new EXCEPTIONS.MissingArgumentExcepetion("[updateChartOptions]");

    if (options.yAxis && options.yAxis.categories)
      updateYAxisCategories(options.yAxis.categories);

    if (options.series && options.series.data)
      updateDataIds(options.series.data.map(function(e){
        return {
          id: e.id,
          name: e.name
        }
      }));
  }

  function showTaskEditor(taskOptions) {
    if (!taskOptions)
      throw new EXCEPTIONS.InvalidArgumentExcepetion("showTaskEditor");

    let div = document.createElement('div');
    div.style.maxHeight = "400px";
    div.style.margin = "0";
    div.style.padding = "24px";
    div.style.textAlign = "justify";
    div.appendChild(document.getElementById('secret-santa'));

    // todo datepicker / colorpicker / categories / dependencies

    initInputs(taskOptions);

    //show as confirm
    INSTANCE = alertify.confirm(div/*, function(){
      // todo ???? NE SE LANCE PAS
      alertify.success('Valider'); // todo TryPostData
    }, function(){
      // todo ???? NE SE LANCE PAS
      alertify.error('Aucune modification');
    }//*/).set({
      padding: false,
      title: "Édition de tâche",
      movable: false,
      maximizable: false,
      resizable: true,
      pin: true,  // useless car modal
      reverseButtons: true,
      transition: "zoom",
      onshow: function () {
        $(INPUTS["category"]).selectpicker('refresh');
        $(INPUTS["dependency"]).selectpicker('refresh');
        alertify.message('Editor was shown.');
      },
      onok: function () {
        alertify.notify('TODO: IMPLEMENT + RETURN FALSE', 'error', 3, function(){
          console.log('TODO: IMPLEMENT + RETURN FALSE');
        });
        ONOK_HANDLER();
        return false;  // empêcher le modal de se fermer
      }
    }).resizeTo('40%', 550);


    $(INPUTS["category"]).selectpicker('refresh');
    $(INPUTS["dependency"]).selectpicker('refresh');
  }

  function ONSHOW_HANDLER() {
    // todo set input values + disable en fonction des asRaw + categories
  }

  function ONOK_HANDLER() {
    // todo AppModule.tryPostRequest(datas) // se charge de show/hideLoading + doit appeler explicitement Modal.hide()
    //   return false; // <-- Pour ne pas fermer le modal avant la fin de la requête

    // todo show loading
    APP_MODULE.getLoadingSpinnerHandler().showLoading();
    //  try POST request
    //  onsuccess
    //   hideLoading
    //   hideModal
    //   success notification
    //  onerror
    //   hideLoading
    //   ? hideModal ?
    //   error notification

    // format data
    let formattedData = {},
      asRawParams = APP_MODULE.getParametresUrlOrisNoFunction().asRaw,
      HC_CONFIG_KEYS = APP_MODULE.getParametresUrlOrisNoFunction().CONSTANTS.HC_CONFIG_KEYS;
    for (let input in INPUTS) {
      if (asRawParams[HC_CONFIG_KEYS.data[input].url_param]
        && !INPUTS[input].disabled) { // ne pas MàJ les paramètres disabled (notamment les catégories en mode &uniqueNames, enfin &parent, et ID car ultra important)
        formattedData[asRawParams[HC_CONFIG_KEYS.data[input].url_param]] = (input === "start" || input === "end") ? $(INPUTS[input]).data("DateTimePicker").date()._d.toISOString() : INPUTS[input].value;
      }
    }
    // Forcer l'ajout de l'attribut vline car faire une requête avec &id=vline causait une erreur
    formattedData["vline"] = INPUTS["vline"].value;
    // Formatter, potentiellement, la couleur (la base n'accepte pas de '#')
    if (formattedData["color"] && formattedData["color"][0] === "#")
      formattedData["color"] = INPUTS["color"].value.slice(1); // on enlève le "#" initial car on ne peut pas le push dans la BD

    console.warn("[ONOK_HANDLER] formattedData", formattedData);

    // todo tryPostData
    // Generate & encode URI
    let url = encodeURI(APP_MODULE.getParametresUrlOris().generateWebserviceUpdateUrl(formattedData));

    console.warn("Point update URL", url);

    // GET
    SHARED.promiseGET(url)
      // JSON Parse
      .then(function (response) {
        LoggerModule.warn("Trying to parse:", response);
        try {
          return JSON.parse(response);
        } catch (e) {
          LoggerModule.warn("But got Error", e);
          throw Error("Unable to parse response to JSON. " + e.message);
        }
      })
      // extract root
      // /!\ The rootName doesn't contain the additional "s" (GET => rootName is "<something>s"; POST => rootName is "<something>") /!\
      .then(function (json) {
        let root = json[APP_MODULE.getParametresUrlOrisNoFunction().rootName.slice(0, -1)];  // sans le "s" bonus
        if (!root)
          throw new Error("Unable to extract root (" + APP_MODULE.getParametresUrlOrisNoFunction().rootName.slice(0, -1) + ") from JSON", json);
        return root;
      })
      // The server replies with its stored value for the given vline ID.
      // We have to check if this data is what we pushed (success) or different (failed)
      // AND
      // In this case, the root contains the Object (usually, it's an Array of Objects)
      .then(function (root) {
        // TODO check values
        //    hide modal
        let postedTask = new OrisGanttTask(formattedData, APP_MODULE.getParametresUrlOrisNoFunction()),
          actualTask = new OrisGanttTask(root, APP_MODULE.getParametresUrlOrisNoFunction());

        console.info("postedTask", postedTask);
        console.info("actualTask", actualTask);

        // On ne compare que les valeurs modifiées
        // et on les formatte en userOptions
        for (let attr in formattedData) {
          console.info("(userOptions' value) Is formattedData[" + attr + "]: " + postedTask["userOptions"][attr]
            + ", === to root[" + attr + "]: " + actualTask["userOptions"][attr] + " ?");
          if (actualTask["userOptions"][attr] !== postedTask["userOptions"][attr]) {
            LoggerModule.error("La valeur ('" + attr + "')du formulaire sont différentes de celles récupérées depuis le serveur");
            throw "Mise à jour du Point échouée";
          }
        }
        alertify.success("Mise à jour réussie", 1);
        INSTANCE.close();
      })
      .catch(function (err) {
        LoggerModule.error("Data update error:", err);
        alertify.postErrorAlert(err.description || err.message || err);
      })
      /*
      .then(function (e) {
        alertify.notify("finally ??");
        // Le chargement se cachera lorsque la page principale recevra de nouvelles valeurs du Worker
        // APP_MODULE.getLoadingSpinnerHandler().hideLoading();
        return true; // masquer le modal ?
      }) // */
  }

  function ONCANCEL_HANDLER() {
    // todo rien de particulier ?
  }

  return {
    getInstance: function() { return INSTANCE; },

    setChartOptions: updateChartOptions,

    initAndShow: function (taskOptions) { showTaskEditor(taskOptions); },
    hide: function () { INSTANCE.close(); },
    show: function () { INSTANCE.showModal(); } // n'aura pas le bon style



  }
}