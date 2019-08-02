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
      label: document.getElementById(inputId("name")),  // LABEL et pas NAME
      id: document.getElementById(inputId("id")),
      start: document.getElementById(inputId("start")),
      end: document.getElementById(inputId("end")),
      completed: document.getElementById(inputId("completed")),
      color: document.getElementById(inputId("color")),
      category: document.getElementById(inputId("category")),
      dependency: document.getElementById(inputId("dependency")),
      vline: document.getElementById(inputId("vline"))

      // TODO Add custom Labels (responsable, icon, etc...)
    };

  /**
   * Initialiser les éléments de l'UI
   * Appelé qu'une seule fois
   */
  // Color picker, pas de config particulière (permet le RGBA)
  $(INPUTS["color"]).colorpicker({
    format: 'hex',
    useAlpha: true
  });
  // Les Date pickers
  $(INPUTS["start"]).datetimepicker({
    locale: moment.locale() || 'fr',
    format: 'L' // que la date, pas les heures
  });
  $(INPUTS["end"]).datetimepicker({
    locale: moment.locale() || 'fr'
  });
  $(INPUTS["start"]).on("dp.change", function (e) {
    $(INPUTS["end"]).data("DateTimePicker").minDate(e.date);
  });
  $(INPUTS["end"]).on("dp.change", function (e) {
    $(INPUTS["start"]).data("DateTimePicker").maxDate(e.date);
  });

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
   * @param {Boolean} isAddEditor
   *    Special behaviour for when this modal is used to create a new Point
   *      -> empty inputs (all) won't be disabled etc...
   */
  function initInputs(taskOptions, isAddEditor) {
    if (!taskOptions)
      throw new EXCEPTIONS.InvalidArgumentExcepetion("initInputs");

    // Comportement spécial si on est mode "Création de Point"
    isAddEditor = isAddEditor || false;

    console.info("[initInputs] taskOptions", taskOptions);

    for (let input in INPUTS) {
      if (!INPUTS[input])
        continue;

      if (typeof taskOptions[input] !== "object"              // null
        && typeof taskOptions[input] !== "undefined"          // undefined
        && (taskOptions[input] || taskOptions[input] === 0))  // Number (0 compte comme false donc on doit l'autoriser manuellement)
      {
        taskOptions[input] = SHARED.decodeHTML(taskOptions[input]);
        if (input === "start" || input === "end") {
          $(INPUTS[input]).data("DateTimePicker").maxDate(false);
          $(INPUTS[input]).data("DateTimePicker").minDate(false);
          $(INPUTS[input]).data("DateTimePicker").date(moment(Number(taskOptions[input])));
          if (!taskOptions[input])
            INPUTS[input].disabled = true;
        } else if (input === "color")
          $(INPUTS[input]).data('colorpicker').setValue(taskOptions[input]);
        else
          INPUTS[input].value = taskOptions[input];

        INPUTS[input].disabled = (input === "category" && APP_MODULE.getParametresUrlOrisNoFunction().asRaw.parent);
      }
      else if (typeof taskOptions[input] === "object" && input === "completed" && taskOptions["completed"]) {
        INPUTS["completed"].value = (Number(taskOptions["completed"]["amount"]) <= 1) ? Number(taskOptions["completed"]["amount"])*100 : Number(taskOptions["completed"]["amount"]);
        INPUTS[input].disabled = false;
      }
      else {  // Pas de valeur
        LoggerModule.warn("Pas de valeur pour INPUTS["+input+"]");
        INPUTS[input].value = "";
        /**
         * @Github #9 Issue update de/vers une milestone cause un bug graphique
         * donc on désactive les inputs si les dates sont invalides initialement
         * OU
         * si on n'a pas l'ID de la colonne (!asRaw[input])
         */
        INPUTS[input].disabled = !isAddEditor && (input === "start" || input === "end" || !APP_MODULE.getParametresUrlOrisNoFunction().asRaw[APP_MODULE.getParametresUrlOrisNoFunction().CONSTANTS.HC_CONFIG_KEYS.data[input].url_param]);

        /**
         * @Github #9
         * On n'autorise la suppression d'une date que lorsque l'on est en mode création car ça ne posera jamais de problème
         */
        if (isAddEditor && (input === "start" || input === "end"))
          $(INPUTS[input]).data("DateTimePicker").showClear(true);
      }
    }
  }

  /**
   * Constructeur d'un <option>
   * @param {String} value
   *    Label and value of the select option
   * @param {String} subtext
   *    A sub text that can be used to describe an option (<small> text next to the <option>'s label
   *
   * @returns {HTMLElement}
   *    an <option> DOM Element with given value and potentially a subtext (used by Bootstrap-select library)
   *
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

    LoggerModule.info("optionValues", optionValues);

    // Vider le select
    select.innerText = "";
    // Ajouter l'option "vide"
    select.innerHTML += new SelectOption("").outerHTML;
    // Ajouter les options, s'il y en a
    if (optionValues)
      for (let i=0, l=optionValues.length; i<l; ++i) {
        if (optionValues[i])
          select.innerHTML += new SelectOption(optionValues[i].id || optionValues[i], optionValues[i].name).outerHTML;
      }

    // Appliquer les changements à la librairie
    $(select).selectpicker('refresh');
  }

  /**
   * Met à jour la liste des catégories à afficher dans le <select>
   *
   * @param {Array} newYAxisCategories
   */
  function updateYAxisCategories(newYAxisCategories) {
    if (!newYAxisCategories || !Array.isArray(newYAxisCategories))
      return false;

    // todo update only if different
    currentYAxisCategories = newYAxisCategories;
    setSelectorOptions(INPUTS["category"], currentYAxisCategories);
  }

  /**
   * Met à jour le sélecteur de dépendances avec les IDs (et les labels des Points référencés par l'ID)
   *
   * @param {Array} newDataIds
   *    Array of data userOptions
   */
  function updateDependencyIds(newDataIds) {
    if (!newDataIds || !Array.isArray(newDataIds))
      return false;

    // todo update only if different
    currentDataIds = newDataIds;
    setSelectorOptions(INPUTS["dependency"], newDataIds); //todo ajouter subtext --> NAME equivalent
  }

  /**
   * Mettre à jour tout ou une partie des éléments "généraux" du modal
   * Pour le moment, il s'agit du selecteur d'ID et de catégories
   *
   * @param {Object} options
   *   contient les options "utiles" du graphique:
   *    - yAxis.categories  -> les catégories (uniqueNames)
   *    - series.data       -> les données (series[0].userOptions.data)
   *
   * @exposed
   */
  function updateChartOptions(options) {
    if (!options)
      throw new EXCEPTIONS.MissingArgumentExcepetion("[updateChartOptions]");

    LoggerModule.warn(options);

    if (options.yAxis && options.yAxis.categories)
      updateYAxisCategories(options.yAxis.categories);

    if (options.series && options.series.data) {
      let dependencyNameById = {};
      for (let i=0, l=options.series.data.length; i<l; ++i) {
        dependencyNameById[options.series.data[i]["id"]] = SHARED.decodeHTML(options.series.data[i]["label"]);
      }

      updateDependencyIds(options.series.data.map(function(e){
        return {
          id: e.id,
          name: dependencyNameById[e.id]
        }
      }));
    }
  }

  /**
   *
   * @param taskOptions
   *
   * @param isAddEditor
   * @exposed
   */
  function showTaskEditor(taskOptions, isAddEditor) {
    if (!taskOptions)
      throw new EXCEPTIONS.InvalidArgumentExcepetion("showTaskEditor");

    isAddEditor = isAddEditor || false;
    if (isAddEditor)
      console.error("Add Editor");

    let div = document.createElement('div');
    div.style.maxHeight = "400px";
    div.style.margin = "0";
    div.style.padding = "24px";
    div.style.textAlign = "justify";
    div.appendChild(document.getElementById('secret-santa'));

    // todo datepicker / colorpicker / categories / dependencies

    initInputs(taskOptions, isAddEditor);

    //show as confirm
    INSTANCE = alertify.confirm(div).set({
      padding: false,
      title: isAddEditor ? "Create task" : "Task editor",
      // movable: false,
      maximizable: false,
      resizable: true,
      pin: true,  // useless car modal
      reverseButtons: true,
      transition: "zoom",
      onshow: function () {
        $(INPUTS["category"]).selectpicker('refresh');  // todo allow Category Creation
        $(INPUTS["dependency"]).selectpicker('refresh');
        alertify.message('Editor was shown.');
      },
      onok: function () {
        ONOK_HANDLER(isAddEditor);
        return false;  // empêcher le modal de se fermer  todo ne plus bloquer #26
      }
    }).resizeTo('40%', 550);


    $(INPUTS["category"]).selectpicker('refresh');
    $(INPUTS["dependency"]).selectpicker('refresh');
  }

  function ONSHOW_HANDLER() {
    // todo set input values + disable en fonction des asRaw + categories
  }

  function ONOK_HANDLER(isAddEditor) {
    isAddEditor = isAddEditor || false;
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
      if (asRawParams[HC_CONFIG_KEYS.data[input].url_param] // TODO &label n'est pas &name !!! (label --> "owner" mais quand &parent, il faut que &name au lieu de &label...)
        && !INPUTS[input].disabled) { // ne pas MàJ les paramètres disabled (notamment les catégories en mode &uniqueNames, enfin &parent, et ID car ultra important)
        formattedData[asRawParams[HC_CONFIG_KEYS.data[input].url_param]] = (input === "start" || input === "end") ? $(INPUTS[input]).data("DateTimePicker").date()._d.toISOString() : INPUTS[input].value;
      }
    }
    // Forcer l'ajout de l'attribut vline car faire une requête avec &id=vline causait une erreur
    if (!isAddEditor)
      formattedData["vline"] = INPUTS["vline"].value;

    // Formatter, potentiellement, la couleur (la base n'accepte pas de '#')
    if (formattedData["color"] && formattedData["color"][0] === "#")
      formattedData["color"] = INPUTS["color"].value.slice(1); // on enlève le "#" initial car on ne peut pas le push dans la BD

    if (formattedData)
      LoggerModule.warn("[ONOK_HANDLER] formattedData", formattedData);

    // Pour isAdd on osef des ID car on peut pas le deviner à l'avance
    // En dûr TODO et useless ?
    if (isAddEditor)
      delete formattedData["id"]

    // Generate & encode URI
    let url = isAddEditor ? APP_MODULE.getParametresUrlOris().generateWebserviceAddUrl(formattedData) : APP_MODULE.getParametresUrlOris().generateWebserviceUpdateUrl(formattedData);

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
          actualTask = new OrisGanttTask(root, APP_MODULE.getParametresUrlOrisNoFunction()),
          flippedDataKeys = APP_MODULE.getParametresUrlOrisNoFunction().CONSTANTS.HC_CONFIG_KEYS.flippedData;

        LoggerModule.log("formattedData", formattedData);
        LoggerModule.log("postedTask", postedTask);
        LoggerModule.log("actualTask", actualTask);

        // On ne compare que les valeurs modifiées
        // et on les formatte en userOptions
        for (let attr in formattedData) {
          if (!flippedDataKeys[attr])
            continue;

          let currentPosted = postedTask["userOptions"][flippedDataKeys[attr]],
            currentActual = actualTask["userOptions"][flippedDataKeys[attr]];

          LoggerModule.log("- (userOptions' value) Is formattedData[" + flippedDataKeys[attr] + "]: " + (typeof currentPosted === "object" ? JSON.stringify(currentPosted) : currentPosted)
            + ", === to root[" + flippedDataKeys[attr] + "]: " +  (typeof currentPosted === "object" ? JSON.stringify(currentActual) : currentActual) + " ?");
          // if (actualTask["userOptions"][attr] !== postedTask["userOptions"][attr])
          if (typeof currentPosted === "object") {
            if (JSON.stringify(currentPosted) !== JSON.stringify(currentActual))
              throw "Mise à jour du Point échouée.<br/>La valeur ('" + flippedDataKeys[attr] + "') du formulaire sont différentes de celles récupérées depuis le serveur.";
          } else if (SHARED.decodeHTML(currentPosted) !== SHARED.decodeHTML(currentActual))
            throw "Mise à jour du Point échouée.<br/>La valeur ('" + flippedDataKeys[attr] + "') du formulaire sont différentes de celles récupérées depuis le serveur.";
        }
        alertify.success("Mise à jour réussie", 1);
        INSTANCE.close();
      })
      .catch(function (err) {
        LoggerModule.error("Data update error:", err);
        alertify.postErrorAlert(err.description || err.message || err);
        return false; // ne pas fermer le modal
      });
  }

  function ONCANCEL_HANDLER() {
    // todo rien de particulier ?
  }

  return {
    getInstance: function() { return INSTANCE; },

    setChartOptions: updateChartOptions,

    initAndShow: function (taskOptions, isAdd) { showTaskEditor(taskOptions, isAdd); },
    hide: function () { INSTANCE.close(); },
    show: function () { INSTANCE.showModal(); } // n'aura pas le bon style



  }
}