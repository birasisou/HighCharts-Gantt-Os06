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
  isValidHexColor = function (stringToTest) {
    return /^#?(?:(?:[A-F0-9]{2}){3,4}|[A-F0-9]{3}|[A-F0-9]{4})$/i.test(stringToTest);
  };


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
  return (this.value || this.value === false || this.value === 0 || this.value === "") ? ("" + this.value) : undefined;
};
/**
 * @return {string|false}
 */
OrisData.prototype.asStringOrFalse = function () {
  return this.asString() || false;
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
  if (isNaN(this.value) || this.value === null || this.value === undefined || this.value === "") // isNaN("") === false... car "" est falsy -> 0
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
  if (!this.value && this.value !== 0)
    return undefined;

  if (this.value instanceof Date)
    return this.value;

  if (typeof this.value === "number"    // on autorise les timestamps
   || SHARED.isIsoDate(this.value))      // format ISO
    return new Date(this.value);
  else if (SHARED.isShortFrenchDate(this.value)) {  // On transforme DD/MM/YYYY en MM/DD/YYYY
    let tmp = null;
    if (this.value.indexOf("/"))
      tmp = this.value.split("/");
    else
      tmp = this.value.split("-");
    return new Date(tmp[1] + "/" + tmp[0] + "/" + tmp[2]);
  }
  else
    return undefined;
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

  return isValidHexColor(formattedRgb) ? formattedRgb : undefined;
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

OrisData.prototype.toString = function() {
  let str = "";
  for (let i in this) {
    str += ('\nOrisData.prototype.' + i + ' = ' + this[i].toString());
  }
  return str;
};