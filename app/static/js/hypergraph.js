class Hypergraph{
    constructor(hyper_data, svg_id, config, color_dict, labels, original_hgraph=undefined){
        this.nodes = hyper_data.nodes;
        this.links = hyper_data.links;
        this.svg_id = svg_id;
        this.original_hgraph = original_hgraph;
        this.config = config;
        this.color_dict = color_dict;
        this.labels = labels;

        console.log(this.links, this.nodes)

        this.nodes_dict = {};
        this.nodes.forEach(node=>{
            node.links_idx = {"source":[], "target":[]}; 
            this.nodes_dict[node.id] = node; 
        })

        for(let i=0; i<this.links.length; i++){
            let l = this.links[i];
            this.nodes_dict[l.source].links_idx.source.push(i);
            this.nodes_dict[l.target].links_idx.target.push(i);
        }

        this.container_width = parseFloat(d3.select('#vis-'+svg_id).style('width'));
        let window_height = window.innerHeight;
        let header_height = d3.select(".header-group").node().offsetHeight;

        this.svg_width = this.container_width;
        this.svg_height = (window_height-header_height)/2-30;

        this.svg = d3.select("#"+svg_id+"-svg")
            // .attr("viewBox", [0, 0, this.svg_width, this.svg_height]);
            .attr("width", this.svg_width)
            .attr("height", this.svg_height);
        this.svg_g = this.svg.append("g");

        this.links_group = this.svg_g.append("g")
            .attr("id", "hyper_links_group");
        this.nodes_group = this.svg_g.append("g")
            .attr("id", "hyper_nodes_group");
        this.vertices_group = this.svg_g.append("g")
            .attr("id", "hyper_vertices_group");
        
        this.radius_scale = d3.scaleLinear().domain([1, 8]).range([8,15]);

        let distance_scale = d3.scaleLinear()
            .domain([1,10])
            .range([30,120])

        this.links.forEach(l=>{
            let source_size = l.source.split("|").length;
            let target_size = l.target.split("|").length;
            l.distance = distance_scale(Math.min((source_size+target_size)/2, 10));

        })

        this.vertices2he = d3.nest()
            .key(d => d.target)
            .rollup(d => d.map(node => node.source))
            .entries(this.links)
        this.vertices2he = Object.assign({}, ...this.vertices2he.map(s => ({[s.key]: s.value})));

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

    get_node_radius(node_id) {
        let n_list = node_id.split("|");
        return this.radius_scale(Math.min(n_list.length,8));
    }

    get_graph_coordinates(){
        let coordinates = {};
        this.nodes.forEach(node=>{
            coordinates[node.id] = {"x":node.x, "y":node.y}
            // console.log(node.x)
            // this.svg_id+"-hull-"+d.key.replace(/[|]/g,"")
            if(node.bipartite===1){
                coordinates[node.id].hull = d3.select("#"+this.svg_id+"-hull-"+node.id.replace(/[|]/g,"")).attr("d")
            }
        })
        return coordinates;
    }
     

    revert_force_directed_layout(){
        this.nodes.forEach(node=>{
            node.x = node.x0;
            node.y = node.y0;
        })
        this.svg.selectAll("circle").attr("cx", d=>d.x).attr("cy", d=>d.y);
        this.svg.selectAll("text").attr("x", d=>d.x).attr("y", d=>d.y);
        this.svg.selectAll("line").attr("x1", d=>d.source.x).attr("y1", d=>d.source.y)
            .attr("x2", d=>d.target.x).attr("y2", d=>d.target.y);
        let groups = d3.nest()
            .key(d => d.source.id)
            .rollup(d => d.map(node => [node.target.x, node.target.y]))
            .entries(this.links_new)
        let groups_dict = Object.assign({}, ...groups.map(s => ({[s.key]: s.value})));
        console.log(groups_dict)
        this.svg.selectAll(".convex_hull").attr("d", d=>this.groupPath(groups_dict[d.key]));
    }

    draw_hypergraph(){
        let that = this;

        let singleton_type = d3.select('input[name="singleton-type"]:checked').node().value;

        this.simulation = d3.forceSimulation(this.nodes)
            .force("link", d3.forceLink(this.links).distance(d => d.distance).id(d => d.id))
            .force("charge", d3.forceManyBody(-500))
            .force("center", d3.forceCenter(this.svg_width/2, this.svg_height/2))
            .force("x", d3.forceX().strength(0.02))
            .force("y", d3.forceY().strength(0.02))
            .stop();
        this.simulation.tick(300);

        this.nodes.forEach(node=>{
            node.x0 = node.x;
            node.y0 = node.y;
        })

        // let ng = this.nodes_group.selectAll("g").data(this.nodes);
        // ng.exit().remove();
        // ng = ng.enter().append("g").merge(ng)
        //     .attr("id", d=>this.svg_id+'-nodegroup-'+d.id.replace(/[|]/g,""))
        //     .on("mouseover", d => mouseover(d.id))
        //     .on("mouseout", d => mouseout(d.id))
        //     .on("click", d=>{
        //         if(this.click_id != d.id){
        //             this.click_id = d.id;
        //             if(d.bipartite === 1){
        //                 click(d.id);
        //             } else {
        //                 click_vertices(d.id);
        //             }
        //         } else {
        //             this.click_id = undefined;
        //             this.cancel_faded();
        //         }  
        //     })
        //     .call(d3.drag()
        //         .on("start", dragstarted)
        //         .on("drag", dragged)
        //         .on("end", dragended));
        
        // ng.append("circle")
        //     .attr("r", d => this.get_node_radius(d.id))
        //     .attr("fill", d => d["bipartite"] === 1 ? d.color : "")
        //     .attr("id", d => this.svg_id+'-node-'+d.id.replace(/[|]/g,""))
        //     .attr("cx", d=>d.x)
        //     .attr("cy", d=>d.y)
        //     .attr("class", d => d["bipartite"] === 1 ? "hyper_node" : "vertex_node")
        //     .classed("grey_out", d=>{
        //         if(singleton_type === "grey_out" && d.if_singleton){
        //             return true;
        //         } else { return false; }
        //     })
            
            
            

        // ng.append("text")
        //     .attr("dx", 12)
        //     .attr("dy", "0.35em")
        //     .attr("x", d=>d.x)
        //     .attr("y", d=>d.y)
        //     .attr("class", "node-label")
        //     .attr("id", d => this.svg_id+'-text-'+d.id.replace(/[|]/g,""))
        //     .text(d => d.label);

        let hg = this.nodes_group.selectAll("g").data(this.nodes.filter(d => d.bipartite===1));
        hg.exit().remove();
        hg = hg.enter().append("g").merge(hg)
            .attr("id", d=>this.svg_id+'-nodegroup-'+d.id.replace(/[|]/g,""))
            .attr("class", "he-group")
            .on("mouseover", d => mouseover(d.id))
            .on("mouseout", d => mouseout(d.id))
            .on("click", d=>{
                if(this.click_id != d.id){
                    this.click_id = d.id;
                    if(d.bipartite === 1){
                        click(d.id);
                    } else {
                        click_vertices(d.id);
                    }
                } else {
                    this.click_id = undefined;
                    this.cancel_faded();
                }  
            })
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));
        
        hg.append("circle")
            .attr("r", d => this.get_node_radius(d.id))
            .attr("fill", d => d.color)
            .attr("id", d => this.svg_id+'-node-'+d.id.replace(/[|]/g,""))
            .attr("cx", d=>d.x)
            .attr("cy", d=>d.y)
            .attr("class", "hyper_node")
            .classed("grey_out", d=>{
                if(singleton_type === "grey_out" && d.if_singleton){
                    return true;
                } else { return false; }
            });
            
        hg.append("text")
            .attr("dx", 12)
            .attr("dy", "0.35em")
            .attr("x", d=>d.x)
            .attr("y", d=>d.y)
            .attr("class", "node-label")
            .attr("id", d => this.svg_id+'-text-'+d.id.replace(/[|]/g,""))
            .text(d => d.label);

        let vg = this.vertices_group.selectAll("g").data(this.nodes.filter(d => d.bipartite===0));
        vg.exit().remove();
        vg = vg.enter().append("g").merge(vg)
            .attr("id", d=>this.svg_id+'-nodegroup-'+d.id.replace(/[|]/g,""))
            .attr("class", "v-group")
            .on("mouseover", d => mouseover(d.id))
            .on("mouseout", d => mouseout(d.id))
            .on("click", d=>{
                if(this.click_id != d.id){
                    this.click_id = d.id;
                    if(d.bipartite === 1){
                        click(d.id);
                    } else {
                        click_vertices(d.id);
                    }
                } else {
                    this.click_id = undefined;
                    this.cancel_faded();
                }  
            })
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));
            
        vg.append("circle")
            .attr("r", d => this.get_node_radius(d.id))
            .attr("fill", "")
            .attr("id", d => this.svg_id+'-node-'+d.id.replace(/[|]/g,""))
            .attr("cx", d=>d.x)
            .attr("cy", d=>d.y)
            .attr("class", "vertex_node")
            .classed("grey_out", d=>{
                if(singleton_type === "grey_out" && d.if_singleton){
                    return true;
                } else { return false; }
            })
                
        vg.append("text")
            .attr("dx", 12)
            .attr("dy", "0.35em")
            .attr("x", d=>d.x)
            .attr("y", d=>d.y)
            .attr("class", "node-label")
            .attr("id", d => this.svg_id+'-text-'+d.id.replace(/[|]/g,""))
            .text(d => d.label);

        if(this.config.variant === "line_graph") {
            let pie = d3.pie()
                .value(d => d.value)
                .sort(null);

            let arc = d3.arc()
                .innerRadius(0) 

            let pg = hg.append("g")
                .attr("class", "pie-group")
                .attr("id", d => this.svg_id+"-pie-"+d.id.replace(/[|]/g,""))
                .attr("transform",d => "translate("+d.x+","+d.y+")");
                
            pg.selectAll("path").data(d => pie(prepare_pie_data(d.id)))
                .enter().append("path")
                .attr("d", d => {
                    arc.outerRadius(this.get_node_radius(d.data.id));
                    return arc(d)})
                .attr("fill", d => d.data.color)
                .attr("stroke", "whitesmoke")
                .attr("stroke-width", "2px")
                .classed("grey_out", d=>{
                    if(singleton_type === "grey_out" && that.nodes_dict[d.data.id].if_singleton){
                        return true;
                    } else { return false; }
                });
        } else { // this.config.variant === "clique_expansion"
            this.svg.selectAll(".vertex_node").classed("vertex_node-container", true);
            let pg = vg.append("g")
                .attr("class", "pie-group")
                .attr("id", d => this.svg_id+"-pie-"+d.id.replace(/[|]/g,""))
                .attr("transform",d => "translate("+d.x+","+d.y+")");
            pg.selectAll("circle").data(d => prepare_ring_data(d))
                .enter().append("circle")
                .attr("r", (d,i) => Math.max(d.r-2*i-3, 0))
                .attr("stroke", d=>d.color)
                .attr("stroke-width", 1)
                .attr("fill", "#fff")
                .classed("grey_out", d=>{
                    if(singleton_type === "grey_out" && d.if_singleton){
                        return true;
                    } else { return false; }
                });
        }

        
            

        let lg = this.links_group.selectAll("line").data(this.links);
        lg.exit().remove();
        lg = lg.enter().append("line").merge(lg)
            .attr("stroke-width", d => Math.sqrt(d.value))
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)
            .attr("class", "hyper_edge")
            .attr("id", d => this.svg_id+"-edge-"+d.source.id.replace(/[|]/g,"")+"-"+d.target.id.replace(/[|]/g,""))
        
        this.links_new = [];
        this.links.forEach(l=>{
            this.links_new.push(l);
        })
        this.nodes.forEach(node=>{
            this.links_new.push({"source":node, "target":node});
        })
            
        let groups = d3.nest()
            .key(d => d.source.id)
            .rollup(d => d.map(node => [node.target.x, node.target.y]))
            .entries(this.links_new)

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
            .on("mouseover", d => mouseover(d.key))
            .on("mouseout",d => mouseout(d.key))
            .on("click", d => {
                if(!this.click_id){
                    this.click_id = d.key;
                    click(d.key)
                } else {
                    this.click_id = undefined;
                    this.cancel_faded();
                }        
            });

        //add zoom capabilities
        const zoom_handler = d3.zoom()
            .on("zoom", zoom_actions);

        // drag_handler(ng);
        zoom_handler(this.svg);


        function prepare_pie_data (key) {
            let id_list = key.split("|");
            if(id_list.length > 8) {
                id_list = id_list.slice(0,8);
            }
            let pie_data = [];
            id_list.forEach(id=>{
                let p = {};
                p.value = 10;
                p.color = that.color_dict[id];
                p.id = key;
                pie_data.push(p);
            })
            return pie_data
        }

        function prepare_ring_data (d) {
            let v_list = [];
            let r = that.get_node_radius(d.id);
            d.id.split("|").forEach(v=>{
                v_list.push({"r":r, "id":v, "color":that.color_dict[v], "if_singleton":d.if_singleton});
            })
            if(v_list.length>8){
                v_list = v_list.slice(0,8);
            }
            return v_list;
        }

        function dragstarted(d) {
            that.dragStarted = true;
        }

        function dragged(d) {
            d3.select("#"+that.svg_id+"-pie-"+d.id.replace(/[|]/g,"")).attr("transform","translate("+d3.event.x+","+d3.event.y+")");
            d3.select("#"+that.svg_id+'-node-'+d.id.replace(/[|]/g,"")).attr("cx", d3.event.x).attr("cy", d3.event.y);
            d3.select("#"+that.svg_id+'-text-'+d.id.replace(/[|]/g,"")).attr("x", d3.event.x).attr("y", d3.event.y);
            

            d.links_idx.source.forEach(l_idx => {
                let l = that.links[l_idx];
                d3.select("#"+that.svg_id+"-edge-"+l.source.id.replace(/[|]/g,"")+"-"+l.target.id.replace(/[|]/g,""))
                    .attr("x1", d3.event.x).attr("y1", d3.event.y);
            })
            d.links_idx.target.forEach(l_idx => {
                let l = that.links[l_idx];
                d3.select("#"+that.svg_id+"-edge-"+l.source.id.replace(/[|]/g,"")+"-"+l.target.id.replace(/[|]/g,"")).attr("x2", d3.event.x).attr("y2", d3.event.y);
            })
        }

        function dragended (d) {
            if(that.dragStarted) {
                d.x = d3.event.x;
                d.y = d3.event.y;

                if(d.bipartite === 1){
                    let d_links = [];
                    d_links.push({"source":d, "target":d})
                    d.links_idx.source.forEach(l_idx=> {
                        d_links.push(that.links[l_idx]);
                    })
                    let d_groups = d3.nest()
                        .key(d => d.source.id)
                        .rollup(d => d.map(node => [node.target.x, node.target.y]))
                        .entries(d_links);
                    d3.select("#"+that.svg_id+"-hull-"+d.id.replace(/[|]/g,"")).attr("d", that.groupPath(d_groups[0].value))
                } else {
                    let new_groups = d3.nest()
                        .key(d => d.source.id)
                        .rollup(d => d.map(node => [node.target.x, node.target.y]))
                        .entries(that.links_new);
                    let new_groups_dict = {};
                    new_groups.forEach(g=>{
                        new_groups_dict[g.key] = g.value;
                    })
                    d.links_idx.target.forEach(l_idx => {
                        let l = that.links[l_idx];
                        d3.select("#"+that.svg_id+"-hull-"+l.source.id.replace(/[|]/g,"")).attr("d", that.groupPath(new_groups_dict[l.source.id]));
                    })
                }
            }
            that.dragStarted = false;
        }

        function mouseover(key) {
            if(!that.click_id){
                let label_list = that.nodes_dict[key].label.split("|")
                let div_text = '';
                label_list.forEach(label=>{ div_text += label+"<br> "; })
                let div = d3.select("#help-tip")
                div.classed("show", true);
                if(that.nodes_dict[key].bipartite === 1){
                    d3.select("#"+that.svg_id+"-hull-"+key.replace(/[|]/g,"")).classed("highlighted", true);
                    div.html("<h6>Selected Hyperedges</h6>"+div_text);
                } else {
                    d3.select("#"+that.svg_id+"-node-"+key.replace(/[|]/g,"")).classed("highlighted", true);
                    div.html("<h6>Selected Vertices</h6>"+div_text);
                }
            }
        }

        function mouseout(key) {
            if(!that.click_id){
                d3.select("#"+that.svg_id+"-hull-"+key.replace(/[|]/g,"")).classed("highlighted", false);
                d3.select("#"+that.svg_id+"-node-"+key.replace(/[|]/g,"")).classed("highlighted", false);
                d3.select("#help-tip").classed("show", false);
            }
        }

        function click(key) {
            let he_list = key.split("|");
            // console.log(key)
            d3.select("#hypergraph-svg").selectAll(".convex_hull").classed("faded", d => {
                if(he_list.indexOf(d.key.split("|")[0]) != -1){
                    return false;
                } else { return true; }
            });
            d3.select("#hypergraph-svg").selectAll(".he-group").classed("faded", d => {
                if(he_list.indexOf(d.id.split("|")[0]) != -1){
                    return false;
                } else { return true; }
            });
            d3.select("#hypergraph-svg").selectAll(".v-group").classed("faded", true);
            d3.select("#hypergraph-svg").selectAll("line").data().forEach(l=>{
                if(he_list.indexOf(l.source.id.split("|")[0]) != -1){
                    d3.select("#hypergraph-nodegroup-"+l.target.id.replace(/[|]/g,"")).classed("faded", false);
                }
            })

            d3.select("#simplified-hypergraph-svg").selectAll(".convex_hull").classed("faded", d => {
                if(d.key.split("|").indexOf(he_list[0]) != -1){
                    return false;
                } else { return true; }
            });
            d3.select("#simplified-hypergraph-svg").selectAll(".he-group").classed("faded", d => {
                if(d.id.split("|").indexOf(he_list[0]) != -1){
                    return false;
                } else { return true; }
            });
            d3.select("#simplified-hypergraph-svg").selectAll(".v-group").classed("faded", true);
            d3.select("#simplified-hypergraph-svg").selectAll("line").data().forEach(l=>{
                if(l.source.id.split("|").indexOf(he_list[0]) != -1){
                    d3.select("#simplified-hypergraph-nodegroup-"+l.target.id.replace(/[|]/g,"")).classed("faded", false);
                }
            })

            if(that.config.variant === "line_graph"){
                d3.select("#linegraph-svg").selectAll(".line_node").classed("faded", true);
                d3.select("#linegraph-svg").selectAll(".pie-group").classed("faded", d => {
                    if(he_list.indexOf(d.id.split("|")[0]) != -1){
                        return false;
                    } else { return true; }
                });
                d3.select("#linegraph-svg").selectAll("line").classed("faded", d => {
                    if((he_list.indexOf(d.source.id.split("|")[0]) != -1) && (he_list.indexOf(d.target.id.split("|")[0]) != -1)){
                        return false;
                    } else { return true; }
                });
                d3.select("#simplified-linegraph-svg").selectAll(".line_node").classed("faded", true);
                d3.select("#simplified-linegraph-svg").selectAll(".pie-group").classed("faded", d => {
                    if(he_list.indexOf(d.id.split("|")[0]) != -1){
                        return false;
                    } else { return true; }
                });
                // At most one node in simplified linegraph will be selected, so all edges will be faded
                d3.select("#simplified-linegraph-svg").selectAll("line").classed("faded", true);
            } else {
                let v_list = [];
                d3.select("#linegraph-svg").selectAll(".line_node").classed("faded", d => {
                    for(let i=0; i<d.vertices.length; i++){
                        if(he_list.indexOf(d.vertices[i])!=-1){
                            v_list.push(d.id);
                            return false;
                        }
                    }
                    return true;
                });
                d3.select("#linegraph-svg").selectAll(".pie-group").classed("faded", d => {
                    for(let i=0; i<d.vertices.length; i++){
                        if(he_list.indexOf(d.vertices[i])!=-1){
                            v_list.push(d.id);
                            return false;
                        }
                    }
                    return true;
                });
                d3.select("#linegraph-svg").selectAll("line").classed("faded", d => {
                    if(v_list.indexOf(d.source.id)!=-1 && v_list.indexOf(d.target.id)!=-1){
                        return false;
                    }
                    return true;
                });
                let s_v_list = [];
                d3.select("#simplified-linegraph-svg").selectAll(".line_node").classed("faded", d => {
                    for(let i=0; i<d.vertices.length; i++){
                        if(he_list.indexOf(d.vertices[i])!=-1){
                            s_v_list.push(d.id);
                            return false;
                        }
                    }
                    return true;
                });
                d3.select("#simplified-linegraph-svg").selectAll(".pie-group").classed("faded", d => {
                    for(let i=0; i<d.vertices.length; i++){
                        if(he_list.indexOf(d.vertices[i])!=-1){
                            s_v_list.push(d.id);
                            return false;
                        }
                    }
                    return true;
                });
                d3.select("#simplified-linegraph-svg").selectAll("line").classed("faded", d => {
                    if(s_v_list.indexOf(d.source.id)!=-1 && s_v_list.indexOf(d.target.id)!=-1){
                        return false;
                    }
                    return true;
                });
            }
            

            d3.select("#"+that.svg_id+"-hull-"+key.replace(/[|]/g,"")).classed("highlighted", false);
        }

        function click_vertices(key){
            let v_list = key.split("|");
            d3.select("#hypergraph-svg").selectAll(".convex_hull").classed("faded", true);
            d3.select("#hypergraph-svg").selectAll(".he-group").classed("faded", d => {
                if(v_list.indexOf(d.id.split("|")[0]) != -1){
                    return false;
                } else { return true; }
            });
            d3.select("#hypergraph-svg").selectAll(".v-group").classed("faded", d => {
                if(v_list.indexOf(d.id.split("|")[0]) != -1){
                    return false;
                } else { return true; }
            });
            

            d3.select("#simplified-hypergraph-svg").selectAll(".convex_hull").classed("faded", true);            
            d3.select("#simplified-hypergraph-svg").selectAll(".he-group").classed("faded", true);
            d3.select("#simplified-hypergraph-svg").selectAll(".v-group").classed("faded", d => {    
                if(d.id.split("|").indexOf(v_list[0]) != -1){
                    return false;
                } else { return true; }
            });

            d3.select("#"+that.svg_id+"-node-"+key.replace(/[|]/g,"")).classed("highlighted", false);

            if(that.config.variant === "clique_expansion") {
                d3.select("#linegraph-svg").selectAll(".line_node").classed("faded", d=>{
                    if(v_list.indexOf(d.id.split("|")[0])!=-1){
                        return false;
                    } else { return true; }
                })
                d3.select("#linegraph-svg").selectAll(".pie-group").classed("faded", d=>{
                    if(v_list.indexOf(d.id.split("|")[0])!=-1){
                        return false;
                    } else { return true; }
                })
                d3.select("#linegraph-svg").selectAll("line").classed("faded", d=>{
                    if(v_list.indexOf(d.source.id.split("|")[0])!=-1 && v_list.indexOf(d.target.id.split("|")[0])!=-1){
                        return false;
                    } else { return true; }
                })
                d3.select("#simplified-linegraph-svg").selectAll(".line_node").classed("faded", d=>{
                    // console.log(d)
                    if(d.id.split("|").indexOf(v_list[0])!=-1){
                        return false;
                    } else { return true; }
                })
                d3.select("#simplified-linegraph-svg").selectAll(".pie-group").classed("faded", d=>{
                    if(d.id.split("|").indexOf(v_list[0])!=-1){
                        return false;
                    } else { return true; }
                })
                d3.select("#simplified-linegraph-svg").selectAll("line").classed("faded", d=>{
                    if(d.source.id.split("|").indexOf(v_list[0])!=-1 && d.target.id.split("|").indexOf(v_list[0])!=-1){
                        return false;
                    } else { return true; }
                })
            }
        }

        //Zoom functions
        function zoom_actions() {
            that.svg_g.attr("transform", d3.event.transform);
        }
    }

    cancel_faded(){
        d3.select("#hypergraph-svg").selectAll(".convex_hull").classed("faded", false);
        d3.select("#hypergraph-svg").selectAll(".he-group").classed("faded", false);
        d3.select("#hypergraph-svg").selectAll(".v-group").classed("faded", false);

        d3.select("#simplified-hypergraph-svg").selectAll(".convex_hull").classed("faded", false);
        d3.select("#simplified-hypergraph-svg").selectAll(".he-group").classed("faded", false);
        d3.select("#simplified-hypergraph-svg").selectAll(".v-group").classed("faded", false);

        d3.select("#linegraph-svg").selectAll("circle").classed("faded", false);
        d3.select("#simplified-linegraph-svg").selectAll("circle").classed("faded", false);
        d3.select("#linegraph-svg").selectAll("line").classed("faded", false);
        d3.select("#simplified-linegraph-svg").selectAll("line").classed("faded", false);

        d3.select("#linegraph-svg").selectAll(".pie-group").classed("faded", false);
        d3.select("#simplified-linegraph-svg").selectAll(".pie-group").classed("faded", false);
    }

    toggle_hgraph_labels(){
        try {
            // Set show-labels to true at beginning
            // d3.select("#hgraph-labels").property("checked", true);
            update_labels();
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