const dataset_id = 'input_data_holder'

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

function create_data_node(parent, id, title, content) {
    /**
     * Create a data-node from given parent css-accessor string, with a given title and content
     */
    let container = d3.select(parent);
    let data_node = container.append('div')
        .attr('id', id)
        .attr('class', 'draggable card w-25');

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
            data_node.classed('w-25', false);
        }
    });

    d3.select('#' + id).on('click', d => {
        toggleClass(d3.select('#' + id), 'selected');
    });

    // let svg = d3.select('#' + id).append('svg')
    //     .attr("id", id + "-hypergraph-svg")
    //     .attr("width", "100%")
    //     .attr('viewBox', '0 0 600 500');
    //
    // d3.json("../static/uploads/hypergraph.json").then(data => force_graph(svg, data, true));

    import_dataset_btn(d3.select('#' + id));
}

function import_dataset_btn(parent) {
    // let btn_id = parent.id + '-import-btn'
    // console.log(parent);
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

$('#import-form').change(function (event) {
    // Can only send FormData object, so create an empty one
    let files = new FormData();
    // Add the file object to the FormData object created above
    files.append('file', $('#dataset')[0].files[0]);

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
            // console.log(event);
            // console.log(response);
            console.log(response);
            d3.select('#' + dataset_id).select('svg').remove();
            let svg = d3.select('#' + dataset_id).insert('svg', '.card-footer')
                .attr("id", dataset_id + "-hypergraph-svg")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr('viewBox', '0 0 600 500');

            force_graph(svg, response.data, true);
        }
    });
});

d3.select('#node-input').on('click', d => create_data_node('#interface', dataset_id, 'Input', ''));
d3.select('#node-linegraph').on('click', d => create_data_node('#interface', 'test2_' + getRandomInt(), 'Line Graph', 'Content for line graph node type'));
d3.select('#node-dualgraph').on('click', d => create_data_node('#interface', 'test3_' + getRandomInt(), 'Dual Graph', 'Content for dual graph node type'));

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
        // .force("link", d3.forceLink(links).distance(d => d.distance).id(d => d.id))
        .force("link", d3.forceLink(links).id(d => d.id))
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


