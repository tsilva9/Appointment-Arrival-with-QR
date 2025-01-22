var develop = false;
var qrWebSocket = null;
var isScanning = false;

function reset(){
	inputValue = "";
	scanAskTime = false;
	processing = false;
	// Initialise the phone number with the value configured on the widget so people know they don't need to
	// enter their country code if needed
	// GP-3675
	if (phonePrefixShow) {
		inputValue = phonePrefix;
	}
	idField = tempIdField; //set to manual id field
	if (idField == "dob"){
		inputValue = "";
		if(dateOfBirthInputType === 'buttons') {
			$("#page1").hide();
			$("#dobPageMonth").show();
			$("#dobPageDay").hide();
			$(objAddButtonId).hide();
		}
		// when dob input type is 'keyboard'
		else {
			$("#page1").show();
			$("#dobPageDay").hide();
			$(objAddButtonId).show();
			$(objInputId).hide();
		}
	}
	else {
		$("#dobPageMonth").hide();
		$("#dobPageKeyboard").hide();
		$("#dobPageDay").hide();
		$("#page1").show();
		$(objAddButtonId).show();
	}
	if (messageId != "" ){
		objMessageId.innerHTML = originalMessageText;
	}
	enterAppTimeState = false;
	multipleAppointmentsFound = false;
	showInput();
	
	// Restart scanning if it was stopped
	if (qrWebSocket && !isScanning) {
		startScanning();
	}
}

function switchPageEvent (topic, publisherData, subscriberData){
		var activePage = parent.$('#pages').children(':visible');
		currentPage = activePage.attr('name');
		if (doNotReset == true) {
			doNotReset = false;
		} else {
			reset();
		}
}

function showText(message, inputType){
	if (inputType == "keyboard") {
		if (messageId != "" ){
			objMessageId.innerHTML = '<span class="text_single_element">' + message + '</span>';
		}
	} else {
		if (barcodeId != "") {
			objBarcodeId.innerHTML = '<span class="text_single_element">' + message + '</span>';
			wwClient.switchHostPage(barcodePage);
		}
	}
}

function showPhoneErrorValidationText(textToShow) {
		if (typeof objPhoneValidationMsgId !== "undefined" && objPhoneValidationMsgId !== null) {
			objPhoneValidationMsgId.innerHTML = '<span class="text_single_element">' + textToShow + '</span>';
		}
}

function showIdlast4digitsErrorValidationText(textToShow) {
	if (typeof objId4lastdigitsValidationMsgId !== "undefined" && objId4lastdigitsValidationMsgId !== null) {
		objId4lastdigitsValidationMsgId.innerHTML = '<span class="text_single_element">' + textToShow + '</span>';
	}
}

// ---------------------------------------------------------------------
// -----------------------appointment search and confirm----------------
// ---------------------------------------------------------------------

function confirmAppointmentByKeyBoard(){
	if(dateOfBirthInputType == "keyboard") {
		confirmAppointmentId("dobKeyboard");
	}
	else {
		confirmAppointmentId("keyboard");
	}
}

function confirmAppointmentByDob() {
	confirmAppointmentId("dobKeyboard");
}

function getInputDOB() {
	return formatDateToEnteredDOB(new Date(yearValue, monthValue-1, dayValue))
}

function stringToDate(_date,_format,_delimiter){
	var formatLowerCase=_format.toLowerCase();
	var formatItems=formatLowerCase.split(_delimiter);
	var dateItems=_date.split(_delimiter);
	var monthIndex=formatItems.indexOf("mm");
	var dayIndex=formatItems.indexOf("dd");
	var yearIndex=formatItems.indexOf("yyyy");
	var month=parseInt(dateItems[monthIndex]);
	month-=1;
	var formatedDate = new Date(dateItems[yearIndex],month,dateItems[dayIndex]);
	return formatedDate;
}

function formatDateToEnteredDOB(date) {

	var day = date.getDate();
	var month = date.getMonth() + 1;
	var year = date.getFullYear();
	if(day < 10) {
		day = '0' + day;
	}
	if(month < 10) {
		month = '0' + month
	}
	return (year + '-' + month + '-' + day);
}

