# == Schema Information
#
# Table name: counters
#
#  name  :string(31)      not null
#  value :integer(4)      default(0), not null
#

class Counter < ActiveRecord::Base
  
  set_primary_key :name
  
  def self.count(max=1000)
    id = Counter.find_by_name("sequence_id")
    while id.value < max
      id.value += 1
      sequence = Sequence.find_by_id(id.value)
      lineages = sequence.lineages #calculate lineages
      if lineages.size != 0;
        lca_taxon = Lineage.calculate_lca_taxon(lineages) #calculate the LCA
        c = lca_taxon.name == "root" ? Counter.find_by_name("root") : Counter.find_by_name(lca_taxon.rank);
        if !c.nil?
          c.value += 1
          c.save;
        end
      end
      id.save;
    end
  end
  
end
