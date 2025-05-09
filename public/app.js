const socket = io()
let joinTimeout;
let users;
let ownUserId;
let ownCards;
let currentTrick;
const admins = ["ez", "E2Z1"]
let inAnimation = 0 //not a nice solution but im really not motivated rn, might change it later
let removeAnimationTimer;
let special_cards = [];
let curSettings;
let highestAnnouncement = 0
let startAnnouncementsCards = 0
let armutCards = []
let showCalledQueue = [[],[],[],[]] //for each user one list
let gameType = 1;
const colorSeq = [0,3,4,5,1,2];
const secondaryTrumpColor = [0,0,0,0,0,0,0,1,2,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,0,-1,-1]
let refreshInterval = setInterval(() => socket.emit('getPublicGames'), 5000);
const cardsWorth = [0,10,11,2,3,4]
let isSpectator = false
let called_special_cards = []

var SFXs
var userSettings

const defaultSettings = {
    public: true,
    odel: true,
    superpigs: true,
    klabautermann: true,
    feigheit: true,
    koppeldopf: true,
    soloStart: true,
    pureSolo: true,
    shiftSpecialCardsSolo: true,
    manyFulls: true,
    pureKingNineSolo: true,
    kingNineSolo: true,
    lossSolo: true,
    redBlackSolo: true,
    throwOverSolo: false,
    feigheitInSolo: false,
    uncalling: true,
}

function playSound(type, userId) {
    if (!userSettings.SFXToggle) return
    sound = SFXs[type][(4-ownUserId+userId)%4]
    sound.currentTime = 0;
    sound.play()
}

socket.on("error", (msg) => {
    showError(msg + " (server)")
    clearTimeout(joinTimeout)
    if (document.getElementById('join-game')) document.getElementById('join-game').style.display = 'block'
})


function getGameSettings() {
    if (!localStorage.getItem("settings") || Object.keys(JSON.parse(localStorage.getItem("settings"))).length != Object.keys(defaultSettings).length) {
        //standard preferences by me
        localStorage.setItem("settings", JSON.stringify(defaultSettings))
    }
    return JSON.parse(localStorage.getItem("settings"))
}

