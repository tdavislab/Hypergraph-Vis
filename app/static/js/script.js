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
        // console.log(data)
    })

d3.select("#hgraph-type-form")
    .on("change", ()=>{
        // When change the graph type, reset all the configuration
        let hgraph_type = d3.select('input[name="hgraph-type"]:checked').node().value;
        reset_config();
        $.ajax({
            type: "POST",
            url: "/change_hgraph_type",
            data: String(hgraph_type),
            dataType:'text',
            success: function (response) {
                init(JSON.parse(response), hgraph_type = hgraph_type);
            },
            error: function (error) {
                console.log("error",error);
            }
        });
        
    });


function init(data, hgraph_type = "collapsed_version") {
    console.log(data)
    let config = {"hgraph_type":hgraph_type, "s":1, "variant":"Original Line Graph", "weight_type":"jaccard_index"};

    let id2color;
    let labels = data.labels;
    let id_map = data.id_map;
    if(data.id2color){
        id2color = data.id2color;
        data.hyper_data.nodes.forEach(node=>{
            node.color = id2color[node.id];
        })
        data.line_data.nodes.forEach(node=>{
            node.color = id2color[node.id];
        })
    } else {
        let color_dict = assign_hyperedge_colors(data);
        id2color = {};
        for(let che in color_dict){
            id2color[che] = color_dict[che];
            if(id_map.hedges[che]){
                let he_list = id_map.hedges[che];
                he_list.forEach(he=>{
                    id2color[he] = color_dict[che];
                })
            } else if(id_map.vertices[che]){
                let v_list = id_map.vertices[che];
                v_list.forEach(v=>{
                    id2color[v] = color_dict[che];
                })
            }
        }
    }
    
    $.ajax({
        type: "POST",
        url: "/id2color",
        data: JSON.stringify(id2color),
        dataType:'text',
        success: function (response) {
            console.log("success")
            // init(JSON.parse(response), hgraph_type = hgraph_type);
        },
        error: function (error) {
            console.log("error",error);
        }
    });

    console.log(id2color)

    console.log("labels", labels)
    console.log("id_map", id_map)
    assign_hyperedge_labels(data.hyper_data, labels, id_map, config.hgraph_type);
    let hyperedges2vertices = Object.assign({}, ...data.line_data.nodes.map((x) => ({[x.id]: x.vertices})));

    console.log(hyperedges2vertices)
    let [hypergraph, linegraph, simplified_hypergraph, simplified_linegraph, barcode] = initialize_graphs(data.hyper_data, data.line_data, data.barcode_data, labels, config.variant);

    d3.select("#edge-encoding-form")
        .on("change", ()=>{
            let weight = d3.select('input[name="edge-type"]:checked').node().value;
            linegraph.weight = weight;
            simplified_linegraph.weight = weight;
            linegraph.edge_scale.domain(d3.extent(linegraph.links.map(d => parseFloat(d[linegraph.weight]))));
            simplified_linegraph.edge_scale.domain(d3.extent(simplified_linegraph.links.map(d => parseFloat(d[simplified_linegraph.weight]))));

            linegraph.svg.selectAll("line").attr("stroke-width", d => linegraph.edge_scale(parseFloat(d[linegraph.weight])));
            simplified_linegraph.svg.selectAll("line").attr("stroke-width", d => simplified_linegraph.edge_scale(parseFloat(d[simplified_linegraph.weight])));
            })

    change_visual_encoding();
    
    // change weight type
    d3.select("#weight-type-form")
        .on("change", ()=>{
            config.weight_type = d3.select('input[name="weight-type"]:checked').node().value;
            $.ajax({
                type: "POST",
                url: "/reload_graphs",
                data: JSON.stringify(config),
                dataType:'text',
                success: function (response) {
                    let data_new = JSON.parse(response);
                    reload_graphs(data_new.line_data, data_new.hyper_data, data_new.barcode_data, config.variant);
                },
                error: function (error) {
                    console.log("error",error);
                }
            });
            
        })

    // change s value
    let s_value_slider = document.getElementById("s-walk_input");
    s_value_slider.oninput = function(){
        config.s = this.value;
        d3.select("#s-walk_label").html(this.value);
    }

    d3.select("#compute_line_graph")
        .on("click", ()=>{
            $.ajax({
                type: "POST",
                url: "/change_s_value",
                data: JSON.stringify(config),
                dataType:'text',
                success: function (response) {
                    let data_new = JSON.parse(response);
                    reload_graphs(data_new.line_data, data_new.hyper_data, data_new.barcode_data, config.variant);
                },
                error: function (error) {
                    console.log("error",error);
                }
            });
        })

    // change line graph variant
    let line_variant_dropdown = document.getElementById("line_graph_variants");
    line_variant_dropdown.onchange = function(){
        config.variant = line_variant_dropdown.options[line_variant_dropdown.selectedIndex].text;
        $.ajax({
            type: "POST",
            url: "/reload_graphs",
            data: JSON.stringify(config),
            dataType:'text',
            success: function (response) {
                let data_new = JSON.parse(response);
                reload_graphs(data_new.line_data, data_new.hyper_data, data_new.barcode_data, config.variant);
            },
            error: function (error) {
                console.log("error",error);
            }
        });
    }


    d3.selectAll(".barcode-rect-dim0")
        .on("click", d=>click_bar(d));

    function click_bar(d){
        console.log(d)
        if(d.death > 0){
            simplified_linegraph.graph_expansion(d);
            if((d.death-d.birth)<=barcode.threshold){
                $.ajax({
                    type: "POST",
                    url: "/expanded_hgraph",
                    data: JSON.stringify({'cc_dict':barcode.cc_dict, 'edge':d.edge, 'hyperedges2vertices':hyperedges2vertices, 'variant':config.variant}),
                    dataType:'text',
                    success: function (response) {
                        response = JSON.parse(response);
                        let hgraph = response.hyper_data;
                        let hgraph_labels = {};
                        // assign colors and labels
                        hgraph.nodes.forEach(n=>{
                            if(n.bipartite === 1){
                                n.color = id2color[n.id.split("|")[0]]
                            }
                            if(labels[n.id]){
                                hgraph_labels[n.id] = labels[n.id];
                            } else {
                                id_list = n.id.split("|");
                                id_list.pop();
                                hgraph_labels[n.id] = ""
                                id_list.forEach(id=>{ hgraph_labels[n.id] += labels[id]+"|"; })
                            }
                        })
                        hgraph.labels = hgraph_labels;
                        barcode.cc_dict = response.cc_dict;
                        $('#simplified-hypergraph-svg').remove();
                        $('#vis-simplified-hypergraph').append('<svg id="simplified-hypergraph-svg"></svg>');
                        simplified_hypergraph = new Hypergraph(hgraph, "simplified-hypergraph", hypergraph); 
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

    function dragstarted() {
        d3.select(this).raise();
    }
    function dragged() {
        console.log("111", d3.event.x)
        let trans_dist = clamp(d3.event.x, barcode.svg_margin.left, barcode.width_scale.range()[1])-barcode.svg_margin.left;
        d3.select("#barcode-line").attr("x1",trans_dist);
        d3.select("#barcode-line").attr("x2",trans_dist);
        d3.select("#barcode-slider").attr("x",trans_dist);
        
    }
    function clamp(d, min, max) {
        return Math.min(Math.max(d, min), max);
    };
    function dragended() {
        let threshold = barcode.width_scale.invert(d3.select("#barcode-line").attr("x1"));
        console.log(threshold)
        // simplified_linegraph.threshold = threshold;
        let edgeid = barcode.extract_edgeid(threshold);
        barcode.threshold = threshold;
        let cc_dict = simplified_linegraph.graph_contraction(edgeid);
        barcode.cc_dict = cc_dict;
        hypergraph.cancel_faded();
        $.ajax({
            type: "POST",
            url: "/simplified_hgraph",
            data: JSON.stringify({'cc_dict':cc_dict, 'variant':config.variant}),
            dataType:'text',
            success: function (response) {
                let hgraph = JSON.parse(response).hyper_data;
                // assign colors
                hgraph.nodes.forEach(n=>{
                    if(n.bipartite === 1){
                        n.color = id2color[n.id.split("|")[0]]
                    }
                })
                assign_hyperedge_labels(hgraph, labels, id_map, config.hgraph_type);
                $('#simplified-hypergraph-svg').remove();
                $('#vis-simplified-hypergraph').append('<svg id="simplified-hypergraph-svg"></svg>');
                simplified_hypergraph = new Hypergraph(hgraph, "simplified-hypergraph", hypergraph); 
            },
            error: function (error) {
                console.log("error",error);
            }
        });
    }

    function reload_graphs(line_data, hyper_data, barcode_data, variant){
        // if(variant === "Original Line Graph"){
            line_data.nodes.forEach(node=>{
                let c = id2color[node.id];
                node.color = c;
            })
        // } 
        // console.log(color_dict)
        hyper_data.nodes.forEach(node=>{
            let c = id2color[node.id];
            node.color = c;
        })
        hyperedges2vertices = Object.assign({}, ...line_data.nodes.map((x) => ({[x.id]: x.vertices})));
        [hypergraph, linegraph, simplified_hypergraph, simplified_linegraph, barcode] = initialize_graphs(hyper_data, line_data, barcode_data, labels, variant);
        d3.select("#barcode-slider")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));
        d3.selectAll(".barcode-rect-dim0")
            .on("click", d=>click_bar(d));
    }

}

function initialize_graphs(hyper_data, line_data, barcode_data, labels, variant) {
    clear_canvas();

    let hypergraph = new Hypergraph(copy_hyper_data(hyper_data), "hypergraph"); 
    let linegraph = new Linegraph(copy_line_data(line_data), hypergraph, "linegraph", variant=variant);
    let simplified_hypergraph = new Hypergraph(copy_hyper_data(hyper_data), "simplified-hypergraph", hypergraph);
    let simplified_linegraph = new Linegraph(copy_line_data(line_data), simplified_hypergraph, "simplified-linegraph", variant=variant);
    let barcode = new Barcode(barcode_data, simplified_linegraph);
    return [hypergraph, linegraph, simplified_hypergraph, simplified_linegraph, barcode];
}

function read_hgraph_text(text_data){
    $.ajax({
        type: "POST",
        url: "/import",
        data: text_data,
        dataType:'text',
        success: function (response) {
            init(JSON.parse(response));
        },
        error: function (error) {
            console.log("error",error);
        }
    })
}

function assign_hyperedge_colors(data){
    let color_dict = {};
    let colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(data.hyper_data.nodes.map(d => d.id));
    data.hyper_data.nodes.forEach(node=>{
        // if(node.bipartite === 1){
            let c = colorScale(node.id)
            node.color = c;
            color_dict[node.id] = c;
        // }
    })
    data.line_data.nodes.forEach(node=>{
        let c = color_dict[node.id];
        node.color = c;
    })
    return color_dict;
}

function assign_hyperedge_labels(hyper_data, label_map, id_map, hgraph_type) {
    // console.log("assign labels")
    // console.log(hgraph_type)
    if(hgraph_type === "collapsed_version") {
        hyper_data.nodes.forEach(node=>{
            //  **** need to assign id for both hyper-edges and vertices ****
            let label = "";
            let cn_list = node.id.split("|");
            if(cn_list.length > 1){ cn_list.pop(); }
            if(node.bipartite === 1){
                cn_list.forEach(cn=>{
                    let n_list = id_map.hedges[cn];
                    n_list.forEach(n=>{
                        label += label_map[n] + "|";
                    })
                })
            } else{
                cn_list.forEach(cn=>{
                    let n_list = id_map.vertices[cn];
                    n_list.forEach(n=>{
                        label += label_map[n] + "|";
                    })
                })
            }
            label = label.substring(0, label.length - 1);
            node.label = label;     
            // console.log(label)       
        })
    } else if(hgraph_type === "original_version") {
        hyper_data.nodes.forEach(node=>{
            let label = "";
            let n_list = node.id.split("|");
            if(n_list.length > 1){ n_list.pop(); }
            n_list.forEach(n=>{
                label += label_map[n] + "|";
            })
            label = label.substring(0, label.length - 1);
            node.label = label;
        })
    }
    
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
        line_nodes_new.push(node_new);
    })
    line_data.links.forEach(l=>{
        let link_new = {};
        link_new.intersection_size = l.intersection_size;
        link_new.jaccard_index = l.jaccard_index;
        link_new.source = l.source;
        link_new.target = l.target;
        if(l.cc_list){
            link_new.cc_list = [];
            l.cc_list.forEach(cc=>{ link_new.cc_list.push(cc.slice(0)); }) // deep copy
            link_new.nodes_subsets = {"source_cc":l.nodes_subsets.source_cc.slice(0), "target_cc":l.nodes_subsets.target_cc.slice(0)};
        }
        line_links_new.push(link_new);
    })
    return {"nodes": line_nodes_new, "links": line_links_new};
}

function change_visual_encoding(){
    d3.select("#visual-encoding-form")
        .on("change", ()=>{
            let encoding_type = d3.select('input[name="visual-type"]:checked').node().value;
            if(encoding_type === "bipartite"){
                d3.select("#hull-group").style("visibility","hidden");
                d3.select("#simplified-hull-group").style("visibility","hidden");
            } else if(encoding_type === "convex"){
                d3.select("#hull-group").style("visibility","visible");
                d3.select("#simplified-hull-group").style("visibility","visible");
            }
        });
}

function reset_config() {
    //  1. reset "show label"
    d3.select("#hgraph-labels").property("checked", true);
    //  2. reset hypergraph visual encoding
    d3.select("#convex").property("checked", true);
    //  3. reset s-value & how to turn off singletons
    d3.select("#s-walk_input").property("value", 1);
    d3.select("#s-walk_label").html("1");
    d3.select("#grey_out").property("checked", true);
    //  4. reset line graph variant
    d3.select("#line_graph_variants").property("selectedIndex", 0);
    //  5. reset weight type
    d3.select("#intersection_size").property("checked", true);
}

function clear_canvas(){
    $('#barcode-svg').remove();
    $('#hypergraph-svg').remove();
    $('#linegraph-svg').remove();
    $('#simplified-hypergraph-svg').remove();
    $('#simplified-linegraph-svg').remove();
    // $('#help-tip').remove();
    $('#vis-barcode').append('<svg id="barcode-svg"></svg>');
    $('#vis-hypergraph').append('<svg id="hypergraph-svg"></svg>');
    $('#vis-linegraph').append('<svg id="linegraph-svg"></svg>');
    $('#vis-simplified-hypergraph').append('<svg id="simplified-hypergraph-svg"></svg>');
    // $('#vis-simplified-hypergraph').append('<div class="help-tip" style="opacity: 0;" id="help-tip"></div>');
    $('#vis-simplified-linegraph').append('<svg id="simplified-linegraph-svg"></svg>');
}


// d3.select("#singleton-type-form")
    //         .on("change", ()=>{
    //             // hypergraph.draw_hypergraph();
    //             // simplified_hypergraph.draw_hypergraph();
    //             // let singleton_type = d3.select('input[name="visual-type"]:checked').node().value;
    //             // if(singleton_type === "bipartite"){
    //             //     d3.select("#hull-group").style("visibility","hidden");
    //             //     d3.select("#simplified-hull-group").style("visibility","hidden");
    //             // } else if(encoding_type === "convex"){
    //             //     d3.select("#hull-group").style("visibility","visible");
    //             //     d3.select("#simplified-hull-group").style("visibility","visible");
    //             // }
    //         })
    let coll  = document.getElementsByClassName("block_title");
    for(let i=0; i<coll.length; i++){
        coll[i].addEventListener("click", function(){
            this.classList.toggle("collapsed")
            let block_body = this.nextElementSibling;
            console.log(block_body.id)
            if (block_body.style.maxHeight){
                block_body.style.maxHeight = null;
            } else {
                // block_body.style.maxHeight = block_body.scrollHeight + "px";
                if(block_body.id === "block_body_histogram"){
                    block_body.style.maxHeight = "500px";
                } else{
                    block_body.style.maxHeight = "1000px";
                }
            } 
        })
    }