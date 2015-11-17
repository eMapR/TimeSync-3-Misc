					
			//////////DEFINE GLOBAL VARIABLES/////////////////////////////////////////////////////////						
			var n_stdev = 2,
				data = {}, // = getJson("./test3.json"), //get the data
				allData = {},
				len = 0, // = Object.keys(data.Values).length, //get the number of years
				specIndex = "TCW", //default index to display	
				rgbColor,
				jsonDataURL = "./test4.json",
				jsonAllDataURL = "./allValues.json";
			
			/////////////DEFINE FUNCTIONS////////////////////////////////////////////////////////////////
			
			//function to retrieve json data
			$.getJSON(jsonDataURL).done(function(jsonobject){				
				len = jsonobject.Values.length; // NEEDS TO BE A GLOBAL VARIABLE
				data = calcIndices(jsonobject);
				rgbColor = scaledRGB(data, "TCB", "TCG", "TCW", stretch, 2, len); //get the scaled rgb color
								
				$.getJSON(jsonAllDataURL).done(function(jsonobject){					
					allData = calcIndices(jsonobject);					
					calcD3date();
					plotInt();	
				});
			});
	
			//define function to update the circle selection
			function changeSelectedClass(seriesIndex){
				thisCircle = $("circle.data").eq(seriesIndex);
				thisCanvas = $(".chipHolder").eq(seriesIndex);
				var status = thisCircle.attr("class");
				if(status == "data unselected"){
					thisCircle.attr("class","data selected");
					thisCanvas.addClass("selected");
					changePlotLine();						
				} else {
					thisCircle.attr("class","data unselected");
					thisCircle.css("stroke","none");
					thisCanvas.removeClass("selected");
					thisCanvas.css("border-color","white");
					changePlotLine();
				}
				setSelectedColor();					
			}

			//make the trajectory svg circles selectable
			$(document).ready(function(){
				$(document).on("dblclick", "circle.data, .chipImg", function(e){ //need to use this style event binding for elements that don't exisit yet - these lines will run before the "circle" elements are created, alternatively could use the commented lines in the above jquery section
					//if(e.shiftKey){
						if($("tr").hasClass("active") == false){
							e.preventDefault(); //make sure that default browser behaviour is prevented
							var nodeType = $(this).prop('nodeName')
							if(nodeType == "circle"){
								var seriesIndex = $("circle.data").index(this);
							} else{
								var seriesIndex = $(".chipImg").index(this);
							}
							if(seriesIndex != 0 &&  seriesIndex != len-1){
								changeSelectedClass(seriesIndex)
							}					
						}
					//}
				});
			});
			
			
			//define function to add and remove line segments
			var selectedCircles = [] //global
			function changePlotLine(){
				var selectedCirclesTemp = $("circle.selected"),
					lineData = [],
					i = 0;
				selectedCircles = [];
				for(i; i < selectedCirclesTemp.length; i++){
					var thisone = $("circle.data").index(selectedCirclesTemp[i]);
					selectedCircles.push(thisone);
					lineData.push({"x":data.Values[thisone].Year, "y":data.Values[thisone][specIndex]});
				}
				
				$("#plotLine").remove();				//add the default line
				//make the line function to convert the xy object to svg path syntax 
				//var lineFunction = d3.svg.line() //TODO: CHECK IF THIS NEEDS TO BE A GLOBAL VARIABLE OR NOT
				//	.x(function(d){return xscale(d.x);})
				//	.y(function(d){return yscale(d.y);})
				//	.interpolate("linear");
				
				lineGraph = svg.append("path")
					.attr("d", lineFunction(lineData))
					.attr("id","plotLine")
					.attr("clip-path", "url(#clip)");
				
				//define the zooming function - what gets scaled on zoom 
				function zoomed() {
					svg.select(".y.axis").call(yaxis);
					svg.selectAll("circle").attr("cy", function(d){return yscale(d[specIndex]);});
					svg.selectAll("#plotLine").attr("d", lineFunction(lineData));
				}
				
				//define the zoom behavior
				var zoom = d3.behavior.zoom()
					.y(yscale)
					.scaleExtent([.1, 5])
					.on("zoom", zoomed);
				
				//call the function to make the scale change
				svg.call(zoom).on("dblclick.zoom", null);//svg was defined in the plotInt function
				updateSegmentForm();
				
			}
			
			//define function to return stretch color array by index
			function setcolor(data, specIndex, stretch, n_stdev, len) {
				var minv = stretch[specIndex].mean - (stretch[specIndex].stdev * n_stdev),
					maxv = stretch[specIndex].mean + (stretch[specIndex].stdev * n_stdev),
					color = [],
					i = 0;
				for (i; i < len; i++) {
					if (data.Values[i][specIndex] < minv) data.Values[i][specIndex] = minv;
					if (data.Values[i][specIndex] > maxv) data.Values[i][specIndex] = maxv;
					color[i] = ((data.Values[i][specIndex] - minv) / (maxv - minv)) * 256;
				}
				return color;
			}
			
			//define function to return scaled color arrays as RGB color
			function scaledRGB(data, RspecIndex, GspecIndex, BspecIndex, stretch, n_stdev, len){
				var colorR = setcolor(data, RspecIndex, stretch, n_stdev, len),
					colorG = setcolor(data, GspecIndex, stretch, n_stdev, len),
					colorB = setcolor(data, BspecIndex, stretch, n_stdev, len),
					color = [],
					i = 0;
				for(i;i<len;i++) {color[i] = d3.rgb(colorR[i],colorG[i],colorB[i]);}
				return color;
			}			
			
			//define function to calculate spectral indices from the raw band data
			function calcIndices(data){
				//define and initialize variables		
				var n_obj = data.Values.length,
					b1 = 0, 
					b2 = 0, 
					b3 = 0,
					b4 = 0,
					b5 = 0,
					b7 = 0,
					bcoef = [0.2043, 0.4158, 0.5524, 0.5741, 0.3124, 0.2303],
					gcoef = [-0.1603, -0.2819, -0.4934, 0.7940, -0.0002, -0.1446],
					wcoef = [0.0315, 0.2021, 0.3102, 0.1594,-0.6806, -0.6109],
					i = 0;
				
				//calculate indices and include them in the json object
				for(i; i<n_obj; i++){
					//pull out the values by band from json object so we don't have to deal with the long json text to 
					//call a value when calculating indices 
					b1 = data.Values[i].B1;
					b2 = data.Values[i].B2;
					b3 = data.Values[i].B3;
					b4 = data.Values[i].B4;
					b5 = data.Values[i].B5;
					b7 = data.Values[i].B7;
				
					//calculate indices
					data.Values[i]["TCB"]=(b1*bcoef[0])+(b2*bcoef[1])+(b3*bcoef[2])+(b4*bcoef[3])+(b5*bcoef[4])+(b7*bcoef[5]);		
					data.Values[i]["TCG"]=(b1*gcoef[0])+(b2*gcoef[1])+(b3*gcoef[2])+(b4*gcoef[3])+(b5*gcoef[4])+(b7*gcoef[5]);
					data.Values[i]["TCW"]=(b1*wcoef[0])+(b2*wcoef[1])+(b3*wcoef[2])+(b4*wcoef[3])+(b5*wcoef[4])+(b7*wcoef[5]);
					data.Values[i]["TCA"]=Math.atan(data.Values[i].TCG/data.Values[i].TCB) * (180/Math.PI) * 100;
					data.Values[i]["NBR"]=(b4-b7)/(b4+b7);
					data.Values[i]["NDVI"]=(b4-b3)/(b4+b3);
				}
				return data
			}
			

			//define function to determine if leap year
			function leapYear(year){
				return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
			}
			
			function calcD3date(){
				for(var i=0;i<allData.Values.length;i++){
					var thisYear = allData.Values[i].Year;
					if(leapYear(thisYear)){
						var n_days = 367
					} else{
						var n_days = 366
					}
					var D3date = thisYear + (allData.Values[i].doy/n_days);
					allData.Values[i]["D3xValue"] = D3date
				}
			}
			
			//define function to initialize the spectral trajectory
			function plotInt(){
				//get the range of the x values
				var yearmin = d3.min(data.Values, function(d) {return d.Year;}),
					yearmax = d3.max(data.Values, function(d) {return d.Year;});
				
				//adjust the ranges so there is some buffer
				var xmin = yearmin-1, //
					xmax = yearmax+1;
				
				//define the width of the svg plot area
				var w = 740, 
					h = 250; 
				
				//define the plot margins
				var pt = 10, //plot top
					pr = 20, //plot right
					pl = 70, //plot left
					pb = 37; //plot bottom
				
				//define the x scale
				xscale = d3.scale.linear() //NEEDS TO BE A GLOBAL VARIABLE - IS USED HERE AND IN THE UPDATE FUNCTION
					.domain([xmin, xmax])
					.range([pl, w - pr]);
				
				//define the y scale
				yscale = d3.scale.linear() //NEEDS TO BE A GLOBAL VARIABLE - IS USED HERE AND IN THE UPDATE FUNCTION
					.domain([domain[specIndex].min, domain[specIndex].max])
					.range([h - pb, pt]);
						
				//define the x axis
				var xaxis = d3.svg.axis()
					.scale(xscale)
					.orient("bottom")
					.tickFormat(d3.format("d"));
				
				//define the x axis
				yaxis = d3.svg.axis() //NEEDS TO BE A GLOBAL VARIABLE - IS USED HERE AND IN THE UPDATE FUNCTION
					.scale(yscale)
					.orient("left");
				
				//define the zooming function - what gets scaled on zoom
				//function zoomed() {
				//	svg.select(".y.axis").call(yaxis);
				//	svg.selectAll("circle").attr("cy", function(d){return yscale(d[specIndex]);});
				//	svg.selectAll("#plotLine").attr("d", lineFunction(lineData));
				//}
				
				//define the zoom behavior
				var xyzoom = d3.behavior.zoom()
					.y(yscale)
					.x(xscale)
					//.scaleExtent([1, 5])
					.on("zoom", draw); //zoomed
				var xzoom = d3.behavior.zoom()
				  .x(xscale)
				  //.scaleExtent([1, 5])
				  .on("zoom", draw);
				var yzoom = d3.behavior.zoom()
				  .y(yscale)
				  //.scaleExtent([1, 5])
				  .on("zoom", draw);				

				
				
				svg = d3.select(svg); //retrieve the svg reference
				
				
				//make the default line data
				var lineData = [ //needs to be local variable
					{"x":yearmin ,"y":data.Values[0][specIndex]},
					{"x":yearmax ,"y":data.Values[len-1][specIndex]}
				];


				//make the line function to convert the xy object to svg path syntax 
				lineFunction = d3.svg.line() //global because it gets used when selecting new points
					.x(function(d){return xscale(d.x);})
					.y(function(d){return yscale(d.y);})
					.interpolate("linear");

				//append an xy box
				var xybox = svg.append("rect")
					.attr("class", "zoom xy box")
					.attr("x", 70)
					.attr("y", 10)
					.attr("width", w - pl - pr)
					.attr("height", h - pt - pb)
					.style("visibility", "hidden")
					//.style("stroke-width", 1)
					//.style("stroke", "red")
					//.style("fill", "none")
					.attr("pointer-events", "all")
					.call(xyzoom)
					.on("dblclick.zoom", null)

					
				//create the circles that will go into the svg
				var circles = svg.selectAll(".data")
					.data(data.Values)
					.enter()
					.append("circle")
					.style("fill",function(d,i){return rgbColor[i];})
					.attr("cx", function(d){return xscale(d.Year);})
					.attr("cy", function(d){return yscale(d[specIndex]);})
					.attr("r", 9)
					.attr("class","data unselected");
				
				var allCircles = svg.selectAll(".allData")
					.data(allData.Values)
					.enter()
					.append("circle")
					.style("fill-opacity",0.25) //0.25
					.attr("visibility","hidden")
					.attr("cx", function(d){return xscale(d.Year);}) //d.D3xValue
					.attr("cy", function(d){return yscale(d[specIndex]);})
					.attr("r", 3)
					.attr("class","allData");
							
				//add the default line
				var lineGraph = svg.append("path") //local because it will get overwritten
					.attr("d", lineFunction(lineData))
					.attr("id","plotLine");
				
				//draw the x axis
				svg.append("g")
					.attr("class", "x axis")
					.attr("transform", "translate(0," + (h - pb) + ")")
					.call(xaxis);
					
				//draw the y axis
				svg.append("g")
					.attr("class", "y axis")
					.attr("transform", "translate(" + pl + ",0)")
					.call(yaxis);
					
				//add label for the x axis
				svg.append("text")      
					.attr("transform", "rotate(-90)")
					.attr("x", (h-pb)/-2)
					.attr("y", 20)
					.style("text-anchor", "middle")
					.text("TC Wetness")
					.attr("id","specPlotIndex");
				
				//define clip path so that circles don't go outside the axes
				svg.append("defs")
					.append("clipPath")
					  .attr("id", "clip")
					.append("rect")
					  .attr("x", 70)
					  .attr("y", 10)
					  .attr("width", w-pr-pl)
					  .attr("height", h-pb-pt);
				

	
				//append an x box
				var xbox = svg.append("rect")
					.attr("class", "zoom x box")
					.attr("x", pl)
					.attr("y", h-pb)
					.attr("width", w - pl - pr)
					.attr("height", pb)
					.style("visibility", "hidden")
					//.style("stroke-width", 1)
					//.style("stroke", "red")
					//.style("fill", "none")
					.attr("pointer-events", "all")
					.call(xzoom)
					.on("dblclick.zoom", null) 
								
				//append a y box
				var ybox = svg.append("rect")
					.attr("class", "zoom y box")
					.attr("y", pt)
					.attr("width", pl)
					.attr("height", h - pt - pb)
					.style("visibility", "hidden")
					//.style("stroke-width", 1)
					//.style("stroke", "red")
					//.style("fill", "none")
					.attr("pointer-events", "all")
					.call(yzoom)
					.on("dblclick.zoom", null)
				
				//xbox.call(xzoom).on("dblclick.zoom", null) //turn off dblclick
				//ybox.call(yzoom).on("dblclick.zoom", null) //turn off dblclick
				//xybox.call(xyzoom).on("dblclick.zoom", null) //turn off dblclick
				
			//function xyZoomDraw(){
			//	svg.select('.x.axis').call(xaxis);
			//	svg.select('.y.axis').call(yaxis);
			//	svg.selectAll("circle").attr("cx", function(d){return xscale(d.Year);});
			//	svg.selectAll("circle").attr("cy", function(d){return yscale(d[specIndex]);});
			//	svg.selectAll("#plotLine").attr("d", lineFunction(lineData));
			//}
			//function xZoomDraw(){
			//	svg.select('.x.axis').call(xaxis);
			//	svg.selectAll("circle").attr("cx", function(d){return xscale(d.Year);});
			//	svg.selectAll("#plotLine").attr("d", lineFunction(lineData));

			//}
			//function yZoomDraw(){
			//	svg.select('.y.axis').call(yaxis);
			//	svg.selectAll("circle").attr("cy", function(d){return yscale(d[specIndex]);});
			//	svg.selectAll("#plotLine").attr("d", lineFunction(lineData));
			//}


			function zoom_update() {
				var xyzoom = d3.behavior.zoom()
					.y(yscale)
					.x(xscale)
					.on("zoom", draw);
				var xzoom = d3.behavior.zoom()
					.x(xscale)
					.on("zoom", draw);
				var yzoom = d3.behavior.zoom()
					.y(yscale)
					.on("zoom", draw);
				
				xybox.call(xyzoom).on("dblclick.zoom", null); //svg.
				xbox.call(xzoom).on("dblclick.zoom", null); //svg.
				ybox.call(yzoom).on("dblclick.zoom", null);	//svg.	 		
				//xbox.call(xzoom).on("dblclick.zoom", null) //turn off dblclick
				//ybox.call(yzoom).on("dblclick.zoom", null) //turn off dblclick
				//xybox.call(xyzoom).on("dblclick.zoom", null) //turn off dblclick				
			}
			
			function draw() {
				svg.select('.x.axis').call(xaxis);
				svg.select('.y.axis').call(yaxis);
				svg.selectAll("circle").attr("cx", function(d){return xscale(d.Year);});
				svg.selectAll("circle").attr("cy", function(d){return yscale(d[specIndex]);});
				svg.selectAll("#plotLine").attr("d", lineFunction(lineData));
				zoom_update();
			};			
				
				
				//add the path to the circles to activate the clipping
				circles.attr("clip-path", "url(#clip)");
				allCircles.attr("clip-path", "url(#clip)");
				lineGraph.attr("clip-path", "url(#clip)");
				
				//default the first and last circles to class "selected"
				var dataCircles = $("circle.data");
				dataCircles.eq(0).attr("class","data selected");
				dataCircles.eq(len-1).attr("class","data selected");
				
				//fill in the global selectedCircles variable for the first time
				var selectedCirclesTemp = $("circle.data.selected"),
					i = 0;	
				for(i; i < selectedCirclesTemp.length; i++){
					selectedCircles.push(dataCircles.index(selectedCirclesTemp[i]));
				}
				updateSegmentForm();
			}
			
			

			
			
			
			
			//define function to update the D3 scatterplot when new selection are made
			function update(data, specIndex, rgbColor, domain){
				//update the y domain based on the new index
				
				//console.log("im in update!")
				yscale.domain([domain[specIndex].min, domain[specIndex].max]); //yscale was defined in the plotInt function
				
				//define the zooming function - what gets scaled on zoom 
				function zoomed() {
					svg.select(".y.axis").call(yaxis);
					svg.selectAll("circle").attr("cy", function(d){return yscale(d[specIndex]);});
					svg.selectAll("#plotLine").attr("d", lineFunction(lineData));
				}
				
				//define the zoom behavior
				var zoom = d3.behavior.zoom()
					.y(yscale)
					.scaleExtent([1, 5])
					.on("zoom", zoomed);
				
				//call the function to make the scale change
				svg.call(zoom).on("dblclick.zoom", null);//svg was defined in the plotInt function
				
				//update the circles with new data
				svg.selectAll("circle.allData") //svg was defined in the plotInt function
					.data(allData.Values)					   
					.transition()
					.duration(500)
					.attr("cx", function(d){return xscale(d.Year);})
					.attr("cy", function(d){return yscale(d[specIndex]);});

				svg.selectAll("circle.data") //svg was defined in the plotInt function
					.data(data.Values)					   
					.transition()
					.duration(500)
					.attr("cx", function(d){return xscale(d.Year);})
					.attr("cy", function(d){return yscale(d[specIndex]);})
					.style("fill",function(d,i){return rgbColor[i]})

					
				/////////////////////////////////LINE UPDATE////////////////////////////////	
				//retrieve the line data (this section could be made into a function cause it is also used in the changePlotLine function)
				//selectedCircles = $("circle.selected");
				var lineData = [];
				var i = 0;
				for(i; i < selectedCircles.length; i++){
					//var thisone = $("circle").index(selectedCircles[i]);
					var thisone = selectedCircles[i];
					lineData.push({"x":data.Values[thisone].Year, "y":data.Values[thisone][specIndex]});
				}
				
				//update the line
				svg.selectAll("#plotLine") //local because it will get overwritten
					.transition()
					.duration(500)
					.attr("d", lineFunction(lineData));

				/////////////////////////////////////////////////////////////////////////////
					
				//update y axis
				svg.select(".y.axis") //svg was defined in the plotInt function
					.transition()
					.duration(500)
					.call(yaxis);
			}
			
			
			//update the plot when buttons are clicked		
			//right now the points and colors are redrawn each time, in the future could break this down
			//by which button type is pressed, either index or color and only update either the point locations
			//or the colors
			$(document).ready(function(){
				$(".dropdown-menu li").click(function() { //This will attach the function to all the input elements
					
					//figure out which dropdown was selected and change its active status 
					var thisListID = $(this).closest("ul").attr('id'),
						thisSpecIndexID = $(this).attr('id'),
						newactive = "#"+thisListID+" #"+thisSpecIndexID,
						activesearch = "#"+thisListID+" .active",
						activeid = $(activesearch).attr('id'),
						oldactive = "#"+thisListID+" #"+activeid;
					
					$(oldactive).removeClass('active');
					$(newactive).addClass('active');
					
					if(thisListID == "index-list"){$("#btnIndex div").replaceWith('<div><strong>Index:</strong><br><small>'+$("#"+thisSpecIndexID).text()+'</small><span class="caret"></span></div>')};
					if(thisListID == "red-list"){$("#btnRed div").replaceWith('<div><strong>R</strong><small>GB</small><br><small>'+$("#"+thisSpecIndexID).text()+'</small><span class="caret"></span></div>')};
					if(thisListID == "green-list"){$("#btnGreen div").replaceWith('<div><small>R</small><strong>G</strong><small>B</small><br><small>'+$("#"+thisSpecIndexID).text()+'</small><span class="caret"></span></div>')};
					if(thisListID == "blue-list"){$("#btnBlue div").replaceWith('<div><small>RG</small><strong>B</strong><br><small>'+$("#"+thisSpecIndexID).text()+'</small><span class="caret"></span></div>')};
					
					
					
					//get the active classes from the dropdown displays buttons
					var activeSpecIndex = $("#index-list li.active").attr('id'),		
						activeRedSpecIndex = $("#red-list li.active").attr('id'),
						activeGreenSpecIndex = $("#green-list li.active").attr('id'),
						activeBlueSpecIndex = $("#blue-list li.active").attr('id');
					
					//get the RBG color
					rgbColor = scaledRGB(data, activeRedSpecIndex, activeGreenSpecIndex, activeBlueSpecIndex, stretch, 2, len);
					
					//reset the global varible so that other functions know what it is know
					specIndex=activeSpecIndex 
					
					//update the plot
					update(data, specIndex, rgbColor, domain);
					$("#specPlotIndex").text($("#"+specIndex).text());
				});
			});
			
			
			//mechanism to display the selected points and line in the trajectory plot
			$("#btnLine").click(function(){
				if ($("#lineDisplayThumb").attr("class") == "glyphicon glyphicon-thumbs-up"){
					$("#lineDisplayThumb").removeClass("glyphicon glyphicon-thumbs-up")
						.addClass("glyphicon glyphicon-thumbs-down");					
					$("circle.selected").css("stroke-opacity","0");
					$("circle.highlight").css("stroke-opacity","0");
					$("#plotLine").css("stroke-opacity","0");
				} else{
					$("#lineDisplayThumb").removeClass("glyphicon glyphicon-thumbs-down")
						.addClass("glyphicon glyphicon-thumbs-up");
					$("circle.selected").css("stroke-opacity","1");
					$("circle.highlight").css("stroke-opacity","1");
					$("#plotLine").css("stroke-opacity","1");
				}
			});

			//mechanism to display all points trajectory plot
			$("#btnPoints").click(function(){
				if ($("#allPointsDisplayThumb").attr("class") == "glyphicon glyphicon-thumbs-up"){
					$("#allPointsDisplayThumb").removeClass("glyphicon glyphicon-thumbs-up")
						.addClass("glyphicon glyphicon-thumbs-down");					
					$("circle.allData").attr("visibility","hidden");
					$("circle.data").css("fill-opacity","1");
				} else{
					$("#allPointsDisplayThumb").removeClass("glyphicon glyphicon-thumbs-down")
						.addClass("glyphicon glyphicon-thumbs-up");
					$("circle.allData").attr("visibility","visible");
					$("circle.data").css("fill-opacity","0.5");
				}
			});
			
			$("#highlightColor").change(function(){
				setHighlightColor();
			});
			
			$("#selectedColor").change(function(){
				setSelectedColor()
			});
			
			$("#plotColor").change(function(){
				chipDisplayProps.plotColor = $("#plotColor").prop("value")
				drawAllChips()
			});
			
			function setHighlightColor(){
				var color = $("#highlightColor").prop("value");
				$("circle.highlight").css("stroke",color);
				$(".chipHolder.highlight").css("border-color",color);
				$("tr.active").css("background-color",color);
			}
						
			function setSelectedColor(){
				var color = $("#selectedColor").prop("value");
				$("circle.selected").css("stroke",color);
				$("#plotLine").css("stroke",color);
				$(".chipHolder.selected").css("border-color",color);
			}

			
