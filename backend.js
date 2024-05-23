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


function isTrump(card) {
    if (card[0] == 0 || card[1] == 3 || card[1] == 4 || (card[0] == 1 && card[1] == 1)) return true; else return false;
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
        if (isTrump(a)) {
        if (!isTrump(b)) return 1;
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
        if (isTrump(b)) return -1;
        if (b[0] !== a[0]) return a[0]-b[0];
        return colorSeq.indexOf(a[1]) - colorSeq.indexOf(b[1])
        }
    });
    
    return cards;
}

const colorSeq = [0,5,1,2];

function getHighestCard(cards) {
  let highestCardIndex = 0;
  let highestCard = cards[0];
  for (let i = 1; i < cards.length; i++) {
    const card = cards[i];
    if (isTrump(highestCard)) { // trump
      if (!isTrump(card)) continue;
      if (highestCard[0] === 0 && !(highestCard[1] == 3 || highestCard[1] == 4)) { // diamond
        if (card[0] !== 0 && !(card[1] == 3 || card[1] == 4)) { highestCard = card; highestCardIndex = i; continue; }
        if (colorSeq.indexOf(card[1]) > colorSeq.indexOf(highestCard[1])) { highestCard = card; highestCardIndex = i; }
      } else { // not diamond
        if (card[0] === 1 && card[1] === 1) { highestCard = card; highestCardIndex = i; continue; }
        if (card[1] > highestCard[1]) { highestCard = card; highestCardIndex = i; continue; }
        if (card[1] === highestCard[1] && card[0] > highestCard[0]) { highestCard = card; highestCardIndex = i; }
      }
    } else { // not trump
      if (isTrump(card)) { highestCard = card; highestCardIndex = i; continue; }
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
  });
  return data;
}

function endTrick(socket) {
  console.log("Trick ended in game "+socket.game_id)
  const trick_cards = [];
  const game = games.get(socket.game_id);
  for (let i = game.currentTrick.start; i < 4+game.currentTrick.start;i++) trick_cards.push(game.currentTrick[(i%4).toString()]);
  const winner = (getHighestCard(trick_cards)+game.currentTrick.start)%4;
  game.users[winner].tricks.push(...trick_cards)
  game.currentTrick = {}
  game.currentTrick.start = winner
  if (Object.keys(game.users[0].cards).length == 0) endGame(socket);
  io.to(socket.game_id).emit('new_trick', games.get(socket.game_id).currentTrick)
}

let results = {"1": {players: [], "points": {}, eyes: 0}, "0": {players: [], eyes: 0}}
function endGame(socket) {
  console.log("Game "+socket.game_id+" ended")
  const cardsWorth = [0,10,11,2,3,4]
  const playerCount = Object.keys(data.players).length;
  for (let i = 0; i < playerCount; i++) {
    let count = 0;
    for (let j = 1; j < data.players[i].tricks.length; j++) {
      const card = data.players[i].tricks[j];
      count += cardsWorth[card[1]]
    }
    results[data.players[i].party].eyes += count;
    results[data.players[i].party].players.push(data.players[i].name)
  }
  if (results[1].eyes > 120) results[1].points["Gewonnen"] = 1;
  if (results[1].eyes <= 120) {
    results[1].points["Gewonnen"] = -1;
    results[1].points["Gegen die Alten"] = -1;
  }
  console.log(results);
  data.players = {};
  data.results = results;
  data.current_trick = {"start": 0}
  return data
}

function isValid() {
  return true
}


io.on('connection', (socket) => {
  //console.log('a user connected')


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
        games.set(game_id, {users: [], currentTrick: {"start": 0}, results: {}});
    }

    cards = giveCards(games.get(game_id).users)
    party = Number(cards.some(subArray => {
      return subArray[0] === 3 && subArray[1] === 4;
    }))

    games.get(game_id).users.push({socketId: socket.id, userId: socket.userId, username, cards, tricks: [], party});
    socket.emit("init", censorUserData(games.get(game_id), socket.userId))
    //console.log(games.get(game_id).users[socket.userId])
    console.log("User "+username+" joined game "+game_id)
  })


  //example
  socket.on('place_card', (card) => {
    if (isValid) {
      games.get(socket.game_id).currentTrick[socket.userId] = games.get(socket.game_id).users[socket.userId].cards[card]
      io.to(socket.game_id).emit('placed_card', { userId: socket.userId, card: games.get(socket.game_id).users[socket.userId].cards[card], currentTrick: games.get(socket.game_id).currentTrick});
      games.get(socket.game_id).users[socket.userId].cards.splice(card, 1)
      if (Object.keys(games.get(socket.game_id).currentTrick).length >= 5) endTrick(socket)
    } else {
      socket.emit("error", "illegal move")
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected')

  });
})



server.listen(port, () => {
  console.log(`App listening on port ${port}`)
})

console.log('server did load')