var Promise = require('bluebird');

var getQuote = require('./lib/getQuote.js');
var enterPosition = require('./lib/enterPosition.js');
var exitPosition = require('./lib/exitPosition.js');

var Bot = function() {
  this.exchanges = require('./lib/exhanges.js');

  this.coins = require('./lib/coins.js');

  this.positions = [];

  this.quotes = [];

  this.delayMs = 1000 * 30;

  this.targetSpread = 0.80;
};

Bot.prototype.getQuotes = async function() {
  var self = this;

  var quotes = [];

  await Promise.each(self.exchanges, async function(exchange) {
    await Promise.each(self.coins, async function(coin) {
      quotes.push(await getQuote(exchange, coin));
    });
  });

  return quotes;
};

Bot.prototype.enterPositions = async function() {
  var self = this;

  var positionsToEnter = [];

  self.exchanges.forEach(function(exchangeLong) {
    self.exchanges.forEach(function(exhangeShort) {
      if (exchangeLong === exhangeShort) {
        return;
      }

      self.coins.forEach(function(coin) {
        var positionExists = self.positions.find(function(position) {
          return position.exchangeLong === exchangeLong && position.exhangeShort === exchangeShort && position.coin === coin;
        });

        if (positionExists) {
          return;
        }

        var longQuote = self.quotes.find(function(quote) {
          return quote.coin === coin && quote.exchange === exchangeLong;
        });

        var shortQuote = self.quotes.find(function(quote) {
          return quote.coin === coin && quote.exchange === exhangeShort;
        });

        var priceLong = longQuote.ask;
        var priceShort = shortQuote.bid;
        var spread = (priceShort - priceLong) / priceLong;

        if (spread < self.targetSpread) {
          return;
        }

        var fees = longQuote.fees + shortQuote.fees;

        positionToEnter.push({
          exchangeLong: exchangeLong,
          exchangeShort: exchangeShort,
          coin: coin,
          longQuote: longQuote,
          shortQuote: shortQuote,
          fees: fees
        });
      });
    });
  });

  await Promise.each(positionsToEnter, async function(positionToEnter) {
    positions.push(await enterPosition(positionToEnter));
  });
};

Bot.prototype.exitPositions = async function() {
  var self = this;

  var positionsToExit = [];

  self.exchanges.forEach(function(exchangeLong) {
    self.exchanges.forEach(function(exhangeShort) {
      if (exchangeLong === exhangeShort) {
        return;
      }

      self.coins.forEach(function(coin) {
        var positionExists = self.positions.find(function(position) {
          return position.exchangeLong === exchangeLong && position.exhangeShort === exchangeShort && position.coin === coin;
        });

        if (positionExists) {
          return;
        }

        var longQuote = self.quotes.find(function(quote) {
          return quote.coin === coin && quote.exchange === exchangeLong;
        });

        var shortQuote = self.quotes.find(function(quote) {
          return quote.coin === coin && quote.exchange === exhangeShort;
        });

        var priceLong = longQuote.bid;
        var priceShort = shortQuote.ask;
        var spread = (priceShort - priceLong) / priceLong;

        if (spread < self.targetSpread) {
          return;
        }

        var fees = longQuote.fees + shortQuote.fees;

        positionsToExit.push({
          exchangeLong: exchangeLong,
          exchangeShort: exchangeShort,
          coin: coin,
          longQuote: longQuote,
          shortQuote: shortQuote,
          fees: fees
        });
      });
    });
  });

  await Promise.each(positionsToExit, async function(positionToExit) {
    var positionIndex = positions.findIndex(function(position) {
      return position.exchangeLong === positionToExit.exchangeLong && position.exhangeShort === positionToExit.exchangeShort && position.coin === positionToExit.coin;
    });

    await enterPosition(positionToExit);

    positions.splice(positionIndex, 1);
  });
};

Bot.prototype.run = async function() {
  var self = this;

  self.quotes = await self.getQuotes();

  await self.enterPositions();
  await self.exitPositions();

  setTimeout(function() {
    self.run();
  }, self.delayMs);
};

(async function() {
  var bot = new Bot();

  bot.run();
})();
