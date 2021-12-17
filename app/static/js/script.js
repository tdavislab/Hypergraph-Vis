init();

function init(){
    draw_edge_color_legend();

    // Initialization 
    read_hgraph_text("hypergraph_samples");
    
    $("#import").click(function(){
        $("#files").click();
    });

    d3.select("#files")
        .on("change", ()=>{
            let files = $('#files')[0].files[0]
            let fileReader = new FileReader();
            fileReader.onload = function(fileLoadedEvent) {
                let textFromFileLoaded = fileLoadedEvent.target.result;
                read_hgraph_text(textFromFileLoaded);
            }
            fileReader.readAsText(files, "UTF-8");
        })

    d3.select("#export")
        .on("click", ()=>{
            let v = $("#exFilename").val();
            console.log(v)
            $.post( "/export", {
                javascript_data: JSON.stringify(v)
            });
           
            alert("Output has been saved at: Hypergraph-Vis⁩/⁨app⁩/⁨static/downloads/");
        })

    d3.select("#reset_config")
        .on("click", ()=>{
            reset_config()});
    
    d3.select("#graph_loader")
        .on("click", ()=>{
            let current_config = get_current_config();
            $.ajax({
                type: "POST",
                url: "/reload_graphs",
                data: JSON.stringify(current_config),
                dataType:'text',
                success: function (response) {
                    reset_visual_encoding();
                    if(current_config.variant === "clique_expansion"){
                        d3.select("#hyperedge-glyph").property("checked", false);
                        d3.select("#vertex-glyph").property("checked", true);
                    }
                    load_data(JSON.parse(response), current_config);
                },
                error: function (error) {
                    console.log("error",error);
                }
            });
        })

    // change s value
    let s_value_slider = document.getElementById("s-walk_input");
    s_value_slider.oninput = function(){
        d3.select("#s-walk_label").html(this.value);
    }
    let s_range_container = document.getElementById("s-range-container-inner");
    d3.select("#s-group-title")
        .on("click", ()=>{
            if(s_range_container.style.maxHeight){
                s_range_container.style.maxHeight = null;
            } else{
                s_range_container.style.maxHeight = s_range_container.scrollHeight + "px";
            }
        })
    let s_range = document.getElementById("s-range")
    s_range.oninput = function(){
        console.log(this.value)
        d3.select("#s-walk_input").property("max", this.value)
    }

    // change hypergraph visual encoding
    d3.select("#visual-encoding-form")
        .on("change", ()=>{
            let encoding_type = d3.select('input[name="visual-type"]:checked').node().value;
            if(encoding_type === "bipartite"){
                d3.selectAll(".convex_hull").style("visibility","hidden");
            } else if(encoding_type === "convex"){
                d3.selectAll(".convex_hull").style("visibility","visible");
            }
        });
    
    

    // vertex shape
    let vertex_shape_dropdown = document.getElementById("vertex-shape-dropdown");
    let vertex_shape = vertex_shape_dropdown.options[vertex_shape_dropdown.selectedIndex].value;
    vertex_shape_dropdown.onchange = function(){
        vertex_shape = vertex_shape_dropdown.options[vertex_shape_dropdown.selectedIndex].value;
        if(vertex_shape === "circle"){
            d3.selectAll(".v-group").select("circle")
                .attr("visibility", "visible");
            d3.selectAll(".v-group").select("rect")
                .attr("visibility", "hidden");
            if(d3.select("#vertex-glyph").property("checked")){
                d3.selectAll(".ring-group").selectAll("circle").
                    attr("visibility", (d)=>{
                        if(d.parent_id.split("|").length === 1){
                            return "hidden"
                        } else {
                            return "visible"
                        }
                    });
                d3.selectAll(".ring-group").selectAll("rect").attr("visibility", "hidden");
            }
        } else if(vertex_shape == "rect"){
            d3.selectAll(".v-group").select("circle")
                .attr("visibility", "hidden");
            d3.selectAll(".v-group").select("rect")
                .attr("visibility", "visible");
            if(d3.select("#vertex-glyph").property("checked")){
                d3.selectAll(".ring-group").selectAll("circle").attr("visibility", "hidden");
                d3.selectAll(".ring-group").selectAll("rect").attr("visibility", (d)=>{
                    if(d.parent_id.split("|").length === 1){
                        return "hidden"
                    } else {
                        return "visible"
                    }
                });
            }
        }       
    }

    // show / hide glyphs
    d3.select("#hyperedge-glyph")
        .on("change", ()=>{
            if(d3.select("#hyperedge-glyph").property("checked")){
                d3.selectAll(".pie-group").attr("visibility", "visible");
            } else {
                d3.selectAll(".pie-group").attr("visibility", "hidden");
            }
        })

    d3.select("#vertex-glyph")
        .on("change", ()=>{
            if(d3.select("#vertex-glyph").property("checked")){
                d3.selectAll(".vertex_node")
                    .attr("fill", (d)=>{
                        if(d.id.split("|").length === 1){
                            return "black";
                        } else {
                            return "white";
                        }
                    })
                    .attr("stroke", (d)=>{
                        if(d.id.split("|").length === 1){
                            return "whitesmoke";
                        } else {
                            return "black";
                        }
                    })

                if(vertex_shape === "circle"){
                    d3.selectAll(".ring-group").selectAll("rect")
                        .attr("visibility", "hidden");
                    d3.selectAll(".ring-group").selectAll("circle")
                        .attr("visibility", (d)=>{
                            if(d.parent_id.split("|").length === 1){
                                return "hidden"
                            } else {
                                return "visible"
                            }
                        });
                } else {
                    d3.selectAll(".ring-group").selectAll("circle")
                        .attr("visibility", "hidden");
                    d3.selectAll(".ring-group").selectAll("rect")
                        .attr("visibility", (d)=>{
                            if(d.parent_id.split("|").length === 1){
                                return "hidden"
                            } else {
                                return "visible"
                            }
                        });
                }
                // .classed("vertex_node-container", (d)=>{
                //     if(d.id.split("|").length === 1){
                //         return "false";
                //     } else{
                //         return "true";
                //     }
                // });
                d3.selectAll(".line_node-container").attr("stroke", (d)=>{
                    if(d.id.split("|").length === 1){
                        return d.color;
                    } else {
                        return "black";
                    }
                })
            } else {
                d3.selectAll(".ring-group").selectAll("circle").attr("visibility", "hidden");
                d3.selectAll(".ring-group").selectAll("rect").attr("visibility", "hidden");
                d3.selectAll(".vertex_node")
                    .attr("fill", "black")
                    .attr("stroke", "whitesmoke");
                d3.selectAll(".line_node-container").attr("stroke", d=>d.color)
            }
        })

    // hide hyperedge node
    // d3.select("#hide-hyperedge-node")
    //     .on("change", ()=>{
    //         if(d3.select("#hide-hyperedge-node").property("checked")){
    //             d3.selectAll(".he-group").attr("opacity",0);
    //             d3.selectAll(".hyper_edge").attr("opacity",0);
    //         } else {
    //             d3.selectAll(".he-group").attr("opacity",1);
    //             d3.selectAll(".hyper_edge").attr("opacity",0.5);
    //         }
    //     })

    // block control
    let coll  = document.getElementsByClassName("block_title");
    for(let i=0; i<coll.length; i++){
        coll[i].addEventListener("click", function(){
            this.classList.toggle("collapsed")
            let block_body = this.nextElementSibling;
            if (block_body.style.maxHeight){
                block_body.style.maxHeight = null;
            } else {
                block_body.style.maxHeight = block_body.scrollHeight + "px";
                // block_body.style.maxHeight = "1000px";
            } 
        })
    }

    // change edge color
    let color_scale = d3.interpolateGreys;
    let edge_color_slider = document.getElementById("edge-color_input");
    edge_color_slider.oninput = function(){
        // d3.select("#s-walk_label").html(this.value)
        console.log(this.value)
        d3.selectAll(".hyper_edge")
        // d3.selectAll("line")
            .attr("stroke", color_scale(this.value))
    }

}

