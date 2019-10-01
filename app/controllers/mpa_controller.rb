class MpaController < ApplicationController
  before_action :default_format_json, except: ['analyze']
  before_action :set_headers, only: %[pept2data]
  skip_before_action :verify_authenticity_token

  # enable cross origin requests
  def set_headers
    headers['Access-Control-Allow-Origin'] = '*'
    headers['Access-Control-Expose-Headers'] = 'ETag'
    headers['Access-Control-Allow-Methods'] = 'GET, POST'
    headers['Access-Control-Allow-Headers'] = '*,x-requested-with,Content-Type,If-Modified-Since,If-None-Match'
    headers['Access-Control-Max-Age'] = '86400'
  end

  def analyze
    @header_class = 'MPA'
    @title = 'Metaproteomics analysis result'
    @peptides = (params[:qs] || '')
    @name = params[:search_name]
    @il = params[:il].present?
    @dupes = params[:dupes].present?
    @missed = params[:missed].present?
  end

  def pept2data
    peptides = params[:peptides] || []
    missed = params[:missed]
    @equate_il = params[:equate_il]
    @peptides = Sequence
                .includes(Sequence.lca_t_relation_name(@equate_il) => :lineage)
                .where(sequence: peptides)
                .where.not(Sequence.lca_t_relation_name(@equate_il) => nil)
    if missed
      @peptides += peptides
                   .to_set.subtract(@peptides.map(&:sequence))
                   .map { |p| Sequence.missed_cleavage(p, @equate_il) }
                   .compact
    end

    @results_fa = {}
    @peptides.each do |sequence|
      @results_fa[sequence.sequence] = sequence.calculate_fa(@equate_il)
    end
  end

  private

  def default_format_json
    request.format = 'json'
  end
end
