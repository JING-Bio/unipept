<template>
    <v-app style="background: transparent;">
        <v-row>
            <v-col :cols="12">
                <single-peptide-summary :communication-source="communicationSource" :peptide="sequence" :equateIl="equateIl"></single-peptide-summary>
                <single-peptide-analysis-card :communication-source="communicationSource" :peptide="sequence" :equateIl="equateIl"></single-peptide-analysis-card>
            </v-col>
        </v-row>
    </v-app>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";
import NetworkConfiguration from "unipept-web-components/src/business/communication/NetworkConfiguration";
import SinglePeptideAnalysisCard from "unipept-web-components/src/components/analysis/single/SinglePeptideAnalysisCard.vue";
import SinglePeptideSummary from "unipept-web-components/src/components/analysis/single/SinglePeptideSummary.vue";
import { Peptide } from "unipept-web-components/src/business/ontology/raw/Peptide";
import CommunicationSource from "unipept-web-components/src/business/communication/source/CommunicationSource";
import DefaultCommunicationSource from "unipept-web-components/src/business/communication/source/DefaultCommunicationSource";


@Component({
    components: {
        SinglePeptideSummary,
        SinglePeptideAnalysisCard
    }
})
export default class SingleResults extends Vue {
    private sequence: Peptide = "";
    private equateIl: boolean = true;

    private communicationSource: CommunicationSource = new DefaultCommunicationSource();

    private created() {
        NetworkConfiguration.BASE_URL = "";

        const currentRoute: string = window.location.href;

        this.sequence = currentRoute.match(/sequences\/([^/]*)/)[1];
        this.equateIl = currentRoute.includes("equateIl");
    }
}
</script>

<style scoped>

</style>