function load_data(data, config) {
    if(config.variant === "line_graph"){
        d3.select("#vis-linegraph-title").html("Line graph")
        d3.select("#vis-simplified-linegraph-title").html("Simplified line graph")
    } else { // config.variant === "clique_expansion"
        d3.select("#vis-linegraph-title").html("Clique expansion")
        d3.select("#vis-simplified-linegraph-title").html("Simplified clique expansion")
    }
    console.log(data)
    console.log(config)

    let labels = data.labels;
    let singletons = data.line_data.singletons;
    let color_dict = assign_hyperedge_colors(data, data.id2color);
    let top5_edges = data.top5_edges;

    $.ajax({
        type: "POST",
        url: "/id2color",
        data: JSON.stringify(color_dict),
        dataType:'text',
        success: function (response) {
            console.log("success")
        },
        error: function (error) {
            console.log("error",error);
        }
    });

    assign_hyperedge_labels(data.hyper_data, data.line_data, labels);
    let hyperedges2vertices = Object.assign({}, ...data.line_data.nodes.map((x) => ({[x.id]: x.vertices})));

    console.log(hyperedges2vertices)
    let [hypergraph, linegraph, simplified_hypergraph, simplified_linegraph, barcode] = initialize_graphs(data.hyper_data, data.line_data, data.barcode_data, config, color_dict, labels, top5_edges);

    let info_dropdown = document.getElementById("info_selection");
    info_dropdown.onchange = function(){
        let info_type = info_dropdown.options[info_dropdown.selectedIndex].text;
        if(info_type === "Selected Hyperedges/Vertices") {
            // add tooltip
            barcode.draw_tooltip();
        } else if (info_type === "Barcode Merge Tree"){
            barcode.draw_merge_tree();
        } else if (info_type === "Persistence Graph"){
            barcode.draw_persistent_graph();
        } else if (info_type === "Threshold History"){
            barcode.draw_threshold_history();
        }
    }

    let set_vis_dropdown = document.getElementById("set-vis-dropdown");
    set_vis_dropdown.onchange = function(){
        let set_vis_type = set_vis_dropdown.options[set_vis_dropdown.selectedIndex].value;
        if(set_vis_type === "graph"){
            hypergraph.draw_hypergraph();
            simplified_hypergraph.draw_hypergraph();
            linegraph.draw_linegraph();
            simplified_linegraph.draw_linegraph();
        } else if(set_vis_type === "matrix"){
            hypergraph.draw_hypergraph_matrix();
            simplified_hypergraph.draw_hypergraph_matrix();
            linegraph.draw_linegraph_matrix();
            simplified_linegraph.draw_linegraph_matrix();
        } else { // set_vis_type === "bubblesets"
            hypergraph.draw_hypergraph_bubblesets();
            simplified_hypergraph.draw_hypergraph_bubblesets();
            linegraph.draw_linegraph();
            simplified_linegraph.draw_linegraph();

        }
    }

    // color scheme
    let color_scheme_dropdown = document.getElementById("color-scheme-dropdown");
    let color_scheme = color_scheme_dropdown.options[color_scheme_dropdown.selectedIndex].value;
    color_scheme_dropdown.onchange = function(){
        color_scheme = color_scheme_dropdown.options[color_scheme_dropdown.selectedIndex].value;
        console.log(color_scheme)
        hypergraph.update_coloring(color_scheme);
        simplified_hypergraph.update_coloring(color_scheme);
        linegraph.update_coloring(color_scheme);
        simplified_linegraph.update_coloring(color_scheme);
    }

    d3.selectAll(".color_bars")
        .on("click", (d)=>{
            console.log(d)
            let c = d;
            if(hypergraph.rightclick_edge){
                let rightclick_edge = hypergraph.rightclick_edge;
                hypergraph.top_nodes.push(rightclick_edge);
                hypergraph.nodes_dict[rightclick_edge].color = c;
                hypergraph.color_dict[rightclick_edge] = c;
                hypergraph.update_coloring(color_scheme);
                d3.select("#hypergraph-pie-child-"+rightclick_edge).attr("fill", d=>{
                    d.data.color = c;
                    return c;
                })
                simplified_hypergraph.nodes.forEach(node=>{
                    let id_list = node.id.split("|");
                    if(id_list.indexOf(rightclick_edge)!=-1){
                        simplified_hypergraph.nodes_dict[node.id].color = c;
                        simplified_hypergraph.color_dict[node.id] = c;
                        simplified_hypergraph.update_coloring(color_scheme);
                        d3.select("#simplified-hypergraph-pie-child-"+rightclick_edge).attr("fill", d=>{
                            d.data.color = c;
                            return c;
                        })
                    } 
                })
                linegraph.top_nodes.push(rightclick_edge);
                linegraph.nodes_dict[rightclick_edge].color = c;
                linegraph.color_dict[rightclick_edge] = c;
                // linegraph.update_coloring(color_scheme);
                d3.select("#linegraph-pie-child-"+rightclick_edge).attr("fill", d=>{
                    d.data.color = c;
                    return c;
                })
                simplified_linegraph.nodes.forEach(node=>{
                    let id_list = node.id.split("|");
                    if(id_list.indexOf(rightclick_edge)!=-1){
                        simplified_linegraph.nodes_dict[node.id].color = c;
                        simplified_linegraph.color_dict[node.id] = c;
                        // simplified_linegraph.update_coloring(color_scheme);
                        d3.select("#simplified-linegraph-pie-child-"+rightclick_edge).attr("fill", d=>{
                            d.data.color = c;
                            return c;
                        })
                    } 
                })
            }
        })

    d3.select("#revert_graph")
        .on("click", ()=>{
            // clear_graphs();
            // if(d3.select("#visual-encoding-switch").property("checked")){
            if(set_vis_dropdown.options[set_vis_dropdown.selectedIndex].value === "graph"){
                hypergraph.revert_force_directed_layout();
                simplified_hypergraph.revert_force_directed_layout();
                linegraph.revert_force_directed_layout();
                simplified_linegraph.revert_force_directed_layout();
            }
        })

    d3.selectAll(".barcode-rect-dim0")
        .on("click", (d,i)=>click_bar(d,i));

    function click_bar(d,i){
        console.log(d)
        // if(i != barcode.click_id){
        if(barcode.expanded_bars.indexOf(i) === -1){
            if(d.death > 0 && (d.death-d.birth)<=barcode.threshold){
                barcode.expanded_bars.forEach(idx => {
                    d3.select("#barcode"+idx).classed("unclickable", true);
                })
                d3.select("#barcode"+i).classed("hover-light", true);
                barcode.expanded_bars.push(i)
                console.log(barcode.cc_dict)
                // expanding
                $.ajax({
                    type: "POST",
                    url: "/hgraph_expansion",
                    data: JSON.stringify({'cc_dict':barcode.cc_dict, 'edge':d.edge, 'hyperedges2vertices':hyperedges2vertices, 'config':config, 'singletons':singletons}),
                    dataType:'text',
                    success: function (response) {
                        response = JSON.parse(response);

                        let hgraph = response.hyper_data;
                        let lgraph = response.line_data;
                        let cc_id = response.cc_id;
                        barcode.cc_dict = response.cc_dict;
                        barcode.expanded_bars_dict[i] = cc_id;

                        // assign colors
                        hgraph.nodes.forEach(n=>{
                            if(n.bipartite === 1){
                                n.color = color_dict[n.id.split("|")[0]]
                            }
                        })
                        lgraph.nodes.forEach(n=>{
                            n.color = color_dict[n.id.split("|")[0]]
                        })
                        assign_hyperedge_labels(hgraph, lgraph, labels);
                        $('#simplified-hypergraph-svg').remove();
                        $('#vis-simplified-hypergraph').append('<svg id="simplified-hypergraph-svg"></svg>');
                        $('#simplified-linegraph-svg').remove();
                        $('#vis-simplified-linegraph').append('<svg id="simplified-linegraph-svg"></svg>');
                        simplified_hypergraph = new Hypergraph(copy_hyper_data(hgraph), "simplified-hypergraph", config, color_dict, labels, top5_edges); 
                        simplified_hypergraph.update_coloring(color_scheme);
                        simplified_linegraph = new Linegraph(copy_line_data(lgraph), simplified_hypergraph, "simplified-linegraph", config.variant, config.weight_type, color_dict, labels, top5_edges);
                        simplified_linegraph.update_coloring(color_scheme);

                        console.log(cc_id)

                        d3.select("#simplified-hypergraph-node-"+cc_id[0].replace(/[,]/g,"").replace(/[|]/g,"")).classed("clicked", true);
                        d3.select("#simplified-hypergraph-node-"+cc_id[1].replace(/[,]/g,"").replace(/[|]/g,"")).classed("clicked", true);
                    },
                    error: function (error) {
                        console.log("error",error);
                    }
                });
            }
            
        } else{
            // barcode.click_id = undefined;
            if(i === barcode.expanded_bars[barcode.expanded_bars.length-1]){
                d3.select("#barcode"+i).classed("hover-light", false);
                barcode.expanded_bars.pop();
                d3.select("#barcode"+barcode.expanded_bars[barcode.expanded_bars.length-1]).classed("unclickable", false);
                // undo expanding
                $.ajax({
                    type: "POST",
                    url: "/undo_hgraph_expansion",
                    data: JSON.stringify({'cc_dict':barcode.cc_dict, 'cc_id':barcode.expanded_bars_dict[i], 'hyperedges2vertices':hyperedges2vertices, 'config':config, 'singletons':singletons}),
                    dataType:'text',
                    success: function (response) {
                        response = JSON.parse(response);
    
                        let hgraph = response.hyper_data;
                        let lgraph = response.line_data;
                        barcode.cc_dict = response.cc_dict;
                        delete barcode.expanded_bars_dict[i]
    
                        // assign colors
                        hgraph.nodes.forEach(n=>{
                            if(n.bipartite === 1){
                                n.color = color_dict[n.id.split("|")[0]]
                            }
                        })
                        lgraph.nodes.forEach(n=>{
                            n.color = color_dict[n.id.split("|")[0]]
                        })
                        assign_hyperedge_labels(hgraph, lgraph, labels);
                        barcode.cc_dict = response.cc_dict;
                        $('#simplified-hypergraph-svg').remove();
                        $('#vis-simplified-hypergraph').append('<svg id="simplified-hypergraph-svg"></svg>');
                        $('#simplified-linegraph-svg').remove();
                        $('#vis-simplified-linegraph').append('<svg id="simplified-linegraph-svg"></svg>');
                        simplified_hypergraph = new Hypergraph(copy_hyper_data(hgraph), "simplified-hypergraph", config, color_dict, labels, top5_edges); 
                        simplified_hypergraph.update_coloring(color_scheme);
                        simplified_linegraph = new Linegraph(copy_line_data(lgraph), simplified_hypergraph, "simplified-linegraph", config.variant, config.weight_type, color_dict, labels, top5_edges);
                        simplified_linegraph.update_coloring(color_scheme);

                        if(barcode.expanded_bars.length > 0){
                            let idx = barcode.expanded_bars[barcode.expanded_bars.length-1];
                            let cc_id = barcode.expanded_bars_dict[idx];
                            d3.select("#simplified-hypergraph-node-"+cc_id[0].replace(/[,]/g,"")).classed("clicked", true);
                            d3.select("#simplified-hypergraph-node-"+cc_id[1].replace(/[,]/g,"")).classed("clicked", true);
                        }
                    },
                    error: function (error) {
                        console.log("error",error);
                    }
                });
            }   
        }
    }

    d3.select("#slider_group")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    d3.select("#tree_slider_group")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    function dragstarted() {
        d3.select(this).raise();
    }
    function dragged() {
        let trans_dist = clamp(d3.event.x, barcode.svg_margin.left, barcode.width_scale.range()[1])-barcode.svg_margin.left;
        d3.select("#barcode-line").attr("x1",trans_dist)
            .attr("x2",trans_dist)
            .attr("y1", Math.min(Math.max(0,d3.event.y), barcode.svg_height-20));
        d3.select("#barcode-slider").attr("x",trans_dist).attr("y", Math.min(Math.max(0,d3.event.y), barcode.svg_height-20));
        d3.select("#tree-line").attr("x1",trans_dist)
            .attr("x2", trans_dist);
        d3.select("#tree-slider").attr("x",trans_dist);

        
    }
    function clamp(d, min, max) {
        return Math.min(Math.max(d, min), max);
    };
    function dragended() {
        let threshold = barcode.width_scale.invert(d3.select("#barcode-line").attr("x1"));
        let edgeid = barcode.extract_edgeid(threshold);
        barcode.threshold = threshold;
        barcode.expanded_bars = [];
        barcode.expanded_bars_dict = {};
        d3.select("#barcode-threshold").html("Current threshold: "+Math.round(threshold*1000)/1000);
        d3.selectAll(".barcode-rect-dim0").classed("hover-light", false).classed("unclickable", false);
        let cc_dict = linegraph.get_cc_dict(edgeid);
        console.log("cc_dict", cc_dict)
        // console.log(linegraph.singletons)
        barcode.cc_dict = cc_dict;
        hypergraph.cancel_faded();
        $.ajax({
            type: "POST",
            url: "/simplified_hgraph",
            data: JSON.stringify({'cc_dict':cc_dict, 'config':config, 'singletons':singletons}),
            dataType:'text',
            success: function (response) {
                response = JSON.parse(response);
                console.log(response)
                let hgraph = response.hyper_data;
                let lgraph = response.line_data;
                // assign colors
                hgraph.nodes.forEach(n=>{
                    if(n.bipartite === 1){
                        n.color = color_dict[n.id.split("|")[0]]
                    }
                })
                lgraph.nodes.forEach(n=>{
                    n.color = color_dict[n.id.split("|")[0]]
                })
                assign_hyperedge_labels(hgraph, lgraph, labels);
                $('#simplified-hypergraph-svg').remove();
                $('#vis-simplified-hypergraph').append('<svg id="simplified-hypergraph-svg"></svg>');
                $('#simplified-linegraph-svg').remove();
                $('#vis-simplified-linegraph').append('<svg id="simplified-linegraph-svg"></svg>');
                simplified_hypergraph = new Hypergraph(copy_hyper_data(hgraph), "simplified-hypergraph", config, color_dict, labels, top5_edges); 
                simplified_hypergraph.update_coloring(color_scheme);
                simplified_linegraph = new Linegraph(copy_line_data(lgraph), simplified_hypergraph, "simplified-linegraph", config.variant, config.weight_type, color_dict, labels, top5_edges);
                simplified_linegraph.update_coloring(color_scheme);
            },
            error: function (error) {
                console.log("error",error);
            }
        });
    }

}

