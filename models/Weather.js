/**
 * 天気を教えるBOT
 * 下記のAPIを利用して天気情報を取得する
 *
 * Google Maps Geocoding API
 * https://developers.google.com/maps/documentation/geocoding/intro?hl=ja
 *
 * GoogleMap検索のように住所を検索して経度＆緯度を取得する
 *
 *
 * OpenWeatherMap API
 * http://openweathermap.org/api
 *
 * 経度＆緯度を利用して天気情報を取得する
 */
(function()
{
	'use strict';

	var self = {};

	// RtmClient
	var rtm = null;

	var config = require('./../config.js').config;
	var request = require('request');
	var _ = require('lodash');

	var message = null;
	var channel = null;

	self.init = function(obj, callback)
	{
		if (!obj.rtmClient) {
			callback(false);
			return;
		}
		if (!obj.slackMessageObj) {
			callback(false);
			return;
		}
		if (!rtm) {
			rtm = obj.rtmClient;
		}

		var slackMessageObj = obj.slackMessageObj;

		checkText(slackMessageObj.text, function(res, q)
		{
			// console.log(res, q);
			if (!res) {
				callback(false);
				return;
			}
			getGeometry(q, function(res, data)
			{
				// console.log(res, data);
				if (!res) {
					callback(false);
					return;
				}
				getWeather(data.lat, data.lng, function(res, data)
				{
					// console.log(res, data);
					// console.log(JSON.stringify(data, '', 2));
					if (res) {
						// callback(false);
						// setMessage('```' + JSON.stringify(data, '', 2) + '```');
						setMessage(data);
						/**
						 * DM の場合
						 */
						// var user = rtm.dataStore.getUserById(slackMessageObj.user);
						// var dm   = rtm.dataStore.getDMByName(user.name);
						// setChannel(dm.id);

						/**
						 * チャンネルの場合
						 */
						setChannel(slackMessageObj.channel);
						callback(true);
					}
				});
			});
		});
	};

	var checkText = function(text, callback)
	{
		text = text.replace(/[\n\r]/g, '');
		text = text.replace(/[＠]/g, '@');

		var res = false;
		var q = null;

		var reg = new RegExp('^(てんき|天気|tenki|tennki)@.+$', 'igm');

		if (reg.test(text)) {
			// console.log('まっち！');
			res = true;
		}

		if (res) {
			var texts = text.split('@');
			// console.log(text, texts);
			q = (texts[1]) ? texts[1] : null;
		}

		callback(res, q);
	};

	var getGeometry = function(q, callback)
	{
		if (!q) {
			callback(false, null);
			return;
		}
		var params = {
			address: q,
			key: config.GOOGLE_APIS_KEY,
		};

		request({ url: 'https://maps.googleapis.com/maps/api/geocode/json', qs: params }, function(error, httpResponse, body)
		{
			// console.log(error, httpResponse, body);
			// console.log(httpResponse.statusCode);
			// console.log(httpResponse.statusMessage);
			// console.log(error, body);
			if (httpResponse.statusCode === 200) {
				body = JSON.parse(body);
				// console.log(body);
				callback(true, {
					lat: body.results[0].geometry.location.lat,
					lng: body.results[0].geometry.location.lng,
				});
			} else {
				callback(false, null);
			}
		});
	};

	var getWeather = function(lat, lng, callback)
	{
		// 武蔵野市
		var params = {
			lat: lat,
			lon: lng,
			units: 'metric',
			appid: config.OPEN_WEATHER_MAP_API_KEY,
		};

		var getIcon = function(value)
		{
			switch (value) {
				case 'clear sky':
					return ':sunny:';
				case 'few clouds':
					return ':mostly_sunny:';
				case 'scattered clouds':
					return ':barely_sunny:';
				case 'broken clouds':
					return ':cloud:';
				case 'shower rain':
					return ':rain_cloud:';
				case 'rain':
					return ':umbrella_with_rain_drops:';
				case 'thunderstorm':
					return ':lightning:';
				case 'snow':
					return ':snowman_without_snow:';
				case 'mist':
					return ':fog:';
				default:
					return ':face_with_rolling_eyes:';
			}
		};

		request({ url: 'http://api.openweathermap.org/data/2.5/weather', qs: params }, function(error, httpResponse, body)
		{
			// console.log(error, httpResponse, body);
			// console.log(httpResponse.statusCode);
			// console.log(httpResponse.statusMessage);
			// console.log(error, body);
			if (httpResponse.statusCode === 200) {
				body = JSON.parse(body);

				var res = '';

				_.map(body.weather, function(obj)
				{
					// res += getIcon(obj.description) + ' ' + obj.description;
					res += getIcon(obj.description);
				});

				var rain = '0';

				if (body.hasOwnProperty('rain')) {
					if (body.rain.hasOwnProperty('3h')) {
						rain =  body.rain['3h'];
					}
				}

				// res += '気温 ' + body.main.temp + '℃, 最低気温 ' + body.main.temp_min + '℃, 最高気温 ' + body.main.temp_max + '℃\n';
				res += ' *_' + body.main.temp + '℃_*\n';
				res += '最低気温 ' + body.main.temp_min + '℃, 最高気温 ' + body.main.temp_max + '℃\n';
				res += '降水量 ' + rain + 'mm, 雲の量 ' + body.clouds.all + '％\n';
				res += '湿度 ' + body.main.humidity + '％, 気圧 ' + body.main.pressure + 'hpa\n';
				// console.log(res);
				callback(true, res);
				// callback(true, body);
			} else {
				callback(false, null);
			}
		});

	};

	self.getMessage = function()
	{
		return message;
	};

	var setMessage = function(slackMessage)
	{
		message = slackMessage;
	};

	self.getChannel = function()
	{
		return channel;
	};

	var setChannel = function(slackChannel)
	{
		channel = slackChannel;
	};

	module.exports.Weather = self;
})();