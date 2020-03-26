class Hypergraph{
    constructor(hyper_data){
        this.nodes = hyper_data.nodes;
        this.links = hyper_data.links;

        console.log(this.links, this.nodes)

        this.nodes_dict = {};
        this.nodes.forEach(node=>{ this.nodes_dict[node.id] = node; })

        this.container_width = parseFloat(d3.select('#vis-hypergraph').style('width'));

        this.svg_width = this.container_width;
        this.svg_height = this.container_width*0.8;
        this.svg = d3.select("#hypergraph-svg")
            // .attr("viewBox", [0, 0, this.svg_width, this.svg_height]);
            .attr("width", this.svg_width)
            .attr("height", this.svg_height);
        this.svg_g = this.svg.append("g");

        this.links_group = this.svg_g.append("g")
            .attr("id", "hyper_links_group");
        this.nodes_group = this.svg_g.append("g")
            .attr("id", "hyper_nodes_group");

        this.draw_hypergraph();
        this.toggle_hgraph_labels();
    }

    groupPath(vertices) {
        // not draw convex hull if vertices.length <= 1
        if(vertices.length >= 2){
            if (vertices.length == 2) {
                let fake_point1 = vertices[0];
                let fake_point2 = vertices[1];
                vertices.push(fake_point1, fake_point2);
            }
            return "M" + d3.polygonHull(vertices).join("L") + "Z";
        }
    }

    draw_hypergraph(){
        let node_radius = 8;

        let simulation = d3.forceSimulation(this.nodes)
            .force("link", d3.forceLink(this.links).id(d => d.id))
            .force("charge", d3.forceManyBody(-200))
            .force("center", d3.forceCenter(this.svg_width/2, this.svg_height/2))
            .force("x", d3.forceX().strength(0.02))
            .force("y", d3.forceY().strength(0.02));

        let ng = this.nodes_group.selectAll("g").data(this.nodes);
        ng.exit().remove();
        ng = ng.enter().append("g").merge(ng);
        ng.append("circle")
            .attr("r", node_radius)
            // .attr("fill", d => d["bipartite"] === 1 ? this.colorScale(d.id) : "") // only color nodes that representing hyper-edges
            .attr("fill", d => d["bipartite"] === 1 ? d.color : "")
            // .attr("stroke", d => d["bipartite"] === 1 ? "#fff" : "")
            .attr("stroke", "lightgrey")
            .attr("stroke-width", d => d["bipartite"] === 1 ? 5 : 2)
            .attr("id", d => 'hyper-node-'+d.id);
        ng.append("text")
            .attr("dx", 12)
            .attr("dy", "0.35em")
            .attr("class", "node-label")
            .text(d => d.id);

        let lg = this.links_group.selectAll("line").data(this.links);
        lg.exit().remove();
        lg = lg.enter().append("line").merge(lg)
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.5)
            .attr("stroke-width", d => Math.sqrt(d.value));

        // add drag capabilities
        const drag_handler = d3.drag()
            .on("start", drag_start)
            .on("drag", drag_drag)
            .on("end", drag_end);

        //add zoom capabilities
        const zoom_handler = d3.zoom()
            .on("zoom", zoom_actions);

        drag_handler(ng);
        zoom_handler(this.svg);

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

        let that = this;
        //Zoom functions
        function zoom_actions() {
            that.svg_g.attr("transform", d3.event.transform);
        }

        simulation.on("tick", () => {
            lg
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            ng
                .attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                });

            let groups = d3.nest()
                .key(d => d.source.id)
                .rollup(d => d.map(node => [node.target.x, node.target.y]))
                .entries(this.links);

            d3.select("g#hull-group").remove();

            let hulls = this.svg.select("g").insert("g", ":first-child")
                .attr("id", "hull-group")
                .selectAll("path")
                .data(groups);

            // hulls.exit().remove();

            hulls.enter()
                .insert("path")
                .style("fill", d =>this.nodes_dict[d.key].color)
                .style("stroke", d => this.nodes_dict[d.key].color)
                .style("stroke-width", 40)
                .style("stroke-linejoin", "round")
                .style("opacity", 0.5)
                .attr("d", d => this.groupPath(d.value))
                .attr("id", d=> "hull"+that.createId(d.key));
        });


    }

    toggle_hgraph_labels(){
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

    createId(id){
        return id.replace(/[^a-zA-Z0-9]/g, "")
    }
}