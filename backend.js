const express = require('express')
const app = express()

// socket.io setup
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server)

const port = 3000

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

const games = new Map()


function isTrump(card,socket,ignOdl=false) {
    if (card[0] == 0 || card[1] == 3 || card[1] == 4 || (card[0] == 1 && card[1] == 1) || (!ignOdl && card[0] == 1 && card[1] == 5 && games.get(socket.game_id).special_cards.includes(2))) return true; else return false;
}

function giveCards(users) {
    let cards = [];
    let allCards = [];
    let givenCards = [];
    for (let i = 0; i < users.length; i++) givenCards.push(...users[i].cards);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 12; j++) {
          allCards.push([i, Math.floor(j/2)]);
        }
    }

    let remainingCards = [];

    for (const card of allCards) {
        const index = givenCards.findIndex(c => c[0] === card[0] && c[1] === card[1]);
        if (index === -1) {
            remainingCards.push(card);
        } else {
            givenCards.splice(index, 1);
        }
    }


    for (let i = 0; i < 12; i++) {
        const givenCard =  Math.floor(Math.random() * remainingCards.length);
        cards.push(remainingCards[givenCard]);
        if (remainingCards[givenCard][0] == 3 && remainingCards[givenCard][1] == 4) party = 1;
        remainingCards.splice(givenCard, 1);
    }
    const colorSeq = [0,5,1,2];
    cards.sort((a, b) => {
        //1: a is higher, -1: b is higher
        if (isTrump(a,null,ignOdl=true)) {
        if (!isTrump(b,null,ignOdl=true)) return 1;
        if (a[0] === 0 && !(a[1] == 3 || a[1] == 4)) { // diamond
            if (b[0] !== 0 || (b[1] == 3 || b[1] == 4)) return -1;
            if (colorSeq.indexOf(b[1]) > colorSeq.indexOf(a[1])) return -1; else return 1;
        } else { // not diamond
            if (b[0] === 0 && !(b[1] == 3 || b[1] == 4)) return 1;
            if (b[0] === 1 && b[1] === 1) return -1;
            if (a[0] === 1 && a[1] === 1) return 1;
            if (b[1] === a[1]) {
            if (b[0] > a[0]) return -1; else return 1;
            }
            if (b[1] > a[1]) return -1; else return 1;
        }
        } else {
        if (isTrump(b,null,ignOdl=true)) return -1;
        if (b[0] !== a[0]) return a[0]-b[0];
        return colorSeq.indexOf(a[1]) - colorSeq.indexOf(b[1])
        }
    });
    
    return cards;
}

const colorSeq = [0,5,1,2];


function getHighestCard(cards, socket) {
  let highestCardIndex = 0;
  let highestCard = cards[0];
  for (let i = 1; i < cards.length; i++) {
    const card = cards[i];
    if (isTrump(highestCard,socket)) { // trump
      if (!isTrump(card,socket)) continue;

      if (highestCard[0] === 0 && !(highestCard[1] == 3 || highestCard[1] == 4) && !(highestCard[0] === 0 && highestCard[1] === 2 && games.get(socket.game_id).special_cards.includes(0)) && !(highestCard[0] === 0 && highestCard[1] === 0 && games.get(socket.game_id).special_cards.includes(1))) { // diamond
        if (!(card[0] === 0 && !(card[1] == 3 || card[1] == 4))) { highestCard = card; highestCardIndex = i; continue; }
        if (colorSeq.indexOf(card[1]) > colorSeq.indexOf(highestCard[1])) { highestCard = card; highestCardIndex = i; }
      } else { // not diamond
        if (highestCard[0] === 0 && highestCard[1] === 0 && games.get(socket.game_id).special_cards.includes(1)) continue;
        if (card[0] === 0 && card[1] === 0 && games.get(socket.game_id).special_cards.includes(1)) { highestCard = card; highestCardIndex = i; continue; }
        if (highestCard[0] === 0 && highestCard[1] === 2 && games.get(socket.game_id).special_cards.includes(0)) continue;
        if (card[0] === 0 && card[1] === 2 && games.get(socket.game_id).special_cards.includes(0)) { highestCard = card; highestCardIndex = i; continue; }

        if (card[0] === 1 && card[1] === 1) {
          if (!(highestCard[0] === 1 && highestCard[1] === 1 && games.get(socket.game_id).special_cards.includes(0))) {
            highestCard = card;
            highestCardIndex = i;
            continue;
          }
        }
        if (highestCard[0] === 1 && highestCard[1] === 1) continue;
        if (card[0] == 1 && card[1] == 5) { highestCard = card; highestCardIndex = i; continue; }
        if (highestCard[0] == 1 && highestCard[1] == 5) continue;
        if (card[0] === 0 && !(card[1] == 3 || card[1] == 4)) continue;
        if (card[1] > highestCard[1]) { highestCard = card; highestCardIndex = i; continue; }
        if (card[1] === highestCard[1] && card[0] > highestCard[0]) { highestCard = card; highestCardIndex = i; }
      }
    } else { // not trump
      if (isTrump(card,socket)) { highestCard = card; highestCardIndex = i; continue; }
      if (card[0] !== highestCard[0]) continue;
      if (colorSeq.indexOf(card[1]) > colorSeq.indexOf(highestCard[1])) { highestCard = card; highestCardIndex = i; }
    }
  }
  return highestCardIndex;
}

