class Linegraph{
    constructor(line_data, simplified_hypergraph, svg_id){
        this.nodes = [...line_data.nodes];
        this.links = [...line_data.links];
        this.simplified_hypergraph = simplified_hypergraph;
        this.svg_id = svg_id
        console.log(this.nodes, this.links)

        this.nodes_dict = {};
        this.nodes.forEach(n=>{
            this.nodes_dict[n.id] = n;
        })

        this.links_dict = {};
        this.links.forEach(l=>{
            this.links_dict[l.source+"-"+l.target] = l;
        })
        console.log(this.nodes_dict, this.links_dict)

        // console.log(this.links, this.nodes);

        this.container_width = parseFloat(d3.select('#vis-'+svg_id).style('width'))

        this.svg_width = this.container_width;
        this.svg_height = this.container_width*0.8;
        
        this.svg = d3.select("#"+svg_id+"-svg")
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

        this.threshold = 0;

        this.draw_linegraph();
    }

    draw_linegraph(){
        let node_radius = 8;

        for (let i=0; i < this.links.length; i++) {
            this.links[i].distance = 100
        }

        this.simulation = d3.forceSimulation(this.nodes)
            .force("link", d3.forceLink(this.links).distance(d => d.distance).id(d => d.id))
            .force("charge", d3.forceManyBody(-200))
            .force("center", d3.forceCenter(this.svg_width/2, this.svg_height/2))
            .force("x", d3.forceX().strength(0.02))
            .force("y", d3.forceY().strength(0.02))
            .stop();
        this.simulation.tick(300);

        let ng = this.nodes_group.selectAll("g").data(this.nodes);
        ng.exit().remove();
        ng = ng.enter().append("g").merge(ng);
        ng.append("circle")
            .attr("r", node_radius)
            .attr("fill", d => d.color)
            .attr("id", d => this.svg_id+"-node-"+d.id)
            .attr("class", "line_node")
            .attr("cx", d=>d.x)
            .attr("cy",d=>d.y);
        
        let lg = this.links_group.selectAll("line").data(this.links);
        lg.exit().remove();
        lg = lg.enter().append("line").merge(lg)

            .attr("stroke-width", d => this.edge_scale(parseFloat(d.intersection_size)))
            .attr("id", d => this.svg_id+"-edge-"+d.source.id+"-"+d.target.id)
            .attr("class", "line_edge")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

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
        let that = this;
        function drag_start(d) {
            if (!d3.event.active) that.simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        //make sure you can"t drag the circle outside the box
        function drag_drag(d) {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        }

        function drag_end(d) {
            if (!d3.event.active) that.simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        //Zoom functions
        function zoom_actions() {
            that.svg_g.attr("transform", d3.event.transform);
        }

        // this.simulation.on("tick", () => {
        //     lg
        //         .attr("x1", d => d.source.x)
        //         .attr("y1", d => d.source.y)
        //         .attr("x2", d => d.target.x)
        //         .attr("y2", d => d.target.y);

        //     ng
        //         .attr("transform", function (d) {
        //             return "translate(" + d.x + "," + d.y + ")";
        //         });
        // });
        
    }

    graph_contraction(edgeid){
        let cc_list;

        if(edgeid){
            cc_list = this.links_dict[edgeid].cc_list;
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
                cc_list.push([n.id]);
            })
            this.links.forEach(link=>{
                link.distance = 100;
            })
        }
        this.simulation.force("link", d3.forceLink(this.links).distance(d => d.distance).id(d => d.id));
        this.simulation.alpha(1).restart();
        this.simulation.tick(300);
        this.nodes_group.selectAll("circle")
            .attr("cx", d=>d.x)
            .attr("cy", d=>d.y)
        this.links_group.selectAll("line")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);


