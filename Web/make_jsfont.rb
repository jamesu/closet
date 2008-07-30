#!/usr/bin/ruby

require 'rubygems'
require 'gd2'

$KCODE = 'u'

FONT_PATH = '/Library/Fonts'

class Float
  def round_to(x)
    (self * 10**x).round.to_f / 10**x
  end

  def ceil_to(x)
    (self * 10**x).ceil.to_f / 10**x
  end

  def floor_to(x)
    (self * 10**x).floor.to_f / 10**x
  end
end

def js_escape(str)
	str.split('').collect do |char|
		if ['\'', '\\'].include? char
			"\\#{char}"
		else
			char
		end
	end.join
end

def calcWidths(metrics)
	prev_pos = 0
	max_spacing = 0
        widths = metrics[:position][1...metrics[:position].length].map do |pos|
                val = pos-prev_pos
                max_spacing = val if val > max_spacing
                prev_pos = pos
                val.ceil#round_to(2)
        end.join(',')
	return max_spacing.ceil, widths
end

def make_transparent(image, trans_color)
        image.draw do |pen|
                pen.color = trans_color
                0...image.width { |x|
                        0...image.height { |y|
                                image.set_pixel(x,y,pixel)
                        }
                }
	end
	new_image = GD2::Image::TrueColor.new(image.width, image.height)
	old_image = GD2::Image::load(image.png)
	new_image.alpha_blending = false
	new_image.save_alpha = true
	new_image.copy_from(old_image, 0, 0, 0, 0, image.width, image.height, image.width, image.height)
	new_image
end

def makeFont(name, id, size, chars, options)
	gdFont = GD2::Font::TrueType.new("#{FONT_PATH}/#{name}.ttf", size, options)
	metrics = gdFont.bounding_rectangle(chars)
	
	# Grab the widths and max spacing of each character
	max_spacing, widths = calcWidths(metrics)
	canvas_width = (chars.length * max_spacing).ceil

	# Height, easy
	puts "LL #{metrics[:lower_left][0]},#{metrics[:lower_left][1]}"
	puts "LR #{metrics[:lower_right][0]},#{metrics[:lower_right][1]}"
	puts "UL #{metrics[:upper_left][0]},#{metrics[:upper_left][1]}"
	puts "UR #{metrics[:upper_right][0]},#{metrics[:upper_right][1]}"
	
	image_height = metrics[:lower_right][1] - metrics[:upper_right][1]
	height = metrics[:upper_right][1].abs
	
	# Dump metrics
	puts "#{id}#{size}.c='#{js_escape(chars)}';"
	puts "#{id}#{size}.w=[#{widths}];"
	puts "#{id}#{size}.h=#{image_height};"
	puts "#{id}#{size}.s=#{max_spacing};"

	# Print each character into a bitmap

	image = GD2::Image::IndexedColor.new(canvas_width, image_height)
	image.save_alpha = true
	trans_color = GD2::Color::TRANSPARENT
	image.palette << trans_color
	trans_pixel = image.color2pixel(trans_color)
	image.transparent = trans_color

	# Add range of greys to palette
	step = (1.0 / image.palette.available)
	(0...image.palette.available).map do |count|
		puts count*step
		image.palette << GD2::Color.new(count*step,count*step,count*step)
	end

	image = make_transparent(image, trans_color)
	image.draw do |pen|
		pen.font = gdFont
		pen.color = GD2::Color.new(0.0,0.0,0.0)
		cur_x = 0
		chars.split('').each do |char|
			pen.move_to(cur_x, height)
			pen.text(char)
			cur_x += max_spacing
		end
	end
	image.export("#{id}.png")
end

gen_str = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789!@#$%^&*()-=[]\\;\',./_+{}|:"<>?`~'

makeFont(ARGV[0], ARGV[1], ARGV[2].to_i, gen_str, { :charmap => GD2::Font::TrueType::CHARMAP_UNICODE  })
