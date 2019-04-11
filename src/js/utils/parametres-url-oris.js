/**
 * @Subclass of ParametresUrl
 *
 * @param {string} pageUri
 *  @required
 *
 * @param {boolean} isEmptyAllowed
 *  @default false
 *
 * @param {boolean} isAlreadyDecoded
 *  @default false
 *
 * @constructor
 */
function ParametresUrlOris (pageUri, isEmptyAllowed, isAlreadyDecoded) {

  //Hériter de ParametresUrl
  ParametresUrl.call(this, pageUri, isEmptyAllowed, isAlreadyDecoded);

  //Paramètres OBLIGATOIRES de cette implémentation
  this.MANDATORY_GET_PARAMETERS = ["data", "id", "start", "end"];
  this.USER_INFOS = {
    HOST: undefined,
    ID_ORIS: undefined
  };

  /**
   * Extends basic init()
   */
  this.init = (function (oldInit) {
    return function() {
      this.page_location = SHARED.stringToLocation(this.pageUri);   //nécessite une URI valide, c-à-d qui commence par un protocole (ftp, https, etc...)

      this.USER_INFOS.ID_ORIS = generateID_Oris.call(this);
      this.USER_INFOS.HOST = generateHost.call(this);
      oldInit.call(this);
    }
  })(this.init);

  /**
   * Récupère le nom de la base dans l'attribut "data="
   * ET
   * y rajoute un "s" (minuscule)
   * CE QUI correspond au nom de l'objet contenant les valeurs des Points/Axes etc...
   * à la racine du JSON récupéré par la requête GET
   *
   * @return {string}  le nom de la base avec un "s" en plus
   *
   * /////////////////////////////////////////////////
   *
   * @param {string} urlBaseDeDonnees
   * @returns {string}
   */
  //TODO: update
  this.generateRootName = function(urlBaseDeDonnees) {
    //if (!this.asRaw.data) TODO No Need car "CheckMandatory
        //    throw new EXCEPTIONS.NoMandatoryUrlParameterDetected('Paramètre "&data" manquant')
        return false;
        //en minuscules
        let lowerData = parametres_url_data.toLowerCase();
        //Récupère tout AVANT ".ini" dans l'attribut "data"
        var chemin_ini = lowerData.substring(0, lowerData.lastIndexOf("_gestion.ini") + "_gestion.ini".length), //+12 car ".ini" = 4 caractères
            //Nom de la base AVEC "_gestion.ini"
            base_ini = chemin_ini.substring(chemin_ini.lastIndexOf("/") + 1),
            //Nom de la base SANS "_gestion.ini" et AVEC un "s" en plus
            base_nameS = base_ini.replace("_gestion.ini", "") + "s";
        return base_nameS;
    };

  /**
   * Génère l'URL du webservice Oris permettant de communiquer avec la base
   *  location.host inclu automatiquement le port s'il existe
   *
   * @return {string} l'URI du WebService distribuant les données des de la BD
   */
  this.generateWebserviceUrl = function() {
    return this.page_location.protocol + "//" + this.USER_INFOS.HOST + "/"
      + this.USER_INFOS.ID_ORIS + "/"
      + this.asRaw["data"]
      + genererParamData(this.asRaw);
  };

  /**
   * @private
   *
   * @param parametresAsRaw
   * @return {string}
   */
  function genererParamData(parametresAsRaw) {
    let toutData = "?json=true";
    for(let i in parametresAsRaw) {
      if (parametresAsRaw.hasOwnProperty(i)
        && typeof parametresAsRaw[i] === "string"
        && i !== "data")
        toutData += "&" + i + "=" + parametresAsRaw[i];
    }
    return toutData;
  }

  /**
   * @private
   * Renvoie l'ID Oris en "splittant" l'page_location à chaque slash ("/")
   *
   * @return {string} id Oris
   */
  function generateID_Oris () {
    let path = this.page_location.pathname; // renvoie "/id-000192.168.1.74424011-0/reste/de/l/page_location/index.html"
    if (path.split("/")[1].indexOf("id-") >= 0) {
      this.USER_INFOS.ID_ORIS = path.split("/")[1];  //[0] est une chaine vide car le pathname commence par un "/"
      return this.USER_INFOS.ID_ORIS;
    } else
      throw new EXCEPTIONS.NoIdOrisOrHostDetected();
  }

  /**
   * Renvoie l'attribut host de l'objet window.page_location, et non pas hostname,
   * afin d'inclure un éventuel port
   *
   * @return {string}
   */
  function generateHost() {
    this.USER_INFOS.HOST = this.USER_INFOS.HOST || this.page_location.host;
    if (!this.USER_INFOS.HOST)
      throw new EXCEPTIONS.NoIdOrisOrHostDetected();
    return this.USER_INFOS.HOST;
  }
}
