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
var fs = require('fs');
var crypto = require('crypto');

var Steam = require('steam');
var SteamWebLogOn = require('steam-weblogon');
var getSteamAPIKey = require('steam-web-api-key');
var SteamTradeOffers = require('steam-tradeoffers'); // change to 'steam-tradeoffers' if not running from the examples subdirectory

var admin = '76561198080998288'; // put your steamid here so the bot can send you trade offers

var logOnOptions = {
	account_name: 'xupoh1',
	password: '15qwert15'
};

var authCode = 'W37BW'; // code received by email

try {
	logOnOptions.sha_sentryfile = getSHA1(fs.readFileSync('sentry'));
} catch (e) {
	if (authCode !== '') {
		logOnOptions.auth_code = authCode;
	}
}

// if we've saved a server list, use it
if (fs.existsSync('servers')) {
	Steam.servers = JSON.parse(fs.readFileSync('servers'));
}

var steamClient = new Steam.SteamClient();
var steamUser = new Steam.SteamUser(steamClient);
var steamFriends = new Steam.SteamFriends(steamClient);
var steamWebLogOn = new SteamWebLogOn(steamClient, steamUser);
var offers = new SteamTradeOffers();

steamClient.connect();
steamClient.on('connected', function () {
	steamUser.logOn(logOnOptions);
});

function offerItems() {
	var appId = 570;
	var contextId = 2;

	offers.loadMyInventory({
		appId: appId,
		contextId: contextId
	}, function (err, items) {
		if (items) {
			var properItems = [];

			for (var i = 0; i < items.length; i++) {
				if (items[i].tradable) {
					properItems[i] = {
						appid: appId,
						contextid: contextId,
						amount: 1,
						assetid: items[i].id
					};
				}
			}
			offers.makeOffer({
				partnerSteamId: admin,
				itemsFromMe: properItems,
				itemsFromThem: [],
				message: 'This is test'
			}, function (err, response) {
				if (err) {
					throw err;
				}
				console.log(response);
			});
		}
	});
}

steamClient.on('logOnResponse', function (logonResp) {
	if (logonResp.eresult === Steam.EResult.OK) {
		console.log('Logged in!');
		steamFriends.setPersonaState(Steam.EPersonaState.Online);

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
					offerItems();
				});
			});
		});
	}
});

steamClient.on('servers', function (servers) {
	fs.writeFile('servers', JSON.stringify(servers));
});

steamUser.on('updateMachineAuth', function (sentry, callback) {
	fs.writeFileSync('sentry', sentry.bytes);
	callback({
		sha_file: getSHA1(sentry.bytes)
	});
});

function getSHA1(bytes) {
	var shasum = crypto.createHash('sha1');
	shasum.end(bytes);
	return shasum.read();
}
steamClient.on('logOnResponse', function () {

});