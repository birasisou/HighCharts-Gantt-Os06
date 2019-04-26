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
 * @param {ParametresUrlOris} parametres_url_oris_config
 *    configuration passée en paramètres (contient notamment les colonnes de la base Oris)
 *
 * @constructor
 */
function OrisGanttTask(data_row, parametres_url_oris_config) {
  // @Repository pattern (context) TODO l'init à part "{ id: 'id'
  this.ORIS_CONFIG = parametres_url_oris_config;

  this.rawUserOptions = {};

  this.userOptions = {}; //id, name, start, end, etc...

  /**
   * Initialise l'objet en récupérant de l'argument les valeurs correctement formattées (sinon, null)
   * correspondant aux userOptions d'une série (Gantt)
   *
   * La clé est celle définie dans l'argument CONFIG parametres_url_oris_config (".CONSTANTS.HC_CONFIG_KEYS")
   */
  this.init = function () {
    // Liste des paramètres "implémentés" d'une série HighCharts
    let keys = Object.keys(this.ORIS_CONFIG.CONSTANTS.HC_CONFIG_KEYS),
        length = keys.length;

    while (length--) {
      let key = keys[length];
      //On stock en dur pour debug
      this.rawUserOptions[key] = data_row[this.ORIS_CONFIG.CONSTANTS.HC_CONFIG_KEYS[key['url_param']]];
      //On stock directement la clé dans le format souhaité par HighCharts pour ne pas faire 3 boucles de plus
      this.userOptions[key] = new OrisData(this.rawUserOptions[key])[this.ORIS_CONFIG.CONSTANTS.HC_CONFIG_KEYS[key['format']]];
    }

    //TODO plus tard, ignorer les OrisGanttTask malformées (&id, &start ou &end incorrect, aka "null") lorsqu'on ajout

  };
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
  return this.userOptions['id'].asRaw()
            && this.userOptions['start'].asDate()
            && (this.userOptions['end'].asDate() || this.userOptions['milestone']);
};

OrisGanttTask.prototype.get = function (key) {
  return this.userOptions[key];
};
OrisGanttTask.prototype.getRaw = function (key) {
  return this.rawUserOptions[key];
};