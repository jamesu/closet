# Simple script to consolidate multiple colloquy transcripts into a single HTML log
#   (C) 2009 James S Urquhart (jamesu at gmail dot com)
#
# Reads from logs/*.colloquyTranscript
# Outputs to out.html
# 
# Have multiple logs of conversations with a user who uses multiple nicknames 
# in colloquy, each in separate files?
#
# Well here is the solution. Now you'll never get confused over which important 
# piece of information is in which transcript ever again, as it will all be 
# listed in a single HTML log.
#

require 'rubygems'
require 'nokogiri'
require 'fileutils'
require 'time'

class Sender
  @@senders = {}
  
  attr_accessor :name, :hostmask
  
  def initialize(name, hostmask)
    @name = name
    @hostmask = hostmask
  end
  
  def self.insert(xpath)
    idt = xpath["identifier"]
    
    if !@@senders.has_key? idt
      @@senders[idt] = Sender.new(xpath.inner_text, xpath["hostmask"])
    end
    
    idt
  end
  
  def self.all
    @@senders
  end
  
end

class LogEntry
  attr_accessor :occurred, :content, :sender, :type
  
  def initialize(entry, sender=nil)
    @sender = sender
    
    if entry.name == "event":
      puts "EVT"
      @occurred = Time.parse(entry["occurred"])
      @content = entry.xpath("message").inner_text
    elsif entry.name == "message"
      puts "MSG"
      @occurred = Time.parse(entry["received"])
      @content = entry.inner_text
    else
      puts "WTF??? #{entry.name}?"
      @occurred = nil
      @content = "???"
    end
    
    @type = entry.name
    
    puts "LOG INIT #{@occurred}"
    puts entry.to_s
    puts "--"
  end
  
end

entries = []

Dir["logs/*.colloquyTranscript"].each do |file|
  puts file
  fs = File.open(file, "r")
  nk = Nokogiri::XML.parse(fs.read)
  fs.close
  
  # Parse XML
  nk.xpath('log/*').each do |entry|
    if entry.name == "event"
      entries << LogEntry.new(entry)
    elsif entry.name == "envelope"
      sender = Sender.insert(entry.xpath("sender")[0])
      entry.xpath("message").each do |msg|
        entries << LogEntry.new(msg, sender)
      end
    end
  end
  
end

puts "Parsed #{entries.length} entries, #{Sender.all.keys.length} senders."

# Sort entries
entries.sort! { |x,y| x.occurred <=> y.occurred }

fs = File.open("out.html", "w")
fs.write("<html><head><title>Log</title>
<style>
table {
  
}

tr {
  font-size: 16px;
}

tr.event {
  background: #eee;
  padding-top: 6px;
  padding-bottom: 6px;
}

tr.message {
  padding-top: 2px;
  padding-bottom: 2px;
}

tr.message td {
  border-bottom: 1px solid #eee;
}

tr.date {
  text-align: center;
  font-weight: bolder;
  font-size: 20px;
}

td {
}

td.date {
  font-weight: bold;
  font-size: 12px;
  
  border-bottom: none;
  border-left: 1px solid #eee;
  padding-left: 3px;
}

td.sender {
  font-weight: bold;
  font-size: 14px;
  
  border-bottom: none;
  border-right: 1px solid #ccc;
  text-align: right;
  
  padding-right: 3px;
}

td.content {
  padding-left: 3px;
  padding-right: 3px;
}


</style>
</head><body>\n")
fs.write("<table>\n")
last_date = nil
last_sender = nil
entries.each do |entry|
  dt = entry.occurred.send(:to_date)
  if dt != last_date
    fs.write("<tr class=\"date\"><td colspan=\"3\">#{dt.to_s}</tr>")
    last_date = dt
  end
  if entry.sender != last_sender
    sender = entry.sender.nil? ? "" : "#{Sender.all[entry.sender].name}"
    last_sender = entry.sender
  else
    sender = ""
  end
  fs.write("<tr class=\"#{entry.type}\"><td class=\"sender\">#{sender}</td><td class=\"content\">#{entry.content}</td><td class=\"date\">#{entry.occurred.strftime('%H:%M:%S')}</td></tr>\n")
end
fs.write("</table>\n")
fs.write("</body></html>\n")
fs.close
