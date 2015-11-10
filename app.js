var async = require('async');
var colors = require('colors');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');
var mysql = require('mysql');
var Steam = require('steam');
var SteamWebLogOn = require('steam-weblogon');
var getSteamAPIKey = require('steam-web-api-key');
var SteamTradeOffers = require('steam-tradeoffers'); // change to 'steam-tradeoffers' if not running from the examples subdirectory
var util = require('util');
var EventEmitter = require('events');

var helpers = require('./helpers.js');
var chatter = require('./chatter.js');
var BotCommands = require('./bot-commands.js').Class;

var config = require('./cfg/config.json');

////////////////////////////////////////////
////			MySQL				////
///////////////////////////////////////////

var connectionData = {
	host: config.MysqlData.Host,
	user: config.MysqlData.Username,
	password: config.MysqlData.Password,
	database: config.MysqlData.Name
};

var connection;

function handleDisconnect() {
	connection = mysql.createConnection(connectionData);

	connection.connect(function (err) {
		if (err) {
			/* Что за переменные ? */
			console.log('System> ' + cyan + 'Не могу подключиться к серверу MySQL' + magenta, err);
			setTimeout(handleDisconnect, 2000);
		}
	});

	connection.on('error', function (err) {
		if (err.code === 'PROTOCOL_CONNECTION_LOST') {
			handleDisconnect();
		} else {
			throw err;
		}
	});
}

try {
	handleDisconnect();
} catch (ex) {
	console.log(ex);
}

// if we've saved a server list, use it
if (fs.existsSync('cfg/servers.json')) {
	Steam.servers = JSON.parse(fs.readFileSync('cfg/servers.json'));
}

var friendsInfo = {},
	botUse = [];

async.forEach(
	config.Bots,
	function (bot, botCallback) {
		var userMemes = [],
			userTyping = [],
			queue = [];

		var steamClient = new Steam.SteamClient();
		var steamUser = new Steam.SteamUser(steamClient);
		var steamFriends = new Steam.SteamFriends(steamClient);
		var steamWebLogOn = new SteamWebLogOn(steamClient, steamUser);
		var steamTrade = new Steam.SteamTrading(steamClient);
		var offers = new SteamTradeOffers();

		var logOnOptions = {
			account_name: bot.Username,
			password: bot.Password
		};

		var logPref = (bot.Username + '> ').yellow.bold;

		steamClient.connect();

		steamClient.on('connected', function () {
			console.log(logPref + 'Подключились, ждём ответа аутентификации...');

			try {
				// Пытаемся получить SHA-хеш нашего файла сентрика.
				var sentryPath = helpers.getSentryPath(logOnOptions.account_name);

				if (!fs.existsSync(sentryPath)) {
					mkdirp.sync(path.dirname(sentryPath));
				}

				logOnOptions.sha_sentryfile = helpers.getSHA1(fs.readFileSync(helpers.getSentryPath(logOnOptions.account_name)));
			} catch (e) {
				// Ничё не получилось, да и аускод у нас ниочковый такой - попробуем с ним.
				if (bot.AuthCode !== '') {
					logOnOptions.auth_code = bot.AuthCode;
				}
			}

			steamUser.logOn(logOnOptions);
		});

		steamUser.on('updateMachineAuth', function (sentry, callback) {
			fs.writeFileSync(helpers.getSentryPath(bot.Username), sentry.bytes);
			callback({
				sha_file: helpers.getSHA1(sentry.bytes)
			});
		});

		steamClient.on('logOnResponse', function (logonResp) {
			if (logonResp.eresult === Steam.EResult.OK) {
				console.log(logPref + 'Сервер ответил! Авторизовываемся');
				steamFriends.setPersonaState(Steam.EPersonaState.Busy);
				steamFriends.setPersonaName(config.BotPrefix + bot.BotName);

				steamWebLogOn.webLogOn(function (sessionID, newCookie) {
					console.log(logPref + 'Авторизовались! Грузим друзей и задания...');

					var query = helpers.getQueueQuery(connection, steamClient.steamID);
					query
						.on('error', function (err) {
							console.log(logPref + 'Задания загрузить не удалось', err);
						})
						.on('fields', function (fields) {

						})
						.on('result', function (row) {
							queue.push(row);
							//helpers.getDeleteQuery(connection, row.id);
							//TODO: Вернуть удаление строки после чтения
						})
						.on('end', function () {
							console.log(logPref + 'Заданий на очереди: ' + queue.length);

							getSteamAPIKey({
								sessionID: sessionID,
								webCookie: newCookie
							}, function (err, APIKey) {
								offers.setup({
									sessionID: sessionID,
									webCookie: newCookie,
									APIKey: APIKey
								}, function () {
									async.each(queue, function (task, nextTask) {
										BotCommands.emit(task.command, JSON.parse(task.arguments));

										nextTask();
									});
								});
							});
						});

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

					async.forEach(Object.keys(steamFriends.friends), function (sid, nextFriend) {
						if (!keys[sid] && goodRelations.indexOf(steamFriends.friends[sid]) != -1) {
							result[sid] = steamFriends.friends[sid];
							keys.push(sid);
						}

						nextFriend();
					}, function (err) {
						steamFriends.requestFriendData(keys);

						console.log(logPref + 'Загрузили');

						botUse.push({
							client: steamClient,
							user: steamUser,
							trade: steamTrade,
							offers: offers,
							friends: steamFriends,
							botName: bot.Username
						});

						// Переходим к загрузке следующего бота либо при удачной авторизации...
						botCallback();
					});
				});
				// ...либо при отсутствии подключения
			} else botCallback();
		});

		steamClient.on('servers', function (servers) {
			fs.writeFile('cfg/servers.json', JSON.stringify(servers));
		});

		steamClient.on('error', function (error) {
			console.log('У бота ошибка')
			console.log(error);
		});

		var lastPhrase = -1,
			lastCount = 1;

		steamFriends.on('message', chatter.listener);

		steamTrade.on('tradeProposed', function (id, who_id) {
			console.log(id, who_id);
		});

		steamFriends.on('personaState', function (friend) {
			var avatarBuf = friend.avatarHash;
			var avatarHash = avatarBuf.toString('hex');

			if (avatarBuf.toString().length == 0) {
				avatarHash = 'fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb'; // empty steam image, FIXED 15:42 MSC 04.11.2015
			}

			var avatarUrl = util.format('http://cdn.akamai.steamstatic.com/steamcommunity/public/images/avatars/80/%s_full.jpg', avatarHash);

			friendsInfo[friend.friendid] = {
				steam_id: friend.friendid,
				name: friend.player_name,
				avatar: avatarUrl
			};
		});
	},
	function (err) {
		console.log('****** Загрузка всех ботов завершена! ******'.green.bold);

		async.forEach(botUse, function (data, closure) {
			var botName = data.botName.toString(),
				friends = data.friends.friends,
				client = data.client;

			var sid = client.steamID.toString();

			console.log(botName.yellow.bold + ' имеет ID ' + sid);

			/** Пример вывода:
			 'steamid': statusID
			 
			 Где statusID принимает
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
		});
	});