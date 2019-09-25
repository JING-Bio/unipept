export default class SampleDataset {
    public name: string;
    public data: string[];
    public order: number;

    constructor(name: string, data: string[], order: number) {
        this.name = name;
        this.data = data;
        this.order = order;
    }
}
