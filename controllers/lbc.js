var http = require('http');
var fs = require('fs');
var path = require('path');

//https://github.com/MatthewMueller/cheerio
var cheerio = require('cheerio');
//http://projets.jpmonette.net/feed
var Feed = require('feed');
//https://github.com/janl/mustache.js
var mustache = require('mustache');

server;
application;
var couchdb = require('./couchdb.js').couchdb;

var _watchers = {};
var _template = '';

var lbc = (function() {

	var getHttpContent = function(url, fn) {

		return http.get(url, function(res) {
			var html = '';
		    res.on("data", function(chunk) {
				html += server.decode(chunk, "iso-8859-15");1
			}).on('end', function() {
				fn(null, html);
			}).on('error', function(err) {
				fn(err);
			});

		});
	};

	var extract = function(watcherId, fn) {
		fn = fn || function() {};
		var watcher = getWatcher(watcherId);
		var rows = [];
		server.echo('LBC'.info, 'Extracting'.info, watcher.url);
		getHttpContent(watcher.url, function(err, html) {
			var body = /<body[\s.\S]*>([\s.\S]*)<\/body>/gi.exec(html)[0];
			var $ = cheerio.load(body);
			var $results = $('div.list-lbc > a');
			var threadCount = $results.length;
			if(threadCount > 0) {
				$results.each(function() {
		            var $this = $(this);
		            var $lbc = $this.find('.lbc');
		            var $details = $lbc.find('.detail');
		            var doc = {
		                id: $this.attr('href'),
		                docType: 'announce',
		                watcherId: watcher.id,
		                link: $this.attr('href'),
		                date: new Date().getTime(),
		                title: $details.find('.title').text().trim(),
		                price: $details.find('.price').text().trim(),
		                category: $details.find('.category').text().trim(),
		                placement: $details.find('.placement').text().trim(),
		                thumbs: [$lbc.find('.image img').attr('src')]
		            };
		            couchdb.get(doc.id, function(err) {
		            	if(err) {
				            getHttpContent(doc.id, function(err, html) {
				                var body = /<body[\s.\S]*>([\s.\S]*)<\/body>/gi.exec(html)[0];
				                doc.description = $(body).find('.AdviewContent > .content').text().trim();
				                server.echo('lbc', 'loading'.data, doc.id);
				                couchdb.insert(doc.id, doc, function(err, xdoc) {
				                	if(err) {
				                		server.echo('LBC'.info, 'insert'.error, err.message);
				                	} else {
				                		rows.push(xdoc);
				                		server.echo('LBC'.info, 'insert'.green, 'SUCCESS');
				                	}
				                	threadCount--;
				                	if(threadCount == 0) {
				                		fn(null, rows);
				                	}
				                });
				            });
		            	} else {
		            		threadCount--;
		            		if(threadCount == 0) {
				                fn(null, rows);
				            }
		            	}
		            });
		        });	
			} else {
				fn(null, []);
			}
		}).on('error', function(e) {
			server.echo('LBC'.info, e.message.error);
			fn(e);
		});
	};

	var addWatcher = function(url, interval, fn) {
		fn = fn || function() {};
		var id = new Buffer(url).toString('base64');
		var watcher = _watchers[id] = {
			id: id,
			url: url,
			docType: 'watcher',
			interval: interval || 60000
		};
		couchdb.insert(id, watcher, function(err) {
			if(err) {
				fn(err);
				server.echo('LBC'.info, 'watch'.error, "can't save new watcher", err.message.error);
			} else {
				fn(err, watcher);
				server.echo('LBC'.info, 'watch'.info, "new watcher created", watcher.id);
			}
		});
		return watcher;
	};

	var getWatcher = function(obj) {
		var watcher = (typeof(obj) == 'object')?obj:_watchers[obj];
		if(!watcher) {
			server.echo('LBC'.info, 'watcher "', obj, '" unknow');
		}
		return watcher;
	};

	var startWatch = function(id, force) {
		var watcher = getWatcher(id);
		if(watcher) {
			stopWatch(watcher.id);
			watcher._threadId = setInterval(function() {
				runWatcher(watcher);
			}, watcher.interval);
			server.echo('LBC'.info, 'watcher', 'started'.info, watcher.id);
			runWatcher(watcher.id, force);
		}
	};

	var runWatcher = function(id, force) {
		var watcher = getWatcher(id);
		extract(watcher, function(err, rows) {
			if(!err && (force || rows.length > 0)) {
				rebuildRss(watcher);
				if(rows.length > 0) {
					var out = mustache.render(_template, { rows: rows });
					server.emailer.send({ from:'LBC watcher', to:'qsupernant@gmail.com, clairepellarin@gmail.com', subject:'Nouvelles annonces', html:out });
				}
			}
		});
	};

	var stopWatch = function(id) {
		var watcher = getWatcher(id);
		if(watcher && watcher._threadId) 
		{
			clearInterval(watcher._threadId);
			watcher._threadId = null;
		}
	};

	var removeWatcher = function(id, fn) {
		fn = fn || function() {};
		var watcher = getWatcher(id);
		if(watcher) {
			couchdb.destroy(watcher._id, watcher._rev, function(err) {
				if(!err) {
					delete _watchers[watcher.id];
					fn(null, watcher);
					server.echo('LBC'.info, 'watch'.info, "watcher removed", watcher.id);
				} else {
					fn(err, watcher);	
					server.echo('LBC'.info, 'watch'.error, "can't remove watcher", watcher.id);
				}
			});
		}
	};

	var rebuildRss = function(watcherId) {
		var watcher = getWatcher(watcherId);
		server.echo('LBC'.info, 'RSS', 'rebuild'.info, watcher.id);
		var feed = new Feed({
		    title:        'Recherche',
		    description:  'Recherche',
		    link:         watcher.url,
		    copyright:    'Copyright © 2013 John Doe. All rights reserved',
		    author: {
		        name:     'John Doe'
		    }
		});
		couchdb.getAll(function(err, data) {
			for(var i = 0; i < data.rows.length; i++) {
				var row = data.rows[i].doc;
				if(row.docType == 'announce' && row.watcherId == watcher.id) {
					feed.item({
				        title:          row.title,
				        link:           row.link,
				        description:    row.description,
				        date:           new Date(row.date)
				    });
				}
			}
			server.writeFileToCache(watcher.id + '.rss', feed.render('rss-2.0'), function(err) {
				if(err) {
					server.echo('LBC'.info, err.message.error);
				}
			});
		}, { limit: 10, descending: true });
	};


	var run = function(response, request, params) {
		if(request.method == 'GET') {
			if(params.action == 'watch') {
				if(!params.id) {
					server.echo('LBC'.info, 'watch'.info, 'url parameter is missing');
					server.quickr(response, 404);	
				} else if(params.id == '*') {
					server.quickrJSON(response, 200, _watchers);
				} else {
					server.quickrJSON(response, 200, getWatcher(params.id));
				};
			} else if(params.action == 'rss') {
				if(params.id) {
					server.getFileFromCache(params.id + '.rss', function(err, data) {
						server.quickr(response, 200, data, 'text/rss+xml');
					});
				} else {
					server.echo('LBC'.info, 'RSS'.info, 'id parameter is missing');
					server.quickr(response, 404);	
				}
			} else {
				// NOT FOUND
				server.quickr(response, 404);
			}
		} else if(request.method == 'DELETE') {
			if(params.action == 'watch') {
				if(params.id) {
					stopWatch(params.id);
					removeWatcher(params.id, function(err, watcher) {
						if(!err) {
							server.quickrJSON(response, 200, watcher);	
						} else {
							server.quickr(response, 404);	
						}
					});
				} else {
					server.echo('LBC'.info, 'watch'.info, 'id parameter is missing');
					server.quickr(response, 404);	
				}
			}
		} else if(request.method == 'POST') {
			if(params.action == 'watch') {
				if(request.data.url) {
					addWatcher(request.data.url, request.data.interval || 60000, function(err, watcher) {
						if(!err) {
							startWatch(watcher);
							server.quickrJSON(response, 200, watcher);	
						} else {
							server.quickr(response, 500);
						}
					});
				} else {
					server.echo('LBC'.info, 'watch'.info, 'url parameter is missing');
					server.quickr(response, 404);	
				}
			} else {
				// NOT FOUND
				server.quickr(response, 404);
			}
		} else {
			// NOT FOUND
			server.quickr(response, 404);
		}
	};

	return {
		run: run,
		startWatch: startWatch
	};

})();

var loadWatchers = function() {
	couchdb.getAll(function(err, docs) {
		if(err) {
			server.echo('LBC'.info, 'watch'.error, "can't load watchers");
		} else {
			server.echo('LBC'.info, 'watchers', 'loaded'.info);
			docs.rows.forEach(function(row) {
				if(row.doc.docType == 'watcher') {
					_watchers[row.doc.id] = row.doc;
					lbc.startWatch(row.doc.id, true);
				}
			});
		}
	});
};


fs.readFile(path.join(__dirname, '../templates/rows.html'), function(err, html) {
	_template = html.toString();
	if(err) {
		server.echo('LBC'.info, err.message.error);
	}
});

loadWatchers();

exports = lbc;