function joinGame() {
    SFXs = {
        place: [new Audio("/sfx/place/front.mp3"), new Audio("/sfx/place/left.mp3"), new Audio("/sfx/place/back.mp3"), new Audio("/sfx/place/right.mp3")],
        call: [new Audio("/sfx/call/front.mp3"), new Audio("/sfx/call/left.mp3"), new Audio("/sfx/call/back.mp3"), new Audio("/sfx/call/right.mp3")],
    } //defined here bc ios needs them to be defined on user input else its autoplay for them which gets blocked
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


window.onbeforeunload = function (e) {
    if (!localStorage.getItem("rj_data")) return
    let rj_data = JSON.parse(localStorage.getItem("rj_data"))
    rj_data.time = Date.now()
    localStorage.setItem("rj_data", JSON.stringify(rj_data))
}

document.addEventListener("DOMContentLoaded", function(e) {
    document.getElementById('username').value = localStorage.getItem('username')
    document.getElementById('game_id').value = localStorage.getItem('game_id')

    const defaultUserSettings = {
        SFXToggle: true,
    }

    if (!localStorage.getItem("userSettings") || Object.keys(JSON.parse(localStorage.getItem("userSettings"))).length != Object.keys(defaultUserSettings).length) {
        //standard preferences by me
        localStorage.setItem("userSettings", JSON.stringify(defaultUserSettings))
    }
    userSettings = JSON.parse(localStorage.getItem("userSettings"))
    Object.entries(userSettings).forEach((setting) => {
        document.getElementById(setting[0]).checked = setting[1]
    })

    if (!localStorage.getItem("settings")) {
        document.querySelector('.defaultSettingsWarning').style.display = "block"
    }

    if (localStorage.getItem("rj_data")) {
        const rj_data = JSON.parse(localStorage.getItem("rj_data"))
        if (rj_data.time) {
            if (rj_data.time+15000 > Date.now) {
                localStorage.removeItem("rj_data")
                return
            } else {
                setTimeout(() => {
                    localStorage.removeItem("rj_data")
                    if (document.querySelector('.rejoinMessage')) document.querySelector('.rejoinMessage').style.display = "none"
                }, rj_data.time+15000-Date.now())
            }
        }
        document.querySelector('.rejoinMessage').style.display = "block"
        document.querySelector('.rejoinMessage').querySelector("h3").innerText = `You left an active game (${rj_data.game_id})!`
    }
})

function saveUserSettings() {
    Object.entries(userSettings).forEach((setting) => {
        userSettings[setting[0]] = document.getElementById(setting[0]).checked
    })
    localStorage.setItem("userSettings", JSON.stringify(userSettings))
}

socket.on("init", (data) => {
    ownUserId = data.users.length-1
    ownCards = data.users[ownUserId].cards
    curSettings = data.settings;
    users = data.users
    localStorage.setItem("rj_data", JSON.stringify({
        pw: data.users[ownUserId].rj_password,
        game_id: localStorage.getItem("game_id"),
        user_id: ownUserId
    }))
    let oedel = 0
    let pigs = 0
    let superPigs = 0
    ownCards.forEach((card) => {
        if (equals2D(card, getPigCard())) pigs++
        else if (equals2D(card, getSuperPigCard())) superPigs++
        else if (equals2D(card, getOdelCard())) oedel++
    })
    if (oedel == 2 && curSettings.odel) special_cards.push(2)
    if (superPigs == 2 && curSettings.superpigs) special_cards.push(1)
    if (pigs == 2) special_cards.push(0)
    startGame(data)
    currentTrick = data.currentTrick
    Object.entries(curSettings).forEach((setting) => {
        document.getElementById(setting[0]).checked = setting[1]
    })
    document.getElementById("showSettings").style.display = "block"
    setTimeout(() => {
        document.getElementById("showSettings").style.maxHeight = "2em"
    }, 1000)
    clearInterval(refreshInterval)
})

socket.on("init_spec", (data) => {
    isSpectator = true
    ownUserId = -4
    curSettings = data.settings;
    users = data.users
    startGame(data)
    currentTrick = data.currentTrick
    let i
    for (i = currentTrick.start; i < currentTrick.start+Object.keys(currentTrick).length-1; i++) {
        document.getElementById("current_trick").innerHTML += '<img class="trickCard" src="/cards/'+currentTrick[i%4][0].toString()+'-'+currentTrick[i%4][1].toString()+'.svg" style="--i:'+(4-ownUserId+i%4)+'" draggable="false">'
    }
    getPlayerElement(i).className = 'their-turn'
    for (let j = 0; j < users.length; j++)
        for (let k = 0; k<users[j].tricks; k++) appendCardToTrick(getPlayerElement(j))

    Object.entries(curSettings).forEach((setting) => {
        document.getElementById(setting[0]).checked = setting[1]
    })
    document.getElementById("showSettings").style.display = "block"
    setTimeout(() => {
        document.getElementById("showSettings").style.maxHeight = "2em"
    }, 1000)
    clearInterval(refreshInterval)
})

socket.on("init_rj", (data) => {
    ownUserId = data.users.length-1
    ownCards = data.users[ownUserId].cards
    curSettings = data.settings;
    users = data.users
    gameType = data.type
    startAnnouncementsCards = data.startAnnouncementsCards
    localStorage.setItem("rj_data", JSON.stringify({
        pw: data.users[ownUserId].rj_password,
        game_id: localStorage.getItem("game_id"),
        user_id: ownUserId
    }))
    let oedel = 0
    let pigs = 0
    let superPigs = 0
    ownCards.forEach((card) => {
        if (equals2D(card, getPigCard())) pigs++
        else if (equals2D(card, getSuperPigCard())) superPigs++
        else if (equals2D(card, getOdelCard())) oedel++
    })
    if (oedel == 2 && curSettings.odel) special_cards.push(2)
    if (superPigs == 2 && curSettings.superpigs) special_cards.push(1)
    if (pigs == 2) special_cards.push(0)
    startGame(data)
    currentTrick = data.currentTrick
    clearInterval(refreshInterval)
    let i
    for (i = currentTrick.start; i < currentTrick.start+Object.keys(currentTrick).length-1; i++) {
        document.getElementById("current_trick").innerHTML += '<img class="trickCard" src="/cards/'+currentTrick[i%4][0].toString()+'-'+currentTrick[i%4][1].toString()+'.svg" style="--i:'+(4-ownUserId+i%4)+'" draggable="false">'
    }
    if (data.type != -1) {
        getPlayerElement(i).className = 'their-turn'
        if (ownCards.length <= startAnnouncementsCards) {
            updateAnnouncement()
        }
    } else {
        document.getElementById("showSettings").style.display = "block"
        setTimeout(() => {
            document.getElementById("showSettings").style.maxHeight = "2em"
        }, 1000)
    }
    for (let j = 0; j < users.length; j++)
        for (let k = 0; k<users[j].tricks; k++) appendCardToTrick(getPlayerElement(j))
})

function rejoin() {
    const rj_data = JSON.parse(localStorage.getItem("rj_data"))
    document.querySelector('.rejoinMessage').style.display = 'none'
    socket.emit('rejoin', rj_data.game_id, rj_data.user_id, rj_data.pw)
    localStorage.removeItem("rj_data")
}

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

socket.on("full_game", () => {
    document.querySelector('.fullGameMessage').style.display = 'block'
    clearTimeout(joinTimeout)
})

function showCallMenu() {
    let callElement = document.getElementById("call")
    let inner = `<a onclick="handleCall(1)">Gesund</a><a onclick="handleCall(5)">Solo</a>`
    let nines = 0;
    let kings = 0;
    let queensOfClubs = 0;
    let trumps = 0;
    let cardValue = 0;
    ownCards.forEach((card) => {
        if (card[1] == 0) nines++;
        if (card[1] == 5) kings++;
        if (card[0] == 3 && card[1] == 4) queensOfClubs++;
        if (isTrump(card)) trumps++;
        cardValue += cardsWorth[card[1]]
    })

    if (queensOfClubs == 2) inner += `<a onclick="handleCall(2)">Hochzeit</a>`
    if (nines >= 5 || kings >= 5 || (nines == 4 && kings == 4) || (cardValue >= 80 && curSettings.manyFulls)) inner += `<a onclick="handleCall(4)">Schmeißen</a>`
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
    if (!isSpectator) document.getElementById("showSettings").style.display = "none"
    getPlayerElement(currentTrick.start).className = 'their-turn'
})

