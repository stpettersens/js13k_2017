'use strict'
/*
  js13k 2017
  Blackjack implemented in under 13kb.

  Copyright 2017 Sam Saint-Pettersen.
  Released under the MIT License.
*/

/* global sessionStorage */

// #if TEST
const DEBUG = true // Set debug mode on/off.
// #endif
let playing = true // Game state; playing at initialization.

// Cards object represents all the playing cards.
let cards = {
  number: 52,
  deck: [],
  played: [],
  ranks: ['A', 2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K'],
  suits: ['\u2665', '\u25C6', '\u2663', '\u2660']
}

// Player object represents player in game.
let player = {
  name: 'Player',
  cards: [],
  values: [],
  total: 0
}

// Dealer object represents the dealer in game.
let dealer = {
  name: 'Dealer',
  cards: [],
  values: [],
  total: 0
}

/**
 * Draw a message to the game canvas.
 * @param {Context2d} ctx - 2D drawing context object.
 * @param {String} msg - Message to write to game canvas.
 * @param {Number} x - X position.
 * @param {Number} y - Y position.
 */
function drawMessage (ctx, msg, x, y) {
  ctx.font = '14pt Verdana'
  ctx.fillStyle = 'black'
  ctx.fillText(msg, x, y)
}

/**
 * Draw a card sprite to the game canvas.
 * @param {Context2d} ctx - 2d drawing context object.
 * @param {String} card - Card string in rank-suit notation.
 * @param {Number} x - X position.
 * @param {Number} y - Y position.
*/
function drawSprite (ctx, card, x, y) {
  const w = 60
  const h = 80
  let color = 'black'
  if (card.length === 4) card = card.replace(' ', '')
  if (/\u2665|\u25C6/.test(card)) color = 'red'
  ctx.rect(x, y, w, h)
  ctx.font = '14pt Verdana'
  ctx.fillStyle = color
  ctx.fillText(card, x + 12, y + 50)
  ctx.stroke()
}

/**
 * Clear the game canvas (i.e. the blackjack table).
 * @param {Context2d} ctx - 2D drawing context object.
 */
function clear (ctx) {
  ctx.clearRect(0, 0, 800, 560)
}

/**
 * Calculate the total value of actor's held cards.
 * @param {Object} actor - Actor object (i.e. player or dealer).
 * @returns {Number} The total value of the actor's held cards.
 */
function calcTotal (actor) {
  actor.values.sort(function (a, b) { return b - a })
  let total = 0
  for (let i = 0; i < actor.values.length; i++) {
    let v = actor.values[i]
    if (v === 1) {
      if ((total + 11) <= 21) v = 11
      else if ((total + 11) > 21) v = 1
    }
    total += v
  }
  actor.total = total
  return total
}

/**
 * Get a randomized playing card.
 * @param {Object} cards - Cards object (i.e. the playing cards).
 * @returns {String} The randomized playing card in rank-suit notation.
 */
function getCard (cards) {
  const ir = Math.floor(Math.random() * cards.ranks.length)
  const is = Math.floor(Math.random() * cards.suits.length)
  return cards.ranks[ir] + ' ' + cards.suits[is]
}

/**
 * Get value for a playing card.
 * @param {String} card - Playing card in rank-suit string notation.
 * @returns {Number} The value of the card.
*/
function getValue (card) {
  const vs = card.split(' ')
  let value = 0
  if (vs[0] === 'A') value = 1
  else if (/J|Q|K/.test(vs[0])) value = 10
  else value = parseInt(vs[0])
  return value
}

/**
 * Shuffle the cards (i.e. populate the deck with 52 randomized cards).
 * @param {Object} cards - Cards object (i.e. the playing cards).
*/
function shuffle (cards) {
  while (true) {
    let card = getCard(cards)
    if (cards.deck.indexOf(card) === -1) {
      cards.deck.push(card)
      if (cards.deck.length === cards.number) break
    }
  }
}

/**
 * Draw a card.
 * @param {Object} cards - Cards object (i.e. the playing cards).
 * @returns {String} A playing card in rank-suit notation.
*/
function drawCard (cards) {
  let card = cards.deck.pop()
  cards.played.push(card)
  return card
}

/**
 * Receive cards to an actor.
 * @param {Context2d} ctx - 2D drawing context object.
 * @param {Object} actor - Actor (i.e. player or dealer) to receive the cards.
 * @param {Object} cards - Cards object (i.e. the playing cards).
*/
function receiveCards (ctx, actor, cards) {
  let card = ''
  for (let i = 0; i < 2; i++) {
    card = drawCard(cards)
    actor.cards.push(card)
    actor.values.push(getValue(card))
  }
  // #if TEST
  log(actor.name + ' receives their cards.')
  // #endif
  calcTotal(actor)
}

/**
 * Take a hit to an actor.
 * @param {Context2d} ctx - 2D drawing context object.
 * @param {Object} actor - Actor (i.e. player or dealer) to take card.
 * @param {Object} cards - Cards object (i.e. the playing cards).
*/
function hit (ctx, actor, cards) {
  const card = drawCard(cards)
  actor.cards.push(card)
  actor.values.push(getValue(card))
  // #if TEST
  log(actor.name + ' hits.')
  // #endif
  calcTotal(actor)
}

/**
 * Take a stand to an actor.
 * @param {Context2d} ctx - 2D drawing context object.
 * @param {Object} actor - Actor (i.e. player or dealer) to stand on cards.
*/
function stand (ctx, actor) {
  // #if TEST
  log(actor.name + ' stands.')
  log(actor.name + ' has ' + calcTotal(actor))
  // #endif
  calcTotal(actor)
  update(ctx, dealer, player)
}

/**
 * Get player's balance.
*/
function getBalance () {
  log('Player balance is $' + parseInt(sessionStorage.getItem('money')))
  return parseInt(sessionStorage.getItem('money'))
}

/**
 * Player loses the bet. - $100 from money.
*/
function lose () {
  log('Player loses $ 100')
  if (!playing) sessionStorage.setItem('money', getBalance() - 100)
}

/**
 * Player wins the bet. + $100 to money.
*/
function win () {
  log('Player wins $ 100')
  if (!playing) sessionStorage.setItem('money', getBalance() + 100)
}

/**
 * Dealer responds to player's stand.
 * @param {Context2d} ctx - 2D drawing context object.
 * @param {Object} dealer - Dealer object (i.e. the game's dealer).
 * @param {Object} cards - Cards object (i.e. the playing cards).
*/
function respond (ctx, dealer, cards) {
  let responding = true
  while (responding) {
    let total = 0
    while (total <= 18) {
      total = calcTotal(dealer)
      if (total === 16) {
        if (Math.floor(Math.random() * 6) >= 3) {
          hit(ctx, dealer, cards) // Take a risk!
        } else {
          stand(ctx, dealer, cards) // Play it safe.
        }
      } else if (total >= 17) {
        stand(ctx, dealer, cards)
        responding = false
        break
      } else {
        hit(ctx, dealer, cards)
      }
    }
  }
}

/**
 * Determine if an actor has Blackjack!
 * @param {Object} actor - Actor (i.e. player or dealer).
 * @returns {Boolean} Does actor have Blackjack?
*/
function hasBlackjack (actor) {
  let blackjack = false
  if (actor.total === 21) {
    blackjack = true
  }
  return blackjack
}

/**
 * Determine if an actor is bust!
 * @param {Object} actor - Actor (i.e. player or dealer).
 * @returns {Boolean} Is actor bust?
*/
function isBust (actor) {
  let bust = false
  if (actor.total > 21) {
    bust = true
  }
  return bust
}

/**
 * Show cards. That is return card total for an actor.
 * @param {Context2d} ctx - 2D drawing context object.
 * @param {Object} actor - Actor (i.e. player or dealer).
 * @returns {Number} Return card total for actor.
*/
function showCards (ctx, actor) {
  let cards = ''
  for (let i = 0; i < actor.cards.length; i++) {
    cards += ' ' + actor.cards[i]
  }
  // #if TEST
  log(actor.name + ' has:')
  log(cards + ' --> ' + calcTotal(actor))
  // #endif
  return actor.total
}

/**
 * Update the canvas (i.e. the blackjack table).
 * @param {Context2d} ctx - 2D drawing context object.
 * @param {Object} dealer Dealer object.
 * @param {Object} player Player object.
*/
function update (ctx, dealer, player) {
  clear(ctx)
  let x = 575
  drawMessage(ctx, 'Balance $ ' + getBalance(), x, 50)
  x = 180
  drawMessage(ctx, dealer.name.toUpperCase(), 250, 50)
  drawSprite(ctx, dealer.cards[0], x, 110)
  drawMessage(ctx, calcTotal(player), 250, 430)
  drawMessage(ctx, player.name.toUpperCase(), 250, 400)
  for (let i = 0; i < player.cards.length; i++) {
    drawSprite(ctx, player.cards[i], x, 250)
    x += 80
  }
  if ((hasBlackjack(dealer) || isBust(dealer)) ||
  (hasBlackjack(player) || isBust(player))) {
    if (playing) endGame(ctx, dealer, player)
  }
  if (!playing) {
    let x = 260
    drawMessage(ctx, calcTotal(dealer), 250, 80)
    for (let i = 1; i < dealer.cards.length; i++) {
      drawSprite(ctx, dealer.cards[i], x, 110)
      x += 80
    }
    drawMessage(ctx, 'New Game? [Y/N]', 250, 520)
  } else {
    drawMessage(ctx, 'Hit [H] or Stand? [S]', 250, 520)
  }
}

/**
 * Start a new game.
 * @param {Context2d} ctx - 2D drawing context object.
 * @param {Object} cards - Cards object.
 * @param {Object} player - Player object.
 * @param {Object} dealer - Dealer object.
*/
function newGame (ctx, cards, player, dealer) {
  if (parseInt(sessionStorage.getItem('initial')) !== 1) {
    sessionStorage.setItem('money', -1000) // Start in debt.
    sessionStorage.setItem('initial', 1)
  }
  const loaded = sessionStorage.getItem('loaded')
  if (parseInt(loaded) !== 1) {
    window.location.reload(true)
    sessionStorage.setItem('loaded', 1)
  }
  playing = true
  reset(cards, player, dealer)
  shuffle(cards)
  receiveCards(ctx, player, cards)
  receiveCards(ctx, dealer, cards)
  update(ctx, dealer, player)
}

/**
 * Reset the game objects.
 * @param {Object} cards - Cards object.
 * @param {Object} player - Player object.
 * @param {Object} dealer - Dealer object.
*/
function reset (cards, player, dealer) {
  cards.deck = []
  cards.played = []
  player.cards = []
  player.values = []
  player.total = 0
  dealer.cards = []
  dealer.values = []
  dealer.total = 0
}

/**
 * End the game.
 * @param {Context2d} ctx - 2D drawing context object.
 * @param {Object} dealer - Dealer object.
 * @param {Object} player - Player object.
*/
function endGame (ctx, dealer, player) {
  playing = false
  let ds = showCards(ctx, dealer)
  let ps = showCards(ctx, player)
  if (ps === 21 && ds !== 21) {
    drawMessage(ctx, 'Player has Blackjack!', 250, 480)
    win()
  } else if (ds === 21 && ps !== 21) {
    drawMessage(ctx, 'Dealer has Blackjack!', 250, 480)
  } else if ((ps === ds) || (ps > 21 && ds > 21)) {
    drawMessage(ctx, 'Push. Nobody won.', 250, 480)
    win()
  } else if (ps <= 21 && ps > ds) {
    drawMessage(ctx, 'Player wins with ' + ps + '.', 250, 480)
    win()
  } else if (ds <= 21 && ds > ps) {
    drawMessage(ctx, 'Dealer wins with ' + ds + '.', 250, 480)
    lose()
  } else if (ps > 21 && ds <= 21) {
    drawMessage(ctx, 'Dealer wins. Player bust.', 250, 480)
    lose()
  } else if (ds > 21 && ps <= 21) {
    drawMessage(ctx, 'Player wins. Dealer bust.', 250, 480)
    win()
  }
  sessionStorage.setItem('loaded', 0)
}

/**
 * Redirect to GitHub project page.
*/
function exitToGitHub () {
  window.location.href = 'https://github.com/stpettersens/js13k_2017'
}

/**
 * Check not mobile. Not optimized for mobile.
*/
function isNotMobile () {
  if (/Android|iPhone/.test(navigator.userAgent)) {
    window.alert('This game is not compatible with mobile devices.')
    exitToGitHub()
  }
}

// #if TEST
/**
 * Log message to console when in DEBUG mode.
 * @param {String} msg - Message to print to console.
*/
function log (msg) {
  if (DEBUG) {
    console.log(msg)
  }
}
// #endif

/**
 * Entry ("main") function.
*/
window.onload = function () {
  isNotMobile() // Ensure not on a mobile device.
  const canvas = document.getElementById('js13k')
  canvas.width = 800
  canvas.height = 560
  canvas.style.border = '1px solid rgb(0, 0, 0)'
  const ctx = canvas.getContext('2d')
  // #if TEST
  log('Welcome to @stpettersens\' js13k 2017 entry! ' + cards.suits[0])
  // #endif
  newGame(ctx, cards, player, dealer)

  document.addEventListener('keydown', function (event) {
    if (playing && event.keyCode === 72) {
      hit(ctx, player, cards)
      update(ctx, dealer, player)
    } else if (playing && event.keyCode === 83) {
      stand(ctx, player, cards)
      respond(ctx, dealer, cards)
      playing = false
      update(ctx, dealer, player)
      endGame(ctx, dealer, player)
    } else if (!playing && event.keyCode === 89) {
      newGame(ctx, cards, player, dealer)
    } else if (!playing && event.keyCode === 78) {
      exitToGitHub()
    }
  })
}
