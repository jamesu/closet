# Simple script to parse national cricket teams from wikipedia.org
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


class Wikipedia

  include HTTParty
  
  base_uri "http://en.wikipedia.org"
end


cricket_teams = Nokogiri::HTML.parse(Wikipedia.get("/wiki/Category:National_cricket_teams"))

# List of countries as h2's
cricket_teams.xpath("//td/ul/li/a").each do |node|
  name = node.inner_text.match(/(.*) ((n|N)ational )(c|C)ricket (T|t)eam$/)
  next if name.nil?
  
  # Name and link
  name = name[1]
  url = node["href"]
  
  puts "Cricket team: #{name} [#{url}]"
  
  cricket_team = Nokogiri::HTML.parse(Wikipedia.get(url))
  
  headings = cricket_team.xpath("//h2")
  headings.each do |heading|
    # Find the one that says "Squads" or "Current Squad" or "Personnel"
    check = header.inner_text.match(/((S|s)quad|Personnel)/)
    if !check.nil?
      search_table = check.next_sibling
      while search_table != nil
        break if search_table.name == 'table'
        search_table = check.next_sibling
      end
      
      print "Found table"
      search_table.xpath("/tr/td[1]/a").each do |player|
        pname = player.inner_text
        mtch = pname.match(/^([A-Z][a-z]*) ([A-Z][a-z]*)$/)
        unless mtch.nil?
          print "\tPlayer: #{mtch[0]}"
        end
      end
    end 
  end
  
end