function censorUserData(odata, UserId) {
  data = JSON.parse(JSON.stringify(odata))
  data.users.forEach(user => {
    if (user.userId != UserId) {
      user.cards = user.cards.length
      user.party = -1
    }
    delete user.socketId
    user.tricks = user.tricks.length
    user.points = -1
    user.special_cards = 0
  });
  return data;
}

function addPoint(points, point_name, val=1) {
  if (points.findIndex(arr => arr[0] === point_name) != -1) {
    points[points.findIndex(arr => arr[0] === point_name)][1] += val
    return
  }
  points.push([point_name, val])
}

function endTrick(socket) {
  console.log("Trick ended in game "+socket.game_id)
  const trick_cards = [];
  const game = games.get(socket.game_id);
  for (let i = game.currentTrick.start; i < 4+game.currentTrick.start;i++) trick_cards.push(game.currentTrick[(i%4).toString()]);
  const highestCard = getHighestCard(trick_cards, socket)
  const winner = (highestCard+game.currentTrick.start)%4;
  game.users[winner].tricks.push(...trick_cards)
  console.log(trick_cards, highestCard)

  //special points
  //fuchs
  foxIndex = trick_cards.findIndex(arr => arr[0] === 0 && arr[1] === 2);
  if (foxIndex != -1 && foxIndex != highestCard && !game.special_cards.includes(0)) {
    io.to(socket.game_id).emit('special_point', {point_name: "Fuchs", winner})
    if (game.users[(foxIndex+game.currentTrick.start)%4].party != game.users[winner].party) {
      addPoint(game.users[winner].points, "Fuchs gefangen")
    }
  }
  //klabautermann
  queenOfSpadesIndex = trick_cards.findIndex(arr => arr[0] === 2 && arr[1] === 4);
  if (queenOfSpadesIndex == highestCard) {
    kingOfSpadesIndex = trick_cards.findIndex(arr => arr[0] === 2 && arr[1] === 5);
    if (kingOfSpadesIndex != -1 && kingOfSpadesIndex < queenOfSpadesIndex) {
      io.to(socket.game_id).emit('special_point', {point_name: "Klabautermann", winner})
      addPoint(game.users[winner].points, "Klabautermann")
    }
  }
  




  game.currentTrick = {}
  game.currentTrick.start = winner
  io.to(socket.game_id).emit('new_trick', games.get(socket.game_id).currentTrick)
  if (Object.keys(game.users[0].cards).length == 0) endGame(socket);
}

