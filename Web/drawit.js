/*
(C) 2007 Stuart James Urquhart (jamesu at gmail.com). All Rights Reserved.

Demonstration to allow for simplistic editing of canvas objects.

*/

// Constants
var DrawItConstants = {
	// Constants

	MOUSE_DOWN : 0,
	MOUSE_UP : 1,
	MOUSE_MOVE: 2,
	KEY_DOWN: 3,
	KEY_UP: 4,
	
	MODE_OBJECT: 0x1,
	MODE_POINT: 0x2,
	MODE_POSE: 0x4,
	
	// Object types
	OBJ_GENERIC: 0x00FF,
	OBJ_GROUP: 0x1,
	OBJ_LINK: 0x2,
	OBJ_JOINT: 0x4,
	OBJ_POLY: 0x8,
	OBJ_SHAPE: 0x10,
	OBJ_MAGIC: 0x20,

	OBJ_EDIT: 0xFF00,
	OBJ_EDIT_CUSTOM: 0x100,
	OBJ_EDIT_MARKER: 0x200,
	OBJ_EDIT_JOINT: 0x200,
	OBJ_EDIT_JOINT_POSE: 0x400,
	
	OBJ_ALL: 0xFFFF,
	
	// Magic shape types
	MAGIC_NONE: 0,
	MAGIC_RECT: 1,
	MAGIC_CIRCLE: 2,

	// Point types
	POINT_LINE: 0,
	POINT_BEZIER: 1,
	POINT_CUBICBEZIER: 2
};

var DrawItPointSizes = [
	1,
	3,
	2
];

// Lightweight classes

function Point(x, y)
{
	this.x = x;
	this.y = y;
}

// Graphic object classes

var DrawItObject = new Class({
	initialize: function(type){
		this.type = type;
		this.x = 0;
		this.y = 0;
		
		this.rot = 0;
		this.scale = new Point(1.0,1.0);
		
		this.style = 0;
		this.priority = 0;
		
		this.group = -1;
		this.frozen = false;
		this.locked = false;
		
		this.bound_min = new Point(0,0);
		this.bound_max = new Point(0,0);
	},
	// Helpers
	
	translate_to_object_space: function(pos){
		if (this.rot != 0)
		{
			// First lets get it into object space... (translated position * inverse scale)
			var rot_x = (pos.x-this.x) * (1.0/this.scale.x);
			var rot_y = (pos.y-this.y) * (1.0/this.scale.y);
			
			// Now do the inverse rotation
			return new Point(Math.cos(-this.rot) * rot_x - Math.sin(-this.rot) * rot_y,
							 Math.sin(-this.rot) * rot_x + Math.cos(-this.rot) * rot_y);
		}
		else
		{
			return new Point((pos.x-this.x) * (1.0/this.scale.x), (pos.y-this.y) * (1.0/this.scale.y));
		}
	},
	
	apply_to_object_space: function(vec){
		if (this.rot != 0)
		{
			// First lets get it into object space... (translated position * inverse scale)
			var rot_x = (vec.x) * (1.0/this.scale.x);
			var rot_y = (vec.y) * (1.0/this.scale.y);
			
			// Now do the inverse rotation
			return new Point(Math.cos(-this.rot) * rot_x - Math.sin(-this.rot) * rot_y,
							 Math.sin(-this.rot) * rot_x + Math.cos(-this.rot) * rot_y);
		}
		else
		{
			return new Point((vec.x) * (1.0/this.scale.x), (vec.y) * (1.0/this.scale.y));
		}
	},
	
	translate_from_object_space: function(pos){
		if (this.rot != 0)
		{
			// Do scale
			var rot_x = pos.x*this.scale.x;
			var rot_y = pos.y*this.scale.y;
			
			// Then rotate & translate
			return new Point((Math.cos(this.rot) * rot_x - Math.sin(this.rot) * rot_y) + this.x,
							 (Math.sin(this.rot) * rot_x + Math.cos(this.rot) * rot_y) + this.y);
		}
		else
		{
			return new Point((pos.x*this.scale.x) + this.x, (pos.y*this.scale.y) + this.y);
		}
	},
	
	test_bounds: function(pmin, pmax){
		if (this.bound_min.x >= pmin.x &&
			this.bound_min.x >= pmin.y &&
			this.bound_max.x < pmax.x &&
			this.bound_max.y < pmax.y)
		{
			return true;
		}
		return false;
	},
	
	test_point: function(pos){
		if (pos.x >= this.bound_min.x &&
			pos.y >= this.bound_min.y &&
			pos.x < this.bound_max.x &&
			pos.y < this.bound_max.y)
		{
			return true;
		}
		
		return false;
	},
	
	calculate_bounds: function(){
	},
	
	global_bounds: function(out_min, out_max){
		var point_list = Array();
		out_min.x = Infinity;
		out_min.y = Infinity;
		out_max.x = -Infinity;
		out_max.y = -Infinity;
		
		point_list[0] = this.translate_from_object_space(this.bound_min);
		point_list[1] = this.translate_from_object_space(new Point(this.bound_max.x, this.bound_min.y));
		point_list[2] = this.translate_from_object_space(this.bound_max);
		point_list[3] = this.translate_from_object_space(new Point(this.bound_min.x, this.bound_max.y));
		
		for (var i=0; i<point_list.length; i++)
		{
			var point = point_list[i];
			if (point.x < out_min.x)
				out_min.x = point.x;
			if (point.y < out_min.y)
				out_min.y = point.y;
	
			if (point.x > out_max.x)
				out_max.x = point.x;
			if (point.y > out_max.y)
				out_max.y = point.y;
		}
	},
	
	update_point: function(idx, point){
	},
	
	update_point_delta: function(idx, delta){
	}
});

var DrawItGroup = DrawItObject.extend({
	initialize: function(){
		this.parent(DrawItConstants.OBJ_GROUP);

		this.recalculate_center = false;
		this.parent_group = null;
		
		// Bit of a hack, but might as well add these in
		this.globalAlpha = 1.0;
		this.globalCompositeOperation = "source-over";
		
		this.center = new Point(0,0);
		this.children = Array();
	},
	
	calculate_bounds: function(){
		var min_bounds = new Point(Infinity, Infinity);
		var max_bounds = new Point(-Infinity, -Infinity);
		
		var objects = this.children;
		var obj_min = new Point(0,0);
		var obj_max = new Point(0,0);
		
		// Add bounds of each group member
		for (var i=0; i<objects.length; i++)
		{
			var obj = objects[i];
			
			// Better calculate the bounds of the child first
			obj.calculate_bounds();
			
			// And transfer it to parent space
			obj.global_bounds(obj_min, obj_max);
			
			// Min of min & max
			if (obj_min.x < min_bounds.x)
				min_bounds.x = obj_min.x;
			if (obj_min.y < min_bounds.y)
				min_bounds.y = obj_min.y;
			if (obj_max.x < min_bounds.x)
				min_bounds.x = obj_max.x;
			if (obj_max.y < min_bounds.y)
				min_bounds.y = obj_max.y;
			
			// Max of min & max
			if (obj_max.x > max_bounds.x)
				max_bounds.x = obj_max.x;
			if (obj_max.y > max_bounds.y)
				max_bounds.y = obj_max.y;
			if (obj_min.x > max_bounds.x)
				max_bounds.x = obj_min.x;
			if (obj_min.y > max_bounds.y)
				max_bounds.y = obj_min.y;
		}
		
		if (this.recalculate_center)
		{
			this.center.x = ((max_bounds.x - min_bounds.x)/2) + min_bounds.x;
			this.center.y = ((max_bounds.y - min_bounds.y)/2) + min_bounds.y;
		}
		
		this.bound_min = min_bounds;
		this.bound_max = max_bounds;
	},
	
	move_children_from_objectspace: function() {
		// (assuming children are in object space)
		var parent_obj = this;
		this.children.forEach(function(object){
			var transformed_pos = parent_obj.translate_from_object_space(object);
			object.x = transformed_pos.x;
			object.y = transformed_pos.y;
			object.rot += parent_obj.rot;
			object.scale.x *= parent_obj.scale.x;
			object.scale.y *= parent_obj.scale.y;
		});
	},
	
	move_children_to_objectspace: function() {
		// (assuming children are in world or parent space)
		var parent_obj = this;
		this.children.forEach(function(object){
			var transformed_pos = parent_obj.translate_to_object_space(object);
			object.x = transformed_pos.x;
			object.y = transformed_pos.y;
			object.rot -= parent_obj.rot;
			object.scale.x *= (1.0/parent_obj.scale.x);
			object.scale.y *= (1.0/parent_obj.scale.y);
		});
	}
});