function initialize_graphs(hyper_data, line_data, barcode_data, config, color_dict, labels, top5_edges) {
    clear_canvas();
    let hypergraph = new Hypergraph(copy_hyper_data(hyper_data), "hypergraph", config, color_dict, labels, top5_edges=top5_edges); 
    let linegraph = new Linegraph(copy_line_data(line_data), hypergraph, "linegraph", config.variant, config.weight_type, color_dict, labels, top5_edges=top5_edges);
    let simplified_hypergraph = new Hypergraph(copy_hyper_data(hyper_data), "simplified-hypergraph", config, color_dict, labels, top5_edges=top5_edges);
    let simplified_linegraph = new Linegraph(copy_line_data(line_data), simplified_hypergraph, "simplified-linegraph", config.variant, config.weight_type, color_dict, labels, top5_edges=top5_edges);
    let barcode = new Barcode(barcode_data, simplified_linegraph, config);
    
    return [hypergraph, linegraph, simplified_hypergraph, simplified_linegraph, barcode];
}

function read_hgraph_text(text_data){
    reset_visual_encoding();
    reset_config();
    let current_config = get_current_config();
    $.ajax({
        type: "POST",
        url: "/import",
        data: text_data,
        dataType:'text',
        success: function (response) {
            load_data(JSON.parse(response), current_config);
        },
        error: function (error) {
            console.log("error",error);
        }
    })
}

