async function read_barcode() {
    try {
        // Read precomputed barcodes in CSV format
        let data = await d3.csv('data/barcode.csv');

        // Convert strings to numeric data type
        for (let d of data) {
            d.birth = parseFloat(d.birth);
            d.death = parseFloat(d.death);
            d.dim = parseInt(d.dim);
        }

        // Create the SVG element that contains the persistence barcode. The barcode is created using rect elements
        let barcode_svg = d3.select('#barcode-svg');
        let barcode_rects = barcode_svg.selectAll('rect');

        let rect_width = 50 * 1.0 / data.length;
        let data_max = d3.max(data, d => d.death - d.birth);
        // data_max = 9;
        barcode_svg.attr('viewBox', '0 0 ' + data_max + ' ' + data.length * rect_width);

        barcode_rects.data(data)
            .enter()
            .append('rect')
            .attr('width', d => d.death - d.birth)
            .attr('height', rect_width * 0.95)
            .attr('x', d => d.birth)
            .attr('y', (d, i) => rect_width * i)
            .attr('class', d => 'barcode-rect-dim' + d.dim.toString())
            .classed('hover-darken', true);

        barcode_rects.exit().remove();

        let graph_data = await d3.json('data/hypergraph.json');
        console.log(graph_data);

        let color = d3.scaleOrdinal(d3.schemeCategory10);
        color.domain(graph_data.nodes.map(d => d.id));
        // console.log(graph_data.nodes[1].id);
        // console.log(color(graph_data.nodes[1].id));

        let width = 800;
        let height = 600;
        let node_radius = 4;

        // Force directed graph
        const links = graph_data.links.map(d => Object.create(d));
        const nodes = graph_data.nodes.map(d => Object.create(d));

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
            .selectAll("circle")
            .data(nodes)
            .join("circle")
            // .filter(d => {return d.bipartite === 0;})
            .attr("r", node_radius)
            .attr("fill", d => color(d.id))
            .attr('id', d => d.id);

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

        //make sure you can't drag the circle outside the box
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
            console.log(d3.event.transform.toString());
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