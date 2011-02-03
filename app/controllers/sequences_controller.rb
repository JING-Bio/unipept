class SequencesController < ApplicationController
  
  def show
    #id or sequence?
    if params[:id].match(/\A[0-9]+\z/)
      @sequence = Sequence.find_by_id(params[:id])
    else  
      @sequence = Sequence.find_by_sequence(params[:id])
    end
    
    #error on nil
    if @sequence.nil?
      flash[:error] = "No matches for #{params[:id]}"
      redirect_to sequences_path
    else
      @title = @sequence.sequence
      resultset = @sequence.occurrences
      
      @number_of_species = resultset.num_rows
      @genera = Array.new
      @species = Hash.new
      resultset.each_hash do |row|
        g = @species[row["genus"]]
        if g.nil?
          @genera << row["genus"]
          @species[row["genus"]] = [row]
        else
          @species[row["genus"]] << row
        end
      end
      @genera.sort!
    end
  end
  
  def index
    @title = "All sequences"
    @sequences = Sequence.paginate(:page => params[:page])
  end
  
  def search
    redirect_to "#{sequences_path}/#{params[:q]}"
  end
  
  def multi_search
    @title = "Results"
    data = params[:q][0].gsub(/([KR])([^P\r])/,"\\1\n\\2").gsub(/I/,'L').lines.map(&:strip).to_a.uniq
    @number_searched_for = data.length
    @number_found = 0
    @number_unique_found = 0
    @matches = Hash.new
    @species = Array.new
    data.each do |s|
      sequence = Sequence.find_by_sequence(s)
      unless sequence.nil?
        @number_found += 1
        if(params[:drafts])
          resultset = sequence.occurrences(true)
        else
          resultset = sequence.occurrences(false)
        end
        if resultset.num_rows == 1
          @number_unique_found += 1
          hash = resultset.fetch_hash
          hash["sequence"] = sequence
          s = @matches[hash["species"]]
          if s.nil?
            @species << hash["species"]
            @matches[hash["species"]] = [hash]
          else
            @matches[hash["species"]] << hash
          end
        end
      end
    end
    @species.sort!
  end
end