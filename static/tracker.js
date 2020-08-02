// Define mouse status
const SELECTED_NONE = 0;
const SELECTED_ING = 1;
const SELECTED_DRAWED = 2;
const SELECTED_STATUS_TEXT = [
    "SELECTED_NONE", 
    "SELECTED_ING",
    "SELECTED_DRAWED"
];
var SELECTED_STATUS = SELECTED_NONE;

// track curr editing box
var LAST_PTS = [0,0];
var CURR_PTS = [0,0];
var curr_bbox_begin = [0,0];
var curr_bbox_close = [0,0];

// indicating which box we are editing, length of existing boxes if creating new box
var curr_max_index = 0;
var curr_index = 0;

// existing box info
var bboxes_list = {};//img level pos
var classes_list = {};
var name_list = {};

// selected boxes info, to be painted on boxes-canvas
var selected_boxes_list = {};


// record uploaded image info
var IMAGE_ORI_H;
var IMAGE_ORI_W;
var IMAGE_H;
var IMAGE_W;
var IMAGE_H0;
var IMAGE_W0;
var IMAGE_UPLOADED = false;


// global functions
function clearCanvas(){
    LAST_PTS = [0,0];
    CURR_PTS = [0,0];
    curr_bbox_begin = [0,0];
    curr_bbox_close = [0,0];
    $("#name-input").val(" ");
    $("#class-input").val(" ");
    $("#x1-input").val(" ");
    $("#x2-input").val(" ");
    $("#y1-input").val(" ");
    $("#y2-input").val(" ");
    SELECTED_STATUS = SELECTED_NONE;

    var canvas = $("#editing-canvas");
    canvas[0].getContext("2d").clearRect(0,0,canvas.width(), canvas.height());
}

function clearAll(){
    bboxes_list = [];
    curr_index = 0;
    $("#bbox_list").empty();
    clearCanvas();
}

// box level util functions
function isPosEqual(pos1, pos2){
    return Math.abs(pos1[0]-pos2[0])<10 && Math.abs(pos1[1]-pos2[1])<10;
}
function correctBox(bbox){
    var x0 = Math.min(bbox[0], bbox[2]);
    var y0 = Math.min(bbox[1], bbox[3]);
    var x1 = Math.max(bbox[0], bbox[2]);
    var y1 = Math.max(bbox[1], bbox[3]);
    return [x0, y0, x1, y1];
}

function correctBoxDisplay(coord){
    $("#x1-input").val(Math.min(coord[0], coord[2]));
    $("#y1-input").val(Math.min(coord[1], coord[3]));
    $("#x2-input").val(Math.max(coord[0], coord[2]));
    $("#y2-input").val(Math.max(coord[1], coord[3]));
}

function drawBox(bbox, ctx){
    ctx.beginPath();
    var width = bbox[2]-bbox[0]+1;
    var height = bbox[3]-bbox[1]+1;
    ctx.rect(bbox[0], bbox[1], width, height);
    ctx.strokeStyle = 'green';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.fillRect(bbox[0]-2, bbox[1]-2, 5, 5);
    ctx.fillRect(bbox[0]+width-3, bbox[1]-2, 5, 5);
    ctx.fillRect(bbox[0]-2, bbox[1]+height-3, 5, 5);
    ctx.fillRect(bbox[0]+width-3, bbox[1]+height-3, 5, 5);
    ctx.strokeStyle = 'yellow';
    ctx.stroke();
}

function canvasPos2imgPos(canvas_x, canvas_y){
    var canvas_h = $("#editing-canvas").height();
    var canvas_w  = $("#editing-canvas").width();
    
    var img_ori_height, img_ori_width;
    var img_display_height, img_display_width;
    var img_display_x0, img_display_y0;

    // uploaded image
    img_ori_height = IMAGE_ORI_H;
    img_ori_width  = IMAGE_ORI_W;   
    img_display_x0 = IMAGE_W0;
    img_display_y0 = IMAGE_H0;
    img_display_height = IMAGE_H;
    img_display_width  = IMAGE_W;

    img_x =  (canvas_x-img_display_x0) / img_display_width  * img_ori_width ;
    img_y =  (canvas_y-img_display_y0) / img_display_height * img_ori_height ;
    
    return [img_x, img_y];
}

function imgPos2canvasPos(img_x, img_y){
    var canvas_x = (img_x) / IMAGE_ORI_W * IMAGE_W + IMAGE_W0;
    var canvas_y = (img_y) / IMAGE_ORI_H * IMAGE_H + IMAGE_H0;
    return [canvas_x, canvas_y];
}

function xywh2xyxy(box){
    return [box[0], box[1], box[0]+box[2]-1, box[1]+box[3]-1];
}

