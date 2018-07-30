chrome.runtime.sendMessage({action: "show"});

/* TODO (ARRAY VERSION): 
    - If course is ARR, waitlisted or filled, change state to yellow (in addCourse() and also add a yellow string after soc when add in to addOrder, so can get it color)
    - Check CSS of the #gradeCalc
    - Allow user to export table
    - Consider using json serialization to store needed data
    - Consider add id for each tr so can have easy access, like $('#1 #cred') to get credit of first picked class, so will easy to calculate GPA later on.
    - Revise code logic
    - If course offer P/F, tell user in textarea

    DONE TODO:
    - Revise updateConflict logic, and fix problem where 2 course conflict, remove 1 but the other still marked red
    - Revise calculateGPA
    - Reset lab of picked course color after mark conflicted
    - If course is ARR, waitlisted or filled, change state to yellow (in addCourse() and also add a yellow string after soc when add in to addOrder, so can get it color)
    
    How to make code clear: Name Description Params Return + Search for JS Style Guide
*/

//Color used
var green = '#c8f08c';
var yellow = '#f0e68c';
var red = '#f0b48c';

var gradeList = '<select id="grade"><option></option><option value="4.0">A</option><option value="3.67">A-</option><option value="3.33">B+</option><option value="3.0">B</option><option value="2.67">B-</option><option value="2.33">C+</option><option value="2.0">C</option><option value="1.67">C-</option><option value="1.33">D+</option><option value="1.0">D</option><option value="0.67">D-</option><option value="0.0">F</option>';

function injectDOM(){
    //the following lines are for injecting checkboxes
    $('#courseTable tr:nth-child(2)').prepend("<td></td>"); 
    $('#courseTable tr[valign="top"]').each(function(index){
        $(this).attr('id', $('td:nth-child(1)',this).text());
        $(this).prepend("<td></td>");
        $('td:first-child', this).prepend('<input type="checkbox">');
    });
    
    //the following lines are for adding add-in table
    $('body').prepend('<table id="topTable" style="border-collapse:collapse;border-spacing:0"></table>');
    
    $('#topTable').html('<thead><tr><th id="creditCount" colspan="4">Credit selected: 0</th><td id="gradeCalc" colspan="7"></td></tr><tr style="background-color:#fcff2f;text-align:center"><td>SOC</td><td>Course</td><td>Description</td><td>Credit</td><td>Time</td><td>Area</td><td>Comp</td><td>Instructor</td><td>Room</td><td>Status</td><td>Grade</td></tr><tbody id="courseInfo"></tbody>');
    
    $('#topTable td, #topTable th').css({'font-size':'12px','padding':'10px 5px','border-style':'solid','border-width':'1px'}); //deleted property: 'word-break':'normal','overflow':'hidden'
    
    //the following line are for gradeCalc
    $('#gradeCalc').css('text-align', 'left');
    $('#gradeCalc').html('<label for="oldGPA">Current GPA: </label><input id="oldGPA" type="number" name="oldGPA" step="0.01" min="0" max="4" style="width:3.5em"><label for="credTaken"> Credit taken: </label><input id="credTaken" type="number" name="credTaken" step="0.25" min="0" style="width:4.25em; margin-right:0.5em"><button disabled id="updateButton" style="float:right">Update</button><p style="font-size:12px"><span id="newGPA"> Expected GPA: </span><a href="https://my.depauw.edu/e/student/grades_rpt.asp?r=H" target="_blank" style="text-align: right;float: right;">Check grade</a></p>');
    
    $('body').prepend('<table id="floatTable" style="border-collapse:collapse;border-spacing:0"></table>');
    $('#floatTable').html('<tbody><tr><td>Fill</td></tr></tbody>')
}

//hard-reset version
function calculateGPA(){
    var oldGrade= 0;
    var oldCredit= 0;
    $('#gradeCalc').change(function(){
        if($('#oldGPA').val() != "" && $('#credTaken').val() != ""){
            $('#updateButton').prop("disabled", false);
            oldGrade = parseFloat((parseFloat($('#oldGPA').val())* parseFloat($('#credTaken').val())).toFixed(2));
            oldCredit = parseFloat($('#credTaken').val());
        }
        else{$('#updateButton').prop("disabled", true);}
    });
    
    $('#updateButton').click(function(){
        var newGrade = oldGrade;
        var newCredit = oldCredit;
        $('#topTable tr #grade').each(function(){
            if($(this).val() != ""){
                var pickedGrade = parseFloat($(this).val());
                var pickedCredit = parseFloat($(this).parents('tr').children('#cred').text());
                newGrade += pickedCredit*pickedGrade;
                newCredit += pickedCredit;
            }
        });
        var newGPA = newGrade/newCredit;
        var oldGPA = oldGrade/oldCredit;
        $('#newGPA').text('Expected GPA: ' + newGPA.toFixed(2));
        
        if(newGPA > oldGPA){
            $('#gradeCalc').css('background-color', green);
        }
        else if(newGPA === oldGPA){
            $('#gradeCalc').css('background-color', 'white');
        }
        else{
            $('#gradeCalc').css('background-color', red);
        }
    });
}

