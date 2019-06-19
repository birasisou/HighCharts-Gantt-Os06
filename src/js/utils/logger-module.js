/**
 * @Module
 * Remplace la condition "isDebug" précédent chaque console.log/info/warn/error
 *
 * On peut envisager 3 états
 * @None désactive toutes les fonctions du Logger
 * @Semi désactive .log/.info
 * @All ne désactive rien
 *
 * @type {{warn, log, error, toggleOn, info}}
 */
function LOGGER_MODULE_FACTORY() {
  let current_log_level = "log";
  return {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    setDebug: function(logLevel) {
      current_log_level = logLevel;
      this.log = (logLevel === true || logLevel === "log") ? console.log : function () {};
      this.info = (logLevel === true || logLevel === "log" || logLevel === "info") ? console.info : function () {};
      this.warn = (logLevel === true  || logLevel === "log" || logLevel === "info" || logLevel === "warn") ? console.warn : function () {};
      this.error = (!logLevel) ? function () {} : console.error;
      return logLevel;
    },
    getCurrent_log_level: function () { return current_log_level; }
  }
}

// Instance globale
let LoggerModule = new LOGGER_MODULE_FACTORY();