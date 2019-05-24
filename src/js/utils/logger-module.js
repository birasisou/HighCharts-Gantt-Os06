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
let LoggerModule = (function () {
  return {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    setDebug: function(isOn) {
      this.log = (isOn === true || isOn === "log") ? console.log : function () {};
      this.info = (isOn === true || isOn === "log" || isOn === "info") ? console.info : function () {};
      this.warn = (isOn === true  || isOn === "log" || isOn === "info" || isOn === "warn") ? console.warn : function () {};
      this.error = (isOn === true || isOn === "log" || isOn === "info" || isOn === "warn" || isOn === "error") ? console.error : function () {};
      return isOn;
    }
  }
}());
