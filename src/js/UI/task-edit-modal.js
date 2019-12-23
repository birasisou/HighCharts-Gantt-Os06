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
   * Références DOM
   */
  let DOM_REFERENCES = {
      modal: document.getElementById("task-edit-modal"),
      title: document.getElementById("task-edit-modal-label"),
      buttons: {
        delete: document.getElementById("edit-delete-point-button"),
        cancel: document.getElementById("edit-cancel-point-button"),
        ok: document.getElementById("edit-add-point-button")
      },
      prompt: document.getElementById("prompt-modal")
    },

    paramUrlOris = parametresUrlOrisNoFunctions,
    asRawParams = paramUrlOris.asRaw,
    HC_CONFIG_KEYS = paramUrlOris.CONSTANTS.HC_CONFIG_KEYS,

    // userOptions de la Tâche actuellement modifiée (ou dernièrement modifiée)
    currentTaskOptions = null,
    isAddEditor = false,
    /**
     * @Issue #53
     */
    isStartIdSameAsEndId = asRawParams["start"] === asRawParams["end"],
    currentYAxisCategories = [],
    currentDataIds = [],

    /**
     * Référence à l'objet AlertifyJS
     */
    INSTANCE = $(DOM_REFERENCES.modal),
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
      iconLeft: document.getElementById(inputId("icon-left")),
      iconRight: document.getElementById(inputId("icon-right")),
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
  /**
   * @Issue #53 Ne pas instancier / afficher l'END input si l'ID `&start` === `&end`
   */
  if (!isStartIdSameAsEndId) {
    $(INPUTS["end"]).datetimepicker({
      useCurrent: false,
      showTodayButton: true,
      locale: moment.locale() || 'fr',
      widgetPositioning: {
        vertical: "auto",
        horizontal: "right"
      }
      // format: 'L LT' Date + Heure:Secondes --> format par défaut
    });

    $(INPUTS["end"]).on("dp.change", function (e) {
      // Enlever le style "valeur calculée"
      if (INSTANCE.hasClass("show"))
        INPUTS["end"].classList.remove("border-warning");

      $(INPUTS["start"]).data("DateTimePicker").maxDate(e.date);
    });
    $(INPUTS["end"]).on("dp.show", function () {
      $(INPUTS["end"]).data("DateTimePicker").minDate($(INPUTS["start"]).data("DateTimePicker").date());
    });
  } else
    INPUTS["end"].hidden = true;

  $(INPUTS["start"]).on("dp.change", function (e) {
    // Enlever le style "valeur calculée" si visible && date modifiée (pour de vrai ==> plus d'une minute d'écart)
    if (INSTANCE.hasClass("show")
      && e.oldDate && e.oldDate._d && e.date && e.date._d
        // on considère que la Date est différente s'il y a plus d'une minute d'écart
        && (Math.abs(e.oldDate._d - e.date._d) > (60 * 1000))
    )
      INPUTS["start"].classList.remove("border-warning");

    if (!isStartIdSameAsEndId)
      $(INPUTS["end"]).data("DateTimePicker").minDate(e.date);
    // Cas particulier Add Request
    if (isAddEditor && !isStartIdSameAsEndId) {
      // Désactiver &end si &start n'a pas de valeur
      INPUTS["end"].disabled = !e.date;
      $(INPUTS["end"]).data("DateTimePicker").clear();
    }
  });
  $(INPUTS["start"]).on("dp.show", function () {
    // cas milestone
    $(INPUTS["start"]).data("DateTimePicker").maxDate( !isStartIdSameAsEndId && INPUTS["end"].value ? $(INPUTS["end"]).data("DateTimePicker").date() : false);
  });


  // Les sélecteurs sont vides par défaut, on n'a qu'à les update
  initSelectPicker(INPUTS["category"]);

  // Les inputs customisés
  initCustomInputs(paramUrlOris.asArray);
  // Obliger de refresh ici sinon les largeurs sont mal calculées
  $(DOM_REFERENCES.modal).on("shown.bs.modal", function (event) {
    $(INPUTS["category"]).selectpicker('refresh');

    $(INPUTS["dependency"]).selectpicker('refresh');
    $(INPUTS["parent"]).selectpicker('refresh');
  });
  DOM_REFERENCES.modal.querySelector("form").addEventListener("submit", function (event) {
    event.preventDefault();
    onOkHandler(isAddEditor)
  });
  DOM_REFERENCES.prompt.querySelector("form").addEventListener("submit", function (event) {
    event.preventDefault();
    appendNewOption(document.getElementById("new-category-prompt-modal-input").value);
  });
  DOM_REFERENCES.buttons.ok.addEventListener("click", function (event) {
    onOkHandler(isAddEditor)
  });


  /**
   * Génère l'ID de l'input (normalisation)
   * @param {String} id
   * @returns {String}
   */
  function inputId(id) {
    return "task-" + id + "-input";
  }

  function initSelectPicker(domInput) {
    $(domInput).selectpicker({
      showSubtext: true,
      iconBase: "fa",
      tickIcon: "fa fa-check"
    });
  }

  /**
   * @Issue #19
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
    /*console.warn("HC_CONFIG_KEYS.dataLabel", HC_CONFIG_KEYS.dataLabel)
    if (asRawParams[HC_CONFIG_KEYS.dataLabel.iconLeft.url_param]) {
      document.getElementById("task-icon-left-form-group").removeAttribute("hidden");
      isLeftSideInput = !isLeftSideInput;
    }
    if (asRawParams[HC_CONFIG_KEYS.dataLabel.iconRight.url_param]) {
      document.getElementById("task-icon-right-form-group").removeAttribute("hidden");
      isLeftSideInput = !isLeftSideInput;
    } //*/
    if (asRawParams[HC_CONFIG_KEYS.data.dependency.url_param]) {
      // Afficher un "offset-2" si on est à droite (i.e. #task-completed-input est visible)
      if (!isLeftSideInput)
        INPUTS["dependency"].parentNode.classList.add("offset-2");
      // Afficher l'élément
      document.getElementById("task-dependency-form-group").removeAttribute("hidden");
      /* $(INPUTS["dependency"]).selectpicker({
        showSubtext: true,
        iconBase: "fa",
        tickIcon: "fa fa-check"
      }); // */
      initSelectPicker(INPUTS["dependency"]);
      isLeftSideInput = !isLeftSideInput;
    }
    /**
     * @GitIssue #24
     * Permettre de changer de parent/sous-groupe
     *
     * todo créer une nouvelle catégorie dynamiquement
     *  + ne pas devenir sont propre parent (se retirer de la liste)
     */
    if (asRawParams[HC_CONFIG_KEYS.data.parent.url_param]) {
      // Afficher un "offset-2" si on est à droite (i.e. #task-completed-input est visible)
      if (!isLeftSideInput)
        INPUTS["parent"].parentNode.classList.add("offset-2");
      // Afficher l'élément
      document.getElementById("task-parent-form-group").removeAttribute("hidden");
      /* $(INPUTS["parent"]).selectpicker({
        showSubtext: true,
        iconBase: "fa",
        tickIcon: "fa fa-check"
      }); // */
      initSelectPicker(INPUTS["parent"]);
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
    LoggerModule.warn("HC_CONFIG_KEYS.dataLabel", HC_CONFIG_KEYS.dataLabel);
    for (let customInputKey in HC_CONFIG_KEYS.dataLabel) {
      // console.log("is " + customInputKey + " a custom label ?", paramAsArray[])
      let formGroup = null;
      try {
        formGroup = new FormGroupInput({
          id: customInputKey,
          label: HC_CONFIG_KEYS.dataLabel[customInputKey].label, // || ""
          readonly: HC_CONFIG_KEYS.dataLabel[customInputKey].readonly
        });
      } catch(e) {
        // do nothing
      }
      if (formGroup) {
        if (!isLeftSideInput) {
          formGroup.classList.add("offset-2");
        }
        isLeftSideInput = !isLeftSideInput;
        customInputRow.appendChild(formGroup);
        // CUSTOM_GROUP_INPUTS[customInputKey] = formGroup;
        CUSTOM_GROUP_INPUTS[customInputKey] = formGroup;
      }
    }
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
      throw new EXCEPTIONS.MissingArgumentException("FormGroupInput constructor");

    let formGroup = document.createElement("div"),
      formGroupId = "task-" + config.id + "-custom-form-group",
      label = document.createElement("label"),
      input = document.createElement("input"),
      _inputId = inputId(config.id + "-custom"); // "task-" + config.id + "-custom-input";

    formGroup.classList.add("form-group", "col-5");
    formGroup.id = formGroupId;

    config.label = decodeURIComponent(config.label);

    label.setAttribute("for", _inputId);
    // Décoder car les paramètres passant par l'URL sont donc encodés
    label.innerHTML = config.label || "&nbsp;"; // Il faut un truc sinon le label n'a pas de hauteur

    input.id = _inputId;
    input.classList.add("form-control");
    input.setAttribute("type", "text");
    input.setAttribute("placeholder", config.label);
    input.setAttribute("data-id", config.id);
    input.setAttribute("onclick", "this.setSelectionRange(0, this.value.length); ");
    if (config.readonly)
      input.setAttribute("readonly", true);

    // Assembler
    formGroup.appendChild(label);
    formGroup.appendChild(input);

    return formGroup;
  }

  /**
   * Initilialise les valeurs des inputs du formulaire en fonction du Point.userOptions passé en argument
   *
   * @param {Object} taskOptions
   *    HighCharts Task userOptions
   * @param {Boolean} isAdd
   *    Special behaviour for when this modal is used to create a new Point
   *      -> empty inputs (all) won't be disabled etc...
   */
  function initInputs(taskOptions, isAdd) {
    if (!taskOptions)
      throw new EXCEPTIONS.InvalidArgumentException("initInputs");

    // Comportement spécial si on est mode "Création de Point"
    isAddEditor = isAdd || false;

    LoggerModule.info("[initInputs] taskOptions", taskOptions);
    let validationWarning = "border-warning";
    INPUTS["start"].classList.remove(validationWarning);
    INPUTS["end"].classList.remove(validationWarning);

    // Les inputs obligatoires
    for (let input in INPUTS) {
      if (!INPUTS[input] || (input === "end" && isStartIdSameAsEndId) )
        continue;

      if (typeof taskOptions[input] !== "object"              // null
        && typeof taskOptions[input] !== "undefined"          // undefined
        && (taskOptions[input] || taskOptions[input] === 0))  // Number (0 compte comme false donc on doit l'autoriser manuellement)
      {
        // CAS INPUTS dates
        if (input === "start" || input === "end") {
          // if (input === "end" && asRawParams["end"] === )

          LoggerModule.info(input, taskOptions[input]);
          LoggerModule.info("raw-" + input, taskOptions["raw-" + input]);
          // todo si "raw-"+input n'a pas de valeur (alors que input oui) c'est que les dates sont auto calculées
          //  --> on ne veut pas push de nouvelles dates
          if (taskOptions[input] && !taskOptions["raw-" + input])
            INPUTS[input].classList.add(validationWarning);
          else
            INPUTS[input].classList.remove(validationWarning);


          $(INPUTS[input]).data("DateTimePicker").maxDate(false);
          $(INPUTS[input]).data("DateTimePicker").minDate(false);

          // Le serveur ne stocke pas les millisecondes
          let now = moment(Number(taskOptions[input]));
          now._d.setMilliseconds(0);

          $(INPUTS[input]).data("DateTimePicker").date( now );
          if (!taskOptions[input])
            INPUTS[input].disabled = true;

          // Conserver le format de la DB (Long/Court)
          let isShortFrenchDate = (taskOptions["raw-" + input] && taskOptions["raw-" + input].indexOf("Z") < 0 );  // format long --> Zulu Time
          LoggerModule.log(taskOptions[input] + " " + (isShortFrenchDate ? "is" : "is not") + " short Date format (DD/MM/YYYY).");

          $(INPUTS[input]).data("DateTimePicker").options({
            // On souhaite afficher la valeur UTC, car sinon, surtout au formats courts,
            // "00h00" et "23h59" a de forte chance d'afficher la mauvaise journée
            timeZone: 'UTC',
            format: isShortFrenchDate ? 'L' : 'L LT' // format court === 'L' --> que les jours, sans les heures
          });

        }
        // CAS INPUTS color
        else if (input === "color")
          $(INPUTS[input]).data('colorpicker').setValue(taskOptions[input]);
        // CAS default
        else {
          // Ne pas sélectionner une valeur "inexistante" car ceci fait bugger Select-Picker
          if (INPUTS[input].nodeName === "SELECT"
            // chercher les valeurs encodées (sinon les guillemets simples font bugger)
            && !INPUTS[input].querySelector("[data-encoded-value='"
              // encoder et remplacer les guillemets simples manuellement
              + encodeURIComponent(taskOptions[input])
                .replace(/'/g, "%27")
              + "']"))
          {
            let errorTitle = "Unknown ID ('" + taskOptions[input] + "') given to '" + input + "'",
              errorMsg = "Correct the DB to fix this warning. You can do so from this modal by submitting a correct value (autocorrected to 'None').";
            LoggerModule.error(errorTitle, errorMsg);

            TOAST.warn({
              header: errorTitle,
              body: errorMsg,
              delay: 15000
            });
            // /!\ on sélectionne "Pas de valeur" pour éviter le bug
            // (Bootstrap Select bug si on donne une valeur inconnue au sélecteur)
            INPUTS[input].value = "";
          } else {
            // Affecter la valeur non-encodée
            INPUTS[input].value = taskOptions[input];
          }
        }

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
         * @Issue #9 Issue update de/vers une milestone cause un bug graphique
         * donc on désactive les inputs si les dates sont invalides initialement
         * OU
         * si on n'a pas l'ID de la colonne (!asRaw[input])
         */
        INPUTS[input].disabled = !isAddEditor && (input === "start"
          || input === "end"
          || !APP_MODULE.getParametresUrlOrisNoFunction().asRaw[APP_MODULE.getParametresUrlOrisNoFunction().CONSTANTS.HC_CONFIG_KEYS.data[input].url_param]);
        // Pour le comportement dynamique (désactiver &end si &start n'a pas de valeur) du cas particulier Add Request
        if (isAddEditor
          /**
           * @Issue #53, désactiver/masquer l'input END si `&start` et `&end` ont le même ID
           */
          // todo pas suffisant,
          || isStartIdSameAsEndId) {
          INPUTS["start"].classList.add("isAdd");
          if (isStartIdSameAsEndId)
            INPUTS["end"].parentElement.parentElement.hidden = true;
          INPUTS["end"].disabled = true;
        } else
          INPUTS["start"].classList.remove("isAdd");
      }
      /**
       * @Issue #9
       * On n'autorise la suppression d'une date que lorsque l'on est en mode création car ça ne posera jamais de problème
       */
      if (input === "start" || input === "end") {
        $(INPUTS[input]).data("DateTimePicker").showClear(isAddEditor);
      }
    }
    
    // Les inputs customisés
    let needsFix = false; // si un input est viré, on doit réparer

    for (let customInputKey in CUSTOM_GROUP_INPUTS) {
      // La clé n'existe pas
      if (!taskOptions[customInputKey]
        && taskOptions[customInputKey] !== ""
        // OU on est en mode édition. À ce moment, on check le param pour le premier Point du graphique
        && !(isAddEditor && APP_MODULE.getChart().series[0].data[0].options[customInputKey]
          || APP_MODULE.getChart().series[0].data[0].options[customInputKey] === "")) {
        // Erreur car l'utilisateur essaie d'afficher une colonne de la BD qui n'existe pas
        let errStr = "The field '" + customInputKey + "' doesn't exist in the DataBase and was removed from the Editor.";
        LoggerModule.error(errStr);
        TOAST.warn({ header: errStr, body: "Correct the page URL to fix the interface (if needed).", delay: 5000 });
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
        needsFix = true;
      } else {
        if (needsFix) {
          LoggerModule.log("CUSTOM_GROUP_INPUTS[" + customInputKey + "] should be fixed", CUSTOM_GROUP_INPUTS[customInputKey]);
          if (CUSTOM_GROUP_INPUTS[customInputKey].previousSibling.classList) {
            if (CUSTOM_GROUP_INPUTS[customInputKey].previousSibling.classList.contains("offset-2"))
              CUSTOM_GROUP_INPUTS[customInputKey].classList.remove("offset-2");
            else
              CUSTOM_GROUP_INPUTS[customInputKey].classList.add("offset-2")
          }
          needsFix = false;
        }
        CUSTOM_GROUP_INPUTS[customInputKey].children[1].disabled = false;
        CUSTOM_GROUP_INPUTS[customInputKey].children[1].value = isAddEditor ? "" : taskOptions[customInputKey];
        CUSTOM_GROUP_INPUTS[customInputKey].classList.remove("hidden");
      }
    }
  }

  /**
   * Constructeur d'un <option>
   *
   * @param {Object} options
   *    - value, contient la valeur de l'option
   *    - (optional) subtext, texte dans <small> ne comptant pas dans element.value
   *    - (optional) icon, font-awesome
   *
   * @param {String} value
   *    Label and value of the select option
   * @param {String} subtext
   *    A sub text that can be used to describe an option (<small> text next to the <option>'s label
   *
   * @returns {HTMLElement}
   *    an <option> DOM Element with given value and potentially a subtext (used by Bootstrap-select library)
   *
   * @constructor
   *
  function SelectOption(value, subtext) {
    let option = document.createElement("option");
    if (subtext)
      option.setAttribute("data-subtext", subtext);
    option.innerText = option.value = value;
    return option;
  } // */
  function SelectOption(options) {
    let option = document.createElement("option");

    option.innerText = options["value"] || "";
    for (let attribute in options) {
      option.setAttribute(attribute, options[attribute] || "");
    }
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

    LoggerModule.log("optionValues", optionValues);

    // Vider le select
    select.innerText = "";
    // Ajouter un séparateur
    // select.innerHTML += new SelectOption({ "data-divider": true }).outerHTML; // "  <option data-divider=\"true\"></option>"
    // Ajouter l'option "vide"
    select.innerHTML += new SelectOption({ value: "" }).outerHTML;

    // Ajouter les options, s'il y en a
    if (optionValues)
      for (let i=0, l=optionValues.length; i<l; ++i) {
        if (optionValues[i])
          select.innerHTML += new SelectOption({

            value: optionValues[i].id || optionValues[i],
            // la recherche du champ va foirer si on n'encode pas la valeur de l'<option> et qu'elle contient des ' (guillemets simples)
            "data-encoded-value": encodeURIComponent( optionValues[i].id || optionValues[i] )
              .replace(/'/g, "%27"),
            "data-subtext": optionValues[i].name
          }).outerHTML;
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
    setSelectorOptions(INPUTS["dependency"], newDataIds);
  }

  function updateParentIds(newDataIds) {
    if (!newDataIds || !Array.isArray(newDataIds))
      return false;

    // todo update only if different
    currentDataIds = newDataIds;
    setSelectorOptions(INPUTS["parent"], newDataIds);
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
      throw new EXCEPTIONS.MissingArgumentException("[updateChartOptions]");

    LoggerModule.info("[updateChartOptions] options", options);

    if (options.yAxis && options.yAxis.categories) {
      updateYAxisCategories(options.yAxis.categories);
    }

    if (options.series && options.series.data) {
      let dataOptionsById = {};
      for (let i=0, l=options.series.data.length; i<l; ++i) {
        dataOptionsById[options.series.data[i]["id"]] = options.series.data[i];
      }

      // MàJ les ID pour dépendances
      updateDependencyIds(options.series.data.map(function(e){
        return {
          id: e.id,
          name: SHARED.decodeHTML(dataOptionsById[e.id]["label"])
        }
      }));

      // MàJ les parents
      updateParentIds(options.series.data.map(function(e){
        return {
          id: e.id,
          // name est la catégorie, mais vu que le lien parent-enfant se fait entre 2 Points,
          // il vaut mieux afficher le nom du Point parent dans le <select>, comme pour les dépendances
          name: SHARED.decodeHTML(dataOptionsById[e.id]["label"])
        }
      }));
    }
  }

  /**
   * Initialiser et afficher le modal de création/édition
   * @param {Object} taskOptions
   *
   * @param {boolean} isAdd
   * @exposed
   */
  function showTaskEditor(taskOptions, isAdd) {
    if (!taskOptions)
      throw new EXCEPTIONS.InvalidArgumentException("[showTaskEditor] Function requires the selected data's options");

    isAddEditor = isAdd || false;
    currentTaskOptions = taskOptions;

    DOM_REFERENCES.title.innerText = isAddEditor ? "Task Creator" : "Task Editor";
    initInputs(taskOptions, isAddEditor);

    $(DOM_REFERENCES.modal).modal();

    $(INPUTS["category"]).selectpicker('refresh');

    $(INPUTS["dependency"]).selectpicker('refresh');
    $(INPUTS["parent"]).selectpicker('refresh');
  }

  /**
   * @ToutEnUn
   * Essaye d'effecter la requête appropriée, et
   * (creation de point ou modification)
   *
   * @param {boolean} isAddRequest
   */
  function onOkHandler(isAddRequest) {
    isAddRequest = isAddRequest || false;
    // todo AppModule.tryPostRequest(datas) // se charge de show/hideLoading + doit appeler explicitement Modal.hide()
    //   return false; // <-- Pour ne pas fermer le modal avant la fin de la requête
    let formattedData = {};

    for (let input in INPUTS) {
      let current = asRawParams[HC_CONFIG_KEYS.data[input].url_param];
      if (current
        // ne pas MàJ les paramètres disabled (notamment les catégories en mode &uniqueNames, enfin &parent, et ID car ultra important)
        && !INPUTS[input].disabled) {
        if ((input === "start" || input === "end") && INPUTS[input].value) {
          // FORMAT COURT
          if ($(INPUTS[input]).data("DateTimePicker").options().format === "L") {
            let date = $(INPUTS[input]).data("DateTimePicker").date()._d;
            formattedData[current] = SHARED.toShortFrenchDate(date);
          }
          // FORMAT LONG
          else {
            let dateSansMillisecondes = $(INPUTS[input]).data("DateTimePicker").date()._d;
            dateSansMillisecondes.setMilliseconds(0);
            formattedData[current] = dateSansMillisecondes.toISOString();
          }
        } else
          formattedData[current] = INPUTS[input].value;

        // Formatter la COULEUR (la base n'accepte pas de '#')
        if (input === "color" && INPUTS[input].value && INPUTS[input].value[0] && INPUTS[input].value[0] === "#")
          formattedData[current] = INPUTS[input].value.slice(1);

        /**
         * @Issue #29
         *  Push des valeurs vides via la valeur réservée SHARED.ORIS_EMPTY_VALUE, déclarée dans SHARED.ORIS_EMPTY_VALUE
         */
        // MAIS SEULEMENT SI ELLES N'ÉTAIENT PAS DÉJÀ VIDES
         if (formattedData[current] === "" && currentTaskOptions[HC_CONFIG_KEYS.flippedData[input]])
           formattedData[current] = SHARED.ORIS_EMPTY_VALUE;
      }
    }
    /**
     * @Issue #19
     * Ajouter les paramètres customisés à la requête
     */
    for (let customInput in CUSTOM_GROUP_INPUTS) {
      let input = CUSTOM_GROUP_INPUTS[customInput].children[1],
        isReadonly = input.readOnly,
        current = input.value;

      if (isReadonly)
        continue;

      formattedData[customInput] = current || "";

      /**
       * @Issue #29
       *  Push des valeurs vides via la valeur réservée SHARED.ORIS_EMPTY_VALUE
       */
      // MAIS SEULEMENT SI ELLES N'ÉTAIENT PAS DÉJÀ VIDES
       if (formattedData[customInput] === "" && currentTaskOptions[customInput])
         formattedData[customInput] = SHARED.ORIS_EMPTY_VALUE;
    }


    // Forcer l'ajout de l'attribut vline car faire une requête avec &id=vline causait une erreur
    if (!isAddRequest)
      formattedData["vline"] = INPUTS["vline"].value;

    LoggerModule.warn("[ONOK_HANDLER] formattedData", formattedData);

    // Pour isAdd on osef des ID car on peut pas le deviner à l'avance
    // En dûr TODO et useless ?
    if (isAddRequest)
      delete formattedData["id"];

    APP_MODULE.getParametresUrlOris().tryAddOrEditPoint(formattedData, isAddRequest)
      .then(function (success) {
        if (success)
          // INSTANCE.modal();
          hideModal();
      });
  }

  /**
   * Masquer le modal bootstrap
   */
  function hideModal() {
    INSTANCE.modal("hide");
  }

  function showPromptModal () {
    $(document.getElementById("prompt-modal")).modal();
  }
  function appendNewOption(value) {
    document.getElementById('task-category-input').innerHTML += '<option value="' + value + '">' + value + '</option>';
    let categoryInput = $('#task-category-input');
    categoryInput.selectpicker('val', value);
    categoryInput.selectpicker('refresh');
  }

  return {
    getInstance: function() { return INSTANCE; },
    isOpen: function() { return DOM_REFERENCES.modal.classList.contains("show"); },

    setChartOptions: updateChartOptions,

    initAndShow: function (taskOptions, isAdd) { showTaskEditor(taskOptions, isAdd); },
    hide: hideModal
  }
}