function assign_hyperedge_colors(data, color_dict=undefined, color_scheme=undefined){
    console.log(data)
    if(color_dict === undefined){
        color_dict = {}
        // color_dict = {"he0":"#1f77b4", "he1":"#2ca02c", "he2":"#ff7f0e"};
        // color_dict = {"he1":"#ff7f0e", "he0":"#1f77b4", "he2":" #2ca02c", "he3":"#d62728", "he4":"#9467bd", "v0":"#8c564b", "v1":"#e377c2", "v2":"#7f7f7f", "v3":"#bcbd22", "v4":"#17becf"}
        // color_dict = {'h1':'#ff7f0e', 'h2':'#d62728', 'h3':'#1f77b4', 'h4':'#9467bd', 'h5':'#d62728', 'h6':'#9467bd'} // hyperedge matching
        // color_dict = {"he0":" #7f7f7f", "he1":" #7f7f7f", "he2":" #7f7f7f", "he3":" #7f7f7f", "v0":"#8c564b","v1": "#2ca02c", "v2":"#e377c2", "v3":"#bcbd22", "v4":"#17becf"} // vertex matching 1 before
        // color_dict = {"he0":" #7f7f7f", "he1":" #7f7f7f", "he2":" #7f7f7f", "he3":" #7f7f7f", "v1":"#8c564b","v2": "#17becf", "v3":"#2ca02c", "v4":"#bcbd22", "v5":"#e377c2", "v6":"#bcbd22", "v7":"#e377c2", "v8":"#bcbd22", "v9":"#17becf"} // vertex matching 1 after

        // color_dict = {"he0":" #7f7f7f", "he1":" #7f7f7f", "he2":" #7f7f7f", "he3":" #7f7f7f", "v0":"#000000","v1": "#9467bd", "v2":"#bcbd22", "v3":"#e377c2", "v4":"#8c564b"} // vertex matching 2 before

        // color_dict = {"he0":" #7f7f7f", "he1":" #7f7f7f", "he2":" #7f7f7f", "he3":" #7f7f7f", "v1":"#000000", "v2": "#9467bd", "v3":"#9467bd", "v4":"#bcbd22", "v5":"#000000", "v6":"#e377c2", "v7":"#000000", "v8":"#8c564b", "v9":"#9467bd"} // vertex matching 2 after
        let top5_edges = data.top5_edges;

        let colorScale = d3.scaleOrdinal(d3.schemeCategory10);
        let node_list = [];
        data.hyper_data.nodes.forEach(node=>{
            let n_list = node.id.split("|");
            n_list.forEach(n=>{
                if(node_list.indexOf(n) === -1){
                    node_list.push(n)
                }
            })
        })
        node_list.sort((a,b)=>b-a) // sort the nodes so that each time with the same names the colors will be the same
        if(color_scheme === "top5"){
            let node_list_new = node_list.filter(n=> top5_edges.indexOf(n)!=-1)
            let idx = 0;
            node_list.forEach(n=>{
                if(node_list_new.indexOf(n)!=-1){
                    if(Object.keys(color_dict).indexOf(n)===-1){
                        color_dict[n] = colorScale(idx);    
                        idx += 1;
                    }
                } else{
                    color_dict[n] = "gray"
                }
            })
        } else {
            let idx = 0;
            node_list.forEach(n=>{
                if(Object.keys(color_dict).indexOf(n)===-1){
                    color_dict[n] = colorScale(idx);    
                        idx += 1;
                }
            })
        } 
        data.hyper_data.nodes.forEach(node=>{
            let n_list = node.id.split("|");
            node.color = color_dict[n_list[0]];
        })
    } else {
        data.hyper_data.nodes.forEach(node=>{
            let n_list = node.id.split("|");
            node.color = color_dict[n_list[0]];
        })
    }
    
    data.line_data.nodes.forEach(node=>{
        let n_list = node.id.split("|");
        node.color = color_dict[n_list[0]];
    })
    return color_dict;
}

