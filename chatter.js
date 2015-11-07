this.listener = function (senderID, message, type) {
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
			console.log(logPref + 'Пользователь ' + senderID + ' написал: "' + message + '"');

		var phrases = [
			{

				// TODO: реализовать матчи
				// чё там с матчами
				// как по матчам
				// что
				pattern: /(?:чё|что|че|как)(?: там|) (?:по матчам|с матчами)$/i,
				response: function (sender) {
					sender(senderID, 'Анализирую...');
				}
                    }, {
				pattern: /^(?:ч(?:ё|е) там с (?:друзьями|другами))|(?:кого ты знаешь)/i,
				description: 'чё там с друзьями/кого ты знаешь - я скину тебе список мне доступных друзей',
				response: function (sender) {
					var count = Object.keys(friendsInfo).length;

					sender(senderID, 'Всего: ' + count + ' доступных друзей, включая меня. Поимённо: ');

					for (var index in friendsInfo) {
						sender(senderID, index + ' (' + friendsInfo[index].name + '), ');
					}
				}
                    }, {
				pattern: /^(привет|здравствуй|здравствуйте|ку|прив|хай)(?:,| |, )(.*)/i,
				description: 'любое приветствие на русском с обращением - я отвечу тебе и выскажу мнение на обращение',
				response: function (sender, lastCount, greeting, who) {
					who = who.replace(/^\s+|\s+$/g, '');
					who = who.replace(/ /, '');

					var msgs = ['И тебе, ' + senderID, 'Угу', 'Ну что ещё?'];
					var good = ['няша', 'ня', 'бро', 'братан', 'брат', 'бот']
					var swear = ['сука', 'пидор', 'хуесос', 'кек', 'принцесса', 'блять', 'блядь', 'ска', 'пёс', 'козёл', 'чмо', 'деб', 'дебил', 'дибил'];

					if (swear.indexOf(who) > -1) {
						msgs = ['Будь добр не обижать меня. Я робот ранимый.', 'Усмири свой пыл, сын мой! А то я и обидеться могу...', 'Слышь БРАТКА, НА ЗОНЕ ТАК ОБЩАТЬСЯ БУДЕШЬ!'];
					} else if (good.indexOf(who) > -1) {
						msgs = [':3 доброго времени суток! C:', 'И тебе, йоу! ^_^', 'Ихих;3 Приветик'];
					}

					if (lastCount > 3) {
						var chance = Math.ceil(lastCount / 2.75) + 2;
						for (var i = 0; i < chance; ++i) {
							if (i <= chance / 2)
								msgs.push('Сколько можно писать об одном и том же? Уже ' + lastCount + ' раз меня приветствуешь, какой ужас!');
							else
								msgs.push(lastCount + ' раз меня вы не то приветствуете, не то обижаете, перестаньте!');
						}
					}

					sender(senderID, msgs[helpers.randomInt(0, msgs.length)]);
				}
                    }, {
				pattern: /^(привет|здравствуй|здравствуйте|ку|прив|хай)/i,
				description: 'любое приветствие на русском - я отвечу тебе',
				response: function (sender, lastCount, greeting) {
					var msgs = ['И тебе привет, ' + senderID, 'Угу, привет', 'Ну что ещё?', 'Ага', 'Ну'];

					sender(senderID, msgs[helpers.randomInt(0, msgs.length)]);
				}
                    }, {
				pattern: new RegExp('отошли это: \"(.+)\" чуваку с (ником|айди|id) (.+)', 'i'),
				description: 'отошли это: "<сообщение>" чуваку с (ником <ник>) ЛИБО (айди <steamid>) - отсылает сообщение моему другу с ником ник или с айди steamid',
				response: function (sender, lastCount, msg, kind, id) {
					sender(senderID, 'Щас, поищу таких... ' + id);

					var founded = false;

					async.forEachOf(friendsInfo, function (friend, key, nextFriend) {
						// ID - либо ник, либо SteamID. Мы должны это понять на основе kind.
						// Key - текущий SteamID. friend.name - текущее имя игрока.

						if (kind.indexOf('ник') > -1) {
							if (friend.name.toString() == id.toString()) {
								sender(key, friendsInfo[senderID].name + ' просил передать тебе сообщение, держи!');
								sender(key, '"' + msg + '"');

								founded = key;
							}
						} else if (kind.indexOf('айди') > -1 || kind.indexOf('id') > -1) {
							if (key.toString() == id) {
								sender(id, friendsInfo[senderID].name + ' просил передать тебе сообщение, держи!');
								sender(id, '"' + msg + '"');

								founded = key;
							}
						}

						nextFriend();
					}, function () {
						if (!founded) {
							sender(senderID, 'Я таких не знаю. Попробуй спросить меня кого я знаю.');
						} else {
							sender(senderID, 'Ок, сделано!');
						}
					});
				}
                    },
			{
				pattern: new RegExp('отошли это: \"(.+)\" всем', 'i'),
				description: 'отошли это: "<сообщение>" всем - отсылает сообщение всем моим друзьям',
				response: function (sender, lastCount, msg) {
					sender(senderID, 'Щас, погоди минутку');

					async.forEachOf(friendsInfo, function (friend, friendid, nextFriend) {
						if (friendid != senderID) {
							sender(friendid, msg);
						}

						nextFriend();
					}, function () {
						sender(senderID, 'Ок, сделано! ' + Object.keys(friendsInfo).length + ' человек получило твоё сообщение');
					});
				}
                    }, {
				pattern: /(.*?)/,
				response: function (sender) {
					sender(senderID, 'Прости, я тебя не понимаю. Сейчас опишу список моих команд.');

					async.each(phrases, function (phrase, nextPhrase) {
						if (phrase.description)
							sender(senderID, phrase.description);
					});
				}
                    }];

		async.eachSeries(phrases, function (phrase, nextPhrase) {
			var test = phrase.pattern.test(message);

			if (!test) {
				nextPhrase();
			} else {
				var params = phrase.pattern.exec(message);
				params.splice(0, 1);
				delete params['index'];
				delete params['input'];

				// Если последняя итерация годная и текущая такая же
				if (lastPhrase == phrases.indexOf(phrase)) {
					++lastCount;
				} else {
					lastCount = 0;
				}

				lastPhrase = phrases.indexOf(phrase);
				var sender = function (receiver, message) {
					steamFriends.sendMessage(receiver, message);

					console.log(logPref + 'отправил пользователю ' + friendsInfo[receiver].name + ' сообщение ' + message);
				}

				params.unshift(sender, lastCount);

				phrase.response.apply(null, params);
			}
		}, function (end) {});

		break;
	case 2:
			console.log(logPref + 'Пользователь ' + senderID + ' пишет мне сообщение...');
	case 6:
			console.log(logPref + 'Пользователь ' + senderID + ' отказался мне писать :C');
		break;
	}
}