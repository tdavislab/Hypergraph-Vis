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


function init(data) {
    console.log(data)

    let color_dict = assign_hyperedge_colors(data);
    let labels = data.labels;
    let hyperedges2vertices = Object.assign({}, ...data.line_data.nodes.map((x) => ({[x.id]: x.vertices})));

    console.log(hyperedges2vertices)
    let [hypergraph, linegraph, simplified_hypergraph, simplified_linegraph, barcode] = initialize_graphs(data.hyper_data, data.line_data, data.barcode_data, labels);

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
        })

    d3.select("#hgraph-type-form")
        .on("change", ()=>{
            let hgraph_type = d3.select('input[name="hgraph-type"]:checked').node().value;
            $.ajax({
                type: "POST",
                url: "/change_hgraph_type",
                data: JSON.stringify({"hgraph_type":String(hgraph_type), "variant": String(variant)}),
                dataType:'text',
                success: function (response) {
                    init(JSON.parse(response));
                },
                error: function (error) {
                    console.log("error",error);
                }
            });
            
        })

    d3.select("#weight-type-form")
        .on("change", ()=>{
            let weight_type = d3.select('input[name="weight-type"]:checked').node().value;
            console.log(weight_type)
            $.ajax({
                type: "POST",
                url: "/change_weight_type",
                data: JSON.stringify({"weight_type":String(weight_type), "variant": String(variant)}),
                dataType:'text',
                success: function (response) {
                    let data_new = JSON.parse(response);
                    switch_line_variant(data_new.line_data, data_new.hyper_data, data_new.barcode_data, variant);
                },
                error: function (error) {
                    console.log("error",error);
                }
            });
            
        })

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
                    data: JSON.stringify({'cc_dict':barcode.cc_dict, 'edge':d.edge, 'hyperedges2vertices':hyperedges2vertices, 'variant':variant}),
                    dataType:'text',
                    success: function (response) {
                        response = JSON.parse(response);
                        let hgraph = response.hyper_data;
                        let hgraph_labels = {};
                        // assign colors and labels
                        hgraph.nodes.forEach(n=>{
                            if(n.bipartite === 1){
                                n.color = color_dict[n.id.split("|")[0]]
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
                        simplified_hypergraph = new Hypergraph(hgraph, "simplified-hypergraph", labels, hypergraph); 
                    },
                    error: function (error) {
                        console.log("error",error);
                    }
                });
            }
        }
    }

    d3.select("#barcode-slider")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    function dragstarted() {
        d3.select(this).raise();
    }
    function dragged() {
        d3.select(this).attr("x", clamp(d3.event.x, barcode.svg_margin.left, barcode.width_scale(barcode.max_death*1.1)));
        // let destination_position = d3.event.x - d3.select(this).attr("width") / 2;
        // d3.select(this).attr("x", clamp(destination_position, 5, 90));
        function clamp(d, min, max) {
            return Math.min(Math.max(d, min), max);
        };
    }
    function dragended() {
        let threshold = barcode.width_scale.invert(d3.event.x);
        // simplified_linegraph.threshold = threshold;
        let edgeid = barcode.extract_edgeid(threshold);
        barcode.threshold = threshold;
        let cc_dict = simplified_linegraph.graph_contraction(edgeid);
        barcode.cc_dict = cc_dict;
        hypergraph.cancel_faded();
        $.ajax({
            type: "POST",
            url: "/simplified_hgraph",
            data: JSON.stringify({'cc_dict':cc_dict, 'variant':variant}),
            dataType:'text',
            success: function (response) {
                let hgraph = JSON.parse(response).hyper_data;
                let hgraph_labels = {};
                // assign colors and labels
                hgraph.nodes.forEach(n=>{
                    if(n.bipartite === 1){
                        n.color = color_dict[n.id.split("|")[0]]
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
                $('#simplified-hypergraph-svg').remove();
                $('#vis-simplified-hypergraph').append('<svg id="simplified-hypergraph-svg"></svg>');
                simplified_hypergraph = new Hypergraph(hgraph, "simplified-hypergraph", hgraph_labels, hypergraph); 
            },
            error: function (error) {
                console.log("error",error);
            }
        });
    }
    

    // change s value
    let s_value_slider = document.getElementById("s-walk_input");
    let s_value = 1;
    s_value_slider.oninput = function(){
        s_value = this.value;
        d3.select("#s-walk_label").html(this.value);
    }

    d3.select("#compute_line_graph")
        .on("click", ()=>{
            $.ajax({
                type: "POST",
                url: "/change_s_value",
                data: JSON.stringify({"s":String(s_value), "variant": String(variant)}),
                dataType:'text',
                success: function (response) {
                    let data_new = JSON.parse(response);
                    switch_line_variant(data_new.line_data, data_new.hyper_data, data_new.barcode_data, variant);
                },
                error: function (error) {
                    console.log("error",error);
                }
            });
        })

    // change line graph variant
    let line_variant_dropdown = document.getElementById("line_graph_variants");
    let variant = "Original Line Graph"
    line_variant_dropdown.onchange = function(){
        variant = line_variant_dropdown.options[line_variant_dropdown.selectedIndex].text;
        $.ajax({
            type: "POST",
            url: "/switch_line_variant",
            data: String(variant),
            dataType:'text',
            success: function (response) {
                let data_new = JSON.parse(response);
                switch_line_variant(data_new.line_data, data_new.hyper_data, data_new.barcode_data, variant);
            },
            error: function (error) {
                console.log("error",error);
            }
        });
    }

    function switch_line_variant(line_data, hyper_data, barcode_data, variant){
        if(variant === "Original Line Graph"){
            line_data.nodes.forEach(node=>{
                let c = color_dict[node.id];
                node.color = c;
            })
        } 
        hyper_data.nodes.forEach(node=>{
            let c = color_dict[node.id];
            node.color = c;
        })
        hyperedges2vertices = Object.assign({}, ...line_data.nodes.map((x) => ({[x.id]: x.vertices})));
        [hypergraph, linegraph, simplified_hypergraph, simplified_linegraph, barcode] = initialize_graphs(hyper_data, line_data, barcode_data, labels);
        d3.select("#barcode-slider")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));
        d3.selectAll(".barcode-rect-dim0")
            .on("click", d=>click_bar(d));
    }

}

function initialize_graphs(hyper_data, line_data, barcode_data, labels) {
    clear_canvas();

    let hypergraph = new Hypergraph(copy_hyper_data(hyper_data), "hypergraph", labels); 
    let linegraph = new Linegraph(copy_line_data(line_data), hypergraph, "linegraph");
    let simplified_hypergraph = new Hypergraph(copy_hyper_data(hyper_data), "simplified-hypergraph", labels, hypergraph);
    let simplified_linegraph = new Linegraph(copy_line_data(line_data), simplified_hypergraph, "simplified-linegraph");
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
        if(node.bipartite === 1){
            let c = colorScale(node.id)
            node.color = c;
            color_dict[node.id] = c;
        }
    })
    data.line_data.nodes.forEach(node=>{
        let c = color_dict[node.id];
        node.color = c;
    })
    return color_dict;
}

function copy_hyper_data(hyper_data){
    let hyper_nodes_new = [];
    let hyper_links_new = [];
    hyper_data.nodes.forEach(n=>{
        let node_new = {};
        node_new.bipartite = n.bipartite;
        node_new.id = n.id;
        node_new.color = n.color;
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