var DrawItEditMarker = DrawItObject.extend({
	initialize: function(){
		this.parent(DrawItConstants.OBJ_EDIT_MARKER);
		
		this.object_modify = false;	// object to modify
		this.object_point_idx = 0;	// point to modify in object
		
		// Fixed bounds
		this.bound_min.x = -5;
		this.bound_min.y = -5;
		this.bound_max.x = 5;
		this.bound_max.y = 5;
	},
	
	onUpdate: function(mouse_pos, is_delta) {
		var om = this.object_modify;
		if (is_delta)
			om.update_point_delta(this.object_point_idx, om.apply_to_object_space(mouse_pos));
		else
			om.update_point(this.object_point_idx, om.translate_to_object_space(mouse_pos));
	}
});

var DrawItEditCustom = DrawItObject.extend({
	initialize: function(){
		this.parent(DrawItConstants.OBJ_EDIT_CUSTOM);
		
		this.object_modify = false;	// object to modify
		this.object_property = null;
		
		this.onUpdate = null; // function(mouse_pos, is_delta)
		
		// Fixed bounds
		this.bound_min.x = -5;
		this.bound_min.y = -5;
		this.bound_max.x = 5;
		this.bound_max.y = 5;
	}
});

var DrawItPoly = DrawItObject.extend({
	initialize: function(){
		this.parent(DrawItConstants.OBJ_POLY);
		
		this.points = new Array();
	},
	
	calculate_bounds: function(){
		var min_point = new Point(Infinity, Infinity);
		var max_point = new Point(-Infinity, -Infinity);
		
		var points = this.points;
		for (var i=0; i<points.length; i++)
		{
			if (points[i].x < min_point.x)
				min_point.x = points[i].x;
			if (points[i].y < min_point.y)
				min_point.y = points[i].y;
	
			if (points[i].x > max_point.x)
				max_point.x = points[i].x;
			if (points[i].y > max_point.y)
				max_point.y = points[i].y;
		}
		
		this.bound_min = min_point;
		this.bound_max = max_point;
	},
	
	update_point: function(idx, point){
		var pm = this.points[idx];
		pm.x = point.x;
		pm.y = point.y;
	},
	
	update_point_delta: function(idx, delta){
		var pm = this.points[idx];
		pm.x += delta.x;
		pm.y += delta.y;
	}
});

var DrawItShape = DrawItObject.extend({
	initialize: function(){
		this.parent(DrawItConstants.OBJ_SHAPE);
		
		this.points = new Array();
		this.point_types = new Array();
	},
	
	calculate_bounds: function(){
		var min_point = new Point(Infinity, Infinity);
		var max_point = new Point(-Infinity, -Infinity);
		
		var points = this.points;
		for (var i=0; i<points.length; i++)
		{
			if (points[i].x < min_point.x)
				min_point.x = points[i].x;
			if (points[i].y < min_point.y)
				min_point.y = points[i].y;
	
			if (points[i].x > max_point.x)
				max_point.x = points[i].x;
			if (points[i].y > max_point.y)
				max_point.y = points[i].y;
		}
		
		this.bound_min = min_point;
		this.bound_max = max_point;
	},
	
	update_point: function(idx, point){
		var pm = this.points[idx];
		pm.x = point.x;
		pm.y = point.y;
	},
	
	update_point_delta: function(idx, delta){
		var pm = this.points[idx];
		pm.x += delta.x;
		pm.y += delta.y;
	}
});

// Core classes

var DrawItComposite = new Class({
	initialize: function(name){
		this.name = name;
		this.globalAlpha = 1.0;
		this.globalCompositeOperation = "source-over";
	}
});

var DrawItStyle = new Class({
	initialize: function(){
		this.fill = true;
		this.fillStyle = "rgba(255,255,255,1.0)";
		
		this.shadow = true;
		this.shadowBlur = 0.0;
		this.shadowColor = "";
		this.shadowOffsetX = 0;
		this.shadowOffsetY = 0;
		
		this.stroke = true;
		this.strokeStyle = "rgba(0,0,0,1.0)";
		this.lineWidth = 1;
		this.lineCap = "butt";
		this.lineJoin = "round";
		this.miterLimit = 1.0;
	},
	
	parseColor: function(value){
		// dodgy but works for now
		var ret_arr = [255,255,255,255];
		
		var values_start = value.indexOf('(');
		var values_end = value.indexOf(')');
		
		if (values_start > 0 && values_end > values_start)
		{
			var values = value.substring(values_start+1, values_end).split(',', 4);
			if (values.length > 2)
			{
				ret_arr[0] = parseInt(values[0]);
				ret_arr[1] = parseInt(values[1]);
				ret_arr[2] = parseInt(values[2]);
			}
			if (values.length > 3)
			{
				ret_arr[3] = Math.ceil(parseFloat(values[3]) * 255);
			}
		}
		
		return ret_arr;
	},
	
	makeColor: function(r, g, b, a){
		return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
	},
	
	setFill: function(r, g, b, a){
		this.fillStyle = this.makeColor(r, g, b, (a/255.0));
	},
	
	setStroke: function(r, g, b, a){
		this.strokeStyle = this.makeColor(r, g, b, (a/255.0));
	},
	
	getFill: function(){
		return this.parseColor(this.fillStyle);
	},
	
	getStroke: function(){
		return this.parseColor(this.strokeStyle);
	}
});

// DrawItTool - note the base class is so basic we don't bother
// deriving it.
var DrawItTool = new Class({
	initialize: function()
	{
		this.modes = 0;
	}
	
	//inputHandler: function(event_type, input_state){;}
	//onEnter: function(){;}
	//onExit: function(){;}
	//onDraw: function(draw_helper){;}
});