function renderSelectedBoxes(){
    var canvas = $("#boxes-canvas");
    var ctx = canvas[0].getContext("2d");
    ctx.clearRect(0,0,canvas.width(), canvas.height());
    for (let ind in selected_boxes_list){
        var lefttop = imgPos2canvasPos(selected_boxes_list[ind][0], selected_boxes_list[ind][1]);
        var rightbot = imgPos2canvasPos(selected_boxes_list[ind][2], selected_boxes_list[ind][3]);
        console.log(lefttop.concat(rightbot));
        drawBox(lefttop.concat(rightbot), ctx);
    }
    // console.log(selected_boxes_list);
}

$("#btn-upload").click(function(e){
    $("#img-upload").trigger("click");
});

$("#img-upload").change(function(e){
    clearAll();
    var fr, img, img_file;

    function imageLoaded(){
        var canvas = $("#img-canvas");
        var boxes_canvas = $("#boxes-canvas");
        var editing_canvas = $("#editing-canvas");
        let width = canvas.width();
        let height = canvas.height();
        let img_width = img.width;
        let img_height = img.height;
        
        // resize based on  height
        if (img_height / img_width > height / width){
            var standard_height = height * 0.95;
            const resize_ratio = standard_height / img_height;
            img_width *= resize_ratio;
            img_height = standard_height;
        }else{
            var standard_width = width * 0.95;
            const resize_ratio = standard_width / img_width;
            img_height *= resize_ratio;
            img_width = standard_width;
        }
        
        IMAGE_H = img_height;
        IMAGE_W = img_width;

        IMAGE_ORI_H = img.height;
        IMAGE_ORI_W = img.width;
        
        let img_height_start = (height-img_height)/2;
        let img_width_start  = (width-img_width)/2;
        
        IMAGE_H0 = img_height_start;
        IMAGE_W0 = img_width_start;
        
        var ctx = canvas[0].getContext("2d");
        ctx.clearRect(0, 0, width, height);
        canvas[0].width = width;
        canvas[0].height = height;
        boxes_canvas[0].width = width;
        boxes_canvas[0].height = height;
        editing_canvas[0].width = width;
        editing_canvas[0].height = height;
        ctx.drawImage(img,  0, 0, img.width, img.height, IMAGE_W0, IMAGE_H0, IMAGE_W, IMAGE_H);
    }

    function createImage(){
        img = new Image();
        
        img.onload = imageLoaded;
        
        img.src = fr.result;
        IMAGE_UPLOADED = true;
        IMAGE_ORI_H = img.height;
        IMAGE_ORI_W = img.width; 
    }
    
    img_file = e.target.files[0];

    fr = new FileReader();
    fr.onload = createImage;
    fr.readAsDataURL(img_file);

});


const STATUS_NONE = 0;
const STATUS_TOP_LEFT = 1;
const STATUS_TOP_RIGHT = 2;
const STATUS_BOT_LEFT = 3;
const STATUS_BOT_RIGHT = 4;

const STATUS_TEXT = [
    "STATUS_NONE",
    "STATUS_TOP_LEFT",
    "SATUS_TOP_RIGHT",
    "STATUS_BOT_LEFT",
    "STATUS_BOT_RIGHT"
];

function check_select_existed_bbox(client_pt){
    function isClose(val1, val2){
        return Math.abs(val1-val2)<10;
    }
    var x0 = curr_bbox_begin[0];
    var y0 = curr_bbox_begin[1];
    var x1 = curr_bbox_close[0];
    var y1 = curr_bbox_close[1];
    if (isClose(x0, client_pt[0])){
        if (isClose(y0, client_pt[1])){
            return STATUS_TOP_LEFT;
        }else if (isClose(y1, client_pt[1])){
            return STATUS_BOT_LEFT;
        }
    }else if (isClose(x1, client_pt[0])){
        if (isClose(y0, client_pt[1])){
            return STATUS_TOP_RIGHT;
        }else if (isClose(y1, client_pt[1])){
            return STATUS_BOT_RIGHT;
        }
    }
    return STATUS_NONE;
}