function checkConflict(time1, time2){
    if(time1.match('ARR') || time2.match('ARR')){
        return false;
    } 
    
    var timeArray1 = time1.split(' ');
    var timeArray2 = time2.split(' ');
    
    var day1= timeArray1[timeArray1.length-1].replace(/\s+/, ''); //replace use regex to remove whitespace
    var day2= timeArray2[timeArray2.length-1].replace(/\s+/, '').split('');
    
    var dayConflict = false;
    for(var i=0; i<day2.length;i++){
        if(day1.includes(day2[i])){
            dayConflict = true;
        }
    }
    if(!dayConflict){
        return false;
    }
    
    function timeToDecimal(tString){
        var arr = tString.split(':');
        return parseInt(arr[0])*1 + parseInt(arr[1])/60;
    }
    
    var timeData1 = timeArray1[0].split('-');
    var timeData2 = timeArray2[0].split('-');
    
    var timeStart1 = timeToDecimal(timeData1[0]);
    var timeEnd1 = timeToDecimal(timeData1[1]);
    
    var timeStart2 = timeToDecimal(timeData2[0]);
    var timeEnd2 = timeToDecimal(timeData2[1]);
    
    if(timeStart1 < 8){
        timeStart1 += 12;
        timeEnd1 += 12;
    }
    
    else if(timeEnd1 < 8){
        timeEnd1 +=12;
    }
    
    if(timeStart2 < 8){
        timeStart2 += 12;
        timeEnd2 += 12;
    }
    
    else if(timeStart2 < 8){
        timeEnd2 +=12;
    }
    
    if(timeStart1 === timeStart2 || timeEnd1 === timeEnd2){
        return true;
    }
    else if(timeStart1<timeStart2){
        if(timeEnd1 < timeStart2){return false;}
        else{return true;}
    }
    else{
        if(timeEnd2<timeStart1){return false;}
        else{return true;}
    }
}

//iterate through table, check conflict for each course
function updateConflict(){
    var order = addOrder.length;
    var timeList = [];
    for(var i=0; i < order; i++){
        //reset color
        $('#'+ i +'').css('background-color', green); //should be the state instead
        
        //reset color of the coursetable picked course also
        if($('#'+ i+ '').attr('class') === 'lab'){
            $('#'+ addOrder[i-1] +'').next().css('background-color', green);
        }
        else{$('#'+ addOrder[i] +'').css('background-color', green);}
        
        timeList[i] = $('td:nth-child(5)','#'+ (i) +'').text();
    }
    //console.log(timeList);
    
    for(var j=0; j < order-1; j++){
        for(var k=j+1; k < order; k++){
            if(checkConflict(timeList[j],timeList[k])){ 
                $('#'+ j+ ', #' + k+ '').css('background-color', red);
                
                if($('#'+ j+ '').attr('class') === 'lab'){
                    if($('#'+ k+ '').attr('class') === 'lab'){
                        $('#'+ addOrder[k-1] +'').next().css('background-color', red);
                    }
                    $('#'+ addOrder[j-1] +'').next().css('background-color', red);
                }
                else if($('#'+ k+ '').attr('class') === 'lab'){
                    $('#'+ addOrder[k-1] +'').next().css('background-color', red);
                }
                
                $('#'+ addOrder[j]+ ', #' + addOrder[k]+ '').css('background-color', red);
                
                console.log(addOrder);
                //update the state of that course, for now I don't think it is necessary
            }
            //console.log(checkConflict(timeList[j],timeList[k])); for testing, commented when done
        }
    }
} 

//hard-reset version
function updateCredit(){
    var totalCredit = 0.0;
    $('#courseInfo tr').each(function(){
        if($(this).attr('class') != "lab"){
        totalCredit += parseFloat($('td:nth-child(4)',this).text());
        }
    })
    
    $('#creditCount').html('Credit selected: ' + totalCredit +''); //update the total credit
    if(totalCredit < 3.0 && totalCredit>0){
        $('#creditCount').css("background-color", red); //not ok
    }
    else if(totalCredit > 4.5){
        $('#creditCount').css("background-color", yellow); //have to pay extra
    }
    else if(totalCredit === 0){
        $('#creditCount').css("background-color", '#FFFFFF'); //reset
    }
    else{
        $('#creditCount').css("background-color", green); //ok
    }   
}

