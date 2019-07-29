/**
 * Controller du Spinner (icône "chargement en cours")
 * @param spinnerId
 * @return {{hideLoading: hideLoading, showLoading: showLoading, spinner: HTMLElement}}
 * @constructor
 */
LoadingOverlayHandler = function (spinnerId) {
  let spinnerRef = document.getElementById(spinnerId),
    loadingMessage = document.getElementById("loading-label");
  if (null === spinnerRef)
    throw new Error("No DOM element found for given ID: '" + spinnerId + "'");

  return {
    spinner: spinnerRef,
    showLoading: function (msg) {
      loadingMessage.innerText = msg || "Chargement";
      spinnerRef.classList.add("active");
    },
    hideLoading: function () {
      setTimeout(function () {
        spinnerRef.classList.remove("active");
      }, 250); // léger délais
    }
  }
};