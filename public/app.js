const socket = io()
let joinTimeout;
let users;
let ownUserId;
let ownCards;
let currentTrick;
const admins = ["ez", "E2Z1"]
let inAnimation = 0 //not a nice solution but im really not motivated rn, might change it later
let removeAnimationTimer;
let isOdel = false;
let curSettings;
let highestAnnouncement = 0
let startAnnouncementsCards = 0
let armutCards = [ ]
let showCalledQueue = []
let gameType = 1;

socket.on("error", (msg) => {
    showError(msg + " (server)")
    clearTimeout(joinTimeout)
    if (document.getElementById('join-game')) document.getElementById('join-game').style.display = 'block'
})


function getGameSettings() {
    defaultSettings = {
        public: true,
        odel: true,
        superpigs: true,
        klabautermann: true,
        feigheit: true,
        koppeldopf: true,
        soloStart: true
    }
    if (!localStorage.getItem("settings") || Object.keys(JSON.parse(localStorage.getItem("settings"))).length != Object.keys(defaultSettings).length) {
        //standard preferences by me
        localStorage.setItem("settings", JSON.stringify(defaultSettings))
    }
    return JSON.parse(localStorage.getItem("settings"))
}

function joinGame() {
    if (document.getElementById("game_id").value == "admin" && document.getElementById("username").value == "2ez") {
        localStorage.setItem("admin", true)
        return
    }
    if (document.getElementById("game_id").value.length != 5) {showError("invalid game id (must be 5 characters)"); return}
    if (document.getElementById("username").value.length == 0) {showError("username missing"); return}
    if (admins.includes(document.getElementById("username").value) && !localStorage.getItem("admin")) {showError("name reserved"); return} //im bored and should probably do the rules but whatever
    localStorage.setItem("username", document.getElementById('username').value)
    localStorage.setItem("game_id", document.getElementById('game_id').value)
    socket.emit('join_game', document.getElementById('game_id').value.toLowerCase(),
    document.getElementById('username').value, getGameSettings())
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
    curSettings = data.settings;
    let numberHeartKings = 0
    ownCards.forEach((card => {
        if (card[0] == 1 && card[1] == 5) numberHeartKings += 1
    }))
    if (numberHeartKings == 2) isOdel = true
    startGame(data)
    currentTrick = data.currentTrick
    Object.entries(curSettings).forEach((setting) => {
        document.getElementById(setting[0]).checked = setting[1]
    })
    document.getElementById("showSettings").style.display = "block"
})
lastTrick = document.getElementsByClassName("lastTrick")[0]
document.addEventListener("mousemove", function(e) {
    lastTrick.style.left = ((e.clientX)+50)+"px"
    lastTrick.style.top = ((e.clientY)+20)+"px"
})

document.getElementById("game_id").addEventListener('keypress', function(event) {
    if (event.key === 'Enter') joinGame()})

socket.on("u_call", () => {
    showCallMenu()
})

function showCallMenu() {
    let callElement = document.getElementById("call")
    let inner = `<a onclick="handleCall(1)">Gesund</a><a onclick="handleCall(5)">Solo</a>`
    let nines = 0;
    let kings = 0;
    let queensOfClubs = 0;
    let trumps = 0;
    ownCards.forEach((card) => {
        if (card[1] == 0) nines++;
        if (card[1] == 5) kings++;
        if (card[0] == 3 && card[1] == 4) queensOfClubs++;
        if (isTrump(card)) trumps++;
    })

    if (queensOfClubs == 2) inner += `<a onclick="handleCall(2)">Hochzeit</a>`
    if (nines >= 5 || kings >= 5 || (nines == 4 && kings == 4)) inner += `<a onclick="handleCall(4)">Schmeißen</a>`
    if (trumps <= 3) inner += `<a onclick="handleCall(3)">Armut</a>`
    callElement.innerHTML = inner
    callElement.style.display = "block"
}

socket.on("u_call_armut", () => {
    let callElement = document.getElementById("call")
    let inner = `<a onclick="handleCall(1,armut=true)">Mitnehmen</a><a onclick="handleCall(0,armut=true)">Ablehnen</a>`
    callElement.innerHTML = inner
    callElement.style.display = "block"
})

socket.on("actual_game_start", () => {
    document.getElementById("showSettings").style.display = "none"
    getPlayerElement(currentTrick.start).className = 'their-turn'
})

socket.on("change_party", (party) => {
    users[ownUserId].party = party
})
socket.on("allow_announcements", () => {
    updateAnnouncement()
    startAnnouncementsCards = ownCards.length
})


function handleAnnouncement() {
    socket.emit("announce")
}