function assign_hyperedge_labels(hyper_data, line_data, label_map) {
    hyper_data.nodes.forEach(node=>{
        let tmp_list = [""]
        let label = "";
        let n_list = node.id.split("|");
        n_list.forEach(n=>{
            if(label_map[n]){
                label += label_map[n] + "|";
            }
        })
        label = label.substring(0, label.length - 1);

        node.label = label;
        // node.label = label_map[node.id]
    })
    line_data.nodes.forEach(node=>{
        let label = "";
        let n_list = node.id.split("|");
        n_list.forEach(n=>{
            if(label_map[n]){
                label += label_map[n] + "|";
            }
        })
        label = label.substring(0, label.length - 1);
        node.label = label;
    })
}

function copy_hyper_data(hyper_data){
    let hyper_nodes_new = [];
    let hyper_links_new = [];
    hyper_data.nodes.forEach(n=>{
        let node_new = {};
        node_new.bipartite = n.bipartite;
        node_new.id = n.id;
        node_new.color = n.color;
        node_new.label = n.label;
        node_new.if_singleton = n.if_singleton;
        hyper_nodes_new.push(node_new);
    })
    hyper_data.links.forEach(l=>{
        let link_new = {};
        link_new.source = l.source;
        link_new.target = l.target;
        hyper_links_new.push(link_new);
    })
    return {"nodes": hyper_nodes_new, "links": hyper_links_new, "labels":hyper_data.labels};
}

