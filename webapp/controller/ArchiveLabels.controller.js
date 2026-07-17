var XLSX;


sap.ui.define([
	"com/archivelabels/zesparchivelabels/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	'sap/ui/core/Fragment',
	"com/archivelabels/zesparchivelabels/model/formatter",
	"sap/ui/core/format/DateFormat",
    'sap/ui/export/Spreadsheet',
    'sap/ui/export/library',
	"com/archivelabels/zesparchivelabels/Libs/jszip",
	"com/archivelabels/zesparchivelabels/Libs/xlsx"
],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (BaseController, JSONModel, MessageBox, Fragment, formatter, DateFormat, Spreadsheet, exportLibrary, jszip, xlsx) {
		"use strict";
		var EdmType = exportLibrary.EdmType;

		return BaseController.extend("com.archivelabels.zesparchivelabels.controller.ArchiveLabels", {
			formatter: formatter,

			onInit: function () {
				var that = this;
				that.count = 0;

				//initialising Filter model  
				var oFilterModel = new JSONModel({
					salesOrg: "",
					invoiceType: "",
					outputType: "",
					langKey: "",
					fileType: "",
					valueType: ""
				});
				that.setModel(oFilterModel, "FilterModel");


				//initialising Report model to store report data
				var oReportModel = new JSONModel({
					tableData: [],
					ActualData: [],
					originalData: [],
					noOfRows: 0,
					startIndex: 0,
					endIndex: 0,
					noOfTableRows: 25,
					isReportDataLoading: false,
					isDataSaving: false,
					isBrowseData: false,
					changedData: [],
                    page: 0,
                    totalPages: 0
				});
				that.setModel(oReportModel, "ReportModel");
				


				//Initialising Search Model to store data of search parameters
				var oSearchModel = new JSONModel({
					BillingTypeData: [],
					LanguangeData: [],
					outputTypeData: [],
					SalesOrgData: [],
					ValueTypeData: [],
					FileTypeData: [],
					IsDetailsLoading: true,
					ApiData: []
				});

				that.setModel(oSearchModel, "SearchModel");

				//Initialising Nav Model to store data of navigation properties
                var oNavModel = new JSONModel ({
                    navButtonsVisible: false,
                    firstPageBtnEnable: false,
                    nextPageBtnEnable: false,
                    previousPageBtnEnable: false,
                    lastPageBtnEnable: false                    
                });

                that.setModel(oNavModel, "NavModel");


				//get Search parameters data
				that.fnGetSearchParametersData();
				

				//checks search parameters data loaded successfully
				var oModel = that.getOwnerComponent().getModel("searchDataModel");
				oModel.attachRequestCompleted(function (oEvent) {
					
					if(oEvent.getParameter("success")){
						that.count = that.count + 1;
					}
					if(that.count === 7){				
					that.getModel("SearchModel").setProperty("/IsDetailsLoading", false);
					}
					
				});

			},

			
			//Displays the error message
			fnDisplayErrorMessage: function () {
                var that = this;
                var msg = that.getResourceBundle().getText("dataError");
                MessageBox.error(msg);
            },

			//get Search parameters data
			fnGetSearchParametersData: function () {
				
				var that = this;

				that.fnReadData("/BillingTypeSet", "/BillingTypeData");
				that.fnReadData("/LanguageSet", "/LanguangeData");
				that.fnReadData("/OutputTypeSet", "/outputTypeData");
				that.fnReadData("/SalesOrgSet", "/SalesOrgData");
				that.fnReadData("/ValueTypeSet", "/ValueTypeData");
				that.fnReadData("/FileTypeF4Set", "/FileTypeData");
				that.fnReadData("/UrlDataSet", "/ApiData");

				
			},

			//Reads the Search parameters data
			fnReadData: function (sEntitySet, sProperty) {
				var that = this;
				var oModel = that.getOwnerComponent().getModel("searchDataModel");
				
				oModel.read(sEntitySet, {
					success: function (oData) {
						
						that.getModel("SearchModel").setProperty(sProperty, oData.results);
					},
					error: function (oError) {
						//To display error message
						that.fnDisplayErrorMessage();
						that.getModel("SearchModel").setProperty("/IsDetailsLoading", false);
					}
				});
			},

			//gets labels data based on filter parameters
			onSearch: function () {
				var that = this;
				//Reset the sort dialog
				that._SortDialog = undefined;

				// Resets the browse file data
				that.fnResetBrowse();
				//To Reset the table data 
				that.fnResetData();

				that.getModel("ReportModel").setProperty("/isReportDataLoading", true);

				var salesOrg = that.fnCheckData(that.getModel("FilterModel").getProperty("/salesOrg"));
				var invoiceType = that.fnCheckData(that.getModel("FilterModel").getProperty("/invoiceType"));
				var outputType = that.fnCheckData(that.getModel("FilterModel").getProperty("/outputType"));
				var langKey = that.fnCheckData(that.getModel("FilterModel").getProperty("/langKey"));
				var fileType = that.fnCheckData(that.getModel("FilterModel").getProperty("/fileType"));
				var valueType = that.fnCheckData(that.getModel("FilterModel").getProperty("/valueType"));

				var apiData = that.getModel("SearchModel").getProperty("/ApiData");

				var requestBody = {
					"salesOrg": salesOrg,
					"invoiceType": invoiceType,
					"outputType": outputType,
					"langKey": langKey,
					"valueType": valueType,
					"fileType": fileType,
					"description": null,
					"fileGroupId": null
				};


				var settings = {
					"crossDomain": true,
					"async": true,
					"url": apiData[0].Url + "document/archive",
					"method": "POST",
					"timeout": 0,
					"headers": {
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
						"cache-control": "no-cache",
						"client_id": apiData[0].ClientId,
						"client_secret": apiData[0].SecreteCode,
						"Content-Type": "application/json",
						"system": "sap"
					},
					"data": JSON.stringify(requestBody),
				};

				
				$.ajax(settings).success(function (response) {
					
					that.getModel("ReportModel").setProperty("/originalData", response.resultSet);
					that.getModel("ReportModel").setProperty("/ActualData", JSON.parse(JSON.stringify(response.resultSet)));

					that.getModel("ReportModel").setProperty("/noOfRows", response.resultSet.length);
					that.getModel("ReportModel").setProperty("/isBrowseData", false);
					that.getModel("ReportModel").setProperty("/isReportDataLoading", false);
					//To get first page data of table
					that.onFirstPress();
					//To set nav buttons visible
					that.fnSetButtonsVisible();
				}).error(function (error) {
					
					if (error.responseJSON.errorMessage) {
						MessageBox.error(error.responseJSON.errorMessage);
					} else {
						//To display error message
						that.fnDisplayErrorMessage();
					}
					that.getModel("ReportModel").setProperty("/isReportDataLoading", false);
				});

			},

			//checks data available or not. If no data present returns null
			fnCheckData: function (data) {
				if (data.length > 0) {
					return data;
				} else {
					return null;
				}
			},

			//Reads the browsed data
			onBrowsePress: function (oEvent) {
				var that = this;
				//To clear search parameters selected data
				that.onClear();
				//To Reset the table data
				that.fnResetData();
				//Reset the sort dialog
				that._SortDialog = undefined;
				that.getModel("ReportModel").setProperty("/isReportDataLoading", true);
				
				
				var files = oEvent.getParameter("files"); 
				var f = files[0]; // FileList object   

				if (f) {
					var reader = new FileReader();
					reader.onload = function (e) {
						var data = e.target.result;
						var workbook = XLSX.read(data, {
							type: 'binary'
						});

						workbook.SheetNames.forEach(function (sheetName) {
							// Here is your object
							var XL_row_object = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
							var json_object = JSON.stringify(XL_row_object);
							var data = JSON.parse(json_object);


							for (var k = 0; k < data.length; k++) {
								var sItem = data[k];
								Object.keys(sItem).forEach(function (key) {
									if (key.includes("sales_org")) {
										sItem["salesOrg"] = sItem["sales_org"];
										delete sItem["sales_org"];
									} else if (key.includes("invoice_type")) {
										sItem["invoiceType"] = sItem["invoice_type"];
										delete sItem["invoice_type"];
									} else if (key.includes("output_type")) {
										sItem["outputType"] = sItem["output_type"];
										delete sItem["output_type"];
									} else if (key.includes("lang_key")) {
										sItem["langKey"] = sItem["lang_key"];
										delete sItem["lang_key"];
									} else if (key.includes("value_type")) {
										sItem["valueType"] = sItem["value_type"];
										delete sItem["value_type"];
									} else if (key.includes("file_type")) {
										sItem["fileType"] = sItem["file_type"];
										delete sItem["file_type"];
									} else if (key.includes("description")) {
										sItem["descriptions"] = sItem["description"];
										delete sItem["description"];
									} else if (key === "file_group") {
										sItem["fileGroup"] = sItem["file_group"];
										delete sItem["file_group"];
									} else if (key === "fg_id") {
										sItem["fileGid"] = sItem["fg_id"];
										delete sItem["fg_id"];
									}
																	
									
								});
								
								
							}


							that.getModel("ReportModel").setProperty("/originalData", data);
							that.getModel("ReportModel").setProperty("/ActualData", JSON.parse(JSON.stringify(data)));
							that.getModel("ReportModel").setProperty("/noOfRows", data.length);
							that.getModel("ReportModel").setProperty("/isBrowseData", true);
							that.getModel("ReportModel").setProperty("/isReportDataLoading", false);
							//set first selected number of visible rows to table
							that.onFirstPress();
							//set nav buttons visibility
							that.fnSetButtonsVisible();

						});

					};

					reader.onerror = function (ex) {
						//To display error message
						that.fnDisplayErrorMessage();
						that.getModel("ReportModel").setProperty("/isReportDataLoading", false);
					};

					reader.readAsBinaryString(f);

				}else{
					that.getModel("ReportModel").setProperty("/isReportDataLoading", false);
				}

				

			},

			//set first selected number of visible rows to table
			onFirstPress: function () {
				var that = this;
				var data = that.getModel("ReportModel").getProperty("/originalData");
				var noOfTableRows = parseInt(that.getModel("ReportModel").getProperty("/noOfTableRows"));

				var newData = data.slice(0, noOfTableRows);

				that.getModel("ReportModel").setProperty("/tableData", newData);
				that.getModel("ReportModel").setProperty("/startIndex", 0);
				that.getModel("ReportModel").setProperty("/endIndex", noOfTableRows - 1);

				that.getModel("ReportModel").setProperty("/page", 1);
				//To enable nav buttons
				that.fnNavButtonsEnable();

			},

			//set previous selected number of visible rows to table
			onPreviousPress: function () {
				var that = this;
				var data = that.getModel("ReportModel").getProperty("/originalData");
				var noOfTableRows = parseInt(that.getModel("ReportModel").getProperty("/noOfTableRows"));
				var startIndex = that.getModel("ReportModel").getProperty("/startIndex");

				var newData = data.slice(startIndex - noOfTableRows, startIndex);

				that.getModel("ReportModel").setProperty("/tableData", newData);
				that.getModel("ReportModel").setProperty("/startIndex", startIndex - noOfTableRows);
				that.getModel("ReportModel").setProperty("/endIndex", startIndex - 1);

				that.getModel("ReportModel").setProperty("/page", that.getModel("ReportModel").getProperty("/page") - 1);

				//To enable nav buttons
				that.fnNavButtonsEnable();

			},

			//set next selected number of visible rows to table
			onNextPress: function () {
				var that = this;
				var data = that.getModel("ReportModel").getProperty("/originalData");
				var noOfTableRows = parseInt(that.getModel("ReportModel").getProperty("/noOfTableRows"));
				var endIndex = that.getModel("ReportModel").getProperty("/endIndex");

				var newData = data.slice(endIndex + 1, endIndex + 1 + noOfTableRows);

				that.getModel("ReportModel").setProperty("/tableData", newData);
				that.getModel("ReportModel").setProperty("/startIndex", endIndex + 1);
				that.getModel("ReportModel").setProperty("/endIndex", endIndex + noOfTableRows);

				that.getModel("ReportModel").setProperty("/page", that.getModel("ReportModel").getProperty("/page") + 1);

				//To enable nav buttons
				that.fnNavButtonsEnable();
			},

			//set last selected number of visible rows to table
			onLastPress: function () {
				var that = this;
				var data = that.getModel("ReportModel").getProperty("/originalData");
				var noOfTableRows = parseInt(that.getModel("ReportModel").getProperty("/noOfTableRows"));
				var startIndex;
				var oIndex = data.length % noOfTableRows;
				if (oIndex === 0) {
					startIndex = data.length - noOfTableRows;
				} else {
					startIndex = data.length - oIndex;
				}

				var newData = data.slice(startIndex);

				that.getModel("ReportModel").setProperty("/tableData", newData);
				that.getModel("ReportModel").setProperty("/startIndex", startIndex);
				that.getModel("ReportModel").setProperty("/endIndex", data.length);

				that.getModel("ReportModel").setProperty("/page", Math.ceil(data.length/noOfTableRows) );

				//To enable nav buttons
				that.fnNavButtonsEnable();
			},

			//sets navigations buttons enable
			fnNavButtonsEnable: function () {
				var that = this;
				var data = that.getModel("ReportModel").getProperty("/originalData");
				var noOfTableRows = parseInt(that.getModel("ReportModel").getProperty("/noOfTableRows"));
				var startIndex = that.getModel("ReportModel").getProperty("/startIndex");
				var endIndex = that.getModel("ReportModel").getProperty("/endIndex");

				that.getModel("ReportModel").setProperty("/totalPages", Math.ceil(data.length/noOfTableRows) );
                
				if (data.length > endIndex + 1) {
                    
                    that.getView().getModel("NavModel").setProperty("/nextPageBtnEnable", true);
                    that.getView().getModel("NavModel").setProperty("/lastPageBtnEnable", true);

                } else {
                    
                    that.getView().getModel("NavModel").setProperty("/nextPageBtnEnable", false);
                    that.getView().getModel("NavModel").setProperty("/lastPageBtnEnable", false);
                }

                if (startIndex === 0) {
                    
                    that.getView().getModel("NavModel").setProperty("/previousPageBtnEnable", false);
                    that.getView().getModel("NavModel").setProperty("/firstPageBtnEnable", false);
                } else {
                   
                    that.getView().getModel("NavModel").setProperty("/previousPageBtnEnable", true);
                    that.getView().getModel("NavModel").setProperty("/firstPageBtnEnable", true);
                }
			},

			//sets navigations buttons visible
			fnSetButtonsVisible: function () {
				var that = this;
				var noOfRows = that.getModel("ReportModel").getProperty("/noOfRows");

				if (noOfRows > 0) {
					that.getView().getModel("NavModel").setProperty("/navButtonsVisible", true);    

                } else {
					that.getView().getModel("NavModel").setProperty("/navButtonsVisible", false);                  
                }

			},

			//Exports the table data
			onPressExport: function () {
                var that = this;
                var aCols, oSettings, oSheet;
				var data = that.getModel("ReportModel").getProperty("/ActualData");

				if (data.length === 0) {
					var msg = that.getResourceBundle().getText("expErrMsg");
					MessageBox.information(msg);
					return;
				}

                
                //To get columns for export
                aCols = that.createColumnConfig();

                var dateFormat = DateFormat.getDateInstance({ pattern: "YYYYMMdd_HHmmss" });
                var fileName = "Archive Labels Data " + dateFormat.format(new Date());

                oSettings = {
                    workbook: {
                        columns: aCols

                    },
                    dataSource: data,
                    fileName: fileName,

                    showProgress: false
                };

                oSheet = new Spreadsheet(oSettings);
                oSheet.build().finally(function () {
                    oSheet.destroy();
                });
            },

			//Creates columns for export
            createColumnConfig: function () {

                var aCols = [];

                aCols.push({
                    label: 'sales_org',
                    property: 'salesOrg',
                    type: EdmType.String

                });

                aCols.push({
                    label: 'invoice_type',
                    property: 'invoiceType',
                    type: EdmType.String
                });

                aCols.push({
                    label: 'output_type',
                    property: 'outputType',
                    type: EdmType.String
                });

                aCols.push({
                    label: 'lang_key',
                    property: 'langKey',
                    type: EdmType.String
                });

                aCols.push({
                    label: 'value_type',
                    property: 'valueType',
                    type: EdmType.String
                });

                aCols.push({
                    label: 'file_type',
                    property: 'fileType',
                    type: EdmType.String
                });

                aCols.push({
                    label: 'fg_id',
                    property: 'fileGid',
                    type: EdmType.String
                });

                aCols.push({
                    label: 'file_group',
                    property: 'fileGroup',
                    type: EdmType.String
                });

                aCols.push({
                    label: 'description',
                    property: 'descriptions',
                    type: EdmType.String
                });

                

                return aCols;
            },

			//stores description modified rows
			fnDescriptionChange: function (oEvent) {
				var that = this;
				var index = oEvent.getSource().getBindingContext("ReportModel").sPath.split("/")[2];
				var oSelectedRow = that.getModel("ReportModel").getData().tableData[index];
				var oChangedData = that.getModel("ReportModel").getProperty("/changedData");
				var flag = true;
				oChangedData.forEach(function (data) {
					if (data.salesOrg === oSelectedRow.salesOrg && data.invoiceType === oSelectedRow.invoiceType && data.outputType === oSelectedRow.outputType && data.langKey === oSelectedRow.langKey && data.valueType === oSelectedRow.valueType && data.fileType === oSelectedRow.fileType) {
						data.descriptions = oSelectedRow.descriptions;
						flag = false;
					}
				});
				if (flag) {
					oChangedData.push(oSelectedRow);
				}
				that.getModel("ReportModel").setProperty("/changedData", oChangedData);

			},


			
			//saves the modified data
			fnSave: function () {
				var that = this;
				that.getModel("ReportModel").setProperty("/isDataSaving", true);
				var apiData = that.getModel("SearchModel").getProperty("/ApiData");
				

				var oSaveData = that.getDataForSave();

				//Shows error message if not data is modified
				if (oSaveData.length === 0) {
					var msg = that.getResourceBundle().getText("valSaveErrMsg");
					MessageBox.information(msg);
					that.getModel("ReportModel").setProperty("/isDataSaving", false);
					return;
				}

				var requestBody = [];

				oSaveData.forEach(function (saveData) {
					var data = {
						"salesOrg": saveData.salesOrg,
						"invoiceType": saveData.invoiceType,
						"outputType": saveData.outputType,
						"langKey": saveData.langKey,
						"valueType": saveData.valueType,
						"fileType": saveData.fileType,
						"fileGroup": saveData.fileGroup,
						"fileGid": (saveData.fileGid).toString(),
						"description": saveData.descriptions
					};
					requestBody.push(data);
				});





				var settings = {
					"crossDomain": true,
					"async": true,
					"url": apiData[0].Url + "document/archive",
					"method": "PUT",
					"timeout": 0,
					"headers": {
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
						"cache-control": "no-cache",
						"client_id": apiData[0].ClientId,
						"client_secret": apiData[0].SecreteCode,
						"Content-Type": "application/json",
						"system": "sap"
					},
					"data": JSON.stringify(requestBody),
				};



				$.ajax(settings).success(function (response) {
					if (response.resultSet.length > 0) {
						var msg = that.getResourceBundle().getText("saveErrMsg");
						MessageBox.error(msg.replace("{0}", response.resultSet.length));

						that.getModel("ReportModel").setProperty("/originalData", response.resultSet);
						that.getModel("ReportModel").setProperty("/ActualData", JSON.parse(JSON.stringify(response.resultSet)));
						that.getModel("ReportModel").setProperty("/noOfRows", response.resultSet.length);
						
						//To get first page data of table
						that.onFirstPress();
						//To set nav buttons visible
						that.fnSetButtonsVisible();
					} else {
						
						var msg = that.getResourceBundle().getText("saveSuccessMsg");
						MessageBox.success(msg);
						//To Reset the table data
						that.fnResetData();
						//To reset the file browse data
						that.fnResetBrowse();
						//To clear search parameters selected data
						that.onClear();
						//To set nav buttons visible
						that.fnSetButtonsVisible();
					}
					

					that.getModel("ReportModel").setProperty("/isDataSaving", false);

				}).error(function (error) {
					
					if (error.responseJSON.errorMessage) {
						MessageBox.error(error.responseJSON.errorMessage);
					} else {
						//Display error message for save the data
						var msg = that.getResourceBundle().getText("dataSaveError");
						MessageBox.error(msg);
					}
					that.getModel("ReportModel").setProperty("/isDataSaving", false);
				});


			},

			//Resets the browse property
			fnResetBrowse: function(){
				var that = this;
				that.getView().byId("fileUploader").setValue();
			},

			//Resets the report model
			fnResetData: function () {
				var that = this;

				that.getModel("ReportModel").setProperty("/tableData", []);
				that.getModel("ReportModel").setProperty("/ActualData", []);
				that.getModel("ReportModel").setProperty("/originalData", []);
				that.getModel("ReportModel").setProperty("/noOfRows", 0);
				that.getModel("ReportModel").setProperty("/startIndex", 0);
				that.getModel("ReportModel").setProperty("/endIndex", 0);
				that.getModel("ReportModel").setProperty("/isBrowseData", false);
				that.getModel("ReportModel").setProperty("/changedData", []);
				

			},

			//Gets the data for save. if browse data save all records else save the modified records
			getDataForSave: function () {
				var that = this;
				var isBroweData = that.getModel("ReportModel").getProperty("/isBrowseData");
				
				if (isBroweData) {
					return that.getModel("ReportModel").getProperty("/originalData");
				} else {					
					return that.getModel("ReportModel").getProperty("/changedData");
				}

			},

			//Display a message box when user tries to cancel the modifications
			fnCancel: function () {
				var that = this;
				var msg = that.getResourceBundle().getText("cancelMsgText");
				var title = that.getResourceBundle().getText("cancelTitle");

				MessageBox.show(
					msg, {
					icon: MessageBox.Icon.QUESTION,
					actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
					styleClass: "sapUiSizeCompact",
					title: title,
					onClose: function (oAction) {
						if (oAction === "OK") {
							var oActualData = that.getModel("ReportModel").getProperty("/ActualData");
							that.getModel("ReportModel").setProperty("/originalData", JSON.parse(JSON.stringify(oActualData)));
							that.getModel("ReportModel").setProperty("/changedData", []);

							//To set first page data for table
							that.onFirstPress();
						}
					}
				});

			},

			//Resets filter model data and selected values of search parameters
			onClear: function () {
				var that = this;
				that.getModel("FilterModel").setProperty("/salesOrg", "");
				that.getModel("FilterModel").setProperty("/invoiceType", "");
				that.getModel("FilterModel").setProperty("/outputType", "");
				that.getModel("FilterModel").setProperty("/langKey", "");
				that.getModel("FilterModel").setProperty("/fileType", "");
				that.getModel("FilterModel").setProperty("/valueType", "");

				
				that.getView().byId("salesOrgMCBox").removeAllSelectedItems();
				that.getView().byId("billingTypeMCBox").removeAllSelectedItems();
				that.getView().byId("outputTypeMCBox").removeAllSelectedItems();
				that.getView().byId("langKeyMCBox").removeAllSelectedItems();
				that.getView().byId("valueTypeMCBox").removeAllSelectedItems();
				that.getView().byId("fileTypeMCBox").removeAllSelectedItems();

			},


			//Handles Billing type Selection Finish
			handleBillingTypeSelectionFinish: function (oEvent) {
				var that = this;
				var selectedItems = oEvent.getParameter("selectedItems");

				var oBillingType = [];

				for (var i = 0; i < selectedItems.length; i++) {
					oBillingType.push(selectedItems[i].getKey());
				}

				that.getView().getModel("FilterModel").setProperty("/invoiceType", oBillingType);


			},



			//Handles Output type Selection Finish
			handleoutputTypeSelectionFinish: function (oEvent) {
				var that = this;
				var selectedItems = oEvent.getParameter("selectedItems");

				var oOutputType = [];

				for (var i = 0; i < selectedItems.length; i++) {
					oOutputType.push(selectedItems[i].getKey());
				}

				that.getView().getModel("FilterModel").setProperty("/outputType", oOutputType);

			},

			
			//Handles Language key Selection Finish
			handlelangKeySelectionFinish: function (oEvent) {
				var that = this;
				var selectedItems = oEvent.getParameter("selectedItems");
	
				var oLangKey = [];

				for (var i = 0; i < selectedItems.length; i++) {	
					oLangKey.push(selectedItems[i].getKey());
				}

				that.getView().getModel("FilterModel").setProperty("/langKey", oLangKey);


			},

			
			//Handles Sales org Selection Finish
			handleSalesOrgSelectionFinish: function (oEvent) {
				var that = this;
				var selectedItems = oEvent.getParameter("selectedItems");

				
				var oSalesOrg = [];

				for (var i = 0; i < selectedItems.length; i++) {
					
					oSalesOrg.push(selectedItems[i].getKey());
				}

				that.getView().getModel("FilterModel").setProperty("/salesOrg", oSalesOrg);


			},


			//Handles Value type Selection Finish
			handleValueTypeSelectionFinish: function (oEvent) {
				var that = this;
				var selectedItems = oEvent.getParameter("selectedItems");

				
				var oValueType = [];

				for (var i = 0; i < selectedItems.length; i++) {
					
					oValueType.push(selectedItems[i].getKey());
				}

				that.getView().getModel("FilterModel").setProperty("/valueType", oValueType);


			},

			
			//Handles File type Selection Finish
			handleFileTypeSelectionFinish: function (oEvent) {
				var that = this;
				var selectedItems = oEvent.getParameter("selectedItems");

				
				var oFileType = [];

				for (var i = 0; i < selectedItems.length; i++) {
					
					oFileType.push(selectedItems[i].getKey());
				}

				that.getView().getModel("FilterModel").setProperty("/fileType", oFileType);

			},

			//Open fragment for sorting
            handleSortButtonPressed: function () {
				var that = this;
                var oView = that.getView();
                if (!that._SortDialog) {
                    that._SortDialog = Fragment.load({
                        id: oView.getId(),
                        name: "com.archivelabels.zesparchivelabels.view.fragments.SortDialog",
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    });
                }

                that._SortDialog.then(function (oDialog) {
                    oDialog.open();
                });
            },

			//Sorts the header data based on selection
            handleSortDialogConfirm: function (oEvent) {
				var that = this;
                var mParams = oEvent.getParameters(),
                    sPath,
                    bDescending;
                    
                sPath = mParams.sortItem.getKey();
                bDescending = mParams.sortDescending;
                
                var data = that.getModel("ReportModel").getProperty("/originalData");
                if(bDescending){
                    data.sort((a,b) => (!a[sPath] ) ? 1 : (!b[sPath] ) ? -1 : (a[sPath] === b[sPath]) ? 0 : ((b[sPath] > a[sPath]) ? 1 : -1));
                }else{
                    data.sort((a,b) => (!b[sPath] ) ? 1 : (!a[sPath] ) ? -1 : (b[sPath] === a[sPath]) ? 0 : ((a[sPath] > b[sPath]) ? 1 : -1));
                }

                that.getModel("ReportModel").setProperty("/originalData", data);
				//Creates data for first page of table
                that.onFirstPress();

                
            },





		});
	});