function confirmAppointmentId(input){
	foundAppointments=[];
	var inputType = "keyboard";
	idField = scanAskTime ? scanIdField : inputIdField; // use scanIdField if scan done and multiple appointments found
	scanIdField = scanInputIdField;
	var matchAppTime ="";
	var now = new Date();
	if (input == "barcode") {
		inputType = input;
	}

	if(input == "dobKeyboard") {
		enteredDOB = getInputDOB();
	}

	var detectedString = "QWebBookId";
	var today = new Date();

	writeDebugInfo("Date: " + now + " - Early: " + minutesEarly + " - Late: " + minutesLate + " - Input: " + inputValue + " - inputType: " + inputType + " - Used: " + input );

	if(vPrinterId > 0) {
		writeDebugInfo("vPrinterId set to: " + vPrinterId );
		// check if appointment cache time is set
		if(!appointmentCacheTime) {
			// if not  clear array and refetch appointments
			todaysAppointments = [];
			fetchAppointments();
		}
	}

	if (inputValue.length > 1 && inputType === "barcode" ) {
		// possible qr-codes:
		// qrCodeCalculated: 	672341040
		// Qwebbook:			672341040
		// qrCodeExternal:		67234
		// qrCodeInternalId: 	{"appointment_id":"67234","branch_name":"Branch 001","branch_id":"1","appointment_date":"2016-11-24T10:40:00"}
		// QCA:{"appointment_id":"f19a61af-3762-40f3-a674-6b93710d40e2","appointment_date":"2022-07-01T11:00:00Z","branch_id":"5368f91b-4cfe-41d1-897c-ccecefb74699","branch_name":"SmartCity_Center"}
		idField = "QWebBookId";

		// only verify the externalId to figure out what is in it,if it comes from the scanner
		if (inputValue.search("}") > -1 && inputValue.search("{") > -1 && inputValue.search('":"') > -1 ) {
			detectedString = "internalId";
			try {
				var qrCodeObject = JSON.parse(inputValue);
				if ( qrCodeObject.appointment_id !== undefined) {

					if (qrCodeObject.appointment_id.search("-") > -1){
						inputValue = qrCodeObject.appointment_id;
						detectedString = "qca";
						writeDebugInfo("The JSON string contains is QCA format");
					} else {
						inputValue = qrCodeObject.appointment_id+"aaaa";
						writeDebugInfo("The JSON string contains an appointment_id");
					}

				} else {
					writeDebugInfo("The JSON string does not contain an appointment_id, setting it to -1aaaa");
					// json did not contain appointment_id
					inputValue = "-1aaaa";
				}
			} catch (e) {
				writeDebugInfo("Parsing the JSON string went wrong, JSON is invalid");
				inputValue = "-1aaaa";
			}
		} else {
			// sometimes the scan goes worng and some characters of the json are missing, handling the data with substring
			if (  inputValue.search("}") > -1 || inputValue.search("{") > -1 || inputValue.search('":"') > -1 ) {    //qrCodeInternalId scanned
				if ( inputValue.search("appointment_id") > -1 ) {
					detectedString = "internalId";
					startPos = inputValue.search(":")+2;
					endPos = inputValue.search(",")-1;
					inputValue = inputValue.substring(startPos,endPos) +"aaaa";
					if (inputValue.search("-") > -1){
						detectedString = "qca";
						writeDebugInfo("Input value contains part of  QCA format, the needed appointment Id " + inputValue);
					} else {
						inputValue +=  "aaaa";
						writeDebugInfo("Input value contains part of a JSON string, the needed appointment Id " + inputValue);
					}
				} else {
					// end up here if we found a corrupted json but the appointment_id field is missing.
					inputValue = "-1aaaa";
					writeDebugInfo("Input value is a corrupt JSON, setting it to -1aaaa");
				}
			} else {
				writeDebugInfo("Input value is not a JSON");
			}
		}
	} else {
		idField = scanAskTime ? scanIdField : inputIdField; // use if scan done, and now need to ask time

		// Normal input, no scanner used

		// if phone prefix used
		if (idField == "phone" && phonePrefix.length > 0) {
			// phone prefix hidden
			if(!phonePrefixShow) {
				// append the phone prefix to the input vaue
				inputValue = phonePrefix + inputValue;
			}
		}

		// validate the input if it is phone
		if (idField == "phone" && enterAppTimeState == false) {
			if (inputValue.length < 5) {
				// show validatin error msg
				showPhoneErrorValidationText(phoneValidationOriginalMessageText);
				return;
			}
		} else if (idField == "id4lastdigits" && enterAppTimeState == false) {
			if (inputValue.length > 4) {
				// show validation error msg
				showIdlast4digitsErrorValidationText(id4lastdigitsValidationOriginalMessageText);
				return;
			}
		}
	}

	// check if last 4 characters is 'aaaa'
	var lastFourChars = inputValue.substr(inputValue.length - 4); // get if contains 'aaaa'
	if (lastFourChars === "aaaa") {
		inputValue = inputValue.slice(0, -4);
	}

	if (inputType === "barcode") {
		// set to barcode id field just for this scan
		idField = scanIdField;
		if ( detectedString == "qca" ) {
			idField = "externalId";
		}
	}
	writeDebugInfo("inputValue after processing is: " + inputValue + ", idField: " + idField + ", inputType: " + inputType);

	if (idField == "QWebBookId" || idField == "externalId") {
		findParams = {};
		if (idField == "QWebBookId" && inputValue.indexOf('-') < 0) {
			// remove last 4 digit since QWebBook constructs a custom number based on appointid and appointment time
			qpId = parseInt (inputValue.substring(0,inputValue.length-4),10);
			matchAppTime = inputValue.substring(inputValue.length -4); // use appointment time from id
			if (inputValue.length <= 4){
				qpId = inputValue;
			}

			findParams.id = qpId;
			qwApp = null;
			if(vPrinterId == 0) {
				writeDebugInfo("Single branch configured, trying to find appointment qpId " + qpId);
				if (findParams.id <= 2147483647){
					qwApp = findAppointment(findParams);
				}
			} else {
				// if multi branch loop through all appointments
				writeDebugInfo("Multi branch configured, trying to find appointment qpId " + qpId);
				for ( i = 0; i < todaysAppointments.length; i++) {
					startTime = todaysAppointments[i].startTime.replace(/\-/g,'\/').replace(/[T|Z]/g,' ');
					appointmentDate = new Date(startTime);
					if (appointmentDate.toDateString() === today.toDateString() && todaysAppointments[i].status == "CREATED"){
						if(todaysAppointments[i].id === findParams.id) {
							qwApp = todaysAppointments[i];
						}
					}
				}
			}
			if (qwApp != undefined && qwApp != "" && qwApp != null) {
				foundAppointments.push(qwApp);
			}
		} else {
			// find by externalId
			detectedString = "externalId";
			extApp = null;
			if(vPrinterId == 0) {
				writeDebugInfo("Single branch configured, trying to find appointment by externalId " + inputValue);
				extApp = wwRest.getAppointmentByExternalId(inputValue);
			} else {
				// if multi branch loop through all appointments
				writeDebugInfo("Multi branch configured, trying to find appointment by externalId" + inputValue);
				for ( i = 0; i < todaysAppointments.length; i++) {
					startTime = todaysAppointments[i].startTime.replace(/\-/g,'\/').replace(/[T|Z]/g,' ');
					appointmentDate = new Date(startTime);
					if (appointmentDate.toDateString() === today.toDateString() && todaysAppointments[i].status == "CREATED"){
						if(todaysAppointments[i].externalId === inputValue) {
							extApp = todaysAppointments[i];
						}
					}
				}
			}
			if (extApp != undefined && extApp != "" && extApp != null){
				foundAppointments.push(extApp);
			}
		}
	} else if (idField == "eTerminId") {
		foundAppointments = getAppointmentsByETerminId(inputValue);
	} else {
		// check if multi branch/department is configured
		if(vPrinterId == 0) {
			// if not multi branch get only all appointments for the current branch
			todaysAppointments = qmatic.connector.client.getAppointmentsForBranch(branchId);
		}

		// loop through all appointments
		for ( i = 0; i < todaysAppointments.length; i++) {
			startTime = todaysAppointments[i].startTime.replace(/\-/g,'\/').replace(/[T|Z]/g,' ');
			appointmentDate = new Date(startTime);
			if (appointmentDate.toDateString() === today.toDateString() && todaysAppointments[i].status == "CREATED"){
				if (todaysAppointments[i].customers.length > 0) {
					customer = todaysAppointments[i].customers[0];
					if (!enterAppTimeState) enteredPhoneNumber = inputValue;
					if (idField == "phone") {
						if (customer.properties.phoneNumber == enteredPhoneNumber){
							foundAppointments.push(todaysAppointments[i]);
						}
					 } else if (idField == "phoneLastDigits") {
						if (customer.properties && customer.properties.phoneNumber && customer.properties.phoneNumber.slice(-phoneLastDigits) == enteredPhoneNumber.slice(-phoneLastDigits)){
							foundAppointments.push(todaysAppointments[i]);
						}
					}
					else if (idField == "dob"){
						if (customer.properties.dateOfBirth != null && customer.properties.dateOfBirth != undefined){
							if (customer.properties.dateOfBirth &&  customer.properties.dateOfBirth.length > 0) {
								//case dob input is buttons
								if(dateOfBirthInputType=="buttons") {
									if(customer.properties.dateOfBirth.substring(5) == enteredDOB){
										foundAppointments.push(todaysAppointments[i]);
									}
								}
								//case dob input is keyboard
								else {
									if(customer.properties.dateOfBirth == enteredDOB){
										foundAppointments.push(todaysAppointments[i]);
									}
								}
							}
						}
					}
					else if (idField == "identificationNumber"){
						if (!enterAppTimeState)
							identificationNumber = inputValue;
						if (customer.properties.identificationNumber == identificationNumber){
							foundAppointments.push(todaysAppointments[i]);
						}
					}
					else if (idField == "publicId"){
						if (inputValue ==todaysAppointments[i].properties.publicId)
							foundAppointments.push(todaysAppointments[i]);
					} else if (idField == "id4lastdigits") {
						if (todaysAppointments[i].id && inputValue == String(todaysAppointments[i].id).slice(-4)) {
							foundAppointments.push(todaysAppointments[i]);
						}
					}
				}
			}
		}
	}

	writeDebugInfo("Number of found appointments = " + foundAppointments.length)
	foundAppointment = null;
	//if (typeof foundAppointment == 'undefined' || foundAppointment == "" || foundAppointment == null) {
	if (foundAppointments.length == 0 && inputValue.indexOf('-') < 0){
		// looks as someone entered the appointmentId lets search with that, but not if it's a QCA appointment, as in that case the input is not a number and the following findAppointment fails
		detectedString="AppointmentId";
		findParams = {};
		findParams.id = parseInt(inputValue,10);
		writeDebugInfo("No appointment was found trying to search on appointment id:"  + findParams.id)
		if (findParams.id <= 2147483647){
			extApp = findAppointment(findParams);
			if (extApp != undefined && extApp != "" && extApp != null){
				foundAppointments.push(extApp);
			}
		}
	}

	writeDebugInfo("Number of found appointments = " + foundAppointments.length + ", idField: " + idField + ", detectedString: " + detectedString)

	if (foundAppointments.length > 1){
		if (currentPage == barcodePage) {
			// make sure we get back to the widgetPage if muiltiple appointments are found
			doNotReset = true;
			wwClient.switchHostPage(widgetPage);
		}
		if (!arriveFirst && !enterAppTimeState){
			// show the page to ask for the appointment time
			// reset the input first in case you were entering the phone number beforehand
			inputValue = "";
			if(inputType == "barcode") {
				scanAskTime = true; // scan done, so prepare to ask time
			}

			$("#page1").show();
			$("#dobPageMonth").hide();
			$("#dobPageDay").hide();
			if (messageId != "" ){
				objMessageId.innerHTML = '<span class="text_single_element">' + enterAppTime + '</span>';
			}
			enterAppTimeState = true;
			showInput();
			$(objAddButtonId).show();
			writeDebugInfo("Multiple appointments found requesting additional input");
		}
		else {
			debugMsg = "Found appointments";
			matchingAppointments = [];
			if (!arriveFirst) {
				// find the appointment with the entered appointment time in the list of found appointments
				enteredAppointmentTime = inputValue;
			}

			for (var i=0;i<foundAppointments.length;i++){
				startTime = foundAppointments[i].startTime.replace(/\-/g,'\/').replace(/[T|Z]/g,' ');
				appointmentDate = new Date(startTime);
				if (!arriveFirst) {
					if (appointmentDate.getHours() == parseInt(enteredAppointmentTime.substring(0,2),10)
					&& appointmentDate.getMinutes() == parseInt(enteredAppointmentTime.substring(3,5),10)){
						matchingAppointments.push(foundAppointments[i]);
					}
				} else {
					matchingAppointments.push(foundAppointments[i]);
				}
				debugMsg += ", id: " + foundAppointments[i].id + ", status: " + foundAppointments[i].status  + ", startTime: " + foundAppointments[i].startTime;
			}
			writeDebugInfo(debugMsg);
			if (matchingAppointments.length == 1 ||
				(arriveFirst === true && matchingAppointments.length > 1 && (idField === "phone" || idField === "identificationNumber"))) {
				var pos = 0;
				var foundCreated = false;
				for (var j = 0; j < matchingAppointments.length; j++){
					if (foundCreated === false && matchingAppointments[j].status === "CREATED"){
						foundCreated = true;
						pos = j;
					}
				}
				foundAppointment = matchingAppointments[pos];
			}
			else if (matchingAppointments.length > 1 ) {
				//check if different customers
				var currentCustomer = "";
				var foundCreated = false;
				for (var x = 0; x < matchingAppointments.length; x++) {
					var thisCustomer = matchingAppointments[x].customers[0].firstName + ' ' + matchingAppointments[x].customers[0].lastName;
					if (thisCustomer !== currentCustomer && currentCustomer != "") {
						wwClient.switchHostPage(pageNotFound);
						return;
					}
					if (arriveFirst) {
						// if arrive first
						if (foundCreated === false && matchingAppointments[x].status === "CREATED"){
							foundCreated = true;
							// set first matching appointment
							foundAppointment = matchingAppointments[x];
						}
					}
					currentCustomer = thisCustomer;
				}
				multipleAppointmentsFound = true;
				enterAppTimeState  = false;
			}
			else {
				writeDebugInfo("Final, no appointment found");
				wwClient.switchHostPage(pageNotFound);
			}
		}
	}
	else if (foundAppointments.length == 1){
		// check the status of the appointment
		foundAppointment = foundAppointments[0];

	}
	else {
		foundAppointment = null;
	}

	if (foundAppointment != null){

		startTime = foundAppointment.startTime.replace(/\-/g,'\/').replace(/[T|Z]/g,' ');
		appointmentDate = new Date(startTime);
		writeDebugInfo("Appointment found Date is: " + appointmentDate + " - startTime: " + startTime );

		if (idField == "QWebBookId" && detectedString=="QWebBookId") {
			if (parseInt(matchAppTime.substring(0,2),10) != appointmentDate.getHours() || parseInt(matchAppTime.substring(2,4),10) !=appointmentDate.getMinutes()){
				writeDebugInfo("QWebBookId found but last 4 digits does not match appointment time");
				wwClient.switchHostPage(pageNotFound);
				return;
			}
		}

		if (foundAppointment.status != 'CREATED' || (branchList.length < 2 && parseInt(branchId,10) != parseInt(foundAppointment.branchId , 10))){
			writeDebugInfo("Found appointment status: " + foundAppointment.status + ", Current branchId: " + branchId + " - Appointment branchId: " + foundAppointment.branchId);
			wwClient.switchHostPage(pageNotFound);
			return;
		}

		if (now.getTime() < appointmentDate.getTime() - Number(minutesEarly)*60000){
			wwClient.switchHostPage(pageTooEarly);
			writeDebugInfo("Appointment arrived to early");
			return;
		}
		if (now.getTime() > appointmentDate.getTime() + Number(minutesLate)*60000){
			wwClient.switchHostPage(pageTooLate);
			writeDebugInfo("Appointment arrived to late");
			return;
		}
		var params = {};
		params.appointmentId = foundAppointment.id;
		params.parameters = {};

		for (var key in appCacheData){
			if ( appCacheData[key] !== "" ) {
				params.parameters[key] = appCacheData[key];
			}
		}

		if ( foundAppointment.properties.notes != null && foundAppointment.properties.notes != undefined) {
			note = foundAppointment.properties.notes
			if (browserOpera == true){
				// old Opera browser detected replace \n for space
				note = note.replace(/\\n/g, "");
				// replace \ for space
				note = note.replace(/\\/g, "");
			}
			params.parameters.notes = note;
			params.parameters.custom1 = note;
		}
		if (foundAppointment.properties.custom){
			custom = foundAppointment.properties.custom;
			if (browserOpera == true){
				// old Opera browser detected replace \n for space
				custom = custom.replace(/\\n/g, "");
				// replace \ for space
				custom = custom.replace(/\\/g, "");
			}
			custom = JSON.parse(custom);
			if (custom[customTicketIdField]){
				if (customTicketIdField.length > 0)
					params.parameters.ticket = custom[customTicketIdField];
			}
			for (prop in custom){
				if (typeof (custom[prop]) == "string")
					params.parameters[prop] = custom[prop];
				else
					params.parameters[prop] = JSON.stringify(custom[prop]);
			}
		}

		if(ticketNbrIsIdField) {
			if (idField == "id4lastdigits") {
				params.parameters.ticket = String(foundAppointment.id).slice(-4);
			}
		}

		arriveUnitId = unitId;
		if (vPrinterId > 0) {
			params.parameters.orgUnitId = unitId;
			params.parameters.branchId = foundAppointment.branchId;
			params.parameters.ticketless = false;
			arriveUnitId = getArriveUnitId(foundAppointment.branchId);
		}
		
			// check zone
		if (loadBalanceUnitNumId != ""){
			zone = sendGetWaitingAreaCommand(foundAppointment.services[0].id);
			if (zone != "") {				
				params.parameters.level = zone;
				if (zoneDelays[parseInt(zone,10)-1] != undefined) {
					if( zoneDelays[parseInt(zone,10)-1] > 0) {
// creating an appointment visit with an delay causes an error 500. Temporary removed until JIRA VM-957 and QP-13178 are resolved
		//				params.delay = zoneDelays[parseInt(zone,10)-1];
					}
				}
				for (var a = 0; a < zoneElementObj.length; a++){
					if (zoneElementObj[a] != null && zoneNames[parseInt(zone,10)-1] != undefined){
						zoneElementObj[a].html('<span class="text_single_element">' + zoneNames[parseInt(zone,10)-1] + '</span>');
					}
				}
				
			}
		}

		visit = qmatic.connector.client.createVisitByUnitId(arriveUnitId, params);

		if (typeof visit != 'undefined' && visit != null){
			// show the ticket id
			for (var a = 0; a < ticketElementObj.length; a++){
				if (ticketElementObj[a] != null){
					ticketElementObj[a].html('<span class="text_single_element">' + visit.ticketId + '</span>');
				}
			}
			wwClient.switchHostPage(arrivedPage);
			writeDebugInfo("Succesfully arrived appointment id : " + params.appointmentId + " on Unit: " + arriveUnitId);
		} else {
			wwClient.switchHostPage(pageNotFound);
			writeDebugInfo("Could not arrive appointment id : " + params.appointmentId + " on Unit: " + arriveUnitId);
		}
	}
	else {
		if (multipleAppointmentsFound){
			// Even after having asked for the appointment time, we still have multiple appointments.
			wwClient.switchHostPage(pageMultiple);
			// resetting for the next attempt
			multipleAppointmentsFound = false;
			writeDebugInfo("Even after having asked for the appointment time, we still have multiple appointments.");
		}
		else if (!enterAppTimeState){
			// this means we have already asked for the appointment time, but haven't found an appointment with the entered time
			// resetting for the next attempt
			writeDebugInfo("Final, no appointment found");
			wwClient.switchHostPage(pageNotFound);
			
		}
	}
}

