let version = "--";

let branchId = -1;
let browserOpera = navigator.userAgent.toLowerCase().indexOf('opera') > -1;
let idField = "";
let tempIdField = "";
let inputIdField = "";
let dateOfBirthInputType = "";
let dateOfBirthInputFormat = "";
let unitId = -1;

let minutesEarly = 15;
let minutesLate = 0;

let arrivedPage = "";
let addBtnId = "";
let inputId = "";
let messageId = "";
let monthId = "";

const wwClient = qmatic.webwidget.client;
const wwRest = qmatic.connector.client;
const parentMain = $(window.parent.document);

let inputValue = "";
let yearValue = "";
let monthValue = "";
let dayValue = "";
let maskedInputValue = "";
let widgetPage = "";
let currentPage = "";
let scanInputIdField = "";

let barcodeEnabled = false;
let maxInput = 15;
let vPrinterId = 0;

let objInputId, objMessageId, objAddButtonId, objYearId, objMonthId, objDayId;
let yearPlaceholder, monthPlaceholder, dayPlaceholder;

const parentDoc = $(window.parent.document);

let pageNotFound, pageTooEarly, pageTooLate, pageMultiple, qrcodePage;

let selectedMonth = "";
let enteredAppointmentTime = "";
let enterAppTime = "";
let enterAppTimeState = false;
let multipleAppointmentsFound = false;
let enteredDOB = "";
let enteredPhoneNumber = "";
let originalMessageText = "";
let phonePrefix = "";
let phoneLastDigits = 5;

let textFontObj, textFontString, textColor, keyBgColor, origInputStyle, origYearStyle, origMonthStyle, origDayStyle;

let barcodeStart, barcodeEnd;
let maskInput;
let branchList = [];
let phonePrefixShow = true;
let phoneValidationMsgId = "";
let objPhoneValidationMsgId;
let phoneValidationOriginalMessageText = "";
let todaysAppointments = [];
let ticketNbrIsIdField = false;
let id4lastdigitsValidationMsgId = "";
let objId4lastdigitsValidationMsgId;

let agentDebug = false;
let EVENT_NAME = "LOG_FROM_WIDGET";
let debugUnit = "";


let arriveFirst = false;

let appCacheData = {
    custom1: "",
    custom2: "",
    custom3: "",
    custom4: "",
    custom5: "",
    level: "",
    lang: ""
};

let scanAskTime = false;
let doNotReset = false;
let socketQrId = null;
let barcodeId = "";

const qrcodeConfig = {
    brightness: 50,
    whiteLEDIntensity: 55,
    mirror: false,
    redLED: true,
    scanInterval: 5
};

const validationConfig = {
    phone: {
        messageId: "",
        element: null,
        originalText: ""
    },
    idLastDigits: {
        messageId: "",
        element: null,
        originalText: ""
    }
};

const appointmentState = {
    selectedMonth: "",
    enteredTime: "",
    timePrompt: "",
    isEnteringTime: false,
    hasMultipleAppointments: false,
    dateOfBirth: "",
    phoneNumber: ""
};

const zoneConfig = {
    loadBalanceUnitId: "",
    delays: new Array(10).fill(0),
    names: Array.from({length: 10}, (_, i) => `Zone ${i + 1}`),
    elements: [],
    elementObjects: []
};

let ticketElement = "";
let ticketElementObj = [];
let language = "";
let name = "";
let startPage = "";
let loadBalanceUnitNumId = "";
let unitName = "";
let customTicketIdField = "";

