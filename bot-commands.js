'use strict';
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const SteamTradeOffers = require('steam-tradeoffers');

function BotCommands() {
	EventEmitter.call(this);

	var offers = new SteamTradeOffers();

	this.on('send-item', function (data) {
		console.log(data);
		//TODO: убрать лишнее
		return;

		offers.loadMyInventory({
			appId: data.appId,
			contextId: data.contextId
		}, function (err, items) {
			if (items) {
				var availableItem = {
					appid: data.appId,
					contextid: data.contextId,
					amount: data.amount,
					assetid: data.itemId
				};

                               // DEBUG
				for (var i = 0; i < 30; i++) {
					if (items[i].tradable) {
						console.log(items[i].id + ' - ' + items[i].name);
					}
				}

				offers.makeOffer({
					partnerSteamId: receiver,
					itemsFromMe: [availableItem],
					itemsFromThem: [],
					message: 'Kek'
				}, function (err, response) {
					if (!err) {
						console.log(response);
					} else {
						var msg = err.message;
						msg = msg.replace(/<br>/g, ' ');
						console.error(logPref + 'Отправить вещи не удалось. Причина: ' + msg.red);
					}
				});
			}
		});
	});
}

util.inherits(BotCommands, EventEmitter);

this.Class = new BotCommands();
