const fetch = require('node-fetch');
const _ = require('underscore');

class Player {
  static get VERSION() {
    return '0.2';
  }


  static sameColor(card1, card2) {
    return card1.suit === card2.suit;
  }

  static consecutive(card1, card2) {
    if (!isNaN(card1.rank)) {
      return !isNaN(card2.rank)
        ? (parseInt(card1.rank) + 1 === parseInt(card2.rank) || parseInt(card2.rank) + 1 === parseInt(card1.rank))
        : card2.rank === 'J' || (card1.rank === '2' && card2.rank === 'A');
    } else {
      return !isNaN(card2.rank)
        ? card2.rank === 10
        : ((card1.rank === 'J' && card2.rank === 'Q')
          || (card1.rank === 'Q' && (card2.rank === 'K' || card2.rank === 'J'))
          || (card1.rank === 'K' && (card2.rank === 'A' || card2.rank === 'Q'))
          || (card1.rank === 'A' && card2.rank === 'K'));
    }
  }

  static hasMultiple(cards, times) {
    var i;
    for (i = 0; i < cards.length; i++) {
      if (cards.filter(card => card.rank === cards[i].rank).length >= times) {
        return true;
      }
    }
    return false;
  }

  static hasCard(cards, rank, suit) {
    return cards.filter(card => card.rank === rank && (!suit || card.suit === suit)).length > 0;
  }

  static hasGoodStart(cards) {

    return this.hasMultiple(cards, 2) ||
      this.hasCard(cards, 'A') ||
      this.hasCard(cards, 'K') ||
      this.hasCard(cards, 'Q') ||
      this.sameColor(cards[0], cards[1]) ||
      this.consecutive(cards[0], cards[1]);
  }

  static hasGoodFlop(cards) {

    return this.hasMultiple(cards, 2) ||
      this.hasCard(cards, 'A') ||
      this.hasCard(cards, 'K') ||
      this.sameColor(cards[0], cards[1]) ||
      this.consecutive(cards[0], cards[1]);
  }

  static allIn() {
    return (this.betValue + this.gameState.minimum_raise + this.getMe().stack - 10);
  }

  static raise(raiseValue = 1) {
    return (this.betValue + this.gameState.minimum_raise + raiseValue);
  }

  static callRound() {
    return this.betValue;
  }

  static fold() {
    return 0;
  }


  static getMe() {
    return this.gameState.players[this.gameState.in_action];
  }

  static getMaxBet() {
    return _.max(this.gameState.players, player => player.bet).bet;
  }

  static tooRisky(factor = 0.3) {
    const maxBet = this.getMaxBet();
    console.log("maxBet",maxBet);
    return (this.getMe()['bet'] + Math.round(this.getMe()['stack'] * factor) < maxBet) || this.getMe()['stack'] <= maxBet;
  }

  // GETS CALLED
  static betRequest(gameState, bet) {

    this.gameState = gameState;
    this.betValue = gameState.current_buy_in - this.getMe()['bet'];
    const cards = gameState.community_cards.concat(this.getMe()['hole_cards']);
    let betValue = 0;


    try {

      //Check initial cards on hand before comm flipped
      if (gameState.community_cards.length === 0) {
        if (this.hasGoodStart(cards) || (this.getMe()['bet'] > 0)) {
          if (!this.tooRisky()) {
            betValue = this.callRound();
          }
        }
        console.log("######## WE BET (without community card) WITH: " + betValue + " ########");
        bet(betValue)
      } else {
        // community cards are available, we check API
        const rankingUrl = "http://rainman.leanpoker.org/rank" + "?cards=" + encodeURI(JSON.stringify(cards));
        console.log(rankingUrl);
        let fetchRequest = fetch(rankingUrl, {method: 'GET'})
          .then(response => response.json())
          .then(json => {
            let rank = json.rank;


            if(this.tooRisky()) {
              const maxBet = this.getMaxBet();
              console.log("Too RIsky:", this.getMe()['bet'] + Math.round(this.getMe()['stack'] * .3) < maxBet,  this.getMe()['stack'] <= maxBet);
            }
            console.log("RANK: ", rank);
            //Flop
            if (gameState.community_cards.length === 3) {


              if (rank < 2 && this.tooRisky()) {
                console.log("Flop A", rank);
                betValue = this.fold();
              } else if (rank === 1) {
                console.log("Flop B", rank);
                betValue = this.callRound();
              } else if (rank > 1 && this.tooRisky()) {
                console.log("Flop C", rank);
                betValue = this.fold();
              } else if (rank > 1) {
                console.log("Flop D", rank);
                betValue = this.callRound();
              } else if (rank === 0 && this.hasGoodFlop(cards)) {
                console.log("Flop E", rank);
                betValue = this.callRound();
              } else if (rank === 0) {
                console.log("Flop F", rank);
                betValue = this.callRound();
              } else {
                console.log("Flop G", rank);
                betValue = this.callRound();
              }


              // The Turn
            } else if (gameState.community_cards.length === 4) {


              if (rank < 2 && this.tooRisky()) {
                console.log("Turn A", rank);
                betValue = this.fold();
              } else if (rank === 1) {
                console.log("Turn B", rank);
                betValue = this.callRound();
              } else if (rank > 1 && this.tooRisky()) {
                console.log("Turn C", rank);
                betValue = this.fold();
              } else if (rank > 3) {
                console.log("Turn D", rank);
                betValue = this.raise(5 * rank);
              } else if (rank === 0 && this.hasGoodFlop(cards)) {
                console.log("Turn E", rank);
                betValue = this.callRound();
              } else if (rank === 0) {
                console.log("Turn F", rank);
                betValue = this.callRound();
              } else {
                console.log("Turn G", rank);
                betValue = this.callRound();
              }


              //The River
            } else if (gameState.community_cards.length === 5) {

              if (rank < 2 && this.tooRisky()) {
                console.log("River A", rank);
                betValue = this.fold();
              } else if (rank === 1) {
                console.log("River B", rank);
                betValue = this.callRound();
              } else if (rank > 1 && this.tooRisky()) {
                console.log("River C", rank);
                betValue = this.fold();
              } else if (rank > 3) {
                console.log("River D", rank);
                betValue = this.raise(10 * rank);
              } else if (rank === 0 && this.hasGoodFlop(cards)) {
                console.log("River E", rank);
                betValue = this.callRound();
              } else if (rank === 0) {
                console.log("River F", rank);
                betValue = this.callRound();
              } else {
                console.log("River G", rank);
                betValue = this.callRound();
              }

              //
              // if (rank === 1) {
              //   betValue = this.callRound();
              // } else if (rank > 1 && rank <= 3) {
              //   betValue = this.raise(1);
              // } else if (rank > 3) {
              //   betValue = this.raise(10 * rank);
              // } else if (rank === 0) {
              //   betValue = this.callRound();
              // }

            }


            if (rank >= 7) {
              betValue = this.allIn();
            }

            console.log("######## WE BET (with community card) WITH: " + betValue + " ########");
            bet(betValue);
          })
          .catch(err => {
            console.error(err);
            console.log("######## FETCH ERROR, betting with: " + betValue + " ########");
            bet(0);
          });

      }

    }
    catch (e) {
      console.log("######## outer CATCH, betting with: " + this.raise(1) + " ########");
      bet(this.raise(1));
    }

  }

  static showdown(gameState) {
  }
}

module.exports = Player;
