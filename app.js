var steam = require('Steam');
/* Конфиг */
var config = require('./config');
/* Steam */
var steamClient = new steam.SteamClient();
var steamUser = new steam.SteamUser(steamClient);

//var steamFriends = new steam.SteamFriends(steamClient);
//var steamWebLogOn = new SteamWebLogOn(steamClient, steamUser);

//var Steam = require('steam');
//var SteamWebLogOn = require('steam-weblogon');
//var getSteamAPIKey = require('steam-web-api-key');
//var SteamTradeOffers = require('steam-tradeoffers')

steamClient.connect();
steamClient.on('connected',function(){
	steamUser.logOn({
		account_name: config.bots[0].Username,
		password: config.bots[0].Password
	});
});
steamClient.on('disconnected',function(){
	console.log('Ушол :C');
});
steamClient.on('logOnResponse',function(){
	
});