$("#editing-canvas").on({
    "mousemove": function(event){
        var bbox_x = event.clientX - $("#editing-canvas")[0].getBoundingClientRect().left;
        var bbox_y = event.clientY - $("#editing-canvas")[0].getBoundingClientRect().top;

        let [pos_x, pos_y]  = canvasPos2imgPos(bbox_x, bbox_y);
 
        $("#tracker-x").text(pos_x.toFixed(4));
        $("#tracker-y").text(pos_y.toFixed(4));
        var width = $("#editing-canvas").width();
        var height = $("#editing-canvas").height();
        var ctx = $("#editing-canvas")[0].getContext("2d");
        if (SELECTED_STATUS == SELECTED_ING){
            CURR_PTS = [pos_x, pos_y];
            correctBoxDisplay(LAST_PTS.concat(CURR_PTS));
            ctx.clearRect(0, 0, width, height);
            curr_bbox_close[0] = bbox_x;
            curr_bbox_close[1] = bbox_y;
            drawBox(correctBox(curr_bbox_begin.concat(curr_bbox_close)), ctx);
        }
    },
    "mousedown": function(event){
        var bbox_x = event.clientX - $("#editing-canvas")[0].getBoundingClientRect().left;
        var bbox_y = event.clientY - $("#editing-canvas")[0].getBoundingClientRect().top;

        let [pos_x, pos_y]  = canvasPos2imgPos(bbox_x, bbox_y);

        SELECTED_STATUS = SELECTED_ING;

        var status = check_select_existed_bbox([bbox_x, bbox_y]);

        var x0_disp = parseFloat($("#x1-input").val());
        var x1_disp = parseFloat($("#x2-input").val());
        var y0_disp = parseFloat($("#y1-input").val());
        var y1_disp = parseFloat($("#y2-input").val());

        switch (status) {
            case STATUS_TOP_LEFT:
                LAST_PTS = [x1_disp, y1_disp];
                CURR_PTS = [pos_x, pos_y];
                $("#x1-input").val(pos_x);
                $("#y1-input").val(pos_y);
                curr_bbox_begin = curr_bbox_close;
                curr_bbox_close = [bbox_x, bbox_y];
                break;
            case STATUS_TOP_RIGHT:
                LAST_PTS = [x0_disp, y1_disp];
                CURR_PTS = [pos_x, pos_y];
                $("#x1-input").val(x0_disp);
                $("#y1-input").val(pos_y);
                $("#x2-input").val(pos_x);
                $("#y2-input").val(y1_disp);
                curr_bbox_begin = [curr_bbox_begin[0], curr_bbox_close[1]];
                curr_bbox_close = [bbox_x, bbox_y];
                break;
            case STATUS_BOT_LEFT:
                LAST_PTS = [x1_disp, y0_disp];
                CURR_PTS = [pos_x, pos_y];
                $("#x1-input").val(pos_x);
                $("#y1-input").val(y0_disp);
                $("#x2-input").val(x1_disp);
                $("#y2-input").val(pos_y);
                curr_bbox_begin = [curr_bbox_close[0], curr_bbox_begin[1]];
                curr_bbox_close = [bbox_x, bbox_y];
                break;
            case STATUS_BOT_RIGHT:
                LAST_PTS = [x0_disp, y0_disp];
                CURR_PTS = [pos_x, pos_y];
                $("#x2-input").val(pos_x);
                $("#y2-input").val(pos_y);
                curr_bbox_close = [bbox_x, bbox_y];
                break;
            default:
                // a brand new box
                LAST_PTS = [pos_x, pos_y];
                CURR_PTS = [pos_x, pos_y];
                curr_bbox_close = [bbox_x, bbox_y];
                curr_bbox_begin = [bbox_x, bbox_y];
                $("#x1-input").val(pos_x);
                $("#y1-input").val(pos_y);
                $("#x2-input").val(pos_x);
                $("#y2-input").val(pos_y);
                break;
        }

    },
    "mouseup": function(event){
        var bbox_x = event.clientX - $("#editing-canvas")[0].getBoundingClientRect().left;
        var bbox_y = event.clientY - $("#editing-canvas")[0].getBoundingClientRect().top;

        let [pos_x, pos_y]  = canvasPos2imgPos(bbox_x, bbox_y);

        CURR_PTS = [pos_x, pos_y] ;
        curr_bbox_close = [bbox_x, bbox_y];

        SELECTED_STATUS = SELECTED_DRAWED;
        var final_bbox = correctBox(LAST_PTS.concat(CURR_PTS));
        LAST_PTS = final_bbox.slice(0,2);
        CURR_PTS = final_bbox.slice(2);
        final_bbox = correctBox(curr_bbox_begin.concat(curr_bbox_close));
        curr_bbox_begin = final_bbox.slice(0,2);
        curr_bbox_close = final_bbox.slice(2);
    }

});

function editBoxDisplay(name, cls, index){
    // create new box
    if (index==curr_max_index){
        var listToAppend = $("<li/></li>", {
            id: "bbox_list_li_"+index,
            class: "bbox-list-ele",
        }); 
        var listDiv = $("<div></div>", {
            class: "row bbox-list-div"
        });

        var checkbox = $("<div></div>", {
            class: "custom-control custom-checkbox col-5"
        });

        var input = $("<input/></input>", {
            id: "bbox_list_input_" + index,
            class: "custom-control-input",
            type: "checkbox",
            name: "bbox_select",
            value: "bbox_select"
        });
        var label = $("<label/></label>", {
            id: "bbox_list_label_" + index,
            class: "custom-control-label",
            for: "bbox_list_input_" + index,
            text: name + " "  + cls
        });
        checkbox.append(input,label);

        var btn_group = $("<div></div>", {
            class: "btn-group btn-group-sm col-5",
        });
        var editBtn = $("<button></button>", {
            id: "bbox_list_edit_" + index,
            type: "button",
            class: "btn btn-secondary",
            text: "Edit"
        });
        var deleteBtn = $("<button></button>", {
            id: "bbox_list_delete_" + index,
            type: "button",
            class: "btn btn-secondary",
            text: "Delete"
        });
        btn_group.append(editBtn, deleteBtn);

        listDiv.append(checkbox, btn_group)
        listToAppend.append(listDiv);
        $("#bbox-list").append(listToAppend);
    }else{
        $("#bbox_list_label_"+index).text(name + " " + cls);
    }
}