// TODO: fix transform problem with double nested objects
var BaseSelectTool = new Class({
		initialize: function(element)
	{
		this.modes = DrawItConstants.MODE_OBJECT | DrawItConstants.MODE_POINT;
		this.element = element;
		this.current_mask = DrawItConstants.OBJ_ALL;
		
		this.drag_selecting = false;
		this.active_drag_select = false;
		
		this.drag_start = new Point(0,0);
		this.drag_extent = new Point(0,0);
		
		this.corrected_drag_start = new Point(0,0);
		this.corrected_drag_extent = new Point(0,0);
		
		this.moving_selection = false;
		
		this.drawIt = false;
	},
	
	inputHandler: function(event_type, input_state){
		var drawIt = this.drawIt;
		
		switch (event_type)
		{
			case DrawItConstants.MOUSE_DOWN:
				var new_selection = drawIt.getObjectAt(new Point(input_state.mouseX,input_state.mouseY), this.current_mask);
				if (new_selection)
				{
					if (!new_selection.selected) {
						drawIt.addObjectToSelection(new_selection);
						this.selectionHandler(input_state);
					}
					else if (input_state.double_click)
					{
						if (drawIt.current_mode == DrawItConstants.MODE_OBJECT)
							drawIt.pushSelectionSpace(new_selection);
					}
					this.moving_selection = true;
				}
				else
				{
					if (!drawIt.combine_selection)
					{
						drawIt.clearSelection();
						this.selectionHandler(input_state);
					}
					
					if (input_state.double_click)
					{
						if (drawIt.current_mode == DrawItConstants.MODE_OBJECT)
						{
							this.drag_selecting = false;
							drawIt.popSelectionSpace();
						}
					}
					else
					{
						this.drag_start.x = input_state.mouseX;
						this.drag_start.y = input_state.mouseY;
						this.drag_extent.x = 0;
						this.drag_extent.y = 0;
						
						this.correctDragSelect();
						this.drag_selecting = true;
					}
				}
			break;
			case DrawItConstants.MOUSE_UP:
				if (this.drag_selecting && this.active_drag_select)
				{
					var drag_min = this.corrected_drag_start;
					var drag_max = new Point(drag_min.x+this.corrected_drag_extent.x,drag_min.y+this.corrected_drag_extent.y);
					drawIt.addObjectsToSelection(drawIt.getObjectsIn(drag_min, drag_max, this.current_mask));
					this.selectionHandler(input_state);
					this.active_drag_select = false;
				}
				
				this.moving_selection = false;
				this.drag_selecting = false;
			break;
			case DrawItConstants.MOUSE_MOVE:
				var debug_pos = drawIt.transform_cache.translate_to_object_space(new Point(input_state.mouseX,input_state.mouseY));
				$('statusbox').value = "SELECT: X=" + debug_pos.x + ",Y=" + debug_pos.y;
				if (this.drag_selecting)
				{
					// Adjust max	
					this.drag_extent.x += input_state.deltaX;
					this.drag_extent.y += input_state.deltaY;
		
					if (!this.active_drag_select)
						this.active_drag_select = true;
					
					this.correctDragSelect();
				}
				else if (this.moving_selection)
				{	
					// Implement in derivative
					this.moveHandler(input_state);
				}
			break;
			
			case DrawItConstants.KEY_DOWN:
				if (input_state.shift)
					drawIt.combine_selection = true;
			break;
			case DrawItConstants.KEY_UP:
				if (!input_state.shift)
					drawIt.combine_selection = false;
			break;
		}
	},
	
	correctDragSelect: function()
	{
		// Correct drag area min,max
		var orig_start = this.drag_start;
		var orig_extent = this.drag_extent;
		var real_start = this.corrected_drag_start;
		var real_extent = this.corrected_drag_extent;
					
		// Get correct X start + width
		if (orig_extent.x < 0)
		{
			real_start.x = orig_start.x+orig_extent.x;
			real_extent.x = -orig_extent.x;
		}
		else
		{
			real_start.x = orig_start.x;
			real_extent.x = orig_extent.x;
		}
					
		// Get correct Y start + height
		if (orig_extent.y < 0)
		{
			real_start.y = orig_start.y+orig_extent.y;
			real_extent.y = -orig_extent.y;
		}
		else
		{
			real_start.y = orig_start.y;
			real_extent.y = orig_extent.y;
		}
	},
	
	onEnter: function(drawIt)
	{
		this.drawIt = drawIt;
		this.current_mask = drawIt.current_mode == DrawItConstants.MODE_OBJECT ? DrawItConstants.OBJ_GENERIC : DrawItConstants.OBJ_EDIT;
	},
	
	onExit: function()
	{
		this.drag_selecting = false;
		this.multi_selecting = false;
		this.active_drag_select = false;
	},
	
	drawSelectionMarker: function(ctx)
	{
		this.correctDragSelect();
			
		var orig_start = this.corrected_drag_start;
		var orig_extent = this.corrected_drag_extent;
				
		ctx.fillRect(orig_start.x, orig_start.y, orig_extent.x, orig_extent.y);
		ctx.strokeRect(orig_start.x, orig_start.y, orig_extent.x, orig_extent.y);
	},
	
	onDraw: function(draw)
	{
		var drawIt = this.drawIt;
		
		// Draw selection
		if (drawIt.object_selection.length > 0)
		{
			drawIt.draw_helper.draw_selection(drawIt.object_selection, drawIt.transform_cache, drawIt.draw_styles[0]);
		}
				
		if (this.drag_selecting)
		{
			this.drawSelectionMarker(draw.ctx);
		}
	}
});

var SelectTool = BaseSelectTool.extend({
	initialize: function(element)
	{
		this.parent(element);
		this.modes = DrawItConstants.MODE_OBJECT | DrawItConstants.MODE_POINT;
	},
	
	selectionHandler: function(input_state){
		// Called when selection is changed. A good thing to do here is keep track of
		// tool-specific selection metrics.
	},
	
	moveHandler: function(input_state){
		// Called when movement is triggered
		var drawIt = this.drawIt;
		if (drawIt.current_mode == DrawItConstants.MODE_OBJECT)
		{
			var deltaP = drawIt.transform_cache.apply_to_object_space(new Point(input_state.deltaX, input_state.deltaY));
			var deltaX = deltaP.x;
			var deltaY = deltaP.y;
						
			var cur_tool = this;
						
			// Keeping it simple
			drawIt.iterateOverSelection(function(object){
				object.x += deltaX;
				object.y += deltaY;
				
				if (object.type & DrawItConstants.OBJ_EDIT)
					object.onUpdate(new Point(deltaX, deltaY), true);
			});
		}
		else if (drawIt.current_mode == DrawItConstants.MODE_POINT)
		{
			var deltaP = drawIt.transform_cache.apply_to_object_space(new Point(input_state.deltaX, input_state.deltaY));
			var deltaX = deltaP.x;
			var deltaY = deltaP.y;
						
			// Now a bit more advanced. We also need to set position in object space,
			// using delta's.
			drawIt.iterateOverSelection(function(object){
				// Change marker position
				object.x += deltaX;
				object.y += deltaY;
							
				// Change affected point's position
				object.onUpdate(new Point(deltaX, deltaY), true);
			});
		}
	},
	
	onEnter: function(drawIt)
	{
		this.parent(drawIt);
	},
	
	onExit: function()
	{
		this.parent();
	},
	
	onDraw: function(draw)
	{
		this.parent(draw);
	}
	
});

var RotateTool = SelectTool.extend({
	initialize: function(element)
	{
		this.parent(element);
		this.modes = DrawItConstants.MODE_OBJECT | DrawItConstants.MODE_POINT;
		
		this.start_vec = null;
		this.temp_group = null;
		
		this.in_rotation = false;
		this.is_single = false;
	},
	
	inputHandler: function(event_type, input_state){
		// While we are in rotation, we don't want the basecode interfering
		if (!this.in_rotation)
		{
			this.parent(event_type, input_state);
		}
		else if (event_type == DrawItConstants.MOUSE_UP || event_type == DrawItConstants.MOUSE_DOWN)
		{
			// Destroy temporary rotation group
			if (!this.is_single)
				this.drawIt.destroyObject(this.temp_group);
			this.temp_group = null;
			this.in_rotation = false;
			this.is_single = false;
		}
		else if (event_type == DrawItConstants.MOUSE_MOVE)
		{
			this.moveHandler(input_state);
		}
	},
	
	selectionHandler: function(input_state){
		// Called when selection is changed. A good thing to do here is keep track of
		// tool-specific selection metrics.
		var drawIt = this.drawIt;
		var selection = drawIt.object_selection;
	},
	
	moveHandler: function(input_state){
		// Called when movement is triggered
		var drawIt = this.drawIt;
		var selection = drawIt.object_selection;
	
		if (this.in_rotation)
		{
			// Rotate the group object
			var center = this.temp_group.center ? this.temp_group.center : this.temp_group;
			this.temp_group.rot += (input_state.deltaX / 128.0) * 6.28;
					
			var temp_group = this.temp_group;
			if (temp_group.children)
			{
				this.temp_group.children.forEach(function(object){
					if (object.type & DrawItConstants.OBJ_EDIT)
					{
						// We need to get this out of group space and into object space
						var calc_p = temp_group.translate_from_object_space(new Point(object.x, object.y));
						object.onUpdate(calc_p, false);
					}
				});
			}
		}
		else
		{
			// Initiate rotation mode
			if (selection.length > 1)
			{
				this.temp_group = drawIt.groupObjects(selection);
				drawIt.clearSelection();
				drawIt.addObjectToSelection(this.temp_group);
				this.is_single = false;
			}
			else if (selection[0])
			{
				this.temp_group = selection[0];
				this.is_single = true;
			}
			else
				return;
			
			this.start_vec = this.calcDirectionVec(this.temp_group.center, new Point(input_state.mouseX, input_state.mouseY));
			this.in_rotation = true;
		}

	},
	
	onEnter: function(drawIt)
	{
		this.parent(drawIt);
	},
	
	calcDirectionVec: function(start, end){
		return new Point(0,0);
	},
	
	onExit: function()
	{
		this.parent();
		
		if (!this.is_single && this.temp_group)
		{
			this.drawIt.destroyObject(this.temp_group);
		}
		this.temp_group = null;
		this.in_rotation = false;
		this.is_single = false;
	},
	
	onDraw: function(draw)
	{
		var drawIt = this.drawIt;
		
		// Draw selection
		if (!this.in_rotation && drawIt.object_selection.length > 0)
		{
			drawIt.draw_helper.draw_selection(drawIt.object_selection, drawIt.transform_cache, drawIt.draw_styles[0]);
		}
				
		if (this.drag_selecting)
		{
			this.drawSelectionMarker(draw.ctx);
		}
		
		// Draw a ring round the selection
		var ctx = draw.ctx;
		var drawIt = this.drawIt;
		ctx.fillStyle = "rgba(255,0,0,1.0)";
		
		if (this.temp_group)
		{
			// Draw center point
			ctx.save();
			ctx.translate(this.temp_group.x, this.temp_group.y);
			ctx.rotate(this.temp_group.rot);
			ctx.scale(this.temp_group.scale.x, this.temp_group.scale.y);
				
			if (drawIt.current_mode == DrawItConstants.MODE_POINT && this.temp_group.children)
			{
				// little hack to make sure point markers are still drawn
				drawIt.draw_helper.draw_editmode(this.temp_group.children, drawIt.draw_styles);
			}
			
			ctx.fillRect(-5, -5, 10, 10);
			ctx.restore();
		}
	}
	
});

