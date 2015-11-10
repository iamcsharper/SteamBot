var crypto = require('crypto');

this.randomInt = function (min, max) {
	return Math.floor(Math.random() * (max - min) + min);
}

this.getSentryPath = function (botName) {
	var sentryFileDir = './cache/sentries';
	var sentryFile = sentryFileDir + '/' + botName + '.sentry';

	return sentryFile;
}

// manageRows(err, rows)
this.getQueueQuery = function (connection, steamid) {
	/* Так немного быстрее */
	return connection.query('SELECT command,arguments FROM bot_queue WHERE steam_id=?', [steamid]);
}

this.getSHA1 = function (bytes) {
	var shasum = crypto.createHash('sha1');
	shasum.end(bytes);
	return shasum.read();
}

this.getDeleteQuery = function (connection, id) {
	return connection.query('DELETE FROM bot_queue WHERE id=?', [id]);
}