function endGame(socket) {
  console.log("Game "+socket.game_id+" ended")
  let results = {"1": {users: [], points: {}, eyes: 0}, "0": {users: [], eyes: 0}}
  const game = games.get(socket.game_id);
  const cardsWorth = [0,10,11,2,3,4]
  const playerCount = Object.keys(game.users).length;
  let card;
  for (let i = 0; i < playerCount; i++) {
    let count = 0;
    for (let j = 0; j < game.users[i].tricks.length; j++) {
      card = game.users[i].tricks[j];
      count += cardsWorth[card[1]]
    }
    results[game.users[i].party].eyes += count;
    results[game.users[i].party].users.push(game.users[i].username)
    for (let j = 0; j < game.users[i].points.length; j++) {
      if (results[1].points[game.users[i].points[j][0]])
        results[1].points[game.users[i].points[j][0]] += (game.users[i].party ? 1 : -1) * game.users[i].points[j][1]
      else 
        results[1].points[game.users[i].points[j][0]] = (game.users[i].party ? 1 : -1) * game.users[i].points[j][1]
    }
  }
  if (results[1].eyes > 120) results[1].points["Gewonnen"] = 1;
  if (results[1].eyes <= 120) {
    results[1].points["Gewonnen"] = -1;
    results[1].points["Gegen die Alten"] = -1;
  }
  console.log(results);
  io.to(socket.game_id).emit('game_ended', results)
  games.delete(socket.game_id)

}

function getColor(card, socket) {
  if (isTrump(card,socket)) return 4;
  return card[0]
}

function getSpecialCards(socket) {
  game = games.get(socket.game_id)
  user = game.users[socket.userId]
  pigs = 0
  superPigs = 0
  oedel = 0
  user.cards.forEach((card) => {
    if (card[0] == 0 && card[1] == 2) pigs++
    else if (card[0] == 0 && card[1] == 0) superPigs++
    else if (card[0] == 1 && card[1] == 5) oedel++
  })
  if (oedel == 2) {
    user.special_cards.push(2)
    user.cards.splice(user.cards.findIndex(arr => arr[0] == 1 && arr[1] == 5), 1)
    user.cards.splice(user.cards.findIndex(arr => arr[0] == 1 && arr[1] == 5), 1)
    h10Index = user.cards.findIndex(arr => arr[0] == 1 && arr[1] == 1)
    if (h10Index == -1) {
      user.cards.splice(user.cards.length, 0, [1,5])
      user.cards.splice(user.cards.length, 0, [1,5])
    } else if (user.cards.slice(h10Index+1).findIndex(arr => arr[0] == 1 && arr[1] == 1) == -1) {
      user.cards.splice(user.cards.length-1, 0, [1,5])
      user.cards.splice(user.cards.length-1, 0, [1,5])
    } else {
      user.cards.splice(user.cards.length-2, 0, [1,5])
      user.cards.splice(user.cards.length-2, 0, [1,5])
    }
  }

  if (pigs == 2) {
    user.special_cards.push(0)
    user.cards.splice(user.cards.findIndex(arr => arr[0] == 0 && arr[1] == 2), 1)
    user.cards.splice(user.cards.findIndex(arr => arr[0] == 0 && arr[1] == 2), 1)
    user.cards.splice(user.cards.length, 0, [0,2])
    user.cards.splice(user.cards.length, 0, [0,2])
  }
  if (superPigs == 2 && pigs == 2) {
//    user.special_cards.push(1) they arent super pigs yet bc pigs were not laid
    user.cards.splice(user.cards.findIndex(arr => arr[0] == 0 && arr[1] == 0), 1)
    user.cards.splice(user.cards.findIndex(arr => arr[0] == 0 && arr[1] == 0), 1)
    user.cards.splice(user.cards.length, 0, [0,0])
    user.cards.splice(user.cards.length, 0, [0,0])
  }
}


function checkForSuperPigs(socket) {
  game = games.get(socket.game_id)
  game.users.forEach((user) => {
    superPigs = 0
    user.cards.forEach((card) => {
      if (card[0] == 0 && card[1] == 0) superPigs++
    })
    if (superPigs == 2 && game.special_cards.includes(0)) {
      user.special_cards.push(1)
      user.cards.splice(user.cards.findIndex(arr => arr[0] == 0 && arr[1] == 0), 1)
      user.cards.splice(user.cards.findIndex(arr => arr[0] == 0 && arr[1] == 0), 1)
      user.cards.splice(user.cards.length, 0, [0,0])
      user.cards.splice(user.cards.length, 0, [0,0])
    }
  })
}