var ScaleTool = SelectTool.extend({
	initialize: function(element)
	{
		this.parent(element);
		this.modes = DrawItConstants.MODE_OBJECT | DrawItConstants.MODE_POINT;
		
		this.start_pos = null;
		this.temp_group = null;
		this.temp_marker = null;
		
		this.is_single = false;
	},
	
	selectionHandler: function(input_state){
		// Called when selection is changed. A good thing to do here is keep track of
		// tool-specific selection metrics.
		var drawIt = this.drawIt;
		var selection = drawIt.object_selection;
		
			if (this.temp_group)
			{
				if (selection.length > 0 && selection[0].type & DrawItConstants.OBJ_EDIT_CUSTOM)
					return;
				this.clearLast();
			}
			
			// Initiate scale mode
			if (selection.length > 1)
			{
				this.temp_group = drawIt.groupObjects(selection);
				drawIt.clearSelection();
				drawIt.addObjectToSelection(this.temp_group);
				this.is_single = false;
			}
			else if (selection[0])
			{
				this.temp_group = selection[0];
				this.is_single = true;
			}
			else
			{
				this.current_mask = drawIt.current_mode == DrawItConstants.MODE_OBJECT ? DrawItConstants.OBJ_GENERIC | DrawItConstants.OBJ_EDIT_CUSTOM : DrawItConstants.OBJ_EDIT;
				return;
			}
			
			this.current_mask = DrawItConstants.OBJ_EDIT_CUSTOM;
			
			// Make the custom marker
			var marker = drawIt.createObject(DrawItConstants.OBJ_EDIT_CUSTOM);
			var pos = this.temp_group.translate_from_object_space(this.temp_group.bound_max);
			var center = null;
			
			// Calculate the center point of the object
			center = new Point((this.temp_group.bound_max.x - this.temp_group.bound_min.x / 2) + this.temp_group.bound_min.x,
			                   (this.temp_group.bound_max.y - this.temp_group.bound_min.y / 2) + this.temp_group.bound_min.y);
			center = this.temp_group.translate_from_object_space(center);
			
			marker.x = pos.x;
			marker.y = pos.y;
			
			marker.object_modify = this.temp_group;
			marker.object_origin = center;
			marker.object_start = pos;
			marker.object_start_scale = new Point(this.temp_group.scale.x, this.temp_group.scale.y);
			
			marker.onUpdate = function(mouse_pos, is_delta) {
				var om = this.object_modify;
				var ostart = this.object_start;
				var oorigin = this.object_origin;
				var oscale = this.object_start_scale;
				
				om.scale.x = oscale.x + ( (this.x - ostart.x) * (oscale.x / (ostart.x - oorigin.x)) );
				om.scale.y = oscale.y + ( (this.y - ostart.y) * (oscale.y / (ostart.y - oorigin.y)) );
			};
			this.temp_marker = marker;
	},
	
	clearLast: function(){
		if (!this.is_single && this.temp_group)
		{
			this.drawIt.destroyObject(this.temp_group);
		}
		if (this.temp_marker)
		{
			this.drawIt.destroyObject(this.temp_marker);
		}
		this.temp_group = null;
		this.temp_marker = null;
		this.start_pos = pos = null;
		this.is_single = false;
	},
	
	onEnter: function(drawIt)
	{
		this.parent(drawIt);
		
		this.selectionHandler(null);
	},
	
	onExit: function()
	{
		this.parent();
		
		if (this.temp_group)
			this.clearLast();
	},
	
	onDraw: function(draw)
	{
		var drawIt = this.drawIt;
		
		// Draw selection
		if (drawIt.object_selection.length > 0)
		{
			drawIt.draw_helper.draw_selection(drawIt.object_selection, drawIt.transform_cache, drawIt.draw_styles[0]);
		}
				
		if (this.drag_selecting)
		{
			this.drawSelectionMarker(draw.ctx);
		}
		
		// Draw a ring round the selection
		var ctx = draw.ctx;
		var drawIt = this.drawIt;
		ctx.fillStyle = "rgba(255,0,0,1.0)";
		
		if (this.temp_group)
		{
			// Draw center point
			ctx.save();
			ctx.translate(this.temp_group.x, this.temp_group.y);
			ctx.rotate(this.temp_group.rot);
			ctx.scale(this.temp_group.scale.x, this.temp_group.scale.y);
				
			if (drawIt.current_mode == DrawItConstants.MODE_POINT && this.temp_group.children)
			{
				// little hack to make sure point markers are still drawn
				drawIt.draw_helper.draw_editmode(this.temp_group.children, drawIt.draw_styles);
			}
			
			ctx.fillRect(-5, -5, 10, 10);
			ctx.restore();
		}
	}
	
});

