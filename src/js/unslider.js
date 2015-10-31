/**
 *   Unslider
 *   version 2.0
 *   by @idiot and friends
 */
 
(function($) {
	//  Don't throw errors if we haven't included jQuery
	if(!$) {
		return alert('Unslider requires jQuery to function. Make sure you\'ve included jQuery in the source code before Unslider.');
	}

	$.Unslider = function(context, options) {
		var self = this;

		//  Store our default options in here
		//  Everything will be overwritten by the jQuery plugin though
		self.defaults = {
			//  Should the slider move on its own or only when
			//  you interact with the nav/arrows?
			//  Only accepts boolean true/false.
			autoplay: false,

			//  3 second delay between slides moving, pass
			//  as a number in milliseconds.
			delay: 3000,
			
			//  Does it support keyboard arrows?
			//  Can pass either true or false -
			//  or an object with the keycodes, like so:
			//  {
			//	 prev: 37,
			//	 next: 39
			// }
			//  You can call any internal method name
			//  before the keycode and it'll be called.
			keys: {
				prev: 37,
				next: 39
			},
			
			//  Do you want to generate clickable navigation
			//  to skip to each slide? Only accepts boolean true/false
			nav: true,

			//  Should there be left/right arrows to go back/forth?
			//   -> This isn't keyboard support.
			//  Either set true/false, or an object with the HTML
			//  elements for each arrow like below:
			arrows: {
				prev: '<a class="unslider-arrow prev">Previous slide</a>',
				next: '<a class="unslider-arrow next">Next slide</a>'
			},

			//  How should Unslider animate?
			//  It can do one of the following types:
			//  "fade": each slide fades in to each other
			//  "horizontal": each slide moves from left to right
			//  "vertical": each slide moves from top to bottom
			animation: 'horizontal',

			//  jQuery UI easing type
			//  see jqueryui.com/easing for a full list
			easing: 'swing',

			//  If you don't want to use a list to display your slides,
			//  you can change it here. Not recommended and you'll need
			//  to adjust the CSS accordingly.
			selectors: {
				container: 'ul:first',
				slides: 'li'
			},

			//  Do you want to animate the heights of each slide as
			//  it moves
			animateHeight: true,

			//  Active class for the nav
			activeClass: 'unslider-active',
			lastActiveClass: 'unslider-last-active'
		};

		//  Set defaults
		self.$context = context;
		self.options = {};

		//  Leave our elements blank for now
		//  Since they get changed by the options, we'll need to
		//  set them in the init method.
		self.$parent = null;
		self.$container = null;
		self.$slides = null;
		
		//  Set our indexes and totals
		self.total = 0;
		self.current = 0;

		//  Generate a specific random ID so we don't dupe events
		self.sliderID = ~~(Math.random() * 2e3);
		self.prefix = 'unslider-';
		self.eventSuffix = '.' + self.prefix + self.sliderID;

		//  In case we're going to use the autoplay
		self.interval = null;

		//  Get everything set up innit
		self.init = function(options) {
			//  Set up our options inside here so we can re-init at
			//  any time
			self.options = $.extend(self.defaults, options);

			//  Our elements
			self.$container = self.$context.find(self.options.selectors.container).addClass(self.prefix + 'wrap');
			self.$slides = self.$container.children(self.options.selectors.slides);

			//  We'll manually init the container
			self.setup();

			//  We want to keep this script as small as possible
			//  so we'll optimise some checks
			['nav', 'arrows', 'keys'].forEach(function(module) {
				//  If it's not explicitly set to be false, let's call it
				//  otherwise we'll assume it's turned off.
				if(self.options[module] !== false) {
					self['init' + self._ucfirst(module)]();
				}
			});

			//  Add swipe support
			if(typeof jQuery.event.special['swipe'] !== undefined) {
				self.initSwipe();
			}

			//  If autoplay is set to true, call self.start()
			//  to start calling our timeouts
			self.options.autoplay && self.start();

			//  Everyday I'm chainin'
			return self.setIndex(self.current);
		};

		self.setup = function() {
			//  Add a CSS hook to the main element
			self.$context.addClass(self.prefix + 'slider ' + self.prefix + self.options.animation).wrap('<div class="unslider" />');
			self.$parent = self.$context.parent();

			//  We need to manually check if the container is absolutely
			//  or relatively positioned
			var position = self.$context.css('position');
			var positions = ['relative', 'absolute'];

			//  If we don't already have a position set, we'll
			//  automatically set it ourselves
			if($.inArray(position, positions) < 0) {
				self.$context.css('position', positions[0]);
			}

			self.$context.css('overflow', 'hidden');

			//  We should be able to recalculate slides at will
			self.calculateSlides();
		};

		//  Set up the slide widths to animate with
		//  so the box doesn't float over
		self.calculateSlides = function() {
			self.total = self.$slides.length;

			//  Set the total width
			if(self.options.animation !== 'fade') {
				self.$container.css('width', (self.total * 100) + '%').addClass(self.prefix + 'carousel');
				self.$slides.css('width', (100 / self.total) + '%');
			}
		};


		//  Start our autoplay
		self.start = function() {
			self.interval = setTimeout(function() {
				//  Move on to the next slide
				self.next();

				//  And restart our timeout
				self.start();
			}, self.options.delay);
		};

		//  And pause our timeouts
		//  and force stop the slider if needed
		self.stop = function() {
			clearTimeout(self.interval);
		};


		//  Set up our navigation
		self.initNav = function() {
			var $nav = $('<nav class="' + self.prefix + 'nav"><ol /></nav>');

			//  Build our click navigation item-by-item
			self.$slides.each(function(key) {
				//  Each slide should have a label
				var label = 'Slide ' + (key + 1);

				//  If we've already set a label, let's use that
				//  instead of generating one
				if(this.getAttribute('data-nav')) {
					label = this.getAttribute('data-nav');
				}

				//  And add it to our navigation item
				$nav.children('ol').append('<li data-slide="' + key + '">' + label + '</li>');
			});
			
			//  Now our nav is built, let's add it to the slider and bind
			//  for any click events on the generated links
			$nav.insertAfter(self.$context).find('li').on('click' + self.eventSuffix, function() {
				//  Cache our link and set it to be active
				var $me = $(this).addClass(self.options.activeClass);

				//  Set the right active class, remove any other ones
				$me.siblings().removeClass(self.options.activeClass);

				//  Move the slide
				self.animate($me.attr('data-slide'));
			});
		};


		//  Set up our left-right arrow navigation
		//  (Not keyboard arrows, prev/next buttons)
		self.initArrows = function() {
			if(self.options.arrows === true) {
				self.options.arrows = $.Unslider.defaults.arrows;
			}

			//  Loop our options object and bind our events
			$.each(self.options.arrows, function(key, val) {
				//  Add our arrow HTML and bind it
				$(val).insertAfter(self.$context).on('click' + self.eventSuffix, self[key]);
			});
		};


		//  Set up our keyboad navigation
		//  Allow binding to multiple keycodes
		self.initKeys = function() {
			if(self.options.keys === true) {
				self.options.keys = $.Unslider.defaults.keys;
			}

			$(document).on('keyup' + self.eventSuffix, function(e) {
				$.each(self.options.keys, function(key, val) {
					if(e.which === val) {
						$.isFunction(self[key]) && self[key].call(self);
					}
				});
			});
		};

		//  Requires jQuery.event.swipe
		//  -> stephband.info/jquery.event.swipe
		self.initSwipe = function() {
			var width = self.$slides.width();

			self.$container.on({
				swipeleft: self.next,
				swiperight: self.prev,

				movestart: function(e) {
					//  If the movestart heads off in a upwards or downwards
					//  direction, prevent it so that the browser scrolls normally.
					if((e.distX > e.distY && e.distX < -e.distY) || (e.distX < e.distY && e.distX > -e.distY)) {
						return !!e.preventDefault();
					}

					self.$container.css('position', 'relative');
				}
			});

			//  We don't want to have a tactile swipe in the slider
			//  in the fade animation, as it can cause some problems
			//  with layout, so we'll just disable it.
			if(self.options.animation !== 'fade') {
				self.$container.on({
					move: function(e) {
						self.$container.css('left', (100 * e.distX / width) + '%');
					},

					moveend: function(e) {
						self.$container.animate({left: 0}, 200);
					}
				});
			}
		};

		//  Unset the keyboard navigation
		//  Remove the handler 
		self.destroyKeys = function() {
			//  Remove the event handler
			$(document).off('keyup' + self.eventSuffix);
		};

		self.setIndex = function(to) {
			if(to < 0) {
				to = self.total - 1;
			}

			self.current = Math.min(Math.max(0, to), self.total - 1);

			if(self.options.nav) {
				self.$parent.find('.' + self.prefix + 'nav [data-slide="' + to + '"]')._toggleActive(self.options.activeClass);
			}

			self.$slides.eq(self.current)._toggleActive(self.options.activeClass);

			return this;
		};
		
		//  Despite the name, this doesn't do any animation - since there's
		//  now three different types of animation, we let this method delegate
		//  to the right type, keeping the name for backwards compat.
		self.animate = function(to, dir) {
			//  Animation shortcuts
			//  Instead of passing a number index, we can now
			//  use .data('unslider').animate('last');
			//  to go to the very last slide
			if(to === 'first') to = 0;
			if(to === 'last') to = self.total;

			self.setIndex(to);

			//  Delegate the right method - everything's named consistently
			//  so we can assume it'll be called "animate" + 
			var fn = 'animate' + self._ucfirst(self.options.animation);

			//  Make sure it's a valid animation method, otherwise we'll get
			//  a load of bug reports that'll be really hard to report
			if($.isFunction(self[fn])) {
				return self[fn](self.current, dir);
			}
		};


		//  Shortcuts for animating if we don't know what the current
		//  index is (i.e back/forward)
		//  For moving forward we need to make sure we don't overshoot.
		self.next = function() {
			var target = self.current + 1;

			//  If we're at the end, we need to move back to the start
			if(target >= self.total) {
				target = 0;
			}

			return self.animate(target, 'next');
		};

		//  Previous is a bit simpler, we can just decrease the index
		//  by one and check if it's over 0.
		self.prev = function() {
			return self.animate(self.current - 1, 'prev');
		};
		

		//  Our default animation method, the old-school left-to-right
		//  horizontal animation
		self.animateHorizontal = function(to) {
			if(self.options.animateHeight) {
				var height = self.$slides.eq(to).height();

				self.$context.css('height', height);
			}

			return self.$container._transform('translateX(-' + ((100 / self.total) * to) + '%)');
		};


		//  Fade between slides rather than, uh, sliding it
		self.animateFade = function(to, dir) {
			var $active = self.$slides.removeClass(self.options.lastActiveClass).eq(to);
			var $prev = $active.prev();

			if(!$prev.length) {
				$prev = self.$slides.last();
			}

			if(dir === 'prev') {
				//  @TODO: fix fading backwards
			}

			//  Toggle our classes
			$prev.addClass(self.options.lastActiveClass).removeClass(self.options.activeClass);
			$active.removeClass(self.options.lastActiveClass).addClass(self.options.activeClass);
		};


		//  Everything beginning with _ is a helper method and shouldn't be
		//  used externally if you can jolly well help it.

		//  Unfortunately JavaScript doesn't have a ucfirst() function
		//  (one of the good things about PHP!) so this is a workaround for that
		self._ucfirst = function(str) {
			//  Take our variable, run a regex on the first letter
			return str.toString().toLowerCase().replace(/^./, function(match) {
				//  And uppercase it. Simples.
				return match.toUpperCase();
			});
		};

		//  Allow daisy-chaining of methods
		return self.init(options);
	};

	//  Internal (but global) jQuery methods
	//  They're both just helpful types of shorthand for
	//  anything that might take too long to write out or
	//  something that might be used more than once.
	$.fn._toggleActive = function(className) {
		return this.addClass(className).siblings().removeClass(className);
	};

	$.fn._transform = function(val) {
		return this.css({
			webkitTransform: val, msTransform: val, transform: val
		});
	};

	//  And set up our jQuery plugin
	$.fn.unslider = function(opts) {
		return this.each(function() {
			var $this = $(this);

			//  Allow usage of .unslider('function_name')
			//  as well as using .data('unslider') to access the
			//  main Unslider object
			if(typeof opts === 'string' && $this.data('unslider')) {
				opts = opts.split(':');

				var fn = opts[0];

				if(opts[1]) {
					var args = opts[1].split(',');
					return $.isFunction($this.data('unslider')[fn]) && $this.data('unslider')[fn].apply($this, args);
				}

				return $.isFunction($this.data('unslider')[fn]) && $this.data('unslider')[fn]();
			}

			return $this.data('unslider', new $.Unslider($this, opts));
		});
	};
	
})(window.jQuery || false);