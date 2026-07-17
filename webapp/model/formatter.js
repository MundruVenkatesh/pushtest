sap.ui.define([
    
], function () {
    "use strict";

    return {
        getExportBtnEnable: function(sData){
            if(sData.length > 0){
                return true;
            }else{
                return false;
            }
        },

        getSaveBtnEnable: function(sBrowseData, sChangedData){
            if(sBrowseData || sChangedData.length > 0){
                return true;
            }else {
                return false;
            }
        },

        getFileType: function (sFileType) {
            return sFileType.slice(1).toUpperCase();
        }
        
    };

});