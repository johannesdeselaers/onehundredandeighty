// The term "semester-view" refer to the upper list, the list of courses which are currently chosen in a specific semester
// The term "courses-pool" refers to the lists of courses, that are currently not chosen, so the lower list
/* use strict-mode provided by ecma-script5, see http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/ for details */
"use strict";

$("header img").click(function() {
	localStorage.clear();
	location.reload();

});

var frontend = {
	/* filterManager controls the possibility to filter the courses-pool */
	filterManager: {
		/* saves all possibly selectable semesters */
		possibleSemesters: semesterManager.shownSemesters,
		/* saves the semesters, which are currently selected by the filter */
		selectedSemesters: semesterManager.shownSemesters,
		/* rest accordingly .. */
		possibleModule: studyRegulations.module,
		selectedModule: studyRegulations.module,
		possibleVertiefungsgebiete: studyRegulations.vertiefungsgebiete,
		selectedVertiefungsgebiete: studyRegulations.vertiefungsgebiete,
		possibleWahlpflicht: ["Pflicht", "Wahl"],
		selectedWahlpflicht: ["Pflicht", "Wahl"],
		/*
		 * Used to determine, whether a special course should be displayed according to its semester.
		 * That means, there is at least one course selected the current course is/was offered in.
		 * True, when course should be displayed.
		 */
		checkSemester: function(key) {
			// key is the array index to one course in data
			var copy = this.selectedSemesters.slice();
			for (var i = 0; i < copy.length; i += 1) {
				// if semester is in the future, reset it to the last winter/summer-semester
				if (semesterManager.semesters.indexOf(copy[i]) > semesterManager.semesters.indexOf(semesterManager.current)) {
					if (copy[i].indexOf("SS") >= 0)
						copy[i] = semesterManager.lastSummerSemester;
					else if (copy[i].indexOf("WS") >= 0)
						copy[i] = semesterManager.lastWinterSemester;
					else
						console.error("Something is wrong with the semester-time. Check data!");
				}
			}
			return copy.haveIntersection(data[key].semester);
		},
		/* see checkSemester for documentation, same procedure */
		checkModule: function(key) {
			return this.selectedModule.haveIntersection(data[key].modul);
		},
		/* see checkSemester for documentation, same procedure */
		checkVertiefungsgebiete: function(key) {
			if (data[key].vertiefung[0] === "") return true;
			return this.selectedVertiefungsgebiete.haveIntersection(data[key].vertiefung);
		},
		/* see checkSemester for documentation, same procedure */
		checkWahlpflicht: function(key) {
			// if both 'Wahl' and 'Pflicht' are in the array, its always true
			if (this.selectedWahlpflicht.indexOf("Wahl") !== - 1 && this.selectedWahlpflicht.indexOf("Pflicht") !== - 1) return true;
			// if its only 'Pflicht' return true, when the course is 'Pflicht'
			else if (this.selectedWahlpflicht[0] === "Pflicht") return data[key].pflicht;
			// if its only 'Wahl' return true, when the course is not 'Pflicht'
			else if (this.selectedWahlpflicht[0] === "Wahl") return ! data[key].pflicht;
			// if nothing is selected, return false
			return false;
		},
		filter: function() {
			$("#courses-pool > ul li").each(function() {
				// .slice(7) to remove foregoing "course-" from id
				var key = $(this).attr("id").slice(7);

				var show = frontend.filterManager.checkSemester(key) && frontend.filterManager.checkWahlpflicht(key) && frontend.filterManager.checkModule(key) && frontend.filterManager.checkVertiefungsgebiete(key);
				if (show === false) {
					$(this).addClass("hidden");
				}
				else {
					$(this).removeClass("hidden");
				}
			});
			frontend.sortPool();
		}
	},
	/* saveManager saves the current status via Web-Storage */
	saveManager: {
		save: function() {
			var courseToSemester = {};
			for (var key in data) {
				if (!data.hasOwnProperty(key)) continue;
				courseToSemester[key] = frontend.getSemester(key);
			}
			// SAVE data
			localStorage.hasData = true;
			localStorage.courseToSemester = JSON.stringify(courseToSemester);
			localStorage.filterManager = JSON.stringify(frontend.filterManager);
			localStorage.semesters = JSON.stringify(semesterManager.shownSemesters);
			localStorage.checkPermanently = frontend.checkPermanently;
			localStorage.allMessagesVisible = frontend.allMessagesVisible;
		}
	},
	/* used to display information about possible Vertiefungsgebiete */
	makeVertiefungsgebieteTable: function(possibilities) {
		var table = "<table>";
		table += "<tr><td></td><td>Vertiefungsgebiete</td><td>Lehrveranstaltungen</td><td>aktuell belegte<br />Leistungspunkte</td><td>Vorlesung/en<br />in diesem Gebiet</td></tr>";
		for (var i = 0; i < possibilities.length; i += 1) {
			var possibility = possibilities[i];

			// at first, do some calculation stuff, so collect all courses, creditpoints and lectures
			var first = [];
			var second = [];
			var firstCP = 0,
			secondCP = 0;
			for (var j = 0; j < possibility.length; j += 1) {
				var course = possibility[j];
				if (course.vertiefung === possibility.vertiefungPair[0]) {
					first.push(data[course.key].kurz.replace(/<br \/>/g, " "));
					firstCP += data[course.key].cp;
				}
				else if (course.vertiefung === possibility.vertiefungPair[1]) {
					second.push(data[course.key].kurz.replace(/<br \/>/g, " "));
					secondCP += data[course.key].cp;
				}
			}
			var firstLectures = [];
			var secondLectures = [];
			for (var j = 0; j < possibility.firstVertiefungLectures.length; j += 1)
			firstLectures.push(possibility.firstVertiefungLectures[j].kurz); //.replace(/<br \/>/g, " "));
			for (var j = 0; j < possibility.secondVertiefungLectures.length; j += 1)
			secondLectures.push(possibility.secondVertiefungLectures[j].kurz); //.replace(/<br \/>/g, " "));

			table += "<tr><td rowspan='2'>Variante " + (i + 1).toString() + "</td>";

			// now display first Vertiefungsgebiet
			table += "<td>" + possibility.vertiefungPair[0] + "</td>";
			table += "<td><ul>" + first.reduce(function(prev, current) {
				return prev + "<li>" + current + "</li>";
			},
			"") + "</ul></td>";
			table += "<td>" + firstCP + "</td>";
			table += "<td>" + firstLectures.join(", ") + "</td>";

			table += "</tr><tr>";

			// now display second Vertiefungsgebiet
			table += "<td>" + possibility.vertiefungPair[1] + "</td>";
			table += "<td><ul>" + second.reduce(function(prev, current) {
				return prev + "<li>" + current + "</li>";
			},
			"") + "</ul></td>";
			table += "<td>" + secondCP + "</td>";
			table += "<td>" + secondLectures.join(", ") + "</td>";

			table += "</tr>";
		}
		table += "</table>";
		return table;
	},
	/* used to check all rules and display them in div#messages */
	checkRules: function() {
		var rules = ruleManager.checkAll();
		$("#message ul").empty();
		if (rules.numberFailedRules === 0) {
			$("#message ul").append("<li>Der Belegungsplan ist gültig!</li>");
			// animate to green
			for (var rule = 0; rule < rules.length; rule += 1) {
				var extra = '';
				if (rules[rule].type === 'vertiefungsgebieteRule') {
					var possibilities = rules[rule].extra;
					extra += '<div class="extra-inf">Folgende Kombinationen von Vertiefungsgebieten sind gültig im Sinne der Studienordnung:';
					extra += frontend.makeVertiefungsgebieteTable(possibilities);
					extra += "</div>";
					$("#message ul").append("<li>" + extra + "</li>");
				}
			}
			$("#message").animate({
				backgroundColor: '#026400'
			},
			350);
		}
		else {
			for (var rule = 0; rule < rules.length; rule += 1) {
				if (rules[rule].success === true) continue;
				var extra = '';
				if (rules[rule].type === 'sbsRule') extra = ' <a href="studienordnung.html#Softwarebasissysteme">Was bedeutet das?</a>';
				else if (rules[rule].type === 'softskillsRule') extra = ' <a href="studienordnung.html#Softskills">Was bedeutet das?</a>';
				else if (rules[rule].type === 'vertiefungsgebieteRule') {
					var possibilities = rules[rule].extra;
					extra += '<div class="extra-inf">Folgende Kombinationen von Vertiefungsgebieten sind mit genug Leistungspunkten belegt, es fehlt aber noch eine Vorlesung:';
					extra += frontend.makeVertiefungsgebieteTable(possibilities);
					extra += "</div>";
				}
				$("#message ul").append("<li>" + rules[rule].message + extra + "</li>");
			}
			// animate to red
			$("#message").animate({
				backgroundColor: '#9F0606'
			},
			350);
		}

	},
	slideMessages: function() {
		if (frontend.allMessagesVisible === true) {
			$("#slide-messages").text("△");
			var ulheight = $("#message li").length * 2;
			$("#message").css("height", "auto");
		} else {
			$("#slide-messages").text("▽");
			$("#message").css("height", "2em");
		}
		if ($("#message li").length > 1) {
			$("#slide-messages").css("visibility", "visible");
		}
		else {
			$("#slide-messages").css("visibility", "hidden");
		}
	},
	/* used when app is initializied to fill <select>s with semester-<option>s according to settings in logic.js */
	organizeSemesters: function() {
		// if shownSemesters has not been initialized so far ..
		if (semesterManager.shownSemesters.length === 0) {
			// .. initialize starting at semesterManager.startswith-Semester
			var index = semesterManager.semesters.indexOf(semesterManager.startswith);
			// do it for six semesters
			for (var i = 0; i < 6; i += 1) {
				semesterManager.shownSemesters[i] = semesterManager.semesters[index];
				index += 1;
			}
		}

		// now initialize select-boxes according to information in semesterManager.shownSemesters
		for (var i = 0; i < semesterManager.shownSemesters.length; i++) {
			// .. build options and select the correct one
			var options = "",
			selected = "";
			// fill selects with all possible semesters (possible semesters specified in semesterManager.semesters)
			for (var j = 0; j < semesterManager.semesters.length; j++) {
				// check whether the current <option> must be selected
				selected = semesterManager.shownSemesters[i] === semesterManager.semesters[j] ? " selected": "";
				options += "<option" + selected + ">" + semesterManager.semesters[j] + "</option>";
			}
			// assume, that there are no breaks while studying and go on with the following semester
			$("#selectSemester" + (i + 1).toString()).append(options);
		}
		$("#head select").change(function(eventObject) {
			var select = $(this);
			var id = $(this).attr("id");
			id = parseInt(id[id.length - 1]);
			semesterManager.updateSemester(id, this.value);
			select.children(":selected").removeAttr("selected");
			for (var i = 1; i <= semesterManager.shownSemesters.length; i += 1) {
				$("#selectSemester" + i).children().each(function() {
					if (this.value === semesterManager.shownSemesters[i - 1]) {
						$(this).attr("selected", "");
					}
				});
			}

			// now we have to update the filter to display the correct filter options
			// if a semester was changed, filter is reset
			frontend.filterManager.possibleSemesters = semesterManager.shownSemesters;
			frontend.filterManager.selectedSemesters = semesterManager.shownSemesters;

			// now update gui
			var semesterList = "";
			for (var semester in frontend.filterManager.possibleSemesters) {
				if (!frontend.filterManager.possibleSemesters.hasOwnProperty(semester)) continue;
				semesterList += "<li class='selected'>" + frontend.filterManager.possibleSemesters[semester] + "</li>";
			}
			$("#semester-filter").html(semesterList);

	

			if (frontend.checkPermanently === true) {
				frontend.checkRules();
				frontend.slideMessages();
			}
			frontend.filterManager.filter();
			frontend.saveManager.save();
		});
	},
	/* returns the currently chosen semester for a given course */
	getSemester: function(course) {
		var parent = $("#course-" + course).parent();
		if (parent.attr("id") === undefined) {
			console.log(course);
			console.log(parent);
		}
		if (parent.attr("id").substr(0, 5) === "extra") {
			return - 1;
		}
		else if (parent.attr("id").substr(0, 8) === "semester") {
			return parseInt(parent.attr("id").substr(8, 1));
		}
		console.error("Function getSemester returning invalid data!");
		return -1;
	},
	/* used, when user starts drag'n'dropping courses */
	startSorting: function() {
		$(".courses li").knubtip("disable");
	},
	/* used, when user finished drag'n'dropping courses */
	endSorting: function() {
		if (frontend.checkPermanently === true) {
			frontend.checkRules();
			frontend.slideMessages();
		}
		$(".courses li").knubtip("enable");
		frontend.saveManager.save();
	},
	/* called when user drag'n'dropped something */
	update: function() {
		frontend.sortPool();
		frontend.filterManager.filter();
	},
	/* used to sort courses pool, ensures that each stack has the same height (frontend.coursesPoolHeight) */
	sortPool: function() {
		frontend.adjustPoolHeight();
		var listitems = $("#courses-pool > ul li:not(.hidden)");

		// There can be at most frontend.coursesPoolHeight items in one stack.
		// The following to var's ensure this.
		var currentPool = 1;
		var coursesInCurrentPool = 0;

		// for each listitem
		listitems.each(function(index, listitem) {
			// listitem is li dom element, jquerify it
			listitem = $(listitem);

			// detach it from wherever it is at the moment
			listitem.detach();
			// .. put it in the courses pool taking care of frontend.coursesPoolHeight
			$("#extra" + currentPool).append(listitem);
			coursesInCurrentPool += 1;
			if (coursesInCurrentPool === frontend.coursesPoolHeight) {
				coursesInCurrentPool = 0;
				currentPool += 1;
			}
		});
	},
	/* used to adjust the height of one stack in courses-pool */
	adjustPoolHeight: function() {
		// count all visible courses
		var shownCourses = $("#courses-pool > ul li:not(.hidden)").length;
		// there are seven ul's but try to use the first six only (seventh is there, but normally not used)
		frontend.coursesPoolHeight = Math.ceil(shownCourses / 6);
		// but if showCourses is one more than a multiple of six, avoid 'Hurenkind' and use seventh as well
		//if (shownCourses % 6 === 1)
		//	frontend.coursesPoolHeight = Math.ceil(shownCourses / 6) + 1;
	},
	/* used to display informationen from an array in a nice way, used for tooltips */
	displayArray: function(value) {
		if (Array.isArray(value) && value[0] !== "") {
			return value.join(", ");
		}
		return "<em>Information fehlt</em>";
	},
	/* used to initialize course pool filter with correct selectors */
	initializeFilter: function() {
		// build semester list
		var semesterList = "<ul id='semester-filter'>";
		for (var semester in frontend.filterManager.possibleSemesters) {
			if (!frontend.filterManager.possibleSemesters.hasOwnProperty(semester)) continue;
			var selected = frontend.filterManager.selectedSemesters.indexOf(frontend.filterManager.possibleSemesters[semester]) === - 1 ? "": " class='selected'";
			semesterList += "<li" + selected + ">" + frontend.filterManager.possibleSemesters[semester] + "</li>";
		}
		semesterList += "</ul>";
		semesterList = $(semesterList);

		// build module list
		var moduleList = "<ul id='module-filter'>";
		for (var modul in frontend.filterManager.possibleModule) {
			if (!frontend.filterManager.possibleModule.hasOwnProperty(modul)) continue;
			var selected = frontend.filterManager.selectedModule.indexOf(frontend.filterManager.possibleModule[modul]) === - 1 ? "": " class='selected'";
			moduleList += "<li" + selected + ">" + frontend.filterManager.possibleModule[modul] + "</li>";
		}
		moduleList += "</ul>";
		moduleList = $(moduleList);

		// build vertiefungsgebiete list
		var vertiefungsgebieteList = "<ul id='vertiefungsgebiete-filter'>";
		for (var vertiefungsgebiet in frontend.filterManager.possibleVertiefungsgebiete) {
			if (!frontend.filterManager.possibleVertiefungsgebiete.hasOwnProperty(vertiefungsgebiet)) continue;
			var selected = frontend.filterManager.selectedVertiefungsgebiete.indexOf(frontend.filterManager.possibleVertiefungsgebiete[vertiefungsgebiet]) === - 1 ? "": " class='selected'";
			vertiefungsgebieteList += "<li" + selected + ">" + frontend.filterManager.possibleVertiefungsgebiete[vertiefungsgebiet] + "</li>";
		}
		vertiefungsgebieteList += "</ul>";
		vertiefungsgebieteList = $(vertiefungsgebieteList);

		// build wahlpflicht list
		var wahlpflichtList = "<ul id='wahlpflicht-filter'>";
		for (var wahlpflicht in frontend.filterManager.possibleWahlpflicht) {
			if (!frontend.filterManager.possibleWahlpflicht.hasOwnProperty(wahlpflicht)) continue;
			var selected = frontend.filterManager.selectedWahlpflicht.indexOf(frontend.filterManager.possibleWahlpflicht[wahlpflicht]) === - 1 ? "": " class='selected'";
			wahlpflichtList += "<li" + selected + ">" + frontend.filterManager.possibleWahlpflicht[wahlpflicht] + "</li>";
		}
		wahlpflichtList += "</ul>";
		wahlpflichtList = $(wahlpflichtList);

		// append built ul to correct div
		$("#semester_wahlpflicht").append(semesterList).append(wahlpflichtList);
		$("#module_vertiefungsgebiete").append(moduleList).append(vertiefungsgebieteList);
	},
	/* selector for droppables */
	coursesList: ".courses",
	/* when a li has this class it cannot be dragged */
	disabledClass: "disabled",
	/* true, when all error messages are visible in drop down list */
	allMessagesVisible: false,
	/* when true, rules are checked permanently */
	checkPermanently: false,
	/* number of list items in one list in unchosen lists */
	coursesPoolHeight: 8
};