function getArriveUnitId(br){
	var printUnitId = unitId;
	for (var x = 0; x < branchList.length; x++){
		if (parseInt(branchList[x].id,10) === parseInt(br,10) ) {
			printUnitId =  branchList[x].printUnitId;
		}
	}
	return printUnitId;
}

function getAppointmentsByETerminId(eTerminId) {
	var foundAppointments = [];
	var todaysAppointments = qmatic.connector.client.getAppointmentsForBranch(branchId);

	for ( i = 0; i < todaysAppointments.length; i++) {
		if ( todaysAppointments[i].customers.length > 0 ) {
			if ( todaysAppointments[i].properties.custom ) {
				var customData = todaysAppointments[i].properties.custom;
				customDataObj = JSON.parse(customData);

				if ( Number(customDataObj["activationData"]) == Number(eTerminId) || Number(customDataObj["activationLinkedData"]) == Number(eTerminId) ) {
					foundAppointments.push(todaysAppointments[i]);
				}
			}
		}
	}

	return foundAppointments;
}

// ---------------------------------------------------------------------
// -------------------------------keyboard------------------------------
// ---------------------------------------------------------------------

function addChar(character) {
	if (enterAppTimeState){
		if (inputValue.length < 5){
			inputValue += character;
		}
		if (inputValue.length == 2){
			inputValue += ":";
		}
	}
	else {
		if (inputValue.length < maxInput){
			inputValue += character;
		}
	}
	showInput();
}

