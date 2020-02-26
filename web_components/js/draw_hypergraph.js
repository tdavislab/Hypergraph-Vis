async function draw_hypergraph() {
    try {
        let graph_data = await d3.json("data/hypergraph.json");

        let color = d3.scaleOrdinal(d3.schemeCategory10);
        color.domain(graph_data.nodes.map(d => d.id));

        let width = 1000;
        let height = 1000;
        let node_radius = 8;

        // Force directed graph
        const links = graph_data.links.map(d => Object.create(d));
        const nodes = graph_data.nodes.map(d => Object.create(d));
        console.log(graph_data.nodes.map(d => Object.create(d)));

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id))
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter(width / 2, height / 2));

        const hypergraph_svg = d3.select("#hypergraph-svg")
            .attr("viewBox", [0, 0, width, height]);

        const hypergraph_svg_g = hypergraph_svg.append("g");

        const link = hypergraph_svg_g.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.5)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke-width", d => Math.sqrt(d.value));

        const node = hypergraph_svg_g.append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .attr("id", "hgraph-group")
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

        node.append("text")
            .attr("dx", 12)
            .attr("dy", "0.35em")
            .attr("class", "node-label")
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
        zoom_handler(hypergraph_svg);

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
            hypergraph_svg_g.attr("transform", d3.event.transform);
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
        });

        // invalidation.then(() => simulation.stop());
    } catch (e) {
        console.log(e);
    }
}

function toggle_hgraph_labels() {
    try {
        // Set show-labels to true at beginning
        d3.select("#hgraph-labels").property("checked", true);
        d3.select("#hgraph-labels").on("change", update_labels);

        function update_labels() {
            if (d3.select("#hgraph-labels").property("checked")) {
                d3.selectAll(".node-label").attr("visibility", "visible");

            } else {
                d3.selectAll(".node-label").attr("visibility", "hidden");
            }
        }
    } catch (e) {
        console.log(e);
    }
}