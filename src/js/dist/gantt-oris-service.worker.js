function OrisServiceWorker() {
  let that = {

  }
}

let API = {
  get: function (url) {
    if (arguments.length < 1)
      throw new Error("[API] GET request 1 parameter (url)");

    return new Promise (function (resolve, reject) {
      let xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);

      xhr.onload = function () {
        // un 404 passe dans onload et pas dans onerror
        if (xhr.status !== 200) {
          reject("Unable to GET (request status: " + xhr.statusText + ")");
        }

        resolve(xhr.responseText);
      };

      xhr.onerror = function () {
        reject(xhr.statusText);
      };
      xhr.send();
    });
  },

  /**
   *
   * @param {string} url
   * @return {JSON}
   */
  getJSON: function (url) {
    return API.get(url)
      .then(function(response) {
        return JSON.parse(response);
      });
  }

};