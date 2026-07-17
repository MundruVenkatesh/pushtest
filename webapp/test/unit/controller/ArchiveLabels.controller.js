/*global QUnit*/

sap.ui.define([
	"comarchivelabels/zesparchivelabels/controller/ArchiveLabels.controller"
], function (Controller) {
	"use strict";

	QUnit.module("ArchiveLabels Controller");

	QUnit.test("I should test the ArchiveLabels controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
