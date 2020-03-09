class Linegraph{
    constructor(line_data){
        this.nodes = line_data.nodes;
        this.links = line_data.links;

        console.log(this.links, this.nodes);

        this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
        this.colorScale.domain(this.nodes.map(d => d.id));

        this.svg_width = 1000;
        this.svg_height = 1000;
        
        this.svg = d3.select("#linegraph-svg")
            .attr("viewBox", [0, 0, this.svg_width, this.svg_height]);
        this.svg_g = this.svg.append("g");

        this.links_group = this.svg_g.append("g")
            .attr("id", "line_links_group");
        this.nodes_group = this.svg_g.append("g")
            .attr("id", "line_nodes_group");

        this.edge_scale = d3.scaleLinear()
            .domain(d3.extent(this.links.map(d => parseFloat(d.intersection_size))))
            .range([1, 10]);

        this.connected_components = [];
        this.nodes.forEach(n=>{
            this.connected_components.push([this.createId(n.id)]);
        })
        console.log(this.connected_components)

        this.draw_linegraph();

    }

    draw_linegraph(){
        let node_radius = 8;

        for (let i=0; i < this.links.length; i++) {
            this.links[i].distance = 100
        }

        console.log(this.links)

        this.simulation = d3.forceSimulation(this.nodes)
            .force("link", d3.forceLink(this.links).distance(d => d.distance).id(d => d.id))
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter(this.svg_width/2, this.svg_height/2));

        let ng = this.nodes_group.selectAll("g").data(this.nodes);
        ng.exit().remove();
        ng = ng.enter().append("g").merge(ng);
        ng.append("circle")
            .attr("r", node_radius)
            .attr("stroke", "#fff")
            .attr("stroke-width", 4)
            .attr("fill", d => this.colorScale(d.id))
            .attr("id", d => "linegraph-"+this.createId(d.id));
        
        let lg = this.links_group.selectAll("line").data(this.links);
        lg.exit().remove();
        lg = lg.enter().append("line").merge(lg)
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.5)
            .attr("stroke-width", d => this.edge_scale(parseFloat(d.intersection_size)))
            .attr("id", d => "line-edge-"+this.createId(d.source.id)+"-"+this.createId(d.target.id));

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
            if (!d3.event.active) this.simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        //make sure you can"t drag the circle outside the box
        function drag_drag(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        }

        function drag_end(d) {
            if (!d3.event.active) this.simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        let that = this;
        //Zoom functions
        function zoom_actions() {
            that.svg_g.attr("transform", d3.event.transform);
        }

        this.simulation.on("tick", () => {
            lg
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            ng
                .attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                });
        });
        
    }

    graph_contraction(bars){
        console.log(bars)
        // initialize connected components
        this.connected_components = [];
        this.nodes.forEach(n=>{
            this.connected_components.push([this.createId(n.id)]);
        })
        for(let i=0; i<bars.length; i++){
            // combine two connected components
            let source_cc_idx = this.find_cc_idx(bars[i].edge.source);
            let target_cc_idx = this.find_cc_idx(bars[i].edge.target);
            this.combine_two_cc(source_cc_idx, target_cc_idx);
        }
        console.log(this.connected_components)
        // reduce the distances of edges within each connected component
        this.links.forEach(link=>{
            let source_cc_idx = this.find_cc_idx(link.source.id);
            let target_cc_idx = this.find_cc_idx(link.target.id);
            if(source_cc_idx === target_cc_idx){
                link.distance = 10;
            } else {
                link.distance = 100;
            }
        })
        this.simulation.force("link", d3.forceLink(this.links).distance(d => d.distance).id(d => d.id));
        this.simulation.alpha(1).restart();
    }

    find_cc_idx(vertex_id){
        // find the corresponding connected components of the given vertex
        for(let i=0; i<this.connected_components.length; i++){
            let cc = this.connected_components[i];
            if(cc.indexOf(this.createId(vertex_id))!=-1){
                return i;
            }
        }
    }

    combine_two_cc(cc_idx_1, cc_idx_2){
        let cc_1 = this.connected_components[cc_idx_1].slice(0);
        let cc_2 = this.connected_components[cc_idx_2].slice(0);
        let cc_union = cc_1.concat(cc_2);
        let connected_components_new = [];
        for(let i=0; i<this.connected_components.length; i++){
            if(i != cc_idx_1 && i != cc_idx_2){
                connected_components_new.push(this.connected_components[i]);
            }
        }
        connected_components_new.push(cc_union);
        this.connected_components = connected_components_new;
    }

    createId(id){
        return id.replace(/[^a-zA-Z0-9]/g, "")
    }
}