function deleteChar() {
	inputValue = inputValue.substring(0, inputValue.length - 1);
	if (inputValue.length == 0) {
		// 2021-01-12 josarm.
		// reset();
	}
	showInput();
}

function clearChar() {
		reset();
}

function showInput() {

	showPhoneErrorValidationText("");
	showIdlast4digitsErrorValidationText("");
	if(enterAppTimeState){
		placeHolder="hh:mm";
		maskedValue = inputValue;
	}
	else{
		placeHolder="";
		if (maskInput){
			nrStars = inputValue.length -1;
			maskedValue = "";
			for (var i=0;i<nrStars;i++)
				maskedValue += "*";
			maskedValue += inputValue.substring(inputValue.length-1);
		}
		else
			maskedValue = inputValue;
	}

	// date of birth keypad input modification
	if(inputIdField == "dob" && dateOfBirthInputType == "keyboard") {

		if(!enterAppTimeState) {
			$(objMonthId).show();
			$(objDayId).show();
			$(objYearId).show();
			maskedValue = maskedValue.substring(0, 8);

			//Case 1: MM-DD-YYYY
			if(dateOfBirthInputFormat == "MM-DD-YYYY") {
				if(maskedValue.length < 2) {
					yearValue = "";
					monthValue = maskedValue;
					dayValue = "";
				}
				else if(maskedValue.length < 4) {
					yearValue = "";
					monthValue =  maskedValue.substring(0, 2);
					dayValue = maskedValue.substring(2, maskedValue.length);
				}
				else {
					yearValue = maskedValue.substring(4, maskedValue.length);
					monthValue =  maskedValue.substring(0, 2);
					dayValue = maskedValue.substring(2, 4);
				}
			}
			//Case 2: DD-MM-YYYY
			else if(dateOfBirthInputFormat == "DD-MM-YYYY") {
				if(maskedValue.length < 2) {
					yearValue = "";
					monthValue = "";
					dayValue = maskedValue;
				}
				else if(maskedValue.length < 4) {
					yearValue = "";
					monthValue = maskedValue.substring(2, maskedValue.length);
					dayValue = maskedValue.substring(0, 2);
				}
				else {
					yearValue = maskedValue.substring(4, maskedValue.length);
					monthValue = maskedValue.substring(2, 4);
					dayValue = maskedValue.substring(0, 2);
				}
			}
			//Case 3: YYYY-MM-DD
			else if(dateOfBirthInputFormat == "YYYY-MM-DD") {
				if(maskedValue.length < 4) {
					yearValue = maskedValue;
					monthValue = "";
					dayValue = "";
				}
				else if(maskedValue.length < 6) {
					yearValue = maskedValue.substring(0, 4);
					monthValue =  maskedValue.substring(4, maskedValue.length);
					dayValue = "";
				}
				else {
					yearValue = maskedValue.substring(0, 4);
					monthValue =  maskedValue.substring(4, 6);
					dayValue = maskedValue.substring(6, maskedValue.length);
				}
			}
			//Case 4: YYYY-DD-MM
			else if(dateOfBirthInputFormat == "YYYY-DD-MM") {
				if(maskedValue.length < 4) {
					yearValue = maskedValue;
					monthValue = "";
					dayValue = "";
				}
				else if(maskedValue.length < 6) {
					yearValue = maskedValue.substring(0, 4);
					monthValue =  "";
					dayValue = maskedValue.substring(4, maskedValue.length);
				}
				else {
					yearValue = maskedValue.substring(0, 4);
					monthValue = maskedValue.substring(6, maskedValue.length);
					dayValue = maskedValue.substring(4, 6);
				}
			}

			inputValue = maskedValue;
		}
		else {
			$(objYearId).hide();
			$(objMonthId).hide();
			$(objDayId).hide();
			$(objInputId).show();
		}
	}

	if (intro8){
		html = '<span class="text_single_element"><input value="' + maskedValue + '" id="customer-mask-input" style="'+origInputStyle + '"></span>';
		monthHtml = '<span class="text_single_element"><input value="' + monthValue + '" id="customer-mm-input" style="'+origInputStyle + '"></span>';
		dayHtml = '<span class="text_single_element"><input value="' + dayValue + '" id="customer-dd-input" style="'+origInputStyle + '"></span>';
		yearHtml = '<span class="text_single_element"><input value="' + yearValue + '" id="customer-yy-input" style="'+origInputStyle + '"></span>';

	} else {
		html = '<span class="text_single_element"><input value="' + maskedValue + '" placeholder="'+placeHolder+'" id="customer-mask-input" style="'+origInputStyle + '"></span>';
		monthHtml = '<span class="text_single_element"><input value="' + monthValue + '" placeholder="'+monthPlaceholder+'" id="customer-mm-input" style="'+origMonthStyle + '"></span>';
		dayHtml = '<span class="text_single_element"><input value="' + dayValue + '" placeholder="'+dayPlaceholder+'" id="customer-dd-input" style="'+origDayStyle + '"></span>';
		yearHtml = '<span class="text_single_element"><input value="' + yearValue + '" placeholder="'+yearPlaceholder+'" id="customer-yy-input" style="'+origYearStyle + '"></span>';
	}

	if (inputId != ""){
		objInputId.innerHTML = html;
	}
	if (monthId != "") {
		objMonthId.innerHTML = monthHtml;
	}
	if (dayId != "") {
		objDayId.innerHTML = dayHtml;
	}
	if (yearId != "") {
		objYearId.innerHTML = yearHtml
	}
}

