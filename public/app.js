const socket = io()
socket.on("error", (msg) => showError(msg + " (server)"))
let joinTimeout;
let users;
let ownUserId;
let ownCards;

function joinGame() {
    if (document.getElementById("game_id").value.length != 5) {showError("invalid game id (must be 5 characters)"); return}
    if (document.getElementById("username").value.length == 0) {showError("username missing"); return}
    socket.emit('join_game', document.getElementById('game_id').value.toLowerCase(),
    document.getElementById('username').value)
    document.getElementById('join-game').style.display = 'none'
    joinTimeout = setTimeout(() => document.getElementById('join-game').style.display = 'block', 1000)
}

socket.on("init", (data) => {
    console.log(data)
    ownUserId = data.users.length-1
    ownCards = data.users[ownUserId].cards
    startGame(data)
    getPlayerElement(data.currentTrick.start).className = 'their-turn'
})

function startGame(data) {
    clearTimeout(joinTimeout)
    if (document.getElementsByClassName("select-game")[0]) document.getElementsByClassName("select-game")[0].remove();
    if (document.getElementsByClassName("navbar")[0]) document.getElementsByClassName("navbar")[0].remove();
    const gameContainer = document.getElementsByClassName("game-container")[0];
    gameContainer.style.width = '100%';
    gameContainer.style.height = '100%';
    users = data.users
    renderCardsforAll()
}

socket.on('user_joined', (data) => {
    data.cards = 12
    data.party = -1
    data.tricks = 0
    users.push(data)
    renderCardsfor(data.userId)
    console.log(users)
})

function getIndexOfCard(cards, searched) {
    for (let i = 0; i < cards.length; i++) {
        if (cards[i][0] === searched[0] && cards[i][1] === searched[1]) {
          return i
        }
    }
}

socket.on('placed_card', (data) => {
    document.getElementById("current_trick").innerHTML += '<img class="trickCard" src="/cards/'+data.card[0].toString()+'-'+data.card[1].toString()+'.svg" style="--i:'+(4-ownUserId+data.userId)+'">'
    if(Object.keys(data.currentTrick).length-1 < 4) nextPlayer = "player"+(Number(document.getElementsByClassName('their-turn')[0].id.slice(6))+1)%4
    document.getElementsByClassName('their-turn')[0].classList.remove('their-turn')
    if (Object.keys(data.currentTrick).length-1 < 4) document.getElementById(nextPlayer).className = 'their-turn'

    if (data.userId == ownUserId) {
        ownCards.splice(getIndexOfCard(ownCards,data.card),1)
    } else {
        users[data.userId].cards -= 1
    }
    renderCardsfor(data.userId)
})

socket.on('new_trick', (trick) => {
    setTimeout(() => {
        document.getElementById("current_trick").style.transition = 'bottom 0.5s, left 0.5s' 
        document.getElementById("current_trick").style.left = window.getComputedStyle(getPlayerElement(trick.start)).left
        document.getElementById("current_trick").style.bottom = window.getComputedStyle(getPlayerElement(trick.start)).bottom
        setTimeout(() => {
            document.getElementById("current_trick").style.transition = ''
            document.getElementById("current_trick").innerHTML = ''
            document.getElementById("current_trick").style.left = '45%'
            document.getElementById("current_trick").style.bottom = '72%'
            for (let i = 0; i<4; i++) appendCardToTrick(getPlayerElement(trick.start))
            for (let i = 0; i<users.length;i++) {
                getPlayerElement(i).className = ''
            }
            getPlayerElement(trick.start).className = 'their-turn'
        }, 500)
    }, 500)
})

function getCardsElement(playerId) {
    return document.getElementById("player"+(4-ownUserId+playerId)%4).querySelector('.cards')
}
function getTricksElement(playerId) {
    return document.getElementById("player"+(4-ownUserId+playerId)%4).querySelector('.tricks')
}
function getPlayerElement(playerId) {
    return document.getElementById("player"+(4-ownUserId+playerId)%4)
}

function renderCardsfor(userid) {
    if (users[userid].party != -1) {
        document.getElementById("player0").querySelector('.cards').innerHTML = ''
        userCards = users[userid].cards;
        for (let j = 0; j<users[userid].cards.length;j++) {
            document.getElementById("player0").querySelector('.cards').innerHTML += '<img class="card" onclick="placeCard('+j+')" src="/cards/'+userCards[j][0]+'-'+userCards[j][1]+'.svg" style="--i:'+(j-(Math.ceil(Object.keys(userCards).length/2)-1))+'">'
        }
    } else {
        userCards = users[userid].cards;
        elem = getCardsElement(userid)
        elem.innerHTML = ''
        for (let j = 0; j<userCards;j++) {
            elem.innerHTML += '<img class="card" src="/cards/back.svg" style="--i:'+(j-(Math.ceil(userCards/2)-1))+'">'
        }
        elem.innerHTML += '<p id="player-name">'+users[userid].username+'</p>'
    }
}

function renderCardsforAll() {
    for (let i = 0; i<users.length;i++) {
        renderCardsfor(i)
    }
}

function placeCard(i) {
    if (isValid) socket.emit('place_card', i)
}



function showError(error) {
    const errorContainer = document.getElementById("errorContainer");
    errorContainer.innerHTML = "Error: "+error
    errorContainer.classList.add("show");
    setTimeout(() => {
        errorContainer.classList.remove("show");
    }, 3000);
}



function renderResult(result) {
    const rePlayers = result[1].players.join(' & ');
    const contraPlayers = result[0].players.join(' & ');

    let reScore = 0;
    const scoreRows = Object.entries(result[1].points).map(([key, value]) => {
        reScore += value;
        return `<tr><th>${key}</th><td>${value}</td><td>${-value}</td></tr>`;
    });

    const totalReScore = `<tr><th>Summe</th><td>${reScore}</td><td>${-reScore}</td></tr>`;

    const scoreTable = `
        <table>
          <tr><th></th><th>Re</th><th>Kontra</th></tr>
          <tr><th></th><td>${rePlayers}</td><td>${contraPlayers}</td></tr>
          <tr><th>Augen</th><td>${result[1].eyes}</td><td>${240-result[1].eyes}</td></tr>
          ${scoreRows.join('')}
          <tr></tr>
          ${totalReScore}
        </table>
        <a class="closeX" onclick="leaveGame()">X</a>`;

    var result_div = document.getElementsByClassName("result-container")[0]
    result_div.innerHTML = scoreTable
    result_div.classList.add("show")
}






function isValid() {
    return true
    if (Object.keys(data.players).length != 4) return false;
    if (!(data.currentTrick[(playerId+3)%4] || data.currentTrick.start == playerId)) return false;
    if (data.currentTrick[playerId]) return false;
    return true;
}


function appendCardToTrick(elem) {
    const cardStack = elem.getElementsByClassName("tricks")[0];
    const cardsLength = cardStack.children.length
    cardStack.innerHTML += '<img class="card" src="/cards/back.svg" style="transform: translate(-'+cardsLength/1.5+'px, -'+cardsLength/1.5+'px)">';
}