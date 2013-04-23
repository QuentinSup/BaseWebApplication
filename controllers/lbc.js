var http = require('http');
//https://github.com/MatthewMueller/cheerio
var cheerio = require('cheerio');
//http://projets.jpmonette.net/feed
var Feed = require('feed');

// Load server plugin 'couchdb'
var couchdb = server.require('couchdb');

server;

var getHttpContent = function(url, fn) {
	return http.get(url, function(res) {
		var html = '';
		res.setEncoding('ascii');
			
	    res.on("data", function(chunk) {
			html += chunk;
		}).on('end', function() {
			fn(null, html);
		}).on('error', function(err) {
			fn(err, html);
		});

	});
};

var extract = function(url, fn) {
	fn = fn || function() {};
	var rows = [];
	server.echo('Extracting'.info, url);
	getHttpContent(url, function(err, html) {
		var body = /<body[\s.\S]*>([\s.\S]*)<\/body>/gi.exec(html)[0];
		var $ = cheerio.load(body);
		$('div.list-lbc > a').each(function() {
            var $this = $(this);
            var $lbc = $this.find('.lbc');
            var $details = $lbc.find('.detail');
            var doc = {
                id: $this.attr('href'),
                link: $this.attr('href'),
                date: new Date().getTime(),
                title: $details.find('.title').text(),
                price: $details.find('.price').text(),
                category: $details.find('.category').text(),
                placement: $details.find('.placement').text(),
                thumbs: [$lbc.find('.image img').attr('src')]
            };

            couchdb.get(doc.id, function(err) {
            	if(err) {
		            getHttpContent(doc.id, function(err, html) {
		                var body = /<body[\s.\S]*>([\s.\S]*)<\/body>/gi.exec(html)[0];
		                doc.description = $(body).find('.AdviewContent > .content').text();
		                server.echo('lbc', 'loading'.data, doc.id);
		                couchdb.insert(doc.id, doc, function(err, xdoc) {
		                	if(err) {
		                		server.echo('lbc', 'insert'.error, err.message);
		                	} else {
		                		rows.push(xdoc);
		                		server.echo('lbc', 'insert'.green, 'SUCCESS');
		                	}
		                });
		            });
            	}
            });

        });	
		fn(null);
	}).on('error', function(e) {
		server.echo('lbc', e.message.error);
		fn(e);
	});
};

var lbc = (function() {
	var run = function(response, request, params) {
		if(request.method == 'GET') {
			if(params.action == 'watch') {
				var url = request.path.query.url;
				if(url) {
					extract(url);
					setInterval(function() {
						extract(url);
					}, 60000);
					server.quickr(response, 200);	
				} else {
					server.echo('ldc', 'watch'.info, 'url parameter is missing');
					server.quickr(response, 404);	
				}
			}
			if(params.action == 'url') {
				extract(params.id, function(err) {
					if(err) {
	  					server.quickr(response, 500);
					} else {
						server.quickr(response, 200);	
					}
				});
			} else if(params.action == 'rss') {
				console.log('RSS'.info);
				var feed = new Feed({
				    title:        'Recherche sur le bon coin',
				    description:  'Recherche de chatons',
				    link:         'http://www.leboncoin.fr/animaux/offres/rhone_alpes/?f=a&th=1&q=chatons',
				    copyright:    'Copyright © 2013 John Doe. All rights reserved',
				    author: {
				        name:     'John Doe'
				    }
				});
				couchdb.getAll(function(err, data) {
					for(var i = 0; i < data.rows.length; i++) {
						var row = data.rows[i].doc;
						feed.item({
					        title:          row.title,
					        link:           row.link,
					        description:    row.description,
					        date:           new Date(row.date)
					    });
					}
					server.quickr(response, 200, feed.render('rss-2.0'), 'text/rss+xml');
				});
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
		run: run
	}

})();

server.controllers.register('lbc', lbc);

exports = lbc;