        let cc_dict = {}
        cc_list.forEach(cc=>{
            let cc_id = "";
            let vertices = [];
            cc.forEach(nId=>{
                cc_id += nId + "|";
                vertices = vertices.concat(this.nodes_dict[nId].vertices)
            })
            vertices = [...new Set(vertices)];
            cc_dict[cc_id] = vertices;
        })
        return cc_dict;


    }

    graph_expansion(bar){
        let edge_id = bar.edge.source+"-"+bar.edge.target;
        console.log(edge_id)
        let persistence = bar.death - bar.birth;
        let source_cc = this.links_dict[edge_id].nodes_subsets.source_cc;
        let target_cc = this.links_dict[edge_id].nodes_subsets.target_cc;
        console.log(source_cc, target_cc)
        source_cc.forEach(snode=>{
            target_cc.forEach(tnode=>{
                let eid1 = snode+"-"+tnode;
                if(Object.keys(this.links_dict).indexOf(eid1)!=-1){
                    this.links_dict[eid1].distance = 150;
                }
                let eid2 = tnode+"-"+snode;
                if(Object.keys(this.links_dict).indexOf(eid2)!=-1){
                    this.links_dict[eid2].distance = 150;
                }
            })
        })
        this.simulation.force("link", d3.forceLink(this.links).distance(d => d.distance).id(d => d.id));
        this.simulation.alpha(1).restart();

        // // for hyper-graph: split the corresponding hyperedge into two subsets u and v
        // if(persistence<this.threshold){
        //     for(let i=0; i<this.simplified_hypergraph.hyperedges.length; i++){
        //         let hedge = this.simplified_hypergraph.hyperedges[i];
        //         if(hedge.cc.indexOf(source_cc[0])!=-1){
        //             this.simplified_hypergraph.hyperedges.splice(i,1);
        //             let source_node = {};
        //             source_node.vertices = [];
        //             source_node.id = "";
        //             source_node.index = this.simplified_hypergraph.length;
        //             source_node.color = this.nodes_dict[source_cc[0]].color;
        //             source_node.cc = source_cc;
        //             source_cc.forEach(nId=>{
        //                 let node = this.nodes_dict[nId];
        //                 node.vertices.forEach(v=>{
        //                     if(source_node.vertices.indexOf(v)===-1){
        //                         source_node.vertices.push(v);
        //                     }
        //                 })
        //                 source_node.id += node.id;
        //             })
        //             this.simplified_hypergraph.hyperedges.push(source_node);

        //             let remaining_cc = [];
        //             hedge.cc.forEach(nId=>{
        //                 if(source_cc.indexOf(nId)===-1){
        //                     remaining_cc.push(nId);
        //                 }
        //             })

        //             let target_node = {};
        //             target_node.vertices = [];
        //             target_node.id = "";
        //             target_node.index = this.simplified_hypergraph.length;
        //             target_node.color = this.nodes_dict[target_cc[0]].color;
        //             target_node.cc = remaining_cc;
        //             remaining_cc.forEach(nId=>{
        //                 let node = this.nodes_dict[nId];
        //                 node.vertices.forEach(v=>{
        //                     if(target_node.vertices.indexOf(v)===-1){
        //                         target_node.vertices.push(v);
        //                     }
        //                 })
        //                 target_node.id += node.id;
        //             })
        //             this.simplified_hypergraph.hyperedges.push(target_node);
        //             break;
        //         }
        //     }
        //     this.simplified_hypergraph.construnct_bipartite_graph(this.simplified_hypergraph.hyperedges);
        // }
    }

    // compute_simplified_hypergraph(cc_list){
    //     let nodes_new = [];
    //     // merge nodes
    //     for(let i=0; i<cc_list.length; i++){
    //         let cc = cc_list[i];
    //         // each connected component is corresponding to a new node (hyper-edge)
    //         let node_new = {};
    //         node_new.vertices = [];
    //         node_new.id = ""; // **** TODO: might need a better way to assign id
    //         node_new.index = i;
    //         node_new.cc = cc;
    //         node_new.color = this.nodes_dict[cc[0]].color;
    //         cc.forEach(nId =>{
    //             let node = this.nodes_dict[nId];
    //             node.vertices.forEach(v=>{ 
    //                 if(node_new.vertices.indexOf(v)===-1){
    //                     node_new.vertices.push(v);
    //                 }
    //             })
    //             node_new.id += node.id;
    //         })
    //         nodes_new.push(node_new);
    //     }
    //     this.simplified_hypergraph.hyperedges = nodes_new;
    //     this.simplified_hypergraph.construnct_bipartite_graph(nodes_new);
    // }

    find_cc_idx(vertex_id, connected_components){
        // find the corresponding connected components of the given vertex
        for(let i=0; i<connected_components.length; i++){
            let cc = connected_components[i];
            if(cc.indexOf(vertex_id)!=-1){
                return i;
            }
        }
    }

    
}