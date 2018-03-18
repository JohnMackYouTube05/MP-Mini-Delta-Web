/*
Name: MP Mini Delta Web Javascript
URL: https://github.com/nokemono42/MP-Mini-Delta-Web
*/

$(document).ready(function() {
	printerStatus();
	initWebSocket();

	// setTimeout(function() {
	// 	startup();
	// }, 2000);

	setInterval(function() {
		printerStatus();
	}, 2000);

	// $(".webcam .img-rounded").click(function() {
	// 	window.sdFilenames.sort();
	// 	console.log(window.sdFilenames);
	// });

	$(".sd-files .refresh").click(function() {
		if ($("#start_print").hasClass('btn-disable')) {
			return;
		} else {
			refreshSD();
		}
	});

	$(".movement .home").click(function() {
		sendCmd('G28', 'Home Hotend');
		setPositioning = false;
	});

	$(".movement .level").click(function() {
		axis = $(this).attr("data-axis");

		code = 'G29 ' + axis;

		sendCmd(code, 'Leveling');
		setPositioning = false;
	});

	$(".movement .direction button").click(function() {
		command = 'G1 ';
		movement = $(this).attr("data-movement");
		rate = $(".movement .rate button.active").attr("data-rate");
		axis = $(this).attr("data-axis");
		comment = 'Move ' + axis;

		if (setPositioning == false) {
			sendCmd('G91', 'Set to Relative Positioning');
			setPositioning = true;
		}

		if (movement == 'up' || movement == 'left') { rate = rate * -1; }
		if (axis == 'Z' && movement == 'down') { comment = 'Raise Z '; }
		if (axis == 'Z' && movement == 'up') { comment = 'Lower Z '; }
		if (axis == 'E' && movement == 'plus') { comment = 'Extrude '; }
		if (axis == 'E' && movement == 'minus') {
			sendCmd(command + axis + '-' + rate, 'Retract ' + rate + 'mm');
			return;
		}
		if (movement == 'disable') {
			sendCmd('M18', 'Disable motor lock');
			return;
		}

		sendCmd(command + axis + rate, comment + ' ' + rate + 'mm');
	});

	$(".movement .rate button").click(function() {
		rate = $(this).attr("data-rate");
		$(".movement .rate button").removeClass('active');
		$(this).addClass('active');
	});

	$('#gCodeSend').click(function() {
		gCode2Send = $('#gcode').val();
		if (gCode2Send == '') { return; }

		sendCmd(gCode2Send, '');
		$('#gcode').val('');
	});

	$("#wre").change(function() {
		delaySendTemp($("#wre").val(), 'extruder');
	});

	$("#sete").click(function() {
		delaySendTemp($("#wre").val(), 'extruder');
	});

	$("#clre").click(function() {
		sendCmd('{C:T0000}', 'Turn off extruder preheat', 'cmd');
	});

	$("#wrp").change(function() {
		delaySendTemp($("#wrp").val(), 'platform');
	});

	$("#setp").click(function() {
		delaySendTemp($("#wrp").val(), 'platform');
	});

	$("#clrp").click(function() {
		sendCmd('{C:P000}', 'Turn off platform preheat', 'cmd');
	});

	$("#fanspeed").slider({
		min: 30, max: 100, value: 50,
		reversed : true, orientation: 'vertical',
		formatter: function(value) {
			return value + '%';
		}
	});

	$("#fanspeed").on('slide', function(slideEvt) {
		delaySendSpeed(slideEvt.value);
	});

	$("#clrfan").click(function() {
		sendCmd('M106 S0', 'Turn off fan');
	});

	$("form").submit(function() {
		return false;
	});
});

var timers = {};
var setPositioning = false;
var initSDCard = false;
var sdListing = false;

function pad(num, size) {
	s = '000' + num;
	return s.substr(s.length-size);
}

function scrollConsole() {
	$cont = $("#console");
	$cont[0].scrollTop = $cont[0].scrollHeight;
}

