/**
 * /!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\
 * TODO Vu qu'on ne peut pas importer de script dans un Web Worker (erreur de MIME), il faut C/C ce code.
 * TODO il faut donc penser à le faire à chaque fois que le code est modifié
 * /!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\
 */

/**
 * @DataModel pour une tâche Oris
 * TODO: extends une classe du genre GanttDataModel
 * @param {Object} data_row Objet contenant les différente
 * @constructor
 */
function OrisGanttTask(data_row, parametres_url_oris_config) {
  // shortcut
  let HC_CONFIG_KEYS = parametres_url_oris_config.CONSTANTS.HC_CONFIG_KEYS;

  this.configAsOrisData = {};

  this.init = function () {

    for(let key in HC_CONFIG_KEYS) {
      this.configAsOrisData[key] = new OrisData(data_row[key]);
    }

  };
}
