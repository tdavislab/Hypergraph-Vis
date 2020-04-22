class Hypergraph{
    constructor(hyper_data, svg_id, original_hgraph=undefined){
        this.nodes = hyper_data.nodes;
        this.links = hyper_data.links;
        this.svg_id = svg_id;
        this.original_hgraph = original_hgraph;

        console.log(this.links, this.nodes)

        this.nodes_dict = {};
        this.nodes.forEach(node=>{ this.nodes_dict[node.id] = node; })

        this.container_width = parseFloat(d3.select('#vis-'+svg_id).style('width'));

        this.svg_width = this.container_width;
        this.svg_height = this.container_width*0.8;
        this.svg = d3.select("#"+svg_id+"-svg")
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
        let singleton_type = d3.select('input[name="singleton-type"]:checked').node().value;

        let simulation = d3.forceSimulation(this.nodes)
            .force("link", d3.forceLink(this.links).id(d => d.id))
            .force("charge", d3.forceManyBody(-200))
            .force("center", d3.forceCenter(this.svg_width/2, this.svg_height/2))
            .force("x", d3.forceX().strength(0.02))
            .force("y", d3.forceY().strength(0.02))
            .stop();
        simulation.tick(300);

        let ng = this.nodes_group.selectAll("g").data(this.nodes);
        ng.exit().remove();
        ng = ng.enter().append("g").merge(ng);
        ng.attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        })
        .classed("filtering", d=>{
            if(singleton_type === "filtering" && d.if_singleton){
                return true;
            } else { return false; }
        })
        ng.append("circle")
            .attr("r", node_radius)
            .attr("fill", d => d["bipartite"] === 1 ? d.color : "")
            .attr("id", d => this.svg_id+'-node-'+d.id.replace(/[|]/g,""))
            .attr("class", d => d["bipartite"] === 1 ? "hyper_node" : "vertex_node")
            .classed("grey_out", d=>{
                if(singleton_type === "grey_out" && d.if_singleton){
                    return true;
                } else { return false; }
            })
        ng.append("text")
            .attr("dx", 12)
            .attr("dy", "0.35em")
            .attr("class", "node-label")
            .attr("id", d => this.svg_id+'-text-'+d.id.replace(/[|]/g,""))
            .text(d => d.label);

        let lg = this.links_group.selectAll("line").data(this.links);
        lg.exit().remove();
        lg = lg.enter().append("line").merge(lg)
            .attr("stroke-width", d => Math.sqrt(d.value))
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)
            .attr("class", "hyper_edge")
            .classed("filtering", d=>{
                if(singleton_type === "filtering" && (d.source.if_singleton || d.target.if_singleton)){
                    return true;
                } else { return false;}
            })
            
        let groups = d3.nest()
            .key(d => d.source.id)
            .rollup(d => d.map(node => [node.target.x, node.target.y]))
            .entries(this.links);

        this.svg.select("g#hull-group").remove();

        let hulls = this.svg.select("g").insert("g", ":first-child")
            .attr("id", "hull-group")
            .selectAll("path")
            .data(groups);
        
        hulls.enter()
            .insert("path")
            .attr("fill", d=> this.nodes_dict[d.key].color )
            .attr("stroke", d => this.nodes_dict[d.key].color)
            .attr("d", d => this.groupPath(d.value))
            .attr("id", d => this.svg_id+"-hull-"+d.key.replace(/[|]/g,""))
            .attr("class", "convex_hull")
            .classed("grey_out", d=>{
                if(singleton_type === "grey_out" && this.nodes_dict[d.key].if_singleton){
                    return true;
                } else { return false; }
            })
            .classed("filtering", d=>{
                if(singleton_type === "filtering" && this.nodes_dict[d.key].if_singleton){
                    return true;
                } else { return false; }
            })
            .on("mouseover", d => {
                if(!this.click_id && this.original_hgraph){
                    d3.select("#"+this.svg_id+"-hull-"+d.key.replace(/[|]/g,"")).classed("highlighted", true);
                    let label_list = this.nodes_dict[d.key].label.split("|")
                    let div_text = '';
                    label_list.forEach(label=>{ div_text += label+"<br> "; })
                    let div = d3.select("#help-tip")
                    div.transition().duration(200).style("opacity", 0.9);
                    div.html("<h6>Selected Hyperedges</h6>"+div_text);
                }
            })
            .on("mouseout",d => {
                if(!this.click_id && this.original_hgraph){
                    d3.select("#"+this.svg_id+"-hull-"+d.key.replace(/[|]/g,"")).classed("highlighted", false);
                    d3.select("#help-tip").transition().duration(200).style("opacity", 0);
                } 
            })
            .on("click", d => {
                if(this.original_hgraph ){
                    if(this.click_id != d.key){
                        this.click_id = d.key;
                        let he_list = d.key.split("|");
                        if(he_list.length > 1){ he_list.pop(); }
                        d3.select("#"+this.original_hgraph.svg_id+"-svg").selectAll("path").classed("faded", true);
                        d3.select("#"+this.original_hgraph.svg_id+"-svg").selectAll("circle").classed("faded", true);
                        d3.select("#"+this.original_hgraph.svg_id+"-svg").selectAll("text").classed("faded", true);
                        d3.select("#"+this.svg_id+"-svg").selectAll("path").classed("faded", true);
                        d3.select("#"+this.svg_id+"-svg").selectAll("circle").classed("faded", true);
                        d3.select("#"+this.svg_id+"-svg").selectAll("text").classed("faded", true);
                        d3.select("#linegraph-svg").selectAll("circle").classed("faded", true);
                        d3.select("#simplified-linegraph-svg").selectAll("circle").classed("faded", true);
                        d3.select("#linegraph-svg").selectAll("line").classed("faded", true);
                        d3.select("#simplified-linegraph-svg").selectAll("line").classed("faded", true);
                        he_list.forEach(he=>{
                            d3.select("#"+this.original_hgraph.svg_id+"-hull-"+he).classed("faded", false);
                            d3.select("#"+this.original_hgraph.svg_id+"-node-"+he).classed("faded", false);
                            d3.select("#"+this.original_hgraph.svg_id+"-text-"+he).classed("faded", false);
                            this.original_hgraph.links.forEach(link=>{
                                if(link.source.id === he){
                                    d3.select("#"+this.original_hgraph.svg_id+"-node-"+link.target.id.replace(/[|]/g,"")).classed("faded", false);
                                }
                            })
                            d3.select("#linegraph-node-"+he).classed("faded", false);
                            d3.select("#simplified-linegraph-node-"+he).classed("faded", false);
                        })
                        for(let i=0; i<he_list.length; i++){
                            for(let j=i+1; j<he_list.length; j++){
                                d3.select("#linegraph-edge-"+he_list[i]+"-"+he_list[j]).classed("faded", false);
                                d3.select("#linegraph-edge-"+he_list[j]+"-"+he_list[i]).classed("faded", false);
                                d3.select("#simplified-linegraph-edge-"+he_list[i]+"-"+he_list[j]).classed("faded", false);
                                d3.select("#simplified-linegraph-edge-"+he_list[j]+"-"+he_list[i]).classed("faded", false);
                            }
                        }
                        d3.select("#"+this.svg_id+"-hull-"+d.key.replace(/[|]/g,"")).classed("faded", false);
                        d3.select("#"+this.svg_id+"-hull-"+d.key.replace(/[|]/g,"")).classed("highlighted", false);
                        d3.select("#"+this.svg_id+"-node-"+d.key.replace(/[|]/g,"")).classed("faded", false);
                        d3.select("#"+this.svg_id+"-text-"+d.key.replace(/[|]/g,"")).classed("faded", false);
                        this.links.forEach(link=>{
                            if(link.source.id === d.key){
                                d3.select("#"+this.svg_id+"-node-"+link.target.id.replace(/[|]/g,"")).classed("faded", false);
                            }
                        })
                    } else {
                        this.click_id = undefined;
                        this.cancel_faded();
                        d3.select("#linegraph-svg").selectAll("circle").classed("faded", false);
                        d3.select("#simplified-linegraph-svg").selectAll("circle").classed("faded", false);
                        d3.select("#linegraph-svg").selectAll("line").classed("faded", false);
                        d3.select("#simplified-linegraph-svg").selectAll("line").classed("faded", false);
                    }        
                }
            });
            
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
    }

    cancel_faded(){
        if(this.original_hgraph){
            d3.select("#"+this.original_hgraph.svg_id+"-svg").selectAll("path").classed("faded", false);
            d3.select("#"+this.original_hgraph.svg_id+"-svg").selectAll("circle").classed("faded", false);
            d3.select("#"+this.original_hgraph.svg_id+"-svg").selectAll("text").classed("faded", false);
        }
        d3.select("#"+this.svg_id+"-svg").selectAll("path").classed("faded", false);
        d3.select("#"+this.svg_id+"-svg").selectAll("circle").classed("faded", false);
        d3.select("#"+this.svg_id+"-svg").selectAll("text").classed("faded", false);
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
}