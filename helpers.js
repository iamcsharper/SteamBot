var crypto = require('crypto');
var Steam = require('steam');
var async = require('async');

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
	/* Нихуя ибо id нужен */
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

this.extractFriendsFromSteam = function (steam_friends, closure) {
	var keys = [],
		result = {};

	/**
	None: 0,
	Blocked: 1,
	RequestRecipient: 2,
	Friend: 3,
	RequestInitiator: 4,
	Ignored: 5,
	IgnoredFriend: 6,
	SuggestedFriend: 7,
	Max: 8
	**/

	var goodRelations = [Steam.EFriendRelationship.Friend];

	async.forEach(Object.keys(steam_friends), function (sid, nextFriend) {
		if (!keys[sid] && goodRelations.indexOf(steam_friends[sid]) != -1) {
			result[sid] = steam_friends[sid];
			keys.push(sid);
		}

		nextFriend();
	}, function (err) {
		if (err) {
			closure(err, null, null);
		} else {
			closure(null, keys, result);
		}
	});
}

this.toArray = function (obj) {
	var arr = new Array();
	for (var i in obj) {
		if (obj.hasOwnProperty(i)) {
			arr[i] = obj[i];
		}
	}

	return arr;
};