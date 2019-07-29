function TOAST_FACTORY () {
  let TOAST_CONTAINER_ID = "toast-container",
    TOAST_CONTAINER = document.getElementById(TOAST_CONTAINER_ID);

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
    toast.setAttribute("data-autohide", options.autoHide || true);


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
      header.innerHTML += '<small class="text-muted">&nbsp;just now</small>' +
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

  return {
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
      let toast = new Toast(options);
      $(toast).on('hidden.bs.toast', function () {
        this.remove();
      });

      return toast;
    },
    /**
     * Instancie et affiche un Toast "Succès" (vert)
     *
     * @param options
     * @return {HTMLElement}
     */
    success: function(options) {
      options.headerStyles = ["text-success"];
      options.icon = "fa-check";
      options.backgroundStyles = ["bg-success", "text-white"];

      let success = this.create(options);
      TOAST_CONTAINER.appendChild(success);
      $(success).toast("show");
      return success;
    },

    error: function(options) {
      options.headerStyles = ["text-danger"];
      options.icon = "fa-exclamation-triangle";
      options.backgroundStyles = ["bg-danger", "text-white"];

      let danger = this.create(options);
      TOAST_CONTAINER.appendChild(danger);
      $(danger).toast("show");
      return danger;
    }
  }
}

let TOAST = new TOAST_FACTORY();