/**
 * Instancie le modal utilisé pour éditer une tâche
 *
 * // todo static vs dynamic
 * L'instanciation est statique. En effet, on ne peut pas "deviner" l'ID de la colonne à éditer.
 * Ces ID des colonnes renseignées dans l'URL sont stockées dans "asRaw"
 * Les paramètres HighCharts paramétrables sont renseignés dans ParametresUrlOris.CONSTANTS.HC_CONFIG_KEYS.data
 *  et c'est ici que l'on fait l'équivalence entre "attribut HC" et "ID de la colonne de la base"
 */
function TASK_EDITOR_MODAL_FACTORY (parametresUrlOrisNoFunctions) {
  /**
   * Form HTML servant de template
   * @type {HTMLElement}
   */
  let FORM_TEMPLATE = document.getElementById("secret-santa"),

    paramUrlOris = parametresUrlOrisNoFunctions,
    asRawParams = paramUrlOris.asRaw,
    HC_CONFIG_KEYS = paramUrlOris.CONSTANTS.HC_CONFIG_KEYS,

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
      vline: document.getElementById(inputId("vline")),
      label: document.getElementById(inputId("name")),  // LABEL et pas NAME /!\
      id: document.getElementById(inputId("id")),
      start: document.getElementById(inputId("start")),
      end: document.getElementById(inputId("end")),
      color: document.getElementById(inputId("color")),
      category: document.getElementById(inputId("category")),
      // Optionnels
      completed: document.getElementById(inputId("completed")),
      parent: document.getElementById(inputId("parent")),
      dependency: document.getElementById(inputId("dependency")),
      // TODO Add custom Labels (responsable, icon, etc...)
    },
    // Référence to the custom formGroups created by the user
    CUSTOM_GROUP_INPUTS = {};

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
    useCurrent: false,
    showTodayButton: true,
    locale: moment.locale() || 'fr',
    // format: 'L' // que la date, pas les heures
  });
  $(INPUTS["end"]).datetimepicker({
    useCurrent: false,
    showTodayButton: true,
    locale: moment.locale() || 'fr',
    // format: 'L LT' Date + Heure:Secondes --> format par défaut
  });
  $(INPUTS["start"]).on("dp.change", function (e) {
    $(INPUTS["end"]).data("DateTimePicker").minDate(e.date);
    // Cas particulier Add Request
    if (e.currentTarget.classList.contains("isAdd")) {
      // Désactiver &end si &start n'a pas de valeur
      INPUTS["end"].disabled = !e.date;
      $(INPUTS["end"]).data("DateTimePicker").clear();
    }
  });

  $(INPUTS["end"]).on("dp.change", function (e) {
    $(INPUTS["start"]).data("DateTimePicker").maxDate(e.date);
  });

  // Les sélecteurs sont vides par défaut, on n'a qu'à les update
  $(INPUTS["category"]).selectpicker();

  /**
   * Génère l'ID de l'input (normalisation)
   * @param {String} id
   * @returns {String}
   */
  function inputId(id) {
    return "task-" + id + "-input";
  }

  /**
   * Initialisation
   */
  initCustomInputs(parametresUrlOrisNoFunctions.asArray);


  /**
   * TODO Issue #19
   * Instancie les inputs personnalisés dans le modal d'édition de Tâche
   *
   * On permet à l'utilisateur de créer des <input type="text"> customisés.
   * Les valeurs apparaîtront dans la bulle de survol (tooltip)
   *    Les ID des colonnes de la base sont précisés dans l'attribut "&inputs-id=" d'où proviennent les valeurs
   *    Les Labels des <input>, ainsi que dans le tooltip, sont précisés dans l'attribut "&inputs-label="
   *
   */
  /*
   * @param {Object} paramAsArray
   *    Objet contenant les valeurs des paramètres GET de l'URL sous forme d'array.
   *    Le tableau est généré en splittant l'attribut à chaque "," (virgule) TODO point-virgule ? La convention est d'utiliser des virgules cependant
   */
  function initCustomInputs(paramAsArray) {
    // Initialiser les paramètres optionnels (&completed et &dependency
    // TODO ainsi que les Input Custom
    let isLeftSideInput = true;
    if (asRawParams[HC_CONFIG_KEYS.data.completed.url_param]) {
      document.getElementById("task-completed-form-group").removeAttribute("hidden");
      isLeftSideInput = !isLeftSideInput;
    }
    if (asRawParams[HC_CONFIG_KEYS.data.dependency.url_param]) {
      // Afficher un "offset-2" si on est à droite (i.e. #task-completed-input est visible)
      if (!isLeftSideInput)
        INPUTS["dependency"].parentNode.classList.add("offset-2");
      // Afficher l'élément
      document.getElementById("task-dependency-form-group").removeAttribute("hidden");
      $(INPUTS["dependency"]).selectpicker();
      isLeftSideInput = !isLeftSideInput;
    }
    /**
     * @GitIssue #24
     * Permettre de changer de parent/sous-groupe
     */
    if (asRawParams[HC_CONFIG_KEYS.data.parent.url_param]) {
      // Afficher un "offset-2" si on est à droite (i.e. #task-completed-input est visible)
      if (!isLeftSideInput)
        INPUTS["parent"].parentNode.classList.add("offset-2");
      // Afficher l'élément
      document.getElementById("task-parent-form-group").removeAttribute("hidden");
      $(INPUTS["parent"]).selectpicker();
      isLeftSideInput = !isLeftSideInput;
    }

    /*
     * Custom Inputs
     */
    let customInputRow = document.getElementById("optional-inputs-row");
      // paramInputsId = paramAsArray["_inputs-id"],
      // paramInputsLabel = paramAsArray["_inputs-label"];

    // On ne peut rien instancier si on n'a pas l'un de ces deux paramètres
    // if (!paramInputsId || !paramInputsLabel)

    // On ne peut rien instancier si on n'a pas de clef/ID de colonne
    if (!Object.keys(HC_CONFIG_KEYS.dataLabel))
      return false;


    // Les id-labels customs sont formattés lors de l'instanciation lors de l'instanciation de ParametresUrlOris
    for (let customInputKey in HC_CONFIG_KEYS.dataLabel) {
      let formGroup = null;
      try {
        formGroup = new FormGroupInput({
          id: customInputKey,
          label: HC_CONFIG_KEYS.dataLabel[customInputKey] // || ""
        });
      } catch(e) {
        // do nothing
      }
      if (formGroup) {
        console.info(formGroup);
        if (!isLeftSideInput) {
          formGroup.classList.add("offset-2");
        }
        isLeftSideInput = !isLeftSideInput;
        customInputRow.appendChild(formGroup);
        // CUSTOM_GROUP_INPUTS[customInputKey] = formGroup;
        CUSTOM_GROUP_INPUTS[customInputKey] = formGroup;
      }
    }

    /* Version sans paramUrlOris
    let i=0,
      l = paramInputsId.length;
    for (i; i<l; ++i) {
      // N'instancier un <input> SSI on a un ID; tant pis s'il n'y a pas de label
      if (paramInputsId[i] && !CUSTOM_GROUP_INPUTS[paramInputsId[i]]) {
        let formGroup;
        try {
          formGroup = new FormGroupInput({
            id: paramInputsId[i],
            label: paramInputsLabel[i] || ""
          });
        } catch(e) {
          // do nothing
        }
        if (formGroup) {
          console.info(formGroup);
          if (!isLeftSideInput) {
            formGroup.classList.add("offset-2");
          }
          isLeftSideInput = !isLeftSideInput;
          customInputRow.appendChild(formGroup);
          CUSTOM_GROUP_INPUTS[paramInputsId[i]] = formGroup;
        }
      }
    } // */
  }

  /**
   * Instancie un <input type="text">
   *
   * @param {Object} config
   *    Doit contenir l'attribut
   *    - id (ID de la colonne de la base. Utilisé pour récupérer la valeur et userOptions dans HighCharts)
   *    - label (Label de l'<input> et précédant la valeur de l'attribut dans la bulle)
   *
   * @return {HTMLElement}
   *    <input type="text">
   * @constructor
   */
  function FormGroupInput(config) {
    // Ne devrait pas arriver vu qu'on check avant d'appeler cette fonction
    if (!config || !config.id) // || !config.label)
      throw new EXCEPTIONS.MissingArgumentExcepetion("FormGroupInput constructor");

    let formGroup = document.createElement("div"),
      formGroupId = "task-" + config.id + "-custom-form-group",
      label = document.createElement("label"),
      input = document.createElement("input"),
      _inputId = inputId(config.id + "-custom"); // "task-" + config.id + "-custom-input";

    formGroup.classList.add("form-group", "col-5");
    formGroup.id = formGroupId;

    label.setAttribute("for", _inputId);
    label.innerHTML = config.label || "&nbsp;"; // Il faut un truc sinon le label n'a pas de hauteur

    input.id = _inputId;
    input.classList.add("form-control");
    input.setAttribute("type", "text");
    input.setAttribute("placeholder", config.label);
    input.setAttribute("data-id", config.id);
    input.setAttribute("onclick", "this.setSelectionRange(0, this.value.length); ");

    // Assembler
    formGroup.appendChild(label);
    formGroup.appendChild(input);

    return formGroup;
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

    // Les inputs obligatoires
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

          // Le serveur ne stocke pas les millisecondes
          let now = moment(Number(taskOptions[input]));
          // now._d.setSeconds(0);
          now._d.setMilliseconds(0);

          $(INPUTS[input]).data("DateTimePicker").date( now );
          if (!taskOptions[input])
            INPUTS[input].disabled = true;
        } else if (input === "color")
          $(INPUTS[input]).data('colorpicker').setValue(taskOptions[input]);
        else
          INPUTS[input].value = taskOptions[input];

        // Maintenant qu'on a un bouton hard reset (#25)
        // on autorise la MàJ de &category lorsque &parent est activé si un groupe Y est masque (collapsed)
        // (risque élevé de casser le visuel)
        INPUTS[input].disabled = false; // = (input === "category" && APP_MODULE.getParametresUrlOrisNoFunction().asRaw.parent);
      }
      else if (typeof taskOptions[input] === "object" && input === "completed" && taskOptions["completed"]) {
        if (taskOptions["completed"]["amount"] === "")
          INPUTS[input].value = "";
        else
          INPUTS["completed"].value = (Number(taskOptions["completed"]["amount"]) <= 1) ? (Math.round(Number(taskOptions["completed"]["amount"])*100)*10/10)
            : (Math.round(Number(taskOptions["completed"]["amount"])*10)/10);
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
        INPUTS[input].disabled = !isAddEditor && (input === "start"
          || input === "end"
          || !APP_MODULE.getParametresUrlOrisNoFunction().asRaw[APP_MODULE.getParametresUrlOrisNoFunction().CONSTANTS.HC_CONFIG_KEYS.data[input].url_param]);
        // Pour le comportement dynamique (désactiver &end si &start n'a pas de valeur) du cas particulier Add Request
        if (isAddEditor) {
          INPUTS["start"].classList.add("isAdd");
          INPUTS["end"].disabled = true;
        } else
          INPUTS["start"].classList.remove("isAdd");

        /**
         * @Github #9
         * On n'autorise la suppression d'une date que lorsque l'on est en mode création car ça ne posera jamais de problème
         */
        if (isAddEditor && (input === "start" || input === "end"))
          $(INPUTS[input]).data("DateTimePicker").showClear(true);
      }
    }
    
    // Les inputs customisés
    let needsNewOffset = false;
    for (let customInputKey in CUSTOM_GROUP_INPUTS) {
      // La clé n'existe pas
      if (!taskOptions[customInputKey]
        && taskOptions[customInputKey] !== "") {
        // Ça va spam cette erreur mais ça me semble important car l'utilisateur essaie d'afficher une colonne de la BD qui n'existe pas
        let errStr = "The column '" + customInputKey + "' doesn't exist in the DataBase and was deleted from the Editor.";
        LoggerModule.error(errStr);
        TOAST.error({ header: errStr, body: "Correct the page URL to fix the interface (if needed).", delay: 5000 });
        /*
        // On désactive l'input (façon sale, on sait qu'on n'init que des inputs texte mais on ref le form-group)
        CUSTOM_GROUP_INPUTS[customInputKey].children[1].disabled = true;
        // Vider la valeur sinon on verrait la valeur du précédent Point sélectionné
        CUSTOM_GROUP_INPUTS[customInputKey].children[1].value = "";
        // Je doit me démerder pour masquer les .form-group sans ruiner les "offset-2" *
        // SACHANT QU'il est possible d'avoir plusieurs inputs customs à la suite qui sont masqués
        // (mais là c'est l'utilsateur qui est c*n...)
        // OU
        // je retire l'input faux du DOM
        CUSTOM_GROUP_INPUTS[customInputKey].classList.add("hidden"); // */
        // Suppression
        CUSTOM_GROUP_INPUTS[customInputKey].remove();
        delete CUSTOM_GROUP_INPUTS[customInputKey];
      } else {
        CUSTOM_GROUP_INPUTS[customInputKey].children[1].disabled = false;
        CUSTOM_GROUP_INPUTS[customInputKey].children[1].value = taskOptions[customInputKey];
        CUSTOM_GROUP_INPUTS[customInputKey].classList.remove("hidden");
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

  function updateParentIds(newDataIds) {
    if (!newDataIds || !Array.isArray(newDataIds))
      return false;

    // todo update only if different
    currentDataIds = newDataIds;
    setSelectorOptions(INPUTS["parent"], newDataIds); //todo ajouter subtext --> NAME equivalent
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

    LoggerModule.info("[updateChartOptions] options", options);

    if (options.yAxis && options.yAxis.categories) {
      updateYAxisCategories(options.yAxis.categories);
    }

    if (options.series && options.series.data) {
      let dependencyNameById = {};
      for (let i=0, l=options.series.data.length; i<l; ++i) {
        dependencyNameById[options.series.data[i]["id"]] = SHARED.decodeHTML(options.series.data[i]["label"]);
      }

      // MàJ les ID pour dépendances
      updateDependencyIds(options.series.data.map(function(e){
        return {
          id: e.id,
          name: dependencyNameById[e.id]
        }
      }));

      // MàJ les parents
      updateParentIds(options.series.data.map(function(e){
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
    currentTaskOptions = taskOptions;


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

  function ONOK_HANDLER(isAddRequest) {
    isAddRequest = isAddRequest || false;
    // todo AppModule.tryPostRequest(datas) // se charge de show/hideLoading + doit appeler explicitement Modal.hide()
    //   return false; // <-- Pour ne pas fermer le modal avant la fin de la requête
    let formattedData = {};

    for (let input in INPUTS) {
      let current = asRawParams[HC_CONFIG_KEYS.data[input].url_param];
      if (current
        && !INPUTS[input].disabled) { // ne pas MàJ les paramètres disabled (notamment les catégories en mode &uniqueNames, enfin &parent, et ID car ultra important)
        if ((input === "start" || input === "end") && INPUTS[input].value) {
          let dateSansMillisecondes = $(INPUTS[input]).data("DateTimePicker").date()._d;
          dateSansMillisecondes.setMilliseconds(0);
          formattedData[current] = dateSansMillisecondes.toISOString();
        } else
          formattedData[current] = INPUTS[input].value;

        // Formatter, potentiellement, la couleur (la base n'accepte pas de '#')
        if (input === "color" && INPUTS[input].value && INPUTS[input].value[0] && INPUTS[input].value[0] === "#")
          formattedData[current] = INPUTS[input].value.slice(1);

        /**
         * @Issue #29
         *  Push des valeurs vides via la valeur réservée "(v)"
         */
        // MAIS SEULEMENT SI ELLES N'ÉTAIENT PAS DÉJÀ VIDES
        if (formattedData[current] === "" && currentTaskOptions[HC_CONFIG_KEYS.flippedData[input]])
          formattedData[current] = "(v)";
      }
    }
    /**
     * @Issue #19
     * Ajouter les paramètres customisés à la requête
     */
    for (let customInput in CUSTOM_GROUP_INPUTS) {
      let current = CUSTOM_GROUP_INPUTS[customInput].children[1].value;
      console.info("current", current);

      formattedData[customInput] = current || "";

      /**
       * @Issue #29
       *  Push des valeurs vides via la valeur réservée "(v)"
       */
      // MAIS SEULEMENT SI ELLES N'ÉTAIENT PAS DÉJÀ VIDES
      if (formattedData[customInput] === "" && currentTaskOptions[customInput])
        formattedData[current] = "(v)";
    }


    // Forcer l'ajout de l'attribut vline car faire une requête avec &id=vline causait une erreur
    if (!isAddRequest)
      formattedData["vline"] = INPUTS["vline"].value;


    console.warn("[ONOK_HANDLER] formattedData", formattedData);

    // Pour isAdd on osef des ID car on peut pas le deviner à l'avance
    // En dûr TODO et useless ?
    if (isAddRequest)
      delete formattedData["id"];

    APP_MODULE.getParametresUrlOris().tryAddOrEditPoint(formattedData, isAddRequest)
      .then(function (success) {
        if (success)
          INSTANCE.close();
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