// ---------------------------------------------------------------------
// -------------------------------barcodescanner------------------------------
// ---------------------------------------------------------------------
var processing = false;
var readBlock;
var keyReceived = "";

function keyPressReceived() {
	console.log("KeyPress Widget: " + widgetPage);
	if (barcodeEnabled === true || currentPage == widgetPage || currentPage == barcodePage) {
		if (keyReceived.length === 1  && keyReceived != "#" && keyReceived != "*"){
			addChar (keyReceived);
		}

		if (keyReceived.length === 1  && keyReceived == "#" && currentPage == widgetPage){
			confirmAppointmentByKeyBoard();
		}
		if (keyReceived.length > 1 ) {
			barcodeScanned(keyReceived);
		}
	}
	processing = false;
	keyReceived = "";
}

function keyEventReceived(evt){
		clearTimeout(readBlock)
		var charCode = evt.keyCode || evt.which;
		var charStr = String.fromCharCode(charCode);
		if (charCode !== 13) {
			keyReceived += charStr;
		}
		if(!processing && keyReceived.length > 1) {
		barcodeProcessing();
		}
		readBlock = setTimeout (keyPressReceived, 500);
}

function barcodeProcessing() {
	if (barcodeEnabled === true || currentPage == widgetPage) {
		wwClient.switchHostPage(barcodePage);
		processing = true;
	}
}

