document.addEventListener("DOMContentLoaded", function(e) {
    if (!localStorage.getItem("settings")) {
        //standard preferences by me
        localStorage.setItem("settings", JSON.stringify({
            public: true,
            odel: true,
            superpigs: true,
            klabautermann: true,
            feigheit: true
        }))
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