function feedback(output) {
	if (output.substring(0, 5) == 'Begin' || sdListing == true) {
		sdListing = true;
		
		if (output.match(/End file list/g)) {
			sdListing = false;
		}

		buildFilnames(output);
		return;
	}

	output = output.replace(/\n/g, '<br />');

	if (output.substring(0, 2) == 'T:') {
		//Hide temperature reporting
		return;
	}

	if (output.substring(0, 5) == 'ok N0') {
		output = 'ok';
	}

	output = output.replace(/N0 P15 B13/g, '');
	output = output.replace(/N0 P15 B15/g, '');

	output = output.replace(/echo:/g, '');

	$("#gCodeLog").append('<p class="text-warning">' + output + '</p>');

	scrollConsole();
}

function sendCmd(code, comment, type) {
	if (type === undefined) { type = "code"; }
	
	$("#gCodeLog").append('<p class="text-primary">' + code + ' <span class="text-muted">; ' + comment + '</span></p>');

	$.ajax({ url: 'set?' + type + '=' + code, cache: false }).done();
	//ws.send(code);

	scrollConsole();
}

function initWebSocket() {
	url = window.location.hostname;

	try {
		ws = new WebSocket('ws://' + url + ':81');
		ws.onopen = function() {
			feedback('Connecting...');
		};
		ws.onmessage = function(a) {
			//console.log(a);
			feedback(a.data);
		};
		ws.onclose = function() {
			feedback('Disconnected');
		}
	} catch (a) {
		feedback('Web Socket Error');
	}
}

function msToTime(duration) {
	var milliseconds = parseInt((duration%1000)/100),
		seconds = parseInt((duration/1000)%60),
		minutes = parseInt((duration/(1000*60))%60),
		hours = parseInt((duration/(1000*60*60))%24);

	hours = (hours < 10) ? "0" + hours : hours;
	minutes = (minutes < 10) ? "0" + minutes : minutes;
	seconds = (seconds < 10) ? "0" + seconds : seconds;

	return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}

String.prototype.contains = function(it) {
	return this.indexOf(it) != -1;
};

Dropzone.options.mydz = {
	accept: function(file, done) {
		if (file.name.contains('.g')) {
			//window.startTimer = new Date();

			done();
			$(".print-actions button").addClass('btn-disable');
			$(".movement button").addClass('btn-disable');
			$("#gCodeSend").addClass('btn-disable');
			$(".temperature button").addClass('btn-disable');
		} else {
			done('Not a valid G-code file.');
		}
	}, init: function() {
		this.on('error', function(file, response) {
			var errorMessage = response.errorMessage;
			$(file.previewElement).find('.dz-error-message').text(errorMessage);
		});

		this.on('addedfile', function() {
			if (this.files[1] != null) {
				this.removeFile(this.files[0]);
			}
		});

		this.on('complete', function(file) {
			//File upload duration
			//endTimer = new Date();
			//duration = endTimer - window.startTimer;
			//alert(msToTime(duration));

			$(".print-actions button").removeClass('btn-disable');
			$(".movement button").removeClass('btn-disable');
			$("#gCodeSend").removeClass('btn-disable');
			$(".temperature button").removeClass('btn-disable');

			//New filename of 21 characters + .gc
			fileParts = file.name.split('.');
			name = fileParts[0].substring(0, 21);

			if (window.sdFilenames == undefined) {
				refreshSD();
			}

			if (window.sdFilenames.indexOf(file.name)) {
				sendCmd('M30 ' + name + '.gc', 'Delete old file');
			}

			setTimeout(function() {
				sendCmd('M566 ' + name + '.gc', '');
				refreshSD();
			}, 1000);
		});
	}
};

function start_p() {
	$("#stat").text('Printing');
	sendCmd('M565', 'Start printing cache.gc');
}

function cancel_p() {
	$("#stat").text('Canceling');
	sendCmd('{P:X}', 'Cancel print', 'cmd');
}

