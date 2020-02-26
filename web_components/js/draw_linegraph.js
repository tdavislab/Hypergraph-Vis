async function draw_linegraph() {
    try {
        let graph_data = await d3.json("data/linegraph.json");

        let color = d3.scaleOrdinal(d3.schemeCategory10);
        color.domain(graph_data.nodes.map(d => d.id));

        let width = 1000;
        let height = 1000;
        let node_radius = 8;

        // Force directed graph
        const links = graph_data.links.map(d => Object.create(d));
        const nodes = graph_data.nodes.map(d => Object.create(d));

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id))
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter(width / 2, height / 2));

        const hypergraph_svg = d3.select("#linegraph-svg")
            .attr("viewBox", [0, 0, width, height]);

        const hypergraph_svg_g = hypergraph_svg.append("g");

        let edge_scale = d3.scaleLinear().domain(d3.extent(links.map(d => d.intersection_size))).range([1, 10]);

        const link = hypergraph_svg_g.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.5)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke-width", d => edge_scale(d.intersection_size));

        const node = hypergraph_svg_g.append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 4)
            .selectAll("circle")
            .data(nodes)
            .join("circle")
            // .filter(d => {return d.bipartite === 0;})
            .attr("r", node_radius)
            .attr("fill", d => color(d.id))
            .attr("id", d => d.id);

        node.append("title")
            .text(d => d.id);

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
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        });

        // invalidation.then(() => simulation.stop());
    } catch (e) {
        console.log(e);
    }
}