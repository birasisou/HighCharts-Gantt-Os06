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
  this.value = _value;
  this.booleanValue = undefined;
  this.dateValue = undefined;
  this.numberValue = undefined;
  this.rgbValue = undefined;
  this.timestampValue = undefined;

  this.update = function () {
    this.asBoolean();
    this.asDateObject();
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
OrisData.prototype.asRaw = function () {
  return this.value;
};
/**
 * Récupérer la valeur sous forme de String
 *    (bien souvent ça sera déjà le cas dans asRaw, mais au cas où
 *     mais ID, Category, etc... doivent impérativement être des String)
 * @return {string}
 */
OrisData.prototype.asString = function () {
  return (this.value || this.value === false || this.value === 0) ? ("" + this.value) : undefined;
};

/**
 * Récupérer la valeur sous forme booléenne
 * @returns {undefined|boolean}
 */
OrisData.prototype.asBoolean = function () {
  return this.booleanValue !== undefined
    ? this.booleanValue
    : (this.booleanValue = this.tryParseBoolean());
};
/**
 * Tente de convertir la valeur brute en boolean
 * @returns {undefined|boolean}
 */
OrisData.prototype.tryParseBoolean = function () {
  if (typeof this.asRaw() === "boolean")
    return this.asRaw();

  let tmp = typeof this.asRaw() === "string"
            ? this.asRaw().toLowerCase()
            : this.asRaw();
  //if (typeof this.asRaw() !== "string")
  //  return undefined;
  let toReturn = undefined;

  switch (tmp) {
    case "true":
      toReturn = true;
      break;
    case "1":
      toReturn = true;
      break;
    case 1:
      toReturn = true;
      break;
    case true:
      toReturn = true;
      break;

    case "false":
      toReturn = false;
      break;
    case "0":
      toReturn = false;
      break;
    case 0:
      toReturn = false;
      break;
    case false:
      toReturn = false;
      break;

    default:
      return undefined;
  }

  return toReturn;
};

/**
 * Récupérer la valeur sous forme de nombre
 * @returns {undefined|Number}
 */
OrisData.prototype.asNumber = function () {
  return this.numberValue !== undefined
    ? this.numberValue
    : (this.numberValue = this.tryParseNumber());
};
/**
 * Tente de convertir la valeur brute en nombre
 * @returns {undefined|Number}
 */
OrisData.prototype.tryParseNumber = function () {
  if (isNaN(this.value) || this.value === null || this.value === undefined)
    return undefined;

  // Attention, Number(null) = 0. Alors que Number(undefined) = NaN
  let tmpParsed = Number(this.value);
  return isNaN(tmpParsed) ? undefined
                          : tmpParsed;
};

/**
 * Récupérer la valeur sous forme de Date
 * @returns {Date}
 */
OrisData.prototype.asDateObject = function () {
  return this.dateValue !== undefined
    ? this.dateValue
    : (this.dateValue = this.tryParseDate());
};
OrisData.prototype.tryParseDate = function () {
  if (this.value instanceof Date)
    return this.value;

  return (typeof this.value === "number" || SHARED.isIsoDate(this.value))   // on autorise les timestamps
    ? new Date(this.value) //la date est invalide / n'a pas pû être parsée automatiquement
    : undefined;
  /*
  if (isNaN(Number(this.value)))
    return undefined; // Sinon, "#42" produit Wed Jan 01 2042 00:00:00 GMT+0100 (Central European Standard Time)

  let parsedDate = new Date(this.value);

  //Si la date est invalide {Invalid Date}, les fonctions renvoient NaN
  //et NaN est le seul "type" qui n'est jamais égal à lui même (NaN === NaN -> false)
  return (parsedDate.getTime() !== parsedDate.getTime())
    ? undefined //la date est invalide / n'a pas pû être parsée automatiquement
    : parsedDate;
  //*/
};

/**
 * Récupérer la valeur sous forme de timestamp (en ms, car JavaScript)
 * @returns {undefined|number}
 */
OrisData.prototype.asTimestamp = function () {
  return this.timestampValue !== undefined
    ? this.timestampValue
    : (this.timestampValue = this.tryParseTimestamp())
};
OrisData.prototype.tryParseTimestamp = function () {
  let parsedDate = this.asDateObject();

  return parsedDate
    ? parsedDate.getTime()
    : undefined;
};

/**
 * Récupérer la valeur sous forme de string représentant un RGB ou RGBA
 * @returns {undefined|string}
 */
OrisData.prototype.asRgb = function () {
  return this.rgbValue !== undefined
    ? this.rgbValue
    : (this.rgbValue = this.tryParseRgb());
};
OrisData.prototype.tryParseRgb = function () {
  if (!this.value || typeof this.value != "string")
    return undefined;

  let formattedRgb = this.value[0] === "#"
    ? this.value
    : ("#"+this.value);

  return isValidHexColor(formattedRgb) ? this.value : undefined;
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