function barcodeScanned(valFromScan) {
	var val = valFromScan;
	processing = false;
	writeDebugInfo("Arrival Widget: received value from div - " + valFromScan);
	var tempInputValue = val.substring(barcodeStart, (barcodeEnd == -1 ? val.length : barcodeEnd));
	if (tempInputValue.length > 1) {
		objInputId.innerHTML = "";
		inputValue = tempInputValue;
		inputValue = inputValue.replace(/\\/g, '');
		writeDebugInfo("Arrival Widget: Barcode scanned, processing value: " + inputValue);
		confirmAppointmentId("barcode");
	} else {
		writeDebugInfo("Arrival Widget: Key pad used, will ingnore value: " + tempInputValue);
	}
}

// -------------------------------------------------------------------------
// ------------------------------- QR code ---------------------------------
// -------------------------------------------------------------------------

function initQRCodeReader() {
    qrWebSocket = new WebSocket('ws://127.0.0.1:7010/ScanAndDecode', 'decoder');
    
    qrWebSocket.addEventListener('open', () => {
        writeDebugInfo('QR Code WebSocket connection opened');
        startScanning();
    });

    qrWebSocket.addEventListener('message', (event) => {
        handleQRMessage(event.data);
    });

    qrWebSocket.addEventListener('close', () => {
        writeDebugInfo('QR Code WebSocket connection closed');
        isScanning = false;
    });


    qrWebSocket.addEventListener('error', (error) => {
        writeDebugInfo('QR Code WebSocket error: ' + error);
        isScanning = false;
    });
}

