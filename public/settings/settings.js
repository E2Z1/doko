document.addEventListener("DOMContentLoaded", function(e) {
    defaultSettings = {
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
    if (!localStorage.getItem("settings") || Object.keys(JSON.parse(localStorage.getItem("settings"))).length != Object.keys(defaultSettings).length) {
        //standard preferences by me
        localStorage.setItem("settings", JSON.stringify(defaultSettings))
    }
    const settings = JSON.parse(localStorage.getItem("settings"))
    Object.entries(settings).forEach((setting) => {
        document.getElementById(setting[0]).checked = setting[1]
    })
})

function saveSettings() {
    let settings = JSON.parse(localStorage.getItem("settings"))
    Object.entries(settings).forEach((setting) => {
        settings[setting[0]] = document.getElementById(setting[0]).checked
    })
    localStorage.setItem("settings", JSON.stringify(settings))
}