///////////////////////////////////////////////////////BELOW ARE LINE INFO FORM SCRIPTS/////////////////////////////////////////////////////////////////
//////////////BELOW ARE LINE INFO FORM SCRIPTS////////////////////////////////////////BELOW ARE LINE INFO FORM SCRIPTS//////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////BELOW ARE LINE INFO FORM SCRIPTS////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////BELOW ARE LINE INFO FORM SCRIPTS/////////////////////////////////
////////////////////////////BELOW ARE LINE INFO FORM SCRIPTS////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////BELOW ARE LINE INFO FORM SCRIPTS/////////////////////////////////BELOW ARE LINE INFO FORM SCRIPTS////			



////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////
//GLOBAL VARIABLES//////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////

//template vertInfo object which holds all the segment and vertice info			
//			var vertInfo = {[{
//						year:0,
//						index:0,
//						landUse:{
//							dominant:"",
//							notes:{
//								wetland:null,
//								mining:null,
//								rowCrop:null,
//								orchardTreeFarm:null,
//								vineyardsOtherWoody:null
//							}
//						},
//						landCover:{
//							dominant:"",
//							other:{
//								trees:null,
//								shrubs:null,
//								grassForbHerb:null,
//								impervious:null,
//								naturalBarren:null,
//								SnowIce:null,
//								water:null
//							}
//						},
//						changeProcess:{
//							changeProcess:"",
//							notes:{
//								natural:null,
//								prescribed:null,
//								sitePrepFire:null,
//								airphotoOnly:null,
//								clearcut:null,
//								thinning:null,
//								flooding:null,
//								reserviorLakeFlux:null,
//								wetlandDrainage:null
//							}
//						}					
//				}]}

			var vertInfo = {};

