/**
 * @author  Adapted for Parse by Michael Kamphausen <michael.kamphausen@apploft.de>
 * @author  John Resig <jeresig@gmail.com>
 * @author  Originally by Marcus Spiegel <marcus.spiegel@gmail.com>
 * @link    https://github.com/apploft/parse-i18n
 * @license http://opensource.org/licenses/MIT
 *
 * @version 0.5.0
 */

// dependencies
var vsprintf = require("sprintf.js").vsprintf,
	path = require("path");

var i18n = module.exports = function(opt) {
	var self = this;

	// Put into dev mode as default
	this.devMode = false;

	// Copy over options
	for (var prop in opt) {
		this[prop] = opt[prop];
	}

	// you may register helpers in global scope, up to you
	if (typeof this.register === "object") {
		i18n.resMethods.forEach(function(method) {
			self.register[method] = self[method].bind(self);
		});
	}

	// implicitly read all locales
	// if it's an array of locale names, read in the data
	if (opt.locales && opt.locales.forEach) {
		this.locales = {};

		opt.locales.forEach(function(locale) {
			self.readFile(locale);
		});

		this.defaultLocale = opt.locales[0];
	}

	// Set the locale to the default locale
	this.setLocale(this.defaultLocale);

	// Check the defaultLocale
	if (!this.locales[this.defaultLocale]) {
		console.error("Not a valid default locale.");
	}

	if (this.request) {
		if (this.subdomain) {
			this.setLocaleFromSubdomain(this.request);
		}

		if (this.query !== false) {
			this.setLocaleFromQuery(this.request);
		}

		this.prefLocale = this.preferredLocale();
	}
};

i18n.version = "0.5.0";

i18n.localeCache = {};
i18n.resMethods = ["__", "__n", "getLocale", "isPreferredLocale"];

i18n.expressBind = function(app, opt) {
	if (!app) {
		return;
	}

	app.use(function(req, res, next) {
		opt.request = req;
		req.i18n = new i18n(opt);

		// Express 3
		if (res.locals) {
			i18n.registerMethods(res.locals, req)
		}

		next();
	});

	// Express 2
	if (app.dynamicHelpers) {
		app.dynamicHelpers(i18n.registerMethods({}));
	}
};

i18n.registerMethods = function(helpers, req) {
	i18n.resMethods.forEach(function(method) {
		if (req) {
			helpers[method]	= req.i18n[method].bind(req.i18n);
		} else {
			helpers[method] = function(req) {
				return req.i18n[method].bind(req.i18n);
			};	
		}
		
	});

	return helpers;
};

i18n.prototype = {
	defaultLocale: "en",
	extension: ".js",
	directory: "./cloud/locales",
	cookieName: "lang",

	__: function() {
		var msg = this.translate(this.locale, arguments[0]);

		if (arguments.length > 1) {
			msg = vsprintf(msg, Array.prototype.slice.call(arguments, 1));
		}

		return msg;
	},

	__n: function(singular, plural, count) {
		var msg = this.translate(this.locale, singular, plural);

		msg = vsprintf(parseInt(count, 10) > 1 ? msg.other : msg.one, [count]);

		if (arguments.length > 3) {
			msg = vsprintf(msg, Array.prototype.slice.call(arguments, 3));
		}

		return msg;
	},

	setLocale: function(locale) {
		
		if (!locale) return;
		
		if (!this.locales[locale]) {
			if (this.devMode) {
				console.warn("Locale (" + locale + ") not found.");
			}

			locale = this.defaultLocale;
		}

		return (this.locale = locale);
	},

	getLocale: function() {
		return this.locale;
	},

	isPreferredLocale: function() {
		return !this.prefLocale ||
			this.prefLocale === this.getLocale();
	},

	setLocaleFromQuery: function(req) {
		req = req || this.request;

		if (!req || !req.query || !req.query.lang) {
			return;
		}

		var locale = req.query.lang.toLowerCase();

		if (this.locales[locale]) {
			if (this.devMode) {
				console.log("Overriding locale from query: " + locale);
			}

			this.setLocale(locale);
		}
	},

	setLocaleFromSubdomain: function(req) {
		req = req || this.request;

		if (!req || !req.headers || !req.headers.host) {
			return;
		}

		if (/^([^.]+)/.test(req.headers.host) && this.locales[RegExp.$1]) {
			if (this.devMode) {
				console.log("Overriding locale from host: " + RegExp.$1);
			}

			this.setLocale(RegExp.$1);
		}
	},

	setLocaleFromCookie: function(req) {
		req = req || this.request;

		if (!req || !req.cookies || !this.cookieName || !req.cookies[this.cookieName]) {
			return;
		}

		var locale = req.cookies[this.cookieName].toLowerCase();

		if (this.locales[locale]) {
			if (this.devMode) {
				console.log("Overriding locale from cookie: " + locale);
			}

			this.setLocale(locale);
		}
	},

	preferredLocale: function(req) {
		req = req || this.request;

		if (!req || !req.headers) {
			return;
		}

		var accept = req.headers["accept-language"] || "",
			regExp = /(^|,\s*)([a-z-]+)/gi,
			self = this,
			prefLocale;

		while ((match = regExp.exec(accept))){
			var locale = match[2];
			var parts = locale.split("-");

			if (!prefLocale) {
				if (self.locales[locale]) {
					prefLocale = locale;
				} else if (parts.length > 1 && self.locales[parts[0]]) {
					prefLocale = parts[0];
				}
			}
		}

		return prefLocale || this.defaultLocale;
	},

	// read locale file and translate a msg
	translate: function(locale, singular, plural) {
		if (singular == undefined) {
		  return "";
		}
		
		if (!locale || !this.locales[locale]) {
			if (this.devMode) {
				console.warn("WARN: No locale found. Using the default (" +
					this.defaultLocale + ") as current locale");
			}

			locale = this.defaultLocale;

			this.initLocale(locale, {});
		}

		if (!this.locales[locale][singular]) {
			if (this.devMode) {
				console.warn("WARN: Key '" + singular + "' not found in locale " + locale + 
				  ". Using the key as translation.");
			}
			
			this.locales[locale][singular] = plural ?
				{ one: singular, other: plural } :
				singular;
		}
		
		return this.locales[locale][singular];
	},

	// try reading a file
	readFile: function(locale) {
		var file = this.locateFile(locale);

		if (!this.devMode && i18n.localeCache[file]) {
			this.initLocale(locale, i18n.localeCache[file]);
			return;
		}

		try {
			var localeFile = require(file);

			try {
				// parsing filecontents to locales[locale]
				this.initLocale(locale, localeFile);

			} catch (e) {
				console.error('unable to parse locales from file (maybe ' + file +
					' is empty or invalid json?): ' + e.message);
			}

		} catch (e) {
			console.error("unable to read file " + file + ": " + e.message);
		}
	},

	// basic normalization of filepath
	locateFile: function(locale) {
		return path.normalize(this.directory + '/' + locale + this.extension);
	},

	initLocale: function(locale, data) {
		if (!this.locales[locale]) {
			this.locales[locale] = data;

			// Only cache the files when we're not in dev mode
			if (!this.devMode) {
			    var file = this.locateFile(locale);
				if ( !i18n.localeCache[file] ) {
			    	i18n.localeCache[file] = data;
				}
			}
		}
	}
};
