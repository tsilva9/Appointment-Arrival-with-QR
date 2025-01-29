// version and configuration letants
let version = "--";

// Branch and unit configuration
let branchId = -1;
let browserOpera = navigator.userAgent.toLowerCase().indexOf('opera') > -1;
let barcodeId;
let idField = "";
let tempIdField = "";
let inputIdField = "";
let dateOfBirthInputType = "";
let dateOfBirthInputFormat = "";
let unitId = -1;

// Time window configuration
let DEFAULT_MINUTES_EARLY = 15;
let DEFAULT_MINUTES_LATE = 0;
let minutesEarly = DEFAULT_MINUTES_EARLY;
let minutesLate = DEFAULT_MINUTES_LATE;

// Page and element IDs
let arrivedPage = "";
let addBtnId = "";
let inputId = "";
let messageId = "";
let dayId = "";
let monthId = "";

// Client references
let wwClient = qmatic.webwidget.client;
let wwRest = qmatic.connector.client;
let parentMain = $(window.parent.document);

// Input state
let inputValue = "";
let yearValue = "";
let monthValue = "";
let dayValue = "";
let maskedInputValue = "";
let startPage = "";
let widgetPage = "";
let currentPage = "";
let scanIdField = "";
let scanInputIdField = "";

// Feature flags
let barcodeEnabled = false;
let barcodePage = "";
let timeoutId = 0;
let maxInput = 15;
let vPrinterId = 0;
let appointmentCacheTime = 0;

// DOM element references
let objInputId;
let objMessageId;
let objBarcodeId;
let objAddButtonId;
let objYearId;
let objMonthId;
let objDayId;
let yearPlaceholder;
let monthPlaceholder;
let dayPlaceholder;

let parentDoc = $(window.parent.document);

// Page references
let pageNotFound, pageTooEarly, pageTooLate, pageMultiple, pageQrcodeBusy;

// State variables
let selectedMonth = "";
let enteredAppointmentTime = "";
let enterAppTime = "";
let enterAppTimeState = false;
let multipleAppointmentsFound = false;
let enteredDOB = "";
let enteredPhoneNumber = "";
let originalTextInMessage = "";
let enteredCardNumber = "";

// Style references
let textFontObj, textFontString, textColor, keyBgColor;
let origInputStyle;
let origYearStyle;
let origMonthStyle;
let origDayStyle;

// Custom configuration
let customTicketIdField = "";
let barcodeStart, barcodeEnd;
let intro8 = false;
let maskInput;
let branchList = [];
let phonePrefix = "";
let phoneLastDigits = 5;

// Validation configuration
let phoneValidationMsgId = "";
let objPhoneValidationMsgId;
let phoneValidationOriginalMessageText = "";
let todaysAppointments = [];

// Ticket configuration
let ticketNbrIsIdField = false;
let id4lastdigitsValidationMsgId = "";
let objId4lastdigitsValidationMsgId;
let id4lastdigitsValidationOriginalMessageText = "";

// Debug configuration
let agentDebug = false;
let EVENT_NAME = "LOG_FROM_WIDGET";
let eventData = "";
let debugUnit = "";

// Element arrays
let ticketElementObj = [];
let arriveFirst = false;
let phonePrefixShow = true;

// Cache data
let appCacheData = {
    custom1: "",
    custom2: "",
    custom3: "",
    custom4: "",
    custom5: "",
    level: "",
    lang: ""
};

// Character mapping
let toChar = {
    35: '#',
    42: '*',
    48: '0',
    49: '1',
    50: '2',
    51: '3',
    52: '4',
    53: '5',
    54: '6',
    55: '7',
    56: '8',
    57: '9'
};

// Scan state
let scanAskTime = false;
let doNotReset = false;

// Load balancing configuration
let loadBalanceUnitNumId = "";
let zoneDelays = [0,0,0,0,0,0,0,0,0,0];
let zoneNames = ["Zone 1", "Zone 2", "Zone 3", "Zone 4", "Zone 5", "Zone 6", "Zone 7", "Zone 8", "Zone 9", "Zone 10"];
let zoneElement = [];
let zoneElementObj = [];
let socketQrId = null;

