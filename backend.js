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

const secondaryTrumpColor = [0,0,0,0,0,0,0,1,2,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,0,-1,-1]

function isTrump(card,socket,ignOdl=false) {
  let gameType = 1
  if (socket) gameType = games.get(socket.game_id).type;

  if (gameType <= 11 || gameType == 21) { //standard + unrein + verlust
    if (card[1] == 3 || card[1] == 4 || (card[0] == 1 && card[1] == 1) ||
    (!ignOdl && equals2D(card, getOdelCard(socket)) && games.get(socket.game_id).special_cards.includes(2)) ||
    (!ignOdl && equals2D(card, getOdelCard(socket)) && games.get(socket.game_id).users[socket.userId].special_cards.includes(2))||

    (!ignOdl && equals2D(card, getPigCard(socket)) && games.get(socket.game_id).special_cards.includes(0)) ||
    (!ignOdl && equals2D(card, getPigCard(socket)) && games.get(socket.game_id).users[socket.userId].special_cards.includes(0))||

    (!ignOdl && equals2D(card, getSuperPigCard(socket)) && games.get(socket.game_id).special_cards.includes(1)) ||
    (!ignOdl && equals2D(card, getSuperPigCard(socket)) && games.get(socket.game_id).users[socket.userId].special_cards.includes(1))) 
      return true;
  }

 //if (secondaryTrumpColor[gameType] == card[0]) return true;    ignores pure soli

  //farbsoli
  if ((gameType <= 6 || gameType == 12) && card[0] == 0) return true;
  if ((gameType == 7 || gameType == 13) && card[0] == 1) return true;
  if ((gameType == 8 || gameType == 14) && card[0] == 2) return true;
  if ((gameType == 9 || gameType == 15) && card[0] == 3) return true;

  if ((gameType == 10 || gameType == 16) && card[1] == 0) return true;//neunersoli
  if ((gameType == 11 || gameType == 17) && card[1] == 5) return true;//koenigssoli

  if ((gameType == 18) && card[1] == 3) return true;//bubensoli
  if ((gameType == 19) && card[1] == 4) return true;//damensoli
  
  if ((gameType == 22) && (card[0] == 0 || card[0] == 1)) return true;//rotsoli
  if ((gameType == 23) && (card[0] == 2 || card[0] == 3)) return true;//schwarzsoli

  if (gameType == 20) return false; //fleischlos
  return false;
}
const colorSeq = [0,3,4,5,1,2];

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