socket.on("change_party", (party) => {
    users[ownUserId].party = party
})
socket.on("allow_announcements", () => {
    if (isSpectator) return
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
        localStorage.removeItem("rj_data")
        window.location.reload()
    }, 5000)
})

socket.on( 'disconnect', () => {
    setTimeout(() => window.location.reload(),100)  //takes ~100ms to restart server locally
});

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
        if (document.getElementById("call").children[0].innerText == "Gesund") {
            document.getElementById("call").innerHTML = `<a onclick="handleCall(5)">Back</a><a onclick="handleCall(6)">unreines Karo-Solo</a>
                <a onclick="handleCall(7)">unreines Herz-Solo</a><a onclick="handleCall(8)">unreines Pik-Solo</a><a onclick="handleCall(9)">unreines Kreuz-Solo</a><a onclick="handleCall(20)">Fleischlos</a>
                <a onclick="handleCall(18)">Buben-Solo</a><a onclick="handleCall(19)">Damen-Solo</a>`
            if (curSettings.pureSolo) document.getElementById("call").innerHTML += `<a onclick="handleCall(12)">reines Karo-Solo</a>
                <a onclick="handleCall(13)">reines Herz-Solo</a><a onclick="handleCall(14)">reines Pik-Solo</a><a onclick="handleCall(15)">reines Kreuz-Solo</a>`
            if (curSettings.kingNineSolo) document.getElementById("call").innerHTML += `<a onclick="handleCall(10)">unreines Neunen-Solo</a><a onclick="handleCall(11)">unreines Königs-Solo</a>`
            if (curSettings.pureKingNineSolo) document.getElementById("call").innerHTML += `<a onclick="handleCall(16)">reines Neunen-Solo</a><a onclick="handleCall(17)">reines Königs-Solo</a>`
            if (curSettings.lossSolo) document.getElementById("call").innerHTML += `<a onclick="handleCall(21)">Verlusts-Solo</a>`
            if (curSettings.redBlackSolo) document.getElementById("call").innerHTML += `<a onclick="handleCall(22)">Rot-Solo</a><a onclick="handleCall(23)">Schwarz-Solo</a>`
        } else showCallMenu()
        return
    }
    socket.emit("call", call)
    document.getElementById("call").style.display = "none"
}