function copy_line_data(line_data){
    let line_nodes_new = [];
    let line_links_new = [];
    line_data.nodes.forEach(n=>{
        let node_new = {};
        node_new.vertices = n.vertices.slice(0);
        node_new.id = n.id;
        node_new.color = n.color;
        node_new.label = n.label;
        line_nodes_new.push(node_new);
    })
    line_data.links.forEach(l=>{
        let link_new = {};
        link_new.intersection_size = {};
        link_new.intersection_size.value = l.intersection_size.value;
        link_new.jaccard_index = {};
        link_new.jaccard_index.value = l.jaccard_index.value;
        link_new.source = l.source;
        link_new.target = l.target;
        if(l.intersection_size.cc_list){
            link_new.intersection_size.cc_list = [];
            l.intersection_size.cc_list.forEach(cc=>{ link_new.intersection_size.cc_list.push(cc.slice(0)); }) // deep copy
            link_new.intersection_size.nodes_subsets = {"source_cc":l.intersection_size.nodes_subsets.source_cc.slice(0), "target_cc":l.intersection_size.nodes_subsets.target_cc.slice(0)};
        }
        if(l.jaccard_index.cc_list){
            link_new.jaccard_index.cc_list = [];
            l.jaccard_index.cc_list.forEach(cc=>{ link_new.jaccard_index.cc_list.push(cc.slice(0)); }) // deep copy
            link_new.jaccard_index.nodes_subsets = {"source_cc":l.jaccard_index.nodes_subsets.source_cc.slice(0), "target_cc":l.jaccard_index.nodes_subsets.target_cc.slice(0)};
        }
        line_links_new.push(link_new);
    })
    return {"nodes": line_nodes_new, "links": line_links_new};
}

