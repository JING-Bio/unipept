import {showNotification} from "./notifications.js";
import {DatasetManager} from "./mpa/datasetManager.js";
import {get, getJSON, highlight, logToGoogle, showError, showInfo} from "./utils.js";
import {PeptideContainer} from "./mpa/peptideContainer";
import {LOCAL_STORAGE_TYPE, MPAAnalysisContainer, QUICK_SEARCH_TYPE} from "./mpa/mpaAnaylsisContainer";

/* eslint-disable require-jsdoc */

function enableProgressIndicators(enable = true) {
    let $searchButton = $("#search_button");
    let $formProgress = $("#form-progress");

    $(".input-item").prop('disabled', enable);

    if (enable) {
        $searchButton.hide();
        $formProgress.removeClass("hide");
    } else {
        $searchButton.show();
        $formProgress.addClass("hide");
    }
}

function initDatasets() {
    let datasetLoader = constructDatasetLoader();
    let dataSetManager = new DatasetManager();
    showSelectedDatasetsPlaceholder();
    renderLocalStorageItems(dataSetManager);

    // Stores all datasets that are not saved in local storage, but that should be analysed anyways
    let quickSearchItems = [];
    let $saveDatasetCheckbox = $("#save_dataset");

    // enable tooltips
    $(".js-has-hover-tooltip").tooltip({
        container: "body",
        placement: "right",
    });
    $(".js-has-focus-tooltip").tooltip({
        trigger: "focus",
        container: "body",
        placement: "right",
    });

    $("#select_datasets_button").click(function() {
        // Retrieve all selected datasets through the selected checkboxes
        $(".dataset-checkbox").each(function() {
            if ($(this).prop("checked")) {
                dataSetManager.selectDataset($(this).data("dataset"));
            }
        });

        renderSelectedDatasets(dataSetManager, quickSearchItems);
    });

    $("#search-multi-form").click(function() {
        enableProgressIndicators();

        let $dataForm = $("#send_data_form");

        searchSelectedDatasets(dataSetManager, quickSearchItems)
            .then(() => $dataForm.submit())
            .catch(err => {
                showError(err, "An unknown error occurred. Please try again.");
                enableProgressIndicators(false);
            });
    });

    $("#add_dataset_button").click(function() {
        enableSearchNameError(false);

        let $searchName = $("#search_name");
        let searchName = $searchName.val();
        let save = $saveDatasetCheckbox.prop("checked");

        if (save && searchName === "") {
            enableSearchNameError();
        } else {
            enableProgressIndicators();
            let peptideContainer = getPeptideContainerFromUserInput();
            if (save) {
                peptideContainer.getPeptides()
                    .then(peptides => {
                        dataSetManager.storeDataset(peptides, searchName)
                            .catch(err => showError(err, "Something went wrong while storing your dataset. Check whether local storage is enabled and supported by your browser."))
                            .then(() => {
                                dataSetManager.selectDataset(searchName);
                                renderLocalStorageItems(dataSetManager);
                                renderSelectedDatasets(dataSetManager, quickSearchItems);
                            });
                    })
                    .catch(err => {
                        showError(err, "Something went wrong while reading your dataset. Check whether local storage is enabled and supported by your browser.");
                        enableProgressIndicators(false);
                    });
            } else {
                quickSearchItems.push(peptideContainer);
                renderSelectedDatasets(dataSetManager, quickSearchItems);
                enableProgressIndicators(false);
            }
        }
    });

    $("#reset_button").click(function() {
        $("#qs").val("");
        $("#search_name").val("");
        dataSetManager.clearSelection();
        quickSearchItems = [];
        renderSelectedDatasets(dataSetManager, quickSearchItems);
        showSelectedDatasetsPlaceholder();
    });

    // track the use of the export checkbox
    $("#export").change(function () {
        logToGoogle("Multi Peptide", "Export");
    });

    $("#qs").on("paste", function () {
        setTimeout(datasetLoader.checkDatasetSize, 0);
    });

    // load a dataset from the local database
    $(".load-dataset").click(function () {
        $(this).button("loading");
        // set the vars
        let id = $(this).parent().find("select").val(),
            name = $(this).parent().find("select option:selected").text();

        logToGoogle("Datasets", "Load", "Database - " + name);

        // load the datasets
        datasetLoader.loadDataset("internal", id, name, $(this));
        return false;
    });

    // load a PRIDE dataset
    $(".load-pride").click(loadPride);
    $("#pride_exp_id").keypress(function (event) {
        if (event.which == "13") {
            loadPride();
        }
    });

    function loadPride() {
        // set the vars
        let experiment = $("#pride_exp_id").val(),
            name = "PRIDE assay " + experiment;

        if (experiment === "") {
            showInfo("Please enter a PRIDE assay id");
            return false;
        }

        $(this).button("loading");

        logToGoogle("Datasets", "Load", "Pride - " + name);

        // load the datasets
        datasetLoader.loadDataset("pride", experiment, name, $(this));
        return false;
    }
}

