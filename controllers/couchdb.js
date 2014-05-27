server;
application;

// Load server plugin 'couchdb'
var couchdb = new (server.plugins('couchdb'))();

if(application.couchdb) {
	couchdb.connect(application.couchdb.host, application.couchdb.port, application.couchdb.protocol);
	couchdb.use(application.couchdb.dbname);
} else {
	server.echo('> COUCHDB No configuration found for couchdb plugin'.red);
}

module.exports = function() {

	var run = function(response, request, params) {
		couchdb.run(response, request, params);
	};

	return {
		couchdb: couchdb,
		run: run
	}

}();