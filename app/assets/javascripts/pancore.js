function init_pancore() {
    // Data and workers
    var data = {},
        visData = [],
        pan = new JS.Set(),
        core = new JS.Set(),
        //workerBlob = new Blob([$('#worker1').textContent]),
        //worker = new Worker(window.URL.createObjectURL(workerBlob));
        worker = new Worker("worker.js");

    // D3 vars
    var svg,
        tooltip;

    // animation stuff
    var transitionDuration = 500,
        mayStartAnimation = true,
        dataQueue = [],
        toLoad;

    // Colors
    var panColor = "steelblue",
        coreColor = "#ff7f0e";

    // Size
    var margin = {top: 20, right: 20, bottom: 170, left: 60},
        width = 920 - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom;

    // Scales
    var x = d3.scale.ordinal()
        .rangePoints([0, width], 1),
        y = d3.scale.linear()
        .range([height, 0]);

    // Axes
    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom"),
        yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    // Graph lines helpers
    var panLine = d3.svg.line()
        .interpolate("linear")
        .x(function (d) { return x(d.name); })
        .y(function (d) { return y(d.pan); });
    var coreLine = d3.svg.line()
        .interpolate("linear")
        .x(function (d) { return x(d.name); })
        .y(function (d) { return y(d.core); });

    // Add handler to the worker
    worker.addEventListener('message', function(e) {
        var data = e.data;
        switch (data.type) {
            case 'print':
                console.log(data.msg);
                break;
            case 'error':
                console.log(data.msg);
                break;
            default:
                console.log(data.msg);
        };
    }, false);

    // Add handler to the form
    $("#load_proteome").click(function () {
        // Disable the load button
        $(this).button('loading');

        clearAllData();
        var id = $("#species_id").val();
        $.getJSON("/pancore/genomes/" + id + ".json", function (genomes) {
            toLoad = genomes.length;
            for (var i in genomes) {
                loadData(genomes[i].name, genomes[i].refseq_id);
            }
        });
        return false;
    });

    // Send something to the worker
    sendToWorker("log", "message");

    // Draw the graph
    redrawGraph();

    // Load sample data
    $("#species_id").val(470);
    //$("#load_proteome").click();

    // Sends a command and message to the worker
    function sendToWorker(command, message) {
        worker.postMessage({'cmd': command, 'msg': message});
    }

    // Loads peptides, based on refseq_id
    function loadData(name, refseq_id) {
        $.getJSON("/pancore/sequences/" + refseq_id + ".json", function (json_data) {
            addData(name, new JS.Set(json_data));
        });
    }

    // Adds new dataset to the data array
    function addData(name, set) {
        // Store data for later use
        data[name] = set;

        // Calculate pan and core
        core = pan.isEmpty() ? set : core.intersection(set);
        pan = pan.union(set);

        // Add to the main data array
        var temp = {};
        temp.name = name;
        temp.pan = pan.length;
        temp.core = core.length;
        dataQueue.push(temp);
        tryUpdateGraph();
    }

    // Resets the data array
    function clearAllData() {
        data = {};
        visData = [];
        pan = new JS.Set();
        core = new JS.Set();

        updateGraph();
    }

    // Adds the next datapoint to the animation after the current
    // animation is done.
    function tryUpdateGraph(){
        if (mayStartAnimation) {
            toLoad--;
            if (toLoad == 0) {
                // Not a big fan of this.
                // This button has nothing to do with this function
                $("#load_proteome").button('reset');
            }
            mayStartAnimation = false;
            visData.push(dataQueue.shift());
            updateGraph();
            setTimeout(function () { mayStartAnimation = true; }, transitionDuration);
        } else {
            setTimeout(tryUpdateGraph, transitionDuration);
        }
    }

    // Redraws the full D3 graph
    function redrawGraph() {
        // erase everything
        $("#pancore_graph").html("");

        // create the svg
        svg = d3.select("#pancore_graph")
          .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
          .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // create the tooltip
        tooltip = d3.select("#pancore_graph")
          .append("div")
            .attr("class", "tip")
            .style("position", "absolute")
            .style("z-index", "10")
            .html("test")
            .style("visibility", "hidden");

        // create the dropshadow filter
        var temp = svg.append("svg:defs")
            .append("svg:filter")
                .attr("id", "dropshadow");
        temp.append("svg:feGaussianBlur")
            .attr("in", "SourceAlpha")
            .attr("stdDeviation", 1);
        temp = temp.append("svg:feMerge");
        temp.append("svg:feMergeNode");
        temp.append("svg:feMergeNode")
            .attr("in", "SourceGraphic");

        // add the x-axis
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        // add the y-axis
        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
          .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Number of peptides");

        // add legend
        var legend = svg.selectAll(".legend")
            .data([{"name": "pan proteome", "color": panColor}, {"name": "core proteome", "color": coreColor}])
          .enter().append("g")
            .attr("class", "legend")
            .attr("transform", function (d, i) { return "translate(0," + i * 20 + ")"; });
        legend.append("rect")
            .attr("x", 30)
            .attr("width", 8)
            .attr("height", 8)
            .style("fill", function (d) { return d.color; });
        legend.append("text")
            .attr("x", 40)
            .attr("y", 4)
            .attr("dy", ".35em")
            .style("text-anchor", "start")
            .text(function (d) { return d.name; });

        // draw the lines
        svg.append("path")
            .datum(visData)
            .attr("class", "line pan")
            .attr("d", panLine);
        svg.append("path")
            .datum(visData)
            .attr("class", "line core")
            .attr("d", coreLine);

        // add gray hairlines
        svg.insert("line", ".dot")
            .attr("class", "hairline pan")
            .attr("stroke", "#cccccc")
            .attr("shape-rendering", "crispEdges")
            .style("visibility", "hidden");
        svg.insert("line", ".dot")
            .attr("class", "hairline core")
            .attr("stroke", "#cccccc")
            .attr("shape-rendering", "crispEdges")
            .style("visibility", "hidden");

        // add axis marks
        svg.insert("line")
            .attr("class", "axisline pan")
            .attr("stroke", panColor)
            .attr("stroke-width", "2")
            .attr("x1", "6")
            .attr("x2", "-6")
            .attr("shape-rendering", "crispEdges")
            .style("visibility", "hidden");
        svg.insert("line")
            .attr("class", "axisline core")
            .attr("stroke", coreColor)
            .attr("stroke-width", "2")
            .attr("x1", "6")
            .attr("x2", "-6")
            .attr("shape-rendering", "crispEdges")
            .style("visibility", "hidden");
    }

    // Updates the D3 graph
    function updateGraph() {
        // set the domains
        x.domain(visData.map(function (d) { return d.name; }));
        y.domain([0, d3.max(visData, function (d) { return d.pan; })]);

        // update the axes
        svg.select(".x.axis").transition().duration(transitionDuration).call(xAxis);
        svg.select(".y.axis").transition().duration(transitionDuration).call(yAxis);
        // rotate the x-axis labels
        svg.selectAll(".x.axis text")
            .transition()
            .duration(transitionDuration)
            .style("text-anchor", "end")
            .attr("transform", "translate(-5,0)rotate(-45)");

        // draw the dots
        var panDots = svg.selectAll(".dot.pan")
            .data(visData);
        panDots.enter().append("circle")
            .attr("class", function (d, i) { return "dot pan _" + i; })
            .attr("r", 5)
            .attr("fill", panColor)
            .attr("cx", width);
        panDots.transition()
            .duration(transitionDuration)
            .attr("cx", function (d) { return x(d.name); })
            .attr("cy", function (d) { return y(d.pan); });
        panDots.exit().remove();
        var coreDots = svg.selectAll(".dot.core")
            .data(visData);
        coreDots.enter().append("circle")
            .attr("class", function (d, i) { return "dot core _" + i; })
            .attr("r", 5)
            .attr("fill", coreColor)
            .attr("cx", width)
            .attr("cy", y(0));
        coreDots.transition()
            .duration(transitionDuration)
            .attr("cx", function (d) { return x(d.name); })
            .attr("cy", function (d) { return y(d.core); });
        coreDots.exit().remove();

        // update the lines
        if (visData.length > 0) {
            svg.select(".line.pan").datum(visData)
                .style("visibility", "visible")
                .transition()
                    .duration(transitionDuration)
                    .attr("d", panLine);
            svg.select(".line.core").datum(visData)
                .style("visibility", "visible")
                .transition()
                    .duration(transitionDuration)
                    .attr("d", coreLine);
        } else {
            svg.select(".line.pan")
                .style("visibility", "hidden");
            svg.select(".line.core")
                .style("visibility", "hidden")
        }

        // update the mouseover rects
        var mouseOverWidth = (width / visData.length) / 1.5;
        var bars = svg.selectAll(".bar")
            .data(visData);
        bars.enter().append("rect")
            .attr("class", "bar")
            .style("fill-opacity", "0")
            .attr("height", height)
            .on("mouseover", mouseOver)
            .on("mouseout", mouseOut)
            .on("mousemove", mouseMove);
        bars.transition()
            .duration(transitionDuration)
            .attr("x", function (d) { return x(d.name) - mouseOverWidth / 2; })
            .attr("width", mouseOverWidth)
            .attr("y", "0");
        bars.exit().remove();
    }

    // Mouse event functions
    function mouseOver(d, i) {
        // add dropshadow to the dot
        svg.selectAll(".dot._" + i).attr("filter", "url(#dropshadow)");

        svg.select(".hairline.core")
            .style("visibility", "visible")
            .attr("x1", x(visData[Math.max(0, i - 1)].name))
            .attr("x2", x(visData[Math.min(visData.length - 1, i + 1)].name))
            .attr("y1", y(d.core))
            .attr("y2", y(d.core));
        svg.select(".hairline.pan")
            .style("visibility", "visible")
            .attr("x1", x(visData[Math.max(0, i - 1)].name))
            .attr("x2", x(visData[Math.min(visData.length - 1, i + 1)].name))
            .attr("y1", y(d.pan))
            .attr("y2", y(d.pan));
        svg.select(".axisline.pan")
            .style("visibility", "visible")
            .attr("y1", y(d.pan))
            .attr("y2", y(d.pan));
        svg.select(".axisline.core")
            .style("visibility", "visible")
            .attr("y1", y(d.core))
            .attr("y2", y(d.core));

        // show tooltip
        tooltip
            .style("visibility", "visible")
            .html("<b>" + d.name + "</b><br/>" +
            "<span style='color: " + panColor + ";'>&#9632;</span> pan: <b>" + d3.format(",")(d.pan) + "</b><br/>" +
            "<span style='color: " + coreColor + ";'>&#9632;</span> core: <b>" + d3.format(",")(d.core) + "</b>");
    }
    function mouseOut(d, i) {
        svg.selectAll(".dot._" + i).attr("filter", "");
        svg.selectAll(".hairline").style("visibility", "hidden");
        svg.selectAll(".axisline").style("visibility", "hidden");
        tooltip.style("visibility", "hidden");
    }
    function mouseMove(d, i) {
        tooltip.style("top", (d3.event.pageY + 15) + "px").style("left", (d3.event.pageX + 15) + "px");
    }
}