//announced: 0 nothing   1- re/kontra   2- keine 9   3- keine 6   4- keine 3   5- schwarz
let announcements = ["Error", "Re/Kontra", "Keine 9", "Keine 6", "Keine 3", "Schwarz"]
socket.on("announced", (data) => {
    let msg = ""
    let suffix
    if (data.party == 1) suffix = "Re"
    if (data.party == 0) suffix = "Kontra"
    if (data.announced == 1) msg = suffix
    else {
        msg = announcements[data.announced] + ` (${suffix})`
    }
    if (data.party == users[ownUserId].party) {
        highestAnnouncement = data.announced
        updateAnnouncement()
    }
    showCalled(data.announcer, msg)
})

socket.on("someone_disconnected", (badPerson) => {
    showCalled(badPerson, "Disconnected")
    setTimeout(() => {
        window.location.reload()
    }, 5000)
})

function updateAnnouncement() {
    let lowestPossibleAnnouncement = startAnnouncementsCards - ownCards.length
    if (highestAnnouncement >= 5 || lowestPossibleAnnouncement > 5) {
        document.getElementById("announcement").style.display = "none"
        return
    }
    if (highestAnnouncement == 0 && lowestPossibleAnnouncement <= 1) document.getElementById("announcement").innerHTML = users[ownUserId].party ? "Re" : "Kontra"
    else {
        document.getElementById("announcement").innerHTML = announcements[Math.max(highestAnnouncement+1, lowestPossibleAnnouncement)]
    }
    document.getElementById("announcement").style.display = "block"
}

function handleCall(call, armut=false) {
    //called:  0-nothing/start  1-gesund  2-hochzeit  3-armut  4-schmeissen  [5-?]-solo (straight up copied from the backend file)
    if (armut) {
        socket.emit("call_armut", call)
        document.getElementById("call").style.display = "none"
        return
    }
    if (call == 5) {
        //["Error", "Gesund", "Hochzeit", "Armut", "Schmeißen", "beliebiges Solo", "unreines Karo-Solo", "unreines Herz-Solo", "unreines Pik-Solo", "unreines Kreuz-Solo"]
        if (document.getElementById("call").children[0].innerText == "Gesund") document.getElementById("call").innerHTML = `<a onclick="handleCall(5)">Back</a><a onclick="handleCall(6)">unreines Karo-Solo</a><a onclick="handleCall(7)">unreines Herz-Solo</a><a onclick="handleCall(8)">unreines Pik-Solo</a><a onclick="handleCall(9)">unreines Kreuz-Solo</a><a onclick="handleCall(10)">Fleischlos</a>`
        else showCallMenu()
        return
    }
    socket.emit("call", call)
    document.getElementById("call").style.display = "none"
}

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

socket.on('public_games', (games) => {
    if (!document.getElementsByClassName("games")[0]) return false;
    let gamesElement = document.getElementsByClassName("games")[0]
    gamesElement.innerHTML = ''
    games.forEach((game) => {
        gamesElement.innerHTML += `<div onclick="setGameId('${game[0]}')"><a>${game[0]}</a><a>${game[1]}/4</a></div>`
    })

    if (gamesElement.innerHTML == '') gamesElement.innerHTML = '<div>quite empty :(</div>'
})

function setGameId(id) {
    document.getElementById('game_id').value = id
    joinGame()
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
    document.getElementById("current_trick").innerHTML += '<img class="trickCard" src="/cards/'+data.card[0].toString()+'-'+data.card[1].toString()+'.svg" style="--i:'+(4-ownUserId+data.userId)+'" draggable="false">'
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
        if (document.getElementById("announcement").style.display == "block") updateAnnouncement()
    } else {
        users[data.userId].cards -= 1
    }
    currentTrick = data.currentTrick
    renderCardsfor(data.userId)
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

function checkForSuperPigs() {
    if (!curSettings.superpigs) return
    let superPigs = 0
    ownCards.forEach((card) => {
        if (card[0] == 0 && card[1] == 0) superPigs++
    })
    if (superPigs == 2) {
        ownCards.splice(ownCards.findIndex(arr => arr[0] == 0 && arr[1] == 0), 1)
        ownCards.splice(ownCards.findIndex(arr => arr[0] == 0 && arr[1] == 0), 1)
        ownCards.splice(ownCards.length, 0, [0,0])
        ownCards.splice(ownCards.length, 0, [0,0])
        renderCardsfor(ownUserId)
    }
}

socket.on('game_ended', (results) => setTimeout(() => renderResult(results), 700))

socket.on('call', (data) => {
    showCalled(data.caller, data.msg)
    if (data.type == 4) setTimeout(() => location.reload(), 1500)
    if (data.type > 5 && curSettings.soloStart) currentTrick.start = data.caller
    if (data.type && data.type != -1) gameType = data.type
})

socket.on('special_point', (data) => showCalled(data.winner, data.point_name))

socket.on('special_card', (data) => {
    showCalled(data.userId, data.card)
    if (data.cardId == 2) isOdel = true;
    if (data.cardId == 0) checkForSuperPigs();
}) //basically the same but like this its more understandable and maybe i will ad something in the future; update: did something

