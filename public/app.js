const socket = io()
socket.on("error", (msg) => showError(msg + " (server)"))
let joinTimeout;
let users;
let ownUserId;
let ownCards;
let currentTrick;
const admins = ["ez", "E2Z1"]
let inAnimation = 0 //not a nice solution but im really not motivated rn, might change it later
let removeAnimationTimer;
let isOdel = false;

function joinGame() {
    if (document.getElementById("game_id").value.length != 5) {showError("invalid game id (must be 5 characters)"); return}
    if (document.getElementById("username").value.length == 0) {showError("username missing"); return}
    if (admins.includes(document.getElementById("username").value) && !localStorage.getItem("admin")) {showError("name reserved"); return} //im bored and should probably do the rules but whatever
    localStorage.setItem("username", document.getElementById('username').value)
    localStorage.setItem("game_id", document.getElementById('game_id').value)
    socket.emit('join_game', document.getElementById('game_id').value.toLowerCase(),
    document.getElementById('username').value)
    document.getElementById('join-game').style.display = 'none'
    joinTimeout = setTimeout(() => {
        document.getElementById('join-game').style.display = 'block'
        showError("No server response")
    }, 1000)
}

document.addEventListener("DOMContentLoaded", function(e) {
    document.getElementById('username').value = localStorage.getItem('username')
    document.getElementById('game_id').value = localStorage.getItem('game_id')
})

socket.on("init", (data) => {
    ownUserId = data.users.length-1
    ownCards = data.users[ownUserId].cards
    startGame(data)
    getPlayerElement(data.currentTrick.start).className = 'their-turn'
    currentTrick = data.currentTrick
})
lastTrick = document.getElementsByClassName("lastTrick")[0]
document.addEventListener("mousemove", function(e) {
    lastTrick.style.left = ((e.clientX)+50)+"px"
    lastTrick.style.top = ((e.clientY)+20)+"px"
})

document.getElementById("game_id").addEventListener('keypress', function(event) {
    if (event.key === 'Enter') joinGame()})

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
})

function getIndexOfCard(cards, searched) {
    for (let i = 0; i < cards.length; i++) {
        if (cards[i][0] === searched[0] && cards[i][1] === searched[1]) {
          return i
        }
    }
}

socket.on('placed_card', (data) => cardPlaced(data))

function cardPlaced(data) {
    if (inAnimation) {
        setTimeout(() => cardPlaced(data), 100)
        return
    }
    document.getElementById("current_trick").innerHTML += '<img class="trickCard" src="/cards/'+data.card[0].toString()+'-'+data.card[1].toString()+'.svg" style="--i:'+(4-ownUserId+data.userId)+'">'
    if(Object.keys(data.currentTrick).length-1 < 4) 
        for (let i = data.currentTrick.start; i<data.currentTrick.start+users.length;i++)
            if (!data.currentTrick[i%4]) {
                nextPlayer = getPlayerElement(i)
                break
            }//buggy for some reasonnextPlayer = "player"+(Number(document.getElementsByClassName('their-turn')[0].id.slice(6))+1)%4
    if (document.getElementsByClassName('their-turn')[0]) document.getElementsByClassName('their-turn')[0].classList.remove('their-turn')
    if (Object.keys(data.currentTrick).length-1 < 4) nextPlayer.className = 'their-turn'

    if (data.userId == ownUserId) {
        ownCards.splice(getIndexOfCard(ownCards,data.card),1)
    } else {
        users[data.userId].cards -= 1
    }
    currentTrick = data.currentTrick
    renderCardsfor(data.userId)
    inAnimation = 1
    removeAnimationTimer = setTimeout(() => inAnimation = 0, 500)
}

