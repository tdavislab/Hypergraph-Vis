class Barcode {
    constructor(barcode_data, linegraph, modality_counter = '') {
        this.barcode = barcode_data;
        this.linegraph = linegraph;
        this.modality_counter = modality_counter;

        this.svg = d3.select("#barcode-svg" + modality_counter);
        this.svg_width = parseFloat(d3.select("#vis-barcode" + modality_counter).style("width"));
        // this.container_height = parseFloat(d3.select("#vis-hypergraph").style("height"))*2;
        // this.container_height = parseFloat(d3.select(".container-fluid").node().offsetHeight) - 50;
        this.container_height = 700;
        this.svg_margin = {'left': 12, 'right': 20, 'top': 10, 'bottom': 10};
        this.svg.attr("width", this.svg_width);
        this.svg_g = this.svg.append("g").attr("width", this.svg_width);

        d3.select("#vis-barcode" + modality_counter)
            .style("height", parseInt(this.container_height - 200) + "px");
            // .style("height", "500px");

        this.barcode_group = this.svg_g.append("g")
            .attr("id", "barcode_group");
        this.xAxis_group = this.svg_g.append('g')
            .attr('id', 'xAxis_group');
        this.slider_group = this.svg_g.append('g')
            .attr('id', 'slider_group');
        this.slider = this.slider_group.append('rect');
        this.slider_line = this.slider_group.append('line');
        // .attr('id', 'barcode_slider');

        this.draw_barcode();

        let connected_components = [];
        this.linegraph.nodes.forEach(n => {
            connected_components.push([n.id]);
        })

        this.threshold = 0;
        this.cc_dict = this.linegraph.get_cc_dict(undefined);
        this.expanded_bars = [];
        this.expanded_bars_dict = {};
        // console.log(this.connected_components)
        // this.linegraph.compute_simplified_hypergraph(connected_components);
    }

    draw_barcode() {
        this.max_death = d3.max(this.barcode.map(d => d.death));
        this.width_scale = d3.scaleLinear()
            .domain([0, this.max_death * 1.1])
            .range([0, this.svg_width - this.svg_margin.right - this.svg_margin.left]).nice();

        // let barcode_height = Math.floor((this.svg_height-this.svg_margin.top-this.svg_margin.bottom)/this.barcode.length);

        let barcode_height = 10;
        this.svg_height = barcode_height * (this.barcode.length + 1) + 2 * this.svg_margin.top + this.svg_margin.bottom;
        this.svg.attr("height", this.svg_height)
        // .attr("viewBox", [0, 0, this.svg_width, this.container_height]);
        this.svg_g.attr("height", this.svg_height);

        if (this.svg_height < this.container_height) {
            this.svg.attr("transform", "translate(0," + (this.container_height - this.svg_height) / 3 + ")");
        }


        let bg = this.barcode_group.selectAll('rect').data(this.barcode);
        bg.exit().remove();
        bg = bg.enter().append('rect').merge(bg)
            .attr('width', d => {
                if (d.death > 0) {
                    return this.width_scale(d.death - d.birth);
                } else {
                    return this.width_scale(this.max_death * 1.1);
                }
            })
            .attr('height', barcode_height)
            .attr('x', this.svg_margin.left)
            .attr('y', (d, i) => this.svg_margin.top * 2 + i * barcode_height)
            .attr("class", "barcode-rect-dim0")
            .attr("id", (d, i) => "barcode" + i)
            .on("mouseover", (d, i) => {
                if (this.expanded_bars.indexOf(i) === -1) {
                    d3.select("#barcode" + i).classed("hover-light", true);
                }
            })
            .on("mouseout", (d, i) => {
                if (this.expanded_bars.indexOf(i) === -1) {
                    d3.select("#barcode" + i).classed("hover-light", false);
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
            .style("font-size", "10px")
            .style("color", "dimgray")
            .attr("transform", "translate(" + this.svg_margin.left + "," + (this.svg_height - this.svg_margin.bottom - this.svg_margin.top) + ")")
            .call(xAxis);

        this.slider_group.attr("transform", "translate(" + (this.svg_margin.left) + ",0)")

        this.slider
            .attr("width", 15)
            .attr("height", 8)
            // .attr("x", 0)
            // .attr("y",1)
            .attr("class", "slider hover-darken")
            .attr("id", "barcode-slider" + this.modality_counter);


        this.slider_line
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", this.svg_height - this.svg_margin.bottom * 2)
            .attr("stroke", "grey")
            .attr("stroke-width", 1)
            .attr("id", "barcode-line" + this.modality_counter);

        const zoom_handler = d3.zoom()
            .on("zoom", zoom_actions);
        zoom_handler(this.svg_g);

        let that = this;

        function zoom_actions() {
            console.log(d3.event)
            that.svg_g.attr("transform", d3.event.transform);
        }

        function dragstarted(d) {
            that.dragStarted = true;
        }

        function dragged(d) {
            d3.select("#barcode-slider" + this.modality_counter).attr()
        }
    }

    extract_edgeid(threshold) {
        // find out the longest bar with length < threshold
        let edgeid;
        d3.selectAll(".barcode-rect-dim0").classed("barcode-highlighted", false)
        for (let i = 0; i < this.barcode.length; i++) {
            let bar = this.barcode[i];
            if (bar.death > 0) {
                let next_bar = this.barcode[i + 1];
                let bar_length = bar.death - bar.birth;
                let next_bar_length = next_bar.death - next_bar.birth;
                if (bar_length <= threshold) {
                    d3.select("#barcode" + i).classed("barcode-highlighted", true);
                }
                if (bar_length <= threshold && next_bar_length > threshold) {
                    edgeid = bar.edge.source + "-" + bar.edge.target;
                    break;
                } else if (bar_length <= threshold && next_bar.death < 0) {
                    edgeid = bar.edge.source + "-" + bar.edge.target;
                }
            }
        }
        return edgeid;
    }

}