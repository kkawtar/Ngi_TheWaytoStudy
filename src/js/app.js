
function getColor(scroll){
    var rgbInitial = [0x0,0xFF,0x0];
    var rgbFinal = [0xFF,0x0,0x0];
    var rgbCurrent = [];
    for(var i=0;i<3;i++){
        rgbCurrent[i] = Math.round(rgbInitial[i]-(rgbInitial[i]-rgbFinal[i])*scroll); 
        if(rgbFinal[i]<rgbInitial[i]&&rgbCurrent[i]<rgbFinal[i]){
            rgbCurrent[i] = rgbFinal[i];
        }else if(rgbFinal[i]>rgbInitial[i]&&rgbCurrent[i]>rgbFinal[i]){
            rgbCurrent[i] = rgbFinal[i];
        }
    }
    return "#" + componentToHex(rgbCurrent[0]) + componentToHex(rgbCurrent[1]) + componentToHex(rgbCurrent[2]);
}
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

var currentLoc = {
    lat: 42.340473,
    lng: -83.062516
};
var heatMapData;
var heatmap;
var map;

function initMap() {
    heatMapData = new google.maps.MVCArray();
    // Create a map object and specify the DOM element for display.
    map = new google.maps.Map(document.getElementById("map"), {
        center: currentLoc,
        zoom: 16
    });
    gm.info.watchPosition(processPosition, true);
    // Create a marker and set its position.
    marker = new google.maps.Marker({
        map: map,
        position: currentLoc
    });
    heatmap = new google.maps.visualization.HeatmapLayer({
        data: heatMapData,
        options: {maxIntensity: 10.0}
    });
    heatmap.setMap(map);
    //optional: inits read data and heat map stuff 
    processPosition({
        coords: {
            latitude: 34.04375, 
            longitude: -4.988575
        }
    });
}

function changeBar(sketch_ratio) {
    var c = document.getElementById("sketch_bar");
    var ctx = c.getContext("2d");

    ctx.beginPath();
    ctx.rect(0, 0, c.width, c.height);
    ctx.fillStyle = getColor(sketch_ratio);
    ctx.fill();

    ctx.beginPath();
    ctx.rect(0, 0, c.width, c.height * (1 - sketch_ratio));
    ctx.fillStyle = "white";
    ctx.fill();
}

function withinMapBounds(pt1) {
    var lon1 = pt1[0];
    var lat1 = pt1[1];
    if (map.getBounds().contains(new google.maps.LatLng(lat1, lon1))) {
        return true;
    } else {
        return false;
    }
}
var currentLocationSketch; //actually just the current sketch ratio

function updateSafetyState(sketch_factor, current_location) {
    var sketch_max = 100;
    var sketch_ratio = sketch_factor / sketch_max;
    currentLocationSketch = sketch_ratio;
    processData();
    changeBar(sketch_ratio);
}


function processPosition(position) {
    var lat = position.coords.latitude;
    //console.log(lat);
    var lng = position.coords.longitude;
    //console.log(lng);

    currentLoc.lat = lat;
    currentLoc.lng = lng;

    marker.setPosition(new google.maps.LatLng(lat, lng));
    map.panTo(new google.maps.LatLng(lat, lng));

    var flipped = [lng, lat];

    badness_at_point(flipped, updateSafetyState);
}


// MONITORING CODE

var vdata = gm.info.watchVehicleData(
	function(data){ //success
        // Setting variables
        //EV_max_range = data.EV_max_range;
        if(data.fuel_level != null){
            fuel_level = data.fuel_level;
        }
        if(data.tire_right_front_pressure != null){
            tire_right_front_pressure = data.tire_right_front_pressure;

        }
        if(data.tire_left_front_pressure != null){
            tire_left_front_pressure = data.tire_left_front_pressure;
        }
        if(data.tire_right_rear_pressure != null){
            tire_right_rear_pressure = data.tire_right_rear_pressure;
        }
        if(data.tire_left_rear_pressure != null){
            tire_left_rear_pressure = data.tire_left_rear_pressure;
        }
        if(data.bulb_center_fail != null){
            bulb_center_fail = data.bulb_center_fail;
        }
        if(data.bulb_frontright_turn_fail != null){
            bulb_frontright_turn_fail =  data.bulb_frontright_turn_fail;
        }
        if(data.bulb_frontleft_turn_fail != null){
            bulb_frontleft_turn_fail = data.bulb_frontleft_turn_fail;
        }
        processData();
    },
	function(){},
	// Fuel
	['EV_max_range',
	'fuel_level',
	// Tire Pressure
	'tire_right_front_pressure',
	'tire_left_front_pressure',
	'tire_right_rear_pressure',
	'tire_left_rear_pressure',
	// Lights
	'bulb_center_fail',
	'bulb_frontright_turn_fail',
	'bulb_frontleft_turn_fail'],
	1000);

//var EV_max_range;
var fuel_level;
var tire_right_front_pressure;
var tire_left_front_pressure;
var tire_right_rear_pressure;
var tire_left_rear_pressure;
var bulb_center_fail;
var bulb_frontright_turn_fail;
var bulb_frontleft_turn_fail;


