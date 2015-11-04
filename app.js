var async = require('async');

var colors = require('colors');

var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');

var crypto = require('crypto');

var Steam = require('steam');
var SteamWebLogOn = require('steam-weblogon');
var getSteamAPIKey = require('steam-web-api-key');
var SteamTradeOffers = require('steam-tradeoffers'); // change to 'steam-tradeoffers' if not running from the examples subdirectory

var config = require('./cfg/bots.json');

function getSentryPath(botName) {
	var sentryFileDir = './cache/sentries';
	var sentryFile = sentryFileDir + '/' + botName + '.sentry';

	return sentryFile;
}

// if we've saved a server list, use it
if (fs.existsSync('cfg/servers.json')) {
	Steam.servers = JSON.parse(fs.readFileSync('cfg/servers.json'));
}

function getSHA1(bytes) {
	var shasum = crypto.createHash('sha1');
	shasum.end(bytes);
	return shasum.read();
}

async.forEach(config.Bots, function (bot, botCallback) {
	var steamClient = new Steam.SteamClient();
	var steamUser = new Steam.SteamUser(steamClient);
	var steamFriends = new Steam.SteamFriends(steamClient);
	var steamWebLogOn = new SteamWebLogOn(steamClient, steamUser);
	var offers = new SteamTradeOffers();

	var logOnOptions = {
		account_name: bot.Username,
		password: bot.Password
	};

	var logPref = (bot.Username + '> ').green.bold;

	steamClient.connect();
	steamClient.on('connected', function () {
		console.log(logPref + 'Подключились, ждём ответа...');

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
				botCallback();
			});
		}
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
			break;
		case 2:
				console.log(logPref + 'Пользователь ' + senderID + ' пишет мне сообщение...');
			break;
		case 6:
				console.log(logPref + 'Пользователь ' + senderID + ' отказался мне писать :C');
			break;
		}
	});
	
	steamTrade.on('tradeProposed',function(id,who_id){
	console.log(id,who_id);
});

	steamFriends.on('personaState', function (friend) {
		
	});
}, function (err) {
	console.log('Загрузка всех ботов завершена!');
});



//var steam = require('Steam');
///* Конфиг аккаунтов */
//var bots = require('./cfg/bots');
///* Файловая система */
//var fs = require('fs');
///* Подгружаем сервера авторизации если есть */
//if (fs.existsSync('servers')) {
//	steam.servers = JSON.parse(fs.readFileSync('servers'));
//}
///* Steam */
//var steamClient = new steam.SteamClient();
//var steamUser = new steam.SteamUser(steamClient);
//var steamFriends = new steam.SteamFriends(steamClient);
//var steamTrade = new steam.SteamTrading(steamClient);
//
///* Подключаемся к steam */
//steamClient.connect();
///* События для при подключение к steam*/
//steamClient.on('connected',function(){
//	/* Подключаем по логину и паролю */
//	steamUser.logOn({
//		account_name: bots.bots[0].Username,
//		password: bots.bots[0].Password
//	});
//	steamTrade.trade('76561198080998288');
//	
//});
//
//steamTrade.on('tradeProposed',function(id,who_id){
//	console.log(id,who_id);
//});
//steamTrade.on('tradeResult',function(){
//	
//});
//steamTrade.on('sessionStart',function(){
//	
//});
//
//
///* Когда данные пришли */
//steamClient.on('logOnResponse',function(res){
//	console.log(res);
//});
///* При диксконекте */
//steamClient.on('disconnected',function(){
//	console.log('Ушол :C');
//});
///* Обработка ошибок */
//steamClient.on('error',function(err){
//	console.log(err);
//});
///* Какие то сервера, про малофью несёт */
//steamClient.on('servers',function(servers){
//	fs.writeFile('servers',JSON.stringify(servers));
//});