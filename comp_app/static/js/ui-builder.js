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

function detectCollision(player, obstacles) {
    /**
     * Detect collsion between player rectangle and obstacle list of rectangles, all rectangle should be of type
     * DOMRect (output of `getBoundingClientRect()`)
     */

}

function create_data_node(parent, id, title, content) {
    /**
     * Create a data-node from given parent css-accessor string, with a given title and content
     */
    let container = d3.select(parent);
    let data_node = container.append('div')
        .attr('id', id)
        .attr('class', 'draggable card w-25 h-25');

    let header = data_node.append('div')
        .attr('class', 'card-header');

    header.append('div')
        .attr('class', 'w-75 d-inline')
        .html(title);

    // header.append('div')
    //     .attr('class', 'w-25 d-inline fa fa-plus-square');

    // data_node.append("div")
    //     .attr("class", "card-body")
    //     .html(content);

    let jq_element = $('#' + id);

    jq_element.draggable({
        containment: 'parent', stack: '.draggable',
        snap: '.draggable', snapMode: 'outer',
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
            data_node.classed('w-25', false);
            data_node.classed('h-25', false);
        }
    });

    d3.select('#' + id).on('click', d => {
        console.log(d3.select(d3.event.target));
        toggleClass(d3.select('#' + id), 'selected');
    });

    let svg = d3.select('#' + id).append('svg')
        .attr("id", id + "-hypergraph-svg")
        .attr("width", "100%")
        // .attr("height", graphDimensions.height)
        .attr('viewBox', '0 0 600 500');

    d3.json("../static/uploads/hypergraph.json").then(data => force_graph(svg, data, true));
    import_dataset_btn(d3.select('#' + id));
}

function draw_hypergraph(selector, data) {

}

function import_dataset_btn(parent) {
    let btn_id = parent.id + '-import-btn'
    parent.append('button')
        .classed('btn btn-primary', true)
        .html('Import dataset');
}

d3.select('#node-input').on('click', d => create_data_node('#interface', 'test1_' + getRandomInt(), 'Input', ''));
d3.select('#node-linegraph').on('click', d => create_data_node('#interface', 'test2_' + getRandomInt(), 'Line Graph', 'Content for line graph node type'));
d3.select('#node-dualgraph').on('click', d => create_data_node('#interface', 'test3_' + getRandomInt(), 'Dual Graph', 'Content for dual graph node type'));

//
// function draw_linegraph(data) {
//     // Create a SVG in linegraph div
//     const svg = d3.select("#linegraph").append("svg")
//         .attr("id", "linegraph-svg")
//         .attr("width", graphDimensions.width)
//         .attr("height", graphDimensions.height)
//         .call(responsivefy);
//
//     let linegraph_simulation = force_graph(svg, data, false);
// }
//
// function draw_barcode(data) {
//     // Create a SVG for the barcode
//     const svg = d3.select("#barcode")
//         .append("svg")
//         .attr("id", "barcode-svg")
//         .attr("height", "500")
//         .call(responsivefy);
//
//     bar_chart(svg, data.barcode)
// // }
//
// function bar_chart(barcode_svg, data) {
//     let barcode_width = 25;
//     let slider_width = 10;
//     let barcode_yoffset = 15;
//     let barcode_xoffset = 0;
//
//
//     let container = d3.select(barcode_svg.node().parentNode),
//         width = parseInt(barcode_svg.style("width")),
//         height = parseInt(barcode_svg.style("height"));
//
//     // Create the SVG element that contains the persistence barcode. The barcode is created using rect elements
//     let barcode_rects = barcode_svg.selectAll("rect");
//
//     // Create the scale for length, y-coordinate of barcodes
//     let x_min = 0;
//     let x_max = width - 5;
//     let rect_xscale = d3.scaleLinear().domain([0, d3.max(data.map(d => d.death))]).range([x_min, x_max]).nice();
//
//     // Bind data to create the barcodes
//     barcode_rects.data(data)
//         .enter()
//         .append("rect")
//         .attr("width", d => barcode_xoffset + rect_xscale(d.death - d.birth))
//         .attr("height", barcode_width * 0.90)
//         .attr("x", d => rect_xscale(d.birth))
//         .attr("y", (d, i) => barcode_yoffset + barcode_width * i)
//         .attr("fill", "#1f77b4")
//         .classed("hover-darken", true);
//
//     barcode_rects.exit().remove();
//
//     let x_axis = d3.axisBottom()
//         .scale(rect_xscale);
//
//     //Append group and insert axis
//     // barcode_svg.append("g")
//     //     .classed("barcode-axis", true)
//     // .call(x_axis);
//
//     let slider = barcode_svg.selectAll("rect.slider")
//         .data([1])
//         .enter()
//         .append("rect")
//         .attr("width", slider_width)
//         .attr("height", barcode_width * data.length)
//         .attr("x", 20)
//         .attr("y", 5)
//         .attr("class", "slider hover-darken");
//
//     let drag = d3.drag()
//         .on("drag", dragged);
//     // .on("start", dragstarted)
//     // .on("end", dragended);
//
//     slider.call(drag);
//
//     function dragged(d) {
//         d3.select(this).attr("x", d.x = clamp(d3.event.x, 0, width));
//         // let destination_position = d3.event.x - d3.select(this).attr("width") / 2;
//         // d3.select(this).attr("x", clamp(destination_position, 5, 90));
//     }
//
//     function dragstarted(d) {
//         d3.select(this).raise();
//     }
//
//     function dragended(d) {
//         d3.select(this).attr("stroke", null);
//     }
// }

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
    console.log(id_suffix);

    // Force directed graph
    const links = graph_data.links.map(d => Object.create(d));
    const nodes = graph_data.nodes.map(d => Object.create(d));
    const node_radius = 8;
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    let groups = [];

    for (let i = 0; i < links.length; i++) {
        if (i % 2 === 0) {
            links[i].distance = 50;
        } else {
            links[i].distance = 50;
        }
    }

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).distance(d => d.distance).id(d => d.id))
        // .force("link", d3.forceLink(links).id(d => d.id))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(500 / 2, 400 / 2));

    const svg_g = svg.append("g");

    const link = svg_g.append("g")
        .attr("id", id_suffix + "links")
        .attr("stroke", "#000000")
        .attr("stroke-opacity", 0.1)
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

function clamp(d, min, max) {
    return Math.min(Math.max(d, min), max);
};