function get_current_config() {
    //  1. graph version
    let hgraph_type = "collapsed_version";
    if (!d3.select("#collapse-input").property("checked")){
        hgraph_type = "original_version";
    }
    // let simplification_type = "collapsed_version";
    // if (!d3.select("#collapse-output").property("checked")){
    //     simplification_type = "original_version";
    // }
    //  2. line graph variant
    let variant = d3.select('input[name="variant-type"]:checked').node().value;
    //  3. s-value & turn off singletons
    let s = d3.select("#s-walk_input").property("value");
    let singleton_type = d3.select('input[name="singleton-type"]:checked').node().value;
    //  4. weigth type
    let weight_type = d3.select('input[name="weight-type"]:checked').node().value;
    return {'hgraph_type':hgraph_type, 's':s, 'singleton_type':singleton_type, 'variant':variant, 'weight_type':weight_type};
}

function reset_visual_encoding() {
    // Reset "Visual Encoding Control"
    //  1. reset "color scheme"
    let color_scheme_dropdown = document.getElementById("color-scheme-dropdown");
    color_scheme_dropdown.selectedIndex = 0;
    //  2. reset "graph encoding"
    // d3.select("#visual-encoding-switch").property("checked", true);
    let set_vis_dropdown = document.getElementById("set-vis-dropdown");
    set_vis_dropdown.selectedIndex = 0;
    //  3. reset "show label"
    d3.select("#hgraph-labels").property("checked", false);
    //  4. reset hypergraph visual encoding
    d3.select("#convex").property("checked", true);
    //  5. reset "hide hyperedge nodes"
    d3.select("#hide-hyperedge-node").property("checked", false);
    //  6. reset glyph
    d3.select("#hyperedge-glyph").property("checked", true);
    d3.select("#vertex-glyph").property("checked", false);
}