var addOrder = [];

function addCourse(tr){
/*
   soc = courseData[1]
   crse = courseData[2]
   desc = courseData[3]
   cred = courseData[4]
   time = courseData[5]
   area = courseData[6]
   comp = courseData[7]
   status = courseData[10]
   inst = instRoom[0]
   room = instRoom[1]
*/
    var courseData = [];
    
    $(tr).children('td').each(function(){
        //for course name, get it name and also link
        if($(this).find('nobr').length){
            var data = $(this).find('nobr').html();
            courseData.push(data);
        }
        else{
            var data = $(this).text();
            courseData.push(data);
        }
    });

    var instRoom = courseData[11].split(/([A-Z][A-Z].*)/);
    
    var status = courseData[10].split(" ");
    console.log("status1: " + status[0]+ " status2: " + status[1]);
    var statusString = status[0];
    
    if(status[1].match(/\(+/)){
        console.log("match!");
        statusString += "(WL)";
        var waitlist = true;
    }
    
    var noStudent = status[0].split("/");
    if(parseInt(noStudent[0])>=parseInt(noStudent[1])){
        var filled = true;
    }
            
    addOrder.push(courseData[1]);
    var id = addOrder.length-1;
    
    $('#courseInfo').append('<tr id="'+ id + '" style="background-color:'+ green + '"><td><button>' + courseData[1] + 
                                '</button></td><td>'+ courseData[2] + '</td><td>' + courseData[3] + '</td><td id="cred">' + courseData[4] + '</td><td id="time">' + courseData[5] + 
                                '</td><td>' + courseData[6] + '</td><td>' + courseData[7] + '</td><td>' + instRoom[0] + '</td><td id="room">' + instRoom[1] + '</td><td id="status">'+ statusString +'</td><td>' + gradeList + '</td></tr>');
        
        $('#'+ id +' button').click(function(){
            $(tr)[0].scrollIntoView();
        })
        $(tr).css('background-color', green);
        
    if(waitlist || filled){
        $('#'+id +' #status').css('background-color', yellow);
        $('#'+id +' #status').attr('class', 'yellow');
    }
    
    if(courseData[5].match('ARR')){
        $('#'+id +' #time').css('background-color', yellow);
        $('#'+id +' #room').css('background-color', yellow);
    }
    
    var labCheck = /(L[A-Z])$/;
    var lab = $(tr).next();
    if(labCheck.test($('td:nth-child(2)', lab).text())){
        id++;
        addOrder.push(courseData[1]+' lab');;
        //value.labTime = next.children(':nth-child(5)').text(); left here just in case if need lab time
            
        $('#courseInfo').append('<tr id="'+ id + '" class="lab" style="background-color:'+ green + '"><td>' +
                                lab.children(':nth-child(2)').text() +'</td><td></td><td>'+ lab.children(':nth-child(3)').text() +'</td><td></td><td>' +
                                lab.children(':nth-child(5)').text() + '</td><td></td><td></td><td></td><td>' + 
                                lab.children(':nth-child(10)').text() + '</td><td></td><td></td></tr>');
        lab.css('background-color', green);
    }
    $('#courseInfo td').css({'font-size':'12px','padding':'10px 5px','border-width': '1px','border-style': 'solid'});
}

function removeCourse(tr){
    var id = $(tr).attr('id');
    var index = addOrder.indexOf(id);
    //console.log(addOrder.indexOf(id));
    
    //lab situation
    if($(tr).next().children().text() != ''){
        $('#'+ index.toString() +'').remove();
        $('#'+ (index+1).toString() +'').remove();
        addOrder.splice(index,2);
        $(tr).next().css('background-color', 'white');
    }
    else{
        $('#'+ addOrder.indexOf(id).toString() +'').remove();
        addOrder.splice(index,1);
    }
    //uncolor checked box tr
    $(tr).css('background-color', 'white');
    
    var reOrd = 0;
    $('#courseInfo tr').each(function(){
        $(this).attr('id', reOrd.toString());
        reOrd++;
    })
}

function checkCB(){
    $("input:checkbox").change(function(){
        var tr = $(this).closest('tr');
        if(this.checked){
            addCourse(tr);
            updateConflict();
            updateCredit();
        }
        else{
            removeCourse(tr);
            updateConflict();
            updateCredit();
        }
    });
}

//function updateFloat()

$(document).ready(function(){
    $('table:nth-child(5) tbody').attr('id','courseTable');
    //collapse border so can highlight whole tr
    $('#courseTable').parent().css('border-collapse','collapse');
    
    injectDOM();
    checkCB();
    calculateGPA();
})