// QR code configuration
let qrcodeBrightness = 50;
let qrcodeWhiteLEDIntensity = 55;
let qrcodeMirror = false;
let qrcodeRedLED = true;
let qrcodeScanInterval = 5;

function sendUnitEvent(uid, msg) {		
	var params = {
		"uid" : uid,
		"log_message" : msg
		};
				
		var event =  {"M":"E","E":{"evnt":"","type":"APPLICATION", "prm":""}};
		event.E.evnt = EVENT_NAME;	
		event.E.prm = params; 
		/* no need to include qevents_cometd.js, use the parent object */
		parent.qevents.publish('/events/APPLICATION', event);
	}	

function appCacheSet( topic, eventData, subscriberData ) {
	for (var key in appCacheData){
		if ( key == eventData.key ) {
			appCacheData[key] = eventData.value;
		}
	}		
}

function appCacheClear( topic, eventData, subscriberData ) {
	for (var key in appCacheData){
		appCacheData[key] = "";
	}
}

var controller = (function($) {
	function getZoneSettings(){
		zoneVar = wwRest.getGlobalVariable("waitingAreaSettings_" + branchId);
		if (zoneVar != undefined) {
			zoneVar = JSON.parse(zoneVar.value);
			for (var z = 0; z < zoneVar.length; z++){
				pos = zoneVar[z].id-1;
				if (pos > -1) {
					zoneDelays[pos] = zoneVar[z].walkTime;
					zoneNames[pos] = zoneVar[z].displayName;
				}
				
			}
		}
	}
	// Public contents of controller
	return {
		onLoaded : function(configuration) {
			//-- gets the configuration information from the surface application --//
			var attr = configuration.attributes,
			attribParser = new qmatic.webwidget.AttributeParser(attr || {});
			// Other text font and colour
			textFontObj = parseFontInfo(attribParser.getString('text.font', 'Arial;36px;normal;normal'), 'object'),
			textFontString = parseFontInfo(attribParser.getString('text.font', 'Arial;36px;normal;normal'), 'string'),
			textColor = attribParser.getString('text.color', '#000000'),
			keyBgColor = attribParser.getString('key.bg.color', '#000000'),
			keydelBgColor = attribParser.getString('keydel.bg.color', '#000000'),
			btnImage = attribParser.getImageUrl('key.image', ''),
			btnDelImage = attribParser.getImageUrl('keydel.image', ''),
			//-- background --//
			backgroundColor = attribParser.getString('bg.color', '');
			
			arrivedPage = attribParser.getString('page.name', '');					
			
			inputId = attribParser.getString('input.element', '');
			yearId = attribParser.getString('year.element', '');
			monthId = attribParser.getString('month.element', '');
			dayId = attribParser.getString('day.element', '');
			yearPlaceholder = attribParser.getString('year.placeholder', '');
			monthPlaceholder = attribParser.getString('month.placeholder', '');
			dayPlaceholder = attribParser.getString('day.placeholder', '');
			maskInput = attribParser.getBoolean('input.mask', false);
			messageId = attribParser.getString('message.element', '');
			enterAppTime = attribParser.getString('text.enter.app.time','Please enter your appointment time:');
			
			addBtnId = attribParser.getString('add.btn.element', '');
			arriveFirst = attribParser.getBoolean('arrive.first', false);
			phonePrefixShow = attribParser.getBoolean('phone.prefix.show', true);
			phoneLastDigits = attribParser.getInteger('phone.x.digits', '5');
			//-- text variables --//			
			minutesEarly = attribParser.getInteger('early.minutes', '15');
			minutesLate = attribParser.getInteger('late.minutes', '0');
			inputIdField = attribParser.getString('id.field', '');
			scanInputIdField = attribParser.getString('scan.id.field', '');
			maxInput = attribParser.getInteger("max.num", '15');
			dateOfBirthInputType = attribParser.getString('dateOfBirthInputType', '');
			dateOfBirthInputFormat = attribParser.getString('dateOfBirthInputFormat', '');

			qrcodeBrightness = attribParser.getInteger("qrcode.brightness", 50);
			qrcodeWhiteLEDIntensity = attribParser.getInteger("qrcode.whiteLEDIntensity", 55);
			qrcodeMirror = attribParser.getBoolean("qrcode.mirror", false);
			qrcodeRedLED = attribParser.getBoolean("qrcode.redled", true);
			qrcodeScanInterval = attribParser.getInteger("qrcode.scan.interval", 5);


			vPrinterId = attribParser.getInteger("virtual.printer", 0);
			//appointmentCacheTime = attribParser.getInteger("appointment.cache.time", 0); // if cache time next to be set to fecth appointments
			ticketElement = (attribParser.getString("ticket.element", "")).split(",");

			for (var a = 0; a < ticketElement.length; a++) {
				if ( window.parent.document.getElementById( ticketElement[a] ) ){
					ticketElementObj[a] = $( parentDoc ).find( 'div[id="' + ticketElement[a] + '"]' );
				} else {
					ticketElementObj[a] = null;
				}
			}

			zoneElement = (attribParser.getString("zone.element", "")).split(",");
			
			for (var a = 0; a < zoneElement.length; a++) {
				if ( window.parent.document.getElementById( zoneElement[a] ) ){
					zoneElementObj[a] = $( parentMain ).find( 'div[id="' + zoneElement[a] + '"]' );
				} else {
					zoneElementObj[a] = null;
				}
			}
			
			barcodeEnabled = attribParser.getBoolean('barcode.enabled', false);		
			barcodePage = attribParser.getString('page.barcode.busy', '');	

			qrcodeEnabled = attribParser.getBoolean('qrcode.enabled', true);							
			qrcodePage = attribParser.getString('page.qrcode.busy','');

			pageNotFound = attribParser.getString('page.not.found','');
			pageTooEarly = attribParser.getString('page.too.early','');
			pageTooLate = attribParser.getString('page.too.late','');
			pageMultiple = attribParser.getString('page.multiple','');			
			
			if (inputId != "") {
				objInputId = $(parentDoc).find('div[id="' + inputId +'"]').get(0);
				// Read the styling from the input field as set on the surface editor
				origInputStyle = "border:none;"
				origInputStyle += "font-style:"+objInputId.style.getPropertyValue("font-style");
				origInputStyle += ";font-size:"+objInputId.style.getPropertyValue("font-size");
				origInputStyle += ";font-weight:"+objInputId.style.getPropertyValue("font-weight");
				origInputStyle += ";background-color:"+objInputId.style.getPropertyValue("background-color");
				origInputStyle += ";color:"+objInputId.style.getPropertyValue("color");	
				origInputStyle += ";width:" + objInputId.style.getPropertyValue("width");
				origInputStyle += ";height:" + objInputId.style.getPropertyValue("height");
			}
			if (messageId != "" ){
				objMessageId = $(parentDoc).find('div[id="' + messageId +'"]').get(0);	
				originalMessageText = objMessageId.innerHTML;
			}
			if (barcodeId != "") {
				objAddButtonId = $(parentDoc).find('div[id="' + addBtnId +'"]').get(0);	
			}
			if (socketQrId != "") {
				objAddButtonId = $(parentDoc).find('div[id="' + addBtnId +'"]').get(0);	
			}
			if (yearId != "") {
				objYearId = $(parentDoc).find('div[id="' + yearId +'"]').get(0);
				origYearStyle = "border:none;"
				origYearStyle += "font-style:"+objYearId.style.getPropertyValue("font-style");
				origYearStyle += ";font-size:"+objYearId.style.getPropertyValue("font-size");
				origYearStyle += ";font-weight:"+objYearId.style.getPropertyValue("font-weight");
				origYearStyle += ";background-color:"+objYearId.style.getPropertyValue("background-color");
				origYearStyle += ";color:"+objYearId.style.getPropertyValue("color");	
				origYearStyle += ";width:" + objYearId.style.getPropertyValue("width");
				origYearStyle += ";height:" + objYearId.style.getPropertyValue("height");
			}
			if (monthId != "") {
				objMonthId = $(parentDoc).find('div[id="' + monthId +'"]').get(0);
				origMonthStyle = "border:none;"
				origMonthStyle += "font-style:"+objMonthId.style.getPropertyValue("font-style");
				origMonthStyle += ";font-size:"+objMonthId.style.getPropertyValue("font-size");
				origMonthStyle += ";font-weight:"+objMonthId.style.getPropertyValue("font-weight");
				origMonthStyle += ";background-color:"+objMonthId.style.getPropertyValue("background-color");
				origMonthStyle += ";color:"+objMonthId.style.getPropertyValue("color");	
				origMonthStyle += ";width:" + objMonthId.style.getPropertyValue("width");
				origMonthStyle += ";height:" + objMonthId.style.getPropertyValue("height");
			}
			if (dayId != "") {
				objDayId = $(parentDoc).find('div[id="' + dayId +'"]').get(0);
				origDayStyle = "border:none;"
				origDayStyle += "font-style:"+objDayId.style.getPropertyValue("font-style");
				origDayStyle += ";font-size:"+objDayId.style.getPropertyValue("font-size");
				origDayStyle += ";font-weight:"+objDayId.style.getPropertyValue("font-weight");
				origDayStyle += ";background-color:"+objDayId.style.getPropertyValue("background-color");
				origDayStyle += ";color:"+objDayId.style.getPropertyValue("color");	
				origDayStyle += ";width:" + objDayId.style.getPropertyValue("width");
				origDayStyle += ";height:" + objDayId.style.getPropertyValue("height");
			}
			phonePrefix = attribParser.getString('phone.prefix', '');
			phoneValidationMsgId = attribParser.getString('phone.validationMsgId', '');
			if (phoneValidationMsgId != "" ){
				objPhoneValidationMsgId = $(parentDoc).find('div[id="' + phoneValidationMsgId +'"]').get(0);	
				phoneValidationOriginalMessageText = objPhoneValidationMsgId.innerHTML;
			}

			ticketNbrIsIdField = attribParser.getBoolean('ticketid.isidfield', false);
			id4lastdigitsValidationMsgId = attribParser.getString('id4lastdigits.validationMsgId', '');
			if (id4lastdigitsValidationMsgId != "" ){
				objId4lastdigitsValidationMsgId = $(parentDoc).find('div[id="' + id4lastdigitsValidationMsgId +'"]').get(0);	
				id4lastdigitsValidationOriginalMessageText = objId4lastdigitsValidationMsgId.innerHTML;
			}

			customTicketIdField = attribParser.getString('custom.ticketid.field','');
			barcodeStart = attribParser.getInteger('barcode.start',0);
			barcodeEnd = attribParser.getInteger('barcode.end',-1);
			
			language = attribParser.getString("default.language","");
			if (language.length > 0){
				name = "attributes_"+language;
				jQuery.i18n.properties({
					name: name, 
					path:'i18n/', 
					mode:'map',	
					language: language,				
					callback : function () {
						i18nPage();
					}
				}); 
			}
			
			if (btnImage != "") {
				if (btnDelImage == "") {
					btnDelImage = btnImage;
				}
				// image present, remove border etc
				for (  var i = 1; i < 13; i++ ) {
					$('#key'+i).css('background-color', 'transparent');
					$('#key'+i).css('border', 'transparent');
					$('#key'+i).css('border-top-left-radius', '0px');
					$('#key'+i).css('border-bottom-right-radius', '0px');
					$('#key'+i).css('-webkit-border-top-left-radius', '0px');
					$('#key'+i).css('-webkit-border-bottom-right-radius', '0px');
					$('#key'+i).css('-moz-border-radius-topleft', '0px');
					$('#key'+i).css('-moz-border-radius-bottomright', '0px');
					
					if ( i > 10) {
						$('#key'+i).css('background-image', 'url(' + btnDelImage + ')');
					} else {
						$('#key'+i).css('background-image', 'url(' + btnImage + ')');
					}
				}

				setKeySize(btnImage);
			} 
			
			for (  var i = 1; i < 11; i++ ) {
				$('#key'+i).css('color',textColor);
				$('#key'+i).css('background-color',keyBgColor);
				$('#key'+i).css(textFontObj);
			}
			for (  var i = 11; i < 13; i++ ) {
				$('#key'+i).css('color',textColor);
				$('#key'+i).css('background-color',keydelBgColor);
				$('#key'+i).css(textFontObj);
			}

			if (wwClient.getUnitAndDeviceId().indexOf("SW_TP3115") >= 0){
				intro8 = true;
				$(".tableMonth").css('margin-left','2%');
				$(".tableDay").css('margin-left','5%');
				$("#numKeyboard").css('margin-left',"80px");
			}	
		
			// set widget background colour
			$('body:first').css('background-color', backgroundColor);
						
			branchId = qmatic.webwidget.client.getBranchId();	
			unitId = qmatic.webwidget.client.getUnitId();	
			
			var units = this.customGetUnits(branchId);
			for (var u = 0; u < units.length; u++){
                unitName = units[u].unitId;
				//check for loadbalance unit
				if(unitName.split(":")[1] === "waitingroombalancer"){
					loadBalanceUnitNumId = units[u].id;
					getZoneSettings();
				}
		
            }    
			
			$("#tableMonth").css(textFontObj);
			$("#tableDay").css(textFontObj);
			$(".month").css('background-color',keyBgColor);
			$(".month").css('color',textColor);
			$(".month").css(textFontObj);
			$(".day").css('background-color',keyBgColor);
			$(".day").css('color',textColor);
			$(".day").css(textFontObj);
	
			if ($.browser.opera){
				browserOpera = true;
			}
	
			addClickToFunctionBtn();
			getBranchList();
			if (appointmentCacheTime > 0 && vPrinterId > 0) {
				fetchAppointments(); // inital fetch appointments

				// then fetch again every x ms
				setInterval(function() {
					fetchAppointments();
				}, (appointmentCacheTime * 1000));
			}
			startPage = parent.$('#pages').children(':visible');
			startPage = startPage.attr('name');
			wwClient.subscribe("com.qmatic.qp.topic.event.SWITCH_HOST_PAGE_COMPLETE",switchPageEvent);
			wwClient.subscribe( 'com.qmatic.qp.topic.operation.PUT_CACHE',appCacheSet );
			wwClient.subscribe( 'com.qmatic.qp.topic.operation.CLEAR_CACHE',appCacheClear );

			parent.addEventListener('keypress', function(evt) {
				if(barcodeEnabled || qrcodeEnabled) {
				evt.stopImmediatePropagation();
				evt.preventDefault();
				}
				keyEventReceived(evt);
			});	
	
			document.addEventListener('keypress', function(e) {
				e.stopImmediatePropagation();
				e.preventDefault();
				keyEventReceived(e);
				return false;
			});	
		
			
			parent.$('#pages').children('.canvas-page').each(function() {
				var pageEl = $(this);
				pageEl.children().each(function() {
					var componentEl = $(this);
					if (componentEl.attr("id").indexOf("widget") > -1) {
						if ( window.frameElement.id.indexOf( "_" + componentEl.attr("id") + "_") > -1) {
							widgetPage = pageEl.attr('name');
							console.log("Loaded Widget: " + widgetPage);
						}
					}
				})
			})
		
			$(function() {
				FastClick.attach(document.body);
			});

			idField = inputIdField;
			tempIdField = idField; // store manual input id field as we want to set the id field back to default after scan
			reset();
			checkDebugNeeded();

			// Initialize QR code reader
			if (qrcodeEnabled) {
				initQRCodeReader();
			}
			
			// Add cleanup on page unload
			window.addEventListener('beforeunload', function() {
				if (qrWebSocket) {
					stopScanning();
				}
			});

		},
		
		onLoadError : function(message) {
			$('body').html('<p>Widget load error: ' + message + '</p>');
		},
		selectMonth: function (month){
			selectedMonth = month;
			$("#dobPageMonth").hide();
			$("#dobPageDay").show();
		},
		selectDay: function (day){					
			enteredDOB = selectedMonth+"-"+day;
			confirmAppointmentId("");
		}
	};
	
	function setKeySize(imgSrc){
		var tempImage1 = new Image();
		tempImage1.src = imgSrc;
		tempImage1.onload = function() {
			for ( var i = 1; i < 13; i++) {
				$('#key'+i).css('width', tempImage1.width);				
				$('#key'+i).css('height', tempImage1.height);
				$('#key'+i).css('line-height', tempImage1.height + "px");
			}
		}
	}
	
	function addClickToFunctionBtn(){
		if (window.parent.document.getElementById(addBtnId)) {
			window.parent.document.getElementById(addBtnId).addEventListener ('click', confirmAppointmentByKeyBoard, false);
		}
	}
	
	function i18nPage() {
		$("#month1").html(jQuery.i18n.prop('month1'));
		$("#month2").html(jQuery.i18n.prop('month2'));
		$("#month3").html(jQuery.i18n.prop('month3'));
		$("#month4").html(jQuery.i18n.prop('month4'));
		$("#month5").html(jQuery.i18n.prop('month5'));
		$("#month6").html(jQuery.i18n.prop('month6'));
		$("#month7").html(jQuery.i18n.prop('month7'));
		$("#month8").html(jQuery.i18n.prop('month8'));
		$("#month9").html(jQuery.i18n.prop('month9'));
		$("#month10").html(jQuery.i18n.prop('month10'));
		$("#month11").html(jQuery.i18n.prop('month11'));
		$("#month12").html(jQuery.i18n.prop('month12'));
	} 


	function parseFontInfo(font_info, type) {
		var css = font_info.split(';');
		
		if(!type) var type = 'string';
			
		var result = null;
		switch (type) {
			case 'string' :
				result = 'font-family:'+css[0]+';font-size:'+css[1]+';font-style:'+css[2]+';font-weight:'+css[3];	
				break;
			case 'object' :
				result = {
					'font-family'	: css[0],
					'font-size'		: css[1],
					'font-style'	: css[2],
					'font-weight'	: css[3]
				}
				break;
		}
		return result;
	}
	
	function checkDebugNeeded() {
		var debugUnits = wwRest.getPresentationPointsByDeviceType(branchId,'SW_MEDIA_HD_DISPLAY_POINT');
		for (d = 0; d < debugUnits.length; d++){
			if (debugUnits[d].name == "appointmentSyncCheck"){
				if (debugUnits[d].parameters.logData == true){
					agentDebug = true;
					debugUnit = debugUnits[d].parameters.unitId + ":" + 'SW_MEDIA_HD_DISPLAY_POINT';
				}
			}
		}
		
		if (agentDebug == true) {
			$.ajax({
				type: "GET",
				url: "config.xml",
				dataType: "xml",
				success: function(xml) {
					var x = xml.getElementsByTagName("widget");  
					version = $(x).attr("version")
					writeDebugInfo( "Debug on appointarrival widget version enabled, browserOpera: " + browserOpera);
				}	
			});
		}
	}

})(jQuery);

