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

// get s value
let s_value_slider = document.getElementById("s-walk_input");
var s_value = 1;
s_value_slider.oninput = function(){
    s_value = this.value;
    d3.select("#s-walk_label")
        .html(this.value);
}

d3.select("#compute_line_graph")
    .on("click", ()=>{
        $.ajax({
            type: "POST",
            url: "/recompute",
            data: String(s_value),
            dataType:'text',
            success: function (response) {
                let data = process_response(response);
                initialize_data(data);
            },
            error: function (error) {
                console.log("error",error);
            }
        });

    })

function read_hgraph_text(text_data){
    $.ajax({
        type: "POST",
        url: "/import",
        data: text_data,
        dataType:'text',
        success: function (response) {
            let data = process_response(response);
            initialize_data(data);
        },
        error: function (error) {
            console.log("error",error);
        }
    })
}

function process_response(response){
    response = JSON.parse(response);
    let hyper_data = response.hyper_data;
    let line_data = response.line_data;
    let barcode_data = response.barcode_data;
    let data = {"hyper_data":hyper_data, "line_data":line_data, "barcode_data":barcode_data};
    return data;
}



function initialize_data(data) {
    console.log(data)

    clear_canvas();
    let color_dict = assign_hyperedge_colors(data);

    let line_data_copy = copy_line_data(data.line_data);
    let hypergraph = new Hypergraph(data.hyper_data); 
    let simplified_hypergraph = new Simplified_Hypergraph();
    let linegraph = new Linegraph(data.line_data, hypergraph, "linegraph");
    let simplified_linegraph = new Linegraph(line_data_copy, simplified_hypergraph, "simplified-linegraph");
    let barcode = new Barcode(data.barcode_data, simplified_linegraph);

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

    let line_variant_dropdown = document.getElementById("line_graph_variants");
    line_variant_dropdown.onchange = function(){
    let variant = line_variant_dropdown.options[line_variant_dropdown.selectedIndex].text;
        $.ajax({
            type: "POST",
            url: "/switch_line_variant",
            data: String(variant),
            dataType:'text',
            success: function (response) {
                let data = JSON.parse(response);
                switch_line_variant(color_dict, data.line_data, data.barcode_data, variant);
            },
            error: function (error) {
                console.log("error",error);
            }
        });
    }
}

function switch_line_variant(color_dict, lgraph, barcode_data, variant){
    clear_linegraph_canvas();
    if(variant === "Original Line Graph"){
        lgraph.nodes.forEach(node=>{
            let c = color_dict[node.id];
            node.color = c;
        })
        let line_data_copy = copy_line_data(lgraph);
        let simplified_hypergraph = new Simplified_Hypergraph();
        let linegraph = new Linegraph(lgraph, simplified_hypergraph, "linegraph");
        let simplified_linegraph = new Linegraph(line_data_copy, simplified_hypergraph, "simplified-linegraph");
        let barcode = new Barcode(barcode_data, simplified_linegraph);
    } else if(variant === "Dual Line Graph"){
        let line_data_copy = copy_line_data(lgraph);
        let simplified_hypergraph = new Simplified_Hypergraph();
        let linegraph = new Linegraph(lgraph, simplified_hypergraph, "linegraph");
        let simplified_linegraph = new Linegraph(line_data_copy, simplified_hypergraph, "simplified-linegraph");
        let barcode = new Barcode(barcode_data, simplified_linegraph);
    }
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

function clear_linegraph_canvas(){
    $('#linegraph-svg').remove();
    $('#simplified-hypergraph-svg').remove();
    $('#simplified-linegraph-svg').remove();
    $('#barcode-svg').remove();
    // $('#help-tip').remove();
    $('#vis-linegraph').append('<svg id="linegraph-svg"></svg>');
    $('#vis-simplified-hypergraph').append('<svg id="simplified-hypergraph-svg"></svg>');
    // $('#vis-simplified-hypergraph').append('<div class="help-tip" style="opacity: 0;" id="help-tip"></div>');
    $('#vis-simplified-linegraph').append('<svg id="simplified-linegraph-svg"></svg>');
    $('#vis-barcode').append('<svg id="barcode-svg"></svg>');
}