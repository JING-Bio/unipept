export default class FATrust {
    // How many peptides are annotated with at least a term?
    public annotatedCount: number;
    // TODO: what's this for?
    public totalCount: number;
    // This is the total amount of peptides that were looked up for a specific search.
    public trustCount: number;

    constructor(annotatedCount: number, totalCount: number, trustCount: number) {
        this.annotatedCount = annotatedCount;
        this.totalCount = totalCount;
        this.trustCount = trustCount;
    }
}