// Actions
var PointsBetweenAction = new Class({
	initialize: function(element)
	{
		this.element = element;
		this.modes = DrawItConstants.MODE_POINT;
	},
	
	inputHandler: function(event_type, input_state){
		return;
	},
	
	point_between: function(first, second){
		return new Point(first.x + ((second.x-first.x) * 0.5), first.y + ((second.y-first.y) * 0.5));
	},
	
	onEnter: function(drawIt)
	{
		var selection = drawIt.object_selection;
		var marker_list = drawIt.selection_list;
		if (selection.length < 2)
		{
			drawIt.revertPreviousTool();
			return;
		}
		
		// Order of events:
		// 1) Grab a list of objects which are modified
		// 2) Grab the list of points selected for those objects and associate them with the object list
		// 3) For each object, sort through its points and perform the split
		// 4) For each split generated, add an edit marker
		
		// collect points and their associated objects
		var objects_modify = new Array();
		var objects_points = new Array();
		for (var i=0; i<selection.length; i++)
		{
			var object = selection[i];
			
			var idx = objects_modify.indexOf(object.object_modify);
			if (idx < 0)
			{
				idx = objects_modify.length;
				objects_points.push(new Array());
				objects_modify.push(object.object_modify);
			}
			
			objects_points[idx].push(object.object_point_idx);
		}
		
		// Process object list
		for (var i=0; i<objects_modify.length; i++)
		{
			var object = objects_modify[i];
			var object_points = object.points;
			
			var points = objects_points[i];
			
			points.sort();
			
			// for each point index, calculate splits
			for (var p=0; p<points.length; p++)
			{
				var first = points[p];
				var second = p+1 == points.length ? points[0] : points[p+1];
		
				if ((first-second) == 1 ||
		   			(first-second) == -1 ||
		    		(first-second) == object_points.length-1 ||
		   			(first-second) == -(object_points.length-1))
				{
					var middle = this.point_between(object_points[first], object_points[second]);
					var idx_insert = first > second ? first : second; // 3
				
					// hack to handle between first and last point correctly
					if (( first == 0 && second > 1) || 
					    ( second == 0 && first > 1))
					{
						idx_insert = object_points.length;
					}
		
					object_points.splice(idx_insert, 0, middle);
					
					// update points list
					for (var e=0; e<points.length; e++)
					{
						if (points[e] >= idx_insert)
							points[e]++;
					}
				
					// update existing edit markers
					for (var e=0; e<marker_list.length; e++)
					{
						var eobj = marker_list[e];
						if (eobj.type == DrawItConstants.OBJ_EDIT_MARKER && eobj.object_modify == object && eobj.object_point_idx >= idx_insert)
						{
							eobj.object_point_idx++;
						}
					}
			
					// add new edit marker
					var eobj = drawIt.createNestedObject(DrawItConstants.OBJ_EDIT_MARKER, drawIt.selection_list);
					var npoint = object.translate_from_object_space(middle);
					
					eobj.x = npoint.x;
					eobj.y = npoint.y;
							
					eobj.object_modify = object;
					eobj.object_point_idx = idx_insert;
				}
			}
		}
		
		drawIt.revertPreviousTool();
	},
	
	onExit: function()
	{
		return;
	},
	
	onDraw: function(draw)
	{
		return;
	}
	
});

// Drawing