function sendUnitEvent(uid, msg) {		
	var params = {
		"uid" : uid,
		"log_message" : msg
		};
				
		var event =  {"M":"E","E":{"evnt":"","type":"APPLICATION", "prm":""}};
		event.E.evnt = EVENT_NAME;	
		event.E.prm = params; 
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
		const zoneVar = wwRest.getGlobalVariable("waitingAreaSettings_" + branchId);
		if (zoneVar != undefined) {
			const zoneSettings = JSON.parse(zoneVar.value);
			for (var z = 0; z < zoneSettings.length; z++) {
				const pos = zoneSettings[z].id - 1;
				if (pos > -1) {
					zoneConfig.delays[pos] = zoneSettings[z].walkTime;
					zoneConfig.names[pos] = zoneSettings[z].displayName;
				}
			}
		}
	}

	return {
		onLoaded : function(configuration) {
			var attr = configuration.attributes,
			attribParser = new qmatic.webwidget.AttributeParser(attr || {});
			customTicketIdField = attribParser.getString('custom.ticketid.field', '');
			ticketNbrIsIdField = attribParser.getBoolean('ticketid.isidfield', false);
			textFontObj = parseFontInfo(attribParser.getString('text.font', 'Arial;36px;normal;normal'), 'object'),
			textFontString = parseFontInfo(attribParser.getString('text.font', 'Arial;36px;normal;normal'), 'string'),
			textColor = attribParser.getString('text.color', '#000000'),
			keyBgColor = attribParser.getString('key.bg.color', '#000000'),
			keydelBgColor = attribParser.getString('keydel.bg.color', '#000000'),
			btnImage = attribParser.getImageUrl('key.image', ''),
			btnDelImage = attribParser.getImageUrl('keydel.image', ''),

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
			
			minutesEarly = attribParser.getInteger('early.minutes', '15');
			minutesLate = attribParser.getInteger('late.minutes', '0');
			inputIdField = attribParser.getString('id.field', '');
			scanInputIdField = attribParser.getString('scan.id.field', '');
			maxInput = attribParser.getInteger("max.num", '15');
			dateOfBirthInputType = attribParser.getString('dateOfBirthInputType', '');
			dateOfBirthInputFormat = attribParser.getString('dateOfBirthInputFormat', '');

			qrcodeConfig.brightness = attribParser.getInteger("qrcode.brightness", 50);
			qrcodeConfig.whiteLEDIntensity = attribParser.getInteger("qrcode.whiteLEDIntensity", 55);
			qrcodeConfig.mirror = attribParser.getBoolean("qrcode.mirror", false);
			qrcodeConfig.redLED = attribParser.getBoolean("qrcode.redled", true);
			qrcodeConfig.scanInterval = attribParser.getInteger("qrcode.scan.interval", 5);


			vPrinterId = attribParser.getInteger("virtual.printer", 0);
			ticketElement = (attribParser.getString("ticket.element", "")).split(",");

			for (var a = 0; a < ticketElement.length; a++) {
				if ( window.parent.document.getElementById( ticketElement[a] ) ){
					ticketElementObj[a] = $( parentDoc ).find( 'div[id="' + ticketElement[a] + '"]' );
				} else {
					ticketElementObj[a] = null;
				}
			}

			zoneConfig.elements = (attribParser.getString("zone.element", "")).split(",");
			
			for (var a = 0; a < zoneConfig.elements.length; a++) {
				const element = $(parentMain).find('div[id="' + zoneConfig.elements[a] + '"]');
				zoneConfig.elementObjects[a] = element.length ? element : null;
			}
			
			barcodeEnabled = attribParser.getBoolean('barcode.enabled', false);		
			qrcodeEnabled = attribParser.getBoolean('qrcode.enabled', true);							
			qrcodePage = attribParser.getString('page.qrcode.busy','');

			pageNotFound = attribParser.getString('page.not.found','');
			pageTooEarly = attribParser.getString('page.too.early','');
			pageTooLate = attribParser.getString('page.too.late','');
			pageMultiple = attribParser.getString('page.multiple','');			
			
			if (inputId != "") {
				objInputId = $(parentDoc).find('div[id="' + inputId +'"]').get(0);
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

			id4lastdigitsValidationMsgId = attribParser.getString('id4lastdigits.validationMsgId', '');
			if (id4lastdigitsValidationMsgId != "" ){
				objId4lastdigitsValidationMsgId = $(parentDoc).find('div[id="' + id4lastdigitsValidationMsgId +'"]').get(0);	
				id4lastdigitsValidationOriginalMessageText = objId4lastdigitsValidationMsgId.innerHTML;
			}

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
				$(".tableMonth").css('margin-left','2%');
				$(".tableDay").css('margin-left','5%');
				$("#numKeyboard").css('margin-left',"80px");
			}	
			$('body:first').css('background-color', backgroundColor);
						
			branchId = qmatic.webwidget.client.getBranchId();	
			unitId = qmatic.webwidget.client.getUnitId();	
			
			var units = this.customGetUnits(branchId);
			for (var u = 0; u < units.length; u++){
                unitName = units[u].unitId;
				if(unitName.split(":")[1] === "waitingroombalancer"){
					zoneConfig.loadBalanceUnitId = units[u].id;
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
			if (vPrinterId > 0) {
				fetchAppointments(); 
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
			tempIdField = idField; 
			reset();
			checkDebugNeeded();

			if (qrcodeEnabled) {
				initQRCodeReader();
			}

			window.addEventListener('beforeunload', function() {
				if (qrWebSocket) {
					stopScanning();
				}
			});

			validationConfig.phone.messageId = attribParser.getString('phone.validationMsgId', '');
			validationConfig.phone.element = $(parentDoc).find('div[id="' + validationConfig.phone.messageId +'"]').get(0);
			validationConfig.phone.originalText = validationConfig.phone.element ? validationConfig.phone.element.innerHTML : "";
			validationConfig.idLastDigits.messageId = attribParser.getString('id4lastdigits.validationMsgId', '');
			validationConfig.idLastDigits.element = $(parentDoc).find('div[id="' + validationConfig.idLastDigits.messageId +'"]').get(0);
			validationConfig.idLastDigits.originalText = validationConfig.idLastDigits.element ? validationConfig.idLastDigits.element.innerHTML : "";
		},
		
		onLoadError : function(message) {
			$('body').html('<p>Widget load error: ' + message + '</p>');
		},
		selectMonth: function (month) {
			appointmentState.selectedMonth = month;
			$("#dobPageMonth").hide();
			$("#dobPageDay").show();
		},
		selectDay: function (day) {
			appointmentState.dateOfBirth = appointmentState.selectedMonth + "-" + day;
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