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

  //Paramètres obligatoires de cette implémentation
  this.MANDATORY_GET_PARAMETERS = ["data", "id", "start", "end"];
  this.USER_INFOS = {
    HOST: undefined,
    ID_ORIS: undefined
  };
  //this.page_location = SHARED.stringToLocation(this.windowLocation);   //nécessite une URI valide, c-à-d qui commence par un protocole

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
        /*
        if (isDebug) {
          console.log("Chemin: " + chemin_ini);
          console.log("Nom base: " + base_ini);
          console.warn("Nom base JSON: " + base_nameS);
        }//*/
        return base_nameS;
    };

  /**
   * Génère l'URL du web-service à questionner pour récupérer les données (JSON) du graphique
   *
   * @returns {string}
   */
  //TODO implement
  this.generateWebserviceUrl = function() {
    return false;
  };

  /**
   * Génère l'URL du webservice permettant de communiquer avec la base
   *
   * @return {string}
   */
  //TODO implement
  this.generateWebserviceUrl = function() {
    return false;

    return this.location.protocol + "//" + this.location.host + "/"
      + this.USER_INFOS.ID_ORIS + "/"     //
      + _path  //TODO this.path = &data
      + this.USER_INFOS.HOST;
  };

  /**
   * @private
   * Renvoie l'ID Oris en "splittant" l'page_location à chaque slash ("/")
   *
   * @return {string} id Oris
   */
  function generateID_Oris () {
    console.info("generateID_Oris this", this);

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
    console.info("generateHost this", this);
    this.USER_INFOS.HOST = this.USER_INFOS.HOST || this.page_location.host;
    if (!this.USER_INFOS.HOST)
      throw new EXCEPTIONS.NoIdOrisOrHostDetected();
    return this.USER_INFOS.HOST;
  }
  
  //TODO: implement
  function genererParamData() {
    throw new EXCEPTIONS.NotImplementedException()
  }


  //Extends basic init()
  this.init = (function (oldInit) {
    return function() {
      oldInit.call(this);
      this.USER_INFOS.ID_ORIS = generateID_Oris.call(this);
      this.USER_INFOS.HOST = generateHost.call(this);
    }
  })(this.init);

}
