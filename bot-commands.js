var util = require('util');
var EventEmitter = require('events').EventEmitter;
var SteamMarket = require('steam-market');

function BotCommands() {
	EventEmitter.call(this);

	this.buildItemUrl = function () {

	}

	this.on('send-item', function (offers, data) {
		console.log('Отправляем предмет ' + data.itemId.magenta.bold + ' игроку ' + data.receiver.magenta.bold);

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

				/* DEBUG */
				var length = items.length;
				var found = false;

				for (var i = 0; i < length; ++i) {
					if (data.itemId === items[i].id) {
						found = items[i];
						break;
					}
				}

				if (found) {
					console.log('Предмет найден! Имя: ' + found.market_hash_name);
					console.log('ClassID: ' + found.classid);
					console.log('IconURL: http://cdn.steamcommunity.com/economy/image/' + found.icon_url_large);

					SteamMarket.priceOverview(5, data.appId, found.name, function (err, res) {
						if (err)
							console.log(err);
						else {
							console.log('!!! Средняя цена: '.green.bold + res.median_price.yellow.bold);
						}
					});

					offers.makeOffer({
						partnerSteamId: data.receiver,
						itemsFromMe: [availableItem],
						itemsFromThem: [],
						message: 'Kek'
					}, function (err, response) {
						if (!err) {
							console.log(response);
						} else {
							console.log(err);
							console.log('^ Послужило ошибкой отправки вещей игроку '.red + data.receiver);
						}
					});
				} else {
					console.log('Предмет не найден! Ошибка!')
				}
			} else {
				console.log(err);
			}
		});
	});
}

util.inherits(BotCommands, EventEmitter);

this.Class = new BotCommands();