$("#btn-confirm").click(function(){
    var box_to_append = [
        parseFloat($("#x1-input").val()),
        parseFloat($("#y1-input").val()),
        (parseFloat($("#x2-input").val()) - parseFloat($("#x1-input").val()) + 1),
        (parseFloat($("#y2-input").val()) - parseFloat($("#y1-input").val()) + 1)
    ];
    var cls = $("#class-input").val();
    var name = $("#name-input").val();
    
    // create new box display or edit existing display
    editBoxDisplay(name, cls, curr_index);

    bboxes_list[curr_index] = box_to_append;
    classes_list[curr_index] = cls;
    name_list[curr_index] = name;

    if (curr_index==curr_max_index){
        curr_max_index++;
        curr_index++;
    }else {
        if ($("#bbox_list_input_"+curr_index).is(":checked")){
            selected_boxes_list[curr_index] = xywh2xyxy(box_to_append);
            renderSelectedBoxes();
        }
        curr_index = curr_max_index;
    }

    clearCanvas();
});


$("#bbox-list").on("click", "button[id^='bbox_list_delete']", function(){
    console.log("enter");
    var list_ind = parseInt($(this).attr("id").split("_").slice(-1)[0]);
    $("#bbox_list_li_"+list_ind).remove();
    delete bboxes_list[list_ind];
    delete classes_list[list_ind];
    delete name_list[list_ind];
    if (list_ind==curr_index){
        curr_index = curr_max_index;
        clearCanvas();
        SELECTED_STATUS=SELECTED_NONE;
    }
    if (list_ind in selected_boxes_list){
        delete selected_boxes_list[list_ind];
        renderSelectedBoxes();
    }
});

$("#bbox-list").on("click", "button[id^='bbox_list_edit']", function(){
    var list_ind = parseInt($(this).attr("id").split("_").slice(-1)[0]);
    curr_index = list_ind;
    clearCanvas();
    if (list_ind in selected_boxes_list){
        delete selected_boxes_list[list_ind];
        renderSelectedBoxes();
    }
    SELECTED_STATUS = SELECTED_DRAWED;
    var [img_x0, img_y0, img_lvl_width, img_lvl_height] = bboxes_list[curr_index];
    var [img_x1, img_y1] = [img_x0 + img_lvl_width - 1, img_y0 + img_lvl_height - 1];

    var [canvas_x0, canvas_y0] = imgPos2canvasPos(img_x0, img_y0);
    var [canvas_x1, canvas_y1] = imgPos2canvasPos(img_x1, img_y1);
    LAST_PTS =  [img_x0, img_y0];
    CURR_PTS = [img_x1, img_y1];
    curr_bbox_begin = [canvas_x0, canvas_y0];
    curr_bbox_close = [canvas_x1, canvas_y1];
    $("#x1-input").val(img_x0);
    $("#y1-input").val(img_y0);
    $("#x2-input").val(img_x1);
    $("#y2-input").val(img_y1);
    $("#name-input").val(name_list[curr_index]);
    $("#class-input").val(classes_list[curr_index]);
    var ctx = $("#editing-canvas")[0].getContext("2d");
    drawBox([canvas_x0, canvas_y0, canvas_x1, canvas_y1], ctx);
});


$("#bbox-list").on("click", "input[id^='bbox_list_input']", function(){
    var list_ind = parseInt($(this).attr("id").split("_").slice(-1)[0]);
    if ($(this).is(":checked"))
        selected_boxes_list[list_ind] = xywh2xyxy(bboxes_list[list_ind]);
    else delete selected_boxes_list[list_ind];

    renderSelectedBoxes();
});



$("#btn-download").click(function(){
    var jsonRes = {"anns":[]};
    for (let i=0;i<bboxes_list.length;i++){
        var obj = {
            "name": name_list[i],
            "cls":  classes_list[i],
            "bbox": bboxes_list[i]
        };
        jsonRes.anns.push(obj);
    }

    $.ajax({
        url: "/upload",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(jsonRes),
        success: function(res){}
    });

    window.location.href = "http://localhost/download";
});