function printerStatus() {
	$.get("inquiry", function(data, status) {
		//console.log(data);
		//$("#gCodeLog").append('<p class="text-muted">' + data + '</p>');
		//scrollConsole();

		$("#rde").text(data.match( /\d+/g )[0]);
		$("#rdp").text(data.match( /\d+/g )[2]);

		delaySyncTemperatures(data.match( /\d+/g )[1], data.match( /\d+/g )[3]);

		var c = data.charAt(data.length - 1);

		if (c == 'I') {
			$("#stat").text('Idle');
			$("#pgs").css('width', '0%');
			$("#start_print").removeClass('btn-disable');
			$(".movement button").removeClass('btn-disable');
			$("#gCodeSend").removeClass('btn-disable');
		} else if (c == 'P') {
			$("#stat").text('Printing');
			$("#pgs").css('width', data.match(/\d+/g )[4] + '%');
			$("#pgs").html(data.match(/\d+/g )[4] + '% Complete');
			$("#start_print").addClass('btn-disable');
			$(".movement button").addClass('btn-disable');
			$("#gCodeSend").addClass('btn-disable');
		} else {
			$("#stat").text('N/A');
		}
	});
}

function startup() {
	if ($("#stat").text() != 'Printing') {
		sendCmd('M563 S4', 'Enable faster Wi-Fi file uploads');
	}
}

function delaySendTemp(value, device) {
	clearTimeout(timers);
	timers = setTimeout(function() {
		compValue = pad(value, 3);

		if (device == 'extruder') {
			sendCmd('{C:T0' + compValue + '}', 'Set extruder preheat to ' + value + '°C', 'cmd');
		}

		if (device == 'platform') {
			sendCmd('{C:P' + compValue + '}', 'Set platform preheat to ' + value + '°C', 'cmd');
		}
	}, 250);
}

function delaySendSpeed(value) {
	clearTimeout(timers);
	timers = setTimeout(function() {
		actualSpeed = Math.floor(255 * (value/100));
		sendCmd('M106 S' + actualSpeed, 'Set fan speed to ' + value + '%');
	}, 250);
}

function delaySyncTemperatures(extruder, platform) {
	clearTimeout( timers );
	timers = setTimeout(function() {
		if (!$('#wre').is(":focus")) { $("#wre").val(extruder); }
		if (!$('#wrp').is(":focus")) { $("#wrp").val(platform); }
	}, 3000);
}

function refreshSD() {
	if (initSDCard == false) {
		sendCmd('M21', 'Initialize SD card');
		initSDCard = true;
	}
	sendCmd('M20', 'List SD card files');
	window.sdFilenames = [];
	$(".sd-files ul").html('');
}

function printFile(filename) {
	sendCmd('M23 ' + filename, 'Select file');
	setTimeout(function() {
		sendCmd('M24', 'Print file');
	}, 1000);
	$("#stat").text('Printing');
	$("#pgs").css('width', '0%');
	$("#pgs").html('0% Complete');
	$("#start_print").addClass('btn-disable');
	$(".movement button").addClass('btn-disable');
	$("#gCodeSend").addClass('btn-disable');
}

function deleteFile(filename) {
	sendCmd('M30 ' + filename, 'Delete file');
	refreshSD();
}

function buildFilnames(output) {
	filenames = output.split(/\n/g);

	filenames.forEach(function(name) {
		if (name.match(/.gc/gi)) {
			if (!(name.substring(0, 15) == 'Now fresh file:' || name.substring(0, 12) == 'File opened:')) {
				itemHTML = '<li>';
				itemHTML += '<span class="glyphicon glyphicon-print" aria-hidden="true" onclick="printFile(\'' + name + '\')"></span>';
				itemHTML += '<span class="glyphicon glyphicon-trash" aria-hidden="true" onclick="deleteFile(\'' + name + '\')"></span>' + name;
				itemHTML += '</li>';

				$('.sd-files ul').append(itemHTML);
				window.sdFilenames.push(name);
			}
		}
	});
}
