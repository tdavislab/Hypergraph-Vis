class Linegraph{
    constructor(line_data, hypergraph, svg_id, variant, weight, color_dict, labels){
        this.nodes = [...line_data.nodes];
        this.links = [...line_data.links];
        this.hypergraph = hypergraph;
        this.svg_id = svg_id;
        this.variant = variant;
        this.color_dict = color_dict;
        this.labels = labels;
        console.log(this.nodes, this.links)

        this.nodes_dict = {};
        this.nodes.forEach(n=>{
            n.links_idx = {"source":[], "target":[]}; // for dragging
            this.nodes_dict[n.id] = n;
        })

        this.links_dict = {};
        for (let i=0; i<this.links.length; i++){
            let l = this.links[i];
            this.links_dict[l.source+"-"+l.target] = l;
            this.nodes_dict[l.source].links_idx.source.push(i);
            this.nodes_dict[l.target].links_idx.target.push(i);
        }
        console.log(this.nodes_dict, this.links_dict)

        // console.log(this.links, this.nodes);

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

        this.weight = weight;
        console.log(this.weight)
        this.edge_scale = d3.scaleLinear()
            .domain(d3.extent(this.links.map(d => parseFloat(d[this.weight].value))))
            .range([1, 10]);
        this.radius_scale = d3.scaleLinear().domain([1, 8]).range([8,15]);

        let distance_scale = d3.scaleLinear()
            .domain([1,10])
            .range([100,200]);

        this.links.forEach(l=>{
            let source_size = l.source.split("|").length;
            let target_size = l.target.split("|").length;
            l.distance = distance_scale(Math.min((source_size+target_size)/2, 10));
        });

        this.if_hyperedge_glyph = d3.select("#hyperedge-glyph").property("checked");
        this.if_vertex_glyph = d3.select("#vertex-glyph").property("checked");

        this.draw_linegraph();
    }

    get_node_radius(node_id) {
        let n_list = node_id.split("|");
        return this.radius_scale(Math.min(n_list.length,8));
    }

    revert_force_directed_layout(){
        this.nodes.forEach(node=>{
            node.x = node.x0;
            node.y = node.y0;
        })
        d3.selectAll(".line_node").attr("cx", d=>d.x).attr("cy", d=>d.y);
        d3.selectAll(".pie-group").attr("transform",d => "translate("+d.x+","+d.y+")")
        d3.selectAll(".ring-group").attr("transform",d => "translate("+d.x+","+d.y+")")
        d3.selectAll(".line_edge").attr("x1", d=>d.source.x).attr("y1", d=>d.source.y)
            .attr("x2", d=>d.target.x).attr("y2", d=>d.target.y);
    }

    draw_linegraph(){
        this.svg_g = this.svg_g.remove();
        this.svg_g = this.svg.append("g");

        this.links_group = this.svg_g.append("g")
            .attr("id", "line_links_group");
        this.nodes_group = this.svg_g.append("g")
            .attr("id", "line_nodes_group");
        
        let that = this;
        this.simulation = d3.forceSimulation(this.nodes)
            .force("link", d3.forceLink(this.links).distance(d => d.distance).id(d => d.id))
            .force("charge", d3.forceManyBody(-200))
            .force("center", d3.forceCenter(this.svg_width/2, this.svg_height/2))
            .force("x", d3.forceX().strength(0.02))
            .force("y", d3.forceY().strength(0.02))
            .stop();
        this.simulation.tick(300);

        this.nodes.forEach(node=>{
            node.x0 = node.x;
            node.y0 = node.y;
        })

        let ng = this.nodes_group.selectAll("g").data(this.nodes);
        ng.exit().remove();
        ng = ng.enter().append("g").merge(ng)
            .on("mouseover", d => {
                if(!this.click_id){
                    d3.select("#"+this.svg_id+"-node-"+d.id.replace(/[|]/g,"")).classed("highlighted", true);
                    d3.select("#"+this.svg_id+"-pie-"+d.id.replace(/[|]/g,"")).classed("highlighted", true);
                    d3.select("#"+this.svg_id+"-ring-"+d.id.replace(/[|]/g,"")).classed("highlighted", true);
                    let label_list = this.nodes_dict[d.id].label.split("|");
                    let div_text = '';
                    label_list.forEach(label=>{ div_text += label+"<br> "; })
                    if(this.variant === "line_graph"){
                        d3.select("#help-tip").classed("show", true)
                            .html("<h6>Selected Hyperedges</h6>"+div_text);
                    } else { // this.variant === "clique_expansion"
                        d3.select("#help-tip").classed("show", true)
                            .html("<h6>Selected Vertices</h6>"+div_text);
                    }
                    
                }  
            })
            .on("mouseout", d=>{
                if(!this.click_id){
                    d3.select("#"+that.svg_id+"-pie-"+d.id.replace(/[|]/g,"")).classed("highlighted", false);
                    d3.select("#"+that.svg_id+"-ring-"+d.id.replace(/[|]/g,"")).classed("highlighted", false);
                    d3.select("#"+that.svg_id+"-node-"+d.id.replace(/[|]/g,"")).classed("highlighted", false);
                    d3.select("#help-tip").classed("show", false);
                } 
            })
            .on("click", d => {
                if(this.click_id != d.id){
                    this.click_id = d.id;
                    click_node(d.id)
                } else {
                    this.click_id = undefined;
                    this.cancel_faded();
                    
                }     
            })
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        ng.append("circle")
            .attr("r", d => this.get_node_radius(d.id))
            .attr("fill", d => {
                if(this.variant === "line_graph"){
                    return d.color;
                } else { // variant === "clique_expansion"
                    return "whitesmoke";
                }
            })
            .attr("stroke", d => {
                if(this.variant === "line_graph"){
                    return "whitesmoke";
                } else { // variant === "clique_expansion"
                    return d.color;
                }
            })
            .attr("stroke-width", d => {
                if(this.variant === "line_graph"){
                    return 4;
                } else { // variant === "clique_expansion"
                    return 4;
                }
            })
            .attr("id", d => this.svg_id+"-node-"+d.id.replace(/[|]/g,""))
            .attr("cx", d=>d.x)
            .attr("cy",d=>d.y)
            .attr("class", "line_node");

        if(this.variant === "line_graph"){
            let pie = d3.pie()
                .value(d => d.value)
                .sort(null);

            let arc = d3.arc()
                .innerRadius(()=>{
                    if(this.variant === "line_graph"){ return 0; }
                    else { return 5; }
                })    

            let pg = ng.append("g")
                .attr("class", "pie-group")
                .attr("id", d => this.svg_id+"-pie-"+d.id.replace(/[|]/g,""))
                .attr("transform",d => "translate("+d.x+","+d.y+")")
                .attr("visibility", ()=>{
                    if(this.if_hyperedge_glyph){ return "visible"; }
                    else { return "hidden"; }
                });
                
            pg.selectAll("path").data(d => pie(prepare_pie_data(d.id)))
                .enter().append("path")
                .attr("d", d => {
                    arc.outerRadius(this.get_node_radius(d.data.id));
                    return arc(d)})
                .attr("fill", d => d.data.color)
                .attr("stroke", "whitesmoke")
                .attr("stroke-width", "2px");
        } else { // this.variant === "clique_expansion"
            d3.selectAll(".line_node").classed("line_node-container", true);
            if(this.if_vertex_glyph){
                d3.selectAll(".line_node-container").attr("stroke",(d)=>{
                    if(d.id.split("|").length === 1){
                        return d.color;
                    } else {
                        return "black";
                    }
                })
            }
            let pg = ng.append("g")
                .attr("class", "ring-group")
                .attr("id", d => this.svg_id+"-ring-"+d.id.replace(/[|]/g,""))
                .attr("transform",d => "translate("+d.x+","+d.y+")")
                .attr("visibility", (d)=>{
                    if(d.id.split("|").length === 1){
                        return "hidden";
                    }
                    else if(this.if_vertex_glyph){ return "visible"; }
                    else { return "hidden"; }
                });
            pg.selectAll("circle").data(d => prepare_ring_data(d))
                .enter().append("circle")
                .attr("r", (d,i) => Math.max(d.r-2*i-2, 0))
                .attr("stroke", d=>d.color)
                .attr("stroke-width", 2)
                .attr("fill", "#fff");
        }
        
        let lg = this.links_group.selectAll("line").data(this.links);
        lg.exit().remove();
        lg = lg.enter().append("line").merge(lg)
            .attr("stroke-width", d => this.edge_scale(parseFloat(d[this.weight].value)))
            .attr("id", d => this.svg_id+"-edge-"+d.source.id.replace(/[|]/g,"")+"-"+d.target.id.replace(/[|]/g,""))
            .attr("class", "line_edge")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)
            .on("mouseover", d => {
                if(!this.click_id){
                    d3.select("#"+this.svg_id+"-edge-"+d.source.id.replace(/[|]/g,"")+"-"+d.target.id.replace(/[|]/g,"")).classed("highlighted", true);
                    let vertices_union = d.source.vertices.filter(function(x) {
                        if(d.target.vertices.indexOf(x) != -1){ return true;}
                        else { return false;}
                    });
                    let div_text = '';
                    vertices_union.forEach(v => { 
                        if(this.labels[v]){
                            div_text += this.labels[v] + "<br> ";
                        }
                    });
                    let div = d3.select("#help-tip");
                    div.classed("show", true);
                    if(this.variant === "line_graph"){
                        div.html("<h6>Intersected Vertices</h6>"+div_text);
                    } else { // this.variant === "clique_expansion"
                        div.html("<h6>Intersected Hyperedges</h6>"+div_text);
                    }
                }
                
            })
            .on("mouseout", d => {
                if(!this.click_id){
                    d3.select("#"+this.svg_id+"-edge-"+d.source.id.replace(/[|]/g,"")+"-"+d.target.id.replace(/[|]/g,"")).classed("highlighted", false);
                    d3.select("#help-tip").classed("show", true);
                }
            })
            .on("click", d=>{
                if(this.click_id != d.source.id +"-"+d.target.id){
                    this.click_id = d.source.id +"-"+d.target.id;
                    click_edge(d)
                } else {
                    this.click_id = undefined;
                    this.cancel_faded();
                    
                }   
            });

        //add zoom capabilities
        const zoom_handler = d3.zoom()
            .on("zoom", zoom_actions);
        zoom_handler(this.svg);

        function dragstarted(d) {
            that.dragStarted = true;
        }

        function dragged(d) {
            // console.log(d3.select("#"+that.svg_id+"-pie-"+d.id.replace(/[|]/g,"")))
            d3.select("#"+that.svg_id+"-pie-"+d.id.replace(/[|]/g,"")).attr("transform","translate("+d3.event.x+","+d3.event.y+")");
            d3.select("#"+that.svg_id+"-ring-"+d.id.replace(/[|]/g,"")).attr("transform","translate("+d3.event.x+","+d3.event.y+")");
            d3.select("#"+that.svg_id+"-node-"+d.id.replace(/[|]/g,"")).attr("cx", d3.event.x).attr("cy", d3.event.y);
            d.links_idx.source.forEach(l_idx =>{
                let l = that.links[l_idx];
                d3.select("#"+that.svg_id+"-edge-"+l.source.id.replace(/[|]/g,"")+"-"+l.target.id.replace(/[|]/g,"")).attr("x1", d3.event.x).attr("y1", d3.event.y);
            })
            d.links_idx.target.forEach(l_idx => {
                let l = that.links[l_idx];
                d3.select("#"+that.svg_id+"-edge-"+l.source.id.replace(/[|]/g,"")+"-"+l.target.id.replace(/[|]/g,"")).attr("x2", d3.event.x).attr("y2", d3.event.y);
            })
        }

        function dragended(d) {
            if(that.dragStarted) {
                d.x = d3.event.x;
                d.y = d3.event.y;
            }
            that.dragStarted = false;
        }

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
                v_list.push({"r":r, "id":v, "color":that.color_dict[v]});
            })
            if(v_list.length>8){
                v_list = v_list.slice(0,8);
            }
            return v_list;
        }

        //Zoom functions
        function zoom_actions() {
            that.svg_g.attr("transform", d3.event.transform);
        }

        function click_node(key) {
            if(that.variant === "line_graph"){
                let he_list = key.split("|");
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
                d3.select("#hypergraph-svg").selectAll(".v-group").classed("faded",true);
                d3.select("#hypergraph-svg").selectAll("line").data().forEach(l=>{
                    if(he_list.indexOf(l.source.id.split("|")[0]) != -1){
                        d3.select("#hypergraph-nodegroup-"+l.target.id.replace(/[|]/g,"")).classed("faded", false);
                    }
                });
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
                d3.select("#linegraph-svg").selectAll(".line_node").classed("faded", d => {
                    if(he_list.indexOf(d.id.split("|")[0]) != -1){
                        return false;
                    } else { return true; }
                });
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
                d3.select("#simplified-linegraph-svg").selectAll(".line_node").classed("faded", d => {
                    if(he_list.indexOf(d.id.split("|")[0]) != -1){
                        return false;
                    } else { return true; }
                });
                d3.select("#simplified-linegraph-svg").selectAll(".pie-group").classed("faded", d => {
                    if(he_list.indexOf(d.id.split("|")[0]) != -1){
                        return false;
                    } else { return true; }
                });
                // At most one node in simplified linegraph will be selected, so all edges will be faded
                d3.select("#simplified-linegraph-svg").selectAll("line").classed("faded", true);
    
                d3.select("#"+that.svg_id+"-pie-"+key.replace(/[|]/g,"")).classed("highlighted", false);
                d3.select("#"+that.svg_id+"-node-"+key.replace(/[|]/g,"")).classed("highlighted", false);

            } else {
                let v_list = key.split("|");
                d3.select("#hypergraph-svg").selectAll(".convex_hull").classed("faded", true);
                d3.select("#hypergraph-svg").selectAll(".he-group").classed("faded", d => true);
                d3.select("#hypergraph-svg").selectAll(".v-group").classed("faded", d => {
                    if(v_list.indexOf(d.id.split("|")[0]) != -1){
                        return false;
                    } else { return true; }
                });

                d3.select("#simplified-hypergraph-svg").selectAll(".convex_hull").classed("faded", true);
                d3.select("#simplified-hypergraph-svg").selectAll(".he-group").classed("faded", true);
                d3.select("#simplified-hypergraph-svg").selectAll(".v-group").classed("faded", d => {
                    for(let i=0; i<v_list.length; i++){
                        if(d.id.split("|").indexOf(v_list[i])!=-1){
                            return false;
                        }
                    } 
                    return true;
                    // if(v_list.indexOf(d.id.split("|")[0]) != -1){
                    //     return false;
                    // } else { return true; }
                });

                d3.select("#linegraph-svg").selectAll(".line_node").classed("faded", d => {
                    if(v_list.indexOf(d.id.split("|")[0]) != -1){
                        return false;
                    } else { return true; }
                });
                d3.select("#linegraph-svg").selectAll(".ring-group").classed("faded", d => {
                    if(v_list.indexOf(d.id.split("|")[0]) != -1){
                        return false;
                    } else { return true; }
                });
                d3.select("#linegraph-svg").selectAll("line").classed("faded", d => {
                    if((v_list.indexOf(d.source.id.split("|")[0]) != -1) && (v_list.indexOf(d.target.id.split("|")[0]) != -1)){
                        return false;
                    } else { return true; }
                });
                d3.select("#simplified-linegraph-svg").selectAll(".line_node").classed("faded", d => {
                    for(let i=0; i<v_list.length; i++){
                        if(d.id.split("|").indexOf(v_list[i])!=-1){
                            return false;
                        }
                    } 
                    return true;
                    // if(d.id.split("|").indexOf(v_list[0]) != -1){
                    //     return false;
                    // } else { return true; }
                });
                d3.select("#simplified-linegraph-svg").selectAll(".ring-group").classed("faded", d => {
                    for(let i=0; i<v_list.length; i++){
                        if(d.id.split("|").indexOf(v_list[i])!=-1){
                            return false;
                        }
                    } 
                    return true;
                    // if(d.id.split("|").indexOf(v_list[0]) != -1){
                    //     return false;
                    // } else { return true; }
                });
                // At most one node in simplified linegraph will be selected, so all edges will be faded
                d3.select("#simplified-linegraph-svg").selectAll("line").classed("faded", true);
    
                d3.select("#"+that.svg_id+"-pie-"+key.replace(/[|]/g,"")).classed("highlighted", false);
                d3.select("#"+that.svg_id+"-node-"+key.replace(/[|]/g,"")).classed("highlighted", false);

            }
        }

        function click_edge(edge) {
            let vertices_union = edge.source.vertices.filter(function(x) {
                if(edge.target.vertices.indexOf(x) != -1){ return true;}
                else { return false;}
            });
            if(that.variant === "line_graph"){
                d3.select("#hypergraph-svg").selectAll(".convex_hull").classed("faded", true);
                d3.select("#hypergraph-svg").selectAll(".he-group").classed("faded", true);
                d3.select("#hypergraph-svg").selectAll(".v-group").classed("faded", d =>{
                    if(vertices_union.indexOf(d.id.split("|")[0])!=-1){
                        return false;
                    } else { return true; }
                });
                d3.select("#simplified-hypergraph-svg").selectAll(".convex_hull").classed("faded", true);
                d3.select("#simplified-hypergraph-svg").selectAll(".he-group").classed("faded", true);
                d3.select("#simplified-hypergraph-svg").selectAll(".v-group").classed("faded", d =>{
                    if(vertices_union.indexOf(d.id.split("|")[0])!=-1){
                        return false;
                    } else { return true; }
                });
            } else { // that.variant === "clique_expansion"
                d3.select("#hypergraph-svg").selectAll(".convex_hull").classed("faded", d =>{
                    if(vertices_union.indexOf(d.key.split("|")[0])!=-1){
                        return false;
                    } else { return true; }
                });
                d3.select("#hypergraph-svg").selectAll(".he-group").classed("faded", d =>{
                    if(vertices_union.indexOf(d.id.split("|")[0])!=-1){
                        return false;
                    } else { return true; }
                });
                d3.select("#hypergraph-svg").selectAll(".v-group").classed("faded", true);
                d3.select("#hypergraph-svg").selectAll("line").data().forEach(l=>{
                    if(vertices_union.indexOf(l.source.id.split("|")[0]) != -1){
                        d3.select("#hypergraph-nodegroup-"+l.target.id.replace(/[|]/g,"")).classed("faded", false);
                    }
                });

                d3.select("#simplified-hypergraph-svg").selectAll(".convex_hull").classed("faded", d =>{
                    for(let i=0; i<vertices_union.length; i++){
                        if(d.key.split("|").indexOf(vertices_union[i])!=-1){
                            return false;
                        }
                    } 
                    return true;
                });
                d3.select("#simplified-hypergraph-svg").selectAll(".he-group").classed("faded", d =>{
                    for(let i=0; i<vertices_union.length; i++){
                        if(d.id.split("|").indexOf(vertices_union[i])!=-1){
                            return false;
                        }
                    } 
                    return true;
                });
                d3.select("#simplified-hypergraph-svg").selectAll(".v-group").classed("faded", true);
                d3.select("#simplified-hypergraph-svg").selectAll("line").data().forEach(l=>{
                    for(let i=0; i<vertices_union.length; i++){
                        if(l.source.id.split("|").indexOf(vertices_union[i])!=-1){
                            d3.select("#simplified-hypergraph-nodegroup-"+l.target.id.replace(/[|]/g,"")).classed("faded", false);
                        }
                    } 
                    return true;
                });
            }
            

            // d3.select("#linegraph-svg").selectAll("line").classed("faded", d=>{
            //     let vertices_union_1 = d.source.vertices.filter(function(x) {
            //         if(d.target.vertices.indexOf(x) != -1){ return true;}
            //         else { return false;}
            //     });
            //     return !(vertices_union_1.every(v => vertices_union.includes(v)))
            //     // return ();
            // })
        }        
    }

    draw_linegraph2(){
        this.svg_g = this.svg_g.remove();
        this.svg_g = this.svg.append("g");

        this.border_group = this.svg_g.append("g")
            .attr("id", "line_border_group");
        this.nodes_id_group = this.svg_g.append("g")
            .attr("id", "line_nodes_id_group");
        this.line_group = this.svg_g.append("g")
            .attr("id", "hyper_line_group");
        this.rect_group_source = this.svg_g.append("g")
            .attr("id", "line_rect_group_source");
        this.rect_group_target = this.svg_g.append("g")
            .attr("id", "line_rect_group_target");
        

        let table_margins = {'left':10, 'right':10, 'top':20, 'bottom':10}
        let cell_height = (this.svg_height-table_margins.top-table_margins.bottom)/(this.nodes.length+1);
        let cell_width = this.svg_width - table_margins.left - table_margins.right;
    
        let node_id_width = 1/8*cell_width;
        let he_width = 7/8*cell_width / this.links.length;

        console.log(this.links)

        let bg = this.border_group.selectAll("line").data(this.nodes.concat(["bottom"]));
        bg = bg.enter().append("line").merge(bg)
            .attr("class", "matrix_border")
            .attr("x1", table_margins.left)
            .attr("y1", (d,i)=>table_margins.top + i*cell_height)
            .attr("x2", table_margins.left + cell_width)
            .attr("y2", (d,i)=>table_margins.top + i*cell_height)
            .attr("stroke", "grey")
            .style("opacity", 0.3);
            
        let tg = this.nodes_id_group.selectAll("text").data(this.nodes);
        tg = tg.enter().append("text").merge(tg)
            .attr("class", "matrix_node_id")
            .attr("x",table_margins.left)
            .attr("y",(d,i)=>table_margins.top + (i+0.8)*cell_height)
            .text(d=>d.id)
            .style("opacity", 0.8);
    
        let rg1 = this.rect_group_source.selectAll("rect").data(this.links);
        rg1 = rg1.enter().append("rect").merge(rg1)
            .attr("x", d=>table_margins.left + node_id_width + he_width * d.index)
            .attr("y", d=>table_margins.top + d.source.index*cell_height)
            .attr("width", 2/3*he_width)
            .attr("height", cell_height)
            .attr("fill", d=>this.color_dict[d.source.id.split("|")[0]])
            .style("opacity", 1);

        let rg2 = this.rect_group_target.selectAll("rect").data(this.links);
        rg2 = rg2.enter().append("rect").merge(rg2)
            .attr("x", d=>table_margins.left + node_id_width + he_width * d.index)
            .attr("y", d=>table_margins.top + d.target.index*cell_height)
            .attr("width", 2/3*he_width)
            .attr("height", cell_height)
            .attr("fill", d=>this.color_dict[d.target.id.split("|")[0]])
            .style("opacity", 1);
            
        let lg = this.line_group.selectAll("line").data(this.links);
        lg = lg.enter().append("line").merge(lg)
            .attr("x1", d=>table_margins.left + node_id_width + he_width * d.index + he_width/3)
            .attr("y1", d=>table_margins.top + d.source.index*cell_height)
            .attr("x2", d=>table_margins.left + node_id_width + he_width * d.index + he_width/3)
            .attr("y2", d=>table_margins.top + d.target.index*cell_height)
            // .attr("stroke", d=>this.color_dict[d[0].split("|")[0]])
            .attr("stroke", "grey")
            .style("opacity", 0.5)
        
    }

    cancel_faded(){
        d3.select("#hypergraph-svg").selectAll(".convex_hull").classed("faded", false);
        d3.select("#hypergraph-svg").selectAll(".he-group").classed("faded", false);
        d3.select("#hypergraph-svg").selectAll(".v-group").classed("faded", false);

        d3.select("#simplified-hypergraph-svg").selectAll(".convex_hull").classed("faded", false);
        d3.select("#simplified-hypergraph-svg").selectAll(".he-group").classed("faded", false);
        d3.select("#simplified-hypergraph-svg").selectAll(".v-group").classed("faded", false);

        d3.select("#linegraph-svg").selectAll(".line_node").classed("faded",false);
        d3.select("#simplified-linegraph-svg").selectAll(".line_node").classed("faded",false);
        d3.select("#linegraph-svg").selectAll("line").classed("faded", false);
        d3.select("#simplified-linegraph-svg").selectAll("line").classed("faded", false);

        d3.select("#linegraph-svg").selectAll(".pie-group").classed("faded", false);
        d3.select("#simplified-linegraph-svg").selectAll(".pie-group").classed("faded", false);
        d3.select("#linegraph-svg").selectAll(".ring-group").classed("faded", false);
        d3.select("#simplified-linegraph-svg").selectAll(".ring-group").classed("faded", false);
    }

    get_cc_dict(edgeid){
        let cc_list;

        if(edgeid){
            cc_list = this.links_dict[edgeid][this.weight].cc_list;
            // this.links.forEach(link=>{
            //     let source_cc_idx = this.find_cc_idx(link.source.id, cc_list);
            //     let target_cc_idx = this.find_cc_idx(link.target.id, cc_list);
            //     if(source_cc_idx === target_cc_idx){
            //         link.distance = 10;
            //     } else {
            //         link.distance = 100;
            //     }

            // })

        } else {
            cc_list = [];
            this.nodes.forEach(n=>{
                cc_list.push([n.id]);
            })
            // this.links.forEach(link=>{
            //     link.distance = 100;
            // })
        }
        // this.simulation.force("link", d3.forceLink(this.links).distance(d => d.distance).id(d => d.id));
        // this.simulation.alpha(1).restart();
        // this.simulation.tick(300);
        // this.nodes_group.selectAll("circle")
        //     .attr("cx", d=>d.x)
        //     .attr("cy", d=>d.y)
        // this.links_group.selectAll("line")
        //     .attr("x1", d => d.source.x)
        //     .attr("y1", d => d.source.y)
        //     .attr("x2", d => d.target.x)
        //     .attr("y2", d => d.target.y);


        let cc_dict = {}
        cc_list.forEach(cc=>{
            let cc_id = "";
            let vertices = [];
            cc.forEach(nId=>{
                cc_id += nId + ",";
                vertices = vertices.concat(this.nodes_dict[nId].vertices)
            })
            cc_id = cc_id.substring(0, cc_id.length-1);
            vertices = [...new Set(vertices)];
            cc_dict[cc_id] = vertices;
        })
        return cc_dict;
    }

    graph_expansion(bar){
        let edge_id = bar.edge.source+"-"+bar.edge.target;
        console.log(edge_id)
        let persistence = bar.death - bar.birth;
        let source_cc = this.links_dict[edge_id][this.weight].nodes_subsets.source_cc;
        let target_cc = this.links_dict[edge_id][this.weight].nodes_subsets.target_cc;
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