var DrawItDrawer = new Class({
	initialize: function(canvas){
		this.canvas = canvas;
		
		if (navigator.vendor && navigator.vendor.indexOf("Apple") != -1)
		{
			this.safariWorkaround = true;
		}
		else
		{
			this.safariWorkaround = false;
		}
		
		// Internal composites
		this.default_composite = new DrawItComposite();
		this.edit_composite = new DrawItComposite();
		
		this.currentX = 0;
		this.currentY = 0;
	},
	
	// Really public functions
	
	draw_objectmode: function(object_list, styles){
		var ctx = this.ctx;
		
		ctx.save();
		
		for (var i=0; i<object_list.length; i++)
		{
			var object = object_list[i];
			//if (object.priority == 66666)
			//	break;
			
			this.begin_object(object);
			
			this.set_style(styles[object.style]);
				
			switch (object.type)
			{
				case DrawItConstants.OBJ_EDIT_CUSTOM:
					ctx.fillStyle = "rgba(0,255,255,1.0)";
					
					if (object.selected)
						ctx.fillStyle = styles[object.style].strokeStyle;
					ctx.fillRect(-5, -5, 10, 10);
				break;
				
				case DrawItConstants.OBJ_GROUP:
					// Recursively draw children
					this.set_composite(object);
					this.draw_objectmode(object.children, styles);
					this.set_composite(this.default_composite);
				break;
				
				case DrawItConstants.OBJ_POLY:
					ctx.beginPath();
				
					this.insert_polypoints(object.points);
				
					if (object.closed)
						ctx.closePath();
				
					if (styles[object.style].fill)
						ctx.fill();
				
					if (styles[object.style].stroke)
					{
						// Plot path again to fix safari issue
						if (this.safariWorkaround && styles[object.style].fill)
						{
							ctx.beginPath();
							this.insert_polypoints(object.points);
							if (object.closed)
								ctx.closePath();
						}
						ctx.stroke();
					}
				break;
				
				case DrawItConstants.OBJ_SHAPE:
					var idx = 1;
					ctx.beginPath();
					
					this.insert_shapepoints(object.points, object.point_types);
					
					if (object.closed)
						ctx.closePath();
						
					if (styles[object.style].fill)
						ctx.fill();
					
					if (styles[object.style].stroke)
					{
						// Plot path again to fix safari issue
						if (this.safariWorkaround && styles[object.style].fill)
						{
							ctx.beginPath();
							this.insert_polypoints(object.points);
							if (object.closed)
								ctx.closePath();
						}
						ctx.stroke();
					}
				break;
			}
			
			ctx.restore();
		}
		
		ctx.restore();
	},
	
	begin: function(camera)
	{
		var ctx = this.canvas.getContext('2d');
		this.ctx = ctx;
		
		ctx.save();
		this.set_composite(this.default_composite);
		this.clear();
		
		// TODO: offset by camera / zoom
		ctx.translate(-camera.x, -camera.y);
		ctx.scale(camera.scale, camera.scale);
		
		ctx.fillStyle = "rgba(0,255,0,1.0)";
		ctx.lineWidth = 2;
		ctx.strokeStyle="rgba(255,0,0,0.5)";
	},
	
	clear: function()
	{
		this.ctx.clearRect(0, 0, 640, 480);
	},
	
	begin_object: function(object)
	{
		var ctx = this.canvas.getContext('2d');
		this.ctx = ctx;
		
		ctx.save();
		
		// TODO: offset by camera / zoom
		ctx.translate(object.x, object.y);
		ctx.rotate(object.rot);
		ctx.scale(object.scale.x, object.scale.y);
		this.currentX = 0;
		this.currentY = 0;
	},
	
	end: function()
	{
		this.ctx.restore();
	},
	
	draw_editmode: function(object_list, styles){
		var ctx = this.ctx;
		
		ctx.save();
		this.set_composite(this.edit_composite);
					
		// Go back in list since edit objects will almost always be at the end
		for (var i=object_list.length-1; i>=0; i--)
		{
			var object = object_list[i];
			if (object.priority != 66666)
				break;
			
			ctx.save();
			ctx.translate(object.x, object.y);
				
			switch (object.type)
			{
				case DrawItConstants.OBJ_EDIT_CUSTOM:
					ctx.fillStyle = "rgba(0,255,255,1.0)";
					
					if (object.selected)
						ctx.fillStyle = styles[object.style].strokeStyle;
					ctx.fillRect(-5, -5, 10, 10);
				break;
				
				case DrawItConstants.OBJ_EDIT_MARKER:
					ctx.fillStyle = "rgba(0,255,0,1.0)";
					
					if (object.selected)
						ctx.fillStyle = styles[object.style].strokeStyle;
					ctx.fillRect(-5, -5, 10, 10);
				break;
			}
			
			ctx.restore();
		};
		

		this.set_composite(this.default_composite);
		ctx.restore();
	},
	
	draw_selection: function(object_list, space, select_style){
		var ctx = this.ctx;
		
		this.begin_object(space);
		this.set_composite(this.edit_composite);
		
		ctx.fillStyle = "rgba(64,64,64,1.0)";
		ctx.strokeStyle = "rgba(0,0,0,1.0)";
		ctx.strokeWidth = 2;
		
		for (var i=0; i<object_list.length; i++)
		{
			var object = object_list[i];
			
			ctx.fillRect(object.x-5, object.y-5, 10, 10);
			
			ctx.save();
			ctx.translate(object.x, object.y);
			ctx.rotate(object.rot);
			
			// And now the bounding box
			ctx.scale(object.scale.x, object.scale.y);
				
			ctx.strokeRect(object.bound_min.x, object.bound_min.y, object.bound_max.x - object.bound_min.x, object.bound_max.y - object.bound_min.y);
			
			ctx.restore();
		};
		
		this.set_composite(this.default_composite);
		this.end();
	},
	
	draw_centroids: function(object_list, centroid_style){
		var ctx = this.ctx;
		
		ctx.save();
		this.set_composite(this.edit_composite);
		
		ctx.fillStyle = "rgba(64,64,64,1.0)";
		ctx.strokeStyle = "rgba(0,0,0,1.0)";
		ctx.strokeWidth = 2;
		
		for (var i=0; i<object_list.length; i++)
		{
			var object = object_list[i];
			if (object.priority == 66666)
				break;
			
			ctx.save();
			ctx.translate(object.x, object.y);
			ctx.rotate(object.rot);
			
			// And now the bounding box
			ctx.scale(object.scale.x, object.scale.y);
				
			ctx.strokeRect(object.bound_min.x, object.bound_min.y, object.bound_max.x - object.bound_min.x, object.bound_max.y - object.bound_min.y);
			
			ctx.restore();
		};
		
		this.set_composite(this.default_composite);
		ctx.restore();
	},
	
	// The nitty-gritty
	
	insert_polypoints: function(points){
		var ctx = this.ctx;
		
		ctx.moveTo(points[0].x, points[0].y);
		
		for (var v=1; v<points.length; v++) {
			ctx.lineTo(points[v].x, points[v].y);
		}
	},
	
	insert_shapepoints: function(points, point_types){
		var ctx = this.ctx;
		var idx = 1;
					
		ctx.moveTo(points[0].x, points[0].y);
		
		for (var t=0; t<point_types.length; t++)
		{
			var ptype = point_types[t];
						
			switch (ptype)
			{
				case DrawItConstants.POINT_LINE:
					ctx.lineTo(points[idx].x, points[idx].y);
				break;
				case DrawItConstants.POINT_BEZIER:
					ctx.bezierCurveTo(	points[idx].x, points[idx].y,
										points[idx+1].x, points[idx+1].y,
										points[idx+2].x, points[idx+2].y);
				break;
				case DrawItConstants.POINT_CUBICBEZIER:
					// Since Firefox 1.5 does not support this correctly, we will workaround
					/*
					ctx.quadraticCurveTo(	obj.points[idx].x, obj.points[idx].y,
											obj.points[idx+1].x, obj.points[idx+1].y);
					*/
					this.quadraticCurveToFixed(	ctx,
											obj.points[0].x, obj.points[0].y, 
											obj.points[idx].x, obj.points[idx].y,
											obj.points[idx+1].x, obj.points[idx+1].y);
					break;
			}
			
			idx += DrawItPointSizes[ptype];
		}
	},
	
	set_composite: function(composite){
		this.ctx.globalCompositeOperation = composite.globalCompositeOperation;
		this.ctx.globalAlpha = composite.globalAlpha;
	},
	
	set_style: function(style){
		var ctx = this.ctx;
		
		if (style.fill)
		{
			ctx.fillStyle = style.fillStyle;
		}
		
		if (style.stroke)
		{
			ctx.strokeStyle = style.strokeStyle;
			ctx.lineWidth = style.lineWidth;
			ctx.lineCap = style.lineCap;
			ctx.lineJoin = style.lineJoin;
			ctx.miterLimit = style.miterLimit;
		}
		
		if (style.shadow)
		{
			ctx.shadowBlur = style.shadowBlur;
			ctx.shadowColor = style.shadowColor;
			ctx.shadowOffsetX = style.shadowOffsetX;			
			ctx.shadowOffsetY = style.shadowOffsetY;
		}
		else
		{
			ctx.shadowColor = "rgba(0,0,0,0)";
		}
	},
	
	quadraticCurveToFixed: function( ctx, currentX, currentY, cpx, cpy, x, y ) {	  /*	   For the equations below the following variable name prefixes are used:	     qp0 is the quadratic curve starting point (you must keep this from your last point sent to moveTo(), lineTo(), or bezierCurveTo() ).	     qp1 is the quadatric curve control point (this is the cpx,cpy you would have sent to quadraticCurveTo() ).	     qp2 is the quadratic curve ending point (this is the x,y arguments you would have sent to quadraticCurveTo() ).	   We will convert these points to compute the two needed cubic control points (the starting/ending points are the same for both	   the quadratic and cubic curves.		   The equations for the two cubic control points are:	     cp0=qp0 and cp3=qp2	     cp1 = qp0 + 2/3 *(qp1-qp0)	     cp2 = cp1 + 1/3 *(qp2-qp0) 		   In the code below, we must compute both the x and y terms for each point separately. 		    cp1x = qp0x + 2.0/3.0*(qp1x - qp0x);	    cp1y = qp0y + 2.0/3.0*(qp1y - qp0y);	    cp2x = cp1x + (qp2x - qp0x)/3.0;	    cp2y = cp1y + (qp2y - qp0y)/3.0;		   We will now 	     a) replace the qp0x and qp0y variables with currentX and currentY (which *you* must store for each moveTo/lineTo/bezierCurveTo)	     b) replace the qp1x and qp1y variables with cpx and cpy (which we would have passed to quadraticCurveTo)	     c) replace the qp2x and qp2y variables with x and y.	   which leaves us with: 	  */	  var cp1x = currentX + 2.0/3.0*(cpx - currentX);	  var cp1y = currentY + 2.0/3.0*(cpy - currentY);	  var cp2x = cp1x + (x - currentX)/3.0;	  var cp2y = cp1y + (y - currentY)/3.0;		  // and now call cubic Bezier curve to function 	  ctx.bezierCurveTo( cp1x, cp1y, cp2x, cp2y, x, y );	}
	
});

var DrawIt = new Class({
	initialize: function(canvas){
		// Core
		this.draw_styles = new Array(3);
		this.object_list = new Array();
		
		this.draw_helper = new DrawItDrawer(canvas);
		this.root_pos = canvas.getPosition();
		this.mouse_pos = new Point(0,0);
		
		this.drawing_id = -1;
		
		// Edit modes & tools
		this.current_mode = DrawItConstants.MODE_OBJECT;
		this.last_tool = null;
		this.current_tool = null;
		this.tools = {};
		
		// Selection
		this.combine_selection = false;
		this.object_selection = new Array();
		this.selection_space = null;
		this.selection_list = this.object_list;
		this.transform_cache = new DrawItObject();
		
		this.isDirty = true;
		this.click_timer = null;
		
		// camera
		this.camera = new Point(0,0);
		this.camera.scale = 1.0;
		
		// Defaults
		this.draw_styles[0] = new DrawItStyle();
		this.draw_styles[1] = new DrawItStyle();
		this.draw_styles[1].fillStyle = "rgba(255,0,0,1.0)";
		this.draw_styles[2] = new DrawItStyle();
		this.draw_styles[2].fillStyle = "rgba(0,255,0,1.0)";
		this.draw_styles[3] = new DrawItStyle();
		this.draw_styles[3].fillStyle = "rgba(0,0,255,1.0)";
		
		// Callbacks
		this.onNewSelection = null;
		this.onChangeMode = null; // (old, new)
		
		this.next_group_id = 0;
	},
	
	// Rendering
	redraw: function() {
		if (!this.isDirty)
			return;
		
		this.draw_helper.begin(this.camera);
		
		// Draw object list
		switch (this.current_mode)
		{
			case DrawItConstants.MODE_OBJECT:
				this.draw_helper.draw_objectmode(this.object_list, this.draw_styles);
			break;
			
			case DrawItConstants.MODE_POINT:
				this.draw_helper.draw_objectmode(this.object_list, this.draw_styles);
				this.draw_helper.begin_object(this.transform_cache);
				this.draw_helper.draw_editmode(this.selection_list, this.draw_styles);
				this.draw_helper.end();
			break;
			
			case DrawItConstants.MODE_JOINT:
				this.draw_helper.draw_objectmode(this.object_list, this.draw_styles);
				this.draw_helper.set_composite(this.draw_helper.joint_composite);
				this.draw_helper.draw_jointmode(this.object_list, this.draw_styles);
			break;
		}
		
		// Draw tool stuff
		this.current_tool.onDraw(this.draw_helper);
		
		this.draw_helper.end();
		this.isDirty = false;
	},
	
	// Modes
	
	addEditTool: function(name, handler){
		if (!this.current_tool) {
			handler.onEnter(this);
			this.current_tool = handler;
			this.last_tool = handler;
		}
		this.tools[name] = handler;
	},
	
	setEditMode: function(editmode){
		if (this.current_mode == editmode)
			return;
			
		var old_mode = this.current_mode;
		var due_reset = true;
		
		// Turn off tool
		this.current_tool.onExit();
		
		// Exit last mode
		switch (this.current_mode)
		{
			case DrawItConstants.MODE_OBJECT:
				if (this.object_selection.length == 0)
					return;
				this.exitObjectMode();
			break;
			case DrawItConstants.MODE_POINT:
				this.exitPointMode();
			break;
			case DrawItConstants.MODE_JOINT:
				this.exitJointMode();
			break;
		}
			
		this.current_mode = editmode;
		
		// Set to SELECT tool if the current is not compatible with this mode
		if (!(this.current_tool.modes & this.current_mode))
		{
			this.setCurrentTool('SELECT');
			due_reset = false;
		}
		
		// Enter new mode
		switch (this.current_mode)
		{
			case DrawItConstants.MODE_OBJECT:
				this.enterObjectMode();
			break;
			case DrawItConstants.MODE_POINT:
				this.enterPointMode();
			break;
			case DrawItConstants.MODE_JOINT:
				this.enterJointMode();
			break;
		}
		
		if (due_reset)
		{
			this.current_tool.onEnter(this);
		}
		
		// Initiate callback
		if (this.onChangeMode)
			this.onChangeMode(old_mode, this.current_mode);
	},
	
	setCurrentTool: function(tool){
		if (this.tools[tool] && (this.tools[tool].modes & this.current_mode))
		{
			if (this.current_tool)
			{
				this.current_tool.onExit();
				this.last_tool = this.current_tool;
			}
			this.current_tool = this.tools[tool];
			this.current_tool.onEnter(this);
		}
	},
	
	revertPreviousTool: function(){
		var to_tool = this.last_tool ? this.last_tool : this.tools['SELECT'];
		if (to_tool)
		{
			this.current_tool.onExit();
			this.last_tool = this.current_tool;
			this.current_tool = to_tool;
			this.current_tool.onEnter(this);
		}
	},
	
	// Object mode enter/exit
	enterObjectMode: function(){
		
	},
	
	exitObjectMode: function(){
		
	},
	
	objectsEnterPointMode: function(object_list, obj_parent){
		for (var o=0; o<object_list.length; o++)
		{
			var go = object_list[o];
			
			if (go.type == DrawItConstants.OBJ_GROUP)
			{
				//this.objectsEnterPointMode(go.children, go, true);
			}
			else
			{	
				for (var p=0; p<go.points.length; p++)
				{
					var eobj = this.createNestedObject(DrawItConstants.OBJ_EDIT_MARKER, this.selection_list);
					var npoint = go.translate_from_object_space(go.points[p]);
					
					eobj.x = npoint.x;
					eobj.y = npoint.y;
							
					eobj.object_modify = go;
					eobj.object_point_idx = p;
				}
			}
		}
	},
	
	enterPointMode: function(){
		// Create edit points for every selection
		this.objectsEnterPointMode(this.object_selection, this.transform_cache);
		this.clearSelection();
	},
	
	objectsExitPointMode: function(object_list){
		for (var gi=0; gi<object_list.length; gi++)
		{
			var object = object_list[gi];
			object.calculate_bounds();
		}
	},
	
	exitPointMode: function(){
		this.clearSelection();
		
		// Remove point mode objects
		for (var i=0; i<this.selection_list.length; i++)
		{
			if (this.selection_list[i].type & DrawItConstants.OBJ_EDIT)
			{
				// Collect modified objects and select them
				var objects_modify = new Array();
				for (var e=i; e<this.selection_list.length; e++)
				{
					var object = this.selection_list[e];
					var idx = objects_modify.indexOf(object.object_modify);
					if (idx < 0)
					{
						objects_modify.push(object.object_modify);
					}
				}
				this.addObjectsToSelection(objects_modify);
				
				// start of edit controls, so we can split everything else
				this.selection_list.splice(i, this.selection_list.length-i);
				break;
			}
		}
		
		this.recalculateAllBounds();
	},
	
	enterJointMode: function(){
	},
	
	exitJointMode: function(){
	},
	
	// Input
	
	inputEvent: function(event_type, event){
		if (this.current_tool)
		{
			event.double_click = false
			
			// Sort out the mouse position variables
			if (event_type == DrawItConstants.MOUSE_MOVE)
			{
				event.mouseX = ((event.page.x-this.root_pos.x)+this.camera.x)*(1.0/this.camera.scale);
				event.mouseY = ((event.page.y-this.root_pos.y)+this.camera.y)*(1.0/this.camera.scale);
				
				event.deltaX = event.mouseX-this.mouse_pos.x;
				event.deltaY = event.mouseY-this.mouse_pos.y;
				
				// Cancel double clicks
				if (this.click_timer)
				{
					this.click_timer = null;
					$clear(this.click_timer);
				}
			}
			else
			{
				event.mouseX = this.mouse_pos.x;
				event.mouseY = this.mouse_pos.y;
				
				event.deltaX = 0;
				event.deltaY = 0;
				
				// Check for double clicks
				if (event_type == DrawItConstants.MOUSE_DOWN)
				{
					if (this.click_timer)
					{
						event.double_click = true;
						$clear(this.click_timer);
					}
					else
					{
						this.click_timer = (function(){ this.click_timer = null; }).delay(250, this);
					}
				}
			}
			
			this.mouse_pos.x = event.mouseX;
			this.mouse_pos.y = event.mouseY;
			
			// Now, handle the event!
			
			this.current_tool.inputHandler(event_type, event);
			this.isDirty = true;
		}
	},
	
	// Selections
	
	getObjectAt: function(pos, objectmask){
		var found_object = null;
		
		var test_pos = this.transform_cache.translate_to_object_space(pos);
		
		this.selection_list.some(function(object){
			if ((!object.frozen) && (object.type & objectmask))
			{
				var object_point = object.translate_to_object_space(test_pos);
				
				if (object.test_point(object_point))
				{
					found_object = object;
					return true;
				}
			}
			
			return false;
		});
		
		return found_object;
	},
	
	checkBounds: function(pmin, pmax, omin, omax){
		if (omin.x >= pmin.x &&
			omin.y >= pmin.y &&
			omax.x < pmax.x &&
			omax.y < pmax.y)
		{
			return true;
		}
		return false;
	},
	
	getObjectsIn: function(pmin, pmax, objectmask){
		var drawIt = this;
		var test_min = this.transform_cache.translate_to_object_space(pmin);
		var test_max = this.transform_cache.translate_to_object_space(pmax);
		
		return this.selection_list.filter(function(object){
			if (!object.frozen && object.type & objectmask)
			{
					var object_min = new Point(0,0);
					var object_max = new Point(0,0);
					
					object.global_bounds(object_min, object_max);
					if (drawIt.checkBounds(test_min, test_max, object_min, object_max))
						return true;
					else
						return false;
			}
		});
	},
	
	addObjectToSelection: function(object){
		if (!this.combine_selection)
		{
			this.clearSelection();
		}
		else if (object.selected)
		{
			// Don't add it again!
			return;
		}
		
		object.selected = true;
		
		this.object_selection.push(object);
		
		if (this.onNewSelection)
			this.onNewSelection();
	},
	
	addObjectsToSelection: function(objects){
		if (!this.combine_selection)
			this.clearSelection();
		
		var object_selection = this.object_selection;
		objects.forEach(function(object){
			object.selected = true;
			object_selection.push(object);
		});
		
		if (this.onNewSelection)
			this.onNewSelection();
	},
	
	iterateOverSelection: function(funct){
		for (var i=0; i<this.object_selection.length; i++)
		{
			funct(this.object_selection[i]);
		}
	},
	
	removeObjectFromSelection: function(object){
		for (var i=0; i<this.object_selection.length; i++)
		{
			if (this.object_selection[i] == object)
			{
				this.object_selection[i].selected = false;
				this.object_selection.splice(i, 1);
				break;
			}
		}
		
		if (this.onNewSelection)
			this.onNewSelection();
	},
	
	rebuildTransformCache: function(){
		var transform_cache = this.transform_cache;
		
		transform_cache.x = 0;
		transform_cache.y = 0;
		transform_cache.rot = 0;
		transform_cache.scale.x = 1.0;
		transform_cache.scale.y = 1.0;
		
		if (this.selection_space == null)
			return;
		
		var transform_apply = Array();
		
		// grab the order of transformation
		var parent_itr = this.selection_space;
		while (parent_itr)
		{
			transform_apply.push(parent_itr);
			parent_itr = parent_itr.parent_group;
		}
		
		// apply transforms in order
		for (var i=transform_apply.length-1; i >= 0; i--)
		{
			parent_itr = transform_apply[i];
			transform_cache.x += parent_itr.x;
			transform_cache.y += parent_itr.y;
			
			transform_cache.rot += parent_itr.rot;
			
			transform_cache.scale.x *= parent_itr.scale.x;
			transform_cache.scale.y *= parent_itr.scale.y;
		}
	},
	
	pushSelectionSpace: function(object){
		if (object.type == DrawItConstants.OBJ_GROUP)
		{
			if (object.parent_group != this.selection_space)
				return false;
			
			this.selection_space = object;
			this.selection_list = object.children;
			this.clearSelection();
			this.rebuildTransformCache();
			return true;
		}
		return false;
	},
	
	popSelectionSpace: function(){
		if (this.selection_space != null)
		{
			this.selection_space.calculate_bounds();
			this.selection_space = this.selection_space.parent_group;
		}
		else
		{
			return false;
		}
		
		if (this.selection_space != null)
		{
			this.selection_list = this.selection_space.children;
		}
		else
		{
			this.selection_space = null;
			this.selection_list = this.object_list;
		}
		
		this.clearSelection();
		this.rebuildTransformCache();
		
		this.selection_list.forEach(function(object){
			object.calculate_bounds();
		});
		
		return true;
	},
	
	popSelectionSpaceUpTo: function(space){
		while (this.selection_space != space && this.selection_space != null)
		{
			this.popSelectionSpace();
		}
	},
	
	groupSelected: function(){
		if (this.current_mode != DrawItConstants.MODE_OBJECT)
			return;
		
		var gobj = this.groupObjects(this.object_selection);
		if (gobj)
		{
			this.clearSelection();
			this.addObjectToSelection(gobj);
		}
	},
	
	destroySelected: function(){
		if (this.current_mode != DrawItConstants.MODE_OBJECT)
			return;
		
		for (var i=0; i<this.object_selection.length; i++)
		{
			this.destroyObject(this.object_selection[i]);
		}
		this.clearSelection();
	},
	
	deltaSelectedPriority: function(delta){
		if (this.current_mode != DrawItConstants.MODE_OBJECT)
			return;
		
		for (var i=0; i<this.object_selection.length; i++)
		{
			this.object_selection[i].priority += delta;
		}
		
		this.resortPrioritiesIn(this.selection_list);
	},
	
	clearSelection: function(){
		this.object_selection.forEach(function(object){
			object.selected = false;
		});
		this.object_selection.splice(0, this.object_selection.length);
		
		if (this.onNewSelection)
			this.onNewSelection();
	},
	
	// Priorities
	
	resortPrioritiesIn: function(object_list){
		object_list.sort(function(a, b){
			if (a.priority < b.priority)
				return -1;
			if (a.priority > b.priority)
				return 1;
			if (a.priority == b.priority)
			{
				if (a.insert_id < b.insert_id)
					return -1;
				if (a.insert_id > b.insert_id)
					return 1;
			}
				
			return 0;
		});
	},
	
	// Objects
	
	createNestedObject: function(type, obj_list){
		var new_obj = null;
		
		switch (type)
		{
		case DrawItConstants.OBJ_GROUP:
			new_obj = new DrawItGroup();
		break;
		case DrawItConstants.OBJ_LINK:
		case DrawItConstants.OBJ_JOINT:
			// TODO
		break;
		case DrawItConstants.OBJ_POLY:
			new_obj = new DrawItPoly();
		break;
		case DrawItConstants.OBJ_SHAPE:
			new_obj = new DrawItShape();
		break;
		case DrawItConstants.OBJ_MAGIC:
			// TODO
		break;
		
		case DrawItConstants.OBJ_EDIT_CUSTOM:
			new_obj = new DrawItEditCustom();
		break;
		
		case DrawItConstants.OBJ_EDIT_MARKER:
			new_obj = new DrawItEditMarker();
		break;
		
		default:
			return null;
		break;
		}
		
		if (new_obj)
		{
			if (type & DrawItConstants.OBJ_EDIT)
				new_obj.priority = 66666;
			
			new_obj.insert_id = obj_list.length;
			
			obj_list.push(new_obj);
		}
		
		return new_obj;
	},
	
	createObject: function(type){
		var new_obj = this.createNestedObject(type, this.selection_list);
		if (!new_obj)
			return null;
		
		this.resortPrioritiesIn(this.selection_list);
		
		return new_obj;
	},
	
	// NOTE: only affects current selection space
	groupObjects: function(objects){
		if (objects.length < 2)
			return null;
		
		var group_object = this.createObject(DrawItConstants.OBJ_GROUP);
		group_object.parent_group = this.selection_space;
		var next_group_id = this.next_group_id;
		
		// First add to the cache
		group_object.children = objects.filter(function(object){
			object.group = next_group_id;
			
			// Set parent if neccesary
			if (object.type == DrawItConstants.OBJ_GROUP)
			{
				object.parent_group = group_object;
			}
			
			return true;
		});
		
		// Now remove every object from the main list with the according group id
		for (var i=0; i<this.selection_list.length; i++)
		{
			if (this.selection_list[i].group == next_group_id)
			{
				this.selection_list.splice(i, 1);
				i--;
			}
		}
		
		// Get the center
		group_object.recalculate_center = true;
		group_object.calculate_bounds();
		group_object.recalculate_center = false;
		
		// Change position
		group_object.x = group_object.center.x;
		group_object.y = group_object.center.y;
		
		// Move everything there and recalculate
		group_object.move_children_to_objectspace();
		group_object.calculate_bounds();
		
		this.next_group_id++;
		return group_object;
	},
	
	destroyNestedObject: function(object, object_list){
		var idx = object_list.indexOf(object);
		if (idx != -1) {
			if (object.type & DrawItConstants.OBJ_GROUP)
			{
				var del_list = object_list;
				object.move_children_from_objectspace();
				
				object.children.forEach(function(gobject){
					gobject.group = -1;
					del_list.push(gobject);
				});
			}
			
			object_list.splice(idx, 1);
			return true;
		}
		return false;
	},
	
	// NOTE: this only affects the current selection space & below
	destroyObject: function(object){
		var current_space = this.selection_space;
		if (current_space == null)
		{
			// Must be in the main list
			this.destroyNestedObject(object, this.object_list);
		}
		else
		{
			// We'll need to do a bit of searching down the tree
			while (current_space != null)
			{
				if (current_space == object)
				{
					// We need to collapse the selection space and try to destroy it from there
					this.popSelectionSpaceUpTo(current_space.parent_group);
					this.destroyObject(object);
					break;
				}
				
				if (this.destroyNestedObject(object, current_space.children))
					break;
				current_space = current_space.parent_group;
			}
			
			// Might be in the main list if we're at the end
			if (current_space == null)
				this.destroyNestedObject(object, this.object_list);
		}
	},
	
	recalculateAllBounds: function(){
		for (var i=0; i<this.object_list.length; i++)
		{
			this.object_list[i].calculate_bounds();
		}
	},
	
	// Persistence
	
	upload: function(){
		var tree = {'id' : this.drawing_id};
		var jSonRequest = new Json.Remote("/drawings/upload", {method: 'post', onComplete: function(result){
		}}).send(tree);
	},
	
	download: function(id){
		var jSonRequest = new Json.Remote("/drawings/get/" + id, {onComplete: function(result){
		}}).send({});
	}
});