function initPreload(type, id) {
    let datasetLoader = constructDatasetLoader();
    $("#pride-progress").appendTo(".card-supporting-text");

    if (type === "database") {
        datasetLoader.loadDataset("internal", id, "Dataset " + id);
    } else {
        datasetLoader.loadDataset("pride", id, "Pride assay " + id);
    }
}

function showSelectedDatasetsPlaceholder() {
    $("#selected-datasets-list").append($("<span>No datasets currently selected...</span>"));
}

function enableSearchNameError(state = true) {
    let $searchInputGroup = $("#search-input-group");
    let $helpBlockName = $("#help-block-name");

    if (state) {
        $searchInputGroup.addClass("has-error");
        $helpBlockName.removeClass("hidden");
    } else {
        $searchInputGroup.removeClass("has-error");
        $helpBlockName.addClass("hidden");
    }
}

/**
 * Build a representation of the currently selected datasets in JSON, send it to the MPA analysis page and proceed.
 *
 * @returns {Promise<void>}
 */
async function searchSelectedDatasets(dataSetManager, quickSearchItems) {
    let $dataInput = $("#data_input");

    let output = [];

    if (dataSetManager.getAmountOfSelectedDatasets() === 0 && quickSearchItems.length === 0) {
        let peptideContainer = getPeptideContainerFromUserInput();
        output.push(new MPAAnalysisContainer(QUICK_SEARCH_TYPE, undefined, peptideContainer))
    } else {
        let selectedDatasets = await dataSetManager.getSelectedDatasets();
        for (let selectedDataset of selectedDatasets) {
            output.push(new MPAAnalysisContainer(LOCAL_STORAGE_TYPE, selectedDataset.getName()));
        }

        for (let quickSearchItem of quickSearchItems) {
            output.push(new MPAAnalysisContainer(QUICK_SEARCH_TYPE, undefined, quickSearchItem));
        }
    }

    let il = $("#il").prop("checked");
    let dupes = $("#dupes").prop("checked");
    let missed = $("#missed").prop("checked");

    $dataInput.val(JSON.stringify({
        settings: {
            il: il,
            dupes: dupes,
            missed: missed
        },
        data: output
    }));
}

function renderLocalStorageItems(datasetManager) {
    let $body = $("#local-storage-datasets");
    $body.html("");
    enableProgressIndicators();

    datasetManager.listDatasets()
        .then(allDatasets => {
            for (let i = 0; i < allDatasets.length; i++) {
                $body.append(renderLocalStorageItem(allDatasets[i]));
            }
        })
        .catch(err => showError(err, "Something went wrong while loading your datasets. Check whether local storage is enabled and supported by your browser."))
        .then(() => enableProgressIndicators(false));
}

function renderLocalStorageItem(dataset) {
    // Use jQuery to build elements to prevent XSS attacks
    let $listItem = $("<div class='list-item--two-lines'>");
    let $primaryAction = $("<span class='list-item-primary-action'>").append($("<input type='checkbox' class='dataset-checkbox' data-dataset='" + dataset.getName() + "'>"));
    let $primaryContent = $("<span class='list-item-primary-content'>").text(dataset.getName());
    $primaryContent.append($("<span class='list-item-date'>").text(dataset.getDate()));
    let $primaryBody = $("<span class='list-item--two-lines list-item-body'>").text(dataset.getAmountOfPeptides() + " peptides");
    $primaryContent.append($primaryBody);
    $listItem.append($primaryAction);
    $listItem.append($primaryContent);
    return $listItem;
}

function renderSelectedDatasets(datasetManager, quickSearchDatasets) {
    let $body = $("#selected-datasets-list");
    $body.html("");
    enableProgressIndicators();

    datasetManager.getSelectedDatasets()
        .then(selectedDatasets => {
            for (let selectedDataset of selectedDatasets.concat(quickSearchDatasets)) {
                $body.append(renderSelectedDataset(selectedDataset));
            }

        })
        .catch(err => showError(err, "Something went wrong while selecting some datasets. Check whether local storage is enabled and supported by your browser."))
        .then(enableProgressIndicators(false));
}