function reset_config() {
    // Reset "Parameter Control"
    //  1. reset hypergraph type
    d3.select("#collapse-input").property("checked", true)
    // d3.select("#collapse-output").property("checked", true)
    //  2. reset s-value & how to turn off singletons
    d3.select("#s-walk_input").property("value", 1);
    d3.select("#s-walk_label").html("1");
    d3.select("#s-walk_input").property("max", 10);
    d3.select("#s-range").property("value", 10);
    document.getElementById("s-range-container-inner").style.maxHeight = null;

    d3.select("#grey_out").property("checked", true);
    //  3. reset line graph variant
    d3.select("#line_graph").property("checked", true);
    //  4. reset weight type
    d3.select("#jaccard_index").property("checked", true);
}

function clear_canvas(){
    $('#barcode-svg').remove();
    $('#merge-tree-svg').remove();
    $('#hypergraph-svg').remove();
    $('#linegraph-svg').remove();
    $('#simplified-hypergraph-svg').remove();
    $('#simplified-linegraph-svg').remove();
    // $('#help-tip').remove();
    $('#vis-barcode').append('<svg id="barcode-svg"></svg>');
    $('#vis-barcode2').append('<svg id="merge-tree-svg"></svg>');
    $('#vis-hypergraph').append('<svg id="hypergraph-svg"></svg>');
    $('#vis-linegraph').append('<svg id="linegraph-svg"></svg>');
    $('#vis-simplified-hypergraph').append('<svg id="simplified-hypergraph-svg"></svg>');
    // $('#vis-simplified-hypergraph').append('<div class="help-tip" style="opacity: 0;" id="help-tip"></div>');
    $('#vis-simplified-linegraph').append('<svg id="simplified-linegraph-svg"></svg>');
    d3.select("#barcode-threshold").html("Current threshold: 0");
}

function clear_graphs(){
    $('#hypergraph-svg').remove();
    $('#linegraph-svg').remove();
    $('#simplified-hypergraph-svg').remove();
    $('#simplified-linegraph-svg').remove();
    $('#vis-hypergraph').append('<svg id="hypergraph-svg"></svg>');
    $('#vis-linegraph').append('<svg id="linegraph-svg"></svg>');
    $('#vis-simplified-hypergraph').append('<svg id="simplified-hypergraph-svg"></svg>');
    $('#vis-simplified-linegraph').append('<svg id="simplified-linegraph-svg"></svg>');
}

function draw_edge_color_legend(){
    let color_scale = d3.interpolateGreys;

    let width = $(d3.select("#edge-color-container").node()).width();
    let height = 40;
    let axisMargin = 3;
    let colorTileNumber = 25;
    let colorTileHeight = 20;
    let colorTileWidth = (width - (axisMargin * 2)) / colorTileNumber;
    // let axisDomain = color_scale.domain();
    let axisDomain = [0, 1];

    let svg = d3.select("#edge-color-legend").attr('width', width).attr('height', height);

    let axisScale = d3.scaleLinear().domain(axisDomain).range([axisMargin, width - axisMargin*3]);

    let legendGroup = svg.append("g")
    let domainStep = (axisDomain[1] - axisDomain[0])/colorTileNumber;
    let rects = d3.range(axisDomain[0], axisDomain[1], domainStep)
    legendGroup.selectAll("rect").data(rects)
        .enter().append("rect")
        .attr('x', d=>axisScale(d))
        .attr('y', 10)
        .attr('width', colorTileWidth)
        .attr('height',colorTileHeight)
        .attr('fill', d=>color_scale(d));

}
    