////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////
//EVENT LISTENERS///////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////
					
			//controls the trajectory form section tabs and tables 
			$("#segmentsFormTab").click(function(){	
				var status = $("#segmentsFormTab").attr("class");
				if(status == "unselected"){
					highlightOff();
					closeDropAndRecord();
					$("#CommentsFormTab, #verticesFormTab").attr("class","unselected");
					$("#CommentsFormDiv, #verticesFormDiv").hide();
					$("#segmentsFormTab").attr("class","selected").show();
					$("#segmentsFormDiv").show();
				}
			});
			$("#verticesFormTab").click(function(){				
				var status = $("#verticesFormTab").attr("class");
				if(status == "unselected"){
					highlightOff();
					closeDropAndRecord();
					$("#segmentsFormTab, #CommentsFormTab").attr("class","unselected");
					$("#segmentsFormDiv, #CommentsFormDiv").hide();
					$("#verticesFormTab").attr("class","selected").show();
					$("#verticesFormDiv").show();
				}
			});
			$("#CommentsFormTab").click(function(){				
				var status = $("#CommentsFormTab").attr("class");
				console.log("im in comments, status: ", status)
				if(status == "unselected"){
					highlightOff();
					closeDropAndRecord();
					$("#segmentsFormTab, #verticesFormTab").attr("class","unselected");
					$("#segmentsFormDiv, #verticesFormDiv").hide();
					$("#CommentsFormTab").attr("class","selected").show();
					$("#CommentsFormDiv").show();
				}
			});
			

