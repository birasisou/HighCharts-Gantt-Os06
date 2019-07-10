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
  // todo ????
  $(INPUTS["end"]).datetimepicker();
  // todo ????
  // MàJ le dateMin/dateMax de end/start en fonction de la date choisie
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

    //
    for (let input in INPUTS) {
      console.warn("taskOptions['"+input+"']",taskOptions[input]);
      if (!INPUTS[input])
        continue;

      if (typeof taskOptions[input] !== "object"
        && typeof taskOptions[input] !== "undefined"
        && (taskOptions[input] || taskOptions[input] === 0))
      {
        taskOptions[input] = SHARED.decodeHTML(taskOptions[input]);
        if (input === "start" || input === "end") {
          $(INPUTS[input]).data("DateTimePicker").date(moment(taskOptions[input]));
          // data('DateTimePicker').date(moment(taskOptions[input]).format("DD/MM/YYYY"));
          //$(INPUTS[input]).data('daterangepicker').setEndDate(moment(taskOptions[input]).format("DD/MM/YYYY")); // todo ? supporter les heures ?
        } else
          INPUTS[input].value = taskOptions[input];
        INPUTS[input].disabled = false;
      }
      else if (typeof taskOptions[input] === "object" && input === "completed") {
        INPUTS["completed"].value = (Number(taskOptions["completed"]["amount"]) <= 1) ? Number(taskOptions["completed"]["amount"])*100 : Number(taskOptions["completed"]["amount"]);
        INPUTS[input].disabled = false;
      }
      else {
        INPUTS[input].value = "";
        INPUTS[input].disabled = true;
      }
    }
  }

  /**
   * Constructeur d'un <option>
   * @param value
   * @returns {HTMLElement}
   * @constructor
   */
  function SelectOption(value) {
    let option = document.createElement("option");
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

    //console.error("concat:", [""].concat(optionValues));

    //$(select).selectpicker('val', ([""].concat(optionValues)));
    //return;

    // Vider le select
    select.innerText = "";
    // Ajouter l'option "vide"
    select.innerHTML += new SelectOption("").outerHTML;
    // Ajouter les options, s'il y en a
    if (optionValues)
      for (let i=0, l=optionValues.length; i<l; ++i) {
        select.innerHTML += new SelectOption(optionValues[i]).outerHTML;
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
    setSelectorOptions(INPUTS["dependency"], newDataIds);
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
      updateDataIds(options.series.data.map(function(e){return e.id}));
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
    INSTANCE = alertify.confirm(div, function(){
      // todo ???? NE SE LANCE PAS
      alert("TODO implémenter TryPostData");
      alertify.success('Valider'); // todo TryPostData
    }, function(){
      // todo ???? NE SE LANCE PAS
      alertify.error('Aucune modification');
    }).set({
      padding: false,
      title: "Édition de tâche",
      movable: false,
      maximizable: false,
      resizable: true,
      pin: true,  // useless car modal
      reverseButtons: true,
      transition: "zoom",
      onshow: function () {
        // todo ???? NE SE LANCE PAS
        $(INPUTS["category"]).selectpicker('refresh');
        $(INPUTS["dependency"]).selectpicker('refresh');
        alertify.message('confirm was shown.');
      },
      onok: function () {
        alertify.notify('TODO: IMPLEMENT + RETURN FALSE', 'error', 3, function(){  console.log('TODO: IMPLEMENT + RETURN FALSE'); });
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
    //  try POST request
    //  onsuccess
    //   hideLoading
    //   hideModal
    //   success notification
    //  onerror
    //   hideLoading
    //   ? hideModal ?
    //   error notification

    // show Loading
    APP_MODULE.getLoadingSpinnerHandler().showLoading();

    // format data
    let formattedData = {},
      asRawParams = APP_MODULE.parametresUrlOrisNoFunction().asRaw;
    for (let input in INPUTS) {
      if (asRawParams[APP_MODULE.CONSTANTS.HC_CONFIG_KEYS.data[input].url_param])
        formattedData[APP_MODULE.CONSTANTS.HC_CONFIG_KEYS.data[input].url_param] = INPUTS[input].value;
    }
    console.warn("[ONOK_HANDLER]", formattedData);

    // todo tryPostData
    new Promise(function (resolve, reject) {
      let xhr = new XMLHttpRequest(),
        url = APP_MODULE.getParametresUrlOris().generateWebserviceUpdateUrl(formattedData);

      console.warn("UPDATE URL", url);

      xhr.open("GET", url, true);

      xhr.onload = function() {
        LoggerModule.log("[GET.onload] req.status", xhr.status);
        // This is called even on 404 etc
        // so check the status
        if (xhr.status === 200) {
          LoggerModule.log("[GET.onload] req.response", xhr.response);
          resolve(xhr.response);
        } else {
          // Otherwise reject with the status text
          // which will hopefully be a meaningful error
          let msg = "[GET.onload] req.status !== 200. \nActual req.status: " + xhr.status;
          LoggerModule.error(msg);
          reject(Error(msg));
        }
      };

      // Handle network errors
      xhr.onerror = function(e) {
        LoggerModule.error("[GET.onerror] Network Error. e:", e);
        LoggerModule.error("[GET.onerror] Network Error. xhr.statusText: ", "'" + xhr.statusText + "'");
        LoggerModule.error("[GET.onerror] Network Error. xhr.status:", xhr.status);
        reject(Error("[GET.onerror] Network Error "+ xhr.statusText +"(" + xhr.status + ")"));
      };

      xhr.send();
    })
      // parse to JSON
      .then(function (response) {
        try {
          return JSON.parse(response);
        } catch (e) {
          LoggerModule.warn("Tried to Parse:", response);
          throw Error("Unable to parse response to JSON. " + e.message);
        }
      })
      // extract root from JSON
      // /!\ The rootName doesn't contain the additional "s" (GET => rootName is "<something>s"; POST => rootName is "<something>") /!\
      .then(function (json) {
        let root = json[APP_MODULE.parametresUrlOrisNoFunction().rootName.slice(0, -1)];
        if (!root)
          throw new Error("Unable to extract root (" + APP_MODULE.parametresUrlOrisNoFunction().rootName.slice(0, -1) + ") from JSON", json);
        return root;
      })
      // The server replies with its stored value for the given vline ID. We have to check if this data is what we pushed (success) or different (failed)
      .then(function () {

      })
      .catch(function (err) {
        LoggerModule.error("Data update error:", err);
        alertify.postErrorAlert(err.description || err.message);
      })
      .then(function () {
        postError()
      })
  }

  function ONCANCEL_HANDLER() {
    // todo rien de particulier ?
  }



  /**
   * Initialiser date-pickers / color-picker
   */
  // todo disable les inputs potentiellement non renseignés dans asRaw (couleur, etc...)
  function factory(){
    return {
      // The dialog startup function
      // This will be called each time the dialog is invoked
      // For example: alertify.myDialog( data );
      main:function(params){
        // manipulate parameters and set options
        this.setting('myProp', data);
      },
      // The dialog setup function
      // This should return the dialog setup object ( buttons, focus and options overrides ).
      setup:function(){
        return {
          /* buttons collection */
          buttons:[

            /*button defintion*/
            {
              /* button label */
              text: 'OK',

              /*bind a keyboard key to the button */
              key: 27,

              /* indicate if closing the dialog should trigger this button action */
              invokeOnClose: false,

              /* custom button class name  */
              className: alertify.defaults.theme.ok,

              /* custom button attributes  */
              attrs:{attribute:'value'},

              /* Defines the button scope, either primary (default) or auxiliary */
              scope:'auxiliary',

              /* The will conatin the button DOMElement once buttons are created */
              element:undefined
            }
          ],

          /* default focus */
          focus:{
            /* the element to receive default focus, has differnt meaning based on value type:
                number:     action button index.
                string:     querySelector to select from dialog body contents.
                function:   when invoked, should return the focus element.
                DOMElement: the focus element.
                object:     an object that implements .focus() and .select() functions.
            */
            element: 0,

            /* indicates if the element should be selected on focus or not*/
            select: false

          },
          /* dialog options, these override the defaults */
          options: {
            title: "Task Editor",
            // ? pinned: ...,
            movable: false,
            maximizable: false,
            pin: true,  // useless car modal
            transition: "zoom",
            // ? padding: false,
            /*
            // todo HANDLERS
            oncancel: ...,  // modal fermé (bouton "Annuler" ou l'overlay)
            onclose:...,    // tout le temps (Ok et Cancel)
            onclosing: ..., // "return false" empêche le modal de se fermer. À voir si onok permet de 'stall' également
            onok: ...       // bouton "Valider"
            //*/
          }
        };
      },
      // This will be called once the dialog DOM has been created, just before its added to the document.
      // Its invoked only once.
      build: function () {
        // todo disable les inputs non-renseignés dans parametres-url

        // Do custom DOM manipulation here, accessible via this.elements

        // this.elements.root           ==> Root div
        // this.elements.dimmer         ==> Modal dimmer div
        // this.elements.modal          ==> Modal div (dialog wrapper)
        // this.elements.dialog         ==> Dialog div
        // this.elements.reset          ==> Array containing the tab reset anchor links
        // this.elements.reset[0]       ==> First reset element (button).
        // this.elements.reset[1]       ==> Second reset element (button).
        // this.elements.header         ==> Dialog header div
        // this.elements.body           ==> Dialog body div
        // this.elements.content        ==> Dialog body content div
        // this.elements.footer         ==> Dialog footer div
        // this.elements.resizeHandle   ==> Dialog resize handle div

        // Dialog commands (Pin/Maximize/Close)
        // this.elements.commands           ==> Object containing  dialog command buttons references
        // this.elements.commands.container ==> Root commands div
        // this.elements.commands.pin       ==> Pin command button
        // this.elements.commands.maximize  ==> Maximize command button
        // this.elements.commands.close     ==> Close command button

        // Dialog action buttons (Ok, cancel ... etc)
        // this.elements.buttons                ==>  Object containing  dialog action buttons references
        // this.elements.buttons.primary        ==>  Primary buttons div
        // this.elements.buttons.auxiliary      ==>  Auxiliary buttons div

        // Each created button will be saved with the button definition inside buttons collection
        // this.__internal.buttons[x].element

      },
      // This will be called each time the dialog is shown
      prepare: function () {
        // todo init en fonction du "currentTask"
        // Do stuff that should be done every time the dialog is shown.
      },
      // This will be called each time an action button is clicked.
      callback: function (closeEvent) {
        //The closeEvent has the following properties
        //
        // index: The index of the button triggering the event.
        // button: The button definition object.
        // cancel: When set true, prevent the dialog from closing.
      },
      // To make use of AlertifyJS settings API, group your custom settings into a settings object.
      settings: {
        myProp: 'value'
      },
      // AlertifyJS will invoke this each time a settings value gets updated.
      settingUpdated: function (key, oldValue, newValue) {
        // Use this to respond to specific setting updates.
        switch (key) {
          case 'myProp':
            // Do something when 'myProp' changes
            break;
        }
      },
      // listen to internal dialog events.
      hooks: {
        // triggered when the dialog is shown, this is seperate from user defined onshow
        onshow: function () {
        },
        // triggered when the dialog is closed, this is seperate from user defined onclose
        onclose: function () {
        },
        // triggered when a dialog option gets updated.
        // IMPORTANT: This will not be triggered for dialog custom settings updates ( use settingUpdated instead).
        onupdate: function () {
        }
      }
    }
  }

  return {
    getInstance: function() { return INSTANCE; },

    setChartOptions: updateChartOptions,

    initAndShow: function (taskOptions) { showTaskEditor(taskOptions); },
    hide: function () { INSTANCE.hide(); },
    show: function () { INSTANCE.show(); }



  }
}