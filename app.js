var Promise = require('bluebird');

var coins = require('./lib/coins.js');
var exchanges = require('./lib/exhanges.js');

var getQuote = require('./lib/getQuote.js');
var enterPosition = require('./lib/enterPosition.js');
var exitPosition = require('./lib/exitPosition.js');

var Bot = function(coin) {
  this.coin = coin;

  this.positions = [];

  this.quotes = [];

  this.delay = 1000 * 30;

  this.targetSpread = 0.80;
};

Bot.prototype.getQuotes = async function() {
  var self = this;

  var quotes = [];

  await Promise.each(exchanges, async function(exchange) {
    quotes.push(await getQuote(exchange, self.coin));
  });

  return quotes;
};

Bot.prototype.enterPositions = async function() {
  var self = this;

  var positionsToEnter = [];

  exchanges.forEach(function(exchangeLong) {
    exchanges.forEach(function(exhangeShort) {
      if (exchangeLong.name === exhangeShort.name) {
        return;
      }

      var positionIndex = self.positions.findIndex(function(position) {
        return position.exchangeLong.name === exchangeLong.name && position.exhangeShort.name === exchangeShort.name;
      });

      if (positionIndex !== -1) {
        return;
      }

      var longQuote = self.quotes.find(function(quote) {
        return quote.exchange.name === exchangeLong.name;
      });

      var shortQuote = self.quotes.find(function(quote) {
        return quote.exchange.name === exhangeShort.name;
      });

      var priceLong = longQuote.ask;
      var priceShort = shortQuote.bid;
      var spread = (priceShort - priceLong) / priceLong;

      if (spread < self.targetSpread) {
        return;
      }

      var fees = exchangeLong.longFees + exhangeShort.shortFees;

      positionToEnter.push({
        exchangeLong: exchangeLong,
        exchangeShort: exchangeShort,
        longQuote: longQuote,
        shortQuote: shortQuote,
        fees: fees,
        positionIndex: positionIndex
      });
    });
  });

  await Promise.each(positionsToEnter, async function(positionToEnter) {
    self.positions.push(await enterPosition(positionToEnter));
  });
};

Bot.prototype.exitPositions = async function() {
  var self = this;

  var positionsToExit = [];

  exchanges.forEach(function(exchangeLong) {
    exchanges.forEach(function(exhangeShort) {
      if (exchangeLong.name === exhangeShort.name) {
        return;
      }

      var positionIndex = self.positions.findIndex(function(position) {
        return position.exchangeLong.name === exchangeLong.name && position.exhangeShort.name === exchangeShort.name;
      });

      if (positionIndex === -1) {
        return;
      }

      var longQuote = self.quotes.find(function(quote) {
        return quote.exchange.name === exchangeLong.name;
      });

      var shortQuote = self.quotes.find(function(quote) {
        return quote.exchange.name === exhangeShort.name;
      });

      var priceLong = longQuote.bid;
      var priceShort = shortQuote.ask;
      var spread = (priceShort - priceLong) / priceLong;

      if (spread < self.targetSpread) {
        return;
      }

      var fees = exchangeLong.longFees + exhangeShort.shortFees;

      positionsToExit.push({
        exchangeLong: exchangeLong,
        exchangeShort: exchangeShort,
        coin: coin,
        longQuote: longQuote,
        shortQuote: shortQuote,
        fees: fees,
        positionIndex: positionIndex
      });
    });
  });

  await Promise.each(positionsToExit, async function(positionToExit) {
    await enterPosition(positionToExit);

    self.positions.splice(positionToExit.positionIndex, 1);
  });
};

Bot.prototype.run = async function() {
  var self = this;

  self.quotes = await self.getQuotes();

  await self.enterPositions();
  await self.exitPositions();

  setTimeout(function() {
    self.run();
  }, self.delay);
};

(async function() {
  var bots = {};

  coins.forEach(function(coin) {
    bots[coin] = new Bot(coin);

    bots[coin].run();
  });
})();
