/**
 * /!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\
 * TODO Vu qu'on ne peut pas importer de script dans un Web Worker (erreur de MIME), il faut C/C ce code.
 * TODO il faut donc penser à le faire à chaque fois que le code est modifié
 * /!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\
 */

/**
 * @DataModel pour une tâche Oris
 *
 * /!\ Les dates sont également stockée dans leur format brut
 * /!\ car on souhaite conserver ce format lorsque l'on écrit dans la base
 *
 * @param {Object} data_row
 *    Objet contenant les données des colonnes récupérées
 *    (&id, &start, &end, etc...)
 *
 * @param {ParametresUrlOris} oris_config
 *    toute la getConfig que le Worker a. Il nous faut les constantes et
 *
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
    oris_config_HC_CONFIG_KEYS_data = oris_config.CONSTANTS.HC_CONFIG_KEYS.data,   // parametres_url_oris_config.CONSTANTS.HC_CONFIG_KEYS.data
    oris_config_HC_CONFIG_KEYS_dataLabel = oris_config.CONSTANTS.HC_CONFIG_KEYS.dataLabel;

  // Valeur brute d'un userOption
  this.rawUserOptions = {};
  // Valeur brute après SHARED.decodeHTML (pour supprimer les "&quot;" par exemple)
  this.decodedRawUserOptions = {};
  // Objet OrisValue d'un userOption
  this.orisValueUserOption = {};
  // Valeur formattée d'un userOption
  this.userOptions = {}; //id, name, start, end, etc...

  /**
   * Initialise l'objet en récupérant de l'argument les valeurs correctement formattées (sinon, null)
   * correspondant aux userOptions d'une série (Gantt)
   *
   * La clé est celle définie dans l'argument CONFIG parametres_url_oris_config (".CONSTANTS.HC_CONFIG_KEYS.data")
   */
  // Liste des paramètres "implémentés" d'une série HighCharts
  let keys = Object.keys(oris_config_HC_CONFIG_KEYS_data),
    data_length = keys.length;

  // console.warn("keys", keys);

  while (data_length--) {
    let key = keys[data_length];

    // L'équivalent Oris (définit en paramètre url)
    LoggerModule.log("(oris_config_HC_CONFIG_KEYS["+key+"]['url_param']) Our GET parameter equivalent",
      oris_config_HC_CONFIG_KEYS_data[key]['url_param']);

    // SAVE DATA
    // en dur
    this.rawUserOptions[key] = data_row[oris_column[oris_config_HC_CONFIG_KEYS_data[key]['url_param']]];
    // La valeur du data_row
    LoggerModule.log("(This dataRow's value) data_row[oris_config_HC_CONFIG_KEYS[key]['url_param']] " + key + ":", this.rawUserOptions[key]);

    // On travaille avec les version décodées
    // version Worker --> ne checkera que 4 entités (&, <, > et ")
    this.decodedRawUserOptions[key] = SHARED.decodeHTML(this.rawUserOptions[key]);
    // La valeur du data_row
    LoggerModule.log("(This dataRow's decodeHTML value) this.decodedRawUserOptions[key] " + key + ":", this.decodedRawUserOptions[key]);

    // as OrisValue
    // this.orisValueUserOption[key] = new OrisData(this.rawUserOptions[key]);
    this.orisValueUserOption[key] = new OrisData(this.decodedRawUserOptions[key]);
    LoggerModule.log("(This userOptions's value as OrisValue Object) this.orisValueUserOption[key] " + key + ":", this.orisValueUserOption[key]);

    // as formatted
    this.userOptions[key] = this.orisValueUserOption[key][oris_config_HC_CONFIG_KEYS_data[key]['format']]();
    LoggerModule.log("(This userOptions's value formatted) userOptions[key] " + key + ":", this.userOptions[key]);
  }

  /**
   * DATE FORMAT
   * On veut conserver le format de dates de la BD mais Highcharts ne comprend que les timestamps, or,
   * si on est au format LONG (UTC, on affichera les heures)
   * ou au format COURT ("DD/MM/YYYY", on n'affichera pas les heures)
   * on souhaite réécrire la même chose dans la base
   *
   * /!\ Si &start et &end sont mis au même jour, il faut passer &end = 23h59, ou au jour d'après /!\
   */
  this.userOptions["raw-" + oris_config_HC_CONFIG_KEYS_data["start"]["url_param"]] =
    this.rawUserOptions[oris_config_HC_CONFIG_KEYS_data["start"]["url_param"]];
  this.userOptions["raw-" + oris_config_HC_CONFIG_KEYS_data["end"]["url_param"]] =
    this.rawUserOptions[oris_config_HC_CONFIG_KEYS_data["end"]["url_param"]];

  // Passer &end à 23h59 s'il a la même date que &start
  // console.warn("this.orisValueUserOption['start']", this.orisValueUserOption["start"].asDateObject());
  let startAsDate = this.orisValueUserOption["start"].asDateObject(),
    endAsDate = this.orisValueUserOption["end"].asDateObject();

  /**
   * @Issue 40 On veut **TOUJOURS** affecter 23h59 à une "end date" au **format court** (`DD/MM/YYYY`)
   * Sauf qu'il faut prendre en compte le timeOffset
   * Simplement faire `setHours(23, 59, 59, 99)` ne suffirait pas
   * car HighCharts affiche la valeur UTC (par exemple, avec un GMT+0100, la tâche serait visible 1h devant le tick de sa date (courte)
   */
  if (this.orisValueUserOption["end"].asRaw().indexOf("/") > 0) {
    //*
    this.userOptions["end"] = endAsDate.setTime(
      endAsDate.setHours(23, 59, 59, 99) - endAsDate.getTimezoneOffset() * 60 * 1000
    ); // */
    //this.userOptions["end"] = endAsDate.setTime(endAsDate.getTime() + 23 * 3600 * 1000 - endAsDate.getTimezoneOffset() * 60 * 1000);
  }
  if (this.orisValueUserOption["start"].asRaw().indexOf("/") > 0) {
    // this.userOptions["start"] = startAsDate.setHours(0, 0, 0);
    // Le graphe affiche la valeur UTC des dates !!
    // Sans ça, si on est en GMT+0100, la tâche commencera 1 heure avant le tick de minuit
    // this.userOptions["start"] = startAsDate.setUTCHours(0, 0, 0);

    // Fixer le décalage GMT
    this.userOptions["start"] = startAsDate.setTime(
      startAsDate.setHours(0, 0, 0, 0) - startAsDate.getTimezoneOffset() * 60 * 1000
    );
  }



  /**
   * CAS PARTICULIERS
   */
  // MILESTONE
  //  on doit le "calculer" (TRUE s'il n'y pas de date de fin spécifiée)
  this.userOptions["milestone"] = (typeof this.userOptions["start"] !== "undefined" && typeof this.userOptions["end"] === "undefined");
  // COMPLETE
  //  doit être formatté en un Objet "{ amount: <value> }"
  if (typeof this.userOptions["completed"] === "number") {
    if (this.userOptions["completed"] > 1)
      this.userOptions["completed"] = this.userOptions["completed"] / 100;
    if (this.userOptions["completed"] >= 0 && this.userOptions["completed"] <= 1)  // todo Autoriser entre 0 et 100 ?
        this.userOptions["completed"] = { amount: Number(Number(this.userOptions["completed"]).toFixed(2)) };
  } else
    this.userOptions["completed"] = null;

  /**
   * @GitIssue #19
   * INPUTS CUSTOMISÉS
   */
  for (let customInputKey in oris_config_HC_CONFIG_KEYS_dataLabel) {
    // Si la BD ne renvoie pas de colonne, ça veut dire qu'elle n'existe pas, donc on ne stock rien
    // À l'inverse, on veut stocker une valeur vide si la base renvoie une valeur vide
    if (!data_row.hasOwnProperty(customInputKey))
      continue;
    // en dur
    this.rawUserOptions[customInputKey] = data_row[customInputKey];
    // La valeur du data_row
    LoggerModule.log("Custom Label " + customInputKey + ":", this.rawUserOptions[customInputKey]);

    // as OrisValue
    this.orisValueUserOption[customInputKey] = new OrisData(this.rawUserOptions[customInputKey]);
    LoggerModule.log("this.orisValueUserOption[key] " + customInputKey + ":", this.orisValueUserOption[customInputKey]);

    // as formatted
    this.userOptions[customInputKey] = this.orisValueUserOption[customInputKey].asString();
    LoggerModule.log("userOptions[key] " + customInputKey + ":", this.userOptions[customInputKey]);
  }

  /**
   * Fixe le problème de mise à jour de milestone à tâche et vice-versa
   * @Issue https://github.com/highcharts/highcharts/issues/11158
   *
  this.userOptions["marker"] = {
    symbol: null
  }; //*/
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
  if (id && ((start
            && (((end || end === 0) || isMilestone) && (Boolean(end) !== Boolean(isMilestone) || end === 0 && !isMilestone)) // END ou MILESTONE doit être valide (et 0, en nombre/timestamp, doit compter comme vrai)
            && (start <= end || (!end && end !== 0)))
      || (!start && !end)))
    return true;

  LoggerModule.info("[ID:" + id + "] n'est pas une donnée valide");
  LoggerModule.log("Raisons possibles: " +
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

OrisGanttTask.prototype.toString = function() {
  let str = "";
  for (let i in this) {
    str += ('\nOrisGanttTask.prototype.' + i + ' = ' + this[i].toString());
  }
  return str;
};