function startGame(data) {
    clearTimeout(joinTimeout)
    if (document.getElementsByClassName("select-game")[0]) document.getElementsByClassName("select-game")[0].remove();
    if (document.getElementsByClassName("navbar")[0]) document.getElementsByClassName("navbar")[0].remove();
    if (document.getElementsByClassName("userSettings")[0]) document.getElementsByClassName("userSettings")[0].remove();
    if (document.getElementsByClassName("fullGameMessage")[0]) document.getElementsByClassName("fullGameMessage")[0].remove();
    if (document.getElementsByClassName("rejoinMessage")[0]) document.getElementsByClassName("rejoinMessage")[0].remove();
    if (document.getElementsByClassName("defaultSettingsWarning")[0]) document.getElementsByClassName("defaultSettingsWarning")[0].remove();
    const gameContainer = document.getElementsByClassName("game-container")[0];
    gameContainer.style.width = '100%';
    gameContainer.style.height = '100%';
	gameContainer.style.display = "block";
	if (ownUserId == 0) {
		document.getElementById("fillBots").style.display = "block";
	}
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
	if (users.length == 4) {
		document.getElementById("fillBots").style.display = "none";
	}
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
    let nextPlayer
    if (inAnimation) {
        setTimeout(() => cardPlaced(data), 100)
        return
    }
    playSound("place", data.userId)
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
    }, 2000)
})

function getPigCard() {
    if (gameType >= 12) return [-1, -1] //reine soli haben keine schweine
    if (!curSettings.shiftSpecialCardsSolo || gameType <= 6) return [0,2]
    if (curSettings.shiftSpecialCardsSolo && gameType >= 10) return [-1,-1]
    return [gameType-6, 2]
}

function getOdelCard() {
    if (gameType >= 12) return [-1, -1] //reine soli haben keine oedel doedel
    if (!curSettings.shiftSpecialCardsSolo || gameType <= 6) return [1,5]
    if (curSettings.shiftSpecialCardsSolo && gameType >= 10) return [-1,-1]
    return [(gameType-5)%4, 5]
}

function getSuperPigCard() {
    if (gameType >= 12) return [-1, -1] //reine soli haben keine super schweine
    if (!curSettings.shiftSpecialCardsSolo || gameType <= 6) return [0,0]
    if (curSettings.shiftSpecialCardsSolo && gameType >= 10) return [-1,-1]
    return [gameType-6, 0]
}

function equals2D(arr1, arr2) {
    return arr1[0] == arr2[0] && arr1[1] == arr2[1]
}

function getSpecialCards() {
    let pigs = 0
    let superPigs = 0
    let oedel = 0
    special_cards = []
    if (gameType > 11 && gameType != 21) {
        return  //nur in unreinen soli gibt es special cards
    }
    ownCards.forEach((card) => {
        if (equals2D(card, getPigCard())) pigs++
        else if (equals2D(card, getSuperPigCard())) superPigs++
        else if (equals2D(card, getOdelCard())) oedel++
    })
    if (oedel == 2 && curSettings.odel) {
        special_cards.push(2)
        ownCards.splice(ownCards.findIndex(arr => equals2D(arr, getOdelCard())), 1)
        ownCards.splice(ownCards.findIndex(arr => equals2D(arr, getOdelCard())), 1)
        let h10Index = ownCards.findIndex(arr => arr[0] == 1 && arr[1] == 1)
        if (h10Index == -1) {
            ownCards.splice(ownCards.length, 0, getOdelCard())
            ownCards.splice(ownCards.length, 0, getOdelCard())
        } else if (ownCards.slice(h10Index+1).findIndex(arr => arr[0] == 1 && arr[1] == 1) == -1) {
            ownCards.splice(ownCards.length-1, 0, getOdelCard())
            ownCards.splice(ownCards.length-1, 0, getOdelCard())
        } else {
            ownCards.splice(ownCards.length-2, 0, getOdelCard())
            ownCards.splice(ownCards.length-2, 0, getOdelCard())
        }
        
    }

    if (pigs == 2) {
        special_cards.push(0)
        ownCards.splice(ownCards.findIndex(arr => equals2D(arr, getPigCard())), 1)
        ownCards.splice(ownCards.findIndex(arr => equals2D(arr, getPigCard())), 1)
        ownCards.splice(ownCards.length, 0, getPigCard())
        ownCards.splice(ownCards.length, 0, getPigCard())
    }
    if (superPigs == 2 && pigs == 2 && curSettings.superpigs) {
        special_cards.push(1)
        ownCards.splice(ownCards.findIndex(arr => equals2D(arr, getSuperPigCard())), 1)
        ownCards.splice(ownCards.findIndex(arr => equals2D(arr, getSuperPigCard())), 1)
        ownCards.splice(ownCards.length, 0, getSuperPigCard())
        ownCards.splice(ownCards.length, 0, getSuperPigCard())
    }
}