function startScanning() {
    if (!qrWebSocket || isScanning) return;

    const startCommand = {
        "ID": Date.now().toString(),
        "Event": "Start",
        "Param": {
            "ScanType": "Normal",
            "EANSupport": true,
            "Preview": true,
            "Timeout": 30,
            "Brightness": 0,
            "WhiteLEDIntensity": 55,
            "RedLEDOnOFF": false,
            "SDKLogsState": false,
            "MirrorFlip": false,
            "ScanInterval": 5,
            "DefaultPreview": false
        }
    };

    qrWebSocket.send(JSON.stringify(startCommand));
    isScanning = true;
}

function stopScanning() {
    if (!qrWebSocket || !isScanning) return;

    const stopCommand = {
        "ID": Date.now().toString(),
        "Event": "Stop"
    };

    qrWebSocket.send(JSON.stringify(stopCommand));
    isScanning = false;
}

function handleQRMessage(data) {
    try {
        const message = JSON.parse(data);
        writeDebugInfo('Received QR message: ' + JSON.stringify(message));

        // Handle scan result
        if (message.Event === "Response") {
            if (message.Result?.Format?.contains("ERROR")) {
                writeDebugInfo("QR Command failed: " + message.Result.Message);
            } else if (message.Result?.Format?.contains("Decoded")) {
                const scannedData = message.Result.Text;
				inputValue = scannedData;
				writeDebugInfo("QR Code scanned, processing value: " + inputValue);
				confirmAppointmentId("qrcode");
            } else {
                writeDebugInfo("Event response: " + JSON.stringify(message.Result));
            }
        }
    } catch (error) {
        writeDebugInfo("Error processing QR message: " + error);
    }
}

