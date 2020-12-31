class Barcode{
    constructor(barcode_data, linegraph){
        this.barcode = barcode_data;
        this.linegraph = linegraph;

        for(let i=0; i<this.barcode.length; i++){
            this.barcode[i].index = i;
        }

        console.log(this.barcode)


        this.svg = d3.select("#barcode-svg");
        this.svg_width = parseFloat(d3.select("#vis-barcode").style("width"));
        // this.container_height = parseFloat(d3.select("#vis-hypergraph").style("height"))*2;
        this.container_height = parseFloat(d3.select(".container-fluid").node().offsetHeight)-50;
        this.svg_margin = {'left':12, 'right':20, 'top':10, 'bottom':10};
        this.svg
            
            .attr("width", this.svg_width)
            ;
        this.svg_g = this.svg.append("g").attr("width", this.svg_width);

        d3.select("#vis-barcode")
            // .style("height", d3.select("#vis-hypergraph").style("height"));
            // .style("height", parseInt(this.container_height-250)+"px");
            .style("height", parseInt(this.container_height/2.2)+"px");


        this.barcode_group = this.svg_g.append("g")
            .attr("id", "barcode_group");
        this.xAxis_group = this.svg_g.append('g')
            .attr('id','xAxis_group');
        this.slider_group = this.svg_g.append('g')
            .attr('id', 'slider_group');
        this.slider = this.slider_group.append('rect');
        this.slider_line = this.slider_group.append('line');
            // .attr('id', 'barcode_slider');
        
        this.draw_barcode();
        this.draw_merge_tree();

        let connected_components = [];
        this.linegraph.nodes.forEach(n=>{
            connected_components.push([n.id]);
        })

        this.threshold = 0;
        this.cc_dict = this.linegraph.get_cc_dict(undefined);
        this.expanded_bars = [];
        this.expanded_bars_dict = {};

        this.history_recorder = []
        // console.log(this.connected_components)
        // this.linegraph.compute_simplified_hypergraph(connected_components);
    }

    draw_barcode(){
        this.max_death = d3.max(this.barcode.map(d => d.death));
        this.width_scale = d3.scaleLinear()
            .domain([0, this.max_death*1.1])
            .range([0, this.svg_width-this.svg_margin.right-this.svg_margin.left]).nice();
        
        // let barcode_height = Math.floor((this.svg_height-this.svg_margin.top-this.svg_margin.bottom)/this.barcode.length);

        let barcode_height = 10;
        this.svg_height = barcode_height * (this.barcode.length+1) + 2*this.svg_margin.top + this.svg_margin.bottom;
        this.svg.attr("height", this.svg_height)
        // .attr("viewBox", [0, 0, this.svg_width, this.container_height]);
        this.svg_g.attr("height", this.svg_height);

        if(this.svg_height < this.container_height){
            this.svg.attr("transform", "translate(0,"+(this.container_height/2-this.svg_height)/2+")");
        }
        

        let bg = this.barcode_group.selectAll('rect').data(this.barcode);
        bg.exit().remove();
        bg = bg.enter().append('rect').merge(bg)
            .attr('width', d=>{
                if(d.death > 0){
                    return this.width_scale(d.death - d.birth);
                } else {
                    return this.width_scale.range()[1];
                }
            })
            .attr('height', barcode_height)
            .attr('x', this.svg_margin.left)
            .attr('y', (d, i)=>this.svg_margin.top*2 + i*barcode_height)
            .attr("class", "barcode-rect-dim0")
            .attr("id", (d,i)=>"barcode"+i)
            .on("mouseover", (d,i)=>{
                if(this.expanded_bars.indexOf(i)===-1){
                    d3.select("#barcode"+i).classed("hover-light", true);
                }
            })
            .on("mouseout", (d,i)=>{
                if(this.expanded_bars.indexOf(i)===-1){
                    d3.select("#barcode"+i).classed("hover-light", false);
                }
            })
            // .classed("hover-darken", true)
            // .on("click", d=>{
            //     console.log(d)
            //     // let edge_id = d.edge.source+"-"+d.edge.target;
            //     if(d.death > 0){
            //         // this.linegraph.graph_expansion(d);
            //     }
            // });

        let xAxis = d3.axisBottom(this.width_scale).ticks(5);
        this.xAxis_group
            .classed("axis", true)
            .style("font-size","10px")
            .style("color","dimgray")
            .attr("transform", "translate("+this.svg_margin.left+","+ (this.svg_height-this.svg_margin.bottom-this.svg_margin.top) + ")")
            .call(xAxis);

        // let xAxis_labels = this.xAxis_group.selectAll("g")._groups[0];
        // let xAxis_labels_last = xAxis_labels[xAxis_labels.length-1]
        // console.log(xAxis_labels_last)
        // xAxis_labels_last.select("text").text("Inf")

        this.xAxis_group.selectAll("g").filter(function(d, i,list) {
            return i === list.length - 1;
        }).select('text').text('∞')

        this.slider_group.attr("transform", "translate("+(this.svg_margin.left)+",0)")

        this.slider
            .attr("width", 15)
            .attr("height", 8)
            // .attr("x", 0)
            // .attr("y",1)
            .attr("class", "slider hover-darken")
            .attr("id", "barcode-slider");


        this.slider_line
            .attr("x1",0)
            .attr("y1",0)
            .attr("x2",0)
            .attr("y2", this.svg_height-this.svg_margin.bottom*2)
            .attr("stroke","grey")
            .attr("stroke-width",1)
            .attr("id", "barcode-line")

        const zoom_handler = d3.zoom()
            .on("zoom", zoom_actions);
        zoom_handler(this.svg_g);

        let that = this;
        function zoom_actions() {
            that.svg_g.attr("transform", d3.event.transform);
        }

        function dragstarted(d) {
            that.dragStarted = true;
        }

        function dragged(d) {
            d3.select("#barcode-slider").attr()
        }
    }

    extract_edgeid(threshold){
        // find out the longest bar with length < threshold
        let edgeid;
        d3.selectAll(".barcode-rect-dim0").classed("barcode-highlighted",false)
        for(let i=0; i<this.barcode.length; i++){
            let bar = this.barcode[i];
            if(bar.death > 0){
                let next_bar = this.barcode[i+1];
                let bar_length = bar.death - bar.birth;
                let next_bar_length = next_bar.death - next_bar.birth; 
                if(bar_length <= threshold){
                    d3.select("#barcode"+i).classed("barcode-highlighted",true);
                }               
                if(bar_length <= threshold && next_bar_length > threshold){
                    edgeid = bar.edge.source+"-"+bar.edge.target;
                    break;
                } else if(bar_length <= threshold && next_bar.death < 0){
                    edgeid = bar.edge.source+"-"+bar.edge.target;
                }
            }
        }
        return edgeid;
    }

    draw_tooltip(){
        d3.select("#info_drawing").remove();
        d3.select("#info_drawing_container").append("div").attr("id", "info_drawing");
        
        d3.select("#info_drawing").append("div").attr("id", "help-tip").classed("help-tip", true);
        d3.select("#help-tip").append("h6").html("Selected Hyperedges");
    }

    draw_persistent_graph(){
        console.log("draw persistent graph");
        d3.select("#info_drawing").remove();
        d3.select("#info_drawing_container").append("div").attr("id", "info_drawing");

        let ph_margins = {'left':23, 'right':10, 'top':20, 'bottom':10};
        let ph_width = parseFloat(d3.select("#info_drawing").style("width"));

        let ph_svg = d3.select("#info_drawing").append("svg")
            .attr('width', ph_width)
            .attr('height', ph_width);
        let ph_node_group = ph_svg.append('g').attr('id', 'ph_node_group');
        let ph_yAxis_group = ph_svg.append('g')
                .attr('id','ph_yAxis_group');
        let ph_xAxis_group = ph_svg.append('g')
                .attr('id','ph_xAxis_group');

        let ph_xAxis = d3.axisBottom(this.width_scale).ticks(5);

        ph_xAxis_group
            .classed("axis", true)
            .style("font-size","10px")
            .style("color","dimgray")
            .attr("transform", "translate("+ph_margins.left+","+ (ph_width-ph_margins.bottom-ph_margins.top) + ")")
            .call(ph_xAxis);


        // console.log(this.linegraph.weight)
        // let cc_nums = this.barcode.slice(0,this.barcode.length-1).map(d=>{
        //     console.log(d)
        //     return d.edge[this.linegraph.weight].cc_list.length});
        // console.log(cc_nums)
        let cc_nums = {};
        let previous_ph = 0;
        let current_ph;
        for(let i=0; i<this.barcode.length-1; i++){
            current_ph = Math.round(this.barcode[i].death*1000)/1000;
            console.log(current_ph, previous_ph)
            if (current_ph != previous_ph){
                cc_nums[previous_ph] = this.barcode[i].edge[this.linegraph.weight].cc_list.length+1;
                previous_ph = current_ph;
            }
        }
        cc_nums[current_ph] = 1;
        cc_nums = d3.entries(cc_nums);
        cc_nums.sort((a,b)=>b.value-a.value)

        let ph_yScale = d3.scaleLinear()
            .domain([cc_nums[0].value,0])
            .range([ph_margins.bottom, ph_width - ph_margins.bottom-ph_margins.top]);

        let ph_yAxis = d3.axisLeft(ph_yScale).ticks(5);

        ph_yAxis_group
                .classed("axis", true)
                .style("font-size","10px")
                .style("color","dimgray")
                .attr("transform", "translate("+ph_margins.left+",0)")
                .call(ph_yAxis);

        let png = ph_node_group.selectAll("circle").data(cc_nums);
        png.exit().remove();
        png = png.enter().append("circle").merge(png)
            .attr("cx", d=>this.width_scale(d.key)+ph_margins.left)
            .attr("cy", d=>ph_yScale(d.value))
            .attr("r", 3)
            .attr("fill", 'black')

        let plg = ph_node_group.selectAll("line").data(cc_nums.slice(0, cc_nums.length-1));
        plg.exit().remove();
        plg = plg.enter().append("line").merge(plg)
            .attr("x1", d=>this.width_scale(d.key)+ph_margins.left)
            .attr("y1", d=>ph_yScale(d.value))
            .attr("x2", (d,i)=>this.width_scale(cc_nums[i+1].key)+ph_margins.left)
            .attr("y2", (d,i)=>ph_yScale(cc_nums[i+1].value))
            .attr("stroke", 'black')
    }

    draw_merge_tree(){
        // console.log("draw merge tree")
        // d3.select("#info_drawing").remove();
        // d3.select("#info_drawing_container").append("div").attr("id", "info_drawing");

        let tree = this.construct_tree();

        let tree_margins = {'left':12, 'right':20, 'top':30, 'bottom':10};
        let tree_width = parseFloat(d3.select("#info_drawing").style("width"));
        let tree_height = this.container_height/3;

        // let tree_svg = d3.select("#info_drawing").append("svg")
        let tree_svg = d3.select("#merge-tree-svg")
            .attr('width', tree_width)
            .attr('height', tree_height);

        tree_svg.attr("transform", "translate(0,10)");
        let tree_slider_group = tree_svg.append("g").attr("id", "tree_slider_group");
        let tree_edges_group_h = tree_svg.append("g").attr("id", "tree_edges_group_h");
        let tree_edges_group_v = tree_svg.append("g").attr("id", "tree_edges_group_v");
        let tree_nodes_group = tree_svg.append("g").attr("id", "tree_nodes_group");
        let tree_slider = tree_slider_group.append('rect');
        let tree_slider_line = tree_slider_group.append('line');

        tree_slider_group.attr("transform", "translate("+(tree_margins.left)+",0)");

        tree_slider
            .attr("width", 15)
            .attr("height", 8)
            // .attr("x", 0)
            // .attr("y",1)
            .attr("class", "slider hover-darken")
            .attr("id", "tree-slider");

        tree_slider_line
            .attr("x1",0)
            .attr("y1",0)
            .attr("x2",0)
            .attr("y2", tree_height-tree_margins.bottom*2)
            .attr("stroke","grey")
            .attr("stroke-width",1)
            .style("opacity", 0.5)
            .attr("id", "tree-line")
            // .style("stroke-dasharray","2,2")

        var cluster = d3.cluster()
            .size([tree_width/1.5, tree_width - tree_margins.right]);

        // Give the data to this cluster layout:
        var root = d3.hierarchy(tree, function(d) {
            return d.children;
        });
        cluster(root);
        console.log(root.descendants().slice(1) )


        let xScale = d3.scaleLinear()
            .domain([0, Math.max(...root.descendants().slice(1).map(x=>x.data.val))])
            .range([tree_margins.left, Math.max(...root.descendants().slice(1).map(x=>x.y))])

        let lgh = tree_edges_group_h.selectAll('line').data(root.descendants().slice(1));
        lgh.exit().remove();
        lgh = lgh.enter().append('line').merge(lgh)
            .attr("x1", d=>{
                if(d.children){
                    return xScale(d.children[0].data.val);
                } else{
                    return xScale(0);
                }
            })            
            .attr("y1", d=>d.x*1.4+10)
            .attr("x2", d=>xScale(d.data.val))
            .attr("y2", d=>d.x*1.4+10)
            .attr("stroke", 'grey');
        
        let lgv = tree_edges_group_v.selectAll('line').data(root.descendants().slice(1));
        lgv.exit().remove();
        lgv = lgv.enter().append('line').merge(lgv)
            .attr("x1", d=>xScale(d.data.val))
            .attr("y1", d=>d.x*1.4+10)
            .attr("x2", d=>xScale(d.data.val))
            .attr("y2", d=>d.parent.x*1.4+10)
            .attr("stroke", 'grey');

        let nodes_new = [];
        root.descendants().slice(1).forEach(node=>{
            if(node.data.children===undefined){
                nodes_new.push(node);
            }
        })
        let ng = tree_nodes_group.selectAll('circle').data(nodes_new);
        ng.exit().remove();
        ng = ng.enter().append('circle').merge(ng)
            .attr("cx", d=>{
                if(d.children){
                    return xScale(d.children[0].data.val);
                } else{
                    return xScale(0);
                }
            })  

            .attr('cy', d=>d.x*1.4+10)
            .attr('r', 5)
            .attr('fill', d=>{
                return this.linegraph.color_dict[d.data.name]
            })
            .attr('stroke', 'white')
            .attr('strok-width', 2)
            .on('mouseover', function(d){
                d3.select(this).attr('r', 10);
                tree_tooltip
                    .attr('transform', 'translate('+(tree_width - d.y+25)+","+(d.x*1.3)+")")
                    .style('visibility', 'visible');
                tree_tooltip.select('text').text(d.data.name)
            })
            .on('mouseout', function(d){
                d3.select(this).attr('r', 5);
                tree_tooltip.style('visibility', 'hidden');
            })

        let tree_tooltip = tree_svg.append('g')
            .style('visibility', 'hidden');
        
        tree_tooltip.append('rect')
            .attr('width', 35)
            .attr('height', 20)
            .attr('y', -15)
            .attr('x', -5)
            .attr('fill', '#ccc')
            // .attr('stroke', 'grey')
            
        tree_tooltip.append('text')
    }

    construct_tree(){
        let nodes_dict = {};
        let he2nodeid = {}
        this.linegraph.nodes.forEach(d=>{
            he2nodeid[d.id] = d.id;
        })
        let prev_death_val = -1;
        let current_node_idx = 1;
        this.barcode.forEach(d=>{
            if(d.death > 0){
                let death_val = (Math.round(d.death*1000)/1000).toString();
                if(Object.keys(nodes_dict).indexOf(death_val)===-1){
                    nodes_dict[death_val] = [];
                    // assign id to nodes in prev_death_val
                    if(prev_death_val > 0){
                        nodes_dict[prev_death_val].forEach(llist => {
                            let node_id = 'node'+current_node_idx;
                            llist.forEach(he=>{
                                he2nodeid[he] = node_id;
                            })
                            current_node_idx += 1;
                        })
                    }
                }
                let source = d.edge.source;
                let target = d.edge.target;
                let source_node_id = he2nodeid[source];
                while(Object.keys(he2nodeid).indexOf(source_node_id)!=-1 && source_node_id != source){
                    source_node_id = he2nodeid[source_node_id];
                }
                let target_node_id = he2nodeid[target];
                while(Object.keys(he2nodeid).indexOf(target_node_id)!=-1 && target_node_id != target){
                    target_node_id = he2nodeid[target_node_id];
                }
                if(nodes_dict[death_val].length === 0){
                    nodes_dict[death_val].push([source_node_id, target_node_id]);
                } else{
                    let source_idx = -1;
                    let target_idx = -1;
                    for(let i=0; i<nodes_dict[death_val].length; i++){
                        if(nodes_dict[death_val][i].indexOf(source_node_id) != -1){
                            source_idx = i;
                        }
                        if(nodes_dict[death_val][i].indexOf(target_node_id) != -1){
                            target_idx = i;
                        }
                    }
                    if(source_idx === -1 && target_idx === -1){
                        nodes_dict[death_val].push([source_node_id, target_node_id]);
                    } else if(source_idx != -1 && target_idx === -1){
                        nodes_dict[death_val][source_idx].push(target_node_id);
                    } else if(source_idx === -1 && target_idx != -1) {
                        nodes_dict[death_val][target_idx].push(source_node_id);
                    } else{ // source_idx != -1 && target_idx != -1
                        // combine the two lists
                        nodes_dict[death_val][source_idx] = nodes_dict[death_val][source_idx].concat(nodes_dict[death_val][target_idx]);
                        nodes_dict[death_val].splice(target_idx, 1);
                    }
                }
                prev_death_val = death_val;
            }

        })
        let he2nodeid_reverse = {}
        for(let child in he2nodeid){
            let parent = he2nodeid[child];
            if(Object.keys(he2nodeid_reverse).indexOf(parent)===-1){
                he2nodeid_reverse[parent] = [];
            }
            he2nodeid_reverse[parent].push(child);
        }

        let nodes_values = {};
        for(let val in nodes_dict){
            nodes_dict[val].forEach(nodes_list=>{
                nodes_list.forEach(node=>{
                    nodes_values[node] = parseFloat(val);
                })
            })
        }
        nodes_values['root'] = Math.max(...Object.values(nodes_values));

        // recover tree structure
        let root_list = [];
        for(let parent in he2nodeid_reverse){
            if(Object.keys(he2nodeid).indexOf(parent)===-1){
                root_list.push(parent);
            }
        }
        he2nodeid_reverse.root = root_list;
        let tree = this.recover_tree('root', undefined, 0, he2nodeid_reverse, nodes_values);
        return tree;   
    }

    recover_tree(node_id, parent_id, level, he2nodeid_reverse, nodes_values){
        let node = {"name":node_id, "level":level, "parent":parent_id, "val":nodes_values[node_id]};
        let children_nodes = he2nodeid_reverse[node_id];
        if(children_nodes){
            node.children = []
            children_nodes.forEach(c=>{
                let child = this.recover_tree(c, node_id, level+1, he2nodeid_reverse, nodes_values);
                node.children.push(child);
            })
        }
        return node
    }

    draw_threshold_history(){
        console.log("threshold history");
        let history_width = parseFloat(d3.select("#info_drawing").style("width"));
        let history_height = history_width;
        let frame_width = history_width/2;
        let frame_height = frame_width;

        let history_svg = d3.select("#info_drawing").append("svg")
            .attr("width", history_width)
            .attr("height", history_height);


    }
    
}