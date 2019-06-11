/**
 * /!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\
 * TODO Vu qu'on ne peut pas importer de script dans un Web Worker (erreur de MIME), il faut C/C ce code.
 * TODO il faut donc penser à le faire à chaque fois que le code est modifié
 * /!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\
 */

/**
 * @DataModel pour une tâche Oris
 * TODO: extends une classe du genre GanttDataModel
 * @param {Object} data_row
 *    Objet contenant les données des colonnes récupérées
 *    (&id, &start, &end, etc...)
 *
 * @param {ParametresUrlOris} oris_config
 *    toute la config que le Worker a. Il nous faut les constantes et
 * @constructor
 */
function OrisGanttTask(data_row, oris_config) {
  if (arguments.length !== 2) // TODO éviter de throw ? Risque de couper toute la boucle
    throw new Error("OrisGanttTask constructor expects 2 parameters");
  if (!data_row || !oris_config)
    throw new Error("[OrisGanttTask Constructor] Invalid parameter(s)");

  // Les cléfs, définies dans notre url (GET parameters), correspondant aux userOptions d'HC
  let oris_column = oris_config.asRaw,
    // Les clés userOptions HighCharts
    oris_config_HC_CONFIG_KEYS = oris_config.CONSTANTS.HC_CONFIG_KEYS;   //  *    parametres_url_oris_config.CONSTANTS.HC_CONFIG_KEYS

  // Valeur brute d'un userOption
  this.rawUserOptions = {};
  // Objet OrisValue d'un userOption
  this.orisValueUserOption = {};
  // Valeur formattée d'un userOption
  this.userOptions = {}; //id, name, start, end, etc...

  /**
   * Initialise l'objet en récupérant de l'argument les valeurs correctement formattées (sinon, null)
   * correspondant aux userOptions d'une série (Gantt)
   *
   * La clé est celle définie dans l'argument CONFIG parametres_url_oris_config (".CONSTANTS.HC_CONFIG_KEYS")
   */
  // Liste des paramètres "implémentés" d'une série HighCharts
  let keys = Object.keys(oris_config_HC_CONFIG_KEYS),
    length = keys.length;


  while (length--) {
    let key = keys[length];
    // La clé HC
    LoggerModule.log("HighChart's Key", key);
    // L'équivalent Oris (définit en paramètre url)
    LoggerModule.log("(oris_config_HC_CONFIG_KEYS[key]['url_param']) Our GET parameter equivalent", oris_config_HC_CONFIG_KEYS[key]['url_param']);

    // SAVE DATA

    // en dur
    this.rawUserOptions[key] = data_row[oris_column[oris_config_HC_CONFIG_KEYS[key]['url_param']]];
    // La valeur du data_row
    // TODO faut passer par asRaw....
    LoggerModule.log("(This dataRow's value) data_row[oris_config_HC_CONFIG_KEYS[key]['url_param']] " + key + ":", this.rawUserOptions[key]);

    // as OrisValue
    this.orisValueUserOption[key] = new OrisData(this.rawUserOptions[key]);
    LoggerModule.log("(This userOptions's value as OrisValue Object) this.orisValueUserOption[key] " + key + ":", this.orisValueUserOption[key]);

    // as formatted
    this.userOptions[key] = this.orisValueUserOption[key][oris_config_HC_CONFIG_KEYS[key]['format']]();
    LoggerModule.log("(This userOptions's value formatted) userOptions[key] " + key + ":", this.userOptions[key]);
  }

  LoggerModule.log("this.rawUserOptions", this.rawUserOptions);
  LoggerModule.log("this.orisValueUserOption", this.orisValueUserOption);
  LoggerModule.info("this.userOptions", this.userOptions);
}

/**
 * Une Tâche Oris est "valide" SSI &id, &start ET &end ne sont pas null
 *  &id est faux SSI il est vide ("")
 *  &start et &end sont "null" si le parsing à l'initialisation à foiré (.getTime() !== .getTime())
 *  &end est valide s'il est manquant SSI &milestone == true
 *
 * @return {boolean} true si la tâche est considérée comme "valide"
 */
OrisGanttTask.prototype.isValidTask = function () {
  let id = this.userOptions['id'], //== this.orisValueUserOption.asString(),
    start = this.userOptions['start'], //== this.orisValueUserOption.asTimestamp(),
    end = this.userOptions['end'], //== this.orisValueUserOption.asTimestamp(),
    isMilestone = this.userOptions['milestone']; //== this.orisValueUserOption.asBoolean();

  // (toujours)
  // ID pas ?absent?/empty/invalide/null/undefined
  // START pas ?absent?/empty/invalide/null/undefined ET Date valide
  // (soit)
  // END ?absent?/empty/invalide/null/undefined ET Date valide ET START >= END ET !MILESTONE
  // (soit)
  // END est UNDEFINED ET milestone = true
  if (id && start
    && (((end || end === 0) || isMilestone) && (Boolean(end) !== Boolean(isMilestone) || end === 0 && !isMilestone)) // END ou MILESTONE doit être valide (et 0, en nombre/timestamp, doit compter comme vrai)
    && (start <= end || (!end && end !== 0)))
    return true;

  LoggerModule.error("[ID:" + id + "] n'est pas un donnée valide");
  LoggerModule.warn("Raisons possibles: " +
    "\n- [ID] manquant/vide/invalide..." +
    "\n- [START] manquant/vide/pas au format ISO-8601..." +
    "\n- [END] manquant/vide/pas au format ISO-8601......" +
    "\n\tou [END] valide mais inférieur à [START]" +
    "\n- [IS-MILESTONE] n'est pas FAUX mais [END] possède une valeur (une milestone ne doit avoir qu'une date de début)"
  );
  return false;
};

OrisGanttTask.prototype.get = function (key) {
  return this.userOptions[key];
};
OrisGanttTask.prototype.getRaw = function (key) {
  return this.rawUserOptions[key];
};