io.on('connection', (socket) => {
  //console.log('a user connected')
  function isValid(cardId) {
    const curGame = games.get(socket.game_id)
    if (Object.keys(curGame.users).length != 4) return false;
    if (!(curGame.currentTrick[(socket.userId+3)%4] || curGame.currentTrick.start == socket.userId)) return false;
    if (curGame.currentTrick[socket.userId]) return false;
    if (!curGame.users[socket.userId].cards[cardId]) return false;

    //actual rules
    if (curGame.currentTrick.start == socket.userId) return true //the first player can do whatever they want
    startColor = getColor(curGame.currentTrick[curGame.currentTrick.start], socket)
    if (getColor(curGame.users[socket.userId].cards[cardId], socket) != startColor) 
      for (let i = 0; i < curGame.users[socket.userId].cards.length; i++)
        if (getColor(curGame.users[socket.userId].cards[i], socket) == startColor)
          return false;

    return true
  }


  socket.on('join_game', (game_id, username) => {
    //if (socket.game_id) {socket.emit("error", "already in game"); return}
    if (game_id.length != 5 || username.length == 0) { socket.emit("error", "invalid name/id"); return }
    if ((games.has(game_id) ? games.get(game_id).users.length : 0) >= 4) { socket.emit("error", "game is full"); return }

    socket.join(game_id)
    socket.userId = games.has(game_id) ? games.get(game_id).users.length : 0;
    socket.username = username
    socket.game_id = game_id
    socket.broadcast.to(game_id).emit('user_joined', { username, userId: socket.userId })

    if (!games.has(game_id)) {
        games.set(game_id, {users: [], currentTrick: {"start": 0}, results: {}, type: -1, special_cards: []});
        //type -1 not set (not started)  0 normal  1 solo or something
    }

    cards = giveCards(games.get(game_id).users)
    party = Number(cards.some(subArray => {
      return subArray[0] === 3 && subArray[1] === 4;
    }))

    //if (socket.userId == 0) cards = [[1,5],[1,5],[0,0],[0,0],[0,2],[0,2],[2,4],[2,4],[3,4],[3,4],[1,1],[1,1]]
    
    games.get(game_id).users.push({socketId: socket.id, userId: socket.userId, username, cards, tricks: [], party, points: [], called: 0, special_cards: []});
    //points: [[name, points]]; called:  0-nothing/start  1-gesund  2-vorbehalt  3-hochzeit  [4-?]-solo
    //special_cards 0 schweine 1 superschweine 2 oedel doedel
    getSpecialCards(socket)
    socket.emit("init", censorUserData(games.get(game_id), socket.userId))
    console.log("User "+username+" joined game "+game_id)
  })


  socket.on('place_card', (card) => {
    if (isValid(card)) {
      game = games.get(socket.game_id)
      game.currentTrick[socket.userId] = game.users[socket.userId].cards[card]
      io.to(socket.game_id).emit('placed_card', { userId: socket.userId, card: game.users[socket.userId].cards[card], currentTrick: game.currentTrick});
      cardValue = game.users[socket.userId].cards[card]
      //check if special card
      if (cardValue[0] == 0 && cardValue[1] == 2) {
        if (game.users[socket.userId].special_cards.includes(0)) {
          game.special_cards.push(0)
          io.to(socket.game_id).emit('special_card', {userId: socket.userId, card: "Schwein", cardId: 0})
          checkForSuperPigs(socket)
        }
      } else if (cardValue[0] == 0 && cardValue[1] == 0) {
        if (game.users[socket.userId].special_cards.includes(1)) {
          game.special_cards.push(1)
          io.to(socket.game_id).emit('special_card', {userId: socket.userId, card: "Super-Schwein", cardId: 1})
        }
      } else if (cardValue[0] == 1 && cardValue[1] == 5) {
        if (game.users[socket.userId].special_cards.includes(2)) {
          game.special_cards.push(2)
          io.to(socket.game_id).emit('special_card', {userId: socket.userId, card: "Ödel Dödel", cardId: 2})
        }
      }
      game.users[socket.userId].cards.splice(card, 1)
      if (Object.keys(game.currentTrick).length >= 5) endTrick(socket)
    } else {
      socket.emit("error", "illegal move")
    }
  });

  socket.on('disconnect', () => {
    //maybe add logic for removing from game? but they cant reconnect so idk

  });
})



server.listen(port, () => {
  console.log(`App listening on port ${port}`)
})

console.log('server did load')
