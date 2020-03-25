class Simplified_Hypergraph{
    constructor(){
        this.container_width = parseFloat(d3.select('#vis-simplified-hypergraph').style('width'));

        this.svg_width = this.container_width;
        this.svg_height = this.container_width*0.8;
        this.svg = d3.select("#simplified-hypergraph-svg")
            .attr("width", this.svg_width)
            .attr("height", this.svg_height);
        this.svg_g = this.svg.append("g");

        this.links_group = this.svg_g.append("g")
            .attr("id", "shyper_links_group");
        this.nodes_group = this.svg_g.append("g")
            .attr("id", "shyper_nodes_group");

    }

    construnct_bipartite_graph(hyperedges){
        console.log(hyperedges)
        let vertices_dict = {};
        let hyper_nodes = [];

        let hyper_edges = [];
        // let vertices_id_list = [];
        hyperedges.forEach(hv=>{
            let node_hv = {};
            node_hv.bipartite = 1;
            node_hv.id = hv.id;
            hyper_nodes.push(node_hv);
            hv.vertices.forEach(v=>{
                let node_v = {};
                node_v.bipartite = 0;
                node_v.id = v;
                if(Object.keys(vertices_dict).indexOf(this.createId(v))===-1){
                    vertices_dict[this.createId(v)] = node_v;
                }
                hyper_edges.push({"source": node_hv.id, "target": v});
            })
        })
        for(let vId in vertices_dict){
            hyper_nodes.push(vertices_dict[vId]);
        }
        for(let i=0; i<hyper_nodes.length; i++){
            hyper_nodes[i].index = i;
        }
        for(let i=0; i<hyper_edges.length; i++){
            hyper_edges[i].index = i;
        }
        console.log(vertices_dict)

        console.log(hyper_nodes)
        console.log(hyper_edges)
        this.nodes = hyper_nodes;
        this.links = hyper_edges;
        this.draw_hypergraph();
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
        this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
        this.colorScale.domain(this.nodes.map(d => d.id));

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
            .attr("fill", d => d["bipartite"] === 1 ? this.colorScale(d.id) : "") // only color nodes that representing hyper-edges
            // .attr("stroke", d => d["bipartite"] === 1 ? "#fff" : "")
            .attr("stroke", "lightgrey")
            .attr("stroke-width", d => d["bipartite"] === 1 ? 5 : 2)
            .attr("id", d => 'shyper-node-'+d.id);
        // ng.append("text")
        //     .attr("dx", 12)
        //     .attr("dy", "0.35em")
        //     .attr("class", "node-label")
        //     .text(d=>d.id);

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

            d3.select("g#simplified-hull-group").remove();

            let hulls = this.svg.select("g").insert("g", ":first-child")
                .attr("id", "simplified-hull-group")
                .selectAll("path")
                .data(groups);

            // hulls.exit().remove();

            hulls.enter()
                .insert("path")
                .style("fill", d => this.colorScale(d.key))
                .style("stroke", d => this.colorScale   (d.key))
                .style("stroke-width", 40)
                .style("stroke-linejoin", "round")
                .style("opacity", 0.5)
                // .style("visibility","hidden")
                .attr("d", d => this.groupPath(d.value))
        });
    
    }

    createId(id){
        return id.replace(/[^a-zA-Z0-9]/g, "")
    }


}