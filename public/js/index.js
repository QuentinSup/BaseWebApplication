window.app = (function() {

	var view = {
		app: {
			title: ko.observable('Application Title')
		}
	};

	var run = function() {
		$(document).ready(function() {
			document.title = view.app.title();
			ko.applyBindings(view,  $('#template')[0]);

			$('.view-container').each(function() {
				var $this = $(this);
				var $viewTop = $this.find('> .view-top');
				var $viewLeft = $this.find('> .view-left');
				var $viewRight = $this.find('> .view-right');
				var $viewCenter = $this.find('> .view-center');
				var $viewBottom = $this.find('> .view-bottom');

				$viewLeft.css({ top: $viewTop.height() || 0, bottom: $viewBottom.height() || 0 });
				$viewRight.css({ top: $viewTop.height() || 0, bottom: $viewBottom.height() || 0 });
				$viewCenter.css({ top: $viewTop.height() || 0, left: $viewLeft.width() || 0, right: $viewRight.width() || 0, bottom: $viewBottom.height() || 0 });
				
				$viewTop.on('resize', function(e) {
					$viewLeft.css({ top: $(this).height() });
					$viewRight.css({ top: $(this).height() });
					$viewCenter.css({ top: $(this).height() });
				});
				$viewBottom.on('resize', function(e) {
					$viewLeft.css('bottom', $(this).height());
					$viewRight.css('bottom', $(this).height());
					$viewCenter.css('bottom', $(this).height());
				});
				$viewLeft.on('resize', function(e) {
					$viewCenter.css({ left: $(this).width() });
				});
				$viewRight.on('resize', function(e) {
					$viewCenter.css('right', $(this).width());
				});

			});

		});
	};

	return {
		run: run
	};

})();
	