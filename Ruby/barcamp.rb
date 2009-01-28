# Simple script to parse dates of Barcamp events from barcamp.org
#   (C) 2009 James S Urquhart (jamesu at gmail dot com)
#
# Outputs to barcamp.ics
#

require 'rubygems'
require 'nokogiri'
require 'fileutils'
require 'date'
require 'time'
require 'httparty'
require 'icalendar'

events = []


class Barcamp

  include HTTParty
  
  base_uri "http://barcamp.org"
end

months = {}
Date::MONTHNAMES[1..-1].each_index { |i| months[Date::MONTHNAMES[i+1]] = i+1 }
Date::ABBR_MONTHNAMES[1..-1].each_index { |i| months[Date::ABBR_MONTHNAMES[i+1]] = i+1 }

months["Octubre"] = 10
months["Noviembre"] = 11
months["Agosto"] = 8


site = Nokogiri::HTML.parse(Barcamp.get("/"))

# List of countries as h2's
site.xpath("//h2").each do |node|
  # Followed by text, then ol
  list = node.next_sibling.next_sibling
  
  if list.name == "ol"
    #puts "Found list #{node.inner_text}"
    list.xpath("li").each do |event|
      day = 1
      month = nil
      evt = event.inner_text
      puts "\t#{evt}"
      
      # Parse the day & month
      # Oddly no events which span over two months...
      
      # Month 12
      if not (date = /([A-Z][a-z]*).? ([0-9]{1,2})([a-z]{1,2})?,? /.match(evt)).nil?
        day = date[2].to_i
        month = months[date[1]]
        
        puts "[0] day == #{day}, month == #{month}(#{date[1]})"
      # Month 12-34
      elsif not (date = /([A-Z][a-z]*) ([0-9]{1,2})([a-z]{1,2})? ?(-|,|&|\\) ?([0-9]{1,2})([a-z]{1,2})?/.match(evt)).nil?
        day = [date[2].to_i, date[5].to_i]
        month = months[date[1]]
        
        puts "[1] days == [#{day[0]}, #{day[1]}], month == #{month}(#{date[1]})"
      # 12 Month
      elsif not (date = /([0-9]{1,2})([a-z]{1,2})? ([A-Z][a-z]*)/.match(evt)).nil?
        day = date[1].to_i
        month = months[date[3]]
        
        puts "[2] day == #{day}, month == #{month}(#{date[3]})"
      end
      
      # Lastly, parse the year
      
      match = /[0-9]{4,4}/.match(evt)
      year = match.nil? ? Time.now.year : match[0].to_i
      
      # Try constructing the dates
      begin
        if day.class == Array
          events << [:mday, Date.civil(year, month, day[0]), Date.civil(year, month, day[1]+1), evt]
        else
          events << [:day, Date.civil(year, month, day), evt]
        end 
      rescue Exception => e
        puts "\t???"
      end
      
    end
  end
end

puts "Dumping to iCal..."

# Construct ical from events
cal = Icalendar::Calendar.new

events.each do |evt|
  cal.event do
    if evt[0] == :mday
      dtstart evt[1]
      dtend evt[2]
      name = evt[3]
    else
      dtstart evt[1]
      dtend evt[1]
      name = evt[2]
    end
    
    cleaned_name = nil
    
    # clean up name
    match = /(st|rd|nd)?( ,|-)? ([A-Z].*)$/.match(name)
    cleaned_name = match[3] unless match.nil?
    
    # Alternate, includes year
    match = /([0-9]{4,4})( ,|-)? ([A-Z].*)$/.match(cleaned_name || name)
    cleaned_name = match[3] if !match.nil?
    
    # Problems with the last?
    if cleaned_name.nil?
       match = /( )?(,|-)? ([A-Z].*)$/.match(name)
       cleaned_name = match[3] if !match.nil?
    end
    
    summary cleaned_name
    description name
  end
end

# Dump to barcamp.ical

File.open("barcamp.ics", "w") do |fs|
  fs.write(cal.to_ical)
end