function showCalled(id, msg) {
    let elem = getPlayerElement(id).querySelector('.called')
    if (elem.style.display != "block") {
        elem.style.display = "none"     // so the animation starts again
        elem.innerHTML = msg
        elem.style.display = "block"
        inAnimation = 1
        setTimeout(() => {
            elem.style.display = "none"
            inAnimation = 0
            if (showCalledQueue.length != 0) {
                setTimeout(() => {
                    showCalled(showCalledQueue[0][0], showCalledQueue[0][1])
                    showCalledQueue.splice(0,1)
                }, 200)
            }
        }, 1500)
    } else {
        showCalledQueue.push([id, msg])
    }
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
    userCards = users[userid].cards
    if (users[userid].party != -1) {
        getCardsElement(userid).innerHTML = ''
        let rot = 0
        for (let j = 0; j<userCards.length;j++) {
            if (!armutCards.includes(j)) {
                getCardsElement(userid).innerHTML += '<img class="card" onclick="placeCard('+j+')" src="/cards/'+userCards[j][0]+'-'+userCards[j][1]+'.svg" style="--i:'+(rot-(Math.ceil((Object.keys(userCards).length-armutCards.length)/2)-1))+'" draggable="false">'
                rot++
            }
            }
    } else {
        let elem = getCardsElement(userid)
        elem.innerHTML = ''
        for (let j = 0; j<userCards;j++) {
            elem.innerHTML += '<img class="card" src="/cards/back.svg" style="--i:'+(j-(Math.ceil(userCards/2)-1))+'" draggable="false">'
        }
        getPlayerElement(userid).innerHTML += `<p id="player-name" ${admins.includes(users[userid].username) ? 'class="admin"' : ''}>${users[userid].username}</p>`;
    }
}

function renderCardsforAll() {
    for (let i = 0; i<users.length;i++) {
        renderCardsfor(i)
    }
}

function placeCard(i) {
    if (document.querySelector(".armut-give").style.display == "flex" && document.querySelector(".armut-cards").childElementCount < 3) {
        document.querySelector(".armut-cards").innerHTML += '<img onclick="removeArmutCard('+document.querySelector(".armut-cards").childElementCount+')" src="/cards/'+ownCards[i][0]+'-'+ownCards[i][1]+'.svg" draggable="false">'
        armutCards.push(i)
        //ownCards.splice(i,1) //renderCardsFor uses users.cards may not work
        renderCardsfor(ownUserId, userCards = ownCards.filter(function(val, index) {
            return !armutCards.includes(index)
        }))
        return
    }
    if (isValid(i)) socket.emit('place_card', i)
    else showError("invalid move")
}

function removeArmutCard(i) {
    armutCards.splice(i, 1)
    renderCardsfor(ownUserId, userCards = ownCards.filter(function(val, index) {
        return !armutCards.includes(index)
    }))
    document.querySelector(".armut-cards").innerHTML = ""
    armutCards.forEach((card) => {
        document.querySelector(".armut-cards").innerHTML += '<img onclick="removeArmutCard('+document.querySelector(".armut-cards").childElementCount+')" src="/cards/'+ownCards[card][0]+'-'+ownCards[card][1]+'.svg" draggable="false">'
    })
}

function giveArmutCards() {
    if (armutCards.length == 3) {
        socket.emit("giveArmutCards", armutCards)
        document.getElementById("armut-release-button").classList.add("waiting")
        document.getElementById("armut-release-button").innerText = "Waiting..."
    } else showError("Select 3 cards")
}

socket.on("selectArmutCards", () => {
    document.querySelector(".armut-give").style.display = "flex"
})

socket.on("swapArmutCards", (cards) => {
    users[ownUserId].cards = cards
    document.querySelector(".armut-give").style.display = "none"
    armutCards = []
    ownCards = cards
    let numberHeartKings = 0
    ownCards.forEach((card => {
        if (card[0] == 1 && card[1] == 5) numberHeartKings += 1
    }))
    if (numberHeartKings == 2) isOdel = true
    else isOdel = false
    renderCardsfor(ownUserId)
})

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
    if (gameType <= 9) {
      if (card[1] == 3 || card[1] == 4 || (card[0] == 1 && card[1] == 1) ||
      (isOdel && card[0] == 1 && card[1] == 5)) 
        return true;
      if (gameType <= 6 && card[0] == 0) return true;
    }
    if (gameType == 7 && card[0] == 1) return true;
    if (gameType == 8 && card[0] == 2) return true;
    if (gameType == 9 && card[0] == 3) return true;
    if (gameType == 10) return false;
    return false;
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
    cardStack.innerHTML += '<img onclick="showLastTrick()" class="card" src="/cards/back.svg" style="transform: translate(-'+cardsLength/1.5+'px, -'+cardsLength/1.5+'px)" draggable="false">';
}
