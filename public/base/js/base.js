var app = (function() {

	// private functions

	var _makeResizable = function($el, handles) {
		if($el.attr('data-resizable') == 'true') {
			console.log($el, handles);
			$el.resizable({ handles: handles, ghost: false });
		}
	};

	var _bindResizeEvents = function() {
		$('.uispace').each(function() {
			var $this = $(this);
			var $viewTop = $this.find('> .uispace-top');
				_makeResizable($viewTop, 's');
			var $viewLeft = $this.find('> .uispace-left');
				_makeResizable($viewLeft, 'e');
			var $viewRight = $this.find('> .uispace-right');
				_makeResizable($viewRight, 'w');
			var $viewCenter = $this.find('> .uispace-center');
			var $viewBottom = $this.find('> .uispace-bottom');
				_makeResizable($viewBottom, 'n');

			$viewLeft.css({ top: $viewTop.outerHeight() || 0, bottom: $viewBottom.outerHeight() || 0 });
			$viewRight.css({ top: $viewTop.outerHeight() || 0, bottom: $viewBottom.outerHeight() || 0 });
			$viewCenter.css({ top: ($viewTop.outerHeight() || 0), left: $viewLeft.outerWidth() || 0, right: $viewRight.outerWidth() || 0, bottom: $viewBottom.outerHeight() || 0 });
			
			$viewTop.on('resize', function(e) {
				var $top = $(this);
				if($this.is(':visible')) {
					$viewLeft.css({ top: $top.outerHeight() });
					$viewRight.css({ top: $top.outerHeight() });
					$viewCenter.css({ top: $top.outerHeight() });
				}
			});
			$viewBottom.on('resize', function(e) {
				var $left = $(this);
				if($this.is(':visible')) {
					$viewLeft.css('bottom', $left.outerHeight());
					$viewRight.css('bottom', $left.outerHeight());
					$viewCenter.css('bottom', $left.outerHeight());
				}
			});
			$viewLeft.on('resize', function(e) {
				if($this.is(':visible')) {
					$viewCenter.css('left', $(this).outerWidth());
				}
			});
			$viewRight.on('resize', function(e) {
				if($this.is(':visible')) {
					$viewCenter.css('right', $(this).outerWidth());
				}
			});

		});
	};

	var _bindListEvents = function() {

		$('[data-role="list"]').each(function() {
			var $this = $(this);
			$this.find('> li').on('click', function() {
				$this.find('> li').removeClass('selected');
				$(this).addClass('selected');
			});
		});

	};

	var _$hashActiveElement = null;
	var _bindHashEvents = function() {

		location.hash = '';
        $(window).bind('hashchange', function(event) {
        	if(_$hashActiveElement) {
        		_$hashActiveElement.hide();
        	}
            var hashtag = location.hash.replace( /^#/, '' );
            _$hashActiveElement = $('#' + hashtag);
           _$hashActiveElement.show();
        });
	};

	// public functions

	var run = function(view) {

		view = $.extend({
			app: {
				title: ko.observable('')
			}
		}, view);

		document.title = view.app.title();
		ko.applyBindings(view,  $('body')[0]);

		$(document).ready(function() {

			// Init DOM
			_bindResizeEvents();
			_bindHashEvents();
			_bindListEvents();
			

		});
	};


	var exports = {
		run: run
	};

	return exports;

})();