function getHighestCard(cards, socket) {
  let highestCardIndex = 0;
  let highestCard = cards[0];
  let gameType = games.get(socket.game_id).type
  let curTrumpColor = secondaryTrumpColor[gameType]
  for (let i = 1; i < cards.length; i++) {
    const card = cards[i];
    if (isTrump(highestCard,socket)) { // trump
      if (!isTrump(card,socket)) continue;
      
      if (highestCard[0] === curTrumpColor && !(highestCard[1] == 3 || highestCard[1] == 4) && !(equals2D(highestCard, getPigCard(socket)) && games.get(socket.game_id).special_cards.includes(0)) && !(equals2D(highestCard, getSuperPigCard(socket)) && games.get(socket.game_id).special_cards.includes(1))) { // diamond
        if (!(card[0] === curTrumpColor && !(card[1] == 3 || card[1] == 4))) { highestCard = card; highestCardIndex = i; continue; }
        if (colorSeq.indexOf(card[1]) > colorSeq.indexOf(highestCard[1])) { highestCard = card; highestCardIndex = i; }
      } else { // not diamond
        if (equals2D(highestCard, getSuperPigCard(socket)) && games.get(socket.game_id).special_cards.includes(1)) continue;
        if (equals2D(card, getSuperPigCard(socket)) && games.get(socket.game_id).special_cards.includes(1)) { highestCard = card; highestCardIndex = i; continue; }
        if (equals2D(highestCard, getPigCard(socket)) && games.get(socket.game_id).special_cards.includes(0)) continue;
        if (equals2D(card, getPigCard(socket)) && games.get(socket.game_id).special_cards.includes(0)) { highestCard = card; highestCardIndex = i; continue; }

        if (gameType <= 11) { //unreine soli
          if (card[0] === 1 && card[1] === 1) {
            if (!(highestCard[0] === 1 && highestCard[1] === 1 && games.get(socket.game_id).special_cards.includes(0))) {
              highestCard = card;
              highestCardIndex = i;
              continue;
            }
          }
          if (highestCard[0] === 1 && highestCard[1] === 1) continue;
        } 

        if (card[1] === highestCard[1]) {
          if (card[0] > highestCard[0]) { highestCard = card; highestCardIndex = i; continue; } else continue;
        }
        if (gameType == 10 && card[1] == 0) { highestCard = card; highestCardIndex = i; continue; }
        if (gameType == 10 && highestCard[1] == 0) continue;
        if (gameType == 11 && card[1] == 5) { highestCard = card; highestCardIndex = i; continue; }
        if (gameType == 11 && highestCard[1] == 5) continue;
        if (games.get(socket.game_id).special_cards.includes(2) && card[0] == 1 && card[1] == 5) { highestCard = card; highestCardIndex = i; continue; }
        if (games.get(socket.game_id).special_cards.includes(2) && highestCard[0] == 1 && highestCard[1] == 5) continue;
        if (card[0] === curTrumpColor && !(card[1] == 3 || card[1] == 4)) continue;
        if (colorSeq.indexOf(card[1]) > colorSeq.indexOf(highestCard[1])) { highestCard = card; highestCardIndex = i; continue; }
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
  let data = JSON.parse(JSON.stringify(odata))
  data.users.forEach(user => {
    if (user.userId != UserId) {
      user.cards = user.cards.length
      user.party = -1
    }
    delete user.socketId
    user.tricks = user.tricks.length
    user.points = -1
    user.special_cards = -1
    user.called = -1
    user.armut_cards = []
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
const cardsWorth = [0,10,11,2,3,4]
function endTrick(socket) {
  const trick_cards = [];
  const game = games.get(socket.game_id);
  for (let i = game.currentTrick.start; i < 4+game.currentTrick.start;i++) trick_cards.push(game.currentTrick[(i%4).toString()]);
  const highestCard = getHighestCard(trick_cards, socket)
  const winner = (highestCard+game.currentTrick.start)%4;
  game.users[winner].tricks.push(...trick_cards)

  //hochzeit
  if (game.type == 2) {
    if (game.users[0].cards.length >= 9) {
      game.users.forEach((user) => {
        if (user.called == 2 && user.userId != winner) {
          game.users[winner].party = 1
          game.type = 0
          io.to(game.users[winner].socketId).emit("change_party", 1)
          io.to(socket.game_id).emit("allow_announcements")
        }
      })
    } else {
      game.type = 1 // wird nicht karo solo weil es sonderpunkte gibt
      io.to(socket.game_id).emit("allow_announcements")
      games.get(socket.game_id).startAnnouncementsCards = games.get(socket.game_id).users[0].cards.length
    }
  }
  if (game.type < 5) {
    //special points
    for (let i = 0; i < trick_cards.length; i++) {
      //fuchs
      if (trick_cards[i][0] == 0 && trick_cards[i][1] == 2 && i != highestCard && !game.special_cards.includes(0)) {
        io.to(socket.game_id).emit('special_point', {point_name: "Fuchs", winner})
        if (game.users[(i+game.currentTrick.start)%4].party != game.users[winner].party) {
          addPoint(game.users[winner].points, "Fuchs gefangen")
        }
      }

      //klabautermann
      if (game.settings.klabautermann) {
        if (trick_cards[i][0] == 2 && trick_cards[i][1] == 5 
          && trick_cards[highestCard][0] == 2 && trick_cards[highestCard][1] == 4 && i < highestCard) {
            io.to(socket.game_id).emit('special_point', {point_name: "Klabautermann", winner})
            addPoint(game.users[winner].points, "Klabautermann")
        }
      }

      //karlchen
      if (Object.keys(game.users[0].cards).length == 0 && trick_cards[i][0] == 3 && trick_cards[i][1] == 3) {
        let statusKarlchen = -1;
        if (i == highestCard) statusKarlchen = 0
        else if (game.users[(i+game.currentTrick.start)%4].party != game.users[winner].party) statusKarlchen = 1

        if (statusKarlchen != -1) {
          addPoint(game.users[winner].points, ["Karlchen Müller", "Karlchen gefangen"][statusKarlchen])
          io.to(socket.game_id).emit('special_point', {point_name: ["Karlchen Müller", "Karlchen gefangen"][statusKarlchen], winner})
        }
      }

    }

    //doppelkopf
    let cardVal = 0
    trick_cards.forEach((card) => cardVal += cardsWorth[card[1]])
    if (cardVal >= 40) {
      io.to(socket.game_id).emit('special_point', {point_name: "Doppelkopf", winner})
      addPoint(game.users[winner].points, "Doppelkopf")
    }
    //koppeldopf
    if (game.settings.koppeldopf && cardVal == 0) {
      io.to(socket.game_id).emit('special_point', {point_name: "Koppeldopf", winner})
      addPoint(game.users[winner].points, "Koppeldopf")
    }
  }
  


  game.currentTrick = {}
  game.currentTrick.start = winner
  io.to(socket.game_id).emit('new_trick', games.get(socket.game_id).currentTrick)
  if (Object.keys(game.users[0].cards).length == 0) endGame(socket);
}

const announcementNames = ["Error", "", "Keine 9", "Keine 6", "Keine 3", "Schwarz"]
const announcementValues = [241, 241, 150, 180, 210, 239] //first unreachable; second custom (so both impossible values in case they still get triggered for some reason)

function endGame(socket) {
  console.log("Game "+socket.game_id+" ended")
  let results = {"1": {users: [], points: {}, eyes: 0}, "0": {users: [], eyes: 0}}
  const game = games.get(socket.game_id);
  const playerCount = Object.keys(game.users).length;
  let card;

  for (let i = 0; i < playerCount; i++) { //after main points
    let count = 0;
    for (let j = 0; j < game.users[i].tricks.length; j++) {
      card = game.users[i].tricks[j];
      count += cardsWorth[card[1]]
    }
    results[game.users[i].party].eyes += count;
    results[game.users[i].party].users.push(game.users[i].username)
  }

  let highestAnnouncements = [0, 0] //kontra re
  games.get(socket.game_id).users.forEach((user) => {
    if (user.announced > highestAnnouncements[user.party]) {
      highestAnnouncements[user.party] = user.announced
    }
  })

  if (results[1].eyes > 120) {
    results[1].points["Gewonnen"] = 1;
  }
  if (results[1].eyes <= 120) {
    results[1].points["Gewonnen"] = -1;
    results[1].points["Gegen die Alten"] = -1;
  }
  let wrongCalled = [false, false]
  let points = results[1].points
  for (let i = announcementValues.length-1; i > 1; i--) {
    if (results[1].eyes > announcementValues[i]) {
      if (points[announcementNames[i]]) points[announcementNames[i]] += 1
      else points[announcementNames[i]] = 1
    }
    if (results[0].eyes > announcementValues[i]) {
      if (points[announcementNames[i]]) points[announcementNames[i]] -= 1
      else points[announcementNames[i]] = -1
    }
  }
  for (let j = 0; j < 2; j++) {
    for (let i = highestAnnouncements[j]; i > 1; i--) {
      if (results[j].eyes > announcementValues[i] && !wrongCalled[j]){
        if (points[announcementNames[i]+" angesagt"]) points[announcementNames[i]+" angesagt"] += (2*j)+(-1)
        else points[announcementNames[i]+" angesagt"] = (2*j)+(-1)

      } else {
        if (points[announcementNames[i]+" falsch angesagt"]) points[announcementNames[i]+" falsch angesagt"] += 1-(2*j) 
        else points[announcementNames[i]+" falsch angesagt"] = 1-(2*j)
        wrongCalled[j] = true
      }
    }
  }

  if (results[1].eyes > 120) {
    if (highestAnnouncements[1] >= 1 && !wrongCalled[1]) results[1].points["Re"] = 2
    if (highestAnnouncements[0] >= 1) results[1].points["Kontra falsch"] = 2        //wrongCalled is not getting called because its only important for chnaging the other announcemnets but htere are no other announcements after re/kontra
  }

  if (results[1].eyes <= 120) {
    if (highestAnnouncements[0] >= 1 && !wrongCalled[0]) results[1].points["Kontra"] = -2
    if (highestAnnouncements[1] >= 1) results[1].points["Re falsch"] = -2
  }
  if (wrongCalled[0]) results[1].points["Kontra falsch"] = 2
  if (wrongCalled[1]) results[1].points["Re falsch"] = -2

  for (let i = 0; i < playerCount; i++) { //additional points after main points
    for (let j = 0; j < game.users[i].points.length; j++) {
      if (results[1].points[game.users[i].points[j][0]])
        results[1].points[game.users[i].points[j][0]] += (game.users[i].party ? 1 : -1) * game.users[i].points[j][1]
      else 
        results[1].points[game.users[i].points[j][0]] = (game.users[i].party ? 1 : -1) * game.users[i].points[j][1]
    }
  }

  if (results[1].users.length == 1) { //solo
    results[1].points["Solo"] = 1 //symbolic value actual value calculated by client
  }

  if (game.settings.feigheit && game.type != 21 && !(!game.settings.feigheitInSolo && game.type > 5)) { //feigheit
    if (results[0].eyes > announcementValues[highestAnnouncements[0] + 3 > announcementValues.length-1 ? 0 : highestAnnouncements[0] + 3 ]) {
      results[1].points["Feigheit"] = 1 //symbolic value actual value calculated by client
    }
    if (results[1].eyes > announcementValues[highestAnnouncements[1] + 3 > announcementValues.length-1 ? 0 : highestAnnouncements[1] + 3 ]) {
      results[1].points["Feigheit"] = -1 //symbolic value actual value calculated by client
    }
  }
  if (game.type == 21 && results[1].eyes == 0) { //Verlusts-Solo
    results[1].points["Verlusts-Solo"] = 1 //symbolic value actual value calculated by client
  }

  io.to(socket.game_id).emit('game_ended', results)
  socket.rooms.delete(socket.game_id)
  games.delete(socket.game_id)
}

function getColor(card, socket) {
  if (isTrump(card,socket)) return 4;
  return card[0]
}

function getPigCard(socket) {
  let game = games.get(socket.game_id)
  if (game.type >= 12) return [-1, -1] //reine soli haben keine schweine
  if (!game.settings.shiftSpecialCardsSolo || game.type <= 6) return [0,2]
  if (game.settings.shiftSpecialCardsSolo && game.type >= 10) return [-1,-1]
  return [game.type-6, 2]
}

function getOdelCard(socket) {
  let game = games.get(socket.game_id)
  if (game.type >= 12) return [-1, -1] //reine soli haben keine oedel doedel
  if (!game.settings.shiftSpecialCardsSolo || game.type <= 6) return [1,5]
  if (game.settings.shiftSpecialCardsSolo && game.type >= 10) return [-1,-1]
  return [(game.type-5)%4, 5]
}

function getSuperPigCard(socket) {
  let game = games.get(socket.game_id)
  if (game.type >= 12) return [-1, -1] //reine soli haben keine super schweine
  if (!game.settings.shiftSpecialCardsSolo || game.type <= 6) return [0,0]
  if (game.settings.shiftSpecialCardsSolo && game.type >= 10) return [-1,-1]
  return [game.type-6, 0]
}

function equals2D(arr1, arr2) {
  return arr1[0] == arr2[0] && arr1[1] == arr2[1]
}

function getSpecialCards(socket) {
  let game = games.get(socket.game_id)
  let user = game.users[socket.userId]
  let pigs = 0
  let superPigs = 0
  let oedel = 0
  user.special_cards = []
  user.cards.forEach((card) => {
    if (equals2D(card, getPigCard(socket))) pigs++
    else if (equals2D(card, getSuperPigCard(socket))) superPigs++
    else if (equals2D(card, getOdelCard(socket))) oedel++
  })
  if (oedel == 2 && game.settings.odel) {
    user.special_cards.push(2)
    user.cards.splice(user.cards.findIndex(arr => equals2D(arr, getOdelCard(socket))), 1)
    user.cards.splice(user.cards.findIndex(arr => equals2D(arr, getOdelCard(socket))), 1)
    if (game.type < 12) { //heart 10s dont exist in pure soli
      let h10Index = user.cards.findIndex(arr => arr[0] == 1 && arr[1] == 1)
      if (h10Index == -1) {
        user.cards.splice(user.cards.length, 0, getOdelCard(socket))
        user.cards.splice(user.cards.length, 0, getOdelCard(socket))
      } else if (user.cards.slice(h10Index+1).findIndex(arr => arr[0] == 1 && arr[1] == 1) == -1) {
        user.cards.splice(user.cards.length-1, 0, getOdelCard(socket))
        user.cards.splice(user.cards.length-1, 0, getOdelCard(socket))
      } else {
        user.cards.splice(user.cards.length-2, 0, getOdelCard(socket))
        user.cards.splice(user.cards.length-2, 0, getOdelCard(socket))
      }
    }
  }

  if (pigs == 2) {
    user.special_cards.push(0)
    user.cards.splice(user.cards.findIndex(arr => equals2D(arr, getPigCard(socket))), 1)
    user.cards.splice(user.cards.findIndex(arr => equals2D(arr, getPigCard(socket))), 1)
    user.cards.splice(user.cards.length, 0, getPigCard(socket))
    user.cards.splice(user.cards.length, 0, getPigCard(socket))
  }
  if (superPigs == 2 && pigs == 2 && game.settings.superpigs) {
//    user.special_cards.push(1) they arent super pigs yet bc pigs were not laid
    user.cards.splice(user.cards.findIndex(arr => equals2D(arr, getSuperPigCard(socket))), 1)
    user.cards.splice(user.cards.findIndex(arr => equals2D(arr, getSuperPigCard(socket))), 1)
    user.cards.splice(user.cards.length, 0, getSuperPigCard(socket))
    user.cards.splice(user.cards.length, 0, getSuperPigCard(socket))
  }
}


function checkForSuperPigs(socket) {
  let game = games.get(socket.game_id)
  if (!game.settings.superpigs) return
  game.users.forEach((user) => {
    let superPigs = 0
    user.cards.forEach((card) => {
      if (equals2D(card, getSuperPigCard(socket))) superPigs++
    })
    if (superPigs == 2 && game.special_cards.includes(0)) {
      user.special_cards.push(1)
      user.cards.splice(user.cards.findIndex(arr => equals2D(arr, getSuperPigCard(socket))), 1)
      user.cards.splice(user.cards.findIndex(arr => equals2D(arr, getSuperPigCard(socket))), 1)
      user.cards.splice(user.cards.length, 0, getSuperPigCard(socket))
      user.cards.splice(user.cards.length, 0, getSuperPigCard(socket))
    }
  })
}


function getPublicGames() {
  let publicGames = []
  games.forEach((game, key) => {
    if (game.settings.public && game.users.length != 4) publicGames.push([key, game.users.length])
  })
  return publicGames
}

function isValid(cardId, socket) {
  const curGame = games.get(socket.game_id)
  if (Object.keys(curGame.users).length != 4 || curGame.type == -1) return false;         //not started yet
  if (!(curGame.currentTrick[(socket.userId+3)%4] || curGame.currentTrick.start == socket.userId)) return false;    //their turn
  if (curGame.currentTrick[socket.userId]) return false;      //already laid card
  if (!curGame.users[socket.userId].cards[cardId]) return false;  //card doesnt exist

  //actual rules
  if (curGame.currentTrick.start == socket.userId) return true //the first player can do whatever they want
  let startColor = getColor(curGame.currentTrick[curGame.currentTrick.start], socket)
  if (getColor(curGame.users[socket.userId].cards[cardId], socket) != startColor) 
    for (let i = 0; i < curGame.users[socket.userId].cards.length; i++)
      if (getColor(curGame.users[socket.userId].cards[i], socket) == startColor)
        return false;

  return true
}


io.on('connection', (socket) => {

  socket.emit('public_games', getPublicGames())

  socket.on('getPublicGames', () => socket.emit('public_games', getPublicGames()))

  socket.on('join_game', (game_id, username, settings) => {
    //if (socket.game_id) {socket.emit("error", "already in game"); return}
    if (game_id.length != 5 || username.length == 0) { socket.emit("error", "invalid name/id"); return }
    if ((games.has(game_id) ? games.get(game_id).users.length : 0) >= 4) { socket.emit("error", "game is full"); return }

    socket.join(game_id)
    socket.userId = games.has(game_id) ? games.get(game_id).users.length : 0;
    socket.username = username
    socket.game_id = game_id
    socket.broadcast.to(game_id).emit('user_joined', { username, userId: socket.userId })


    if (!games.has(game_id)) {
        games.set(game_id, {settings, users: [], currentTrick: {"start": 0}, results: {}, type: -1, special_cards: [], startAnnouncementsCards: 12});
        //type -1 not set (not started)  0 normal  1 solo or something
    }

    let cards = giveCards(games.get(game_id).users)


    //if (socket.userId == 0) cards = [[1,5],[1,5],[0,0],[0,0],[0,2],[0,2],[2,4],[2,4],[3,4],[3,4],[1,1],[1,1]]
    //if (socket.userId == 0) cards = [[1,2],[1,2],[0,1],[0,1],[0,2],[0,2],[2,4],[2,4],[3,4],[3,4],[1,1],[1,1]]
    //if (socket.userId == 1) cards = [[1,0],[1,0],[0,0],[0,0],[0,0],[0,0],[2,0],[2,4],[3,4],[3,4],[1,1],[1,1]]
    //if (socket.userId == 1) cards = [[2,1],[3,1],[3,1],[2,1],[1,2],[1,2],[2,2],[2,2],[3,2],[3,2],[0,1],[0,1]]

    let party = Number(cards.some(subArray => {
      return subArray[0] === 3 && subArray[1] === 4;
    }))

    
    games.get(game_id).users.push({socketId: socket.id, userId: socket.userId, username, cards, tricks: [], party, points: [], called: 0, special_cards: [], announced: 0, armut_cards: []});
    //points: [[name, points]]
    //called:  0-nothing/start  1-gesund  2-hochzeit  3-armut  4-schmeissen  [5-?]-solo
    //special_cards 0 schweine 1 superschweine 2 oedel doedel
    //announced: 0 nothing   1- re/kontra   2- keine 9   3- keine 6   4- keine 3   5- schwarz
    getSpecialCards(socket)
    socket.emit("init", censorUserData(games.get(game_id), socket.userId))
    console.log("User "+username+" joined game "+game_id)

    if (games.get(game_id).users.length == 4) io.to(games.get(game_id).users[0].socketId).emit("u_call")
  })


  socket.on('place_card', (card) => {
    if (!games.get(socket.game_id)) {
      socket.emit("error", "game doesnt exist")
      return false
    }
    if (isValid(card, socket)) {
      let game = games.get(socket.game_id)
      game.currentTrick[socket.userId] = game.users[socket.userId].cards[card]
      io.to(socket.game_id).emit('placed_card', { userId: socket.userId, card: game.users[socket.userId].cards[card], currentTrick: game.currentTrick});
      let cardValue = game.users[socket.userId].cards[card]
      //check if special card
      if (equals2D(cardValue, getPigCard(socket))) {
        if (game.users[socket.userId].special_cards.includes(0)) {
          game.special_cards.push(0)
          io.to(socket.game_id).emit('special_card', {userId: socket.userId, card: "Schwein", cardId: 0})
          checkForSuperPigs(socket)
        }
      } else if (equals2D(cardValue, getSuperPigCard(socket))) {
        if (game.users[socket.userId].special_cards.includes(1)) {
          game.special_cards.push(1)
          io.to(socket.game_id).emit('special_card', {userId: socket.userId, card: "Super-Schwein", cardId: 1})
        }
      } else if (equals2D(cardValue, getOdelCard(socket))) {
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

  socket.on("call", (call) => {
    if (!games.get(socket.game_id)) {
      socket.emit("error", "game doesnt exist")
      return false
    }
    let legal = true;
    if (call == 1) {
      io.to(socket.game_id).emit('call', {caller: socket.userId, msg: "Gesund"})
    } else {
      let nines = 0;
      let kings = 0;
      let queensOfClubs = 0;
      let trumps = 0;
      let cardValue = 0;
      games.get(socket.game_id).users[socket.userId].cards.forEach((card) => {
          if (card[1] == 0) nines++;
          if (card[1] == 5) kings++;
          if (card[0] == 3 && card[1] == 4) queensOfClubs++;
          if (isTrump(card, socket)) trumps++;
          cardValue += cardsWorth[card[1]]
      })
      if (call == 2 && queensOfClubs != 2) legal = false;
      if (call == 4 && !(nines >= 5 || kings >= 5 || (nines == 4 && kings == 4) || (games.get(socket.game_id).settings.manyFulls && cardValue >= 80))) legal = false;
      if (call == 3 && trumps > 3) legal = false;
      if (call >= 12 && call <= 15 && !games.get(socket.game_id).settings.pureSolo) legal = false;
      if (call >= 10 && call <= 11 && !games.get(socket.game_id).settings.kingNineSolo) legal = false;
      if (call >= 16 && call <= 17 && !games.get(socket.game_id).settings.pureKingNineSolo) legal = false;
      if (call >= 22 && call <= 23 && !games.get(socket.game_id).settings.redBlackSolo) legal = false;
      if (call == 21 && !games.get(socket.game_id).settings.lossSolo) legal = false;
      if (call > 23 || call == 5 || call < 1) legal = false;
      if (legal) io.to(socket.game_id).emit('call', {caller: socket.userId, msg: "Vorbehalt"})
    }
    if (legal) {
      games.get(socket.game_id).users[socket.userId].called = call
      if (socket.userId+1 < 4) io.to(games.get(socket.game_id).users[socket.userId+1].socketId).emit("u_call")
      else {
        let highestUser = 0;
        let highestCall = 1;
        games.get(socket.game_id).users.forEach((user) => {
          if (((user.called > highestCall && highestCall < 5) || (games.get(socket.game_id).settings.throwOverSolo && user.called == 4)) && !(games.get(socket.game_id).settings.throwOverSolo && highestCall == 4)) {
            highestUser = user.userId
            highestCall = user.called
          }
        })
        if (highestCall != 1) {
          //let vorbehalte = ["Error", "Gesund", "Hochzeit", "Armut", "Schmeißen", "beliebiges Solo", "unreines Karo-Solo", "unreines Herz-Solo", "unreines Pik-Solo", "unreines Kreuz-Solo",
          //(old)  "reines Karo-Solo", "reines Herz-Solo", "reines Pik-Solo", "reines Kreuz-Solo", "Fleischlos"]
          let vorbehalte = ["Error", "Gesund", "Hochzeit", "Armut", "Schmeißen", "beliebiges Solo", "unreines Karo-Solo", "unreines Herz-Solo", "unreines Pik-Solo", "unreines Kreuz-Solo", "unreines Neunen-Solo", "unreines Königs-Solo",
            "reines Karo-Solo", "reines Herz-Solo", "reines Pik-Solo", "reines Kreuz-Solo", "reines Neunen-Solo", "reines Königs-Solo", "Buben-Solo", "Damen-Solo", "Fleischlos", "Verlust-Solo", "Rot-Solo", "Schwarz-Solo"]
          setTimeout(() => {
            io.to(socket.game_id).emit('call', {caller: highestUser, msg: vorbehalte[highestCall], type: highestCall})
            games.get(socket.game_id).type = highestCall
            if (highestCall == 4) {
              socket.rooms.delete(socket.game_id)
              games.delete(socket.game_id)
              return
            }
            if (highestCall == 3) {
              if (socket.userId == 0) io.to(games.get(game_id).users[1].socketId).emit("u_call_armut")
              else io.to(games.get(socket.game_id).users[0].socketId).emit("u_call_armut")
              return
            }
            if (highestCall > 5) {
              games.get(socket.game_id).users.forEach((user) => {
                if (user.userId == highestUser) {
                  games.get(socket.game_id).users[user.userId].party = 1
                  io.to(user.socketId).emit("change_party", 1)
                  if (games.get(socket.game_id).settings.soloStart) games.get(socket.game_id).currentTrick["start"] = highestUser
                } else {
                  games.get(socket.game_id).users[user.userId].party = 0
                  io.to(user.socketId).emit("change_party", 0)
                }
                //for (let i = 0; i<2; i++) {  //why am i sorting twice?  i dont know anymore future/past me please explain
                user.cards.sort((a, b) => {
                  //1: a is higher, -1: b is higher
                  if (isTrump(a,socket,ignOdl=true)) {
                    if (!isTrump(b,socket,ignOdl=true)) return 1;
                    if (a[0] === secondaryTrumpColor[games.get(socket.game_id).type] && !(a[1] == 3 || a[1] == 4)) { // diamond
                      if (b[0] !== 0 || (b[1] == 3 || b[1] == 4)) return -1;
                      if (colorSeq.indexOf(b[1]) > colorSeq.indexOf(a[1])) return -1; else return 1;
                    } else { // not diamond
                      if (highestCall <= 11) {  //unreine soli
                          if (b[0] === secondaryTrumpColor[games.get(socket.game_id).type] && !(b[1] == 3 || b[1] == 4)) return 1;
                          if (b[0] === 1 && b[1] === 1) return -1;
                          if (a[0] === 1 && a[1] === 1) return 1;
  
                          if (highestCall == 10) {
                              if (a[1] === 0) return 1;
                              if (b[1] === 0) return -1;
                          }
                          if (highestCall == 11) {
                              if (a[1] === 5) return 1;
                              if (b[1] === 5) return -1;
                          }
                      }
  
                      if (b[1] === a[1]) {
                          if (b[0] > a[0]) return -1; else return 1;
                      }
  
                      if (colorSeq.indexOf(b[1]) > colorSeq.indexOf(a[1])) return -1; else return 1;
                  }
                  } else {
                    if (isTrump(b,socket,ignOdl=true)) return -1;
                    if (b[0] !== a[0]) return a[0]-b[0];
                    return colorSeq.indexOf(a[1]) - colorSeq.indexOf(b[1])
                  }
                });
                //}
                getSpecialCards(io.sockets.sockets.get(user.socketId))
              })
            }
            io.to(socket.game_id).emit("actual_game_start")
            if (highestCall != 2) io.to(socket.game_id).emit("allow_announcements")
          }, 2000)
        } else {
          games.get(socket.game_id).type = 1
          io.to(socket.game_id).emit("actual_game_start")
          io.to(socket.game_id).emit("allow_announcements")
        }
      }
    } else {
      io.to(socket.id).emit("u_call")
      io.to(socket.id).emit("error", "illegal call")
    }
  })

  socket.on("call_armut", (call) => {
    if (!games.get(socket.game_id)) {
      socket.emit("error", "game doesnt exist")
      return false
    }
    if (games.get(socket.game_id).type != 3) {
      socket.emit("error", "armut was not called")
      return false
    }
    io.to(socket.game_id).emit('call', {caller: socket.userId, msg: ["Ablehnen", "Mitnehmen"][call], type: -1})
    if (call) {
      games.get(socket.game_id).users.forEach((user) => {
        if (user.userId == socket.userId || user.called == 3) {
          games.get(socket.game_id).users[user.userId].party = 1
          io.to(user.socketId).emit("change_party", 1)
          io.to(user.socketId).emit("selectArmutCards", 1)
        } else {
          games.get(socket.game_id).users[user.userId].party = 0
          io.to(user.socketId).emit("change_party", 0)
        }
      })
      //io.to(socket.game_id).emit("actual_game_start")
      //io.to(socket.game_id).emit("allow_announcements")
      return
    } else {
      let next = socket.userId+1
      if (next <= 3 && games.get(socket.game_id).users[next].called == 3) next += 1
      if (next > 3) {
        games.get(socket.game_id).users.forEach((user) => {
          if (user.called == 3) {
            io.to(socket.game_id).emit('call', {caller: user.userId, msg: "Schmeißen", type: 4})
            socket.rooms.delete(socket.game_id)
            games.delete(socket.game_id)
            return
          }
        })
      } else io.to(games.get(socket.game_id).users[next].socketId).emit("u_call_armut")
    }
  })

  socket.on("giveArmutCards", (armutcards) => {
    if (games.get(socket.game_id).users[socket.userId].party == 1 && games.get(socket.game_id).type == 3) {
      if (armut_cards.length != 3) {
        socket.emit("error", "not three cards")
      }
      games.get(socket.game_id).users[socket.userId].armut_cards = armutcards
      games.get(socket.game_id).users.forEach((user) => {
        if (user.userId != socket.userId && user.party == 1 && user.armut_cards.length == 3)  {
          for(let j = 0; j < 3; j++) {
            let tmp = user.cards[user.armut_cards[j]]
            user.cards[user.armut_cards[j]] = games.get(socket.game_id).users[socket.userId].cards[games.get(socket.game_id).users[socket.userId].armut_cards[j]]
            games.get(socket.game_id).users[socket.userId].cards[games.get(socket.game_id).users[socket.userId].armut_cards[j]] = tmp
          }
          for (let i = 0; i<2; i++) {
            let armUser = [games.get(socket.game_id).users[socket.userId], user][i]
            armUser.cards.sort((a, b) => {
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
          }
          
          getSpecialCards(io.sockets.sockets.get(user.socketId))
          getSpecialCards(socket)
          socket.emit("swapArmutCards", games.get(socket.game_id).users[socket.userId].cards)
          io.to(user.socketId).emit("swapArmutCards", user.cards)
          games.get(socket.game_id).type = 1
          io.to(socket.game_id).emit("actual_game_start")
          io.to(socket.game_id).emit("allow_announcements")
          return
        }
      })
    } else socket.emit("error", "you haven't called armut")
  })

  socket.on("announce", () => {
    if (!games.get(socket.game_id)) {
      socket.emit("error", "game doesnt exist")
      return false
    }
    let highestAnnouncement = 0
    games.get(socket.game_id).users.forEach((user) => {
      if (user.party == games.get(socket.game_id).users[socket.userId].party && user.announced > highestAnnouncement) {
        highestAnnouncement = user.announced
      }
    })
    let lowestPossibleAnnouncement = games.get(socket.game_id).startAnnouncementsCards - games.get(socket.game_id).users[socket.userId].cards.length
    let announcement = Math.max(highestAnnouncement + 1, lowestPossibleAnnouncement)
    if (announcement > 5) {
      socket.emit("error", "invalid announcement")
      return false
    }
    games.get(socket.game_id).users[socket.userId].announced = announcement
    io.to(socket.game_id).emit("announced", {announcer: socket.userId, announced: announcement, party: games.get(socket.game_id).users[socket.userId].party})
  })

  socket.on('disconnect', () => {
    //maybe add logic for removing from game? but they cant reconnect so idk
    if (games.get(socket.game_id) && games.get(socket.game_id).users[socket.userId] && games.get(socket.game_id).users[socket.userId].socketId == socket.id) { //was buggy before
      io.to(socket.game_id).emit("someone_disconnected", socket.userId)
      socket.rooms.delete(socket.game_id)
      games.delete(socket.game_id)
    }
  });
})


server.listen(port, () => {
  console.log(`App listening on port ${port}`)
})
