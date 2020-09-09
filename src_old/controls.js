function OverlayCtrl($scope) {
	$scope.test = 3;
}

var settingsHidden = false;

function initControls() {
	validateInput();
	updateHUDColors();
	
	// set textbox ranges
	document.getElementById("horizontal-grid-resolution-control-block").children[1].value = gridX.toString();
	document.getElementById("vertical-grid-resolution-control-block").children[1].value = gridY.toString();
	
	// set slider ranges
	var HUDTransparencyRange = document.getElementById("HUDTransparencyRange");
	HUDTransparencyRange.value = HUDTransparency * HUDTransparencyRange.getAttribute("max");
	
	var mozaicMinDotAngleRange = document.getElementById("mozaicMinDotAngleRange");
	var mozaicMinDotAngleControlDiff = mozaicMinDotAngleControlMax - mozaicMinDotAngleControlMin;
	var myRangeElementValue = (mozaicMinDotAngle - mozaicMinDotAngleControlMin) / mozaicMinDotAngleControlDiff;
	mozaicMinDotAngleRange.value = myRangeElementValue * mozaicMinDotAngleRange.getAttribute("max");
	
	// set checkboxes
	document.getElementById("mozaicController").checked = mozaicEnabled;
	document.getElementById("useMouseController").checked = useMouseEnabled;
	document.getElementById("transparentHUDController").checked = transparentHUD;

	// set color pickers
	document.getElementById("color-block-corner-TL").value = "#" +
		parseInt(mozaicTopLeftColor[0] * 255).toString(16).padStart(2, "0") +
		parseInt(mozaicTopLeftColor[1] * 255).toString(16).padStart(2, "0") +
		parseInt(mozaicTopLeftColor[2] * 255).toString(16).padStart(2, "0");
	document.getElementById("color-block-corner-TR").value = "#" +
		parseInt(mozaicTopRightColor[0] * 255).toString(16).padStart(2, "0") +
		parseInt(mozaicTopRightColor[1] * 255).toString(16).padStart(2, "0") +
		parseInt(mozaicTopRightColor[2] * 255).toString(16).padStart(2, "0");
	document.getElementById("color-block-corner-BL").value = "#" +
		parseInt(mozaicBottomLeftColor[0] * 255).toString(16).padStart(2, "0") +
		parseInt(mozaicBottomLeftColor[1] * 255).toString(16).padStart(2, "0") +
		parseInt(mozaicBottomLeftColor[2] * 255).toString(16).padStart(2, "0");
	document.getElementById("color-block-corner-BR").value = "#" +
		parseInt(mozaicBottomRightColor[0] * 255).toString(16).padStart(2, "0") +
		parseInt(mozaicBottomRightColor[1] * 255).toString(16).padStart(2, "0") +
		parseInt(mozaicBottomRightColor[2] * 255).toString(16).padStart(2, "0");
}

function validateInput() {
	if (mozaicMinDotAngle < mozaicMinDotAngleControlMin) {
		mozaicMinDotAngle = mozaicMinDotAngleControlMin;
		console.warn("Dev note, mozaicMinDotAngle is outside control min/max values. Clamping.");
	}
	if (mozaicMinDotAngle > mozaicMinDotAngleControlMax) {
		mozaicMinDotAngle = mozaicMinDotAngleControlMax;
		console.warn("Dev note, mozaicMinDotAngle is outside control min/max values. Clamping.");
	}
}

function toggleOverlay() {
	settingsHidden = !settingsHidden;
	var overlays = document.getElementsByClassName("overlay");
	var toggleOverlay = document.getElementById("toggle-overlay");
	var toggle = document.getElementById("toggle");
	
	if (settingsHidden) {
		for (var i = 0; i < overlays.length; i++) {
			overlays[i].style.display = "none";
		}
		// ensure the toggle overlay is visible to allow options to be re-set
		toggleOverlay.style.display = "flex";
		toggle.value = "SHOW";
	} else {
		for (var i = 0; i < overlays.length; i++) {
			overlays[i].style.display = "flex";
		}
		toggle.value = "HIDE";
	}
	
	updateHUDColors();
}

// caller is a button input
function stepMozaicResolution(caller, dimension, step) {
	switch(dimension) {
		case 0:
			gridX += step;
			gridX = gridX < 1 ? 1 : gridX;
			caller.parentNode.children[1].value = gridX.toString();
			break;
		case 1:
			gridY += step;
			gridY = gridY < 1 ? 1 : gridY;
			caller.parentNode.children[1].value = gridY.toString();
			break;
	}
	updateMozaicData();
	updateBufferData();
}

function changeMozaicResolution(caller, dimension) {
	var resolution = parseInt(caller.value);
	if (resolution < 1) {
		resolution = 1;
		caller.value = "1";
	}
	switch(dimension) {
		case 0:
			gridX = resolution;
			break;
		case 1:
			gridY = resolution;
			break;
	}
	updateMozaicData();
	updateBufferData();
}

// caller is a color picker input
function onColorPicked(caller, id) {
	var c = hexStringToColor(caller.value);
	switch(id) {
		case 1:
			mozaicTopLeftColor = c;
			break;
		case 2:
			mozaicTopRightColor = c;
			break;
		case 3:
			mozaicBottomLeftColor = c;
			break;
		case 4:
			mozaicBottomRightColor = c;
			break;
	}
}

function mozaicChanged() {
	mozaicEnabled = document.getElementById("mozaicController").checked;
	updateBufferData();
}

function useMouseChanged() {
	useMouseEnabled = document.getElementById("useMouseController").checked;
}

function transparentHUDChanged() {
	transparentHUD = document.getElementById("transparentHUDController").checked;
	updateHUDColors();
}

function updateHUDColors() {
	var toggleOverlay = document.getElementById("toggle-overlay");
	var overlays = document.getElementsByClassName("overlay");
	var red = HUDBackgroundColor[0];
	var green = HUDBackgroundColor[1];
	var blue = HUDBackgroundColor[2];
	var alpha = transparentHUD ? HUDTransparency : 1.0;
	var colorString = colorToHexString(red, green, blue, alpha);
	for (var i = 0; i < overlays.length; i++) { overlays[i].style.backgroundColor = colorString; }
	if (settingsHidden) {
		toggleOverlay.style.backgroundColor = "#00000000";
	} else {
		toggleOverlay.style.backgroundColor = colorToHexString(red, green, blue, alpha);
	}
}

function colorToHexString(red, green, blue, alpha) {
	var rHex = parseInt(red * 255).toString(16).padStart(2, "0");
	var gHex = parseInt(green * 255).toString(16).padStart(2, "0");
	var bHex = parseInt(blue * 255).toString(16).padStart(2, "0");
	var aHex = parseInt(alpha * 255).toString(16).padStart(2, "0");
	return "#" + rHex + gHex + bHex + aHex;
}

// accounts for a leading # in front of the color string
function hexStringToColor(hexColorString) {
	return [parseInt(hexColorString.substring(1, 3), 16) / 255.0,
			parseInt(hexColorString.substring(3, 5), 16) / 255.0,
			parseInt(hexColorString.substring(5, 7), 16) / 255.0]
}

// caller is a slider input
function sliderChanged(caller, id) {
	var elementFrac =  caller.value / (caller.getAttribute("max") - caller.getAttribute("min"));
	switch(id) {
		case 1:
			HUDTransparency = elementFrac;
			updateHUDColors();
			break;
		case 2:
			mozaicMinDotAngle = mozaicMinDotAngleControlMin + (mozaicMinDotAngleControlMax - mozaicMinDotAngleControlMin) * elementFrac;
			break;
	}
}