// -------------------------------------------------------------------------
// -- send unit Command function added since stuff is missing in the rest-api.js 
// -------------------------------------------------------------------------

customUnitCommand = function(unitLongId,_params){
	var params = _params ? _params : {};
	var request = new REST.Request();
	request.setMethod('POST');
	var uri = params.$apiURL ? params.$apiURL : REST.apiURL;
	uri += '/widgetconnector/unitCommand/';
	uri += unitLongId;//REST.Encoding.encodePathSegment(unitId);
	request.setEntity(params);
	request.setURI(uri);
	if(params.$username && params.$password)
		request.setCredentials(params.$username, params.$password);
	if(params.$accepts)
		request.setAccepts(params.$accepts);
	else
		request.setAccepts('application/json');
	if(params.$contentType)
		request.setContentType(params.$contentType);
	else
		request.setContentType('application/json');
	if(params.$callback){
		request.execute(params.$callback);
	} else {
		var returnValue;
		request.setAsync(false);
		var callback = function(httpCode, xmlHttpRequest, value){ returnValue = value;};
		request.execute(callback);
		return returnValue;
	}
};

//branches/{branchId}/units
    this.customGetUnits = function(branchId, _params){
        var params = _params ? _params : {};
        var request = new REST.Request();
        request.setMethod('GET');
        var uri = params.$apiURL ? params.$apiURL : REST.apiURL;
        uri += '/widgetconnector/branches/' + branchId + '/units/';
        request.setEntity(params);
        request.setURI(uri);
        if(params.$username && params.$password)
            request.setCredentials(params.$username, params.$password);
        if(params.$accepts)
            request.setAccepts(params.$accepts);
        else
            request.setAccepts('application/json');
        if(params.$contentType)
            request.setContentType(params.$contentType);
        else
            request.setContentType('application/json');
        if(params.$callback){
            request.execute(params.$callback);
        }else{
            var returnValue;
            request.setAsync(false);
            var callback = function(httpCode, xmlHttpRequest, value){ returnValue = value;};
            request.execute(callback);
            return returnValue;
        }
    };