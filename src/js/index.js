/**
 * Initialisation et UI
 **/





/**
 *  Worker Handling / Exchanges
 **/
// TODO implémenter les échanges main page / Worker
self.addEventListener("message", function (e) {
  if (e.data.LoggerModule) {
    LoggerModule.info("e.data.LoggerModule", e.data.LoggerModule);
  }
});