function renderSelectedDataset(dataset) {
    // Use jQuery to build elements and prevent XSS attacks
    let $listItem = $("<div class='list-item--two-lines'>");
    let $primaryContent = $("<span class='list-item-primary-content'>").append("<span>").text(dataset.getName());
    $primaryContent.append($("<span class='list-item-date'>").text(dataset.getDate()));
    $primaryContent.append($("<span class='list-item-body'>").text(dataset.getAmountOfPeptides() + " peptides"));
    $listItem.append($primaryContent);
    return $listItem;
}

function getPeptideContainerFromUserInput() {
    let peptides = $("#qs").val().replace(/\r/g,"").split("\n");
    let search = $("#search_name").val();

    let date = new Date();
    let peptideContainer = new PeptideContainer(search, peptides.length, date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDay());
    peptideContainer.setPeptides(peptides);
    return peptideContainer;
}

function constructDatasetLoader() {
    let that = {};

    /** ************ private methods *************/

    /**
     * Returns a list of peptides from an internal dataset as a promise
     *
     * @param {Integer} id The id of the dataset(item) we want to load
     */
    function loadInternalDataset(id) {
        return get("/dataset_items/" + id);
    }

    /**
     * Returns a list of peptide from a pride experiment as a promise
     *
     * @param {Integer} id The id of the assay we want to load
     */
    function loadPrideDataset(id) {
        let batchSize = 1000,
            peptides = [],
            e;


        $("#pride-progress").show("fast");
        $("#pride-progress .progress-bar").css("width", "10%");

        return get("https://www.ebi.ac.uk/pride/ws/archive/peptide/count/assay/" + id).then(function (datasetSize) {
            let urls = [],
                page;
            for (page = 0; page * batchSize < datasetSize; page++) {
                urls.push("https://www.ebi.ac.uk/pride/ws/archive/peptide/list/assay/" + id + "?show=" + batchSize + "&page=" + page);
            }
            page = 0;
            return urls.map(getJSON)
                .reduce(function (sequence, batchPromise) {
                    return sequence.then(function () {
                        return batchPromise;
                    }).then(function (response) {
                        page++;
                        $("#pride-progress .progress-bar").css("width", 10 + (90 * page * batchSize) / datasetSize + "%");
                        peptides = peptides.concat(response.list.map(function (d) {
                            return d.sequence;
                        }));
                    });
                }, Promise.resolve());
        }).catch(function (err) {
            e = err;
        })
            .then(function () {
                $("#pride-progress").hide("fast");
                if (e) throw e;
                return peptides.join("\n");
            });
    }


    /** ************ public methods *************/

    /**
     * Checks if the number of peptides in the current dataset isn't too high
     * and displays a warning if it is.
     */
    that.checkDatasetSize = function checkDatasetSize() {
        let lines = $("#qs").val().split(/\n/).length;
        if (lines > 100000) {
            $(".multisearch-warning-amount").text(lines);
            $("#multisearch-warning").show("fast");
        } else {
            $("#multisearch-warning").hide("fast");
        }
    };

    /**
     * Public method to load a dataset
     *
     * @param {String} type The type of the dataset to load: internal or pride
     * @param {Integer} id The id of the dataset to load
     * @param {String} name The name of the dataset
     * @param {HTMLButtonElement} button The button that was clicked to load the
     *          dataset. Can be nil.
     */
    that.loadDataset = function loadDataset(type, id, name, button) {
        // expand the search options and prepare the form
        $("#qs").val("Please wait while we load the dataset...");
        enableProgressIndicators();
        $("#search-multi-form").button("loading");
        let startTimer = new Date().getTime();
        let toast = showNotification("Loading dataset...", {
            autoHide: false,
            loading: true,
        });

        let done = function (data) {
            // track the load times
            let loadTime = new Date().getTime() - startTimer;
            logToGoogle("Datasets", "Loaded", name, loadTime);

            // fill in the data
            $("#search_name").val(name);
            $("#qs").val(data);
            that.checkDatasetSize();

            // highlight what happend to the user
            highlight("#qs");
            highlight("#search_name");
        };

        let fail = function (error) {
            // track if something goes wrong
            logToGoogle("Datasets", "Failed", name, error);

            // reset the form elements
            $("#qs").val("");

            // highlight what pappend to the user
            showError(error, "Something went wrong while loading the datasets.");
            $("html, body").animate({
                scrollTop: $("#messages").offset().top,
            }, 1000);
        };

        let always = function () {
            // enable the form elements
            $("#search-multi-form").button("reset");
            if (button) {
                button.button("reset");
            }
            toast.hide();
            enableProgressIndicators(false);
        };

        let request = type === "internal" ? loadInternalDataset(id) : loadPrideDataset(id);
        request.then(done)
            .catch(fail)
            .then(always);
    };

    return that;
}

export {initDatasets, initPreload};