function checkForSuperPigs() {
    if (!curSettings.superpigs) return
    let superPigs = 0
    ownCards.forEach((card) => {
        if (equals2D(card, getSuperPigCard())) superPigs++
    })
    if (superPigs == 2) {
        ownCards.splice(ownCards.findIndex(arr => equals2D(arr, getSuperPigCard())), 1)
        ownCards.splice(ownCards.findIndex(arr => equals2D(arr, getSuperPigCard())), 1)
        ownCards.splice(ownCards.length, 0, getSuperPigCard())
        ownCards.splice(ownCards.length, 0, getSuperPigCard())
        renderCardsfor(ownUserId)
    }
}

function showSettingsFlip() {
    let showSettings = document.getElementById("showSettings");
    if (showSettings.style.maxHeight === "2em") {
      showSettings.style.maxHeight = "25em";
    } else {
      showSettings.style.maxHeight = "2em";
    }
  }

socket.on('game_ended', (results) => setTimeout(() => renderResult(results), 700))

socket.on('call', (data) => {
    showCalled(data.caller, data.msg)
    if (data.type == 4) setTimeout(() => {
        localStorage.removeItem("rj_data")
        location.reload()
    }, 1500)
    if (data.type > 5 && curSettings.soloStart) currentTrick.start = data.caller
    if (data.type && data.type != -1) gameType = data.type
    if (data.type > 6) {
        ownCards.sort((a, b) => {
            //1: a is higher, -1: b is higher
            if (isTrump(a)) {
                if (!isTrump(b)) return 1;
                if (a[0] === secondaryTrumpColor[gameType] && !(a[1] == 3 || a[1] == 4 || equals2D(a, [1,1]))) { // diamond
                    if (b[0] !== 0 || (b[1] == 3 || b[1] == 4)) return -1;
                    if (colorSeq.indexOf(b[1]) > colorSeq.indexOf(a[1])) return -1; else return 1;
                } else { // not diamond
                    if (data.type <= 11) {  //unreine soli
                        if (b[0] === secondaryTrumpColor[data.type] && !(b[1] == 3 || b[1] == 4 || equals2D(b, [1,1]))) return 1;
                        if (b[0] === 1 && b[1] === 1) return -1;
                        if (a[0] === 1 && a[1] === 1) return 1;

                        if (data.type == 10) {
                            if (a[1] === 0) return 1;
                            if (b[1] === 0) return -1;
                        }
                        if (data.type == 11) {
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
                if (isTrump(b)) return -1;
                if (b[0] !== a[0]) return a[0]-b[0];
                return colorSeq.indexOf(a[1]) - colorSeq.indexOf(b[1])
            }
          });
        getSpecialCards()
        renderCardsfor(ownUserId)
    }
})

socket.on('special_point', (data) => showCalled(data.winner, data.point_name))

socket.on('special_card', (data) => {
    showCalled(data.userId, data.card)
    special_cards.push(data.cardId)
    if (data.cardId == 0) checkForSuperPigs();
}) //basically the same but like this its more understandable and maybe i will ad something in the future; update: did something

function showCalled(id, msg) {
    let elem = getPlayerElement(id).querySelector('.called')
    if (elem.style.display != "block") {
        elem.style.display = "none"     // so the animation starts again
        elem.innerHTML = msg
        elem.style.display = "block"
        inAnimation = 1
        playSound("call", id)
        setTimeout(() => {
            elem.style.display = "none"
            inAnimation = 0
            if (showCalledQueue[id].length != 0) {
                setTimeout(() => {
                    showCalled(id, showCalledQueue[id][0])
                    showCalledQueue[id].splice(0,1)
                }, 200)
            }
        }, 1500)
    } else {
        showCalledQueue[id].push(msg)
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
                getCardsElement(userid).innerHTML += `<img class="card" onclick="placeCard(${j})" onkeydown="if(event.key === 'Enter' || event.key === ' ') placeCard(${j})" src="/cards/${userCards[j][0]}-${userCards[j][1]}.svg" style="--i:${(rot-((Object.keys(userCards).length-armutCards.length)/2-(Object.keys(userCards).length ? 0.5: 0)))}" draggable="false" tabindex="0">`
                rot++
            }
        }
    } else {
        let elem = getCardsElement(userid)
        elem.innerHTML = ''
        for (let j = 0; j<userCards;j++) {
            elem.innerHTML += '<img class="card no-hover-card" src="/cards/back.svg" style="--i:'+(j-(Math.ceil(userCards/2)-1))+'" draggable="false">' // no-hover-card for spectator
        }
        getPlayerElement(userid).innerHTML += `<p class="player-name${admins.includes(users[userid].username) ? ' admin' : ''}">${users[userid].username}</p>`;
    }
}

function renderCardsforAll() {
    for (let i = 0; i<users.length;i++) {
        renderCardsfor(i)
    }
}

function placeCard(i) {
    document.getElementById("call").style.display = "none"
    if (document.querySelector(".armut-give").style.display == "flex" && document.querySelector(".armut-cards").childElementCount < 3) {
        document.querySelector(".armut-cards").innerHTML += '<img onclick="removeArmutCard('+document.querySelector(".armut-cards").childElementCount+')" src="/cards/'+ownCards[i][0]+'-'+ownCards[i][1]+'.svg" draggable="false">'
        armutCards.push(i)
        //ownCards.splice(i,1) //renderCardsFor uses users.cards may not work
        renderCardsfor(ownUserId, userCards = ownCards.filter(function(val, index) {
            return !armutCards.includes(index)
        }))
        return
    }
    if (curSettings.uncalling && ((special_cards.includes(2) && !called_special_cards.includes(2) && equals2D(ownCards[i], getOdelCard())) ||
        (special_cards.includes(0) && !called_special_cards.includes(0) && equals2D(ownCards[i], getPigCard())) ||
        (special_cards.includes(1) && !called_special_cards.includes(1) && equals2D(ownCards[i], getSuperPigCard())))) {
            document.getElementById("call").innerHTML = `<a onclick="callSpecialCard(${i})">Ansagen</a><a onclick="uncall(${i})">Absagen</a>`
            document.getElementById("call").style.display = "block"
            return
    }
    if (isValid(i)) {
        let startColor;
        if (curSettings.uncalling && currentTrick.start != ownUserId && (startColor = getColor(currentTrick[currentTrick.start])) != getColor(ownCards[i])) {    //looking if indirect call of special card   fck gotta add a lot of stuff    isTrump: first odel etc not defined
            if (startColor == 4) {
                special_cards = []
            } else {
                if (!curSettings.shiftSpecialCardsSolo && gameType > 6 && gameType < 12) {
                    if (special_cards.includes(0) && !called_special_cards.includes(0) && startColor == getPigCard()[0] && howManyCardsAreThereFromThisColor(startColor) == 0) called_special_cards.push(0)
                    if (special_cards.includes(1) && !called_special_cards.includes(1) && startColor == getSuperPigCard()[0] && howManyCardsAreThereFromThisColor(startColor) == 0) called_special_cards.push(1)
                }
                if (special_cards.includes(2) && !called_special_cards.includes(2) && startColor == getOdelCard()[0] && howManyCardsAreThereFromThisColor(startColor) == 0) {   //if odel would be placed / uncalled the code wouldnt be reach
                    called_special_cards.push(2)
                }
            }

        }

        socket.emit('place_card', i)
    
    }
    else showError("invalid move")
}

function howManyCardsAreThereFromThisColor(color) {
    let count = 0
    for (let i = 0; i < ownCards.length; i++)
        if (getColor(ownCards[i]) == color)
          count++
    return count
}

function callSpecialCard(i) {
    document.getElementById('call').style.display = 'none'
    if (isValid(i)) {
        socket.emit('place_card', i)
        called_special_cards.push(getSpecialCardFromIndex(i))
        if (getSpecialCardFromIndex(i) == 0) called_special_cards.push(1)
    } else showError("invalid move")
}

function getSpecialCardFromIndex(i) {
    if (equals2D(ownCards[i], getPigCard())) return 0
    else if (equals2D(ownCards[i], getSuperPigCard())) return 1
    else if (equals2D(ownCards[i], getOdelCard())) return 2
    return -1
}

function uncall(i) {
    document.getElementById('call').style.display = 'none'
    let curSpecialCard = getSpecialCardFromIndex(i)
    special_cards = special_cards.filter(x => x != curSpecialCard)
    if (curSpecialCard == 0) {  //ohne schweine keine superschweine
        special_cards = special_cards.filter(x => x != 1)
    }
    if (isValid(i)) {               //valid check needs to be after change
        socket.emit('place_card', i, curSpecialCard)
    } else {
        socket.emit("uncall", curSpecialCard)   //becomes buggy else
        showError("invalid move")
    }
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
    let oedel = 0
    let pigs = 0
    let superPigs = 0
    ownCards.forEach((card) => {
        if (equals2D(card, getPigCard())) pigs++
        else if (equals2D(card, getSuperPigCard())) superPigs++
        else if (equals2D(card, getOdelCard())) oedel++
    })
    special_cards = []
    if (oedel == 2 && curSettings.odel) special_cards.push(2)
    if (superPigs == 2 && curSettings.superpigs) special_cards.push(1)
    if (pigs == 2) special_cards.push(0)
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
        if (key == "Solo") {
            return `<tr><th>${key}</th><td><b>*3</b></td><td></td></tr>`;
        } else if (key == "Feigheit") { //both only have symbolic(?) value
            reScore *= -1
            return `<tr><th>${key}</th><td><b>*(-1)</b></td><td><b>*(-1)</b></td></tr>`;
        } else if (key == "Verlusts-Solo") {
            reScore *= -1
            return `<tr><th>${key}</th><td><b>*(-1)</b></td><td><b>*(-1)</b></td></tr>`;
        } else {
            reScore += value;
            return `<tr><th>${key}</th><td>${value}</td><td>${-value}</td></tr>`;
        }
    });

    const totalScore = `<tr><th>Summe</th><td><b>${result[1].users.length == 1 ? reScore*3 : reScore}</b></td><td><b>${-reScore}</b></td></tr>`;

    const scoreTable = `
        <table>
          <tr><th></th><th>Re</th><th>Kontra</th></tr>
          <tr><th></th><td>${rePlayers}</td><td>${contraPlayers}</td></tr>
          <tr><th>Augen</th><td>${result[1].eyes}</td><td>${240-result[1].eyes}</td></tr>
          ${scoreRows.join('')}
          <tr></tr>
          ${totalScore}
        </table>
        <a class="closeX" onclick="localStorage.removeItem('rj_data')" href=".">X</a>`;

    var result_div = document.getElementsByClassName("result-container")[0]
    result_div.innerHTML = scoreTable
    result_div.classList.add("show")
}