//INPUT DROP DOWNS AND HIGHLIGHTING CIRCLES PERTAINING TO THE SELECTED ROW//////////////////////
			$(document).ready(function(){
				$(document).on("click",".changeProcessInput, .landUseInput, .landCoverInput", function(e){				
					highlightOff();
					closeDropAndRecord();								
					var thisInput = $(this);
					thisClass = thisInput.attr("class");
					thisInput.addClass("active"); //set this .landCoverInput <td> as the "active" class so that when a selection is made from the #changeProcessList dropdown it knows which <td> to place it in
					thisInput.closest("tr").addClass("active");					
					switch(thisClass){
						case "changeProcessInput formDrop":
							dropInputLists(thisInput, "changeProcessDiv", -1, -1, 1);
							var thisOne = $("tr.segment .changeProcessInput").index(thisInput)+1,
							selection = vertInfo[thisOne].changeProcess.changeProcess							
							appendCPnotes(selection);					
							changeNoteIcon("#CPnotesList", thisOne, "changeProcess");							
							highlightOn("segment", thisOne);
						break;
						case "landUseInput formDrop":
							dropInputLists(thisInput, "landUseDiv", -1, -1, 1);
							var thisOne = $("tr.vertex .landUseInput").index(thisInput),
							selection = vertInfo[thisOne].landUse.dominant;
							appendLUnotes(selection);					
							changeNoteIcon("#LUnotesList", thisOne, "landUse");
							highlightOn("vertex", thisOne);
						break;					
						case "landCoverInput formDrop":
							dropInputLists(thisInput, "landCoverDiv", -1, -1, 1);
							var thisOne = $("tr.vertex .landCoverInput").index(thisInput),
							selection = vertInfo[thisOne].landCover.dominant				
							appendLCnotes(selection);					
							changeNoteIcon("#LCnotesList", thisOne, "landCover");											
							highlightOn("vertex", thisOne);
						break;										
					}
					e.stopPropagation(); //stop other actions from happening - what are the other actions??? - check
                });
            });		
///////////////////////////////////////////////////////////////////////////////////////////////////

//DROP THE SELECTION LISTS ON CLICK///////////////////////////////////////////////////////////////////			
			$("#changeProcessSelection, #landUseSelection, #landCoverSelection").click(function(e){			
				var thisList = $(this).next("ul").attr("id")				
				$("#"+thisList).show();
				e.stopPropagation();
			});
////////////////////////////////////////////////////////////////////////////////////////////////////////
			
						
//DONE BUTTON EVENT HANDLERS////////////////////////////////////////////////////////////////////////////
			//when done buttons are clicked close their dropdown and record  the info in the inputs to the lineInfo object
			$(".doneBtn").click(function(){
				closeDropAndRecord();
			});
//////////////////////////////////////////////////////////////////////////////////////////////////////////
			
			
//DISPLAY THE CONDITIONAL NOTES ONCE A CHANGE PROCESS HAS BEEN SELECTED/////////////////
			$(document).ready(function(){
				$("#changeProcessList li, #landUseList li, #landCoverList li").click(function(){						
					var selection = $(this).text();	//get the text from the list selection that was clicked					
					$("td.active").text(selection);	 //place the text in the active td
					var ulId = $(this).parent().attr("id") //what is the parent list to this li
					$("#"+ulId).hide(); //hide the list since a selection has been made
					var thisNoteList = $("#"+ulId).siblings("ul").attr("id") //what note list is associated					
					switch(ulId){
						case "changeProcessList":				
							appendCPnotes(selection);
						break;
						case "landUseList":				
							appendLUnotes(selection);
						break;
						case "landCoverList":				
							appendLCnotes(selection);
						break;						
					}
					$("#"+thisNoteList+" li").prepend('<span class="glyphicon glyphicon-unchecked"></span> ');
				});
			});
/////////////////////////////////////////////////////////////////////////////////////////
			
			
//MAKE THE NOTE CHECKBOXES TOGGLE ON AND OFF AND SET THE "SELECTED" CLASS////////////////
			$(document).ready(function(){
				$(document).on("click","#CPnotesList li, #LUnotesList li, #LCnotesList li", function(){
					var selected = $(this);
					if(selected.hasClass("selected")){
						selected.removeClass("selected");
						$("span", this).replaceWith('<span class="glyphicon glyphicon-unchecked"></span> ');
					} else {
						selected.addClass("selected");
						$("span", this).replaceWith('<span class="glyphicon glyphicon-ok"></span> ');
					}
				});
			});			
//////////////////////////////////////////////////////////////////////////////////////////

			//highlight selected circles, canvases, and input row when the magnifying glass is clicked
			$(document).ready(function(){
				$(document).on("click","td.highlightIt", function(){
					var thisTr = $(this).closest("tr");
					if(thisTr.hasClass("active")){
						highlightOff();
						closeDropAndRecord();						
					} else {
						highlightOff();
						closeDropAndRecord();
						thisTr.addClass("active");
						if(thisTr.hasClass("segment")){
							thisOne = $("tr.segment").index(thisTr);
							highlightOn("segment", thisOne+1);
						} else {
							thisOne = $("tr.vertex").index(thisTr);
							highlightOn("vertex", thisOne);
						}
					}
				});
			});

////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
//UNIQUE FUNCTIONS//////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

//APPEND NOTES TO THE NOTES DIV///////////////////////////////////////////////////////////////////	
			//change process
			function appendCPnotes(selection){					
				$("#CPnotesList").empty();
				switch(selection){
					case "Fire":
						$("#CPnotesList").append('<li class="natural">Natural</li><li class="prescribed">Prescribed</li><li class="sitePrepFire">Site-prep fire</li><li class="airphotoOnly">Airphoto only</li>');								
						break;
					case "Harvest":
						$("#CPnotesList").append('<li class="clearcut">Clearcut</li><li class="thinning">Thinning</li><li class="sitePrepFire">Site-prep fire</li><li class="airphotoOnly">Airphoto only</li>');								
						break;
					case "Decline":
						$("#CPnotesList").append('<li class="airphotoOnly">Airphoto only</li>');								
						break;
					case "Wind":
						$("#CPnotesList").append('<li class="airphotoOnly">Airphoto only</li>');								
						break;
					case "Hydrology":
						$("#CPnotesList").append('<li class="flooding">Flooding</li><li class="reserviorLakeFlux">Reservoir/Lake flux</li><li class="airphotoOnly">Airphoto only</li>');								
						break;
					case "Debris":
						$("#CPnotesList").append('<li class="airphotoOnly">Airphoto only</li>');								
						break;
					case "Growth":
						$("#CPnotesList").append('<li class="airphotoOnly">Airphoto only</li>');								
						break;
					case "Stable":
						$("#CPnotesList").append('<li class="airphotoOnly">Airphoto only</li>');								
						break;
					case "Conversion":
						$("#CPnotesList").append('<li class="wetlandDrainage">Wetland drainage</li><li class="airphotoOnly">Airphoto only</li>');
						break;
					case "Other":
						$("#CPnotesList").append('<li class="airphotoOnly">Airphoto only</li>');
						break;						
				}
			}
			
			//land use
			function appendLUnotes(selection){					
				$("#LUnotesList").empty();
				switch(selection){
					case "Forest":
						$("#LUnotesList").append('<li class="wetland">Wetland</li>');								
						break;
					case "Developed":
						$("#LUnotesList").append('<li class="mining">Mining</li>');								
						break;
					case "Agriculture":
						$("#LUnotesList").append('<li class="rowCrop">Row crop</li><li class="orchardTreeFarm">Orchard/Tree farm</li><li class="vineyardsOtherWoody">Vineyard/Other woody</li>');								
						break;						
				}
			}
			
			//land use
			function appendLCnotes(selection){					
				$("#LCnotesList").empty();
				if(selection != ""){
					$("#LCnotesList").append(
						'<li class="trees">Trees</li>'+
						'<li class="shrubs">Shrubs</li>'+
						'<li class="grassForbHerb">Grass/forb/herb</li>'+
						'<li class="impervious">Impervious</li>'+
						'<li class="naturalBarren">Natural/barren</li>'+
						'<li class="SnowIce">Snow/ice</li>'+
						'<li class="water">Water</li>'
					);
					$("#LCnotesList li").each(function(){
						var thisClass = $(this).text().trim();
						if(thisClass == selection){
							$(this).hide();
							return false
						}					
					});
				}
			}
			
			
