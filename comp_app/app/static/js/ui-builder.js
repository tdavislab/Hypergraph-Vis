const input_div_id = 'input_viz';
const output_div_id = 'output_viz';
let vertex_modality_counter = 1;
let edge_modality_counter = 1;

const graphDimensions = {
    width: 100,
    height: 50
};

function getRandomInt() {
    let min = 1000;
    let max = 9999;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toggleClass(element, classname) {
    element.classed(classname, !element.classed(classname));
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function build_node_layout(div_selector, id, title, content) {
    let header = div_selector.append('div')
        .attr('class', 'card-header');

    header.append('div')
        .attr('class', 'w-75 d-inline')
        .html(title);

    header.append('div')
        .attr('id', id + '-close-btn')
        .attr('class', 'clickable float-right d-inline fa fa-window-close')
        .on('click', function () {
            div_selector.remove();
        });

    let jq_element = $('#' + id);

    jq_element.draggable({
        containment: 'parent', stack: '.draggable',
        // snap: '.draggable', snapMode: 'outer',
        grid: [20, 20],
        start: () => {
            jq_element.addClass('selected');
        },
        stop: () => {
            jq_element.removeClass('selected');
        }
    });

    jq_element.resizable({
        helper: 'resize-transition',
        minWidth: 50,
        grid: [20, 20],
        start: () => {
            div_selector.classed('w-25', false);
        }
    });

    d3.select('#' + id).on('click', d => {
        // Do not toggle when clicking on the close button
        if (d3.event.target.id !== id + '-close-btn') {
            toggleClass(d3.select('#' + id), 'selected');
        }
    });
}

function create_data_node(parent, id, title, content) {
    /**
     * Create a data-node from given parent css-accessor string, with a given title and content
     */

    let container = d3.select(parent);
    let data_node = container.append('div')
        .attr('id', id)
        .attr('class', 'draggable card w-25');

    build_node_layout(data_node, id, title, content);
    // make_dragresizeable(id);
    // let header = data_node.append('div')
    //     .attr('class', 'card-header');
    //
    // header.append('div')
    //     .attr('class', 'w-75 d-inline')
    //     .html(title);
    //
    // header.append('div')
    //     .attr('id', id + '-close-btn')
    //     .attr('class', 'clickable float-right d-inline fa fa-window-close')
    //     .on('click', function () {
    //         data_node.remove();
    //     });
    //
    // data_node.append("div")
    //     .attr("class", "card-body")
    //     .html(content);
    //
    // let jq_element = $('#' + id);
    //
    // jq_element.draggable({
    //     containment: 'parent', stack: '.draggable',
    //     // snap: '.draggable', snapMode: 'outer',
    //     grid: [20, 20],
    //     start: () => {
    //         jq_element.addClass('selected');
    //     },
    //     stop: () => {
    //         jq_element.removeClass('selected');
    //     }
    // });
    //
    // jq_element.resizable({
    //     helper: 'resize-transition',
    //     minWidth: 50,
    //     grid: [20, 20],
    //     start: () => {
    //         data_node.classed('w-25', false);
    //     }
    // });
    // let svg = d3.select('#' + id).append('svg')
    //     .attr("id", id + "-hypergraph-svg")
    //     .attr("width", "100%")
    //     .attr('viewBox', '0 0 600 500');
    //
    // d3.json("../static/uploads/hypergraph.json").then(data => force_graph(svg, data, true));

    if (id === dataset_id) {
        import_dataset_btn(d3.select('#' + id));
    }
}

function create_line_graph(parent, id, title, content) {

    // Build the layout first
    let container = d3.select(parent);
    let data_node = container.append('div')
        .attr('id', id)
        .attr('class', 'draggable card w-25');

    build_node_layout(data_node, id, title, content);

    // Then send an AJAX request to server to compute the line-graph and display it
    $.ajax({
        type: 'POST',
        url: '/linegraph',
        data: id,
        processData: false,
        contentType: false,
        success: function (response) {
            // On success draw the hypergraph
            d3.select('#' + id).select('svg').remove();
            let svg = d3.select('#' + id).insert('svg', '.card-footer')
                .attr("id", id + "-linegraph-svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr('viewBox', '0 0 600 500');

            force_graph(svg, response.data, false);
        }
    })
}

function create_dual_line_graph(parent, id, title, content) {

    // Build the layout first
    let container = d3.select(parent);
    let data_node = container.append('div')
        .attr('id', id)
        .attr('class', 'draggable card w-25');

    build_node_layout(data_node, id, title, content);

    // Then send an AJAX request to server to compute the line-graph and display it
    $.ajax({
        type: 'POST',
        url: '/dualgraph',
        data: id,
        processData: false,
        contentType: false,
        success: function (response) {
            d3.select('#' + id).select('svg').remove();
            let svg = d3.select('#' + id).insert('svg', '.card-footer')
                .attr("id", id + "-dualinegraph-svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr('viewBox', '0 0 600 500');

            force_graph(svg, response.data, false);
        }
    })
}

function create_barcode(parent, id, title, content) {

    // Build the layout first
    let container = d3.select(parent);
    let data_node = container.append('div')
        .attr('id', id)
        .attr('class', 'draggable card w-25');

    build_node_layout(data_node, id, title, content);

    // Then send an AJAX request to server to compute the line-graph and display it
    $.ajax({
        type: 'POST',
        url: '/barcode',
        data: id,
        processData: false,
        contentType: false,
        success: function (response) {
            // On success draw the hypergraph
            d3.select('#' + id).select('svg').remove();
            let svg = d3.select('#' + id).insert('svg', '.card-footer')
                .attr("id", id + "-barcode-svg")
                .attr("width", "100%")
                .attr("height", "100%")
            // .attr('viewBox', '0 0 600 500');

            draw_barcode(svg, response.data);
        }
    })
}

function import_dataset_btn(parent) {
    // let btn_id = parent.id + '-import-btn'
    parent.append('div')
        .classed('card-footer bg-transparent', true)
        .append('input')
        .attr('id', 'import')
        .attr('type', 'button')
        .attr('form', 'import-form')
        .attr('value', 'Import dataset')
        .classed('w-100 btn btn-primary', true)
        .on('click', () => {
            $('#dataset').click();
        });
}

$('#dataset-btn').on('click', () => {
    $('#dataset-file').click();
});

$('#import-form').change(function (event) {
    // Can only send FormData object, so create an empty one
    let files = new FormData();
    // Add the file object to the FormData object created above
    files.append('file', $('#dataset-file')[0].files[0]);

    // Create an AJAX query to the backend
    // Query reads the CSV file and return JSON node-link data for drawing the hypergraph
    $.ajax({
        type: 'POST',
        url: '/dataset',
        data: files,
        processData: false,
        contentType: false,
        success: function (response) {
            // On success draw the hypergraph
            d3.select('#' + input_div_id).select('svg').remove();
            let svg = d3.select('#' + input_div_id).insert('svg', '.card-footer')
                .attr("id", input_div_id + "-hypergraph-svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr('viewBox', '0 0 600 500');
            force_graph(svg, response.data, true);
        }
    });

    $('#io-panel').removeAttr('hidden');
    $('#interface').removeClass('col-md-12').addClass('col-md-9');
});

function build_modality_layout(modality_type) {
    let modality_counter = modality_type === 'edge' ? edge_modality_counter : vertex_modality_counter
    // Create accordion element
    let modality_div = d3.select('#modality-holder').append('div')
        .attr('class', 'card');

    let modality_div_header = modality_div.append('div')
        .attr('class', 'card-header')
        .attr('id', `accordion-header-${modality_type}-${modality_counter}`)
        .append('h2')
        .classed('mb-0', true)
        .append('button')
        .attr('type', 'button')
        .attr('class', 'btn btn-link')
        .attr('data-toggle', 'collapse')
        .attr('data-target', `#accordion-body-${modality_type}-${modality_counter}`)
        .html(`${capitalizeFirstLetter(modality_type)} modality ${modality_counter}`);

    let modality_div_body = modality_div.append('div')
        .attr('id', `accordion-body-${modality_type}-${modality_counter}`)
        .attr('class', 'collapse show')
        .attr('data-parent', '#modality-holder')
        .append('div')
        .attr('class', 'card-body')
        .html('Chaku chaku');

    if (modality_type === 'edge') {
        edge_modality_counter += 1;
    } else if (modality_type === 'vertex') {
        vertex_modality_counter += 1
    }
    return modality_div;
}

$('#add-edge-modality').on('click', () => {
    // Create accordion element
    let modality_div = build_modality_layout('edge');

    $.ajax({
        type: 'POST',
        url: '/add_edge_modality',
        data: JSON.stringify({index: 1}),
        dataType: 'json',
        contentType: 'application/json',
        success: function (response) {
            console.log(response);
        }
    });
});

$('#add-vertex-modality').on('click', () => {
    // Create accordion element
    let modality_div = build_modality_layout('vertex');
});

$('#get-graph-data').on('click', () => {
    $.ajax({
        type: 'GET',
        url: '/get_graph_data',
        success: function (response) {
            console.log(response);
        },
        error: () => {
            console.log('error');
        }
    });
});

function groupPath(vertices) {
    if (vertices.length <= 2) {
        let fake_point1 = vertices[0];
        let fake_point2 = vertices[1];
        vertices.push(fake_point1, fake_point2);
    }
    return "M" + d3.polygonHull(vertices).join("L") + "Z";
}

function force_graph(svg, graph_data, hyperedges) {
    let id_suffix = svg.attr("id") + "-";

    // Force directed graph
    const links = graph_data.links.map(d => Object.create(d));
    const nodes = graph_data.nodes.map(d => Object.create(d));
    const node_radius = 8;
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    let groups = [];

    // for (let i = 0; i < links.length; i++) {
    //     if (i % 2 === 0) {
    //         links[i].distance = 100;
    //     } else {
    //         links[i].distance = 100;
    //     }
    // }

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).distance(d => d.distance).id(d => d.id))
        .force("link", d3.forceLink(links).id(d => d.id))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(500 / 2, 400 / 2));

    // let simulation = d3.forceSimulation(nodes)
    //         .force("link", d3.forceLink(links).id(d => d.id))
    //         .force("charge", d3.forceManyBody(-200))
    //         .force("center", d3.forceCenter(250, 200))
    //         .force("x", d3.forceX().strength(0.02))
    //         .force("y", d3.forceY().strength(0.02));

    const svg_g = svg.append("g");

    const link = svg_g.append("g")
        .attr("id", id_suffix + "links")
        .attr("stroke", "#000000")
        .attr("stroke-opacity", 0.4)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", d => Math.sqrt(d.value));

    const node = svg_g.append("g")
        .attr("id", id_suffix + "nodes")
        .attr("stroke", "#000000")
        .attr("stroke-width", 0.5)
        .selectAll("circle")
        .data(nodes)
        .enter()
        .append("g");

    node.append("circle")
        // .filter(d => {return d.bipartite === 1;})
        .attr("r", node_radius)
        .attr("fill", d => d["bipartite"] === 1 ? color(d.id) : "")
        .attr('stroke', d => d["bipartite"] === 1 ? "#fff" : "")
        .attr("stroke-width", d => d["bipartite"] === 1 ? 5 : 2)
        .attr("id", d => d.id);

    node.append("title")
        .text(d => d.id);

    node.append("text")
        .attr("dx", 12)
        .attr("dy", "0.35em")
        .attr("class", "node-label")
        .style("visibility", "hidden")
        .text(d => d.id);

    node.exit().remove();

    // add drag capabilities
    const drag_handler = d3.drag()
        .on("start", drag_start)
        .on("drag", drag_drag)
        .on("end", drag_end);

    //add zoom capabilities
    const zoom_handler = d3.zoom()
        .on("zoom", zoom_actions);

    drag_handler(node);
    zoom_handler(svg);

    // Drag functions
    // d is the node
    function drag_start(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    //make sure you can"t drag the circle outside the box
    function drag_drag(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function drag_end(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    //Zoom functions
    function zoom_actions() {
        svg_g.attr("transform", d3.event.transform);
    }

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            });

        if (hyperedges) {
            groups = d3.nest()
                .key(d => d.source.id)
                .rollup(d => d.map(node => [node.target.x, node.target.y]))
                .entries(links);
            d3.select('#' + id_suffix + 'hull-group').remove();

            let hulls = svg.select('g').insert('g', ':first-child')
                .attr('id', id_suffix + 'hull-group')
                .selectAll("path")
                .data(groups);

            // hulls.exit().remove();

            hulls.enter()
                .insert('path')
                .style("fill", d => color(d.key))
                .style('stroke', d => color(d.key))
                .style('stroke-width', 40)
                .style('stroke-linejoin', 'round')
                .style('opacity', 0.5)
                .attr('d', d => groupPath(d.value))

        }
    });
    return simulation;
}

function responsivefy(svg) {
    let container = d3.select(svg.node().parentNode),
        width = parseInt(svg.style("width")),
        height = parseInt(svg.style("height")),
        aspect = width / height;

    svg.attr("viewBox", "0 0 " + width + " " + height)
        .attr("perserveAspectRatio", "xMinYMid")
        .call(resize);

    d3.select(window).on("resize." + container.attr("id"), resize);

    function resize() {
        var targetWidth = parseInt(container.style("width"));
        svg.attr("width", targetWidth);
        svg.attr("height", Math.round(targetWidth / aspect));
    }
}

function draw_barcode(svg, data) {
    try {
        // Read precomputed barcodes in CSV format
        // let data = await d3.csv("data/barcode.csv");
        console.log(data)
        // Convert strings to numeric data type
        for (let d of data) {
            d.birth = parseFloat(d.birth);
            d.death = parseFloat(d.death);
            d.dim = 0;
        }

        // Create the SVG element that contains the persistence barcode. The barcode is created using rect elements
        // let barcode_svg = d3.select("#barcode-svg");
        let barcode_rects = svg.selectAll("rect");

        let barcode_width = 5;
        svg.attr("viewBox", "0 0 100 100")
        // Create the scale for length, y-coordinate of barcodes
        let x_min = 5;
        let x_max = 95;
        let rect_xscale = d3.scaleLinear().domain([0, d3.max(data.map(d => d.death))]).range([x_min, x_max]).nice();

        let barcode_yoffset = 15;
        let barcode_xoffset = 0;

        // Bind data to create the barcodes
        barcode_rects.data(data)
            .enter()
            .append("rect")
            .attr("width", d => barcode_xoffset + rect_xscale(d.death - d.birth))
            .attr("height", barcode_width * 0.95)
            .attr("x", d => rect_xscale(d.birth))
            .attr("y", (d, i) => barcode_yoffset + barcode_width * i)
            .attr("fill", "#7bc6d6")
            .attr("class", d => "barcode-rect hover-darken" + d.dim.toString())
            .classed("hover-darken", true);

        barcode_rects.exit().remove();

        let x_axis = d3.axisBottom()
            .scale(rect_xscale);

        //Append group and insert axis
        // barcode_svg.append("g")
        //     .classed("barcode-axis", true)
        // .call(x_axis);

        let slider = svg.selectAll("rect.slider")
            .data([1])
            .enter()
            .append("rect")
            .attr("width", 2)
            .attr("height", 80)
            .attr("x", 20)
            .attr("y", 5)
            .attr("class", "slider hover-darken");

        let drag = d3.drag()
            .on("drag", dragged);
        // .on("start", dragstarted)
        // .on("end", dragended);

        slider.call(drag);

        function dragged(d) {
            d3.select(this).attr("x", d.x = clamp(d3.event.x, 5, 95));
            // let destination_position = d3.event.x - d3.select(this).attr("width") / 2;
            // d3.select(this).attr("x", clamp(destination_position, 5, 90));
        }

        function dragstarted(d) {
            d3.select(this).raise();
        }

        function dragended(d) {
            d3.select(this).attr("stroke", null);
        }

    } catch (e) {
        console.log(e);
    }
}

function clamp(d, min, max) {
    return Math.min(Math.max(d, min), max);
};