// -------------------------------------------------------------------------
// -- findAppointment function added since stuff is missing in the rest-api.js
// -------------------------------------------------------------------------

findAppointment = function(_params){
	var params = _params ? _params : {};
	var request = new REST.Request();
	request.setMethod('GET');
	var uri = params.$apiURL ? params.$apiURL : REST.apiURL;
	uri += '/widgetconnector/appointments';
	if (params.id)
		request.addMatrixParameter('id', params.id);
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
		request.setContentType('text/plain');
	if(params.$callback){
		request.execute(params.$callback);
	}else{
		var returnValue;
		var appValue;
		request.setAsync(false);
		var callback = function(httpCode, xmlHttpRequest, value){ returnValue = value;};
		request.execute(callback);
		if (returnValue != undefined){
			appValue = returnValue[0];
		}
		return appValue;
	}
};

//Create an array with all branchId's according the departmentId
function getBranchList() {
	if (vPrinterId > 0) {
		wwRest.getBranches().forEach(function(branch) {
			if (branch.id != branchId) {
				var printer = wwRest.getEntryPoint(branch.id, vPrinterId) || {id: null};
				if (printer) {
					var br = wwRest.getBranch(branch.id);
					branchList.push({id: branch.id, timeZone: br.timeZone, printUnitId :printer.unitId});
				}
			}
		});
	}
};

function fetchAppointments() {
	if(branchList.length > 0) {
		branchList.forEach(function(branch) {
			wwRest.getAppointmentsForBranch(branch.id).forEach(function(app) {
				if (app.status == "CREATED") {
					todaysAppointments.push(app);
				}
			});
		});
	}
}

function writeDebugInfo(msg) {
	msg =  unitId + "(" + version +"): " + msg
	if (develop == true) {
		qmatic.webwidget.client.logInfo(msg);
	} else {
		if (agentDebug == true) {
			sendUnitEvent(debugUnit, msg);
		}
	}
}

function sendGetWaitingAreaCommand(serv){
	params = {};
	params.name = "CUSTOM_GET_WAITINGAREA";
	params.type = "CFM";
	params.parameters ={"serviceId":serv,"serviceType" : "appointment"};
	zone = ""
	cmdResult = customUnitCommand(loadBalanceUnitNumId, params);
	if ( cmdResult != undefined && cmdResult != null) {
		if (cmdResult.result != undefined) {
			zone =  cmdResult.result
		}
	}
	return zone;
}
