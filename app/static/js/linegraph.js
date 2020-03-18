class Linegraph{
    constructor(line_data, simplified_hypergraph, id){
        this.nodes = [...line_data.nodes];
        this.links = [...line_data.links];
        this.simplified_hypergraph = simplified_hypergraph;

        this.nodes_dict = {};
        this.nodes.forEach(n=>{
            this.nodes_dict[this.createId(n.id)] = n;
        })

        this.links_dict = {};
        this.links.forEach(l=>{
            this.links_dict[this.createId(l.source)+"-"+this.createId(l.target)] = l;
        })
        console.log(this.nodes_dict, this.links_dict)

        console.log(this.links, this.nodes);

        this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
        this.colorScale.domain(this.nodes.map(d => d.id));

        this.container_width = parseFloat(d3.select('#vis-'+id).style('width'))

        this.svg_width = this.container_width;
        this.svg_height = this.container_width*0.8;
        
        this.svg = d3.select("#"+id+"-svg")
            // .attr("viewBox", [0, 0, this.svg_width, this.svg_height]);
            .attr("width", this.svg_width)
            .attr("height", this.svg_height);
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

        this.threshold = 0;

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
            // .force("x", d3.forceX().strength(0.01))
            // .force("y", d3.forceY().strength(0.01));

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

    assign_nodes_sets(bars){
        // This function assigns 1) a connected components list 2) the nodes subsets u, v to the edge corresponding to each bar in the barcode

        // initialize connected components
        this.connected_components = [];
        this.nodes.forEach(n=>{
            this.connected_components.push([this.createId(n.id)]);
        })

        for(let i=0; i<bars.length-1; i++){
            // combine two connected components
            let source_cc_idx = this.find_cc_idx(bars[i].edge.source, this.connected_components);
            let target_cc_idx = this.find_cc_idx(bars[i].edge.target, this.connected_components);
            let source_cc = this.connected_components[source_cc_idx].slice(0);
            let target_cc = this.connected_components[target_cc_idx].slice(0);
            this.combine_two_cc(source_cc_idx, target_cc_idx); 
            let edge_id = this.createId(bars[i].edge.source)+"-"+this.createId(bars[i].edge.target);
            this.links_dict[edge_id].nodes_subsets = {"source_cc":source_cc, "target_cc":target_cc};
            this.links_dict[edge_id].cc_list = [];
            this.connected_components.forEach(cc=>{
                this.links_dict[edge_id].cc_list.push(cc.slice(0));
            })
        }
        console.log(this.links)


    }

    graph_contraction(edgeid){
        let cc_list;

        if(edgeid){
            console.log(this.links_dict[edgeid])
            cc_list = this.links_dict[edgeid].cc_list;
            console.log(cc_list)
            this.links.forEach(link=>{
                let source_cc_idx = this.find_cc_idx(link.source.id, cc_list);
                let target_cc_idx = this.find_cc_idx(link.target.id, cc_list);
                if(source_cc_idx === target_cc_idx){
                    link.distance = 10;
                } else {
                    link.distance = 100;
                }

            })

        } else {
            cc_list = [];
            this.nodes.forEach(n=>{
                cc_list.push([this.createId(n.id)]);
            })
            this.links.forEach(link=>{
                link.distance = 100;
            })
        }
        this.simulation.force("link", d3.forceLink(this.links).distance(d => d.distance).id(d => d.id));
        this.simulation.alpha(1).restart();
        this.compute_simplified_hypergraph(cc_list);


    }

    graph_expansion(bar){
        let edge_id = this.createId(bar.edge.source)+"-"+this.createId(bar.edge.target);
        let persistence = bar.death - bar.birth;
        let source_cc = this.links_dict[edge_id].nodes_subsets.source_cc;
        let target_cc = this.links_dict[edge_id].nodes_subsets.target_cc;
        console.log(source_cc, target_cc)
        source_cc.forEach(snode=>{
            target_cc.forEach(tnode=>{
                let eid1 = this.createId(snode)+"-"+this.createId(tnode);
                if(Object.keys(this.links_dict).indexOf(eid1)!=-1){
                    this.links_dict[eid1].distance = 150;
                }
                let eid2 = this.createId(tnode)+"-"+this.createId(snode);
                if(Object.keys(this.links_dict).indexOf(eid2)!=-1){
                    this.links_dict[eid2].distance = 150;
                }
            })
        })
        this.simulation.force("link", d3.forceLink(this.links).distance(d => d.distance).id(d => d.id));
        this.simulation.alpha(1).restart();

        // for hyper-graph: split the corresponding hyperedge into two subsets u and v
        if(persistence<this.threshold){
            for(let i=0; i<this.simplified_hypergraph.hyperedges.length; i++){
                let hedge = this.simplified_hypergraph.hyperedges[i];
                if(hedge.cc.indexOf(source_cc[0])!=-1){
                    this.simplified_hypergraph.hyperedges.splice(i,1);
                    let source_node = {};
                    source_node.vertices = [];
                    source_node.id = "";
                    source_node.index = this.simplified_hypergraph.length;
                    source_node.cc = source_cc;
                    source_cc.forEach(nId=>{
                        let node = this.nodes_dict[nId];
                        node.vertices.forEach(v=>{
                            if(source_node.vertices.indexOf(v)===-1){
                                source_node.vertices.push(v);
                            }
                        })
                        source_node.id += node.id;
                    })
                    this.simplified_hypergraph.hyperedges.push(source_node);

                    let remaining_cc = [];
                    hedge.cc.forEach(nId=>{
                        if(source_cc.indexOf(nId)===-1){
                            remaining_cc.push(nId);
                        }
                    })

                    let target_node = {};
                    target_node.vertices = [];
                    target_node.id = "";
                    target_node.index = this.simplified_hypergraph.length;
                    target_node.cc = remaining_cc;
                    remaining_cc.forEach(nId=>{
                        let node = this.nodes_dict[nId];
                        node.vertices.forEach(v=>{
                            if(target_node.vertices.indexOf(v)===-1){
                                target_node.vertices.push(v);
                            }
                        })
                        target_node.id += node.id;
                    })
                    this.simplified_hypergraph.hyperedges.push(target_node);
                    break;
                }
            }
            this.simplified_hypergraph.construnct_bipartite_graph(this.simplified_hypergraph.hyperedges);
        }
    }

    compute_simplified_hypergraph(cc_list){
        let nodes_new = [];
        // merge nodes
        for(let i=0; i<cc_list.length; i++){
            let cc = cc_list[i];
            // each connected component is corresponding to a new node (hyper-edge)
            let node_new = {};
            node_new.vertices = [];
            node_new.id = ""; // **** TODO: might need a better way to assign id
            node_new.index = i;
            node_new.cc = cc;
            cc.forEach(nId =>{
                let node = this.nodes_dict[nId];
                node.vertices.forEach(v=>{ 
                    if(node_new.vertices.indexOf(v)===-1){
                        node_new.vertices.push(v);
                    }
                })
                node_new.id += node.id;
            })
            nodes_new.push(node_new);
        }
        this.simplified_hypergraph.hyperedges = nodes_new;
        this.simplified_hypergraph.construnct_bipartite_graph(nodes_new);
    }

    find_cc_idx(vertex_id, connected_components){
        // find the corresponding connected components of the given vertex
        for(let i=0; i<connected_components.length; i++){
            let cc = connected_components[i];
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