// note: $(function () ...) is the same as $(document).ready(function () ..)
$(function() {
	/* initialize rule manager with function, which returns the currently chosen semester for a specific course */
	ruleManager.init(frontend.getSemester);

	/* initialize check permanently checkbox */
	$("#checkbox-div ul").knubselect({
		// change is raised when the selection changed
		change: function(selected, id) {
			if (selected.length === 1) {
				frontend.checkPermanently = true;
				$("#button-div").fadeOut(100);
				frontend.checkRules();
				frontend.slideMessages();
			}
			else {
				frontend.checkPermanently = false;
				$("#button-div").fadeIn(100);
			}
			frontend.saveManager.save();
		}
	});

	/* apply check routine on button click */
	$("button#check").click(function() {
		frontend.checkRules();
		frontend.slideMessages();
		frontend.checkPermanently = true;
		$("#permacheck li").attr("class", "selected");
		$("#checkbox-div").css("visibility", "visible");
		$("#button-div").css("visibility", "visible");
		localStorage.alreadyChecked = true;
		frontend.saveManager.save();
	});

	/* apply check routine on button click */
	$("button#recheck").click(function() {
		frontend.checkRules();
		frontend.slideMessages();
		frontend.saveManager.save();
	});

	/* add click handler for slide button to show messages */
	$("#slide-messages").click(function() {
		frontend.allMessagesVisible = ! frontend.allMessagesVisible;
		frontend.slideMessages();
		frontend.saveManager.save();
	});

	/* apply jquery drag'n'dropping */
	$(frontend.coursesList).sortable({
		connectWith: frontend.coursesList,
		// specifies lists where li's can be dropped
		placeholder: "placeholder-highlight",
		// css class for placeholder when drag'n dropping
		cancel: "." + frontend.disabledClass,
		// elements matching this selector cannot be dropped
		update: frontend.update,
		// raised, when there was a change while sorting
		start: frontend.startSorting,
		// raised, when sorting starts
		stop: frontend.endSorting // raised, when sorting is finished
	}).disableSelection(); // disableSelection makes text selection impossible
	var filtering = false;
	/* apply filter routine on filter-button-div click */
	$("#filter-button").click(function() {
		if (filtering) {
			$(this).children("h2").text("Filter");
			$("#filter").animate({
				width: '0'
			},
			250);
		}
		else {
			$(this).children("h2").text("Fertig");
			$("#filter").animate({
				width: '100%'
			},
			250);
		}
		filtering = ! filtering;
	});

	if (localStorage.hasData === "true") {
		frontend.checkPermanently = localStorage.checkPermanently === "true";
		frontend.allMessagesVisible = localStorage.allMessagesVisible === "true";

		semesterManager.shownSemesters = JSON.parse(localStorage.semesters);

		frontend.filterManager = $.extend(frontend.filterManager, JSON.parse(localStorage.filterManager));
		if (frontend.checkPermanently) $("#permacheck li").attr("class", "selected");
		else $("#button-div").fadeIn(100);
	}

	/* initialize <select>'s with correct semesters from logic (see logic.js) */
	frontend.organizeSemesters();

	/* initialize filter with correct settings */
	frontend.initializeFilter();

	/* initialize selectables for filter div */
	$("#filter-options ul").knubselect({
		// change is raised when the selection changed
		change: function(selected, id) {
			// TODO: Filter when dropped to #courses-pool.
			// according to the ul, where the selection change happened, update selected
			if (id === "semester-filter") {
				frontend.filterManager.selectedSemesters = selected;
			} else if (id === "wahlpflicht-filter") {
				frontend.filterManager.selectedWahlpflicht = selected;
			} else if (id === "module-filter") {
				frontend.filterManager.selectedModule = selected;
			} else if (id === "vertiefungsgebiete-filter") {
				frontend.filterManager.selectedVertiefungsgebiete = selected;
			}
			frontend.filterManager.filter();
			frontend.saveManager.save();
		}
	});
	/*
	 * Information:
	 * var data is imported from data.js
	 * It is an object containing all relevant informationen about courses.
	 */

	// for each course in data
	for (var key in data) {
		if (!data.hasOwnProperty(key)) continue;
		// build list item and associated .info for tooltip
		var course = data[key];
		var courseInfo = "<div class='info'>" + "<h3>" + course['nameLV'] + "</h3>" + "<div>" + "<table>" + "<tr><td>Modul</td><td>" + frontend.displayArray(course['modul']) + "</td></tr>" + "<tr><td>Dozent/en</td><td>" + frontend.displayArray(course['dozent']) + "</td></tr>" + "<tr><td>Credit Points</td><td>" + course['cp'] + " Leistungspunkte</td></tr>" + "<tr><td>Lehrform</td><td>" + frontend.displayArray(course['lehrform']) + "</td></tr>" + "<tr><td>Vertiefungsgebiet/e</td><td>" + frontend.displayArray(course['vertiefung']) + "</td></tr>" + "</table>" + "</div>" + "</div>";
		var oneliner = "";
		// if item contains no newline break, apply specific css class (which sets line-height higher, so text is vertically aligned)
		if (course['kurz'].indexOf("<br />") === - 1) {
			oneliner = " class='oneliner'";
		}
		var html = $("<li" + oneliner + " id='course-" + key + "'>" + course['kurz'] + "<button>ⴲ</button>" + courseInfo + "</li>");

		// now the element has been created, decide where to put it on the page
		if (localStorage.courseToSemester !== undefined && localStorage.courseToSemester !== null) {
			var semester = JSON.parse(localStorage.courseToSemester)[key];
			if (semester === undefined || semester === - 1) $("#extra1").append(html);
			else if (semester >= 0) $("#semester" + JSON.parse(localStorage.courseToSemester)[key]).append(html);
		}
		else {
			// if it is not recommended for a specific semester ..
			if (course['empfohlen'] === "") {
				// .. put it in the courses pool
				// for now, putting in the first ul is ok, because whole courses-pool will be rearranged afterwards
				$("#extra1").append(html);
			}
			// if it is recommended for a specific semester ..
			else {
				// .. just put it there.
				$("#semester" + course['empfohlen']).append(html);
			}
		}
	}
	// until now, all courses are in the first ul. now adjust pool height and sort pool.
	frontend.sortPool();

	/* apply click routine for buttons which disable possibility to drag it */
	$(".courses li button").click(function() {
		$(this).parent().toggleClass("disabled"); // disable list element, when button in list element is clicked
	});

	/* initialize tooltips for all courses */
	$(".courses li").knubtip("init"); // activate tooltip for li elements (see jquery.knubtip.js)
	frontend.filterManager.filter();
	if (localStorage.alreadyChecked === "true") {
		frontend.checkRules();
		frontend.slideMessages();
		$("#checkbox-div").css("visibility", "visible");
		$("#button-div").css("visibility", "visible");
	}
});
