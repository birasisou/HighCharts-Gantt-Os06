/**
 * /!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\
 * TODO Vu qu'on ne peut pas importer de script dans un Web Worker (erreur de MIME), il faut C/C ce code.
 * TODO il faut donc penser à le faire à chaque fois que le code est modifié
 * /!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\/!\
 */

/**
 * @DataModel pour une donnée Oris
 * le web-service renvoie toujours des données en string,
 * ce modèle nous sert à normaliser leur formatage
 * @param {string} _value valeur de la donnée
 * @constructor
 */
function OrisData(_value) {
  this.value = _value || undefined;
  this.booleanValue = undefined;
  this.dateValue = undefined;
  this.numberValue = undefined;
  this.rgbValue = undefined;
  this.timestampValue = undefined;

  this.update = function () {
    this.asBoolean();
    this.asDate();
    this.asNumber();
    this.asRgb();
    this.asTimestamp();
  };

  //Auto Init
  this.update();
}

/**
 * Récupérer la valeur brute
 */
OrisData.prototype.asString = function () {
  return this.value;
};

/**
 * Récupérer la valeur sous forme booléenne
 * @returns {null|boolean}
 */
OrisData.prototype.asBoolean = function () {
  return this.booleanValue !== undefined
    ? this.booleanValue
    : (this.booleanValue = this.tryParseBoolean());
};
/**
 * Tente de convertir la valeur brute en boolean
 * @returns {null|boolean}
 */
OrisData.prototype.tryParseBoolean = function () {
  if (typeof this.value != "string")
    return null;

  switch (this.value.toLocaleLowerCase()) {
    case "true":
      return true;

    case "false":
      return false;

    default:
      return null;
  }
};

/**
 * Récupérer la valeur sous forme de nombre
 * @returns {null|Number}
 */
OrisData.prototype.asNumber = function () {
  return this.numberValue !== undefined
    ? this.numberValue
    : (this.numberValue = this.tryParseNumber());
};
/**
 * Tente de convertir la valeur brute en nombre
 * @returns {null|Number}
 */
OrisData.prototype.tryParseNumber = function () {
  if (this.value === null || this.value === undefined)
    return null;

  let tmpParsed = Number(this.value);
  return isNaN(tmpParsed) ? null
                          : tmpParsed;
};

/**
 * Récupérer la valeur sous forme de Date
 * @returns {Date}
 */
OrisData.prototype.asDate = function () {
  return this.dateValue !== undefined
    ? this.dateValue
    : (this.dateValue = this.tryParseDate());
};
OrisData.prototype.tryParseDate = function () {
  let parsedDate = new Date(this.value);

  //Si la date est invalide {Invalid Date}, les fonctions renvoient NaN
  //et NaN est le seul "type" qui n'est jamais égal à lui même (NaN === NaN -> false)
  return (parsedDate.getTime() !== parsedDate.getTime())
    ? null //la date est invalide / n'a pas pû être parsée automatiquement
    : parsedDate;
};

/**
 * Récupérer la valeur sous forme de timestamp (en ms, car JavaScript)
 * @returns {null|number}
 */
OrisData.prototype.asTimestamp = function () {
  return this.timestampValue !== undefined
    ? this.timestampValue
    : (this.timestampValue = this.tryParseTimestamp())
};
OrisData.prototype.tryParseTimestamp = function () {
  let parsedDate = this.asDate();

  return parsedDate
    ? parsedDate.getTime()
    : null;
};

/**
 * Récupérer la valeur sous forme de string représentant un RGB ou RGBA
 * @returns {null|string}
 */
OrisData.prototype.asRgb = function () {
  return this.rgbValue !== undefined
    ? this.rgbValue
    : (this.rgbValue = this.tryParseRgb());
};
OrisData.prototype.tryParseRgb = function () {
  let formattedRgb = this.value[0] === "#"
    ? this.value
    : ("#"+this.value);

  return isValidHexColor(formattedRgb) ? this.value : null;
};

/**
 * @TO_SHARE Teste si une chaine de caractère consitue une valeur hexadécimale (couleur) légale
 *
 * source: https://stackoverflow.com/questions/8027423/how-to-check-if-a-string-is-a-valid-hex-color-representation
 * - ^ match beginning
 * - # a hash
 * - [a-f0-9] any letter from a-f and 0-9
 * - {6} the previous group appears exactly 6 times
 * - $ match end
 * - i ignore case
 *
 * @param  {string}  stringToTest
 *     chaine de caractères à tester
 * @return {Boolean}
 *     true si la chaine est une couleur écrite en hexadécimal :
 *     - court (3 caractères, en plus du '#') "#cf9"
 *     - long (6) "#ccff99"
 *     - long, avec opacité (8) "#ccff9955"
 *     - court, avec opacité (4) "#f9f9"
 *     - même sans '#' initial "ccff9955" / "f9f9"
 *
 */
function isValidHexColor(stringToTest) {
  return /^#?(?:(?:[A-F0-9]{2}){3,4}|[A-F0-9]{3}|[A-F0-9]{4})$/i.test(stringToTest);
}