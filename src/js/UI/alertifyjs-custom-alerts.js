// Extend existing 'alert' dialog
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
  }, false,'alert');
}