//DONE BUTTON FUNCTION TO CLOSE DROPDOWN MENUS AND RECORD INFO FROM THE FORM INPUTS TO THE LINEINFO OBJECT						
			function changeProcessDoneBtn(){
				$("#changeProcessDiv").hide();
				$("#changeProcessList").hide();
				
				//remove the highlighted circle class - could find the highlighted class and only change that one (current implementation) or just reset all selected circles (commented out)
				highlightOff();
				
				//fill in the lineInfo object
				var thisOne = $(".changeProcessInput").index($(".changeProcessInput.active"))+1;
				var selection = $("td.changeProcessInput.active").text();
				
				
				vertInfo[thisOne].changeProcess.changeProcess = selection;		
				switch(selection){
					case "Fire":
						fillInNotes("#CPnotesList .selected",thisOne,"natural","changeProcess");
						fillInNotes("#CPnotesList .selected",thisOne,"prescribed","changeProcess");
						fillInNotes("#CPnotesList .selected",thisOne,"sitePrepFire","changeProcess");
					break;
					case "Harvest":
						fillInNotes("#CPnotesList .selected",thisOne,"clearcut","changeProcess");
						fillInNotes("#CPnotesList .selected",thisOne,"thinning","changeProcess");
						fillInNotes("#CPnotesList .selected",thisOne,"sitePrepFire","changeProcess");						
					break;
					case "Decline":								
					break;
					case "Wind":								
					break;
					case "Hydrology":
						fillInNotes("#CPnotesList .selected",thisOne,"flooding","changeProcess");
						fillInNotes("#CPnotesList .selected",thisOne,"reserviorLakeFlux","changeProcess");											
					break;
					case "Debris":								
					break;
					case "Growth":							
					break;
					case "Stable":							
					break;
					case "Conversion":
						fillInNotes("#CPnotesList .selected",thisOne,"wetlandDrainage","changeProcess");						
					break;
					case "Other":
					break;						
				}
				fillInNotes("#CPnotesList .selected",thisOne,"airphotoOnly","changeProcess");
			}
			
			//land use
			function landUseDoneBtn(){				
				$("#landUseDiv").hide(); //hide the dropdown
				$("#landUseList").hide();
				
				//remove the highlighted circle class - could find the highlighted class and only change that one (current implementation) or just reset all selected circles (commented out)				
				highlightOff();
				
				//fill in the lineInfo object
				var thisOne = $(".landUseInput").index($(".landUseInput.active"));
				var selection = $("td.landUseInput.active").text();
				
				vertInfo[thisOne].landUse.dominant = selection;			
				switch(selection){
					case "Forest":
						fillInNotes("#LUnotesList .selected",thisOne,"wetland","landUse");
					break;
					case "Developed":
						fillInNotes("#LUnotesList .selected",thisOne,"mining","landUse");
					
					break;
					case "Agriculture":								
						fillInNotes("#LUnotesList .selected",thisOne,"rowCrop","landUse");
						fillInNotes("#LUnotesList .selected",thisOne,"orchardTreeFarm","landUse");
						fillInNotes("#LUnotesList .selected",thisOne,"vineyardsOtherWoody","landUse");
					break;					
				}		
			}
	
			//land cover
			function landCoverDoneBtn(){			
				$("#landCoverDiv").hide(); //hide the dropdown
				$("#landCoverList").hide();
				
				//remove the highlighted circle class - could find the highlighted class and only change that one (current implementation) or just reset all selected circles (commented out)				
				highlightOff();
			
				//fill in the lineInfo object
				var thisOne = $(".landCoverInput").index($(".landCoverInput.active"));
				var selection = $("td.landCoverInput.active").text();
				
				vertInfo[thisOne].landCover.dominant = selection;			
				
				fillInNotes("#LCnotesList .selected",thisOne,"trees","landCover");
				fillInNotes("#LCnotesList .selected",thisOne,"shrubs","landCover");
				fillInNotes("#LCnotesList .selected",thisOne,"grassForbHerb","landCover");
				fillInNotes("#LCnotesList .selected",thisOne,"impervious","landCover");
				fillInNotes("#LCnotesList .selected",thisOne,"naturalBarren","landCover");
				fillInNotes("#LCnotesList .selected",thisOne,"SnowIce","landCover");
				fillInNotes("#LCnotesList .selected",thisOne,"water","landCover");
				$("#LCnotesList .selected").removeClass("selected");
			}				
						
////////////////////////////////////////////////////////////////////////////////////////////////////////



////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
//SHARED FUNCTIONS//////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////
			//function to sync the segments form to the selected vertices
			function updateSegmentForm(){
				$(".segment").remove();
				$(".vertex").remove();
				vertInfo = [];
				var yearStart = 0,
					yearEnd = 0,
					len = selectedCircles.length,
					startIndex = 0,
					endIndex = 0,
					i = 0;
				
				//make empty segment entries in the form
				for(i; i < len-1; i++){
					startIndex = selectedCircles[i];
					endIndex = selectedCircles[i+1];
					yearStart = years[startIndex];
					yearEnd =   years[endIndex];
					$("#segmentsFormTbl").append('<tr class="segment"><td class="highlightIt"><span class="glyphicon glyphicon-search"></span></td><td>'+yearStart+'</td><td>'+yearEnd+'</td><td class="changeProcessInput formDrop"></td></tr>');
				}
				
				//make empty vertex entries
				for(i=0; i < len; i++){
					startIndex = selectedCircles[i];
					yearStart = years[startIndex];
					$("#verticesFormTbl").append('<tr class="vertex"><td class="highlightIt"><span class="glyphicon glyphicon-search"></span></td><td>'+yearStart+'</td><td class="landUseInput formDrop"></td><td class="landCoverInput formDrop"></td></tr>');
					vertInfo.push({
						year:yearStart,
						index:startIndex,
						landUse:{
							dominant:"",
							notes:{
								wetland:null,
								mining:null,
								rowCrop:null,
								orchardTreeFarm:null,
								vineyardsOtherWoody:null
							}
						
						},
						landCover:{
							dominant:"",
							other:{
								trees:null,
								shrubs:null,
								grassForbHerb:null,
								impervious:null,
								naturalBarren:null,
								SnowIce:null,
								water:null
							}
						},
						changeProcess:{
							changeProcess:"",
							notes:{
								natural:null,
								prescribed:null,
								sitePrepFire:null,
								airphotoOnly:null,
								clearcut:null,
								thinning:null,
								flooding:null,
								reserviorLakeFlux:null,
								wetlandDrainage:null
							}
						}
					});					
				}
			}	
			
			
			//function to show a dropdown for the land use and change process inputs
			function dropInputLists(thisInput, thisList, xAdj, yAdj, widthAdj){
				var rowPos = thisInput.position(),
					bottomTop = rowPos.top,
					bottomLeft = rowPos.left,
					bottomWidth = thisInput[0].getBoundingClientRect().width,
					bottomHeight = thisInput[0].getBoundingClientRect().height
					
				//drop its dropdown based on the position of the clicked element
				$("#"+thisList).css({
					position: "absolute",
					top: (bottomTop+parseFloat(bottomHeight)+yAdj),
					left: bottomLeft+xAdj,
					width: (parseFloat(bottomWidth)+widthAdj+"px")
				}).show();
			}
			
			//fill in note check box status in the lineInfo object when the done button is pressed
			function fillInNotes(selector, thisOne, noteClass, inputType){
				noteClassSelected = $(selector).hasClass(noteClass);
				switch(inputType){
					case "landUse":
						if(noteClassSelected){
							vertInfo[thisOne].landUse.notes[noteClass] = true;
						} else {
							vertInfo[thisOne].landUse.notes[noteClass] = null;
						}	
					break;
					case "landCover":
						if(noteClassSelected){
							vertInfo[thisOne].landCover.other[noteClass] = true;
						} else {
							vertInfo[thisOne].landCover.other[noteClass] = null;
						}						
					break;
					case "changeProcess":
						if(noteClassSelected){
							vertInfo[thisOne].changeProcess.notes[noteClass] = true;
						} else {
							vertInfo[thisOne].changeProcess.notes[noteClass] = null;
						}
					break;
				}
			}
			
			//function to change the note icon depending on whether the note is selected or not
			function changeNoteIcon(notesList, thisOne, inputType){
				theseLi = $(notesList+" li")
				theseLi.each(function(i){
					var thisLi = $(this)
					var noteClass = thisLi.attr("class");
					
					switch(inputType){
						case "landUse":
							noteNull = vertInfo[thisOne].landUse.notes[noteClass];
						break;
						case "landCover":
							noteNull = vertInfo[thisOne].landCover.other[noteClass];
						break;
						case "changeProcess":
							noteNull = vertInfo[thisOne].changeProcess.notes[noteClass];
						break;
					}
					
					//noteNull = lineInfo.segments[thisOne].notes[noteClass];
					if(noteNull == null){
						thisLi.prepend('<span class="glyphicon glyphicon-unchecked"></span> ') //theseLi.eq(i)
					} else{
						thisLi.prepend('<span class="glyphicon glyphicon-ok"></span> '); //theseLi.eq(i)
						thisLi.addClass("selected");
					}
				});
			}
			
			//turn highlighting off
			function highlightOff(){
				$("circle.highlight").attr("class","data selected");
				$(".chipHolder.highlight").addClass("selected").removeClass("highlight");							
				$("tr.active").removeClass("active").css("background-color","white"); //only needed when using the color options			
				$("circle").css("cursor","pointer");
				$(".chipImg").css("cursor","pointer");
				setSelectedColor();
			}
			
			//turn highlighting on
			function highlightOn(linePart, thisOne){
				switch(linePart){
					case "vertex":
						var thisIndex = vertInfo[thisOne].index;
						$("circle:eq("+thisIndex+")").attr("class","data highlight");
						$(".chipHolder:eq("+thisIndex+")").removeClass("selected").addClass("highlight");
					break;
					case "segment":
						var startIndex = vertInfo[thisOne-1].index; //pull out the start index for the selected row
						var endIndex = vertInfo[thisOne].index; //pull out the end index for the selected row
						$("circle:eq("+startIndex+")").attr("class","data highlight"); //highlight the start circle for the selected row (segment)
						$("circle:eq("+endIndex+")").attr("class","data highlight"); //highlight the end circle for the selected row (segment)
						$(".chipHolder:eq("+startIndex+")").removeClass("selected").addClass("highlight"); //highlight the start canvas for the selected row (segment)
						$(".chipHolder:eq("+endIndex+")").removeClass("selected").addClass("highlight"); //highlight the end canvas for the selected row (segment)
					break;
				}
				$("circle").css("cursor","not-allowed");
				$(".chipImg").css("cursor","not-allowed");
				setHighlightColor(); //only needed when using the color options	
			}
			
			//figure out which dropdown to close and what info to record
			function closeDropAndRecord(){
				var tdActive = $("td.active");
				if(tdActive.hasClass("changeProcessInput")){
					changeProcessDoneBtn();	
				} else if(tdActive.hasClass("landUseInput")){
					landUseDoneBtn();
				} else if(tdActive.hasClass("landCoverInput")){
					landCoverDoneBtn();	
				}
				tdActive.removeClass("active");
			}