function isTrump(card) {
    if (gameType <= 11 || gameType == 21) {
      if (card[1] == 3 || card[1] == 4 || (card[0] == 1 && card[1] == 1) ||
      (special_cards.includes(2) && equals2D(card, getOdelCard())) ||
      (special_cards.includes(0) && equals2D(card, getPigCard())) ||
      (special_cards.includes(1) && equals2D(card, getSuperPigCard()))) 
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

function getColor(card) {
    if (isTrump(card)) return 4;
    return card[0]
}

function isValid(cardId) {    //a bit of a pain ngl     retrospektiv voll entspannt
    if (inAnimation) return false;
    if (users.length != 4) return false;
    if (!document.getElementById("player0").classList.contains("their-turn")) return false;
    if (currentTrick[ownUserId]) return false;


    //definitly not copied from backend
    if (currentTrick.start == ownUserId) return true //the first player can do whatever they want
    let startColor = getColor(currentTrick[currentTrick.start])
    if (getColor(ownCards[cardId]) != startColor) 
      for (let i = 0; i < ownCards.length; i++)
        if (getColor(ownCards[i]) == startColor && !(curSettings.uncalling && ((special_cards.includes(2) && !called_special_cards.includes(2) && equals2D(ownCards[i], getOdelCard())) ||
            (getPigCard()[0] != secondaryTrumpColor[gameType] && special_cards.includes(0) && !called_special_cards.includes(0) && equals2D(ownCards[i], getPigCard())) ||
            (getSuperPigCard()[0] != secondaryTrumpColor[gameType] && special_cards.includes(1) && !called_special_cards.includes(1) && equals2D(ownCards[i], getSuperPigCard())))))
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