function processData() {
	//console.log(EV_max_range);
	// Fuel
    var sketchThreshold = 0.5;
	if (fuel_level < 10) {
		var element = document.getElementById('alertBoxFuel');
		element.style.opacity = "1";
        if(currentLocationSketch > sketchThreshold){
            element.innerHTML = "Fuel low, wait to refill";
        }else{
           element.innerHTML = "Fuel low, refill soon";
        }
	} else {
		var element = document.getElementById('alertBoxFuel');
		element.style.opacity = "0";
	};

    //console.log(tire_right_front_pressure);
	// Tires
	if (tire_right_front_pressure < 138 || tire_left_front_pressure < 138 || tire_right_rear_pressure < 138 || tire_left_rear_pressure < 138) { // kPaG
		var element = document.getElementById('alertBoxTires');
		element.style.opacity = "1";
        if(currentLocationSketch > sketchThreshold){
            element.innerHTML = "Tire P. Low, wait to refill";
        }else{
           element.innerHTML = "Tire P. Low, refill soon";
        }
	} else {
		var element = document.getElementById('alertBoxTires');
		element.style.opacity = "0";
	};

	//console.log(bulb_center_fail);
	// Lights
	if (bulb_center_fail == 1 || bulb_frontright_turn_fail == 1 || bulb_frontleft_turn_fail == 1) { // 1/0
		var element = document.getElementById('alertBoxLights');
		element.style.opacity = "1";
        if(currentLocationSketch > sketchThreshold){
            element.innerHTML = "Burnt out light, don't stop yet";
        }else{
           element.innerHTML = "Burnt out light, replace soon";
        }
	} else {
		var element = document.getElementById('alertBoxLights');
		element.style.opacity = "0";
	};
}

// GO BACK TO THE MASONIC TEMPLE THEATRE


var i = 0;
var interval1;
var interval;
function fsdm() {
        interval1 = setInterval(buttonAction, 500);
}

// DEMO JOURNEY CODE

function fst() {
    interval = setInterval(buttonActionfst, 500);
}
function medcine() {
    interval = setInterval(buttonActionmedcine, 500);
}

function buttonAction() {
    processPosition({
        coords: {
            latitude: lat_arr[i],
            longitude: lng_arr[i]
        }
    });
    i++;
    if (i >= lat_arr.length) {
        clearInterval(interval);
    }
}
function buttonActionmedcine() {
    processPosition({
        coords: {
            latitude: Latmedcine[i],
            longitude: Longmedcine[i]
        }
    });
    i++;
    if (i >= lat.length) {
        clearInterval(interval1);
    }
}
function buttonActionfst() {
    processPosition({
        coords: {
            latitude: latfst[i],
            longitude: Longfst[i]
        }
    });
    i++;
    if (i >= lat.length) {
        clearInterval(interval1);
    }
}

// Coordinates for points that map the demo journey
var lat_arr = [34.04375, 34.043799, 34.04385, 34.043906, 34.043988, 34.04391, 34.043712, 34.043637, 34.043566, 34.043444, 34.043268, 34.043057, 34.042879, 34.042768, 34.042703, 34.042779, 34.042619, 34.042428, 34.042234, 34.042032, 34.041779, 34.041537, 34.041352, 34.041174, 34.040908, 34.040516, 34.040001, 34.039396, 34.038829, 34.038123, 34.037567, 34.03708, 34.036573, 34.035996, 34.035475, 34.035051, 34.034642, 34.034526, 34.034324, 34.034166, 34.033946, 34.033782, 34.033422, 34.033115, 34.032886, 34.033219, 34.033639];
var lng_arr = [-4.988575, -4.988468, -4.988331, -4.988146, -4.987912, -4.987853, -4.987765, -4.987679, -4.987601, -4.987526, -4.987489, -4.987381, -4.987234, -4.987025, -4.98667, -4.986341, -4.986214, -4.986153, -4.986056, -4.985962, -4.985839, -4.9857, -4.985606, -4.985525, -4.985404, -4.985203, -4.984943, -4.984624, -4.98434, -4.983975, -4.983723, -4.983438, -4.98321, -4.982934, -4.98265, -4.982435, -4.982213, -4.981961, -4.98158, -4.981293, -4.980831, -4.980509, -4.979871, -4.979321, -4.978841, -4.978348, -4.978004];
var Latmedcine=[34.042172, 34.040590, 34.040128, 34.038332, 34.036490, 34.033769, 34.032142 ,34.028587 ,34.028587, 34.026097,34.021171,34.015498, 34.011745,34.005217,34.003027,34.004593,34.006238,34.007786];
var Longmedcine=[-4.988898 , -4.988126, -4.989692, -4.988962, -4.989901, -4.990523, -4.987723, -4.991795, -4.991795, -4.990658, -4.987761, -4.983619, -4.980830, -4.975852, -4.974108, -4.970300, -4.967059, -4.963841];
latfst=[34.043638, 34.043364, 34.043168, 34.042546, 34.042119, 34.040981 ,34.040554, 34.040110, 34.039754, 34.039399, 34.039221, 34.038296, 34.037798, 34.036874, 34.035291, 34.033442,  34.031681, 34.029796, 34.026329, 34.021669,34.016778, 34.011745, 34.007102, 34.002371,33.999275  ]
Longfst=[-4.988818,-4.988919, -4.988834, -4.988512, -4.988362, -4.987825, -4.988297, -4.989735, -4.991087, -4.992589, -4.993254, -4.995314, -4.997803, -4.997782, -4.997503, -4.997309, -4.997610, -4.998296, -4.997889, -4.996580, -4.996344, -4.996644, -4.994177, -4.990550, -4.990143   ]

