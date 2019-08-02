/**
 * Alerte custom pour les messages d'erreur importants (modal)
 * Extend existing 'alert' dialog
 */
if(!alertify.postErrorAlert){
  //define a new errorAlert base on alert
  alertify.dialog('postErrorAlert',function factory(e){
    return {
      build: function(){
        let errorHeader = '<span class="fa fa-exclamation-triangle fa-2x" '
          +    'style="vertical-align:middle;color:#e10000;">'
          + '</span> Error';
        this.setHeader(errorHeader);
      }
    };
  }, false, 'alert');
}

/**
 * Bootstrap Modal for Point Deletion
 * TODO extériorisé l'initialisation du modal de suppression, actuellement dans
let BOOTSTRAP_MODAL_FACTORY = function () {
  let deletePoint = function (userOptions) {
    let modalTemplate = `<div class="modal" id="delete-point-modal" role="dialog" aria-modal="true" style="display: block; ">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-0">
      
          <!-- Modal body -->
          <div class="modal-body text-center">
            <span class="mr-3">
              <i class="fa fa-trash fa-3x" style="color: red; vertical-align: super; " alt="Generic placeholder image"></i>
            </span>
            
            <div style="display: inline-block; text-align: justify;">
              <h4>Delete <span id="delete-point-label">&lt;Label de point&gt;</span> ?</h4>
              <span class="text-secondary">This action cannot be undone</span>
            </div>
        </div>
          
          <!-- Modal footer -->
      <div class="modal-footer">
        <div class="mx-auto">
          <button type="button" class="btn btn-secondary shadow rounded-0 btn-lg mr-2" data-dismiss="modal">
            <i class="fa fa-times"></i>&nbsp;CANCEL
          </button>
        
          <button type="button" class="btn btn-danger shadow rounded-0 btn-lg ml-2">
            <i class="fa fa-check"></i>&nbsp;DELETE
          </button>
        </div>
        
      </div>
          
        </div>
      </div>
    </div>`
  }
}; */