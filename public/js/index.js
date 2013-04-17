window.app = (function() {

	var view = {
		app: {
			title: ko.observable('Application')
		}
	};

	var run = function() {
		$(document).ready(function() {
			ko.applyBindings(view,  $('#template')[0]);
		});
	};

	return {
		run: run
	};

})();
	