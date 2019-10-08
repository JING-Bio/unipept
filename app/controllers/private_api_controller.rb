class PrivateApiController < ApplicationController
  before_action :default_format_json
  before_action :set_headers, only: %i[lineages goterms ecnumbers taxa]
  skip_before_action :verify_authenticity_token

  # enable cross origin requests
  def set_headers
    headers['Access-Control-Allow-Origin'] = '*'
    headers['Access-Control-Expose-Headers'] = 'ETag'
    headers['Access-Control-Allow-Methods'] = 'GET, POST'
    headers['Access-Control-Allow-Headers'] = '*,x-requested-with,Content-Type,If-Modified-Since,If-None-Match'
    headers['Access-Control-Max-Age'] = '86400'
  end

  def lineages
    taxids = params[:taxids] || []
    @lineages = Lineage.where(taxon_id: taxids)
  end

  def goterms
    go_terms = params[:goterms] || []
    @goterms = GoTerm.where(code: go_terms)
  end

  def ecnumbers
    ec_nrs = params[:ecnumbers]
    @ecnumbers = EcNumber.where(code: ec_nrs)
  end

  def taxa
    taxids = params[:taxids] || []
    @taxa = Taxon.where(id: taxids)
  end

  private

  def default_format_json
    request.format = 'json'
  end
end
