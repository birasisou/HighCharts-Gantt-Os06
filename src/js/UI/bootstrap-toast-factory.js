function TOAST_FACTORY () {
  let TOAST_CONTAINER_ID = "toast-container",
    TOAST_CONTAINER = document.getElementById(TOAST_CONTAINER_ID),
    currentToasts = {},
    DEFAULT_TOAST_OPTIONS = {
      info: {
        headerStyles: ["text-dark"],
        icon: "fa-info-circle",
        backgroundStyles: ["bg-light", "text-dark"]
      },
      success: {
        headerStyles: ["text-success"],
        icon: "fa-check",
        backgroundStyles: ["bg-success", "text-white"]
      },
      warn: {
        headerStyles: ["text-dark"],
        icon: "exclamation-circle",
        backgroundStyles: ["bg-warning", "text-dark"]
      },
      error: {
        headerStyles: ["text-danger"],
          icon: "fa-exclamation-triangle",
          backgroundStyles: ["bg-danger", "text-white"]
      }
    };

  /**
   * Instancie un Toast Bootstrap 4 (petite bulle contenant un message)
   *
   * @param {Object} options
   *    contient les paramètres du toaster:
   *      - backgroundStyles (css class) appliqués au container
   *      - autoHide {boolean} détruire automatiquement le Toast
   *      - delay {ms} délais avant destruction du Toast
   *      - header (message)
   *      - headerStyles (css class) appliqués au header
   *      - icon (font-awesome icon)
   *      - body (message)
   *      - bodyStyles (Array de classes bootstrap)
   *
   * @return {HTMLElement}
   *
   * @constructor
   */
  function Toast(options) {
    // Toast container
    let toast = document.createElement("div");
    toast.classList.add("toast", "ml-auto");
    // Container style
    if (options.backgroundStyles)
      toast.className += " " + options.backgroundStyles.join(" ");
    // Auto Hide
    toast.setAttribute("data-delay", options.delay || "1000");
    toast.setAttribute("data-autohide", typeof options.autoHide !== "undefined" ? options.autoHide : true);


    // Toast Header
    let header = document.createElement("div");
    header.classList.add("toast-header");
    if (!options.header)
      header.classList.add("d-none"); // "display: none;"
    else {
      let strong = document.createElement("strong");
      strong.classList.add("mr-auto");
      // Header style
      if (options.headerStyles)
        strong.className += " " + options.headerStyles.join(" ");
      if (options.icon)
        strong.innerHTML += "<i class='fa " + options.icon + "'></i>&nbsp;";
      strong.innerHTML += options.header;
      header.appendChild(strong);
      header.innerHTML += // '<small class="text-muted">&nbsp;just now</small>' +
        '<button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">\n' +
        '<span aria-hidden="true">×</span>\n</button>';
    }
    toast.appendChild(header);


    // Toast Body
    let body = document.createElement("div");
    body.classList.add("toast-body");
    if (!options.body)
      body.classList.add("d-none");
    else {
      if (options.bodyStyles)
        body.className += " " + options.bodyStyles.join(" ");
      body.innerHTML += options.body;
    }
    toast.appendChild(body);

    return toast;
  }

  function displayToast(toast) {
    currentToasts[toast.id] = toast;
    TOAST_CONTAINER.appendChild(toast);
    $(toast).toast("show");

    return toast;
  }

  /**
   * Hide and Remove Toasts whose "outdated" attribute is "true"
   *  This attribute is set when the Promise that created them (or the full chain) is finished ("finally")
   *  And should be used to destroy the Toast only when the Worker updates the front with new data
   */
  function removeOutdateds () {
    for (let toast in currentToasts) {
      if (currentToasts[toast].getAttribute("outdated") === "true") {

        // Remove DOM element from UI
        $(currentToasts[toast]).toast("hide");
        // Remove object reference (free memory)
        delete currentToasts[toast];
      }
    }
  }

  function getToast(target) {
    if (!target)
      LoggerModule.error("[TOAST.removeTarget] Unable to get Toast without reference or ID");

    let toastId = null;
    if (typeof target === "object" && target.id)
      toastId = target.id;

    if (typeof target === "string")
      toastId = target;

    return currentToasts[toastId];
  }

  /**
   * Hide and Remove a Toast by ID
   * @param {HTMLElement|String} target
   */
  function removeTarget(target) {
    let toast = getToast(target);
    if (toast) {
      toast.remove();
      delete currentToasts[toast.id];
    }
  }

  return {
    getDefaultToastOptions: function() { return DEFAULT_TOAST_OPTIONS; },
    getCurrentToasts: function() { return currentToasts; },

    /**
     * Instancier un Toast Bootstrap à partir d'options
     * @param {Object} options
     *    Contient les paramètres du Toast:
     *      - backgroundStyles (String Array) classes à appliquer au Toast
     *      - headerStyles (String Array) classes à appliquer au header
     *      - head (message) innerHTML du header
     *      - icon (font-awesome) icône dans le header
     *      - bodyStyles (String Array) classes à appliquer au body
     *      - body (message) innerHTML du body
     *
     * @return {HTMLElement}
     */
    create: function (options) {
      if (options.type && DEFAULT_TOAST_OPTIONS[options.type]) {
        let typeDefaultOptionss = DEFAULT_TOAST_OPTIONS[options.type];
        for (let option in typeDefaultOptionss) {
          options[option] = typeDefaultOptionss[option];
        }
      }
      let toast = new Toast(options);
      toast.id = new Date().getTime();
      toast.setAttribute("outdated", false);
      $(toast).on('hidden.bs.toast', function () {
        this.remove();
      });

      return toast;
    },

    /**
     * Instancie et affiche un toast sans valeurs par défaut (pas de style particulier)
     * @param {Object} options
     * @return {HTMLElement}
     */
    log: function (options) {
      return displayToast(this.create(options));
    },

    info: function(options) {
      options.type = "info";
      return displayToast(this.create(options));
    },

    /**
     * Instancie et affiche un Toast "Succès" (vert)
     *
     * @param options
     * @return {HTMLElement}
     */
    success: function (options) {
      options.type = "success";
      return displayToast(this.create(options));
    },

    error: function(options) {
      options.type = "error";
      return displayToast(this.create(options));
    },

    // TODO update style and header/body to that of a success Toast
    turnSuccess: function (target, newOptions) {
      newOptions.type = "success";
      let newToast = this.create(newOptions);
      newToast.id = target.id;
      if (target.classList.contains("show"))
        newToast.classList.add("show");
      if (target.classList.contains("fade"))
        newToast.classList.add("fade");

      target.className = newToast.className;
      target.innerHTML = newToast.innerHTML;
    },

    removeTarget: removeTarget,
    removeOutdateds: removeOutdateds
  }
}

let TOAST = new TOAST_FACTORY();