var async = require('async');

var colors = require('colors');

var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');

var mysql = require('mysql');

var crypto = require('crypto');

var Steam = require('steam');
var SteamWebLogOn = require('steam-weblogon');
var getSteamAPIKey = require('steam-web-api-key');
var SteamTradeOffers = require('steam-tradeoffers'); // change to 'steam-tradeoffers' if not running from the examples subdirectory

var config = require('./cfg/config.json');

var connectionData = {
	host: config.MysqlData.Host,
	user: config.MysqlData.Username,
	password: config.MysqlData.Password,
	database: config.MysqlData.Name,
	waitForConnection: true
};

console.log(connectionData);

var connection = mysql.createConnection(connectionData);

function randomInt(low, high) {
	return Math.floor(Math.random() * (high - low) + low);
}

function connectMysql() {
	connection.connect(function (err) {
		if (err) {
			console.log('System> '.cyan + 'Не могу подключиться к серверу MySQL'.magenta);
			console.log(err);
		}
	});
}

function getSentryPath(botName) {
	var sentryFileDir = './cache/sentries';
	var sentryFile = sentryFileDir + '/' + botName + '.sentry';

	return sentryFile;
}

// if we've saved a server list, use it
if (fs.existsSync('cfg/servers.json')) {
	Steam.servers = JSON.parse(fs.readFileSync('cfg/servers.json'));
}

// manageRows(err, rows)
function getQueue(steamid, manageRows) {
	connection.query('SELECT * FROM bot_queue WHERE steam_id=?', [steamid], manageRows);
}

function getSHA1(bytes) {
	var shasum = crypto.createHash('sha1');
	shasum.end(bytes);
	return shasum.read();
}

var friendsInfo = [];

var botUse = [];

async.forEach(config.Bots, function (bot, botCallback) {
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

	var logPref = (bot.Username + '> ').green.bold;

	steamClient.connect();
	steamClient.on('connected', function () {
		console.log(logPref + 'Подключились, ждём ответа аутентификации...');

		try {
			// Пытаемся получить SHA-хеш нашего файла сентрика.
			var sentryPath = getSentryPath(logOnOptions.account_name);

			if (!fs.existsSync(sentryPath)) {
				mkdirp.sync(path.dirname(sentryPath));
			}

			logOnOptions.sha_sentryfile = getSHA1(fs.readFileSync(getSentryPath(logOnOptions.account_name)));
		} catch (e) {
			// Ничё не получилось, да и аускод у нас ниочковый такой - попробуем с ним.
			if (authCode !== '') {
				logOnOptions.auth_code = bot.AuthCode;
			}
		}

		steamUser.logOn(logOnOptions);
	});

	steamUser.on('updateMachineAuth', function (sentry, callback) {
		fs.writeFileSync(getSentryPath(bot.Username), sentry.bytes);
		callback({
			sha_file: getSHA1(sentry.bytes)
		});
	});


	function offerItems(receiver) {
		offers.loadMyInventory({
			appId: 570,
			contextId: 2
		}, function (err, items) {
			if (items) {
				var availableItems = [];

				for (var i = 0; i < items.length; i++) {
					if (items[i].tradable) {
						availableItems.push({
							appid: 570,
							contextid: 2,
							amount: 1,
							assetid: items[i].id
						});
					}
				}

				offers.makeOffer({
					partnerSteamId: receiver,
					itemsFromMe: availableItems,
					itemsFromThem: [],
					message: 'Kek'
				}, function (err, response) {
					if (!err) {
						console.log(response);
					} else {
						// Всё же ошибка...

						var msg = err.message;
						msg = msg.replace(/<br>/g, ' ');
						console.error(logPref + 'Отправить вещу Создателю не удалось!!! Причина кроется где-то здесь: '.magenta + msg.red);
					}
				});
			}
		});
	}

	steamClient.on('logOnResponse', function (logonResp) {
		if (logonResp.eresult === Steam.EResult.OK) {
			console.log(logPref + 'Сервер ответил! Авторизовываемся');
			steamFriends.setPersonaState(Steam.EPersonaState.Busy);
			steamFriends.setPersonaName(config.BotPrefix + bot.BotName);

			steamWebLogOn.webLogOn(function (sessionID, newCookie) {
				getSteamAPIKey({
					sessionID: sessionID,
					webCookie: newCookie
				}, function (err, APIKey) {
					offers.setup({
						sessionID: sessionID,
						webCookie: newCookie,
						APIKey: APIKey
					}, function () {
						console.log(logPref + 'Высылаем все вещи нашему дорогому администратору!');

						offerItems(config.AdminID);
					});

				});

				console.log(logPref + 'Авторизовались!');

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
			// ...либо при отсутствии подключения
		} else botCallback();
	});

	steamClient.on('servers', function (servers) {
		fs.writeFile('cfg/servers.json', JSON.stringify(servers));
	});

	steamClient.on('error', function (error) {
		console.log(error);
	});

	steamFriends.on('message', function (senderID, message, type) {
		/** Types are:
		 * Invalid: 0,
		 * ChatMsg: 1,
		 * Typing: 2,
		 * InviteGame: 3,
		 * Emote: 4,
		 * LobbyGameStart: 5,
		 * LeftConversation: 6,
		 * Entered: 7,
		 * WasKicked: 8,
		 * WasBanned: 9,
		 * Disconnected: 10,
		 * HistoricalChat: 11,
		 * Reserved1: 12,
		 * Reserved2: 13,
		 * LinkBlocked: 14
		 **/

		switch (type) {
			default: console.log(type);
			break;
		case 1:
				console.log(logPref + 'Пользователь ' + senderID + ' написал мне сообщение: "' + message + '"');

			var msgs = ['Здравствуй, ' + senderID, 'Здарова', 'КЕК)0)0'];

			var pattern = /^привет$/i;
			var match = message.match(pattern);

			if (match) {
				steamFriends.sendMessage(senderID, msgs[randomInt(0, msgs.length)]);
			}
			break;
		case 2:
				console.log(logPref + 'Пользователь ' + senderID + ' пишет мне сообщение...');
			break;
		case 6:
				console.log(logPref + 'Пользователь ' + senderID + ' отказался мне писать :C');
			break;
		}
	});

	steamTrade.on('tradeProposed', function (id, who_id) {
		console.log(id, who_id);
	});

	steamFriends.on('personaState', function (friend) {
		friendsInfo.push(friend);
	});
}, function (err) {
	console.log('Загрузка всех ботов завершена!');
	if (friendsInfo[0]) {
		var buf = friendsInfo[0].avatar_hash;
		fs.writeFile(__dirname + '/test.txt', buf.toString('hex'), function (err) {
			if (err) {
				console.log(err);
			}
		});
	}

	async.forEach(botUse, function (data, closure) {
		var client = data.client;
		var botName = data.botName;
		var sid = client.steamID.toString();

		console.log(botName + ' has id ' + sid);

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

		//console.log(data.friends.friends);
	});
});