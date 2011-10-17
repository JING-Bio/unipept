class TreeMapNode < Node
  #:metadata contains the sequences
  attr_accessor :state, :metadata, :attr
  
  GRADIENT = Hash["root",         "#284907",  "superkingdom",   "#30540C",  "kingdom",          "#375B10",
                  "subkingdom",   "#3B6013",  "superphylum",    "#406617",  "phylum",           "#446B1B",
                  "subphylum",    "#49701F",  "superclass",     "#517725",  "class",            "#557C29",
                  "subclass",     "#5B822E",  "infraclass",     "#6A8937",  "superorder",       "#799341",
                  "order",        "#899B4C",  "infraorder",     "#98A557",  "parvorder",        "#A7AD62",
                  "superfamily",  "#B5B56E",  "family",         "#BFBA7C",  "subfamily",        "#C6BD8B",
                  "tribe",        "#D1C59A",  "subtribe",       "#D8CAA9",  "genus",            "#DDCDB1",
                  "subgenus",     "#E0CEB8",  "species group",  "#E5D3C3",  "species subgroup", "#E8D6C9",
                  "species",      "#EDDCD3",  "subspecies",     "#EFE0DA",  "varietas",         "#F4E7E3",
                  "forma",        "#F7EEED"]
  
  def initialize(id, name, rank="root")
    super(id, name)
    
    #area
    @data[:$area] = 0
    @data[:count] = 0
    
    @metadata = Hash.new
    @metadata[:all_sequences] = Array.new
    
    @attr = Hash.new
    @attr[:title] = rank
    
    #color
    @data[:level] = 0
    @data[:$color] = GRADIENT[rank]
    
    fix_title_and_state
  end
  
  # adds a child to this node and updates the color of the child
  # returns the added child
  def add_child(child, root)
    child.data[:level] = @data[:level]+1 
    super(child, root)
  end
  
  # adds a number to the count variable and recalculates the area
  def add_sequences(sequences)
    @metadata[:all_sequences].concat(sequences) 
    
    @data[:count] += sequences.length
    @data[:$area] = Math.log10(@data[:count]+1)/Math.log10(2)
    
    fix_title_and_state
  end
  
  def add_own_sequences(sequences)
    @data[:self_count] = sequences.length
    @metadata[:own_sequences] = sequences
  end
  
  def fix_title_and_state
    @data[:title] = @name
    if @children.length != 0
      @data[:title] += " (" + (@data[:self_count].nil? ? "0" : @data[:self_count].to_s) + "/" + @data[:count].to_s + ")" 
    else
      @data[:title] += " (" + @data[:count].to_s + ")" 
    end
      
    @state = @data[:level] <= 3 ? "open" : "closed"
  end
end