/////////////////////////////////////////////////////////////////////////////////////////
			
			
			
			
			
///////////////////////////////////////////////////////BELOW ARE CHIP SCRIPTS///////////////////////////////////////////////////////
//////////////BELOW ARE CHIP SCRIPTS////////////////////////////////////////BELOW ARE CHIP SCRIPTS//////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////BELOW ARE CHIP SCRIPTS//////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////BELOW ARE CHIP SCRIPTS///////////////////////
////////////////////////////BELOW ARE CHIP SCRIPTS//////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////BELOW ARE CHIP SCRIPTS/////////////////////////////////BELOW ARE CHIP SCRIPTS////
		
			///////////////SET GLOBAL VARIABLES//////////////////////////////////////////////////////////
			
			var images = [
				"chips/test_chip_1985.png",
				"chips/test_chip_1986.png",
				"chips/test_chip_1987.png",
				"chips/test_chip_1988.png",
				"chips/test_chip_1989.png",
				"chips/test_chip_1990.png",
				"chips/test_chip_1991.png",
				"chips/test_chip_1992.png",
				"chips/test_chip_1993.png",
				"chips/test_chip_1994.png",
				"chips/test_chip_1995.png",
				"chips/test_chip_1996.png",
				"chips/test_chip_1997.png",
				"chips/test_chip_1998.png",
				"chips/test_chip_1999.png",
				"chips/test_chip_2000.png",
				"chips/test_chip_2001.png",
				"chips/test_chip_2002.png",
				"chips/test_chip_2003.png",
				"chips/test_chip_2004.png",
				"chips/test_chip_2005.png",
				"chips/test_chip_2006.png",
				"chips/test_chip_2007.png",
				"chips/test_chip_2008.png",
				"chips/test_chip_2009.png",
				"chips/test_chip_2010.png",
				"chips/test_chip_2011.png",
				"chips/test_chip_2012.png",
				"chips/test_chip_2013.png",
				"chips/test_chip_2014.png"
			];
			var years = [];
			for(var i=0;i<images.length;i++){years.push(1985+i)}
			
			var chipInfo = {
					//box: 1,
					//boxZoom: 1,
					//chipSize:195,
					//halfChipSize:97.5,
					//offset:30,
					//canvasHeight:195, //212,
					//dateYpos:207,
					//dateXpos:76.05,
					//zoomLevel:20, //0
					chips:{
						useThisChip:[],
						canvasIDs:[],
						imgIDs:[],
						sxOrig:[],
						syOrig:[],
						sWidthOrig:[],
						sxZoom:[],
						syZoom:[],
						sWidthZoom:[],
						chipsInStrip:[]
					}
				};
			
			var chipDisplayProps = {
					box: 1,
					boxZoom: 1,
					chipSize:195,
					halfChipSize:97.5,
					offset:30,
					canvasHeight:195, //212,
					zoomLevel:20,
					plotColor:"#ED2939"					//0
			};
			
			var n_chips = images.length,
				minZoom = 0,
				maxZoom = 40,
				stopZoom = 40,
				sAdj = [0],
				lwAdj = [chipDisplayProps.box],
				zoomIn = 0;
			
			///////////PLOT SIZE CHANGE///////////////////////////////////////////////////////////////////////////////			
			$("#plotSize").change(function(){
				var plotSizeObject = $("#plotSize"),
					plotSize = parseInt(plotSizeObject.prop("value"));
				if((plotSize % 2) == 0){plotSize += 1}
				plotSize = Math.min(plotSize,5);
				plotSize = Math.max(plotSize,1);
				plotSizeObject.prop("value",plotSize);	
				//chipInfo.box = Math.sqrt(plotSize);
				chipDisplayProps.box = plotSize;
				$("#plotSizeList").hide();
				switch(chipDisplayProps.box){
					case 1:
						stopZoom = 40;
					break;
					case 3:
						stopZoom = 32;
					break;
					case 5:
						stopZoom = 27;
					break;
				}
				updateChipInfo();
				drawAllChips();	
			});
						
			///////////CHIP SIZE CHANGE///////////////////////////////////////////////////////////////////////////////
			$("#chipSize").change(function(){
				var chipSizeObject = $("#chipSize"),
					chipSize = parseInt(chipSizeObject.prop("value"));
				if((chipSize % 2) == 0){chipSize += 1}
				chipSize = Math.min(chipSize,255);
				chipSize = Math.max(chipSize,135);
				chipSizeObject.prop("value",chipSize);
				
				//redraw the canvases and img chips
				chipDisplayProps.chipSize = chipSize;
				chipDisplayProps.halfChipSize = chipSize/2;
				chipDisplayProps.offset = (255 - chipSize)/2;
				chipDisplayProps.canvasHeight = chipSize//+17;

				$(".chipHolder").remove();
				appendChips("main");
				updateChipInfo();
				drawAllChips();	
				
				//send the zoom message
				//these if's are exclusive - in the main window originURL is always null, in the remote window chipstripwindow is always null
				if ((chipstripwindow != null) && chipstripwindow.closed == false){
					var message = {"action":"chipSize","chipDisplayProps":chipDisplayProps} //prepare zoom message
					chipstripwindow.postMessage(JSON.stringify(message),"*");	
				}
				
			});
			
			$("#zoomSize").change(function(){
				var zoomSizeObject = $("#zoomSize"),
					zoomSize = parseInt(zoomSizeObject.val());
					if (zoomSize > stopZoom){zoomSize = stopZoom}
					if (zoomSize < minZoom){zoomSize = minZoom}
					chipDisplayProps.zoomLevel = zoomSize;
	
					drawAllChips(); //redraw the chips with the new zoom

					//send the zoom array to the external window
					if ((chipstripwindow != null) && chipstripwindow.closed == false){ 
						//prepare zoom message
						zoomInfo = {
							"action":"zoom",
							"zoomLevel":chipDisplayProps.zoomLevel
						}
						//send the zoom message
						chipstripwindow.postMessage(JSON.stringify(zoomInfo),"*");
					}				
			});
			
			
			$("#expandChipGallery").click(function(){
				
			});
			
			
			
			///////////DEFINE THE FUNCTION TO ADD THE CANVAS AND IMAGE FOR EACH CHIP ON-THE-FLY////////////
			$.fn.eqAnyOf = function (arrayOfIndexes) {
				return this.filter(function(i) {
					return $.inArray(i, arrayOfIndexes) > -1;
				});
			};
			
			
			var imgSrcAppended = false //tracker - once the image src's have been appended don't do it again
			function appendChips(window, selected){ //this function is handling the appending of the main chips and the remote chips, though it might be better to separate them
				switch(window){
					case "main":
						for(var i=0; i<n_chips; i++){
							chipInfo.chips.canvasIDs[i] = ("chip"+i) 
							chipInfo.chips.imgIDs[i] = ("img"+i)
							var appendThisCanvas = '<div id="'+chipInfo.chips.canvasIDs[i]+'" class="chipHolder">'+
									'<canvas class="chipImg" width="'+chipDisplayProps.chipSize+'" height="'+chipDisplayProps.canvasHeight+'"></canvas>'+
									'<div class="chipDate">date'+
										'<span class="glyphicon glyphicon-new-window expandChipYear" aria-hidden="true" style="float:right; margin-right:5px"></span>'+
									'</div>'+
								'</div>',
								appendThisImg = '<img class="chipImgSrc" id="'+chipInfo.chips.imgIDs[i]+'"src="'+images[i]+'">';
							$("#chip-gallery").append(appendThisCanvas);
							if(imgSrcAppended == false){$("#img-gallery").append(appendThisImg);}
						}
						imgSrcAppended = true //tracker - once the image src's have been appended don't do it again
					break;
					case "remote":
						for(var i=0; i<n_chips; i++){
							chipInfo.chips.canvasIDs[i] = ("chip"+i) 
							chipInfo.chips.imgIDs[i] = ("img"+i)
							var appendThisCanvas = '<div id="'+chipInfo.chips.canvasIDs[i]+'" class="chipHolder">'+
									'<canvas class="chipImg" width="'+chipDisplayProps.chipSize+'" height="'+chipDisplayProps.canvasHeight+'"></canvas>'+
									'<div class="chipDate">date</div>'+
								'</div>',
								appendThisImg = '<img class="chipImgSrc" id="'+chipInfo.chips.imgIDs[i]+'"src="'+images+'">';
							$("#chip-gallery").append(appendThisCanvas);
							$("#img-gallery").append(appendThisImg);
						}
						appendThisImg = '<img class="chipImgSrc" id="'+chipInfo.chips.imgIDs[i]+'"src="'+images+'">';
						$("#img-gallery").append(appendThisImg);
						
					break;
				}										
				$(".chipHolder").eqAnyOf(selected).addClass("selected");
				//$("#chip0, #chip"+(n_chips-1)).addClass("selected")				
			}
			
			
			
			////////////////DEFINE FUNCTION TO INITIALLY POPULATE CHIPINFO OBJECT/////////////////////////////////////
			function makeChipInfo(selection){
				for(var i=0; i < n_chips; i++){					
					var thisimg = document.getElementById(chipInfo.chips.imgIDs[i]);
					var	thisManyChips = thisimg.naturalHeight/255; 
					if(selection == "random"){
						//randomly select a chip from a strip to display - not needed once we have json file to tell us
						useThisChip = Math.floor((Math.random() * thisManyChips)); 
					} else if(selection == "ordered"){
						useThisChip = i;						
					} else if(selection == "json"){
							
					}
					//define/store some other info needed for zooming
					chipInfo.chips.chipsInStrip.push(thisManyChips);
					chipInfo.chips.useThisChip.push(useThisChip);			
				}				
				updateChipInfo()
			}
			
			
			////////////////DEFINE FUNCTION TO UPDATE THE CHIPINFO OBJECT WHEN A NEW CHIP SIZE IS SELECTED////////////
			function updateChipInfo(){
				for(var i=0; i < n_chips; i++){										
					//define/store some other info needed for zooming
					chipInfo.chips.sxOrig[i] = chipDisplayProps.offset;	//0 chipInfo.offset set/push the original source x offset to the sxOrig array
					chipInfo.chips.syOrig[i] = (255*chipInfo.chips.useThisChip[i])+chipDisplayProps.offset; // +chipInfo.offset   set/push the original source y offset to the syOrig array
					chipInfo.chips.sWidthOrig[i] = chipDisplayProps.chipSize; //255  set/push the original source x width to the sWidthOrig array
					chipInfo.chips.sxZoom[i] = chipInfo.chips.sxOrig[i];
					chipInfo.chips.syZoom[i] = chipInfo.chips.syOrig[i];
					chipInfo.chips.sWidthZoom[i] = chipInfo.chips.sWidthOrig[i];					
				}
				
				var starter = chipDisplayProps.halfChipSize,
					lwstarter = chipDisplayProps.box;
									
				for(var i=1; i<maxZoom+1; i++){
					starter *= 0.9 
					sAdj[i] = (chipDisplayProps.halfChipSize-starter);
					lwstarter /= 0.9;
					lwAdj[i] = lwstarter;
				}
			}
						
			
			/////////////////////////////////////////////////////////////////////////////////////////////////////
			/////////////////////////////////////////////////////////////////////////////////////////////////////
			var tlImgID = "" //global
			var timeLapseIndex = 0,
				tlCanvasID = document.getElementById("tlCanvas"),			
				playTL;

			function tlPlay(){
				tlImgID = $(".chipImgSrc").eq(timeLapseIndex)[0]
				tlctx.drawImage(
					tlImgID,
					chipInfo.chips.sxZoom[timeLapseIndex],
					chipInfo.chips.syZoom[timeLapseIndex],
					chipInfo.chips.sWidthZoom[timeLapseIndex],
					chipInfo.chips.sWidthZoom[timeLapseIndex],
					0,0,235,235
				);
				tlctx.strokeStyle=chipDisplayProps.plotColor; //"#FF0000"
				tlctx.lineWidth=1;
				tlctx.lineCap = 'square';
				tlctx.strokeRect(117.5-(chipDisplayProps.boxZoom/2), 117.5-(chipDisplayProps.boxZoom/2), chipDisplayProps.boxZoom, chipDisplayProps.boxZoom);
				$("#tlDate").text(data.Values[timeLapseIndex].Year);
				if(timeLapseIndex < len-1){timeLapseIndex += 1} else {timeLapseIndex = 0}
				 			
			}
			
			$(".tlBtn").click(function(){
				var thisID = $(this).attr("id");
				clearInterval(playTL);
				if(thisID == "tlBackx2"){
					timeLapseIndex += -2;
					timeLapseIndex = (timeLapseIndex < 0) ? 0:timeLapseIndex
					drawTLimage();
					$("#tlDate").text(data.Values[timeLapseIndex].Year);
				} else if(thisID == "tlBack" && timeLapseIndex > 0){
					timeLapseIndex += -1;
					drawTLimage();
					$("#tlDate").text(data.Values[timeLapseIndex].Year);					
				} else if(thisID == "tlPlay"){
					playTL = setInterval(tlPlay, 300);
				} else if(thisID == "tlPause"){
				
				} else if(thisID == "tlForward" && timeLapseIndex < len-1){
					timeLapseIndex += 1;
					drawTLimage();
					$("#tlDate").text(data.Values[timeLapseIndex].Year);
				} else if(thisID == "tlForwardx2"){
					timeLapseIndex += 2;
					timeLapseIndex = (timeLapseIndex > len-1) ? (len-1):timeLapseIndex
				}
				drawTLimage();
				$("#tlDate").text(data.Values[timeLapseIndex].Year);
			})
			
			function drawTLimage(){
				tlImgID = $(".chipImgSrc").eq(timeLapseIndex)[0]
				tlctx.drawImage(
					tlImgID,
					chipInfo.chips.sxZoom[timeLapseIndex],
					chipInfo.chips.syZoom[timeLapseIndex],
					chipInfo.chips.sWidthZoom[timeLapseIndex],
					chipInfo.chips.sWidthZoom[timeLapseIndex],
					0,0,235,235
				);
				tlctx.strokeStyle=chipDisplayProps.plotColor; //"#FF0000"
				tlctx.lineWidth=1;
				tlctx.lineCap = 'square';
				tlctx.strokeRect(117.5-(chipDisplayProps.boxZoom/2), 117.5-(chipDisplayProps.boxZoom/2), chipDisplayProps.boxZoom, chipDisplayProps.boxZoom);
			}
			
			/////////////////////////////////////////////////////////////////////////////////////////////////////
			/////////////////////////////////////////////////////////////////////////////////////////////////////
			
			
			
			
			
			
			
			
			
			
			
			
			////////////////DEFINE FUNCTION TO DRAW ALL THE IMAGE CHIPS TO THE CANVASES/////////////////////
			//var plotColor = $("#plotColor").prop("value") //global variable
			function drawAllChips(){
				updateZoom();
				for(var i=0; i<n_chips; i++){drawOneChip(i)}
			}

			
			////////////DEFINE FUNCTION TO DRAW A NEW IMAGE SECTION TO A CANVAS////////////////////////////
			function drawOneChip(thisChip){				
				//var imgID = document.getElementById(chipInfo.chips.imgIDs[thisChip]),   //these might be faster - need to add an ID to the canvases - right now it is all tied to indexes of .chipHolder divs for the differnt components (canvas, img, date) 
				//	canvasID = document.getElementById(chipInfo.chips.canvasIDs[thisChip]),
				var imgID = $(".chipImgSrc").eq(thisChip)[0],
					canvasID = $(".chipImg").eq(thisChip)[0],
					ctx = canvasID.getContext("2d");
				//ctx.clearRect(0, 0, canvasID.width, canvasID.height);
				ctx.mozImageSmoothingEnabled = false;
				ctx.msImageSmoothingEnabled = false;
				ctx.imageSmoothingEnabled = false;		
				ctx.drawImage(
					imgID,
					chipInfo.chips.sxZoom[thisChip],
					chipInfo.chips.syZoom[thisChip],
					chipInfo.chips.sWidthZoom[thisChip],
					chipInfo.chips.sWidthZoom[thisChip],
					0,0,chipDisplayProps.chipSize,chipDisplayProps.chipSize
				); //chipInfo.offset,chipInfo.offset
				ctx.strokeStyle=chipDisplayProps.plotColor; //"#FF0000"
				ctx.lineWidth=1;
				ctx.lineCap = 'square';
				ctx.strokeRect(chipDisplayProps.halfChipSize-(chipDisplayProps.boxZoom/2), chipDisplayProps.halfChipSize-(chipDisplayProps.boxZoom/2), chipDisplayProps.boxZoom, chipDisplayProps.boxZoom);
				//ctx.font = "11px";
				//ctx.fillText("Image Date",chipInfo.dateXpos,chipInfo.dateYpos); //NEED TO GET THE "IMAGE DATE" PASSED IN AS A PARAMETER FROM THE JSON OBJECT OR SIMILAR
			}
			
							
			////////////REPLACE A CHIP WITH ONE SELECTED IN THE REMOTE WINDOW//////////////////////////////
			function replaceChip(pass_data){
				//adjust the chip offset for the orig			
				var thisChip = pass_data.originChipIndex
				chipInfo.chips.useThisChip[thisChip] = pass_data.useThisChip
				chipInfo.chips.syOrig[thisChip] = (255*chipInfo.chips.useThisChip[thisChip])+chipDisplayProps.offset; // +chipInfo.offset   set/push the original source y offset to the syOrig array
				chipInfo.chips.syZoom[thisChip] = chipInfo.chips.syOrig[thisChip]+sAdj[chipDisplayProps.zoomLevel];
				//draw the chip - need to call updateZoom first since not running drawAllChips
				//updateZoom() //don't need to run since the syZoom was updated a line up
				drawOneChip(thisChip)	
			}
			/////////////////////////////////////////////////////////////////////////////////////////////////
			
			
			function updateZoom(){
				for(var i=0; i<n_chips; i++){
					chipInfo.chips.sxZoom[i] = chipInfo.chips.sxOrig[i]+sAdj[chipDisplayProps.zoomLevel];
					chipInfo.chips.syZoom[i] = chipInfo.chips.syOrig[i]+sAdj[chipDisplayProps.zoomLevel];
					chipInfo.chips.sWidthZoom[i] = chipInfo.chips.sWidthOrig[i]-(sAdj[chipDisplayProps.zoomLevel]*2);
				}
				chipDisplayProps.boxZoom = lwAdj[chipDisplayProps.zoomLevel];
			}
  
			
			$(document).ready(function(){ //not sure if this $(document).ready check is needed, but doesn't hurt
				$(document).on("mousewheel","canvas",function(e){
					if(e.shiftKey){ //
						e.preventDefault(); //make sure that default browser behaviour is prevented
						if(e.deltaX <= -1 || e.deltaY >= 1){zoomIn = 1} else {zoomIn = 0}
						if(zoomIn > 0){
							if (chipDisplayProps.zoomLevel < maxZoom & chipDisplayProps.zoomLevel < stopZoom){chipDisplayProps.zoomLevel++;}
						} else {
							if (chipDisplayProps.zoomLevel > minZoom){chipDisplayProps.zoomLevel--;}
						}
						drawAllChips(); //redraw the chips with the new zoom						
						zoomInfo = {"action":"zoom","zoomLevel":chipDisplayProps.zoomLevel} //prepare zoom message
						
						//send the zoom message
						//these if's are exclusive - in the main window originURL is always null, in the remote window chipstripwindow is always null
						if ((chipstripwindow != null) && chipstripwindow.closed == false){
							chipstripwindow.postMessage(JSON.stringify(zoomInfo),"*");	
						} else if(originURL != null){originURL.postMessage(JSON.stringify(zoomInfo),"*");}	//send the zoom info to the main window
					}
				});
			});
			
			
			//make the chip gallery expand on click
			//$(document).ready(function(){
			//	$("#chip-gallery").click(function(e){
			//		if(!e.ctrlKey && !e.shiftKey){
			//			var status = $(this).css("height");
			//			if(status == "565px"){
			//				$(this).css("height","auto");
			//			} else {
			//				$(this).css("height","565px");
			//			}
			//		}		
			//	});
			//});
			
			
			///////////////////OPEN THE REMOTE CHIP STRIP WINDOW AND SEND MESSAGES/////////////////////
			var chipstripwindow = null ;//keep track of whether the chipstrip window is open or not so it is not opened in multiple new window on each chip click
			var originURL = null;
			$("body").on("click", ".expandChipYear", function(e){ //need to use body because the canvases have probably not loaded yet
				//if (e.ctrlKey) { 					
					//var thisImg = (parseInt($(this).attr("id").replace( /^\D+/g, ''))); //extract the chip index
					var thisImg = $(".expandChipYear").index(this) //extract the chip index
					var pass_data = {
						"action":"add_chips", //hard assign
						"n_chips":chipInfo.chips.chipsInStrip[thisImg], //"n_chips":"40", //get this from the img metadata
						"src":images[thisImg], //"src":"chips/chips_2012.png", //get this from the id of the .chipholder clicked
						//"canvasID":$(this).attr("id"),
						"chipIndex":thisImg,
						"chipDisplayProps":chipDisplayProps,
						"useThisChip":chipInfo.chips.useThisChip[thisImg]
					};
					if ((chipstripwindow == null) || (chipstripwindow.closed)){      //if the window is not loaded then load it and send the message after it is fully loaded
						chipstripwindow = window.open("./chip_strip_6.html","_blank","width=1080px, height=840px", "toolbar=0","titlebar=0","menubar=0","scrollbars=yes"); //open the remote chip strip window
						$(chipstripwindow).load(function(){chipstripwindow.postMessage(JSON.stringify(pass_data),"*");}); //wait until the remote window finishes loading before sending the message
					} else {                                                         //else if the window is already loaded, just send the message - no need to wait
						chipstripwindow.postMessage(JSON.stringify(pass_data),"*");
					}
				//}
			});
			
			
			///////////////////OPEN THE REMOTE CHIP STRIP WINDOW AND SEND MESSAGES/////////////////////
			var trajectoryWindow = null ;//keep track of whether the chipstrip window is open or not so it is not opened in multiple new window on each chip click
			var innerWidth = window.innerWidth
			$("body").on("click", "#btnExpand", function(e){ //need to use body because the canvases have probably not loaded yet
				var pass_data = {
					"action":"add_trajectory", //hard assign
					"data":data,
					"allData":allData,
					"specIndex":specIndex,
					"rgbColor":rgbColor,
					"domain":domain,
					"len":len
				};
				
				if ((trajectoryWindow == null) || (trajectoryWindow.closed)){      //if the window is not loaded then load it and send the message after it is fully loaded
					trajectoryWindow = window.open("./expanded_trajectory_plot.html","_blank","width="+innerWidth+"px, height=750px", "toolbar=0","titlebar=0","menubar=0","scrollbars=yes"); //open the remote chip strip window
					$(trajectoryWindow).load(function(){trajectoryWindow.postMessage(JSON.stringify(pass_data),"*");}); //wait until the remote window finishes loading before sending the message
				} else {                                                         //else if the window is already loaded, just send the message - no need to wait
					trajectoryWindow.postMessage(JSON.stringify(pass_data),"*");
				}
			});
			
			
			
			//////////////////////////GET MESSAGES FROM REMOTE////////////////////////////////////////////
			//receive messages from the origin window
			$(window).on("message onmessage",function(e){
				var pass_data = JSON.parse(e.originalEvent.data);
				if(pass_data.action == "replace_chip"){
					//replaceChip(pass_data.originChipIndex, pass_data.newSyOffset, pass_data.useThisChip);
					replaceChip(pass_data); //replace a chip with one selected in the remote window
				} else if (pass_data.action == "zoom"){
					chipDisplayProps.zoomLevel = pass_data.zoomLevel;
					drawAllChips();
				}
				
				//$("#message").append(e.originalEvent.data); //****need to use 'originalEvent' instead of 'event' since im using jquery to bind the event. the jquery event object is different from the javascript event object - originalEvent is a copied version of the original javascript event object
			});	

			
			/////////////////////////LOAD THE CHIPS////////////////////////////////////////////////////////
			//function to run functions that need all the elements to be loaded - also need to do them in order was the window is loaded
			var tlctx //global
			function start(){
				makeChipInfo("random");
				drawAllChips();
				
				//tlImgID = document.getElementById("img0");
				tlImgID = $(".chipImgSrc").eq(timeLapseIndex)[0]
				tlctx = tlCanvasID.getContext("2d")
				tlctx.mozImageSmoothingEnabled = false;
				tlctx.msImageSmoothingEnabled = false;
				tlctx.imageSmoothingEnabled = false;
				tlctx.drawImage(
					tlImgID,
					chipInfo.chips.sxZoom[timeLapseIndex],
					chipInfo.chips.syZoom[timeLapseIndex],
					chipInfo.chips.sWidthZoom[timeLapseIndex],
					chipInfo.chips.sWidthZoom[timeLapseIndex],
					0,0,235,235
				);
				tlctx.strokeStyle=chipDisplayProps.plotColor; //"#FF0000"
				tlctx.lineWidth=1;
				tlctx.lineCap = 'square';
				tlctx.strokeRect(117.5-(chipDisplayProps.boxZoom/2), 117.5-(chipDisplayProps.boxZoom/2), chipDisplayProps.boxZoom, chipDisplayProps.boxZoom);
				$("#tlDate").text(data.Values[timeLapseIndex].Year);
				
			}