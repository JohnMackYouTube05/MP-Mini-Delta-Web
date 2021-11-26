function pad(e, t) {
    return s = "000" + e, s.substr(s.length - t)
}

function scrollConsole() {
    $cont = $("#console"), $cont[0].scrollTop = $cont[0].scrollHeight
}

function feedback(e) {
    if (e = e.replace(/N0 P13 B15/g, ""), e = e.replace(/N0 P14 B15/g, ""), e = e.replace(/N0 P15 B13/g, ""), e = e.replace(/N0 P15 B15/g, ""), e = e.replace(/N0 P15 B1 /g, ""), e = e.replace(/echo:/g, ""), e = e.replace(/ Size: /g, "<br />Size: "), "T:" != e.substring(0, 2) && "ok T:" != e.substring(0, 5)) {
        if (e.match(/Begin file list/g) || e.match(/End file list/g) || 1 == sdListing) return sdListing = !0, e.match(/End file list/g) && (sdListing = !1), void buildFilnames(e);
        e.trim(), e = e.replace(/\n/g, "<br />"), "<br />" == e.substring(e.length - 6, e.length) && (e = e.slice(0, -6)), "enqueueing" == e.substring(0, 10) ? (e = e.substring(11), e = e.replace(/"/g, ""), $("#gCodeLog").append('<p class="text-primary">' + e + ' <span class="text-muted">;</span></p>')) : $("#gCodeLog").append('<p class="text-warning">' + e + "</p>"), scrollConsole()
    }
}

function sendCmd(e, t, n) {
    void 0 === n && (n = "code"), $("#gCodeLog").append('<p class="text-primary">' + e + ' <span class="text-muted">; ' + t + "</span></p>"), $.ajax({
        url: "set?" + n + "=" + e,
        cache: !1
    }).done(), scrollConsole()
}

function initWebSocket() {
    url = window.location.hostname;
    try {
        ws = new WebSocket("ws://" + url + ":81"), feedback("Connecting..."), ws.onopen = function(e) {
            feedback("Connection established."), connected = !0
        }, ws.onmessage = function(e) {
            feedback(e.data)
        }, ws.onclose = function() {
            feedback("Disconnected"), connected = !1
        }
    } catch (e) {
        feedback("Web Socket Error")
    }
}

function msToTime(e) {
    var t = parseInt(e % 1e3 / 100),
        n = parseInt(e / 1e3 % 60),
        i = parseInt(e / 6e4 % 60),
        s = parseInt(e / 36e5 % 24);
    return s = s < 10 ? "0" + s : s, i = i < 10 ? "0" + i : i, n = n < 10 ? "0" + n : n, s + ":" + i + ":" + n + "." + t
}

function start_p() {
    $("#stat").text("Printing"), sendCmd("M565", "Start printing cache.gc")
}

function cancel_p() {
    $("#stat").text("Canceling"), sendCmd("{P:X}", "Cancel print", "cmd")
}
function change_src() {
	webcamURL = document.getElementById('url').value
	if (webcamURL == '') { return; }
	$("#myImage").attr("src", webcamURL).load(function(){
    		alert('New image loaded!');
	});
}
function printerStatus() {
    $.get("inquiry", function(e, t) {
        $("#rde").text(e.match(/\d+/g)[0]), $("#rdp").text(e.match(/\d+/g)[2]), delaySyncTemperatures(e.match(/\d+/g)[1], e.match(/\d+/g)[3]);
        var n = e.charAt(e.length - 1);
        "I" == n ? ($("#stat").text("Idle"), $("#pgs").css("width", "0%"), $("#start_print").removeClass("btn-disable"), $(".movement button").removeClass("btn-disable"), $("#gCodeSend").removeClass("btn-disable"), 0 == connected && initWebSocket()) : "P" == n ? ($("#stat").text("Printing"), $("#pgs").css("width", e.match(/\d+/g)[4] + "%"), $("#pgs").html(e.match(/\d+/g)[4] + "% Complete"), $("#start_print").addClass("btn-disable"), $(".movement button").addClass("btn-disable"), $("#gCodeSend").addClass("btn-disable"), setPositioning = !1) : $("#stat").text("N/A")
    })
}

function delaySendTemp(e, t) {
    clearTimeout(timers), timers = setTimeout(function() {
        compValue = pad(e, 3), "extruder" == t && sendCmd("{C:T0" + compValue + "}", "Set extruder preheat to " + e + "°C", "cmd"), "platform" == t && sendCmd("{C:P" + compValue + "}", "Set platform preheat to " + e + "°C", "cmd")
    }, 250)
}

function delaySendSpeed(e) {
    clearTimeout(timers), timers = setTimeout(function() {
        actualSpeed = Math.floor(e / 100 * 255), sendCmd("M106 S" + actualSpeed, "Set fan speed to " + e + "%")
    }, 250)
}

function delaySyncTemperatures(e, t) {
    clearTimeout(timers), timers = setTimeout(function() {
        $("#wre").is(":focus") || $("#wre").val(e), $("#wrp").is(":focus") || $("#wrp").val(t)
    }, 3e3)
}

function refreshSD() {
    0 == initSDCard && (sendCmd("M21", "Initialize SD card"), initSDCard = !0), sendCmd("M20", "List SD card files"), window.sdFilenames = [], $(".sd-files ul").html("")
}

function printFile(e) {
    sendCmd("M23 " + e, "Select file"), setTimeout(function() {
        sendCmd("M24", "Print file")
    }, 1e3), $("#stat").text("Printing"), $("#pgs").css("width", "0%"), $("#pgs").html("0% Complete"), $("#start_print").addClass("btn-disable"), $(".movement button").addClass("btn-disable"), $("#gCodeSend").addClass("btn-disable")
}

function deleteFile(e) {
    sendCmd("M30 " + $(e).parent().text(), "Delete file"), $(e).parent().fadeOut("slow", function() {
        $(this).remove()
    })
}

function buildFilnames(e) {
    filenames = e.split(/\n/g), filenames.forEach(function(e) {
        e.match(/.gc/gi) && "Now fresh file:" != e.substring(0, 15) && "File opened:" != e.substring(0, 12) && window.sdFilenames.push(e)
    }), window.sdFilenames.sort(), e.match(/End file list/g) && sdFilenames.forEach(function(e) {
        itemHTML = "<li>", itemHTML += '<span class="glyphicon glyphicon-print" aria-hidden="true" onclick="printFile(\'' + e + "')\"></span>", itemHTML += '<span class="glyphicon glyphicon-trash" aria-hidden="true" onclick="deleteFile(this)"></span>' + e, itemHTML += "</li>", $(".sd-files ul").append(itemHTML)
    })
}
$(document).ready(function() {
    printerStatus(), setTimeout(function() {
        startup()
    }, 2e3), setInterval(function() {
        0 == uploading && printerStatus()
    }, 2e3), $(".sd-files .refresh").click(function() {
        $("#start_print").hasClass("btn-disable") || refreshSD()
    }), $(".movement .home").click(function() {
        sendCmd("G28", "Home Hotend"), setPositioning = !1
    }), $(".movement .level").click(function() {
        axis = $(this).attr("data-axis"), code = "G29 " + axis, sendCmd(code, "Leveling"), setPositioning = !1
    }), $(".movement .direction button").click(function() {
        command = "G1 ", movement = $(this).attr("data-movement"), distance = $(".movement .rate button.active").attr("data-rate"), axis = $(this).attr("data-axis"), comment = "Move " + axis + " " + distance + "mm", 0 == setPositioning && (sendCmd("G91", "Set to Relative Positioning"), setPositioning = !0), "up" != movement && "left" != movement || (distance *= -1), "Z" == axis && "down" == movement && (comment = "Raise Z " + distance + "mm"), "Z" == axis && "up" == movement && (comment = "Lower Z " + distance + "mm"), "E" == axis && "plus" == movement && (comment = "Extrude " + distance + "mm", distance += " F180"), "E" != axis || "minus" != movement ? "disable" != movement ? sendCmd(command + axis + distance, comment) : sendCmd("M18", "Disable motor lock") : sendCmd(command + axis + "-" + distance, "Retract " + distance + "mm")
    }), $(".movement .rate button").click(function() {
        $(".movement .rate button").removeClass("active"), $(this).addClass("active")
    }), $("#gCodeSend").click(function() {
        gCode2Send = $("#gcode").val(), "" != gCode2Send && (sendCmd(gCode2Send, ""), $("#gcode").val(""))
    }), $("#wre").change(function() {
        delaySendTemp($("#wre").val(), "extruder")
    }), $("#sete").click(function() {
        delaySendTemp($("#wre").val(), "extruder")
    }), $("#clre").click(function() {
        sendCmd("{C:T0000}", "Turn off extruder preheat", "cmd")
    }), $("#wrp").change(function() {
        delaySendTemp($("#wrp").val(), "platform")
    }), $("#setp").click(function() {
        delaySendTemp($("#wrp").val(), "platform")
    }), $("#clrp").click(function() {
        sendCmd("{C:P000}", "Turn off platform preheat", "cmd")
    }), $("#fanspeed").slider({
        min: 30,
        max: 100,
        value: 50,
        reversed: !0,
        orientation: "vertical",
        formatter: function(e) {
            return e + "%"
        }
    }), $("#fanspeed").on("slide", function(e) {
        delaySendSpeed(e.value)
    }), $("#clrfan").click(function() {
        sendCmd("M106 S0", "Turn off fan")
    }), $("form").submit(function() {
        return !1
    })
});
var timers = {},
    setPositioning = !1,
    initSDCard = !1,
    sdListing = !1,
    connected = !1,
    uploading = !1;
String.prototype.contains = function(e) {
    return -1 != this.indexOf(e)
}, Dropzone.options.mydz = {
    accept: function(e, t) {
        e.name.contains(".gc") ? (t(), $(".print-actions button").addClass("btn-disable"), $(".movement button").addClass("btn-disable"), $("#gCodeSend").addClass("btn-disable"), $(".temperature button").addClass("btn-disable"), uploading = !0) : t("Not a valid G-code file.")
    },
    init: function() {
        this.on("error", function(e, t) {
            var n = t.errorMessage;
            $(e.previewElement).find(".dz-error-message").text(n)
        }), this.on("addedfile", function() {
            null != this.files[1] && this.removeFile(this.files[0])
        }), this.on("complete", function(e) {
            uploading = !1, $(".print-actions button").removeClass("btn-disable"), $(".movement button").removeClass("btn-disable"), $("#gCodeSend").removeClass("btn-disable"), $(".temperature button").removeClass("btn-disable"), fileParts = e.name.split("."), name = fileParts[0].substring(0, 21), null == window.sdFilenames && refreshSD(), window.sdFilenames.indexOf(e.name) && sendCmd("M30 " + name + ".gc", "Delete old file"), setTimeout(function() {
                sendCmd("M566 " + name + ".gc", "")
            }, 1e3), setTimeout(function() {
                refreshSD()
            }, 1500)
        })
    }
};
