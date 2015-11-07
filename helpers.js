var crypto = require('crypto');

this.randomInt = function (low, high) {
	return Math.floor(Math.random() * (high - low) + low);
}

this.getSentryPath = function (botName) {
	var sentryFileDir = './cache/sentries';
	var sentryFile = sentryFileDir + '/' + botName + '.sentry';

	return sentryFile;
}

// manageRows(err, rows)
this.getQueueQuery = function (connection, steamid) {
	return connection.query('SELECT * FROM bot_queue WHERE steam_id=?', [steamid]);
}

this.getSHA1 = function (bytes) {
	var shasum = crypto.createHash('sha1');
	shasum.end(bytes);
	return shasum.read();
}

this.getDeleteQuery = function (connection, id) {
	return connection.query('DELETE FROM bot_queue WHERE id=?', [id]);
}