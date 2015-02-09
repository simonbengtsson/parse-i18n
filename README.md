# parse-i18n for Parse.com

 * Designed to work out-of-the-box with Express.js
 * Lightweight simple translation module
 * Stores language files in json files
 * Uses common __('...') syntax in app and templates.
 * No extra parsing needed.
 * optionally access translation methods from frontend JavaScript

## Modifications for Parse Cloud Code
This is a fork of John Resig's [i18n-2](https://github.com/jeresig/i18n-node-2) for node.js based on Marcus Spiegel's [i18n](https://github.com/mashpie/i18n-node). I applied the following modifications to integrate it with the Parse Cloud Code environment:

 * new strings cannot be added on-the-fly to the language json files because there is no write access to local files
 * changed the default directory for locales to _cloud/locales_
 * the language files must have a .js extension and the file content needs to be prefixed with `module.exports = ` (see [Setup Language Files](#setup-language-files)
 * `devMode` cannot be automatically determined from NODE_ENV, so the default value is true
 * optional feature: you can access the translation methods from your frontend JavaScipt by including _i18n.ejs_ in your view templates, see [Inside Your Frontend JavaScript](#inside-frontend-js)

## <a name="installation"></a>Installation

Copy _i18n.js_ to a location of your choice inside the _cloud_ directory, for example _cloud/i18n-parse/i18n.js_.

### <a name="load-configure"></a>Load and Configure with Express.js

In the file where you instantiate and setup your Express.js app, require that _i18n.js_ file and attach the i18n functionality to the request object inside Express.js like so:

	var express = require('express'),
	  app = express(),
	  I18n = require('cloud/i18n-parse/i18n.js');

	I18n.expressBind(app, {
	  "locales": ["en", "fr", "de"]
	});
	
	// Set up the rest of the Express middleware

To learn more about the i18n configuration options like `locales`, see chapter [Configuration](#configuration).

### <a name="setup-language-files"></a>Setup Language Files

Next, you create a directory _cloud/locales_ or anywhere else inside the _cloud_ folder if you don't want to use the default directory path. Add your language files to this directory and name them according to the locale with a .js extension, e.g. _en.js_, _de.js_ …. The .js extension is required, otherwise Parse won't find the language files. The content of your language files is in JSON format with your localization keys and the corresponding values as localized strings. You will need to prefix the JSON with `module.exports = `.
	
An example language file `en.js` inside `cloud/locales/` may look something like:

	module.exports = {
		"Hello": "Hello",
		"Hello %s, how are you today?": "Hello %s, how are you today?",
		"weekend": "weekend",
		"Hello %s, how are you today? How was your %s.": "Hello %s, how are you today? How was your %s.",
		"Hi": "Hi",
		"Howdy": "Howdy",
		"%s cat": {
			"one": "%s cat",
			"other": "%s cats"
		},
		"There is one monkey in the %%s": {
			"one": "There is one monkey in the %%s",
			"other": "There are %d monkeys in the %%s"
		},
		"tree": "tree"
	}

That file can be edited or just uploaded to [webtranslateit](http://docs.webtranslateit.com/file_formats/) for any kind of collaborative translation workflow.

### Set Language

#### From Cookie

	I18n.expressBind(app, {
		locales: ['en', 'de'],
		cookieName: 'locale' // default cookie name is 'lang'
	});

	// This is how you'd set a locale from req.cookies.
	// Don't forget to set the cookie either on the client or in your Express app.
	app.use(function(req, res, next) {
		req.i18n.setLocaleFromCookie();
		next();
	});

#### From Subdomain

	I18n.expressBind(app, {
		locales: ['en', 'de'],
		subdomain: true
	});

#### From Query

	I18n.expressBind(app, {
		locales: ['en', 'de'],
		query: true
	});

#### Manually

    app.param('lang', function(request, response, next, lang) {
    	request.i18n.setLocale(lang);
        next();
    });


## Usage

### Inside Your Express View

	app.get('/', function(request, response) {
		response.render("index", {
			title: request.i18n.__("My Site Title"),
			desc: request.i18n.__("My Site Description")
		});
	});

### Inside Your Templates

(This example uses the EJS templating system.)

	<% include header %>
	<h1><%= __("Welcome to:") %> <%= title %></h1>
	<p><%= desc %></p>
	<% include footer %>
	
### <a name="inside-frontend-js"></a>Inside Your Frontend JavaScript

In case you want to access the i18n translation methods from your frontend JavaScript code, you should copy _i18n.ejs_ to your _views_ directory. Include it in your appropriate EJS template file with `<% include i18n %>`, typically near the closing body tag and before you load your JavaScript code that references the i18n methods. You can use it like this:

	$(function() {
		$("body").on("click", "a[href$='/delete']", function(evt) {
	    if (!confirm(i18n.__("Do you want to permanently delete this object?"))) {
	      	evt.preventDefault();
	    }
	});
	
### Without Express.js

	// Load Module and Instantiate
	var i18n = new (require('cloud/i18n-parse/i18n.js'))({
		// setup some locales - other locales default to the first locale
		locales: ['en', 'de']
	});

	// Use it however you wish
	console.log( i18n.__("Hello!") );

## API

### `new I18n(options)`

The `I18n` function is the return result from calling `require('cloud/i18n-parse/i18n.js')`. You use this to instantiate an `I18n` instance and set any configuration options. You'll probably only do this if you're not using the `expressBind` method.

### `I18n.expressBind(app, options)`

You'll use this method to attach the i18n functionality to the request object inside Express.js. The app argument should be your Express.js app and the options argument should be the same as if you were calling `new I18n(options)`. See [Load and Configure with Express.js](#load-configure) for more details.

### `__(string, [...])`

Translates a string according to the current locale. Also supports sprintf syntax, allowing you to replace text, using the node-sprintf module.

For example:

	var greeting = i18n.__('Hello %s, how are you today?', 'Marcus');

this puts **Hello Marcus, how are you today?**. You might also add endless arguments or even nest it.

	var greeting = i18n.__('Hello %s, how are you today? How was your %s?', 
		'Marcus', i18n.__('weekend'));

which puts **Hello Marcus, how are you today? How was your weekend?**

You might even use dynamic variables. They get added to the current locale file if they do not yet exist.

	var greetings = ['Hi', 'Hello', 'Howdy'];
	for (var i = 0; i < greetings.length; i++) {
		console.log( i18n.__(greetings[i]) );
	};

which outputs:

	Hi
	Hello
	Howdy

### `__n(one, other, count, [...])`

Different plural forms are supported as a response to `count`:

	var singular = i18n.__n('%s cat', '%s cats', 1);
	var plural = i18n.__n('%s cat', '%s cats', 3);

this gives you **1 cat** and **3 cats**. As with `__(...)` these could be nested:

	var singular = i18n.__n('There is one monkey in the %%s', 'There are %d monkeys in the %%s', 1, 'tree');
	var plural = i18n.__n('There is one monkey in the %%s', 'There are %d monkeys in the %%s', 3, 'tree');

putting **There is one monkey in the tree** or **There are 3 monkeys in the tree**.

### `getLocale()`

Returns a string containing the current locale. If no locale has been specified then it default to the value specified in `defaultLocale`.

### `setLocale(locale)`

Sets a locale to the specified string. If the locale is unknown, the locale defaults to the one specified by `defaultLocale`. For example if you have locales of 'en' and 'de', and a `defaultLocale` of 'en', then call `.setLocale('ja')` it will be equivalent to calling `.setLocale('en')`.

### `setLocaleFromQuery([request])`

To be used with Express.js or another framework that provides a `request` object. Generally you would want to use this by setting the `query` option to `true`.

This method takes in an Express.js request object, looks at the query property, and specifically at the `lang` parameter. Reading the value of that parameter will then set the locale.

For example:

	example.com/?lang=de

Will then do:

	setLocale('de')

### `setLocaleFromSubdomain([request])`

To be used with Express.js or another framework that provides a `request` object. Generally you would want to use this by setting the `subdomain` option to `true`.

This method takes in an Express.js request object, looks at the hostname, and extracts the sub-domain. Reading the value of the subdomain the locale is then set.

For example:

	de.example.com

Will then do:

	setLocale('de')

### `setLocaleFromCookie([request])`

To be used with Express.js or another framework that provides a `request` object. This method takes a request object, looks at it's cookies property and tries to find a cookie named `cookieName` (default: `lang`).

For example:

	console.log(req.cookies.lang)
	=> 'de'
	setLocaleFromCookie()

Will then do:

	setLocale('de')

### `isPreferredLocale()`

To be used with Express.js or another framework that provides a `request` object. This method works if a `request` option has been specified when the i18n object was instantiated.

This method returns true if the locale specified by `getLocale` matches a language desired by the browser's `Accept-language` header.

## <a name="configuration"></a>Configuration

When you instantiate a new i18n object there are a few options that you can pass in. The only required option is `locales`.

### `locales`

You can pass in the locales in two ways: As an array of strings or as an object of objects. For example:

	locales: ['en', 'de']

This will set two locales (en and de) and read in the JSON contents of both translation files. (By default this is equal to "cloud/locales/NAME.js", you can configure this by changing the `directory` and `extension` options.) Additionally when you pass in an array of locales the first locale is automatically set as the `defaultLocale`.

You can also pass in an object, like so:

	locales: {
		"en": {
			"Hello": "Hello"
		},
		"de": {
			"Hello": "Hallo"
		}
	}

In this particular case no files will ever be read when doing a translation. This is ideal if you are loading your translations from a different source. Note that no `defaultLocale` is set when you pass in an object, you'll need to set it yourself.

### `defaultLocale`

You can explicitly define a default locale to be used in cases where `.setLocale(locale)` is used with an unknown locale. For example if you have locales of 'en' and 'de', and a `defaultLocale` of 'en', then call `.setLocale('ja')` it will be equivalent to calling `.setLocale('en')`.

### `directory` and `extension`

These default to `"cloud/locales"` and `".js"` accordingly. They are used for reading the locale data files (see the `locales` option for more information on how this works).

When your server is in production mode it will read these files only once and then cache the result.

When in development or testing mode the files will be read on every instantiation of the `i18n` object.

### `request`, `subdomain`, and `query`

These options are to be used with Express.js or another framework that provides a `request` object. In order to use the `subdomain` and `query` options you must specify the `request` option, passing in the Express.js `request` object.

If you pass in a `request` object a new `i18n` property will be attached to it, containing the i18n instance.

Note that you probably won't need to use `request` directly, if you use `expressBind` it is taken care of automatically.

Setting the `subdomain` option to `true` will run the `setLocaleFromSubdomain` method automatically on every request.

By default the `query` option is set to true. Setting the `query` option to `false` will stop the `setLocaleFromQuery` method from running automatically on every request.

### `register`

Copy the `__`, `__n`, `getLocale`, and `isPreferredLocale` methods over to the object specified by the `register` property.

	var obj = {};
	new I18n({ 'register': obj })
	console.log( obj.__("Hello.") );

### `devMode`

By default the `devMode` property is set to be `true`. You can override this by setting a different value to the `devMode` option.

## Changelog

* 0.5.0: modifications for Parse Cloud Code: language files are readonly, API is optionally accessible from frontend JavaScipt
* 0.4.5: a number of bug fixes
* 0.4.4: fix typo
* 0.4.3: fix issue with preferredLocale failing on useragents with no accept lang header
* 0.4.2: fix some issues with cache init
* 0.4.1: rename locale query string param to lang
* 0.4.0: made settings contained, and scoped, to a single object (complete re-write by jeresig)
* 0.3.5: fixed some issues, prepared refactoring, prepared publishing to npm finally
* 0.3.4: merged pull request #13 from Fuitad/master and updated README
* 0.3.3: merged pull request from codders/master and modified for backward compatibility. Usage and tests pending
* 0.3.2: merged pull request #7 from carlptr/master and added tests, modified fswrite to do sync writes
* 0.3.0: added configure and init with express support (calling guessLanguage() via 'accept-language')
* 0.2.0: added plurals
* 0.1.0: added tests
* 0.0.1: start 
