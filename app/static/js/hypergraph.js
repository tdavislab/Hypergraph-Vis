class Hypergraph{
    constructor(hyper_data, svg_id, config, color_dict, labels, top5_edges=undefined){
        this.nodes = hyper_data.nodes;
        this.links = hyper_data.links;
        this.svg_id = svg_id;
        this.config = config;
        this.color_dict = color_dict;
        this.labels = labels;
        this.top_nodes = top5_edges;

        let vertices_list = this.nodes.filter(d => d.bipartite===0);
        let he_list = this.nodes.filter(d => d.bipartite===1);
        console.log("hypergraph", this.svg_id, "num_hyperedges="+he_list.length, "num_vertices="+vertices_list.length)

        console.log("links",this.links)
        console.log("nodes",this.nodes)
        // console.log(color_dict)

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
        
        
        this.radius_scale = d3.scaleLinear().domain([1, 8]).range([8,15]);

        this.vertices2he = d3.nest()
            .key(d => d.target)
            .rollup(d => d.map(node => node.source))
            .entries(this.links)
        this.vertices2he = Object.assign({}, ...this.vertices2he.map(s => ({[s.key]: s.value})));

        this.he2vertices = d3.nest()
            .key(d => d.source)
            .rollup(d => d.map(node => node.target))
            .entries(this.links)
        this.he2vertices = Object.assign({}, ...this.he2vertices.map(s => ({[s.key]: s.value})));

        this.if_hyperedge_glyph = d3.select("#hyperedge-glyph").property("checked");
        this.if_vertex_glyph = d3.select("#vertex-glyph").property("checked");

        let vertex_shape_dropdown = document.getElementById("vertex-shape-dropdown");
        this.vertex_shape = vertex_shape_dropdown.options[vertex_shape_dropdown.selectedIndex].value;

        let set_vis_dropdown = document.getElementById("set-vis-dropdown");
        let set_type = set_vis_dropdown.options[set_vis_dropdown.selectedIndex].value;
        this.get_simulation_coords();
        if(set_type === "graph"){
            this.draw_hypergraph();
        } else if(set_type === "matrix"){
            this.draw_hypergraph_matrix();
        } else{ // set_type === "bubblesets"
            this.draw_hypergraph_bubblesets()
        }

        // if(d3.select("#visual-encoding-switch").property("checked")){
        //     this.draw_hypergraph();

        // } else {
            // this.draw_hypergraph_matrix();
        // }
        this.toggle_hgraph_labels(); 
        this.toggle_hgraph_nodes(); 
        this.save_bipartite_graph();
    }

    save_bipartite_graph(){
        let nodes2save = [];
        let links2save = [];

        this.nodes.forEach(node=>{
            nodes2save.push({"x":node.x, "y":node.y});
        })
        this.links.forEach(link=>{
            links2save.push({"source":link.source.index , "target":link.target.index});
        })

        $.ajax({
            type: "POST",
            url: "/save_bipartite_graph",
            data: JSON.stringify({'nodes':nodes2save, 'links':links2save, 'svg_id':this.svg_id}),
            dataType:'text',
            success: function (response) {
                response = JSON.parse(response);
            },
            error: function (error) {
                console.log("error",error);
            }
        });

    }

    get_simulation_coords(){
        let distance_scale = d3.scaleLinear()
            .domain([1,10])
            .range([30,120])

        this.links.forEach(l=>{
            let source_size = l.source.split("|").length;
            let target_size = l.target.split("|").length;
            l.distance = distance_scale(Math.min((source_size+target_size)/2, 10));

        })

        this.simulation = d3.forceSimulation(this.nodes)
            .force("link", d3.forceLink(this.links).distance(d => d.distance).id(d => d.id))
            .force("charge", d3.forceManyBody(-500))
            .force("center", d3.forceCenter(this.svg_width/2, this.svg_height/2))
            .force("x", d3.forceX().strength(0.02))
            .force("y", d3.forceY().strength(0.03))
            .stop();
        this.simulation.tick(300);
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
        this.svg.selectAll(".convex_hull").attr("d", d=>this.groupPath(groups_dict[d.key]));
    }

    draw_nodes(){
        let that = this;
        
        let pie = d3.pie()
        .value(d => d.value)
        .sort(null);
        let arc = d3.arc().innerRadius(0);

        let singleton_type = d3.select('input[name="singleton-type"]:checked').node().value;  

        this.nodes.forEach(node=>{
            node.x0 = node.x;
            node.y0 = node.y;
        })

        let hg = this.nodes_group.selectAll("g").data(this.nodes.filter(d => d.bipartite===1));
        hg.exit().remove();
        hg = hg.enter().append("g").merge(hg)
            .attr("id", d=>this.svg_id+'-nodegroup-'+d.id.replace(/[|]/g,""))
            .attr("class", "he-group")

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

        vg.append("circle")
            .attr("r", d => this.get_node_radius(d.id))
            .attr("fill", "")
            // .style("fill", d => d.color)
            .attr("id", d => this.svg_id+'-node-'+d.id.replace(/[|]/g,""))
            .attr("cx", d=>d.x)
            .attr("cy", d=>d.y)
            .classed("vertex_node", true)
            .classed("grey_out", d=>{
                if(singleton_type === "grey_out" && d.if_singleton){
                    return true;
                } else { return false; }
            })
            .attr("visibility", ()=>{
                if(this.vertex_shape === "circle"){
                    return "visible";
                } else{
                    return "hidden";
                }
            })
        
        vg.append("rect")
            .attr("width", d => this.get_node_radius(d.id)*2)
            .attr("height", d => this.get_node_radius(d.id)*2)
            .attr("fill", "")
            // .style("fill", d => d.color)
            .attr("id", d => this.svg_id+'-node-'+d.id.replace(/[|]/g,""))
            .attr("x", d=>d.x-this.get_node_radius(d.id))
            .attr("y", d=>d.y-this.get_node_radius(d.id))
            .classed("vertex_node", true)
            .classed("grey_out", d=>{
                if(singleton_type === "grey_out" && d.if_singleton){
                    return true;
                } else { return false; }
            })
            .attr("visibility", ()=>{
                if(this.vertex_shape === "rect"){
                    return "visible";
                } else{
                    return "hidden";
                }
            });
                    
        vg.append("text")
            .attr("dx", 12)
            .attr("dy", "0.35em")
            .attr("x", d=>d.x)
            .attr("y", d=>d.y)
            .attr("class", "node-label")
            .attr("id", d => this.svg_id+'-text-'+d.id.replace(/[|]/g,""))
            .text(d => d.label);

        this.update_labels();

        let pg = hg.append("g")
        // let pg = vg.append("g")
            .attr("class", "pie-group")
            .attr("id", d => this.svg_id+"-pie-"+d.id.replace(/[|]/g,""))
            .attr("transform",d => "translate("+d.x+","+d.y+")")
            .attr("visibility", ()=>{
                if(this.if_hyperedge_glyph){
                    return "visible";
                } else { 
                    return "hidden";
                }
            });

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

        this.svg.selectAll(".vertex_node")
            .attr("fill", d => {
                if(d.id.split("|").length === 1){
                    return "black";
                }
                if(this.if_vertex_glyph){
                    return "white";
                } else {
                    return "black";
                }
            })
            .attr("stroke", d=>{
                if(d.id.split("|").length === 1){
                    return "whitesmoke";
                }
                if(this.if_vertex_glyph){
                    return "black";
                } else {
                    return "whitesmoke";
                }
            });

        let rg = vg.append("g")
            .attr("class", "ring-group")
            .attr("id", d => this.svg_id+"-ring-"+d.id.replace(/[|]/g,""))
            .attr("transform",d => "translate("+d.x+","+d.y+")")
            .attr("visibility", (d)=>{
                if(d.id.split("|").length === 1){
                    return "hidden"
                }
                else if(this.if_vertex_glyph){
                    return "visible";
                }
                else { 
                    return "hidden";
                }
            });

        rg.selectAll("circle").data(d => prepare_ring_data(d))
            .enter().append("circle")
            .attr("r", (d,i) => Math.max(d.r-2*i-2, 0))
            .attr("stroke", d=>d.color)
            .attr("stroke-width", 2)
            .attr("fill", "#fff")
            .classed("grey_out", d=>{
                if(singleton_type === "grey_out" && d.if_singleton){
                    return true;
                } else { return false; }
            })
            // .attr("visibility", ()=>{
            //     if(this.vertex_shape === "circle" && d3.select("#vertex-glyph").property("checked")){
            //         return "visible";
            //     } else{
            //         return "hidden";
            //     }
            // });

        rg.selectAll("rect").data(d => prepare_ring_data(d))
            .enter().append("rect")
            .attr("width", (d,i) => Math.max(d.r-2*i-2, 0)*2)
            .attr("height", (d,i) => Math.max(d.r-2*i-2, 0)*2)
            .attr("transform", (d,i)=> "translate("+(-Math.max(d.r-2*i-2, 0))+","+(-Math.max(d.r-2*i-2, 0))+")")
            .attr("stroke", d=>d.color)
            .attr("stroke-width", 2)
            .attr("fill", "#fff")
            .classed("grey_out", d=>{
                if(singleton_type === "grey_out" && d.if_singleton){
                    return true;
                } else { return false; }
            })
            // .attr("visibility", ()=>{
            //     if(this.vertex_shape === "rect" && d3.select("#vertex-glyph").property("checked")){
            //         return "visible";
            //     } else{
            //         return "hidden";
            //     }
            // });

        function prepare_pie_data (key) {
                // let p2val = {"h5|h6":{"h5":0.25, "h6":0.2}, "h1|h2":{"h1":0.15, "h2":0.11}, "h3|h4":{"h3":0.21, "h4":0.06}} // hyperedge matching 1
    
                // let p2val = {"h1|h2":{"h2":0.096, "h1":0.273}, "h3|h4":{"h4":0.086, "h3":0.282}, "h5|h6":{"h6":0.036, "h5":0.227}} // hyperedge matching 2
    
                // let p2val = {"v1|v2":{"v1":0.111, "v2":0.032}, "v3|v4":{"v3":0.111, "v4":0.032}, "v7|v8|v9":{"v7":0.079, "v8":0.026, "v9":0.190}} // vertex matching 1
    
                // let p2val = {"v1|v2":{"v1":0.144, "v2":0.078}, "v4|v5":{"v4":0.1, "v5":0.021}, "v6|v7":{"v6":0.1, "v7":0.021}, "v8|v9":{"v8":0.1, "v9":0.021}} // vertex matching 2
    
                let id_list = key.split("|");
                if(id_list.length > 8) {
                    id_list = id_list.slice(0,8);
                }
                let pie_data = [];
                id_list.forEach(id=>{
                    let p = {};
                    p.value = 10;
                    // if(Object.keys(p2val).indexOf(key)!=-1){
                    //     p.value = p2val[key][id]
                    // } else{
                    //     p.value = 1
                    // }
                    // console.log(key, id, p.value)
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
    }

    draw_hypergraph(){
        this.svg_g.remove();
        this.svg_g = this.svg.append("g");
        this.links_group = this.svg_g.append("g")
            .attr("id", "hyper_links_group");
        this.nodes_group = this.svg_g.append("g")
            .attr("id", "hyper_nodes_group");
        this.vertices_group = this.svg_g.append("g")
            .attr("id", "hyper_vertices_group");
        
        this.annotate_group = this.svg_g.append("g")
        .attr("id", "hyper_annotate_group");

        let color_group = this.svg_g.append("g")
            .attr("id", "color_choices_group")

        let colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        let pie = d3.pie()
            .value(d => d.value)
            .sort(null);

        let arc = d3.arc().innerRadius(0);

        let color_selector_list = color_group.append("g")
            .attr("class", "color-selector-list-group")
            .attr("visibility", "hidden")

        let color_selector = color_group.append("g")
            .attr("class", "color-selector")
            .attr("id", this.svg_id + "-color-selector")
            .attr("visibility", "hidden")
            .on("mouseover", ()=>{
                color_selector.attr("opacity", 0.5);
            })
            .on("mouseout", ()=>{
                color_selector.attr("opacity", 1);
            })
            .on("click", ()=>{
                d3.select("#"+this.svg_id + "-color-selector")
                    .attr("visibility", "hidden")
                color_selector_list
                    .attr("transform", "translate("+(d3.event.x-250)+","+(d3.event.y-50)+")")
                    .attr("visibility", "visible")
            })
        color_selector.append("rect")
            .attr("id", "color-selector-background")
            .attr("transform",d => "translate("+(-12)+","+(-12)+")")
            .attr("width", 24)
            .attr("height", 24)
            .attr("fill", "linen")
            .attr("stroke", "gray")
        let color_selector_pie = color_selector.append("g")
            .attr("class", "color-selector-pie-group")
            
        let color_pie_data = [];
        for(let i=0; i<8; i++){
            color_pie_data.push({"color":colorScale(i), "value":8});
        }
        color_selector_pie.selectAll("path").data(pie(color_pie_data))
            .enter().append("path")
            .attr("d", d => {
                arc.outerRadius(10);
                return arc(d)})
            .attr("fill", d => d.data.color)
            .attr("stroke", "whitesmoke")
            .attr("stroke-width", "1px")

        let color_bar_list = [];
        for(let i=0; i<10; i++){
            color_bar_list.push(colorScale(i))
        }
        
        color_selector_list.selectAll("rect").data(color_bar_list)
            .enter().append("rect")
            .classed("color_bars", true)
            .attr("id", (d,i) => this.svg_id+"-color-bars-"+i)
            .attr("x", (d,i) => i*20)
            .attr("y", 0)
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", d => d)
            .attr("stroke", "gray")
            .attr("stroke-width", 1)
            .on("mouseover", (d,i)=>{
                d3.select("#"+this.svg_id+"-color-bars-"+i).attr("opacity", 0.5);
            })
            .on("mouseout", (d,i)=>{
                d3.select("#"+this.svg_id+"-color-bars-"+i).attr("opacity", 1);
            })
            .on("click", (d)=>{
                if(this.rightclick_edge){
                    let c = d;
                    this.color_dict[this.rightclick_edge] = d;
                    d3.select("#"+this.svg_id+"-hull-"+this.rightclick_edge.replace(/[|]/g,""))
                        .attr("fill", c)
                        .attr("stroke",c)
                    d3.select("#"+this.svg_id+'-node-'+this.rightclick_edge.replace(/[|]/g,""))
                        .attr("fill", c)
                    d3.select("#"+this.svg_id+"-pie-"+this.rightclick_edge.replace(/[|]/g,""))
                        .selectAll("path")
                        .attr("fill", c)

                }   
            })

        let that = this;

        let singleton_type = d3.select('input[name="singleton-type"]:checked').node().value;  
        
        this.draw_nodes();

        this.svg.selectAll(".he-group")
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
                .on("end", dragended))
            .on("contextmenu", d => rightclick(d.id));

            this.svg.selectAll(".v-group")
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
            })
            .on("contextmenu", d => rightclick(d.key));

        // ========================= Path segments ============================
        let intersection_num = this.compute_intersection_num(groups);
        console.log(this.svg_id, "intersection_num", intersection_num);

        //add zoom capabilities
        const zoom_handler = d3.zoom()
            .on("zoom", zoom_actions);

        // drag_handler(ng);
        zoom_handler(this.svg);

        function dragstarted(d) {
            that.dragStarted = true;
        }

        function dragged(d) {
            d3.select("#"+that.svg_id+"-pie-"+d.id.replace(/[|]/g,"")).attr("transform","translate("+d3.event.x+","+d3.event.y+")");
            d3.select("#"+that.svg_id+"-ring-"+d.id.replace(/[|]/g,"")).attr("transform","translate("+d3.event.x+","+d3.event.y+")");
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

        function rightclick(key){
            d3.event.preventDefault();
            d3.select("#"+that.svg_id+"-color-selector")
                .attr("transform", "translate("+(d3.event.x-250)+","+(d3.event.y-50)+")")
                .attr("visibility", ()=>{
                    if(d3.select("#"+that.svg_id+"-color-selector").attr("visibility") === "visible"){
                        return "hidden"
                    } else{
                        return "visible"
                    }
                    
                })
            color_selector_list.attr("visibility", "hidden");
            that.rightclick_edge = key
        }

        function mouseover(key) {
            if(!that.click_id){
                let label_list = that.nodes_dict[key].label.split("|");
                let div_text = '';
                label_list.forEach(label=>{ div_text += label+"<br> "; });
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
                d3.select("#simplified-linegraph-svg").selectAll(".line_node").classed("faded",  d => {
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
                d3.select("#linegraph-svg").selectAll(".ring-group").classed("faded", d => {
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
                d3.select("#simplified-linegraph-svg").selectAll(".ring-group").classed("faded", d => {
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
            d3.select("#hypergraph-svg").selectAll(".he-group").classed("faded", true);
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
                d3.select("#linegraph-svg").selectAll(".ring-group").classed("faded", d=>{
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
                    if(d.id.split("|").indexOf(v_list[0])!=-1){
                        return false;
                    } else { return true; }
                })
                d3.select("#simplified-linegraph-svg").selectAll(".ring-group").classed("faded", d=>{
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

    compute_intersection_num(groups){
        // console.log("compute intersection num");
        let paths = this.get_path_pieces(groups);
        // console.log(groups)
        // console.log(paths)
        let colorScale = d3.scaleOrdinal(d3.schemeCategory10);
        // for(let i=0; i<paths.length; i++){
        //     let path_i_g = this.annotate_group.append("g")
        //     path_i_g.selectAll("circle").data(paths[i])
        //         .enter().append("circle")
        //         .attr("cx", d=>d.x)
        //         .attr("cy", d=>d.y)
        //         .attr("r", d=>{
        //             if(d.type==="inner"){
        //                 return "2"
        //             } else{
        //                 return "3"
        //             }
        //         })
        //         .attr("fill", d=>{
        //             if(d.type === "center"){
        //                 return "grey";
        //             } else{
        //                 return colorScale(i);
        //             }
        //             })
        // }
        let intersection_num = 0;
        for(let i=0; i<(paths.length-1); i++){
            for(let j=(i+1); j<paths.length; j++){
                intersection_num += this.ifPathIntersect(paths[i], paths[j]);
                // if(this.ifPathIntersect(paths[i], paths[j])){
                //     console.log("true")
                //     intersection_num += 1;
                // }
            }
        }
        return intersection_num;
    }

    ifPathIntersect(p1, p2){
        let intersection_num = 0;
        for(let i=1; i<p1.length; i++){
            for(let j=1; j<p2.length; j++){
                let line1 = [p1[i-1], p1[i]];
                let line2 = [p2[j-1], p2[j]];
                if(this.ifLineIntersect(line1, line2)){
                    intersection_num += 1;
                }
            }
        }
        return intersection_num;
    }

    ifLineIntersect(line1, line2){
        let pt1 = line1[0];
        let pt2 = line1[1];
        let pt3 = line2[0];
        let pt4 = line2[1];
        let x;
        let y;
        if(pt1.x===pt2.x&&pt3.x===pt4.x) { // if two lines are both vertical
            if(pt1.x===pt3.x) {
                if((pt3.y<=Math.max(pt1.y,pt2.y) && pt3.y>=Math.min(pt1.y,pt2.y))||(pt4.y<=Math.max(pt1.y,pt2.y) && pt4.y>=Math.min(pt1.y,pt2.y))){
                    return true;
                } else{
                    return false;
                }
            } else {
                return false;
            }
        } else if(pt1.x===pt2.x) { // if line1 is vertical
            let a2 = (pt3.y-pt4.y)/(pt3.x-pt4.x);
            let b2 = pt3.y - a2*pt3.x;
            x = pt1.x;
            y = a2*x+b2;
        } else if(pt3.x===pt4.x) { // if line2 is vertical
            let a1 = (pt1.y-pt2.y)/(pt1.x-pt2.x);
            let b1 = pt1.y - a1*pt1.x;
            x = pt3.x;
            y = a1*x+b1;
        } else {
            let a1 = (pt1.y-pt2.y)/(pt1.x-pt2.x);
            let b1 = pt1.y - a1*pt1.x;
            let a2 = (pt3.y-pt4.y)/(pt3.x-pt4.x);
            let b2 = pt3.y - a2*pt3.x;
            if(a1===a2) {
                if(b1 === b2){ // if two lines are identical
                    if((pt3.y<=Math.max(pt1.y,pt2.y) && pt3.y>=Math.min(pt1.y,pt2.y))||(pt4.y<=Math.max(pt1.y,pt2.y) && pt4.y>=Math.min(pt1.y,pt2.y))){
                        return true;
                    } else{
                        return false;
                    }
                } else { // parallel
                    return false;
                }
            } else {
                x = (b2-b1)/(a1-a2);
                y = (a1*b2-a2*b1)/(a1-a2);
            }
        }
        if((Math.min(pt1.x,pt2.x)<=x && x<=Math.max(pt1.x,pt2.x))&&(Math.min(pt1.y,pt2.y)<=y && y<=Math.max(pt1.y,pt2.y))&&(Math.min(pt3.x,pt4.x)<=x && x<=Math.max(pt3.x,pt4.x))&&(Math.min(pt3.y,pt4.y)<=y && y<=Math.max(pt3.y,pt4.y))){
            return true;
        } else { 
            return false;
        }
    }

    get_path_pieces(groups){
        let num_pieces = 10;
        let path_padding = 20;
        let paths = [];
        // let centers = [];
        for(let g of groups){
            if(g.value.length > 1){
                let path = d3.select("#"+this.svg_id+"-hull-"+g.key.replace(/[|]/g,"")).node();
                let pieces = [];
                let path_length = path.getTotalLength();
                let step_length = path_length / num_pieces;
                // get the center of path
                let cpt1 = path.getPointAtLength(1/2*path_length);
                let cpt2 = path.getPointAtLength(0);
                
                let cx = (cpt1.x + cpt2.x)/2;
                let cy = (cpt1.y + cpt2.y)/2;
                // centers.push([{"x":cx, "y":cy}])
                // get points on path
                for(let i=0; i<num_pieces; i++){
                    let pt = path.getPointAtLength(i*step_length);
                    let d = Math.sqrt(Math.pow(cx-pt.x, 2)+Math.pow(cy-pt.y, 2));
                    let x1 = (path_padding+d)/d * pt.x - path_padding/d * cx;
                    let y1 = (path_padding+d)/d * pt.y - path_padding/d * cy;
                    pieces.push({"x":x1, "y":y1});
                }
                paths.push(pieces);
            }
        }
        return paths;
    }

    draw_hypergraph_matrix(){
        this.svg_g.remove();
        this.svg_g = this.svg.append("g");
        this.border_group = this.svg_g.append("g")
            .attr("id", "hyper_border_group");
        this.nodes_id_group = this.svg_g.append("g")
            .attr("id", "hyper_nodes_id_group");
        this.rect_group = this.svg_g.append("g")
            .attr("id", "hyper_rect_group");
        this.line_group = this.svg_g.append("g")
            .attr("id", "hyper_line_group");

        let vertices_list = this.nodes.filter(d => d.bipartite===0);
        let he_list = this.nodes.filter(d => d.bipartite===1);

        let vertices_id_list = [];
        let he_id_list = [];
        vertices_list.forEach(v=>{
            vertices_id_list.push(v.id);
        })
        he_list.forEach(he=>{
            he_id_list.push(he.id);
        })

        let he_vertices = {};
        this.links.forEach(l=>{
            if(l.source.id){
                if(Object.keys(he_vertices).indexOf(l.source.id)===-1){
                    he_vertices[l.source.id] = [vertices_id_list.indexOf(l.target.id)];
                } else{
                    he_vertices[l.source.id].push(vertices_id_list.indexOf(l.target.id));
                }
            } else {
                if(Object.keys(he_vertices).indexOf(l.source)===-1){
                    he_vertices[l.source] = [vertices_id_list.indexOf(l.target)];
                } else{
                    he_vertices[l.source].push(vertices_id_list.indexOf(l.target));
                }
            }
            
        })

        let he_vertices_id_list = []        
        for(let he in he_vertices){
            let min_idx = Math.min(...he_vertices[he]);
            let max_idx = Math.max(...he_vertices[he]);
            for(let i=min_idx; i<=max_idx; i++){
                he_vertices_id_list.push([he, vertices_id_list[i]])
            }
        }
        
        let table_margins = {'left':10, 'right':10, 'top':20, 'bottom':10}
        let cell_height = (this.svg_height-table_margins.top-table_margins.bottom)/(vertices_list.length+1);
        let cell_width = this.svg_width - table_margins.left - table_margins.right;

        // let node_id_width = 1/3*cell_width;
        // let he_width = 2/3*cell_width / he_list.length;

        let node_id_width = 0;
        let he_width = cell_width / he_list.length;

        // draw table lines 
        let bg = this.border_group.selectAll("line").data(vertices_list.concat(["bottom"]));
        bg = bg.enter().append("line").merge(bg)
            .attr("class", "matrix_border")
            .attr("x1", table_margins.left)
            .attr("y1", (d,i)=>table_margins.top + i*cell_height)
            .attr("x2", table_margins.left + cell_width)
            .attr("y2", (d,i)=>table_margins.top + i*cell_height)
            .attr("stroke", "grey")
            .style("opacity", 0.3);

        // let tg = this.nodes_id_group.selectAll("text").data(vertices_list);
        // tg = tg.enter().append("text").merge(tg)
        //     .attr("class", "matrix_node_id")
        //     .attr("x",table_margins.left)
        //     .attr("y",(d,i)=>table_margins.top + (i+0.8)*cell_height)
        //     .text(d=>d.id)
        //     .style("opacity", 0.8);

        let rg = this.rect_group.selectAll("rect").data(this.links);
        rg = rg.enter().append("rect").merge(rg)
            .attr("x", d=>{
                if(d.source.id){
                    return table_margins.left + node_id_width + he_width * he_id_list.indexOf(d.source.id);
                } else {
                    return table_margins.left + node_id_width + he_width * he_id_list.indexOf(d.source);
                }
            })
            .attr("y", d=>{
                if(d.target.id){
                    return table_margins.top + vertices_id_list.indexOf(d.target.id)*cell_height;
                } else {
                    return table_margins.top + vertices_id_list.indexOf(d.target)*cell_height;
                }
            })
            .attr("width", 2/3*he_width)
            .attr("height", cell_height)
            .attr("fill", d=>{
                if(d.source.id){
                    return this.color_dict[d.source.id.split("|")[0]];
                } else {
                    return this.color_dict[d.source.split("|")[0]];
                }
            })
            .style("opacity", 1)
            .on("mouseover", (d)=>{
                let hyperedge_labels = this.nodes_dict[d.source.id].label.split("|");
                let hyperedge_text = '';
                hyperedge_labels.forEach(l=>{ hyperedge_text += l + "<br> "; });
                let vertex_labels = this.nodes_dict[d.target.id].label.split("|");
                let vertex_text = '';
                vertex_labels.forEach(v=>{ vertex_text += v + "<br> ";})
                let div = d3.select("#help-tip");
                div.classed("show", true);
                // div.html("<h6>Selected Hyperedges</h6>" + hyperedge_text + "<br> <h6>Selected Vetices</h6>" + vertex_labels);
                div.html("<h6>Selected Vetices</h6>" + vertex_labels);

            })
            .on("mouseout", (d)=>{
                d3.select("#help-tip").classed("show", false);
            });
        
        let lg = this.line_group.selectAll("line").data(he_vertices_id_list);
        lg = lg.enter().append("line").merge(lg)
            .attr("x1", d=>table_margins.left + node_id_width + he_width * he_id_list.indexOf(d[0])+he_width/3)
            .attr("y1", d=>table_margins.top + vertices_id_list.indexOf(d[1])*cell_height)
            .attr("x2", d=>table_margins.left + node_id_width + he_width * he_id_list.indexOf(d[0])+he_width/3)
            .attr("y2", d=>table_margins.top + (vertices_id_list.indexOf(d[1])+1)*cell_height)
            .attr("stroke", d=>this.color_dict[d[0].split("|")[0]])
            .style("opacity", 0.5)
            .style("stroke-width", 0.1)
    }

    draw_hypergraph_bubblesets(){
        this.svg_g.remove();
        this.svg_g = this.svg.append("g");

        let that = this;
        
        var size = 8;
        var pad = 5;
        var bubbles = new BubbleSet();

        let he_list = this.nodes.filter(d => d.bipartite===1);
        let vertices_list = this.nodes.filter(d => d.bipartite===0);
        let all_rects = vertices_list.map(v=>ixToRectangle(v))

        he_list.forEach(he=>{
            let v_list = this.he2vertices[he.id]
            let rects = all_rects.filter(v=>v_list.indexOf(v.id)!=-1);
            let others = all_rects.filter(v=>v_list.indexOf(v.id)===-1);
            doBubbles(rects, others, this.color_dict[he.id.split("|")[0]]);
        })

        all_rects.forEach(function(rect) {
            createRectangle(rect);
          });
        
        function ixToRectangle(node) {
            return {
                "id": node.id,
                "x": node.x - size * 0.5,
                "y": node.y - size * 0.5,
                "width": size,
                "height": size,
            };
          }

          function doBubbles(rects, others, color) {
            var rectSets = [rects, others];
            var list = bubbles.createOutline(
              BubbleSet.addPadding(rectSets[0], pad),
              BubbleSet.addPadding(rectSets[1], pad),
            );
            var outline = new PointPath(list).transform([
              new ShapeSimplifier(0.0),
              new BSplineShapeGenerator(),
              new ShapeSimplifier(0.0),
            ]);
            that.svg_g.append("path")
                .attr("d", outline.toString())
                .attr("fill", color)
                .attr("opacity", 0.5)
          }
          
          function createRectangle(rect) {
            // that.svg_g.append("rect")
            //     .attr("x", rect["x"])
            //     .attr("y", rect["y"])
            //     .attr("width", rect["width"])
            //     .attr("height", rect["height"])
            //     .attr("fill", "silver")
            //     .attr("stroke", "black");

            that.svg_g.append("circle")
                .attr("cx", rect["x"])
                .attr("cy", rect["y"])
                .attr("r", that.get_node_radius(rect.id))
                .attr("fill", "")
                .attr("class", "vertex_node")
                .attr("stroke", "whitesmoke");
          }
    }

    cancel_faded(){
        d3.select("#hypergraph-svg").selectAll(".convex_hull").classed("faded", false);
        d3.select("#hypergraph-svg").selectAll(".he-group").classed("faded", false);
        d3.select("#hypergraph-svg").selectAll(".v-group").classed("faded", false);

        d3.select("#simplified-hypergraph-svg").selectAll(".convex_hull").classed("faded", false);
        d3.select("#simplified-hypergraph-svg").selectAll(".he-group").classed("faded", false);
        d3.select("#simplified-hypergraph-svg").selectAll(".v-group").classed("faded", false);

        d3.select("#linegraph-svg").selectAll(".line_node").classed("faded", false);
        d3.select("#simplified-linegraph-svg").selectAll(".line_node").classed("faded", false);
        d3.select("#linegraph-svg").selectAll("line").classed("faded", false);
        d3.select("#simplified-linegraph-svg").selectAll("line").classed("faded", false);

        d3.select("#linegraph-svg").selectAll(".pie-group").classed("faded", false);
        d3.select("#simplified-linegraph-svg").selectAll(".pie-group").classed("faded", false);
        d3.select("#linegraph-svg").selectAll(".ring-group").classed("faded", false);
        d3.select("#simplified-linegraph-svg").selectAll(".ring-group").classed("faded", false);
    }

    toggle_hgraph_nodes(){
        try {
            // Set show-labels to false at beginning
            this.update_hypernodes();
            d3.select("#hide-hyperedge-node").on("change", this.update_hypernodes);
    
        } catch (e) {
            console.log(e);
        }     
    }

    update_hypernodes() {
        if(d3.select("#hide-hyperedge-node").property("checked")){
            d3.selectAll(".he-group").attr("opacity",0);
            d3.selectAll(".hyper_edge").attr("opacity",0);
        } else {
            d3.selectAll(".he-group").attr("opacity",1);
            d3.selectAll(".hyper_edge").attr("opacity",0.5);
        }
        
    }

    toggle_hgraph_labels(){
        try {
            // Set show-labels to false at beginning
            this.update_labels();
            d3.select("#hgraph-labels").on("change", this.update_labels);
    
        } catch (e) {
            console.log(e);
        }                       
    }

    update_labels() {
        if (d3.select("#hgraph-labels").property("checked")) {
            d3.selectAll(".node-label").attr("visibility", "visible");

        } else {
            d3.selectAll(".node-label").attr("visibility", "hidden");
        }
    }
}