socket.on('new_trick', (trick) => {
    clearTimeout(removeAnimationTimer)
    inAnimation = 1
    setTimeout(() => {
        document.getElementById("current_trick").style.transition = 'bottom 0.5s, left 0.5s' 
        document.getElementById("current_trick").style.left = window.getComputedStyle(getPlayerElement(trick.start)).left
        document.getElementById("current_trick").style.bottom = window.getComputedStyle(getPlayerElement(trick.start)).bottom
        setTimeout(() => {
            lastTrick.innerHTML = document.getElementById("current_trick").innerHTML
            document.getElementById("current_trick").style.transition = ''
            document.getElementById("current_trick").innerHTML = ''
            document.getElementById("current_trick").style.left = '45%'
            document.getElementById("current_trick").style.bottom = '72%'
            for (let i = 0; i<4; i++) appendCardToTrick(getPlayerElement(trick.start))
            for (let i = 0; i<users.length;i++) {
                getPlayerElement(i).className = ''
            }
            getPlayerElement(trick.start).className = 'their-turn'
            currentTrick = trick
            inAnimation = 0
        }, 500)
    }, 500)
})

socket.on('game_ended', (results) => setTimeout(() => renderResult(results), 700))

socket.on('special_point', (data) => showCalled(data.winner, data.point_name))

socket.on('special_card', (data) => {
    showCalled(data.userId, data.card)
    if (data.cardId == 2) isOdel = true;
}) //basically the same but like this its more understandable and maybe i will ad something in the future; update: did something

function showCalled(id, msg) {
    let elem = getPlayerElement(id).querySelector('.called')
    elem.innerHTML = msg
    elem.style.display = "block"
    inAnimation = 1
    setTimeout(() => {
        elem.style.display = "none"
        inAnimation = 0
    }, 1500)
}

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
        let elem = getCardsElement(userid)
        elem.innerHTML = ''
        for (let j = 0; j<userCards;j++) {
            elem.innerHTML += '<img class="card" src="/cards/back.svg" style="--i:'+(j-(Math.ceil(userCards/2)-1))+'">'
        }
        elem.innerHTML += `<p id="player-name" ${admins.includes(users[userid].username) ? 'class="admin"' : ''}>${users[userid].username}</p>`;
    }
}

function renderCardsforAll() {
    for (let i = 0; i<users.length;i++) {
        renderCardsfor(i)
    }
}

function placeCard(i) {
    if (isValid(i)) socket.emit('place_card', i)
    else showError("invalid move")
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
    const rePlayers = result[1].users.join(' & ');
    const contraPlayers = result[0].users.join(' & ');

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
        <a class="closeX" href=".">X</a>`;

    var result_div = document.getElementsByClassName("result-container")[0]
    result_div.innerHTML = scoreTable
    result_div.classList.add("show")
}




function isTrump(card) {
    if (card[0] == 0 || card[1] == 3 || card[1] == 4 || (card[0] == 1 && card[1] == 1) || (isOdel && card[0] == 1 && card[1] == 5)) return true; else return false;
}

function getColor(card) {
    if (isTrump(card)) return 4;
    return card[0]
}

function isValid(cardId) {    //a bit of a pain ngl
    if (inAnimation) return false;
    if (users.length != 4) return false;
    if (!document.getElementById("player0").classList.contains("their-turn")) return false;
    if (currentTrick[ownUserId]) return false;


    //definitly not copied from backend
    if (currentTrick.start == ownUserId) return true //the first player can do whatever they want
    startColor = getColor(currentTrick[currentTrick.start])
    if (getColor(ownCards[cardId]) != startColor) 
      for (let i = 0; i < ownCards.length; i++)
        if (getColor(ownCards[i]) == startColor)
          return false;

    return true;
}

function showLastTrick() {
    if (lastTrick.style.display == "block") lastTrick.style.display = "none"
    else lastTrick.style.display = "block"
}

function appendCardToTrick(elem) {
    const cardStack = elem.getElementsByClassName("tricks")[0];
    const cardsLength = cardStack.children.length
    cardStack.innerHTML += '<img onclick="showLastTrick()" class="card" src="/cards/back.svg" style="transform: translate(-'+cardsLength/1.5+'px, -'+cardsLength/1.5+'px)">';
}